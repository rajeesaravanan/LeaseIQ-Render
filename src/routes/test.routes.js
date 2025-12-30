const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/role.middleware");

router.get("/admin-only", auth, allowRoles("super_admin"), (req, res) => {
  res.json({ message: "Welcome Super Admin" });
});

module.exports = router;
