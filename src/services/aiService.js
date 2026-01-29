import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { validateAIResponse } from "./validationService.js";

dotenv.config();

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getGeminiModelName() {
  return (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
}

/**
 * Gọi Gemini API để phân tích gap
 */
export async function analyzeWithGemini(resumeText, jdText) {
  const prompt = `You are a career advisor AI. Analyze the gap between this resume and job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

Your task:
1. Identify MISSING SKILLS: Technologies/skills present in JD but absent in Resume (return 5-10 items, concise)
2. Create 3 CONCRETE LEARNING STEPS: Specific, actionable tasks with clear deliverables
3. Create 3 INTERVIEW QUESTIONS: Specifically targeting the identified gaps

CRITICAL:
- Return ONLY valid JSON (no markdown, no explanation, no extra keys)
- Use EXACTLY this JSON structure and field names.
- learning_steps must have exactly 3 items with step = 1,2,3.
- interview_questions must have exactly 3 items.
{
  "missing_skills": ["skill1", "skill2", "skill3"],
  "learning_steps": [
    {"step": 1, "description": "Detailed concrete action..."},
    {"step": 2, "description": "Another specific task..."},
    {"step": 3, "description": "Final actionable step..."}
  ],
  "interview_questions": [
    {"question": "Specific technical question?", "topic": "skill name"},
    {"question": "Another targeted question?", "topic": "another skill"},
    {"question": "Third interview question?", "topic": "related skill"}
  ]
}`;

  try {
    const modelName = getGeminiModelName();

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    console.log(`🤖 Calling Gemini API (model: ${modelName})...`);

    // Gọi API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    console.log("✅ Gemini response received");
    console.log(
      "📄 Raw response preview:",
      responseText.substring(0, 200) + "...",
    );

    // Loại bỏ markdown code blocks nếu có
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Loại bỏ text trước { và sau }
    const firstBrace = responseText.indexOf("{");
    const lastBrace = responseText.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      responseText = responseText.substring(firstBrace, lastBrace + 1);
    }

    // Parse JSON
    const parsedData = JSON.parse(responseText);

    // VALIDATE (CONSTRAINT: Validation Layer)
    validateAIResponse(parsedData);

    // Normalize for consistent output + caching
    if (Array.isArray(parsedData.missing_skills)) {
      parsedData.missing_skills = Array.from(
        new Set(
          parsedData.missing_skills
            .map((s) => String(s).trim())
            .filter((s) => s.length > 0),
        ),
      ).slice(0, 10);
    }

    console.log("✅ Response validated successfully");

    return parsedData;
  } catch (error) {
    console.error("❌ Gemini Service Error:", error.message);

    // Log raw response để debug
    if (error instanceof SyntaxError) {
      console.error("⚠️ JSON Parse Error - Raw response:", error);
      throw new Error("AI returned invalid JSON format");
    }

    throw error;
  }
}

// Export với tên mới
export const analyzeWithClaude = analyzeWithGemini; // Alias
