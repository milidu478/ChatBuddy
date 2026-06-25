import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate API Key on initialization
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY is not set. AI features will not work.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export class AIService {
  /**
   * Google Gemini එකෙන් prompt එකකට අදාළව stream එකක් ලබා ගැනීම
   */
  static async getChatStream(prompt: string, history: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
    if (!apiKey) {
      throw new Error('Google Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt cannot be empty');
    }

    // Normalize and clean up history for Gemini API to alternate between user and model roles
    const cleanedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const msg of history) {
      if (msg.role.toLowerCase() === 'system') continue; // Skip system messages in standard chat history
      const role = msg.role.toLowerCase() === 'assistant' ? 'model' : 'user';
      if (!msg.content || msg.content.trim() === '') continue;

      const last = cleanedHistory[cleanedHistory.length - 1];
      if (last && last.role === role) {
        // Merge consecutive messages with the same role
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

    // Gemini history MUST start with 'user'. If the first message is 'model', remove it.
    while (cleanedHistory.length > 0 && cleanedHistory[0]?.role !== 'user') {
      cleanedHistory.shift();
    }

    console.log(`🔄 Gemini Request: model=gemini-2.5-flash, historyLength=${cleanedHistory.length}`);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      // Start chat with cleaned history
      const chat = model.startChat({ history: cleanedHistory });
      
      const result = await chat.sendMessageStream(prompt);
      
      console.log('✅ Gemini stream created successfully');
      return result.stream;
    } catch (error: any) {
      console.error('❌ Gemini API Error:', error.message);
      console.error('Error type:', error.constructor.name);
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.error('Error status:', error.status);
      console.error('Error code:', error.code);
      
      if (error.status === 401 || error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key');
      } else if (error.status === 429) {
        throw new Error('Gemini API rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('Gemini API server error');
      }
      
      throw error;
    }
  }
}