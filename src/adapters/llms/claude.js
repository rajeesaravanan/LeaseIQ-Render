const Anthropic = require("@anthropic-ai/sdk");
const BaseLLMAdapter = require("./base");

class ClaudeAdapter extends BaseLLMAdapter {
  constructor(config = {}) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = config.model || "claude-3-opus-20240229";
  }

  async get_non_streaming_response(payload) {
    try {
      // Handle both array format and object format
      let systemMessage = "";
      let userMessage = "";

      if (Array.isArray(payload)) {
        // Find system and user messages
        const systemMsg = payload.find((msg) => msg.role === "system");
        const userMsg = payload.find((msg) => msg.role === "user");
        systemMessage = systemMsg?.content || "";
        userMessage = userMsg?.content || "";
      } else if (payload.user_prompt) {
        systemMessage = payload.system || payload.content || "";
        userMessage = Array.isArray(payload.user_prompt)
          ? payload.user_prompt
              .filter((msg) => msg.role === "user")
              .map((msg) => msg.content)
              .join("\n")
          : payload.user_prompt;
      } else {
        systemMessage = payload.system || payload.content || "";
        userMessage = payload.user || "";
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemMessage,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      // Format response to match Python structure
      const content = response.content[0].text;
      return {
        choices: [
          {
            message: {
              content: content,
            },
          },
        ],
        usage: {
          prompt_tokens: response.usage?.input_tokens || 0,
          completion_tokens: response.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}

module.exports = ClaudeAdapter;

