const provider = process.env.STORAGE_PROVIDER;

switch (provider) {
  case "gcp":
    module.exports = require("./gcp.storage");
    break;

  case "digitalocean":
    module.exports = require("./do.storage");
    break;

  case "vultr":
    module.exports = require("./vultr.storage");
    break;

  default:
    throw new Error("Invalid STORAGE_PROVIDER");
}
