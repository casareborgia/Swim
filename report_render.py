# 수영 코치봇 리포트 렌더러 — 분석 결과(aggregate.json + run*.json) → 사용자용 리포트
#
# 사용:
#   python3 report_render.py results/자유형측면_freestyle_side_0706_071020
#   → 해당 폴더에 report.md / report.html 생성
#
# 검수(Wizard of Oz) 워크플로우: 생성된 report.html을 코치가 확인·수정한 뒤 발송한다.

import argparse
import html
import json
import os
import sys
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).parent
# 핵심 스키마는 비공개 자산 — 저장소 밖 경로에서 로드 (배포 시 SWIM_ASSETS_DIR 지정)
ASSETS_DIR = Path(os.environ.get("SWIM_ASSETS_DIR", str(BASE_DIR / "private_assets")))

STROKE_KR = {"freestyle": "자유형", "backstroke": "배영",
             "breaststroke": "평영", "butterfly": "접영"}
ANGLE_KR = {"side": "측면", "frontal": "정면", "rear": "후면"}

SCHEMA_PATHS = {
    "freestyle": ASSETS_DIR / "schemas" / "coaching_schema_freestyle_v0.2.json",
    "backstroke": ASSETS_DIR / "schemas" / "coaching_schema_backstroke_v0.3.json",
    "breaststroke": ASSETS_DIR / "schemas" / "coaching_schema_breaststroke_v0.3.json",
    "butterfly": ASSETS_DIR / "schemas" / "coaching_schema_butterfly_v0.3.json",
}


def load_results(result_dir):
    agg = json.loads((result_dir / "aggregate.json").read_text(encoding="utf-8"))
    runs = []
    for f in sorted(result_dir.glob("run*.json")):
        try:
            runs.append(json.loads(f.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    return agg, runs


def best_finding(item_id, runs, status="detected"):
    """여러 run 중 해당 항목의 서술이 가장 충실한 finding을 고른다."""
    candidates = []
    for r in runs:
        for f in r.get("findings", []):
            if f.get("id") == item_id and f.get("status") == status:
                candidates.append(f)
    if not candidates:
        return None
    return max(candidates, key=lambda f: len(f.get("evidence", "")))


def collect(agg, runs, schema):
    """리포트에 쓸 데이터 구조 조립."""
    current_angle = agg["meta"]["angle"]
    schema_items = {it["id"]: it for it in schema["items"]}

    confirmed, suspect, good, invisible = [], [], [], []
    for it in agg["items"]:
        entry = dict(it)
        if it["verdict"] == "confirmed":
            f = best_finding(it["id"], runs)
            entry["evidence"] = f.get("evidence", "") if f else ""
            entry["cause"] = f.get("cause", "") if f else ""
            entry["drill"] = f.get("drill", "") or it.get("drill", "") if f else it.get("drill", "")
            entry["priority"] = f.get("priority") if f and f.get("priority") else it.get("priority")
            confirmed.append(entry)
        elif it["verdict"] == "suspect":
            f = best_finding(it["id"], runs)
            entry["evidence"] = f.get("evidence", "") if f else ""
            suspect.append(entry)
        elif it["verdict"] == "ok":
            f = best_finding(it["id"], runs, status="ok")
            entry["evidence"] = f.get("evidence", "") if f else ""
            good.append(entry)
        else:  # not_visible
            angles = schema_items.get(it["id"], {}).get("angle", [])
            entry["need_angles"] = [a for a in angles if a != current_angle]
            invisible.append(entry)

    confirmed.sort(key=lambda x: (x["priority"] is None, x["priority"] or 99))

    # 추가 촬영 제안: 필요한 각도별로 진단 가능해지는 항목 묶기
    angle_unlock = {}
    for it in invisible:
        for a in it["need_angles"]:
            angle_unlock.setdefault(a, []).append(it["item"])

    summary = ""
    coverage = ""
    for r in runs:
        if r.get("one_line_summary"):
            summary = r["one_line_summary"]
            coverage = r.get("coverage_note", "")
            break

    return {
        "confirmed": confirmed, "suspect": suspect, "good": good,
        "invisible": invisible, "angle_unlock": angle_unlock,
        "summary": summary, "coverage": coverage,
        "segment": runs[0].get("analyzed_segment", "") if runs else "",
    }


def render_markdown(agg, data):
    meta = agg["meta"]
    stroke = STROKE_KR.get(meta["stroke"], meta["stroke"])
    angle = ANGLE_KR.get(meta["angle"], meta["angle"])
    lines = []
    ap = lines.append
    ap(f"# {stroke} AI 코칭 리포트")
    ap("")
    ap(f"- 분석일: {date.today().isoformat()}")
    ap(f"- 촬영 각도: {angle} / 분석 구간: {data['segment']}")
    ap(f"- 분석 방식: AI 3회 교차 분석 (판정 일치율 평균 {agg['mean_agreement']*100:.0f}%)")
    ap("")
    if data["summary"]:
        ap(f"> **한 줄 요약** — {data['summary']}")
        ap("")

    if data["confirmed"]:
        ap("## 이번에 확인된 교정 포인트")
        ap("")
        for i, it in enumerate(data["confirmed"], 1):
            pr = f" (우선순위 {it['priority']})" if it.get("priority") else ""
            ap(f"### {i}. {it['item']}{pr}")
            if it["evidence"]:
                ap(f"- **관찰된 모습**: {it['evidence']}")
            if it["cause"]:
                ap(f"- **원인**: {it['cause']}")
            if it["drill"]:
                ap(f"- **처방 드릴**: {it['drill']}")
            ap(f"- 신뢰도: 3회 분석 중 {sum(1 for s in it['statuses'] if s=='detected')}회 일관 관찰")
            ap("")
    else:
        ap("## 이번에 확인된 교정 포인트")
        ap("")
        ap("이번 촬영 범위에서는 뚜렷한 결함이 확인되지 않았습니다. 아래 '이번 촬영으로 볼 수 없었던 부분'을 참고해 추가 각도 촬영을 권합니다.")
        ap("")

    if data["suspect"]:
        ap("## 의심 단계 (추가 확인 필요)")
        ap("")
        for it in data["suspect"]:
            det = sum(1 for s in it["statuses"] if s == "detected")
            ap(f"- **{it['item']}** — 3회 중 {det}회에서만 관찰되어 확정하지 않았습니다."
               + (f" 관찰 내용: {it['evidence'][:100]}" if it.get("evidence") else ""))
        ap("")

    if data["good"]:
        ap("## 잘 되고 있는 부분")
        ap("")
        for it in data["good"]:
            ap(f"- **{it['item']} — 문제 없음** ✓" + (f" {it['evidence']}" if it.get("evidence") else ""))
        ap("")

    if data["angle_unlock"]:
        ap("## 이번 촬영으로 볼 수 없었던 부분")
        ap("")
        ap(f"{angle} 촬영에서는 아래 항목을 판정할 수 없습니다. 추가 촬영 시 더 완전한 진단이 가능합니다.")
        ap("")
        for a, items in data["angle_unlock"].items():
            ap(f"- **{ANGLE_KR.get(a, a)} 촬영 추가 시**: {', '.join(dict.fromkeys(items))}")
        ap("")

    ap("---")
    ap("")
    ap("*본 리포트는 AI가 동일 영상을 3회 독립 분석해 일치한 결과만 채택한 것입니다. "
       "영상에 보이지 않는 부분은 추측하지 않으며, 정량 수치(각도·거리)는 제공하지 않습니다.*")
    return "\n".join(lines)


HTML_CSS = """
body{font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;max-width:720px;
margin:0 auto;padding:24px 16px;color:#1a202c;line-height:1.65;background:#fafafa}
h1{font-size:1.5rem;border-bottom:3px solid #0ea5e9;padding-bottom:8px}
h2{font-size:1.15rem;margin-top:28px}
.meta{color:#64748b;font-size:.88rem}
.summary{background:#e0f2fe;border-left:4px solid #0ea5e9;padding:12px 16px;
border-radius:0 8px 8px 0;margin:16px 0;font-weight:600}
.card{background:#fff;border-radius:10px;padding:14px 18px;margin:12px 0;
box-shadow:0 1px 3px rgba(0,0,0,.08);border-left:5px solid #ccc}
.card.confirmed{border-left-color:#ef4444}
.card.suspect{border-left-color:#f59e0b}
.card.good{border-left-color:#22c55e}
.card h3{margin:0 0 8px;font-size:1.02rem}
.badge{display:inline-block;font-size:.72rem;padding:2px 8px;border-radius:10px;
background:#fee2e2;color:#b91c1c;margin-left:6px;vertical-align:middle}
.field{margin:4px 0;font-size:.93rem}
.field b{color:#475569}
.drill{background:#f0fdf4;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:.93rem}
ul{padding-left:20px}
footer{margin-top:32px;font-size:.8rem;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
"""


def render_html(agg, data):
    meta = agg["meta"]
    stroke = STROKE_KR.get(meta["stroke"], meta["stroke"])
    angle = ANGLE_KR.get(meta["angle"], meta["angle"])
    e = html.escape
    parts = []
    ap = parts.append
    ap(f"<!DOCTYPE html><html lang='ko'><head><meta charset='utf-8'>"
       f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
       f"<title>{stroke} AI 코칭 리포트</title><style>{HTML_CSS}</style></head><body>")
    ap(f"<h1>🏊 {stroke} AI 코칭 리포트</h1>")
    ap(f"<p class='meta'>분석일 {date.today().isoformat()} · 촬영 각도 {angle} · 분석 구간 {e(data['segment'])}<br>"
       f"AI 3회 교차 분석 · 판정 일치율 평균 {agg['mean_agreement']*100:.0f}%</p>")
    if data["summary"]:
        ap(f"<div class='summary'>{e(data['summary'])}</div>")

    ap("<h2>이번에 확인된 교정 포인트</h2>")
    if data["confirmed"]:
        for i, it in enumerate(data["confirmed"], 1):
            det = sum(1 for s in it["statuses"] if s == "detected")
            ap("<div class='card confirmed'>")
            ap(f"<h3>{i}. {e(it['item'])}<span class='badge'>3회 중 {det}회 일관 관찰</span></h3>")
            if it.get("evidence"):
                ap(f"<div class='field'><b>관찰된 모습</b> — {e(it['evidence'])}</div>")
            if it.get("cause"):
                ap(f"<div class='field'><b>원인</b> — {e(it['cause'])}</div>")
            if it.get("drill"):
                ap(f"<div class='drill'>💪 <b>처방 드릴</b>: {e(it['drill'])}</div>")
            ap("</div>")
    else:
        ap("<p>이번 촬영 범위에서는 뚜렷한 결함이 확인되지 않았습니다.</p>")

    if data["suspect"]:
        ap("<h2>의심 단계 (추가 확인 필요)</h2>")
        for it in data["suspect"]:
            det = sum(1 for s in it["statuses"] if s == "detected")
            ap(f"<div class='card suspect'><h3>{e(it['item'])}</h3>"
               f"<div class='field'>3회 분석 중 {det}회에서만 관찰되어 확정하지 않았습니다. "
               f"다음 촬영에서 다시 확인하겠습니다.</div></div>")

    if data["good"]:
        ap("<h2>잘 되고 있는 부분 👍</h2>")
        for it in data["good"]:
            ap(f"<div class='card good'><h3>{e(it['item'])} <span style='color:#16a34a;font-size:.85rem'>✓ 문제 없음</span></h3>"
               + (f"<div class='field'>{e(it['evidence'])}</div>" if it.get("evidence") else "")
               + "</div>")

    if data["angle_unlock"]:
        ap("<h2>이번 촬영으로 볼 수 없었던 부분</h2>")
        ap(f"<p class='meta'>{angle} 각도에서는 아래 항목을 판정할 수 없습니다. "
           f"추가 촬영 시 더 완전한 진단이 가능합니다.</p><ul>")
        for a, items in data["angle_unlock"].items():
            uniq = ", ".join(dict.fromkeys(items))
            ap(f"<li><b>{ANGLE_KR.get(a, a)} 촬영 추가 시</b>: {e(uniq)}</li>")
        ap("</ul>")

    ap("<footer>본 리포트는 AI가 동일 영상을 3회 독립 분석해 일치한 결과만 채택한 것입니다. "
       "영상에 보이지 않는 부분은 추측하지 않으며, 정량 수치(각도·거리)는 제공하지 않습니다.</footer>")
    ap("</body></html>")
    return "".join(parts)


def main():
    p = argparse.ArgumentParser(description="분석 결과 → 사용자용 리포트 생성")
    p.add_argument("result_dir", help="aggregate.json이 있는 결과 폴더")
    args = p.parse_args()

    result_dir = Path(args.result_dir)
    if not (result_dir / "aggregate.json").exists():
        sys.exit(f"[에러] aggregate.json 없음: {result_dir}")

    agg, runs = load_results(result_dir)
    if not runs:
        sys.exit("[에러] 파싱 가능한 run JSON이 없습니다")
    schema = json.loads(SCHEMA_PATHS[agg["meta"]["stroke"]].read_text(encoding="utf-8"))

    data = collect(agg, runs, schema)
    (result_dir / "report.md").write_text(render_markdown(agg, data), encoding="utf-8")
    (result_dir / "report.html").write_text(render_html(agg, data), encoding="utf-8")
    print(f"[*] 리포트 생성 완료: {result_dir}/report.md, report.html")
    print(f"    확정 {len(data['confirmed'])} / 의심 {len(data['suspect'])} / "
          f"양호 {len(data['good'])} / 판정불가 {len(data['invisible'])}")


if __name__ == "__main__":
    main()
