import type { Page } from '../App'

const angleCards = [
  {
    icon: '📐',
    title: '측면 (추천 시작 각도)',
    strong: '캐치 자세 · 글라이드 · 하체 처짐 · 호흡 자세 · 타이밍',
    how: '레인 옆에서 수영자가 화면을 가로지르도록 촬영. 수영자와 나란히 걸으며 찍거나, 중간 지점에 고정.',
  },
  {
    icon: '🎯',
    title: '정면 / 후면',
    strong: '좌우 대칭 · 크로스오버 입수 · 무릎 벌림 폭 · 몸통 롤링',
    how: '레인 끝(스타트대·벽면)에 삼각대로 고정하고 수영자가 다가오거나 멀어지는 모습을 촬영.',
  },
  {
    icon: '🤿',
    title: '수중 촬영 (가능하면 최고)',
    strong: '수중 캐치 · 킥 형태 · 힐업 등 물속 동작 전부',
    how: '방수팩·수중 하우징으로 수면 아래에서 촬영. 데크 촬영으로는 수중 동작 판정이 제한됩니다.',
  },
]

export default function Guide({ go }: { go: (p: Page) => void }) {
  return (
    <div className="py-10">
      <h1 className="text-2xl font-extrabold">촬영 가이드</h1>
      <p className="mt-2 text-slate-500">
        리포트 품질의 절반은 촬영이 결정합니다. 3분만 읽고 찍으면 판정 가능한 항목이 크게
        늘어납니다.
      </p>

      <div className="mt-6 space-y-4">
        {angleCards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">
              {c.icon} {c.title}
            </h3>
            <p className="mt-1 text-sm">
              <b className="text-sky-700">잘 보이는 것:</b> {c.strong}
            </p>
            <p className="mt-1 text-sm text-slate-500">{c.how}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-800">이렇게 찍어주세요 ✅</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-emerald-900">
            <li>• 15~30초, 스트로크 사이클이 4회 이상 담기게</li>
            <li>• 가로(landscape) 모드로 촬영</li>
            <li>• 수영자가 화면의 1/3 이상 크기로 보이게</li>
            <li>• 여러 명이 있다면 수영복·수모 색으로 구분되게</li>
            <li>• 한 영상에는 한 영법만</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="font-bold text-rose-800">이건 피해주세요 ❌</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-rose-900">
            <li>• 5초 이하의 너무 짧은 영상 (반복 관찰 불가)</li>
            <li>• 심하게 흔들리거나 확대/축소가 반복되는 영상</li>
            <li>• 오리발·패들 착용 (킥 판정이 보류됩니다)</li>
            <li>• 역광·야간 등 수영자가 실루엣으로만 보이는 영상</li>
            <li>• 출발·턴만 있고 정상 스트로크가 없는 영상</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-sky-50 p-5 text-sm text-sky-900">
        <b>📍 촬영 허가 안내</b> — 공공 수영장은 자체 규정에 따라 촬영이 제한될 수 있습니다.
        촬영이 공식 허용된 환경(프라이빗 레슨, 1:1 풀, 일부 민간/호텔 풀 등)에서의 이용을
        권장하며, 공공 수영장에서는 본인 촬영이라도 관리자에게 먼저 확인하세요. 레인 끝에
        거치대를 활용해 <b>본인만 단독으로</b> 나오게 촬영하고, 다른 이용자가 화면에 담기지
        않도록 해주세요. 타인이 동의 없이 포함된 영상은 접수가 거부됩니다.
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={() => go('upload')}
          className="rounded-xl bg-sky-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700"
        >
          준비됐어요, 분석 신청하기 →
        </button>
      </div>
    </div>
  )
}
