import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";
import { validateAIResponse } from "./validationService.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getGeminiModelName() {
  // Thử dùng 1.5-flash nếu 2.5-flash đang không ổn định với JSON
  return (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
}

export async function analyzeWithGemini(resumeText, jdText) {
  // Loại bỏ các ký tự có thể gây lỗi JSON từ file Word trước khi gửi đi
  const cleanResume = resumeText
    .replace(/[\u201C\u201D\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-");
  const cleanJD = jdText
    .replace(/[\u201C\u201D\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-");

  const prompt = `Analyze the career gap.
  RESUME: ${cleanResume}
  JD: ${cleanJD}

  Instructions:
  - Identify missing technical skills.
  - Provide 3 concrete learning steps.
  - Provide 3 targeted interview questions.
  - Output MUST be valid JSON.`;

  try {
    const modelName = getGeminiModelName();
    const model = genAI.getGenerativeModel({ model: modelName });

    const generationConfig = {
      temperature: 0.2, // Thấp nhất để AI không "sáng tạo" quá đà gây lỗi chuỗi
      maxOutputTokens: 4096, // Tăng lên 4096 để đảm bảo không bị ngắt quãng giữa chừng
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          missing_skills: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          learning_steps: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                step: { type: SchemaType.NUMBER },
                description: { type: SchemaType.STRING },
              },
              required: ["step", "description"],
            },
          },
          interview_questions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                question: { type: SchemaType.STRING },
                topic: { type: SchemaType.STRING },
              },
              required: ["question", "topic"],
            },
          },
        },
        required: ["missing_skills", "learning_steps", "interview_questions"],
      },
    };

    console.log(`🤖 AI is analyzing (Model: ${modelName})...`);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    let responseText = response.text();

    // KIỂM TRA: Nếu response bị rỗng hoặc không bắt đầu bằng {
    if (!responseText || !responseText.trim().startsWith("{")) {
      throw new Error("AI returned an empty or invalid start of JSON");
    }

    const parsedData = JSON.parse(responseText);
    validateAIResponse(parsedData);

    return parsedData;
  } catch (error) {
    console.error("❌ Gemini Error Details:", error);
    // Nếu 2.5 lỗi, hệ thống sẽ báo lỗi cụ thể ở đây
    throw error;
  }
}

export const analyzeWithClaude = analyzeWithGemini;
