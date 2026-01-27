import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek } from '@/lib/deepseek';

export async function POST(req: NextRequest) {
  try {
    const { contentType } = await req.json();

    if (!contentType) {
      return NextResponse.json(
        { error: 'contentType is required' },
        { status: 400 }
      );
    }

    const prompt = `你是内容创作顾问。用户想创作「${contentType}」。
生成4-6个引导问题，帮助了解需求。

要求：
1. 通俗易懂，避免术语
2. 优先选择题（单选/多选）
3. 最后可有开放式问题

输出JSON格式：
{
  "questions": [
    { "id": "q1", "type": "text", "label": "问题", "placeholder": "提示", "required": true },
    { "id": "q2", "type": "radio", "label": "问题", "options": ["选项1", "选项2"], "required": true },
    { "id": "q3", "type": "checkbox", "label": "问题", "options": ["选项1", "选项2"], "required": false }
  ]
}
只输出JSON，不要其他内容。`;

    const result = await callDeepSeek(prompt, 'guide-questions');

    // Parse the JSON from the result, handling potential markdown code blocks
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Guide questions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
