import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "../../uploads");
const resumeDir = path.join(uploadsDir, "resumes");
const jdDir = path.join(uploadsDir, "jds");

[uploadsDir, resumeDir, jdDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });

  }
})

// setting storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // set destination folder based on file type
    const folder = file.fieldname === "resume" ? resumeDir : jdDir;
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    // generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
})

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword", // doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ]

  const allowedExts = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLocaleLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only PDF, DOC, DOCX are allowed. Got: ${file.mimetype}`), false);
  }
}

// multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
})

// Middleware to handle file upload
export const uploadFiles = upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "jd", maxCount: 1 },
])
