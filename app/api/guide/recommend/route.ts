import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { callDeepSeek } from '@/lib/deepseek';

interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
  isDefault?: boolean;
}

interface WorkflowsData {
  workflows: Workflow[];
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // Read workflows from file
    const workflowsPath = path.join(process.cwd(), 'data', 'workflows.json');
    let workflows: Workflow[] = [];

    try {
      const data = readFileSync(workflowsPath, 'utf-8');
      const parsed: WorkflowsData = JSON.parse(data);
      workflows = parsed.workflows || [];
    } catch {
      // If file doesn't exist, return empty recommendations
      return NextResponse.json({ recommendations: [] });
    }

    if (workflows.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // Build workflow list for AI
    const workflowList = workflows
      .map((w: Workflow) => `- ${w.id}: ${w.name} - ${w.description || '无描述'}`)
      .join('\n');

    const aiPrompt = `从【现有工作流】中推荐最匹配的（只能选列表中的，不要编造）：

用户Prompt：${prompt}

【现有工作流】：
${workflowList}

返回JSON格式：
{ "recommendations": [{ "workflowId": "xxx", "matchScore": 95, "reason": "理由" }] }

要求：
1. 只推荐列表中存在的工作流
2. matchScore 为 0-100 的整数
3. 按匹配度从高到低排序
4. 只输出JSON，不要其他内容`;

    const result = await callDeepSeek(aiPrompt, 'guide-recommend');

    // Parse the JSON from the result
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

    // Validate that recommended workflow IDs exist
    const validIds = new Set(workflows.map(w => w.id));
    const validRecommendations = parsed.recommendations?.filter(
      (r: { workflowId: string }) => validIds.has(r.workflowId)
    ) || [];

    return NextResponse.json({ recommendations: validRecommendations });
  } catch (error) {
    console.error('Guide recommend API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
