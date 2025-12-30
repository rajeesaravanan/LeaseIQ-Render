const { Storage } = require("@google-cloud/storage");

const storage = new Storage();
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

exports.uploadFile = async ({ buffer, filename, mimetype }) => {
  const filePath = `leases/${Date.now()}-${filename}`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    contentType: mimetype,
    resumable: false,
  });

  return filePath;
};

exports.deleteFile = async (filePath) => {
  const file = bucket.file(filePath);
  await file.delete({ ignoreNotFound: true });
};

exports.getFileStream = async (filePath) => {
  const file = bucket.file(filePath);
  return file.createReadStream();
};

exports.getSignedUrl = async (filePath) => {
  const [url] = await bucket.file(filePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 5 * 60 * 1000,
  });

  return url;
};
