/**
 * Base class for LLM adapters
 * All LLM adapters must implement the get_non_streaming_response method
 */
class BaseLLMAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Get a non-streaming response from the LLM
   * @param {Array|Object} payload - The payload to send to the LLM
   * @returns {Promise<Object>} Response object with choices array
   */
  async get_non_streaming_response(payload) {
    throw new Error("get_non_streaming_response must be implemented by subclass");
  }
}

module.exports = BaseLLMAdapter;

