const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: process.env.VULTR_S3_ENDPOINT,
  accessKeyId: process.env.VULTR_S3_KEY,
  secretAccessKey: process.env.VULTR_S3_SECRET,
  region: process.env.VULTR_S3_REGION || "us-east-1",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

exports.uploadFile = async ({ buffer, filename, mimetype }) => {
  const key = `leases/${Date.now()}-${filename}`;

  await s3
    .putObject({
      Bucket: process.env.VULTR_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: "private",
    })
    .promise();

  return key;
};
exports.deleteFile = async (key) => {
  await s3
    .deleteObject({
      Bucket: process.env.VULTR_S3_BUCKET,
      Key: key,
    })
    .promise();
};

exports.getFileStream = (key) => {
  return s3
    .getObject({
      Bucket: process.env.VULTR_S3_BUCKET,
      Key: key,
    })
    .createReadStream();
};

exports.getSignedUrl = async (key) => {
  return s3.getSignedUrlPromise("getObject", {
    Bucket: process.env.VULTR_S3_BUCKET,
    Key: key,
    Expires: 60 * 5,
  });
};
