import { useEffect, useState } from 'react'
import './App.css'

// The collection — derived from the files in /public/docs.
// Two .pptx in the source folder were byte-identical, so the guide is listed once.
const COLLECTION = [
  {
    call: 'EC·01',
    title: 'Dinamik makroiqtisodiyot',
    course: 'Makroiqtisodiy jarayonlar va modellar',
    file: 'dinamik-makroiqtisodiyot.docx',
    type: 'docx',
    size: '124 KB',
    group: 'lecture',
  },
  {
    call: 'EC·02',
    title: 'Innovatsion iqtisodiyot',
    course: 'Innovatsiya va texnologik rivojlanish',
    file: 'innovatsion-iqtisodiyot.docx',
    type: 'docx',
    size: '54 KB',
    group: 'lecture',
  },
  {
    call: 'EC·03',
    title: 'Iqtisodiy o‘sish',
    course: 'O‘sish omillari va o‘lchovlari',
    file: 'iqtisodiy-osish.docx',
    type: 'docx',
    size: '73 KB',
    group: 'lecture',
  },
  {
    call: 'EC·04',
    title: 'Iqtisodiy siyosatga kirish',
    course: 'Davlat siyosati asoslari',
    file: 'iqtisodiy-siyosatga-kirish.docx',
    type: 'docx',
    size: '65 KB',
    group: 'lecture',
  },
  {
    call: 'EC·05',
    title: 'Raqamli iqtisodiyot',
    course: 'Raqamli transformatsiya va platformalar',
    file: 'raqamli-iqtisodiyot.docx',
    type: 'docx',
    size: '71 KB',
    group: 'lecture',
  },
  {
    call: 'EC·06',
    title: 'Tadbirkorlik subyektlari uchun qo‘llanma',
    course: 'Amaliy taqdimot — qo‘llanma',
    file: 'tadbirkorlik-qollanma.pptx',
    type: 'pptx',
    size: '1.8 MB',
    group: 'guide',
  },
]

const GROUPS = [
  { id: 'lecture', label: 'Ma’ruza hujjatlari', note: 'Word formatdagi fan materiallari' },
  { id: 'guide', label: 'Qo‘llanma', note: 'Taqdimot formatidagi amaliy qo‘llanma' },
]

function docPath(file) {
  return `/docs/${encodeURIComponent(file)}`
}

function Reader({ doc, onClose }) {
  const [state, setState] = useState('loading') // loading | ready | error
  const [html, setHtml] = useState('')

  useEffect(() => {
    let active = true
    setState('loading')
    setHtml('')

    if (doc.type === 'docx') {
      Promise.all([
        import('mammoth/mammoth.browser'),
        fetch(docPath(doc.file)).then((r) => {
          if (!r.ok) throw new Error('fetch failed')
          return r.arrayBuffer()
        }),
      ])
        .then(([mammoth, buffer]) =>
          mammoth.default.convertToHtml({ arrayBuffer: buffer }),
        )
        .then((result) => {
          if (!active) return
          setHtml(result.value || '')
          setState('ready')
        })
        .catch(() => active && setState('error'))
    } else {
      // No reliable client-side .pptx renderer — Microsoft's viewer needs a
      // public URL, so it only renders the slides once the site is deployed.
      setState('pptx')
    }

    return () => {
      active = false
    }
  }, [doc])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const fullUrl =
    typeof window !== 'undefined'
      ? window.location.origin + docPath(doc.file)
      : docPath(doc.file)
  const officeUrl =
    'https://view.officeapps.live.com/op/view.aspx?src=' +
    encodeURIComponent(fullUrl)
  const isLocal =
    typeof window !== 'undefined' &&
    /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname)

  return (
    <div className="reader-scrim" onClick={onClose}>
      <div
        className="reader"
        role="dialog"
        aria-modal="true"
        aria-label={doc.title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="reader-bar">
          <div className="reader-meta">
            <span className="reader-call">{doc.call}</span>
            <span className="reader-title">{doc.title}</span>
          </div>
          <div className="reader-actions">
            <a
              className="btn btn-ghost"
              href={docPath(doc.file)}
              download={doc.file}
            >
              Yuklab olish
            </a>
            <button className="btn btn-close" onClick={onClose} aria-label="Yopish">
              ✕
            </button>
          </div>
        </header>

        <div className="reader-body">
          {state === 'loading' && <p className="reader-status">Ochilmoqda…</p>}

          {state === 'ready' && (
            <article
              className="sheet"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          {state === 'error' && (
            <div className="reader-fallback">
              <p>Hujjatni shu yerda ko‘rsatib bo‘lmadi.</p>
              <a className="btn btn-solid" href={docPath(doc.file)} download={doc.file}>
                O‘rniga yuklab oling
              </a>
            </div>
          )}

          {state === 'pptx' &&
            (isLocal ? (
              <div className="reader-fallback">
                <p>
                  Taqdimotni jonli ko‘rish Microsoft ko‘ruvchisi orqali ishlaydi —
                  bu sayt internetga joylangach faollashadi.
                </p>
                <div className="reader-fallback-actions">
                  <a className="btn btn-solid" href={docPath(doc.file)} download={doc.file}>
                    Yuklab olish
                  </a>
                  <a className="btn btn-ghost" href={officeUrl} target="_blank" rel="noreferrer">
                    Ko‘ruvchida ochish
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                className="reader-frame"
                title={doc.title}
                src={officeUrl}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

function Row({ doc, onOpen }) {
  return (
    <li className="row">
      <span className="row-call">{doc.call}</span>
      <button className="row-main" onClick={() => onOpen(doc)}>
        <span className="row-title">{doc.title}</span>
        <span className="row-course">{doc.course}</span>
      </button>
      <span className="row-tags">
        <span className={`chip chip-${doc.type}`}>{doc.type}</span>
        <span className="row-size">{doc.size}</span>
      </span>
      <span className="row-actions">
        <button className="btn btn-ghost" onClick={() => onOpen(doc)}>
          Ko‘rish
        </button>
        <a className="btn btn-solid" href={docPath(doc.file)} download={doc.file}>
          Yuklab olish
        </a>
      </span>
    </li>
  )
}

export default function App() {
  const [active, setActive] = useState(null)

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-inner">
          <p className="eyebrow">
            O‘quv arxivi <span className="eyebrow-dot" /> Iqtisodiyot
          </p>
          <h1>
            Iqtisodiyot fanlari
            <br />
            <em>o‘qish zali</em>
          </h1>
          <p className="lede">
            Fan materiallari va qo‘llanmalar yagona katalogda. Har bir hujjatni
            shu yerda o‘qing yoki o‘zingiz uchun yuklab oling.
          </p>
        </div>
        <div className="masthead-count">
          <span className="count-num">{COLLECTION.length}</span>
          <span className="count-label">hujjat</span>
        </div>
      </header>

      <main className="catalog">
        {GROUPS.map((group) => {
          const docs = COLLECTION.filter((d) => d.group === group.id)
          return (
            <section className="group" key={group.id}>
              <div className="group-head">
                <h2>{group.label}</h2>
                <span className="group-note">{group.note}</span>
                <span className="group-count">{docs.length}</span>
              </div>
              <ul className="rows">
                {docs.map((doc) => (
                  <Row key={doc.file} doc={doc} onOpen={setActive} />
                ))}
              </ul>
            </section>
          )
        })}
      </main>

      <footer className="foot">
        <span>Iqtisodiyot o‘quv arxivi</span>
        <span className="foot-mono">docx · pptx — ko‘rish &amp; yuklab olish</span>
      </footer>

      {active && <Reader doc={active} onClose={() => setActive(null)} />}
    </div>
  )
}
