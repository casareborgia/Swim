const DISCLAIMER =
  '본 서비스는 생성형 AI 기술을 기반으로 코칭을 제공하므로 기술적 한계에 따른 오류가 있을 수 ' +
  '있습니다. 시스템 보안과 데이터 방어에 만전을 기하지만, 유저가 직접 업로드한 영상 콘텐츠로 ' +
  '인해 발생하는 제3자와의 초상권 및 법적 분쟁에 대해 본 서비스는 일체의 책임을 지지 않습니다.'

const h = 'mt-6 text-base font-bold'
const p = 'mt-2 text-sm leading-relaxed text-slate-600'

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'support@example.com'

export function Terms() {
  return (
    <div className="py-10">
      <h1 className="text-2xl font-extrabold">이용약관</h1>
      <p className={p}>최종 개정: 2026-07-07 (베타)</p>

      <h2 className={h}>1. 서비스 내용</h2>
      <p className={p}>
        수영코치 AI(이하 "서비스")는 이용자가 업로드한 수영 영상을 생성형 AI로 분석해 자세 교정
        리포트를 제공하는 서비스입니다. 리포트는 운동 참고 목적의 정보이며, 의료적 진단이나 전문
        코칭 계약을 대체하지 않습니다.
      </p>

      <h2 className={h}>2. 이용자의 의무 (영상 업로드 책임)</h2>
      <p className={p}>
        이용자는 본인이 촬영 권한을 가진 영상만 업로드해야 합니다. 타인의 신체나 얼굴이 동의 없이
        포함된 영상을 업로드하는 경우 서비스 이용이 즉시 정지되며, 이로 인한 초상권 침해 및
        성폭력처벌법(카메라등이용촬영죄) 등 모든 민형사상 법적 책임은 업로더 본인에게 있습니다.
      </p>

      <h2 className={h}>3. 이용 제한</h2>
      <p className={p}>
        베타 기간 동안 이메일당 1회의 무료 분석이 제공되며, 어뷰징 방지를 위해 IP당 시간당 업로드
        횟수가 제한됩니다. 자동화 도구(매크로)를 이용한 대량 업로드는 사전 통보 없이 차단됩니다.
      </p>

      <h2 className={h}>4. 면책 조항</h2>
      <p className={p}>{DISCLAIMER}</p>

      <h2 className={h}>5. 문의</h2>
      <p className={p}>{CONTACT_EMAIL}</p>
    </div>
  )
}

export function Privacy() {
  return (
    <div className="py-10">
      <h1 className="text-2xl font-extrabold">개인정보 처리방침</h1>
      <p className={p}>최종 개정: 2026-07-07 (베타)</p>

      <h2 className={h}>1. 수집하는 정보</h2>
      <p className={p}>
        이메일 주소(리포트 발송), 업로드 영상 및 영상 속 본인 식별 정보(수영복·수모 색), 접속
        IP(어뷰징 방지 목적) — 서비스 제공에 필요한 최소한의 정보만 수집합니다.
      </p>

      <h2 className={h}>2. 영상 데이터의 처리 및 국외 이전</h2>
      <p className={p}>
        업로드된 영상은 AI 분석을 위해 외부 기술 제공사(Google Gemini API 등 생성형 AI 제공사)의
        서버로 전송되어 처리되며, 이 과정에서 데이터가 국외로 이전될 수 있습니다. 분석 완료 후
        영상은 AI 제공사 서버에서 즉시 삭제 처리되며, 당사 서버의 원본은 리포트 발송 및 품질
        검증 완료 후 파기합니다.
      </p>

      <h2 className={h}>3. 보유 기간</h2>
      <p className={p}>
        영상: 리포트 발송 후 최대 30일 내 파기(품질 검증 목적). 이메일: 서비스 운영 기간 동안
        보관하며 삭제 요청 시 즉시 파기합니다.
      </p>

      <h2 className={h}>4. 이용자의 권리</h2>
      <p className={p}>
        이용자는 언제든지 본인 데이터의 열람·삭제를 요청할 수 있습니다. 문의: {CONTACT_EMAIL}
      </p>

      <h2 className={h}>5. 면책 조항</h2>
      <p className={p}>{DISCLAIMER}</p>
    </div>
  )
}

export { DISCLAIMER }
