const { MongoClient } = require("mongodb");

let db;

async function connectDB() {
  if (db) return db;

  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  db = client.db(process.env.DB_NAME);
  console.log("✅ MongoDB Connected");

  return db;
}

function getDB() {
  if (!db) {
    throw new Error("❌ Database not initialized. Call connectDB first.");
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
};
