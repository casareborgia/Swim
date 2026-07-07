import type { Page } from '../App'

export default function Landing({ go }: { go: (p: Page) => void }) {
  return (
    <div>
      {/* 히어로 */}
      <section className="py-14 text-center">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          무료 베타 · 선착순 50명
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-snug sm:text-4xl">
          내 수영 영상을 올리면,
          <br />
          <span className="text-sky-600">AI 코치가 교정 포인트</span>를 찾아드립니다
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-500">
          자유형·배영·평영·접영 4영법 진단. AI가 같은 영상을 3회 독립 분석해 일치한 결과만
          채택한 정밀 리포트를 24시간 내에 이메일로 보내드립니다.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => go('upload')}
            className="rounded-xl bg-sky-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700"
          >
            무료로 내 수영 분석하기
          </button>
          <a
            href="/example-report.html"
            target="_blank"
            className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-lg font-semibold text-slate-600 hover:bg-slate-100"
          >
            실제 리포트 예시 보기
          </a>
        </div>
      </section>

      {/* 3단계 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { n: '1', t: '영상 업로드', d: '촬영 가이드에 맞춰 찍은 15~30초 수영 영상을 올립니다. 영법과 촬영 각도를 선택하세요.' },
          { n: '2', t: 'AI 3회 교차 분석', d: '동일 영상을 3회 독립 분석해, 3회 모두 일치한 결함만 "확정"으로 채택합니다. 추측 진단은 하지 않습니다.' },
          { n: '3', t: '이메일로 리포트 발송', d: 'AI 분석이 완료된 리포트를 24시간 내 이메일로 발송합니다. 교정 우선순위와 처방 드릴 포함.' },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
              {s.n}
            </div>
            <h3 className="font-bold">{s.t}</h3>
            <p className="mt-1 text-sm text-slate-500">{s.d}</p>
          </div>
        ))}
      </section>

      {/* 신뢰 포인트 */}
      <section className="mt-12 rounded-2xl bg-slate-900 p-6 text-slate-100 sm:p-8">
        <h2 className="text-xl font-bold">점수 매기는 AI가 아닙니다</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>
            ✅ <b className="text-white">근거 있는 진단</b> — 모든 교정 포인트에 영상 타임스탬프
            근거가 붙습니다. 안 보이는 건 "판정 불가"로 정직하게 표기합니다.
          </li>
          <li>
            ✅ <b className="text-white">일치한 것만 채택</b> — 3회 분석 중 일부에서만 나온 결함은
            "의심 단계"로 분리해, 과잉 진단을 막습니다.
          </li>
          <li>
            ✅ <b className="text-white">교정 우선순위 + 드릴 처방</b> — 결함 나열이 아니라, 무엇부터
            고쳐야 다른 문제가 함께 풀리는지 순서를 알려드립니다.
          </li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">자주 묻는 질문</h2>
        <div className="space-y-3">
          {[
            {
              q: '어떤 영상이든 분석되나요?',
              a: '촬영 각도에 따라 볼 수 있는 항목이 다릅니다. 측면 영상은 캐치·글라이드·하체 처짐에 강하고, 정면/후면 영상은 좌우 대칭·크로스오버에 강합니다. 촬영 가이드를 따라 주시면 가장 완전한 리포트를 받을 수 있고, 판정이 어려운 항목은 리포트에 "추가 촬영 시 진단 가능"으로 안내됩니다.',
            },
            {
              q: '수중 촬영이 아니어도 되나요?',
              a: '네. 데크(물 밖) 촬영도 분석 가능합니다. 다만 수중 동작(캐치, 킥 형태)은 수중 촬영에서 훨씬 정확해집니다. 데크 촬영 영상은 자동 키프레임 전처리를 거쳐 분석합니다.',
            },
            {
              q: '오리발(핀)을 착용했는데요?',
              a: '핀·패들 착용 시 킥 관련 항목은 본래 습관이 가려져 판정을 보류합니다. 킥 진단을 원하시면 맨몸 영상을 권합니다.',
            },
            {
              q: '영상은 어떻게 처리되나요?',
              a: '분석 목적으로만 사용하며, 분석 완료 후 AI 서버에서 즉시 삭제됩니다. 베타 기간 중 진단 품질 개선을 위한 내부 검증에 활용될 수 있으며 외부에 공개되지 않습니다.',
            },
          ].map((f) => (
            <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-12 text-center">
        <button
          onClick={() => go('upload')}
          className="rounded-xl bg-sky-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700"
        >
          무료 베타 신청하기 →
        </button>
      </div>
    </div>
  )
}
