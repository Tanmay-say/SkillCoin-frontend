import { readConfig, type AiProvider } from "./config";

export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiChatResponse {
  content: string;
  model: string;
  provider: AiProvider;
}

export interface AiChat {
  provider: AiProvider;
  model: string;
  send(messages: AiMessage[]): Promise<AiChatResponse>;
  sendStream(
    messages: AiMessage[],
    onChunk: (text: string) => void
  ): Promise<AiChatResponse>;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
};

const SKILL_SYSTEM = `You are SkillCoin AI — an expert assistant for the SkillCoin ecosystem.
SkillCoin is the npm for AI Agent Skills: a decentralized marketplace where skills are stored permanently on Filecoin with cryptographic PDP proofs.

You help users:
- Generate SKILL.md files (AI agent skill instructions)
- Understand how to publish, install, and manage skills
- Work with the SkillCoin CLI and marketplace
- Understand Filecoin storage, x402 payments, and ERC-8004 agent registration

When generating a SKILL.md, always include:
1. YAML frontmatter (name, description, version, tags)
2. ## Overview
3. ## When to Use This Skill
4. ## Step-by-Step Instructions
5. ## Examples
6. ## Common Mistakes to Avoid

Be concise, practical, and helpful. Format code with markdown.`;

/**
 * Create an AI chat instance from the current config.
 */
export async function createAiChat(): Promise<AiChat> {
  const config = readConfig();
  const provider = config.aiProvider || "gemini";
  const apiKey = config.aiApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = config.aiModel || DEFAULT_MODELS[provider];

  if (!apiKey) {
    throw new Error(
      `No API key configured for ${provider}.\n` +
      `Run: skillcoin config --provider ${provider} --ai-key <your-key>`
    );
  }

  switch (provider) {
    case "gemini":
      return createGeminiChat(apiKey, model);
    case "openai":
    case "groq":
      return createOpenAICompatChat(apiKey, model, provider);
    default:
      return createGeminiChat(apiKey, model);
  }
}

async function createGeminiChat(apiKey: string, model: string): Promise<AiChat> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SKILL_SYSTEM,
  });

  return {
    provider: "gemini",
    model,

    async send(messages: AiMessage[]): Promise<AiChatResponse> {
      const chat = geminiModel.startChat({
        history: messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      });

      const last = messages[messages.length - 1];
      const result = await chat.sendMessage(last.content);
      const text = result.response.text();

      return { content: text, model, provider: "gemini" };
    },

    async sendStream(
      messages: AiMessage[],
      onChunk: (text: string) => void
    ): Promise<AiChatResponse> {
      const chat = geminiModel.startChat({
        history: messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      });

      const last = messages[messages.length - 1];
      const result = await chat.sendMessageStream(last.content);

      let full = "";
      for await (const chunk of result.stream) {
        const text = chunk.text();
        full += text;
        onChunk(text);
      }

      return { content: full, model, provider: "gemini" };
    },
  };
}

async function createOpenAICompatChat(
  apiKey: string,
  model: string,
  provider: AiProvider
): Promise<AiChat> {
  const baseUrl =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1";

  return {
    provider,
    model,

    async send(messages: AiMessage[]): Promise<AiChatResponse> {
      const body = {
        model,
        messages: [
          { role: "system", content: SKILL_SYSTEM },
          ...messages,
        ],
      };

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${provider} API error: ${err}`);
      }

      const json = (await res.json()) as any;
      const content = json.choices?.[0]?.message?.content || "";
      return { content, model, provider };
    },

    async sendStream(
      messages: AiMessage[],
      onChunk: (text: string) => void
    ): Promise<AiChatResponse> {
      const body = {
        model,
        stream: true,
        messages: [
          { role: "system", content: SKILL_SYSTEM },
          ...messages,
        ],
      };

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${provider} API error: ${err}`);
      }

      let full = "";
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.replace("data: ", "").trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                full += delta;
                onChunk(delta);
              }
            } catch {}
          }
        }
      }

      return { content: full, model, provider };
    },
  };
}
