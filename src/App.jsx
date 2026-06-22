import { useEffect, useRef, useState } from "react";
import mePhoto from "./assets/me.jpeg";
import Backdrop from "./Backdrop";
import Admin from "./Admin";
import { fileUrl, listDocuments } from "./api";
import "./App.css";

/* Adds an `is-in` class the first time the element scrolls into view, so CSS
   can fade + rise it. Falls back to immediately visible without IO support. */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      node.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return ref;
}

// --- Edit your details here ---------------------------------------------
const PROFILE = {
  name: ["Shoxruz", "Amrullayev"],
  aka: "Shoxruz",
  bio: "Salom! Men iqtisodiyot yo‘nalishi bo‘yicha o‘quv materiallarini to‘plab, talabalar uchun shu yerda ulashaman. Pastda fan hujjatlari va qo‘llanmalarni o‘qing yoki o‘zingizga yuklab oling.",
  telegram: "@amrullaefv", // o‘zingiznikiga almashtiring
  email: "amrullayev@gmail.com",
};
// ------------------------------------------------------------------------

const GROUPS = [
  {
    id: "lecture",
    label: "Ma’ruza hujjatlari",
    note: "Word formatdagi fan materiallari",
  },
  {
    id: "guide",
    label: "Qo‘llanma",
    note: "Taqdimot formatidagi amaliy qo‘llanma",
  },
];

/* Hand-drawn arrow pointing from the intro toward the portrait. */
function Arrow() {
  return (
    <svg className="hero-arrow" viewBox="0 0 130 86" aria-hidden="true">
      <path
        d="M4 70 C 34 84, 64 74, 82 44 C 91 29, 98 19, 118 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="1"
      />
      <path
        d="M118 14 L 101 13 M118 14 L 110 29"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="1"
      />
    </svg>
  );
}

function Squiggle({ className }) {
  return (
    <svg className={className} viewBox="0 0 60 18" aria-hidden="true">
      <path
        d="M2 12 C 8 2, 14 2, 20 12 S 32 22, 38 12 S 50 2, 58 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="1"
      />
    </svg>
  );
}

function Hero() {
  const textRef = useReveal();
  const photoRef = useReveal();
  return (
    <header className="hero">
      <div className="hero-text reveal" ref={textRef}>
        <p className="script-label">
          Men haqimda!
          <Squiggle className="label-squiggle" />
        </p>
        <h1 className="name">
          {PROFILE.name[0]}
          <br />
          {PROFILE.name[1]}
        </h1>
        <p className="aka">
          A.K.A <span>{PROFILE.aka}</span>
        </p>
        <p className="bio">
          <strong>Salom!</strong> {PROFILE.bio.replace(/^Salom!\s*/, "")}
        </p>
        <div className="hero-social">
          <a
            className="social"
            href={`https://t.me/${PROFILE.telegram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.7 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5l18.3-7c.9-.3 1.6.2 1.4 1.1Z"
              />
            </svg>
            {PROFILE.telegram}
          </a>
          <a className="social" href={`mailto:${PROFILE.email}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                d="M3 6.5h18v11H3zM3.5 7l8.5 6 8.5-6"
              />
            </svg>
            {PROFILE.email}
          </a>
        </div>
      </div>

      <div className="hero-photo reveal" ref={photoRef}>
        <Arrow />
        <span className="photo-disc" aria-hidden="true" />
        <span className="photo-ring">
          <img src={mePhoto} alt={`${PROFILE.name.join(" ")} portreti`} />
        </span>
        <Squiggle className="photo-squiggle" />
      </div>
    </header>
  );
}

function Reader({ doc, onClose }) {
  const [state, setState] = useState("loading"); // loading | ready | error | pptx
  const [html, setHtml] = useState("");

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("loading");
    setHtml("");

    if (doc.type === "docx") {
      Promise.all([
        import("mammoth/mammoth.browser"),
        fetch(fileUrl(doc.url)).then((r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.arrayBuffer();
        }),
      ])
        .then(([mammoth, buffer]) =>
          mammoth.default.convertToHtml({ arrayBuffer: buffer }),
        )
        .then((result) => {
          if (!active) return;
          setHtml(result.value || "");
          setState("ready");
        })
        .catch(() => active && setState("error"));
    } else {
      // No reliable client-side .pptx renderer — Microsoft's viewer needs a
      // public URL, so it only renders the slides once the site is deployed.
      setState("pptx");
    }

    return () => {
      active = false;
    };
  }, [doc]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const fullUrl = fileUrl(doc.url);
  const officeUrl =
    "https://view.officeapps.live.com/op/view.aspx?src=" +
    encodeURIComponent(fullUrl);
  const isLocal =
    typeof window !== "undefined" &&
    /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname);

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
              href={fileUrl(doc.url)}
              download={doc.file}
            >
              Yuklab olish
            </a>
            <button
              className="btn btn-close"
              onClick={onClose}
              aria-label="Yopish"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="reader-body">
          {state === "loading" && <p className="reader-status">Ochilmoqda…</p>}

          {state === "ready" && (
            <article
              className="sheet"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          {state === "error" && (
            <div className="reader-fallback">
              <p>Hujjatni shu yerda ko‘rsatib bo‘lmadi.</p>
              <a
                className="btn btn-solid"
                href={fileUrl(doc.url)}
                download={doc.file}
              >
                O‘rniga yuklab oling
              </a>
            </div>
          )}

          {state === "pptx" &&
            (isLocal ? (
              <div className="reader-fallback">
                <p>
                  Taqdimotni jonli ko‘rish Microsoft ko‘ruvchisi orqali ishlaydi
                  — bu sayt internetga joylangach faollashadi.
                </p>
                <div className="reader-fallback-actions">
                  <a
                    className="btn btn-solid"
                    href={fileUrl(doc.url)}
                    download={doc.file}
                  >
                    Yuklab olish
                  </a>
                  <a
                    className="btn btn-ghost"
                    href={officeUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
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
  );
}

function Row({ doc, onOpen }) {
  const ref = useReveal();
  return (
    <li className="row reveal" ref={ref}>
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
        <a
          className="btn btn-solid"
          href={fileUrl(doc.url)}
          download={doc.file}
        >
          Yuklab olish
        </a>
      </span>
    </li>
  );
}

function Group({ group, docs, onOpen }) {
  const ref = useReveal();
  return (
    <section className="group reveal" key={group.id} ref={ref}>
      <div className="group-head">
        <h3>{group.label}</h3>
        <span className="group-note">{group.note}</span>
        <span className="group-count">{docs.length}</span>
      </div>
      <ul className="rows">
        {docs.map((doc) => (
          <Row key={doc.id} doc={doc} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

function Catalog() {
  const [active, setActive] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const headRef = useReveal();

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch(() => setLoadError(true));
  }, []);

  return (
    <div className="page">
      <Backdrop />
      <Hero />

      <main className="catalog">
        <div className="catalog-head reveal" ref={headRef}>
          <span className="script-label small">Manbalar</span>
          <h2 className="catalog-title">Hujjatlar</h2>
          <p className="catalog-sub">
            Har bir hujjatni shu yerda o‘qing yoki yuklab oling.
          </p>
        </div>

        {loadError && (
          <p className="catalog-sub">Hujjatlarni yuklab bo‘lmadi — server ishlayotganiga ishonch hosil qiling.</p>
        )}

        {GROUPS.map((group) => (
          <Group
            key={group.id}
            group={group}
            docs={docs.filter((d) => d.group === group.id)}
            onOpen={setActive}
          />
        ))}
      </main>

      <footer className="foot">
        <span>{PROFILE.name.join(" ")}</span>
        <span className="foot-mono">
          docx · pptx — ko‘rish &amp; yuklab olish
        </span>
      </footer>

      {active && <Reader doc={active} onClose={() => setActive(null)} />}
    </div>
  );
}

export default function App() {
  // Tiny router: /admin gets the admin screen, everything else the catalog.
  const isAdmin =
    typeof window !== "undefined" && window.location.pathname === "/admin";
  return isAdmin ? <Admin /> : <Catalog />;
}
