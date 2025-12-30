const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const COLLECTION = "lease_documents";
class LeaseDocumentModel {
  static create(data, session) {
    return getDB()
      .collection(COLLECTION)
      .insertOne(
        {
          user_id: new ObjectId(data.user_id),
          lease_id: new ObjectId(data.lease_id),
          document_name: data.document_name,
          document_type: data.document_type,
          file_path: data.file_path,
          created_at: new Date(),
        },
        { session }
      );
  }

  static getById(id, user_id) {
    return getDB()
      .collection(COLLECTION)
      .findOne({
        _id: new ObjectId(id),
        user_id: new ObjectId(user_id),
      });
  }
}

module.exports = LeaseDocumentModel;
