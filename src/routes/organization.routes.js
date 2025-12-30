const express = require("express");
const router = express.Router();

const OrganizationController = require("../controllers/organization.controller");
const { auth } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/role.middleware");

router.post(
  "/",
  auth,
  allowRoles("super_admin"),
  OrganizationController.create
);
router.get("/", auth, allowRoles("super_admin"), OrganizationController.getAll);
router.get(
  "/:id",
  auth,
  allowRoles("super_admin"),
  OrganizationController.getById
);
router.patch(
  "/:id",
  auth,
  allowRoles("super_admin"),
  OrganizationController.update
);
router.delete(
  "/:id",
  auth,
  allowRoles("super_admin"),
  OrganizationController.delete
);

module.exports = router;
