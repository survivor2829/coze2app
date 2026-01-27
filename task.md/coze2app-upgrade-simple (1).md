# Coze2App 升级任务

## 项目位置
F:\claude code\coze2app

## 环境变量（创建 .env.local）
```
DEEPSEEK_API_KEY=REDACTED_API_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

---

## UI 设计规范

### 配色
- 主色：#6366f1（靛蓝）
- 成功：#10b981
- 背景：#f8fafc
- 卡片：#ffffff
- 文字：#1e293b
- 次要文字：#64748b

### 间距
- 卡片内边距：16px
- 区块间距：24px
- 圆角：8px

---

## 任务清单（必须按顺序完成）

### Phase 1：修复图片问题
- [ ] 1.1 图片使用 `object-contain` + `w-full h-auto`，保持完整比例
- [ ] 1.2 每张图片下方添加"⬇️ 下载"按钮
- [ ] 1.3 多张图片时添加"📦 下载全部"按钮
- [ ] 1.4 文案完整显示，支持 Markdown 渲染
- [ ] 1.5 **验证**：图片不裁剪，下载功能正常

### Phase 2：新增智能引导页面 /guide
整体流程：选类型 → AI生成问题 → 用户回答 → AI生成Prompt → 用户编辑 → 选工作流 → 生成内容

- [ ] 2.1 创建 /guide 页面，带步骤进度条
- [ ] 2.2 步骤1-选择内容类型：卡片网格（小红书📕、周报📝、公众号📰、代码💻、邮件📧、其他➕）
- [ ] 2.3 步骤2-回答问题：调用 DeepSeek 动态生成 4-6 个问题（不要硬编码！）
- [ ] 2.4 步骤3-确认Prompt：展示 AI 生成的 Prompt，用户可编辑（textarea）
- [ ] 2.5 步骤4-选工作流：从 workflows.json 读取，AI 分析推荐（只能推荐已有的，不要编造）
- [ ] 2.6 步骤5-生成结果：调用选中的 Coze 工作流，展示结果
- [ ] 2.7 **验证**：完整走一遍流程，每步正常

### Phase 3：首页改造
- [ ] 3.1 标题：🎨 AI 内容工坊
- [ ] 3.2 两个大卡片入口：
      - 💬 直接对话（已经知道要什么）→ 保持现有功能
      - ✨ 智能引导（推荐）（不知道怎么开口）→ 跳转 /guide
- [ ] 3.3 底部显示可用工作流列表
- [ ] 3.4 右下角"管理后台"入口
- [ ] 3.5 **验证**：两个入口都能正常跳转

### Phase 4：后台优化 /admin
- [ ] 4.1 左侧固定导航栏（深色背景 #1e293b）：📊仪表盘、📦工作流、⚙️设置
- [ ] 4.2 右侧内容区（浅色背景）
- [ ] 4.3 仪表盘：顶部3个统计卡片（今日调用、成功率、工作流数）
- [ ] 4.4 工作流管理：卡片列表，每个显示名称、状态开关、调用次数
- [ ] 4.5 支持添加/编辑/删除工作流
- [ ] 4.6 **验证**：后台布局清晰，CRUD 功能正常

### Phase 5：代码质量
- [ ] 5.1 `npm run build` 无错误
- [ ] 5.2 `npm run lint` 无警告
- [ ] 5.3 **验证**：构建通过

---

## DeepSeek API 封装

```typescript
// lib/deepseek.ts
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

export async function callDeepSeek(prompt: string): Promise<string> {
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
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## API 路由实现

### POST /api/guide/questions（动态生成问题）
```typescript
// app/api/guide/questions/route.ts
import { callDeepSeek } from '@/lib/deepseek';

export async function POST(req: Request) {
  const { contentType } = await req.json();
  
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

  const result = await callDeepSeek(prompt);
  return Response.json(JSON.parse(result));
}
```

### POST /api/guide/prompt（生成Prompt）
```typescript
// app/api/guide/prompt/route.ts
export async function POST(req: Request) {
  const { contentType, answers } = await req.json();
  
  const prompt = `根据用户需求生成专业Prompt。

内容类型：${contentType}
用户回答：${JSON.stringify(answers)}

生成一个详细的Prompt，包含：角色设定、任务描述、具体要求、输出格式。
只输出Prompt内容。`;

  const result = await callDeepSeek(prompt);
  return Response.json({ prompt: result });
}
```

### POST /api/guide/recommend（推荐工作流-从现有库匹配）
```typescript
// app/api/guide/recommend/route.ts
import { readFileSync } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  // 从文件读取现有工作流（不要编造！）
  const workflowsPath = path.join(process.cwd(), 'data', 'workflows.json');
  const workflows = JSON.parse(readFileSync(workflowsPath, 'utf-8'));
  
  const workflowList = workflows
    .filter((w: any) => w.enabled)
    .map((w: any) => `- ${w.id}: ${w.name} - ${w.description}`)
    .join('\n');
  
  const aiPrompt = `从【现有工作流】中推荐最匹配的（只能选列表中的，不要编造）：

用户Prompt：${prompt}

【现有工作流】：
${workflowList}

返回JSON：
{ "recommendations": [{ "workflowId": "xxx", "matchScore": 95, "reason": "理由" }] }`;

  const result = await callDeepSeek(aiPrompt);
  return Response.json(JSON.parse(result));
}
```

---

## 图片下载组件

```typescript
// components/DownloadButton.tsx
'use client';

export function DownloadButton({ url, filename }: { url: string; filename: string }) {
  const download = async () => {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };
  
  return <button onClick={download} className="px-3 py-1 bg-primary text-white rounded">⬇️ 下载</button>;
}
```

---

## 完成标准

所有 Phase 验证通过后输出：
<promise>COMPLETE</promise>

验证失败就修复，直到通过。
