import express from "express";
import { uploadFiles } from "../config/multer.js";
import { analyzeGap, deleteAnalysisById, getAllAnalyses, getAnalysis } from "../controllers/analysisController.js";
const router = express.Router();

// POST /api/analyze - Tạo phân tích mới
router.post("/analyze", uploadFiles, analyzeGap);

// GET /api/analysis/:id - Lấy phân tích theo ID
router.get("/analysis/:id", getAnalysis);

// GET /api/analysis - Lấy tất cả phân tích
router.get("/analysis", getAllAnalyses);
// DELETE /api/analysis/:id - Xóa phân tích theo ID
router.delete("/analysis/:id", deleteAnalysisById);
export default router;
