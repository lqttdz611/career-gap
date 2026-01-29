import { createCacheKey } from "../utils/hash.js";
import {
  getCachedAnalysis,
  saveAnalysis,
  getAnalysisById,
} from "../services/cacheService.js";
import { analyzeWithGemini } from "../services/aiService.js"; // ĐỔI TÊN IMPORT

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
 */
export async function analyzeGap(req, res) {
  try {
    const { resume_text, jd_text } = req.body;

    // Validate input
    if (!resume_text || !jd_text) {
      return res.status(400).json({
        error: "Both resume_text and jd_text are required",
      });
    }

    if (resume_text.trim().length < 50) {
      return res.status(400).json({
        error: "Resume text too short (minimum 50 characters)",
      });
    }

    if (jd_text.trim().length < 50) {
      return res.status(400).json({
        error: "Job description too short (minimum 50 characters)",
      });
    }

    // 1. Tạo hash key
    const resumeHash = createCacheKey(resume_text, jd_text);

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
    const analysisData = await analyzeWithGemini(resume_text, jd_text); // ĐỔI TÊN FUNCTION

    // 4. Lưu vào database
    const saved = await saveAnalysis(
      resumeHash,
      resume_text,
      jd_text,
      analysisData,
    );

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
