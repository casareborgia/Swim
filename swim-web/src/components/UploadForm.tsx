import { useRef, useState, useEffect } from 'react'
import type { Page } from '../App'

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'support@example.com'

const STROKES = [
  { value: 'freestyle', label: '자유형' },
  { value: 'backstroke', label: '배영' },
  { value: 'breaststroke', label: '평영' },
  { value: 'butterfly', label: '접영' },
]
const ANGLES = [
  { value: 'side', label: '측면' },
  { value: 'frontal', label: '정면' },
  { value: 'rear', label: '후면' },
]
const SHOTS = [
  { value: 'deck', label: '물 밖(데크)에서 촬영' },
  { value: 'underwater', label: '수중에서 촬영' },
]

const MAX_SIZE_MB = 50

export default function UploadForm({ go }: { go: (p: Page) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [stroke, setStroke] = useState('')
  const [angle, setAngle] = useState('')
  const [shot, setShot] = useState('')
  const [target, setTarget] = useState('')
  const [email] = useState('demo@example.com')
  const [agree, setAgree] = useState(false)
  const [agreeLegal, setAgreeLegal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [error, setError] = useState('')
  const [subId, setSubId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('received')
  const [statusDetail, setStatusDetail] = useState<string>('')
  const [reportReady, setReportReady] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!subId || !done) return

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${subId}`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data.state)
          setStatusDetail(data.detail || '')
          setReportReady(!!data.report_ready)
          if (data.report_ready || data.state === 'failed') {
            clearInterval(intervalId)
          }
        }
      } catch (err) {
        console.error('상태 폴링 실패:', err)
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [subId, done])

  const pickFile = (f: File | undefined | null) => {
    setError('')
    if (!f) return
    if (!f.type.startsWith('video/')) {
      setError('영상 파일만 업로드할 수 있습니다.')
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일이 너무 큽니다 (최대 ${MAX_SIZE_MB}MB). 필요한 구간만 잘라서 올려주세요.`)
      return
    }
    setFile(f)
  }

  const valid =
    file && stroke && angle && shot && target.trim() && /\S+@\S+\.\S+/.test(email) && agree && agreeLegal

  const submit = async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    setError('')
    const form = new FormData()
    form.append('video', file!)
    form.append('stroke', stroke)
    form.append('angle', angle)
    form.append('shot', shot)
    form.append('target', target.trim())
    form.append('email', email.trim())
    form.append('consent_legal', 'true')
    try {
      const res = await fetch('/api/submit', { method: 'POST', body: form })
      if (res.status === 402) {
        setPaywall(true)
        return
      }
      if (res.status === 429) {
        setError('시간당 업로드 한도를 초과했습니다. 1시간 후 다시 시도해 주세요.')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.detail || `접수에 실패했습니다 (오류 ${res.status}). 잠시 후 다시 시도해 주세요.`)
        return
      }
      const data = await res.json().catch(() => null)
      if (data && data.id) {
        setSubId(data.id)
        setStatus('received')
        setStatusDetail('')
        setReportReady(false)
        setDone(true)
      } else {
        setReportReady(false)
        setDone(true)
      }
    } catch {
      setError('접수에 실패했습니다. 잠시 후 다시 시도해 주세요. 문제가 계속되면 이메일로 영상을 보내주셔도 됩니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (paywall) {
    return (
      <div className="py-24 text-center">
        <div className="text-5xl">🎟️</div>
        <h1 className="mt-4 text-2xl font-extrabold">무료 분석을 모두 사용하셨어요</h1>
        <p className="mt-3 text-slate-500">
          베타 기간에는 이메일당 <b className="text-slate-700">1회 무료 분석</b>이 제공됩니다.
          <br />
          추가 분석 결제는 준비 중입니다 — 오픈 소식을 받고 싶으시면
          <br />
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-sky-600 underline">
            {CONTACT_EMAIL}
          </a>
          으로 연락 주세요.
        </p>
        <button
          onClick={() => go('landing')}
          className="mt-8 rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-600 hover:bg-slate-100"
        >
          처음으로
        </button>
      </div>
    )
  }

  if (done) {
    const isCompleted = status === 'completed'
    const isFailed = status === 'failed'
    const isAnalyzing = status === 'analyzing'
    const isReceived = status === 'received'

    return (
      <div className="py-16 text-center max-w-lg mx-auto">
        {/* 상단 아이콘/스피너 영역 */}
        <div className="flex justify-center mb-6">
          {isCompleted && reportReady && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl animate-bounce">
              🎉
            </div>
          )}
          {isCompleted && !reportReady && (
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"></div>
              <span className="text-2xl animate-pulse">✍️</span>
            </div>
          )}
          {isFailed && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">
              ❌
            </div>
          )}
          {(isReceived || isAnalyzing) && (
            <div className="relative flex h-16 w-16 items-center justify-center">
              {/* 스피너 */}
              <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600"></div>
              <span className="text-2xl animate-pulse">🏊‍♂️</span>
            </div>
          )}
        </div>

        {/* 메인 상태 타이틀 */}
        <h1 className="text-2xl font-extrabold text-slate-800">
          {isReceived && '영상을 접수했습니다'}
          {isAnalyzing && 'AI가 영법을 분석 중입니다'}
          {isCompleted && !reportReady && 'AI 분석 완료 (검수 대기 중)'}
          {isCompleted && reportReady && 'AI 분석이 완료되었습니다!'}
          {isFailed && '분석에 실패했습니다'}
        </h1>

        {/* 상태 설명글 */}
        <div className="mt-4 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed min-h-[70px] flex items-center justify-center">
          {isReceived && (
            <p>
              동영상 업로드가 성공적으로 완료되었습니다.
              <br />
              <span className="text-xs text-slate-400 mt-1 block">AI 분석 대기열에 진입하고 있습니다...</span>
            </p>
          )}
          {isAnalyzing && (
            <p>
              정밀 분석을 위해 <b>3회 독립 교차 검증</b>을 수행 중입니다.
              <br />
              <span className="text-xs text-slate-400 mt-1 block">평균 1~3분 정도 소요되며, 페이지를 닫지 말고 잠시만 대기해 주세요.</span>
            </p>
          )}
          {isCompleted && !reportReady && (
            <p>
              AI 분석이 성공적으로 마무리되었습니다.
              <br />
              <span className="text-xs text-sky-600 font-semibold mt-1 block">현재 수영 코치가 리포트 초안을 검수 중입니다. 승인 시 바로 리포트가 열립니다.</span>
            </p>
          )}
          {isCompleted && reportReady && (
            <p>
              교차 일치율이 확보된 신뢰성 높은 수영 코칭 리포트가 생성되었습니다.
              <br />
              <span className="text-xs text-slate-400 mt-1 block">아래 버튼을 눌러 리포트를 즉시 확인해 보세요!</span>
            </p>
          )}
          {isFailed && (
            <p>
              {statusDetail || '알 수 없는 요인으로 분석이 중단되었습니다.'}
              <br />
              <span className="text-xs text-rose-500 mt-1 block">관리자 문의 또는 다른 영상으로 다시 시도해 주세요.</span>
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-8 flex flex-col gap-3 justify-center items-center">
          {isCompleted && reportReady && (
            <button
              onClick={() => window.open(`/api/report/${subId}`, '_blank')}
              className="w-full max-w-xs rounded-xl bg-sky-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 hover:shadow-sky-300 transform active:scale-95 animate-pulse"
            >
              📊 진단 리포트 즉시 확인하기
            </button>
          )}
          {isCompleted && !reportReady && (
            <button
              disabled
              className="w-full max-w-xs rounded-xl bg-slate-300 py-3.5 px-6 font-bold text-slate-500 cursor-not-allowed shadow-none"
            >
              ⏳ 전문가 검수 완료 대기 중...
            </button>
          )}
          
          <button
            onClick={() => go('landing')}
            className={`w-full max-w-xs rounded-xl border border-slate-300 bg-white py-3 px-6 font-semibold text-slate-600 hover:bg-slate-100 transition ${
              isCompleted ? 'text-xs text-slate-400 border-none hover:bg-transparent underline' : ''
            }`}
          >
            {isCompleted ? '처음 화면으로 돌아가기' : '이전으로'}
          </button>
        </div>
      </div>
    )
  }

  const chip = (selected: boolean) =>
    `rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
      selected
        ? 'border-sky-600 bg-sky-600 text-white'
        : 'border-slate-300 bg-white text-slate-600 hover:border-sky-400'
    }`

  return (
    <div className="py-10">
      <h1 className="text-2xl font-extrabold">분석 신청</h1>
      <p className="mt-2 text-sm text-slate-500">
        아직 안 찍으셨다면{' '}
        <button onClick={() => go('guide')} className="font-semibold text-sky-600 underline">
          촬영 가이드
        </button>
        를 먼저 확인하세요. 촬영 각도가 맞아야 판정 가능한 항목이 늘어납니다.
      </p>

      {/* 안전 촬영 안내 (법적 리스크 방어) */}
      <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <b>📷 안전한 촬영을 위한 안내</b>
        <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed">
          <li>
            1. 레인 끝(벽면)에 방수 삼각대·거치대를 활용해 <b>본인만 단독으로 나오도록</b> 15~30초
            내외로 촬영하는 것을 권장합니다.
          </li>
          <li>
            2. 공공 수영장은 자체 규정에 따라 촬영이 제한될 수 있으므로, 촬영이 공식 허용된
            환경(프라이빗 레슨, 1:1 풀, 일부 민간/호텔 풀 등)에서의 이용을 권장합니다.
          </li>
        </ul>
      </div>

      {/* 영상 업로드 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]) }}
        onClick={() => fileInput.current?.click()}
        className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragOver ? 'border-sky-500 bg-sky-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-sky-400'
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file ? (
          <p className="font-semibold text-emerald-700">
            🎬 {file.name} <span className="text-sm font-normal">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
          </p>
        ) : (
          <>
            <p className="text-3xl">📹</p>
            <p className="mt-2 font-semibold">영상을 끌어다 놓거나 눌러서 선택</p>
            <p className="mt-1 text-xs text-slate-400">15~30초 권장 · 최대 {MAX_SIZE_MB}MB</p>
          </>
        )}
      </div>

      {/* 영법 */}
      <div className="mt-6">
        <label className="text-sm font-bold">영법</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {STROKES.map((s) => (
            <button key={s.value} onClick={() => setStroke(s.value)} className={chip(stroke === s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 각도 */}
      <div className="mt-5">
        <label className="text-sm font-bold">촬영 각도</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ANGLES.map((a) => (
            <button key={a.value} onClick={() => setAngle(a.value)} className={chip(angle === a.value)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* 수중/데크 */}
      <div className="mt-5">
        <label className="text-sm font-bold">촬영 방식</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHOTS.map((s) => (
            <button key={s.value} onClick={() => setShot(s.value)} className={chip(shot === s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 대상자 식별 */}
      <div className="mt-5">
        <label className="text-sm font-bold">영상 속 본인 식별 정보</label>
        <p className="text-xs text-slate-400">여러 명이 나와도 본인만 분석하도록, 수영복·수모 색을 알려주세요.</p>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="예: 빨간 수영복 + 흰색 수모"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-sky-500"
        />
      </div>

      {/* 동의 */}
      <label className="mt-5 flex items-start gap-2 text-sm text-slate-500">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
        <span>
          영상을 분석 목적으로 사용하는 데 동의합니다. 영상은 분석 후 AI 서버에서 삭제되며,
          베타 기간 중 품질 개선을 위한 내부 검증에만 활용됩니다.
        </span>
      </label>

      {/* 필수 법적 동의 (초상권·무단 촬영 책임) */}
      <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <input
          type="checkbox"
          checked={agreeLegal}
          onChange={(e) => setAgreeLegal(e.target.checked)}
          className="mt-1"
        />
        <span>
          <b>[필수]</b> 타인의 신체나 얼굴이 동의 없이 포함된 영상 업로드 시 서비스 이용이 즉시
          정지되며, 이로 인한 초상권 침해 및 성폭력처벌법(카메라등이용촬영죄) 등 모든 민형사상
          법적 책임은 업로더 본인에게 있음에 동의합니다.
        </span>
      </label>

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <button
        onClick={submit}
        disabled={!valid || submitting}
        className="mt-6 w-full rounded-xl bg-sky-600 py-3.5 text-lg font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {submitting ? '업로드 중…' : '무료 분석 신청하기'}
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">
        AI 3회 교차 분석 진행 후 즉시 결과 리포트 제공
      </p>
    </div>
  )
}
