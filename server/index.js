// Document API for the portfolio site.
// Files + metadata live permanently in Cloudinary, so nothing is lost when
// the host (Render) restarts or its disk is wiped. Each document is a raw
// Cloudinary asset tagged "rais-doc"; its metadata rides along in the asset's
// context (base64url-encoded JSON, safe for Uzbek text and delimiters).
import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "shoxruz123123";

const TAG = "rais-doc";

// --- Cloudinary config ---------------------------------------------------
// Set either CLOUDINARY_URL, or the three CLOUDINARY_* vars, in the host env.
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
} else if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true }); // SDK parses CLOUDINARY_URL itself
}
const CLOUD_READY = Boolean(cloudinary.config().cloud_name);
if (!CLOUD_READY) {
  console.warn(
    "⚠️  Cloudinary not configured — set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET). Uploads will fail."
  );
}

// --- helpers -------------------------------------------------------------
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

// Base64url JSON — survives Uzbek text and Cloudinary's = | delimiters.
function encodeMeta(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function decodeMeta(s) {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function uploadToCloud(buffer, publicId, meta) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
        tags: [TAG],
        context: { meta: encodeMeta(meta) },
        overwrite: true,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function toDoc(resource) {
  const meta = decodeMeta(resource.context?.custom?.meta || "");
  return {
    id: resource.public_id,
    call: meta.call || "",
    title: meta.title || resource.public_id,
    course: meta.course || "",
    file: meta.file || "",
    type: meta.type || "",
    size: humanSize(resource.bytes || 0),
    group: meta.group === "guide" ? "guide" : "lecture",
    url: resource.secure_url,
  };
}

async function listDocs() {
  if (!CLOUD_READY) return [];
  const res = await cloudinary.api.resources_by_tag(TAG, {
    resource_type: "raw",
    context: true,
    max_results: 500,
  });
  return (res.resources || [])
    .map(toDoc)
    .sort((a, b) => a.call.localeCompare(b.call, undefined, { numeric: true }));
}

// --- seed from /public/docs the first time the store is empty ------------
const SEED = [
  { call: "EC·01", title: "Dinamik makroiqtisodiyot", course: "Makroiqtisodiy jarayonlar va modellar", file: "dinamik-makroiqtisodiyot.docx", group: "lecture" },
  { call: "EC·02", title: "Innovatsion iqtisodiyot", course: "Innovatsiya va texnologik rivojlanish", file: "innovatsion-iqtisodiyot.docx", group: "lecture" },
  { call: "EC·03", title: "Iqtisodiy o‘sish", course: "O‘sish omillari va o‘lchovlari", file: "iqtisodiy-osish.docx", group: "lecture" },
  { call: "EC·04", title: "Iqtisodiy siyosatga kirish", course: "Davlat siyosati asoslari", file: "iqtisodiy-siyosatga-kirish.docx", group: "lecture" },
  { call: "EC·05", title: "Raqamli iqtisodiyot", course: "Raqamli transformatsiya va platformalar", file: "raqamli-iqtisodiyot.docx", group: "lecture" },
  { call: "EC·06", title: "Tadbirkorlik subyektlari uchun qo‘llanma", course: "Amaliy taqdimot — qo‘llanma", file: "tadbirkorlik-qollanma.pptx", group: "guide" },
];

async function seedIfEmpty() {
  if (!CLOUD_READY) return;
  try {
    const existing = await listDocs();
    if (existing.length > 0) return;
    const srcDir = path.join(ROOT, "public", "docs");
    let seeded = 0;
    for (const s of SEED) {
      const src = path.join(srcDir, s.file);
      if (!fs.existsSync(src)) continue;
      const ext = path.extname(s.file).slice(1).toLowerCase();
      const publicId = `${crypto.randomUUID()}.${ext}`;
      await uploadToCloud(fs.readFileSync(src), publicId, {
        call: s.call,
        title: s.title,
        course: s.course,
        group: s.group,
        file: s.file,
        type: ext,
      });
      seeded += 1;
    }
    if (seeded) console.log(`Seeded ${seeded} documents to Cloudinary.`);
  } catch (e) {
    console.error("Seed failed:", e.message);
  }
}
seedIfEmpty();

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

const upload = multer({
  storage: multer.memoryStorage(),
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

app.get("/api/documents", async (_req, res) => {
  try {
    res.json(await listDocs());
  } catch (e) {
    console.error("List failed:", e.message);
    res.status(500).json({ error: "list failed" });
  }
});

app.post("/api/documents", requireAuth, upload.single("file"), async (req, res) => {
  if (!CLOUD_READY) return res.status(500).json({ error: "storage not configured" });
  if (!req.file) return res.status(400).json({ error: "file required" });
  try {
    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const publicId = `${crypto.randomUUID()}.${ext}`;
    let call = req.body.call?.trim();
    if (!call) call = nextCall(await listDocs());
    const meta = {
      call,
      title: req.body.title?.trim() || req.file.originalname,
      course: req.body.course?.trim() || "",
      group: req.body.group === "guide" ? "guide" : "lecture",
      file: req.file.originalname,
      type: ext,
    };
    const result = await uploadToCloud(req.file.buffer, publicId, meta);
    res.status(201).json({
      id: result.public_id,
      ...meta,
      size: humanSize(result.bytes),
      url: result.secure_url,
    });
  } catch (e) {
    console.error("Upload failed:", e.message);
    res.status(500).json({ error: "upload failed" });
  }
});

app.delete("/api/documents/:id", requireAuth, async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.id, {
      resource_type: "raw",
      invalidate: true,
    });
    if (result.result !== "ok" && result.result !== "not found") {
      return res.status(500).json({ error: "delete failed" });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete failed:", e.message);
    res.status(500).json({ error: "delete failed" });
  }
});

// Bind to 0.0.0.0 so hosts like Render can detect the open port.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Document API listening on port ${PORT}`);
});
