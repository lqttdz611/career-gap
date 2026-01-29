import express from "express";
import { analyzeGap, getAnalysis } from "../controllers/analysisController.js";

const router = express.Router();

// POST /api/analyze - Tạo phân tích mới
router.post("/analyze", analyzeGap);

// GET /api/analysis/:id - Lấy phân tích theo ID
router.get("/analysis/:id", getAnalysis);

export default router;
