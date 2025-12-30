const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("✅ MongoDB Connected");
      console.log(`🚀 LeaseIQ server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB", err);
    process.exit(1);
  });
