import { useState } from 'react'
import Landing from './components/Landing'
import UploadForm from './components/UploadForm'
import Guide from './components/Guide'
import { Terms, Privacy, DISCLAIMER } from './components/Legal'

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'support@example.com'

export type Page = 'landing' | 'upload' | 'guide' | 'terms' | 'privacy'

export default function App() {
  const [page, setPage] = useState<Page>('landing')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={() => setPage('landing')} className="text-lg font-extrabold text-sky-600">
            🏊 수영코치 AI
          </button>
          <nav className="flex gap-2 text-sm">
            <button
              onClick={() => setPage('guide')}
              className={`rounded-lg px-3 py-1.5 ${page === 'guide' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100'}`}
            >
              촬영 가이드
            </button>
            <button
              onClick={() => setPage('upload')}
              className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700"
            >
              분석 신청
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        {page === 'landing' && <Landing go={setPage} />}
        {page === 'upload' && <UploadForm go={setPage} />}
        {page === 'guide' && <Guide go={setPage} />}
        {page === 'terms' && <Terms />}
        {page === 'privacy' && <Privacy />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex justify-center gap-4 font-semibold text-slate-500">
            <button onClick={() => setPage('terms')} className="hover:text-sky-600">
              이용약관
            </button>
            <button onClick={() => setPage('privacy')} className="hover:text-sky-600">
              개인정보 처리방침
            </button>
          </div>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed">{DISCLAIMER}</p>
          <p className="mt-3">수영코치 AI · 무료 베타 · 문의: {CONTACT_EMAIL}</p>
        </div>
      </footer>
    </div>
  )
}
