const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const storage = require("../services/storage");

const PropertyModel = require("../models/property.model");
const UnitModel = require("../models/unit.model");
const TenantModel = require("../models/tenant.model");
const LeaseModel = require("../models/lease.model");
const LeaseDocumentModel = require("../models/leaseDocument.model");
const LeaseDetailModel = require("../models/leaseDetail.model");

const ALLOWED_DOCUMENT_TYPES = ["main lease", "amendment"];

class UnitController {
  static async createWithLease(req, res) {
    const db = getDB();
    const session = db.client.startSession();

    let uploadedFilePath = null;
    let transactionStarted = false;

    try {
      let {
        property_id,
        property_name,
        address,
        unit_number,
        tenant_id,
        tenant_name,
        square_ft,
        monthly_rent,
        document_type,
        lease_details,
      } = req.body;

      // Parse lease_details (multipart/form-data sends string)
      if (typeof lease_details === "string") {
        lease_details = JSON.parse(lease_details);
      }

      //Validations

      if (!unit_number) {
        return res.status(400).json({ error: "unit_number is required" });
      }

      if (!tenant_id && !tenant_name) {
        return res
          .status(400)
          .json({ error: "tenant_id or tenant_name required" });
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

      if (!req.file) {
        return res.status(400).json({ error: "Lease document is required" });
      }

      session.startTransaction();
      transactionStarted = true;

      let propertyId;

      if (property_id) {
        const property = await db.collection("properties").findOne(
          {
            _id: new ObjectId(property_id),
            user_id: new ObjectId(req.user.user_id),
          },
          { session }
        );

        if (!property) {
          throw new Error("Invalid property access");
        }

        propertyId = property._id;
      } else {
        const property = await PropertyModel.create(
          {
            user_id: req.user.user_id,
            property_name,
            address,
          },
          session
        );
        propertyId = property.insertedId;
      }

      let tenantId;

      if (tenant_id) {
        const tenant = await db.collection("tenants").findOne(
          {
            _id: new ObjectId(tenant_id),
            user_id: new ObjectId(req.user.user_id),
          },
          { session }
        );

        if (!tenant) {
          throw new Error("Invalid tenant access");
        }

        tenantId = tenant._id;
      } else {
        const tenant = await TenantModel.create(
          {
            user_id: req.user.user_id,
            tenant_name,
          },
          session
        );
        tenantId = tenant.insertedId;
      }

      const unit = await UnitModel.create(
        {
          user_id: req.user.user_id,
          property_id: propertyId,
          unit_number,
          square_ft,
          monthly_rent,
        },
        session
      );

      const lease = await LeaseModel.create(
        {
          user_id: req.user.user_id,
          tenant_id: tenantId,
          unit_id: unit.insertedId,
        },
        session
      );

      /* ---------------- LEASE DETAILS ---------------- */

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
        message: "Unit and lease created successfully",
        data: {
          property_id: propertyId,
          unit_id: unit.insertedId,
          tenant_id: tenantId,
          lease_id: lease.insertedId,
        },
      });
    } catch (err) {
      if (transactionStarted) {
        await session.abortTransaction();
      }

      // STORAGE ROLLBACK
      if (uploadedFilePath) {
        try {
          await storage.deleteFile(uploadedFilePath);
        } catch (cleanupErr) {
          console.error("Storage rollback failed:", cleanupErr);
        }
      }

      console.error("Unit Create Error:", err.message || err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to create unit" });
    } finally {
      session.endSession();
    }
  }
}

module.exports = UnitController;
