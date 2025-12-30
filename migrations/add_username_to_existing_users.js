require("dotenv").config();
const { connectDB } = require("../src/config/db");

async function run() {
  const db = await connectDB();
  const usersCol = db.collection("users");

  // find users without username
  const users = await usersCol
    .find({ username: { $exists: false } })
    .sort({ created_at: 1 })
    .toArray();

  let counter = 1;

  for (const user of users) {
    let username;
    let exists = true;

    // keep generating until unique
    while (exists) {
      username = `uliq${String(counter).padStart(5, "0")}`;
      exists = await usersCol.findOne({ username });
      counter++;
    }

    await usersCol.updateOne(
      { _id: user._id },
      { $set: { username } }
    );

    console.log(`Assigned ${username} → ${user.email}`);
  }

  console.log("✅ Username migration completed");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

