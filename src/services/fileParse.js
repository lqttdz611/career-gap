import fs from "fs";
import mammoth from "mammoth";
import path from "path";
// import pdfParse from "pdf-parse";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
// Parse DOCX file to text
async function parseDocx(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length === 0) {
      throw new Error(
        "Failed to extract text from DOCX file: empty or could not be parsed",
      );
    }
    console.log(
      `✅ Successfully parsed DOCX file: ${result.value.length} characters`,
    );
    return result.value;
  } catch (error) {
    console.error("❌ Error parsing DOCX file:", error.message);
    throw new Error(`Failed to parse DOCX file: ${error.message}`);
  }
}

// Parse PDF file to text
async function parsePdf(filePath) {
  try {
    // dynamic import
    // const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error(
        "Failed to extract text from PDF file: empty or could not be parsed",
      );
    }
    console.log(
      `✅ Successfully parsed PDF file: ${data.text.length} characters, ${data.numpages} pages`,
    );
    return data.text;
  } catch (error) {
    console.error("❌ Error parsing PDF file:", error.message);
    throw new Error(`Failed to parse PDF file: ${error.message}`);
  }
}

// Parse file based on file extension
export async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return await parsePdf(filePath);
    case ".docx":
    case ".doc":
      return await parseDocx(filePath);
    default:
      throw new Error(
        `Unsupported file extension: ${ext}. Only PDF, DOC, DOCX are supported.`,
      );
  }
}

// delete uploaded files after processing
export async function deleteUploadedFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
    console.log(`✅ Successfully deleted uploaded file: ${filePath}`);
  } catch (error) {
    console.error("❌ Error deleting uploaded file:", error.message);
    throw new Error(`Failed to delete uploaded file: ${error.message}`);
  }
}

// Clean text
export function cleanText(text) {
  return text
    .replace(/[^\x20-\x7E\s\u00C0-\u1EF9]/g, "")
    .replace(/\r\n/g, "\n") // normalize line breaks
    .replace(/\n{3,}/g, "\n\n") // remove excessive line breaks
    .replace(/\s{2,}/g, " ") // remove excessive spaces
    .trim();
}
