const express = require("express");
const router = express.Router();
const { handleUpload } = require("../middlewares/upload.middleware");
const {
  getLeaseAbstraction,
  getSpace,
  getChargeSchedules,
  getMisc,
  getExecutiveSummary,
  getAuditDetails,
  saveLease,
  getCam,
  getCamSingle,
  compileCamResults,
  amendmentAnalysis,
} = require("../controllers/debug.controller");

// All routes use file upload middleware except /save
router.post("/info", handleUpload, getLeaseAbstraction);
router.post("/space", handleUpload, getSpace);
router.post("/charge-schedules", handleUpload, getChargeSchedules);
router.post("/misc", handleUpload, getMisc);
router.post("/executive-summary", handleUpload, getExecutiveSummary);
router.post("/audit", handleUpload, getAuditDetails);
router.post("/save", saveLease);
router.post("/cam", handleUpload, getCam);
router.post("/cam-single", handleUpload, getCamSingle);
router.post("/cam-compile", compileCamResults);
router.post("/amendments", handleUpload, amendmentAnalysis);

module.exports = router;

