// Minimal document API for the portfolio site.
// Stores uploaded files on disk (server/uploads) and metadata in a JSON file
// (server/data/documents.json). Admin actions are gated by a password.
import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "shoxruz123123";

const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "documents.json");

// --- storage helpers -----------------------------------------------------
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

function readDocs() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeDocs(docs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2));
}

function humanSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function nextCall(docs) {
  const max = docs.reduce((m, d) => {
    const n = parseInt(String(d.call).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `EC·${String(max + 1).padStart(2, "0")}`;
}

// --- seed from the existing /public/docs the first time ------------------
function seed() {
  if (fs.existsSync(DATA_FILE)) return;
  const SEED = [
    { call: "EC·01", title: "Dinamik makroiqtisodiyot", course: "Makroiqtisodiy jarayonlar va modellar", file: "dinamik-makroiqtisodiyot.docx", group: "lecture" },
    { call: "EC·02", title: "Innovatsion iqtisodiyot", course: "Innovatsiya va texnologik rivojlanish", file: "innovatsion-iqtisodiyot.docx", group: "lecture" },
    { call: "EC·03", title: "Iqtisodiy o‘sish", course: "O‘sish omillari va o‘lchovlari", file: "iqtisodiy-osish.docx", group: "lecture" },
    { call: "EC·04", title: "Iqtisodiy siyosatga kirish", course: "Davlat siyosati asoslari", file: "iqtisodiy-siyosatga-kirish.docx", group: "lecture" },
    { call: "EC·05", title: "Raqamli iqtisodiyot", course: "Raqamli transformatsiya va platformalar", file: "raqamli-iqtisodiyot.docx", group: "lecture" },
    { call: "EC·06", title: "Tadbirkorlik subyektlari uchun qo‘llanma", course: "Amaliy taqdimot — qo‘llanma", file: "tadbirkorlik-qollanma.pptx", group: "guide" },
  ];
  const srcDir = path.join(ROOT, "public", "docs");
  const docs = [];
  for (const s of SEED) {
    const src = path.join(srcDir, s.file);
    if (!fs.existsSync(src)) continue;
    const stored = `${crypto.randomUUID()}-${s.file}`;
    fs.copyFileSync(src, path.join(UPLOADS_DIR, stored));
    const size = fs.statSync(src).size;
    docs.push({
      id: crypto.randomUUID(),
      call: s.call,
      title: s.title,
      course: s.course,
      file: s.file,
      stored,
      type: path.extname(s.file).slice(1).toLowerCase(),
      size: humanSize(size),
      group: s.group,
    });
  }
  writeDocs(docs);
  console.log(`Seeded ${docs.length} documents.`);
}
seed();

// --- auth (simple in-memory bearer tokens) ------------------------------
const tokens = new Set();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token && tokens.has(token)) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// --- app -----------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use("/files", express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) =>
      cb(null, `${crypto.randomUUID()}-${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

app.post("/api/login", (req, res) => {
  if ((req.body?.password || "") !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "wrong password" });
  }
  const token = crypto.randomUUID();
  tokens.add(token);
  res.json({ token });
});

app.get("/api/documents", (_req, res) => {
  res.json(readDocs().map(({ stored, ...d }) => ({ ...d, url: `/files/${stored}` })));
});

app.post("/api/documents", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  const docs = readDocs();
  const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
  const doc = {
    id: crypto.randomUUID(),
    call: req.body.call?.trim() || nextCall(docs),
    title: req.body.title?.trim() || req.file.originalname,
    course: req.body.course?.trim() || "",
    file: req.file.originalname,
    stored: req.file.filename,
    type: ext,
    size: humanSize(req.file.size),
    group: req.body.group === "guide" ? "guide" : "lecture",
  };
  docs.push(doc);
  writeDocs(docs);
  const { stored, ...out } = doc;
  res.status(201).json({ ...out, url: `/files/${stored}` });
});

app.delete("/api/documents/:id", requireAuth, (req, res) => {
  const docs = readDocs();
  const idx = docs.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  const [removed] = docs.splice(idx, 1);
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, removed.stored));
  } catch {
    /* file already gone — ignore */
  }
  writeDocs(docs);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Document API listening on http://localhost:${PORT}`);
});
