const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "users";

class UserModel {
  // ---------------- CREATE ----------------
  static async create(data) {
    const payload = {
      name: data.name,
      email: data.email? data.email.toLowerCase():null,
      username: data.username ? data.username.toLowerCase():null,
      password: data.password,
      role_id: new ObjectId(data.role_id),
      organization_id: data.organization_id
        ? new ObjectId(data.organization_id)
        : null,
      is_active: true,
      created_at: new Date(),
    };

    const result = await getDB()
      .collection(COLLECTION)
      .insertOne(payload);

    return result.insertedId;
  }

  // ---------------- GET ALL ----------------
  static async getAll({ organization_id, page = 1, limit = 10 }) {
    const query = {};
    if (organization_id) {
      query.organization_id = new ObjectId(organization_id);
    }

    const skip = (page - 1) * limit;

    const data = await getDB()
      .collection(COLLECTION)
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await getDB()
      .collection(COLLECTION)
      .countDocuments(query);

    return { data, total, page, limit };
  }

  // ---------------- LOOKUPS ----------------
  static async getByUsername(username) {
    if(!username) return null;
    return getDB()
      .collection(COLLECTION)
      .findOne({ username: username.toLowerCase() });
  }

  static async getByEmail(email) {
    if(!email) return null;
    return getDB()
      .collection(COLLECTION)
      .findOne({ email: email.toLowerCase() });
  }

  static async getById(id) {
    return getDB()
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
  }

  // ---------------- USERNAME GENERATOR ----------------
  static async generateUsername() {
    const prefix = "uliq";

    const lastUser = await getDB()
      .collection(COLLECTION)
      .find({ username: { $regex: `^${prefix}` } })
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();

    let nextNumber = 1;

    if (lastUser.length > 0 && lastUser[0].username) {
      const lastUsername = lastUser[0].username;
      const numericPart = parseInt(
        lastUsername.replace(prefix, ""),
        10
      );

      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, "0")}`;
  }

  // ---------------- UPDATE ----------------
  static async update(id, data) {
    const allowedFields = ["name", "email", "is_active"];
    const updateData = {};

    allowedFields.forEach((key) => {
      if (data[key] !== undefined) {
        updateData[key] = key === "email"
          ? data[key].toLowerCase()
          : data[key];
      }
    });

    return getDB()
      .collection(COLLECTION)
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
  }

  // ---------------- DELETE ----------------
  static async delete(id) {
    return getDB()
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });
  }
}

module.exports = UserModel;
