import { GoogleGenerativeAI } from "@google/generative-ai";

const defaultApiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!defaultApiKey) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY is not set. Users must provide their own key in settings.');
}

function resolveApiKey(override?: string | null): string | null {
  const key = override?.trim() || defaultApiKey?.trim() || null;
  return key || null;
}

function keyHint(key: string): string {
  return key.length >= 4 ? `...${key.slice(-4)}` : '(short)';
}

function parseGeminiError(error: unknown): { status?: number; message: string } {
  const err = error as {
    status?: number;
    message?: string;
    errorDetails?: Array<{ reason?: string; metadata?: Record<string, string> }>;
  };

  const raw = err.message || String(error);
  const lower = raw.toLowerCase();

  if (err.status === 401 || lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return { status: 401, message: 'Invalid Gemini API key. Check the key in Prompt Manager settings.' };
  }

  if (err.status === 404 || lower.includes('not found') || lower.includes('is not supported')) {
    return {
      status: 404,
      message: `Model "${modelName}" is unavailable for this API key. Set GEMINI_MODEL to a supported model (e.g. gemini-2.5-flash).`,
    };
  }

  if (err.status === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    if (lower.includes('limit: 0') || lower.includes('limit":0')) {
      return {
        status: 429,
        message:
          `No free-tier quota for model "${modelName}" on this key. ` +
          'Try GEMINI_MODEL=gemini-2.5-flash, link billing in Google AI Studio (free tier still applies), or use a different model in AI Studio > Rate limits.',
      };
    }
    if (lower.includes('rate limit') || lower.includes('ratelimit') || lower.includes('capacity')) {
      return {
        status: 429,
        message: `Gemini rate limit hit for "${modelName}". Wait a minute and retry, or switch to a lighter model (e.g. gemini-2.5-flash).`,
      };
    }
    return {
      status: 429,
      message:
        `Gemini quota exceeded for "${modelName}". Check usage in AI Studio > API Keys > View usage, or set GEMINI_MODEL=gemini-2.5-flash.`,
    };
  }

  if (err.status === 500 || err.status === 503) {
    return { status: err.status, message: 'Gemini API temporarily unavailable. Try again shortly.' };
  }

  return { status: err.status, message: raw };
}

export class AIService {
  static async getChatStream(
    prompt: string,
    history: { role: 'user' | 'assistant' | 'system'; content: string }[],
    apiKeyOverride?: string | null
  ) {
    const apiKey = resolveApiKey(apiKeyOverride);
    if (!apiKey) {
      throw new Error('No Gemini API key configured. Add one in Prompt Manager settings or set GEMINI_API_KEY on the server.');
    }

    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt cannot be empty');
    }

    const cleanedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const msg of history) {
      if (msg.role.toLowerCase() === 'system') continue;
      const role = msg.role.toLowerCase() === 'assistant' ? 'model' : 'user';
      if (!msg.content || msg.content.trim() === '') continue;

      const last = cleanedHistory[cleanedHistory.length - 1];
      if (last && last.role === role) {
        if (last.parts && last.parts[0]) {
          last.parts[0].text += '\n\n' + msg.content;
        }
      } else {
        cleanedHistory.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    while (cleanedHistory.length > 0 && cleanedHistory[0]?.role !== 'user') {
      cleanedHistory.shift();
    }

    const keySource = apiKeyOverride?.trim() ? 'user settings' : 'server env';
    console.log(
      `🔄 Gemini Request: model=${modelName}, key=${keyHint(apiKey)} (${keySource}), historyLength=${cleanedHistory.length}`
    );

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history: cleanedHistory });
      const result = await chat.sendMessageStream(prompt);
      console.log('✅ Gemini stream created successfully');
      return result.stream;
    } catch (error: unknown) {
      const parsed = parseGeminiError(error);
      console.error('❌ Gemini API Error:', parsed.message, error);
      throw new Error(parsed.message);
    }
  }

  static async validateApiKey(apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key cannot be empty');
    }

    try {
      const genAI = new GoogleGenerativeAI(trimmed);
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent('Hi');
    } catch (error: unknown) {
      const parsed = parseGeminiError(error);
      if (parsed.status === 401) {
        throw new Error(parsed.message);
      }
      if (parsed.status === 429) {
        throw new Error(
          `Key accepted but Gemini returned a quota/rate-limit error for "${modelName}". ${parsed.message}`
        );
      }
      if (parsed.status === 404) {
        throw new Error(parsed.message);
      }
      throw new Error(parsed.message);
    }
  }
}
