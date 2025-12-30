const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "roles";

class RoleModel {
  static async getAll() {
    return getDB().collection(COLLECTION).find().toArray();
  }

  static async getById(id) {
    return getDB()
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
  }

  static async getByName(role_name) {
    return getDB().collection(COLLECTION).findOne({ role_name });
  }
}

module.exports = RoleModel;
