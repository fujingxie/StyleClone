export type DeepSeekMessage = {
  content: string;
  role: "system" | "user" | "assistant";
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type DeepSeekStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

function requireDeepSeekApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 未配置，无法抽取风格摘要");
  }

  return apiKey;
}

function getDeepSeekChatUrl() {
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  return `${baseUrl}/chat/completions`;
}

export async function createDeepSeekJsonChat(messages: DeepSeekMessage[]) {
  const apiKey = requireDeepSeekApiKey();
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  try {
    const response = await fetch(getDeepSeekChatUrl(), {
      body: JSON.stringify({
        messages,
        model,
        response_format: { type: "json_object" },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`DeepSeek chat completions ${response.status}: ${detail.slice(0, 240)}`);
    }

    const payload = (await response.json()) as DeepSeekChatResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek 返回内容为空");
    }

    return content;
  } catch (error) {
    console.error("[createDeepSeekJsonChat] failed", { error, model }, new Date().toISOString());
    throw error;
  }
}

export async function* streamDeepSeekChat(messages: DeepSeekMessage[]) {
  const apiKey = requireDeepSeekApiKey();
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  try {
    const response = await fetch(getDeepSeekChatUrl(), {
      body: JSON.stringify({
        max_tokens: 900,
        messages,
        model,
        stream: true,
        thinking: { type: "disabled" },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`DeepSeek chat stream ${response.status}: ${detail.slice(0, 240)}`);
    }

    if (!response.body) {
      throw new Error("DeepSeek stream body 为空");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) {
            continue;
          }

          const data = line.slice(5).trim();

          if (!data || data === "[DONE]") {
            continue;
          }

          const chunk = JSON.parse(data) as DeepSeekStreamChunk;
          const delta = chunk.choices?.[0]?.delta?.content;

          if (delta) {
            yield delta;
          }
        }
      }
    }
  } catch (error) {
    console.error("[streamDeepSeekChat] failed", { error, model }, new Date().toISOString());
    throw error;
  }
}
