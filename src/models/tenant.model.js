const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const COLLECTION = "tenants";
class TenantModel {
  static create(data, session) {
    return getDB()
      .collection(COLLECTION)
      .insertOne(
        {
          user_id: new ObjectId(data.user_id),
          tenant_name: data.tenant_name,
          created_at: new Date(),
        },
        { session }
      );
  }

  static async getById(id) {
    return getDB()
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
  }

  static async getTenantSummaryByUser(user_id) {
    return getDB()
      .collection(COLLECTION)
      .aggregate([
        {
          $match: {
            user_id: new ObjectId(user_id),
          },
        },
        {
          $lookup: {
            from: "leases",
            localField: "_id",
            foreignField: "tenant_id",
            as: "leases",
          },
        },
        {
          $unwind: {
            path: "$leases",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "units",
            localField: "leases.unit_id",
            foreignField: "_id",
            as: "unit",
          },
        },
        {
          $unwind: {
            path: "$unit",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            tenant_name: { $first: "$tenant_name" },
            total_units: {
              $sum: {
                $cond: [{ $ifNull: ["$unit._id", false] }, 1, 0],
              },
            },
            monthly_rent: {
              $sum: {
                $ifNull: ["$unit.monthly_rent", 0],
              },
            },
          },
        },
        {
          $sort: { tenant_name: 1 },
        },
      ])
      .toArray();
  }
}

module.exports = TenantModel;
