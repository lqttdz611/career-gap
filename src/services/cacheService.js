import pool from "../config/database.js";

function parseMaybeJson(value) {
  if (value == null) return value;
  if (typeof value === "object") return value; // json/jsonb from pg may already be parsed
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  // Only attempt parse for JSON-looking strings
  const looksJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!looksJson) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeCachedRow(row) {
  const missing_skills = parseMaybeJson(row.missing_skills) ?? [];
  const learning_steps = parseMaybeJson(row.learning_steps) ?? [];
  const interview_questions = parseMaybeJson(row.interview_questions) ?? [];

  return {
    id: row.id,
    missing_skills,
    learning_steps,
    interview_questions,
    created_at: row.created_at,
  };
}

/**
 * CONSTRAINT: Caching
 * Kiểm tra xem cặp resume+JD này đã được analyze chưa
 */
export async function getCachedAnalysis(resumeHash) {
  try {
    const result = await pool.query(
      "SELECT * FROM analyses WHERE resume_hash = $1",
      [resumeHash],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return normalizeCachedRow(row);
  } catch (error) {
    console.error("Error getting cached analysis:", error);
    throw error;
  }
}

/**
 * Lưu kết quả phân tích vào database
 */
export async function saveAnalysis(
  resumeHash,
  resumeText,
  jdText,
  analysisData,
) {
  try {
    const result = await pool.query(
      `INSERT INTO analyses
       (resume_hash, resume_text, jd_text, missing_skills, learning_steps, interview_questions)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
       RETURNING id, created_at`,
      [
        resumeHash,
        resumeText,
        jdText,
        JSON.stringify(analysisData.missing_skills ?? []),
        JSON.stringify(analysisData.learning_steps ?? []),
        JSON.stringify(analysisData.interview_questions ?? []),
      ],
    );

    return {
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
      ...analysisData,
    };
  } catch (error) {
    console.error("Error saving analysis:", error);
    throw error;
  }
}

/**
 * Lấy analysis theo ID
 */
export async function getAnalysisById(id) {
  try {
    const result = await pool.query("SELECT * FROM analyses WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return normalizeCachedRow(row);
  } catch (error) {
    console.error("Error getting analysis by ID:", error);
    throw error;
  }
}
