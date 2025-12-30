const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const { handleUpload } = require("../middlewares/upload.middleware");
const LeaseController = require("../controllers/lease.controller");

router.get("/:id", auth, LeaseController.getById);
router.patch("/:id/details", auth, LeaseController.updateLeaseDetails);
router.post(
  "/:id/documents",
  auth,
  handleUpload,
  LeaseController.uploadAdditionalDocument
);

router.post(
  "/:id/documentsupdate",
  auth,
  handleUpload,
  LeaseController.uploadDocumentAndUpdateDetails
);

// read lease document
router.get("/document/:documentId", auth, LeaseController.getDocument);

module.exports = router;
