const BaseLLMAdapter = require("./base");

class PerplexityAdapter extends BaseLLMAdapter {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.PERPLEXITY_API_KEY;
    this.model = config.model || "llama-3.1-sonar-large-128k-online";
    this.baseURL = "https://api.perplexity.ai";
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

      // Use node-fetch or built-in fetch (Node 18+)
      const fetch = globalThis.fetch || require("node-fetch");
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Perplexity API error");
      }

      const data = await response.json();

      // Format response to match Python structure
      return {
        choices: [
          {
            message: {
              content: data.choices[0].message.content,
            },
          },
        ],
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`Perplexity API error: ${error.message}`);
    }
  }
}

module.exports = PerplexityAdapter;

