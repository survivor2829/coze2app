import { logApiCall } from './api-logger';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

export async function callDeepSeek(prompt: string, action: string = 'chat'): Promise<string> {
  const startTime = Date.now();

  if (!DEEPSEEK_API_KEY) {
    logApiCall('deepseek', action, false, 'DEEPSEEK_API_KEY is not configured');
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `DeepSeek API error: ${response.status} - ${errorText}`;
      logApiCall('deepseek', action, false, errorMsg, duration);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    logApiCall('deepseek', action, true, undefined, duration);
    return data.choices[0].message.content;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logApiCall('deepseek', action, false, errorMsg, duration);
    throw error;
  }
}
