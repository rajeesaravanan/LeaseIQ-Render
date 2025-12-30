const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "leases";

class LeaseModel {
  // CREATE (already used)
  static create(data, session) {
    return getDB()
      .collection(COLLECTION)
      .insertOne(
        {
          user_id: new ObjectId(data.user_id),
          tenant_id: new ObjectId(data.tenant_id),
          unit_id: new ObjectId(data.unit_id),
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          created_at: new Date(),
        },
        { session }
      );
  }

  // GET COMPLETE LEASE VIEW
  static async getByIdFull(lease_id, user_id) {
    const pipeline = [
      {
        $match: {
          _id: new ObjectId(lease_id),
          user_id: new ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "tenants",
          localField: "tenant_id",
          foreignField: "_id",
          as: "tenant",
        },
      },
      { $unwind: "$tenant" },
      {
        $lookup: {
          from: "units",
          localField: "unit_id",
          foreignField: "_id",
          as: "unit",
        },
      },
      { $unwind: "$unit" },
      {
        $lookup: {
          from: "properties",
          localField: "unit.property_id",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: "$property" },
      {
        $lookup: {
          from: "lease_documents",
          localField: "_id",
          foreignField: "lease_id",
          as: "documents",
        },
      },
      {
        $lookup: {
          from: "lease_details",
          localField: "_id",
          foreignField: "lease_id",
          as: "lease_details",
        },
      },
      {
        $addFields: {
          lease_details: { $arrayElemAt: ["$lease_details", 0] },
        },
      },
    ];

    const result = await getDB()
      .collection(COLLECTION)
      .aggregate(pipeline)
      .toArray();

    return result[0] || null;
  }

  // UPSERT LEASE DETAILS
  static upsertLeaseDetails(lease_id, user_id, details) {
    return getDB()
      .collection("lease_details")
      .updateOne(
        {
          lease_id: new ObjectId(lease_id),
          user_id: new ObjectId(user_id),
        },
        {
          $set: {
            details,
            updated_at: new Date(),
          },
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        { upsert: true }
      );
  }

  // GET ALL LEASES FOR A TENANT
  static async getLeasesByTenant(tenant_id, user_id) {
    const pipeline = [
      {
        $match: {
          tenant_id: new ObjectId(tenant_id),
          user_id: new ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "unit_id",
          foreignField: "_id",
          as: "unit",
        },
      },
      { $unwind: "$unit" },
      {
        $lookup: {
          from: "properties",
          localField: "unit.property_id",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: "$property" },
      {
        $project: {
          _id: 1,
          start_date: 1,
          end_date: 1,
          unit_number: "$unit.unit_number",
          monthly_rent: "$unit.monthly_rent",
          property_name: "$property.property_name",
          address: "$property.address",
        },
      },
    ];

    return getDB().collection("leases").aggregate(pipeline).toArray();
  }
}

module.exports = LeaseModel;
