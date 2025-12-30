const fs = require("fs");
const path = require("path");

/**
 * Save PDF chunks to cache file (binary format similar to pickle)
 * @param {string} filename - Original filename
 * @param {Array} chunks - Array of PDFChunk objects
 */
function saveChunks(filename, chunks) {
  try {
    const cacheDir = "./cached_pdfs";
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachePath = path.join(cacheDir, `${filename}.pkl`);
    
    // Convert chunks to JSON and then to Buffer for binary storage
    const data = JSON.stringify(chunks);
    const buffer = Buffer.from(data, "utf8");
    
    fs.writeFileSync(cachePath, buffer);
    console.log(`Cached PDF chunks to ${cachePath}`);
  } catch (error) {
    console.error(`Error saving chunks to cache: ${error.message}`);
    throw error;
  }
}

/**
 * Load PDF chunks from cache file
 * @param {string} filename - Original filename
 * @returns {Array|null} Array of PDFChunk objects or null if not found
 */
function loadChunks(filename) {
  try {
    const cachePath = path.join("./cached_pdfs", `${filename}.pkl`);
    
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const buffer = fs.readFileSync(cachePath);
    const data = buffer.toString("utf8");
    const chunks = JSON.parse(data);
    
    console.log(`Loaded cached PDF chunks from ${cachePath}`);
    return chunks;
  } catch (error) {
    console.error(`Error loading chunks from cache: ${error.message}`);
    return null;
  }
}

/**
 * Check if cached chunks exist for a filename
 * @param {string} filename - Original filename
 * @returns {boolean} True if cache exists
 */
function hasCachedChunks(filename) {
  const cachePath = path.join("./cached_pdfs", `${filename}.pkl`);
  return fs.existsSync(cachePath);
}

module.exports = {
  saveChunks,
  loadChunks,
  hasCachedChunks,
};

