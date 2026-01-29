import { analyzeWithGemini } from "../services/aiService.js";
import {
  getAnalysisById,
  getCachedAnalysis,
  saveAnalysis,
  getAllAnalysesFromDb,
  deleteAnalysisById,
} from "../services/cacheService.js";
import {
  parseFile,
  deleteUploadedFile,
  cleanText,
} from "../services/fileParse.js";
import { createCacheKey } from "../utils/hash.js";

function buildRoadmapMarkdown({
  missing_skills,
  learning_steps,
  interview_questions,
}) {
  const ms = Array.isArray(missing_skills) ? missing_skills : [];
  const steps = Array.isArray(learning_steps) ? learning_steps : [];
  const qs = Array.isArray(interview_questions) ? interview_questions : [];

  const skillsLine =
    ms.length > 0
      ? ms.map((s) => `- ${String(s).trim()}`).join("\n")
      : "- (none)";

  const stepsLine =
    steps.length > 0
      ? steps
          .map(
            (s, idx) =>
              `### Step ${idx + 1}\n${String(s.description || "").trim()}`,
          )
          .join("\n\n")
      : "(no steps)";

  const questionsLine =
    qs.length > 0
      ? qs
          .map(
            (q) =>
              `- **${String(q.topic || "").trim()}**: ${String(q.question || "").trim()}`,
          )
          .join("\n")
      : "- (none)";

  return `## Missing Skills\n${skillsLine}\n\n## 3 Concrete Learning Steps\n${stepsLine}\n\n## Interview Questions\n${questionsLine}\n`;
}

/**
 * POST /api/analyze
 * Analyze gap - support file upload and text input
 */
export async function analyzeGap(req, res) {
  let resumeFilePath = null;
  let jdFilePath = null;
  try {
    let resumeText, jdText;
    // Case upload files
    if (req.files && (req.files.resume || req.files.jd)) {
      console.log("🔍 Processing uploaded files...");

      // parse "resume" file
      if (req.files.resume && req.files.resume[0]) {
        resumeFilePath = req.files.resume[0].path;
        console.log(`Resume file: ${req.files.resume[0].originalname}`);
        resumeText = await parseFile(resumeFilePath);
        resumeText = cleanText(resumeText);
      } else if (req.body.resume_text) {
        resumeText = req.body.resume_text;
      } else {
        return res.status(400).json({
          error: "Resume file is required (either file upload or text",
        });
      }

      // parse "jd" file
      if (req.files.jd && req.files.jd[0]) {
        jdFilePath = req.files.jd[0].path;
        console.log(`JD file: ${req.files.jd[0].originalname}`);
        jdText = await parseFile(jdFilePath);
        jdText = cleanText(jdText);
      } else if (req.body.jd_text) {
        jdText = req.body.jd_text;
      } else {
        return res.status(400).json({
          error: "JD file is required (either file upload or text input)",
        });
      }
      // CASE Text input
    } else if (req.body.resume_text && req.body.jd_text) {
      console.log("🔍 Processing text input...");
      resumeText = req.body.resume_text;
      jdText = req.body.jd_text;
    }
    // CASE Invalid input
    else {
      return res.status(400).json({
        error:
          "Both resume_text and jd_text are required (either file upload or text input)",
      });
    }

    // Validate input
    if (resumeText.trim().length < 50) {
      return res.status(400).json({
        error: "Resume text too short (minimum 50 characters)",
        length: resumeText.trim().length,
      });
    }
    if (jdText.trim().length < 50) {
      return res.status(400).json({
        error: "Job description too short (minimum 50 characters)",
        length: jdText.trim().length,
      });
    }
    console.log(
      ` Resume length: ${resumeText.trim().length}, JD length: ${jdText.trim().length}`,
    );

    // 1. Tạo hash key
    const resumeHash = createCacheKey(resumeText, jdText);

    // 2. CHECK CACHE
    console.log("🔍 Checking cache...");
    const cached = await getCachedAnalysis(resumeHash);

    if (cached) {
      console.log("✅ Cache HIT - Returning cached result");
      return res.status(200).json({
        id: cached.id,
        from_cache: true,
        ai_provider: "gemini", // Thêm thông tin này
        data: {
          missing_skills: cached.missing_skills,
          learning_steps: cached.learning_steps,
          interview_questions: cached.interview_questions,
          roadmap_markdown: buildRoadmapMarkdown(cached),
        },
        created_at: cached.created_at,
      });
    }

    console.log("❌ Cache MISS - Calling Gemini AI...");

    // 3. Gọi Gemini để phân tích
    const analysisData = await analyzeWithGemini(resumeText, jdText);

    // 4. Lưu vào database
    const saved = await saveAnalysis(
      resumeHash,
      resumeText,
      jdText,
      analysisData,
    );

    // delete uploaded files if any
    if (resumeFilePath) {
      await deleteUploadedFile(resumeFilePath);
    }
    if (jdFilePath) {
      await deleteUploadedFile(jdFilePath);
    }

    // 5. Trả về kết quả
    return res.status(201).json({
      id: saved.id,
      from_cache: false,
      ai_provider: "gemini", // Thêm thông tin này
      data: {
        missing_skills: saved.missing_skills,
        learning_steps: saved.learning_steps,
        interview_questions: saved.interview_questions,
        roadmap_markdown: buildRoadmapMarkdown(saved),
      },
      created_at: saved.created_at,
    });
  } catch (error) {
    console.error("❌ Error in analyzeGap:", error);

    if (resumeFilePath) {
      await deleteUploadedFile(resumeFilePath);
    }
    if (jdFilePath) {
      await deleteUploadedFile(jdFilePath);
    }
    return res.status(500).json({
      error: "Analysis failed",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

// GET /api/analysis/:id - giữ nguyên
export async function getAnalysis(req, res) {
  try {
    const { id } = req.params;

    const analysis = await getAnalysisById(parseInt(id));

    if (!analysis) {
      return res.status(404).json({
        error: "Analysis not found",
      });
    }

    return res.status(200).json({
      id: analysis.id,
      data: {
        missing_skills: analysis.missing_skills,
        learning_steps: analysis.learning_steps,
        interview_questions: analysis.interview_questions,
        roadmap_markdown: buildRoadmapMarkdown(analysis),
      },
      created_at: analysis.created_at,
    });
  } catch (error) {
    console.error("❌ Error in getAnalysis:", error);
    return res.status(500).json({
      error: "Failed to retrieve analysis",
      message: error.message,
    });
  }
}

// GET /api/analysis - Lấy tất cả phân tích
export async function getAllAnalyses(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const analyses = await getAllAnalysesFromDb(limit, offset);

    return res.status(200).json({
      data: analyses,
      limit,
      offset,
    });
  } catch (error) {
    console.error("❌ Error in getAllAnalyses:", error);
    return res.status(500).json({
      error: "Failed to retrieve all analyses",
      message: error.message,
    });
  }
}

// DELETE /api/analysis/:id - Xóa phân tích theo ID
export async function deleteAnalysisByIdHandler(req, res) {
  try {
    const { id } = req.params;
    await deleteAnalysisById(parseInt(id, 10));
    return res.status(200).json({
      message: "Analysis deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error in deleteAnalysisById:", error);
    return res.status(500).json({
      error: "Failed to delete analysis",
      message: error.message,
    });
  }
}
