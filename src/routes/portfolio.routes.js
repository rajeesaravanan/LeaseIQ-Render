const router = require("express").Router();
const { auth } = require("../middlewares/auth.middleware");
const { handleUpload } = require("../middlewares/upload.middleware");
const PortfolioController = require("../controllers/portfolio.controller");

router.post("/", auth, handleUpload, PortfolioController.build);

module.exports = router;
