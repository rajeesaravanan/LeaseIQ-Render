const multer = require("multer");
const path = require("path");

// Configure multer for memory storage (we'll process files in memory)
const storage = multer.memoryStorage();

// File filter to only accept PDF files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Middleware for single file upload
const uploadSingle = upload.single("assets");

// Middleware wrapper to handle errors
const handleUpload = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: {
          asset: `Upload error: ${err.message}`,
        },
      });
    } else if (err) {
      return res.status(400).json({
        error: {
          asset: err.message,
        },
      });
    }
    next();
  });
};

module.exports = {
  upload,
  handleUpload,
};

