require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../src/models/user.model"); // adjust name if different

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: "" }
      ]
    });

    console.log(`Found ${users.length} users without username`);

    let counter = 1;

    for (const user of users) {
      const username = `uliq${String(counter).padStart(3, "0")}`;
      user.username = username;
      await user.save();
      console.log(`Updated ${user.email} -> ${username}`);
      counter++;
    }

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
