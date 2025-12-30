const { getDB } = require("../config/db");
const storage = require("../services/storage");

const PropertyModel = require("../models/property.model");
const UnitModel = require("../models/unit.model");
const TenantModel = require("../models/tenant.model");
const LeaseModel = require("../models/lease.model");
const LeaseDocumentModel = require("../models/leaseDocument.model");
const LeaseDetailModel = require("../models/leaseDetail.model");

const ALLOWED_DOCUMENT_TYPES = ["main lease", "amendment"];

class PortfolioController {
  static async build(req, res) {
    const db = getDB();
    const session = db.client.startSession();

    let uploadedFilePath = null;
    let transactionStarted = false;

    try {
      let {
        property_name,
        address,
        unit_number,
        tenant_name,
        square_ft,
        document_type,
        lease_details,
      } = req.body;

      // multipart/form-data → JSON string
      if (typeof lease_details === "string") {
        lease_details = JSON.parse(lease_details);
      }

      if (!property_name || !unit_number || !tenant_name || !document_type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Lease document is required" });
      }

      if (!ALLOWED_DOCUMENT_TYPES.includes(document_type)) {
        return res.status(400).json({
          error: "document_type must be 'main lease' or 'amendment'",
        });
      }

      if (!lease_details || typeof lease_details !== "object") {
        return res.status(400).json({
          error: "lease_details is required and must be an object",
        });
      }

      session.startTransaction();
      transactionStarted = true;

      const property = await PropertyModel.create(
        {
          user_id: req.user.user_id,
          property_name,
          address,
        },
        session
      );

      const unit = await UnitModel.create(
        {
          user_id: req.user.user_id,
          property_id: property.insertedId,
          unit_number,
          square_ft,
        },
        session
      );

      const tenant = await TenantModel.create(
        {
          user_id: req.user.user_id,
          tenant_name,
        },
        session
      );

      const lease = await LeaseModel.create(
        {
          user_id: req.user.user_id,
          tenant_id: tenant.insertedId,
          unit_id: unit.insertedId,
        },
        session
      );

      await LeaseDetailModel.create(
        {
          user_id: req.user.user_id,
          lease_id: lease.insertedId,
          details: lease_details,
        },
        session
      );

      uploadedFilePath = await storage.uploadFile({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      await LeaseDocumentModel.create(
        {
          user_id: req.user.user_id,
          lease_id: lease.insertedId,
          document_name: req.file.originalname,
          document_type,
          file_path: uploadedFilePath,
        },
        session
      );

      await session.commitTransaction();

      return res.status(201).json({
        message: "Portfolio created successfully",
        data: {
          property_id: property.insertedId,
          unit_id: unit.insertedId,
          tenant_id: tenant.insertedId,
          lease_id: lease.insertedId,
        },
      });
    } catch (err) {
      // Abort ONLY if transaction started
      if (transactionStarted) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          console.error("Transaction abort failed:", abortErr);
        }
      }

      // STORAGE ROLLBACK
      if (uploadedFilePath) {
        try {
          await storage.deleteFile(uploadedFilePath);
        } catch (cleanupErr) {
          console.error("Storage rollback failed:", cleanupErr);
        }
      }

      console.error("Portfolio Build Error:", err);
      return res.status(500).json({ error: "Failed to build portfolio" });
    } finally {
      session.endSession();
    }
  }
}

module.exports = PortfolioController;
