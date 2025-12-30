const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const COLLECTION = "units";
class UnitModel {
  static create(data, session) {
    return getDB()
      .collection(COLLECTION)
      .insertOne(
        {
          user_id: new ObjectId(data.user_id),
          property_id: new ObjectId(data.property_id),
          unit_number: data.unit_number,
          square_ft: data.square_ft || null,
          monthly_rent: data.monthly_rent || null,
          created_at: new Date(),
        },
        { session }
      );
  }
}

module.exports = UnitModel;
