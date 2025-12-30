const {
  chargeSchedules,
  executive_summary,
  leaseInformation,
  misc,
  space,
} = require("./references");

const CORS_CONFIG = {
  allow_origins: ["*"],
  allow_credentials: false,
  allow_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allow_headers: ["*"],
};

const AnalysisType = {
  INFO: "info",
  SPACE: "space",
  CHARGE_SCHEDULES: "charge-schedules",
  MISC: "misc",
  EXECUTIVE_SUMMARY: "executive-summary",
  AUDIT: "audit",
  ALL: "all",
};

const ANALYSIS_CONFIG = {
  [AnalysisType.INFO]: {
    doc_indices: [0, 5],
    structure: leaseInformation.structure,
  },
  [AnalysisType.SPACE]: {
    doc_indices: [1, 5],
    structure: space.structure,
  },
  [AnalysisType.CHARGE_SCHEDULES]: {
    doc_indices: [2, 5],
    structure: chargeSchedules.structure,
  },
  [AnalysisType.MISC]: {
    doc_indices: [3, 5],
    structure: misc.structure,
  },
  [AnalysisType.EXECUTIVE_SUMMARY]: {
    doc_indices: [4, 5],
    structure: executive_summary.structure,
  },
};

module.exports = {
  CORS_CONFIG,
  AnalysisType,
  ANALYSIS_CONFIG,
};

