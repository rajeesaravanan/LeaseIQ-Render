const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const TenantController = require("../controllers/tenant.controller");

router.get("/", auth, TenantController.getTenants);
router.get("/:tenantId/leases", auth, TenantController.getTenantLeases);

module.exports = router;
