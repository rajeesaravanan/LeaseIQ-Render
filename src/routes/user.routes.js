const express = require("express");
const router = express.Router();

const UserController = require("../controllers/user.controller");
const { auth } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/role.middleware");

router.post(
  "/",
  auth,
  allowRoles("super_admin", "org_admin"),
  UserController.create
);
router.get(
  "/",
  auth,
  allowRoles("super_admin", "org_admin"),
  UserController.getAll
);
router.patch(
  "/:id",
  auth,
  allowRoles("super_admin", "org_admin"),
  UserController.update
);
router.delete(
  "/:id",
  auth,
  allowRoles("super_admin", "org_admin"),
  UserController.delete
);

module.exports = router;
