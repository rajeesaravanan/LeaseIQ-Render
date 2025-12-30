const TenantModel = require("../models/tenant.model");
const LeaseModel = require("../models/lease.model");

class TenantController {
  static async getTenants(req, res) {
    try {
      const data = await TenantModel.getTenantSummaryByUser(req.user.user_id);
      return res.json({ data });
    } catch (err) {
      console.error("Get Tenants Summary Error:", err);
      return res.status(500).json({ error: "Failed to fetch tenants" });
    }
  }

  static async getTenantLeases(req, res) {
    try {
      const { tenantId } = req.params;

      //tenant ownership
      const tenant = await TenantModel.getById(tenantId, req.user.user_id);

      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const leases = await LeaseModel.getLeasesByTenant(
        tenantId,
        req.user.user_id
      );

      return res.json({
        tenant: tenant.tenant_name,
        leases,
      });
    } catch (err) {
      console.error("Get Tenant Leases Error:", err);
      return res.status(500).json({ error: "Failed to fetch tenant leases" });
    }
  }
}

module.exports = TenantController;
