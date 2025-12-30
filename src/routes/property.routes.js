const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const PropertyController = require("../controllers/property.controller");

router.get("/", auth, PropertyController.getMyProperties);
router.get("/:id", auth, PropertyController.getById);

module.exports = router;
