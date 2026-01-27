import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek } from '@/lib/deepseek';

export async function POST(req: NextRequest) {
  try {
    const { contentType, answers, wordCount, regenerate } = await req.json();

    if (!contentType || !answers) {
      return NextResponse.json(
        { error: 'contentType and answers are required' },
        { status: 400 }
      );
    }

    // 字数要求
    const wordCountText = wordCount ? `\n字数要求：约${wordCount}字` : '';

    // 如果是重新生成，添加随机性提示
    const regenerateHint = regenerate
      ? '\n\n注意：请生成一个与之前不同风格的Prompt，可以尝试不同的角度、语气或结构。'
      : '';

    const prompt = `根据用户需求生成专业Prompt。

内容类型：${contentType}${wordCountText}
用户回答：${JSON.stringify(answers, null, 2)}

生成一个详细的Prompt，包含：角色设定、任务描述、具体要求、输出格式。
${wordCount ? `在Prompt中明确要求输出内容约${wordCount}字。` : ''}
只输出Prompt内容，不需要任何解释或说明。${regenerateHint}`;

    const result = await callDeepSeek(prompt, 'guide-prompt');
    return NextResponse.json({ prompt: result.trim() });
  } catch (error) {
    console.error('Guide prompt API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}
