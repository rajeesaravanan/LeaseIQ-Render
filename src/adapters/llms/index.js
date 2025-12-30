const OpenAIAdapter = require("./openai");
const GroqAdapter = require("./groq");
const ClaudeAdapter = require("./claude");
const PerplexityAdapter = require("./perplexity");

/**
 * Get LLM adapter based on provider configuration
 * @param {Object} config - Configuration object with provider and API keys
 * @returns {BaseLLMAdapter} Instance of the appropriate LLM adapter
 */
function getLLMAdapter(config = null) {
  let llmConfig = config;

  // If no config provided, try to get from environment
  if (!llmConfig) {
    const llmEnv = process.env.LLM;
    if (llmEnv) {
      try {
        llmConfig = JSON.parse(llmEnv);
      } catch (e) {
        console.error("Failed to parse LLM environment variable:", e);
        // Default to OpenAI if parsing fails
        llmConfig = { provider: "openai" };
      }
    } else {
      // Default to OpenAI if no config
      llmConfig = { provider: "openai" };
    }
  }

  const provider = llmConfig.provider?.toLowerCase() || "openai";

  switch (provider) {
    case "openai":
      return new OpenAIAdapter(llmConfig);
    case "groq":
      return new GroqAdapter(llmConfig);
    case "claude":
      return new ClaudeAdapter(llmConfig);
    case "perplexity":
      return new PerplexityAdapter(llmConfig);
    default:
      console.warn(`Unknown LLM provider: ${provider}, defaulting to OpenAI`);
      return new OpenAIAdapter(llmConfig);
  }
}

module.exports = {
  getLLMAdapter,
  OpenAIAdapter,
  GroqAdapter,
  ClaudeAdapter,
  PerplexityAdapter,
};

