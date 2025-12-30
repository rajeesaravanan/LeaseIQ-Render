const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "properties";
class PropertyModel {
  static create(data, session) {
    return getDB()
      .collection(COLLECTION)
      .insertOne(
        {
          user_id: new ObjectId(data.user_id),
          property_name: data.property_name,
          address: data.address || null,
          created_at: new Date(),
        },
        { session }
      );
  }

  // GET ALL PROPERTIES FOR USER
  static getByUser(user_id) {
    return getDB()
      .collection(COLLECTION)
      .find({ user_id: new ObjectId(user_id) })
      .sort({ created_at: -1 })
      .toArray();
  }

  static getById(property_id, user_id) {
    return getDB()
      .collection(COLLECTION)
      .findOne({
        _id: new ObjectId(property_id),
        user_id: new ObjectId(user_id),
      });
  }
}

module.exports = PropertyModel;
