const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "organizations";

class OrganizationModel {
  static async create(data) {
    const payload = {
      name: data.name,
      is_active: true,
      created_at: new Date(),
    };

    const result = await getDB().collection(COLLECTION).insertOne(payload);
    return {
      _id: result.insertedId,
      name: payload.name,
    };
  }

  static async getAll({ page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;

    const cursor = getDB()
      .collection(COLLECTION)
      .find({})
      .skip(skip)
      .limit(limit);

    const data = await cursor.toArray();
    const total = await getDB().collection(COLLECTION).countDocuments();

    return { data, total, page, limit };
  }

  static async getById(id) {
    return getDB()
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
  }

  static async update(id, data) {
    const allowedFields = ["name", "is_active"];
    const updateData = {};

    allowedFields.forEach((key) => {
      if (data[key] !== undefined) updateData[key] = data[key];
    });

    return getDB()
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
  }

  static async delete(id) {
    return getDB()
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });
  }
}

module.exports = OrganizationModel;
