const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const UnitController = require("../controllers/unit.controller");

router.post("/with-lease", auth, UnitController.createWithLease);

module.exports = router;
