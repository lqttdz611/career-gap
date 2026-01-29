/**
 * CONSTRAINT: Validation Layer
 * Validate AI response để tránh crash frontend
 */
export function validateAIResponse(data) {
  const errors = [];

  // Kiểm tra data có phải object không
  if (!data || typeof data !== "object") {
    throw new Error("AI response is not a valid object");
  }

  // Kiểm tra missing_skills
  if (!data.missing_skills) {
    errors.push("Missing field: missing_skills");
  } else if (!Array.isArray(data.missing_skills)) {
    errors.push("missing_skills must be an array");
  } else {
    // Ensure array of non-empty strings
    data.missing_skills.forEach((s, i) => {
      if (typeof s !== "string" || s.trim().length === 0) {
        errors.push(`missing_skills[${i}] must be a non-empty string`);
      }
    });
  }

  // Kiểm tra learning_steps
  if (!data.learning_steps) {
    errors.push("Missing field: learning_steps");
  } else if (!Array.isArray(data.learning_steps)) {
    errors.push("learning_steps must be an array");
  } else if (data.learning_steps.length !== 3) {
    errors.push("learning_steps must have exactly 3 items");
  } else {
    // Kiểm tra từng step có đủ fields không
    data.learning_steps.forEach((step, index) => {
      if (!step || typeof step !== "object") {
        errors.push(`learning_steps[${index}] must be an object`);
        return;
      }
      if (typeof step.step !== "number" || step.step !== index + 1) {
        errors.push(`learning_steps[${index}].step must be ${index + 1}`);
      }
      if (
        typeof step.description !== "string" ||
        step.description.trim().length < 10
      ) {
        errors.push(
          `learning_steps[${index}].description must be a non-empty string`,
        );
      }
      if (!step.step || !step.description) {
        errors.push(`learning_steps[${index}] missing step or description`);
      }
    });
  }

  // Kiểm tra interview_questions
  if (!data.interview_questions) {
    errors.push("Missing field: interview_questions");
  } else if (!Array.isArray(data.interview_questions)) {
    errors.push("interview_questions must be an array");
  } else if (data.interview_questions.length !== 3) {
    errors.push("interview_questions must have exactly 3 items");
  } else {
    data.interview_questions.forEach((q, index) => {
      if (!q || typeof q !== "object") {
        errors.push(`interview_questions[${index}] must be an object`);
        return;
      }
      if (typeof q.question !== "string" || q.question.trim().length < 10) {
        errors.push(
          `interview_questions[${index}].question must be a non-empty string`,
        );
      }
      if (typeof q.topic !== "string" || q.topic.trim().length === 0) {
        errors.push(
          `interview_questions[${index}].topic must be a non-empty string`,
        );
      }
      if (!q.question || !q.topic) {
        errors.push(`interview_questions[${index}] missing question or topic`);
      }
    });
  }

  // Nếu có lỗi, throw exception
  if (errors.length > 0) {
    throw new Error(`AI Response Validation Failed:\n${errors.join("\n")}`);
  }

  return true;
}
