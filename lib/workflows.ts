import { promises as fs } from "fs";
import path from "path";

export interface Workflow {
  id: string;
  name: string;
  endpoint: string;
  token: string;
  workflowId: string; // Coze 工作流 ID（已废弃，保留兼容）
  description: string;
  isDefault: boolean;
  // 新增：参数模板和输入字段
  paramTemplate?: string; // JSON 格式的参数模板，从 curl 解析得到
  inputField?: string; // 用户输入对应的字段名，如 article_topic, topic, input 等
  createdAt: string;
  updatedAt: string;
}

// 常见的用户输入字段名（按优先级排序）
const INPUT_FIELD_PATTERNS = [
  "article_topic",
  "topic",
  "input",
  "message",
  "content",
  "query",
  "question",
  "prompt",
  "text",
  "user_input",
];

// 解析 curl 命令，提取参数模板和用户输入字段
export function parseCurlCommand(curl: string): {
  paramTemplate: Record<string, unknown>;
  inputField: string;
  endpoint?: string;
  token?: string;
} | null {
  try {
    // 提取 --data 或 -d 部分
    const dataMatch = curl.match(/(?:--data|-d)\s+['"]([^'"]+)['"]/);
    if (!dataMatch) return null;

    const jsonStr = dataMatch[1];
    const paramTemplate = JSON.parse(jsonStr);

    // 尝试提取 endpoint
    const urlMatch = curl.match(/(?:--location|curl)\s+['"](https?:\/\/[^'"]+)['"]/);
    const endpoint = urlMatch ? urlMatch[1] : undefined;

    // 尝试提取 token
    const tokenMatch = curl.match(/Authorization:\s*Bearer\s+([^'"]+)/);
    const token = tokenMatch ? tokenMatch[1].trim() : undefined;

    // 自动识别用户输入字段
    const fields = Object.keys(paramTemplate);
    let inputField = "";

    // 按优先级查找匹配的字段名
    for (const pattern of INPUT_FIELD_PATTERNS) {
      const found = fields.find(
        (f) => f.toLowerCase() === pattern.toLowerCase()
      );
      if (found) {
        inputField = found;
        break;
      }
    }

    // 如果没找到精确匹配，尝试模糊匹配
    if (!inputField) {
      for (const pattern of INPUT_FIELD_PATTERNS) {
        const found = fields.find((f) =>
          f.toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) {
          inputField = found;
          break;
        }
      }
    }

    // 如果还是没找到，使用第一个字符串类型的字段
    if (!inputField) {
      inputField =
        fields.find((f) => typeof paramTemplate[f] === "string") || fields[0];
    }

    return { paramTemplate, inputField, endpoint, token };
  } catch {
    return null;
  }
}

interface WorkflowsData {
  workflows: Workflow[];
}

const DATA_FILE = path.join(process.cwd(), "data", "workflows.json");

// 确保 data 目录存在
async function ensureDataDir(): Promise<void> {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 读取工作流数据
export async function getWorkflows(): Promise<Workflow[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    const parsed: WorkflowsData = JSON.parse(data);
    return parsed.workflows || [];
  } catch (error) {
    // 如果文件不存在，返回空数组
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

// 保存工作流数据
async function saveWorkflows(workflows: Workflow[]): Promise<void> {
  await ensureDataDir();
  const data: WorkflowsData = { workflows };
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// 生成 UUID
function generateId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 获取单个工作流
export async function getWorkflow(id: string): Promise<Workflow | null> {
  const workflows = await getWorkflows();
  return workflows.find((w) => w.id === id) || null;
}

// 获取默认工作流
export async function getDefaultWorkflow(): Promise<Workflow | null> {
  const workflows = await getWorkflows();
  return workflows.find((w) => w.isDefault) || workflows[0] || null;
}

// 创建工作流
export async function createWorkflow(
  data: Omit<Workflow, "id" | "createdAt" | "updatedAt">
): Promise<Workflow> {
  const workflows = await getWorkflows();

  // 如果设置为默认，取消其他工作流的默认状态
  if (data.isDefault) {
    workflows.forEach((w) => (w.isDefault = false));
  }

  // 如果是第一个工作流，自动设为默认
  if (workflows.length === 0) {
    data.isDefault = true;
  }

  const now = new Date().toISOString();
  const newWorkflow: Workflow = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  workflows.push(newWorkflow);
  await saveWorkflows(workflows);

  return newWorkflow;
}

// 更新工作流
export async function updateWorkflow(
  id: string,
  data: Partial<Omit<Workflow, "id" | "createdAt">>
): Promise<Workflow | null> {
  const workflows = await getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);

  if (index === -1) {
    return null;
  }

  // 如果设置为默认，取消其他工作流的默认状态
  if (data.isDefault) {
    workflows.forEach((w) => (w.isDefault = false));
  }

  workflows[index] = {
    ...workflows[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await saveWorkflows(workflows);

  return workflows[index];
}

// 删除工作流
export async function deleteWorkflow(id: string): Promise<boolean> {
  const workflows = await getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);

  if (index === -1) {
    return false;
  }

  const wasDefault = workflows[index].isDefault;
  workflows.splice(index, 1);

  // 如果删除的是默认工作流，设置第一个为默认
  if (wasDefault && workflows.length > 0) {
    workflows[0].isDefault = true;
  }

  await saveWorkflows(workflows);

  return true;
}

// 设置默认工作流
export async function setDefaultWorkflow(id: string): Promise<boolean> {
  const workflows = await getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);

  if (index === -1) {
    return false;
  }

  workflows.forEach((w) => (w.isDefault = w.id === id));
  await saveWorkflows(workflows);

  return true;
}

// 获取前台展示的工作流列表（不含敏感信息）
export async function getPublicWorkflows(): Promise<
  Pick<Workflow, "id" | "name" | "description" | "isDefault">[]
> {
  const workflows = await getWorkflows();
  return workflows.map(({ id, name, description, isDefault }) => ({
    id,
    name,
    description,
    isDefault,
  }));
}
