const OpenAI = require("openai");
const BaseLLMAdapter = require("./base");

class OpenAIAdapter extends BaseLLMAdapter {
  constructor(config = {}) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config.model || "gpt-4";
  }

  async get_non_streaming_response(payload) {
    try {
      // Handle both array format and object format
      let messages = [];
      if (Array.isArray(payload)) {
        messages = payload;
      } else if (payload.user_prompt) {
        messages = [
          { role: "system", content: payload.system || payload.content },
          ...payload.user_prompt,
        ];
      } else {
        messages = [
          { role: "system", content: payload.system || payload.content },
          { role: "user", content: payload.user || payload.user_prompt },
        ];
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
      });

      // Format response to match Python structure
      return {
        choices: [
          {
            message: {
              content: response.choices[0].message.content,
            },
          },
        ],
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

module.exports = OpenAIAdapter;

