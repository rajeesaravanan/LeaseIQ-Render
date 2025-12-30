const PropertyModel = require("../models/property.model");

class PropertyController {
  static async getMyProperties(req, res) {
    try {
      const properties = await PropertyModel.getByUser(req.user.user_id);
      return res.json({ data: properties });
    } catch (err) {
      console.error("Get Properties Error:", err);
      return res.status(500).json({ error: "Failed to fetch properties" });
    }
  }

  static async getById(req, res) {
    try {
      const property = await PropertyModel.getById(
        req.params.id,
        req.user.user_id
      );

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json({ data: property });
    } catch (err) {
      console.error("Get Property By ID Error:", err);
      return res.status(500).json({ error: "Failed to fetch property" });
    }
  }
}

module.exports = PropertyController;
