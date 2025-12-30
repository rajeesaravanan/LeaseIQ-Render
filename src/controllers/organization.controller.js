const OrganizationModel = require("../models/organization.model");

class OrganizationController {
  static async create(req, res) {
    try {
      const org = await OrganizationModel.create(req.body);

      return res.status(201).json({
        message: "Organization created successfully",
        data: org,
      });
    } catch (err) {
      console.error("❌ Organization Create Error:", err);
      return res.status(500).json({
        message: "Failed to create organization",
      });
    }
  }

  static async getAll(req, res) {
    try {
      const { page, limit } = req.query;
      const result = await OrganizationModel.getAll({
        page: Number(page),
        limit: Number(limit),
      });
      return res.json(result);
    } catch (err) {
      console.error("Organization GetAll Error:", err);
      return res.status(500).json({ error: "Failed to fetch organizations" });
    }
  }

  static async getById(req, res) {
    try {
      const org = await OrganizationModel.getById(req.params.id);
      if (!org) return res.status(404).json({ error: "Not found" });
      return res.json(org);
    } catch (err) {
      console.error("Organization GetById Error:", err);
      return res.status(500).json({ error: "Failed to fetch organization" });
    }
  }

  static async update(req, res) {
    try {
      await OrganizationModel.update(req.params.id, req.body);
      return res.json({ success: true });
    } catch (err) {
      console.error("Organization Update Error:", err);
      return res.status(500).json({ error: "Failed to update organization" });
    }
  }

  static async delete(req, res) {
    try {
      await OrganizationModel.delete(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      console.error("Organization Delete Error:", err);
      return res.status(500).json({ error: "Failed to delete organization" });
    }
  }
}

module.exports = OrganizationController;
