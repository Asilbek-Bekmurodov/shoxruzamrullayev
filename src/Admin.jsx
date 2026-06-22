import { useEffect, useState } from "react";
import {
  deleteDocument,
  getToken,
  listDocuments,
  login,
  setToken,
  uploadDocument,
} from "./api";

const GROUP_OPTIONS = [
  { id: "lecture", label: "Ma’ruza hujjati" },
  { id: "guide", label: "Qo‘llanma" },
];

function Login({ onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await login(password);
      setToken(token);
      onDone();
    } catch {
      setError("Parol noto‘g‘ri.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-gate">
      <form className="admin-card" onSubmit={submit}>
        <h1>Admin</h1>
        <p className="admin-sub">Davom etish uchun parolni kiriting.</p>
        <input
          type="password"
          className="admin-input"
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="admin-error">{error}</p>}
        <button className="btn btn-solid" type="submit" disabled={busy}>
          {busy ? "Tekshirilmoqda…" : "Kirish"}
        </button>
      </form>
    </div>
  );
}

function Panel({ onLogout }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [group, setGroup] = useState("lecture");
  const [call, setCall] = useState("");
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    try {
      setDocs(await listDocuments());
      setError("");
    } catch {
      setError("Serverga ulanib bo‘lmadi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listDocuments()
      .then((d) => active && setDocs(d))
      .catch(() => active && setError("Serverga ulanib bo‘lmadi."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function unauthorized() {
    setToken("");
    onLogout();
  }

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadDocument({ file, title, course, group, call });
      setFile(null);
      setTitle("");
      setCourse("");
      setCall("");
      e.target.reset();
      await refresh();
    } catch (err) {
      if (err.message === "unauthorized") return unauthorized();
      setError("Yuklashda xatolik.");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(doc) {
    if (!confirm(`“${doc.title}” o‘chirilsinmi?`)) return;
    try {
      await deleteDocument(doc.id);
      await refresh();
    } catch (err) {
      if (err.message === "unauthorized") return unauthorized();
      setError("O‘chirishda xatolik.");
    }
  }

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <h1>Hujjatlarni boshqarish</h1>
        <div className="admin-top-actions">
          <a className="btn btn-ghost" href="/">
            Saytga qaytish
          </a>
          <button className="btn btn-ghost" onClick={unauthorized}>
            Chiqish
          </button>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <section className="admin-section">
        <h2>Yangi hujjat qo‘shish</h2>
        <form className="admin-form" onSubmit={onUpload}>
          <label className="admin-field">
            <span>Fayl (docx / pptx / pdf …)</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </label>
          <label className="admin-field">
            <span>Sarlavha</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Iqtisodiy o‘sish"
            />
          </label>
          <label className="admin-field">
            <span>Kurs / tavsif</span>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Masalan: O‘sish omillari"
            />
          </label>
          <div className="admin-row">
            <label className="admin-field">
              <span>Bo‘lim</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                {GROUP_OPTIONS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Kod (ixtiyoriy)</span>
              <input
                type="text"
                value={call}
                onChange={(e) => setCall(e.target.value)}
                placeholder="EC·07"
              />
            </label>
          </div>
          <button className="btn btn-solid" type="submit" disabled={uploading}>
            {uploading ? "Yuklanmoqda…" : "Qo‘shish"}
          </button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Mavjud hujjatlar ({docs.length})</h2>
        {loading ? (
          <p className="admin-sub">Yuklanmoqda…</p>
        ) : docs.length === 0 ? (
          <p className="admin-sub">Hozircha hujjat yo‘q.</p>
        ) : (
          <ul className="admin-list">
            {docs.map((doc) => (
              <li key={doc.id} className="admin-item">
                <div className="admin-item-meta">
                  <span className="admin-item-call">{doc.call}</span>
                  <span className="admin-item-title">{doc.title}</span>
                  <span className="admin-item-sub">
                    {doc.course} · {doc.type} · {doc.size}
                  </span>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={() => onDelete(doc)}
                >
                  O‘chirish
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  return authed ? (
    <Panel onLogout={() => setAuthed(false)} />
  ) : (
    <Login onDone={() => setAuthed(true)} />
  );
}
