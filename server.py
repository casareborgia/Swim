# 수영 코치봇 접수 백엔드 (MVP Day3)
#
# 흐름: POST /api/submit 접수 → 백그라운드에서 swim_analyze.py 실행(3회 집계)
#       → report_render.py로 리포트 초안 생성 → 검수 대기(ready_for_review)
#       → 관리자(/admin)가 리포트 확인 후 이메일로 수동 발송 (Wizard of Oz)
#
# 실행:
#   python3 -m uvicorn server:app --port 8010  (8000은 이 맥에서 다른 프로세스가 사용 중)
#
# 환경 변수(.env 또는 셸):
#   GEMINI_API_KEY  필수
#   SWIM_MODEL      기본 gemini-2.5-pro
#   SWIM_RUNS       기본 3
#   ADMIN_TOKEN     설정 시 /admin 접근에 ?token= 필요

import html
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
INBOX_DIR = BASE_DIR / "inbox"
INBOX_DIR.mkdir(exist_ok=True)

VALID_STROKES = {"freestyle", "backstroke", "breaststroke", "butterfly"}
VALID_ANGLES = {"side", "frontal", "rear"}
VALID_SHOTS = {"deck", "underwater"}

# ---- 어뷰징 방어 설정 (환경 변수로 조정 가능) ----
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "50"))
MAX_SIZE = MAX_UPLOAD_MB * 1024 * 1024
FREE_CREDITS = int(os.environ.get("FREE_CREDITS", "1"))          # 이메일당 무료 분석 횟수
RATE_LIMIT_PER_HOUR = int(os.environ.get("RATE_LIMIT_PER_HOUR", "10"))  # IP당 시간당 업로드 한도

USAGE_FILE = INBOX_DIR / "_usage.json"   # 크레딧·레이트리밋 카운터 (재시작에도 유지)
_usage_lock = threading.Lock()


def client_ip(request):
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(ip):
    """IP당 시간당 업로드 한도. 시도 자체를 카운트한다(실패 포함, 매크로 방어)."""
    with _usage_lock:
        usage = read_json(USAGE_FILE, {"emails": {}, "ips": {}})
        now = time.time()
        stamps = [t for t in usage["ips"].get(ip, []) if now - t < 3600]
        if len(stamps) >= RATE_LIMIT_PER_HOUR:
            raise HTTPException(429, f"시간당 업로드 한도({RATE_LIMIT_PER_HOUR}회)를 초과했습니다. 잠시 후 다시 시도해 주세요.")
        stamps.append(now)
        usage["ips"][ip] = stamps
        USAGE_FILE.write_text(json.dumps(usage, ensure_ascii=False), encoding="utf-8")


def check_credit(email):
    """이메일당 무료 크레딧 확인 (소진 시 402). 아직 차감하지는 않는다."""
    with _usage_lock:
        usage = read_json(USAGE_FILE, {"emails": {}, "ips": {}})
        if usage["emails"].get(email, 0) >= FREE_CREDITS:
            raise HTTPException(402, "무료 분석 크레딧을 모두 사용했습니다. 추가 분석은 결제 오픈 후 이용할 수 있습니다.")


def consume_credit(email):
    """검증 통과·접수 확정 시에만 크레딧 차감."""
    with _usage_lock:
        usage = read_json(USAGE_FILE, {"emails": {}, "ips": {}})
        usage["emails"][email] = usage["emails"].get(email, 0) + 1
        USAGE_FILE.write_text(json.dumps(usage, ensure_ascii=False), encoding="utf-8")


def sanitize_text(value, max_len=80):
    """유저 입력을 프롬프트 파라미터로만 쓰이도록 새니타이징.
    개행·중괄호·따옴표·백틱 등 프롬프트 구조를 오염시킬 수 있는 문자를 제거한다."""
    value = re.sub(r'[\r\n{}<>`"\'\\\[\]#*_|~]', " ", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value[:max_len]


def is_valid_video(path):
    """확장자·MIME 변조 방어: ffprobe로 실제 비디오 스트림 존재를 확인."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        )
        return out.returncode == 0 and "video" in out.stdout
    except Exception:
        return False


def load_dotenv():
    env_file = BASE_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


load_dotenv()
app = FastAPI(title="수영코치 AI 접수 서버")


def write_status(sub_dir, state, detail=""):
    (sub_dir / "status.json").write_text(json.dumps({
        "state": state, "detail": detail,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default if default is not None else {}


def process_submission(sub_id):
    """백그라운드: 분석 3회 실행 → 리포트 초안 생성 → 검수 대기 상태로 전환."""
    sub_dir = INBOX_DIR / sub_id
    meta = read_json(sub_dir / "meta.json")
    analysis_dir = sub_dir / "analysis"
    video = next(sub_dir.glob("video.*"), None)
    if not video:
        write_status(sub_dir, "failed", "영상 파일 없음")
        return

    write_status(sub_dir, "analyzing")
    cmd = [
        sys.executable, "-u", str(BASE_DIR / "swim_analyze.py"),
        "--video", str(video),
        "--stroke", meta["stroke"], "--angle", meta["angle"],
        "--target", meta["target"],
        "--runs", os.environ.get("SWIM_RUNS", "3"),
        "--model", os.environ.get("SWIM_MODEL", "gemini-2.5-pro"),
        "--out-dir", str(analysis_dir),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=2400,
                              cwd=str(BASE_DIR))
        (sub_dir / "analyze.log").write_text(proc.stdout + "\n--- stderr ---\n" + proc.stderr,
                                             encoding="utf-8")
        if proc.returncode != 0:
            write_status(sub_dir, "failed", f"분석 실패 (exit {proc.returncode}) — analyze.log 확인")
            return

        render = subprocess.run(
            [sys.executable, str(BASE_DIR / "report_render.py"), str(analysis_dir)],
            capture_output=True, text=True, timeout=120, cwd=str(BASE_DIR))
        if render.returncode != 0:
            write_status(sub_dir, "failed", f"리포트 생성 실패: {render.stderr[-300:]}")
            return

        write_status(sub_dir, "ready_for_review")
    except subprocess.TimeoutExpired:
        write_status(sub_dir, "failed", "분석 시간 초과(40분)")
    except Exception as e:  # 백그라운드 작업은 어떤 경우에도 상태를 남긴다
        write_status(sub_dir, "failed", f"{type(e).__name__}: {e}")


@app.post("/api/submit")
async def submit(
    request: Request,
    background_tasks: BackgroundTasks,
    video: UploadFile,
    stroke: str = Form(...),
    angle: str = Form(...),
    shot: str = Form(...),
    target: str = Form(...),
    email: str = Form(...),
    consent_legal: str = Form(""),
):
    # 1) 어뷰징 방어: IP 레이트리밋(시도 자체 카운트) → 크레딧 확인
    check_rate_limit(client_ip(request))

    email = (email or "").strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(400, "올바른 이메일을 입력해 주세요")
    check_credit(email)

    # 2) 입력 검증 (enum은 화이트리스트, 자유 텍스트는 새니타이징 후 파라미터로만 사용)
    if stroke not in VALID_STROKES:
        raise HTTPException(400, "잘못된 영법")
    if angle not in VALID_ANGLES:
        raise HTTPException(400, "잘못된 각도")
    if shot not in VALID_SHOTS:
        raise HTTPException(400, "잘못된 촬영 방식")
    if consent_legal != "true":
        raise HTTPException(400, "필수 법적 동의(타인 촬영 책임)가 필요합니다")
    target = sanitize_text(target)
    if not target:
        raise HTTPException(400, "영상 속 본인 식별 정보를 입력해 주세요")

    # 3) 파일 이중 검증 ①: 선언된 MIME 타입
    if not (video.content_type or "").startswith("video/"):
        raise HTTPException(400, "영상 파일만 업로드할 수 있습니다")

    sub_id = f"{datetime.now():%Y%m%d_%H%M%S}_{uuid.uuid4().hex[:6]}"
    sub_dir = INBOX_DIR / sub_id
    sub_dir.mkdir(parents=True)

    def reject(status, msg):
        for p in sub_dir.glob("*"):
            p.unlink()
        sub_dir.rmdir()
        raise HTTPException(status, msg)

    # 업로드 저장 (한글/악성 파일명 문제를 피해 video.<확장자>로 통일)
    suffix = Path(video.filename or "v.mp4").suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,5}", suffix):
        suffix = ".mp4"
    dest = sub_dir / f"video{suffix}"
    size = 0
    with dest.open("wb") as f:
        while chunk := await video.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_SIZE:
                f.close()
                reject(413, f"파일이 너무 큽니다 (최대 {MAX_UPLOAD_MB}MB)")
            f.write(chunk)

    # 4) 파일 이중 검증 ②: ffprobe로 실제 비디오 스트림 확인 (확장자 변조 방어)
    if not is_valid_video(dest):
        reject(400, "유효한 영상 파일이 아닙니다")

    (sub_dir / "meta.json").write_text(json.dumps({
        "id": sub_id, "stroke": stroke, "angle": angle, "shot": shot,
        "target": target, "email": email,
        "original_filename": sanitize_text(video.filename or "", 120),
        "size_mb": round(size / 1024 / 1024, 1),
        "consent_legal": True,
        "submitted_at": datetime.now().isoformat(timespec="seconds"),
        "client_ip": client_ip(request),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    write_status(sub_dir, "received")

    # 5) 모든 검증 통과 후에만 크레딧 차감 + 분석 시작
    consume_credit(email)
    background_tasks.add_task(process_submission, sub_id)
    return {"id": sub_id, "message": "접수 완료. AI 분석 진행 후 24시간 내 이메일로 발송됩니다."}


# ---------- 관리자(검수) ----------

def check_token(token):
    expected = os.environ.get("ADMIN_TOKEN", "")
    if expected and token != expected:
        raise HTTPException(403, "token 불일치")


@app.get("/api/admin/submissions")
def list_submissions(token: str = ""):
    check_token(token)
    subs = []
    for d in sorted(INBOX_DIR.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        meta = read_json(d / "meta.json")
        status = read_json(d / "status.json")
        agg = read_json(d / "analysis" / "aggregate.json")
        subs.append({
            "id": d.name, "meta": meta, "status": status,
            "mean_agreement": agg.get("mean_agreement"),
            "confirmed": sum(1 for it in agg.get("items", []) if it.get("verdict") == "confirmed"),
            "suspect": sum(1 for it in agg.get("items", []) if it.get("verdict") == "suspect"),
        })
    return subs


@app.get("/admin", response_class=HTMLResponse)
def admin_page(token: str = ""):
    check_token(token)
    rows = []
    state_kr = {"received": "⏳ 접수됨", "analyzing": "🔄 분석 중",
                "ready_for_review": "✅ 검수 대기", "failed": "❌ 실패"}
    for s in list_submissions(token):
        m, st = s["meta"], s["status"]
        report_link = (
            f"<a href='/admin/report/{s['id']}?token={html.escape(token)}' target='_blank'>리포트</a>"
            if st.get("state") == "ready_for_review" else "-"
        )
        agreement = f"{s['mean_agreement']*100:.0f}%" if s.get("mean_agreement") else "-"
        rows.append(
            f"<tr><td>{s['id']}</td><td>{m.get('stroke','')}/{m.get('angle','')}/{m.get('shot','')}</td>"
            f"<td>{html.escape(m.get('email',''))}</td>"
            f"<td>{state_kr.get(st.get('state'), st.get('state','?'))}<br>"
            f"<small>{html.escape(st.get('detail',''))}</small></td>"
            f"<td>확정 {s['confirmed']} / 의심 {s['suspect']}<br><small>일치율 {agreement}</small></td>"
            f"<td>{report_link}</td></tr>"
        )
    body = "".join(rows) or "<tr><td colspan='6'>접수 없음</td></tr>"
    return f"""<!DOCTYPE html><html lang='ko'><head><meta charset='utf-8'>
<title>검수 대기열</title><style>
body{{font-family:sans-serif;max-width:1000px;margin:20px auto;padding:0 12px}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
td,th{{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}}
th{{background:#f1f5f9}} small{{color:#888}}
</style></head><body>
<h2>🏊 검수 대기열</h2>
<p><small>새로고침해서 상태를 확인하세요. 검수 완료 후 리포트는 이메일로 수동 발송합니다.</small></p>
<table><tr><th>접수 ID</th><th>영법/각도/촬영</th><th>이메일</th><th>상태</th><th>집계</th><th>리포트</th></tr>
{body}</table></body></html>"""


@app.get("/admin/report/{sub_id}")
def admin_report(sub_id: str, token: str = ""):
    check_token(token)
    if "/" in sub_id or ".." in sub_id:
        raise HTTPException(400, "잘못된 ID")
    report = INBOX_DIR / sub_id / "analysis" / "report.html"
    if not report.exists():
        raise HTTPException(404, "리포트 없음")
    return FileResponse(report)


# ---------- 프론트 정적 서빙 (빌드가 있으면) ----------
dist = BASE_DIR / "swim-web" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="web")
