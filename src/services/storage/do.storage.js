const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});

exports.uploadFile = async ({ buffer, filename, mimetype }) => {
  const key = `leases/${Date.now()}-${filename}`;

  await s3
    .putObject({
      Bucket: process.env.DO_SPACES_BUCKET,
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
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
    })
    .promise();
};

exports.getFileStream = (key) => {
  return s3
    .getObject({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
    })
    .createReadStream();
};

exports.getSignedUrl = async (key) => {
  return s3.getSignedUrlPromise("getObject", {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: key,
    Expires: 60 * 5,
  });
};
