# 🏊 수영코치 AI (SwimCoach AI)

> ⚠️ **법적 경고** — 본 코드를 이용해 타인을 동의 없이 촬영·분석하는 서비스를 구축하는 경우,
> 초상권 침해 및 성폭력처벌법(카메라등이용촬영죄) 등 **모든 민형사상 법적 책임은 해당 행위자 본인에게 있습니다.**
> 이 프로젝트는 본인 또는 촬영 동의를 받은 대상의 수영 자세 교정 목적으로만 사용해야 합니다.

**내 수영 영상 한 편으로 받는 AI 코칭 리포트.**
영상을 업로드하면 AI가 동일 영상을 3회 독립 분석해 일치한 결과만 채택하고, 코치 검수를 거친
교정 리포트(결함 근거 타임스탬프 + 우선순위 드릴 처방)를 이메일로 보내드립니다.

## 특징

- **점수 매기는 AI가 아닙니다** — 모든 진단에 영상 타임스탬프 근거가 붙고, 화면에 보이지 않는 항목은 "판정 불가"로 정직하게 표기
- **3회 교차 분석(self-consistency)** — 같은 영상을 3회 독립 분석해 다수결로 집계, 과잉 진단 방지
- **각도 게이팅** — 촬영 각도(측면/정면/후면)별로 판정 가능한 항목만 판정해 재현성 확보
- 자유형 · 배영 · 평영 · 접영 4영법 지원

## 아키텍처

```
[React SPA] 업로드 폼 → POST /api/submit
[FastAPI]   접수 → 백그라운드 분석(Gemini, 3회 병렬) → 리포트 초안 생성 → 검수 대기열(/admin)
[운영자]    검수 후 이메일 발송 (베타 운영 모델)
```

| 경로 | 역할 |
|---|---|
| `server.py` | FastAPI 백엔드 (접수 API, 어뷰징 방어, 검수 대기열) |
| `swim_analyze.py` | 분석 엔진 (프롬프트 조립 → N회 병렬 실행 → 다수결 집계) |
| `report_render.py` | 분석 결과 → 사용자용 HTML/Markdown 리포트 |
| `swim-web/` | 프론트엔드 (Vite + React + TypeScript + Tailwind) |

## 기술 스택

Python (FastAPI · google-genai) / React + TypeScript + Tailwind CSS / ffmpeg / Gemini API

## 실행 방법

> **참고**: 영법 판정 스키마와 코칭 프롬프트 원문은 이 저장소에 포함되어 있지 않습니다
> (`private_assets/` — 비공개 자산). 코드 구조상 `SWIM_ASSETS_DIR` 경로에
> `prompt_template_v1.3.md`와 `schemas/coaching_schema_<stroke>_v*.json`을 두면 동작하며,
> 스키마 형식은 `swim_analyze.py`의 로딩 코드를 참고해 직접 작성할 수 있습니다.

```bash
# 1) 의존성
pip install -r requirements.txt   # + 시스템에 ffmpeg 필요
npm install --prefix swim-web && npm run build --prefix swim-web

# 2) 환경 변수 (.env)
GEMINI_API_KEY=...        # 필수 (코드에 하드코딩 금지)
ADMIN_TOKEN=...           # /admin 검수 화면 보호
SWIM_ASSETS_DIR=...       # 프롬프트·스키마 위치 (기본 ./private_assets)
MAX_UPLOAD_MB=50          # 업로드 제한
FREE_CREDITS=1            # 이메일당 무료 분석 횟수
RATE_LIMIT_PER_HOUR=10    # IP당 시간당 업로드 한도

# 3) 서버
python3 -m uvicorn server:app --host <HOST> --port 8010
```

## 기여

Pull Request를 환영합니다. 특히 촬영 가이드 개선, 리포트 UI, 다국어 지원, 스토리지 백엔드(GCS/S3)
추가에 관심이 있다면 이슈로 먼저 제안해 주세요.

## 라이선스

[MIT](LICENSE) — 단, 상단의 법적 경고를 반드시 확인하세요. 본 소프트웨어를 악용한
무단 촬영·분석 서비스 구축으로 발생하는 모든 법적 책임은 당사자에게 있습니다.
