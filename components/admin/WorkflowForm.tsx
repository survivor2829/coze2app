"use client";

import { useState, useEffect } from "react";
import type { Workflow } from "@/lib/workflows";

interface WorkflowFormProps {
  workflow?: Workflow | null;
  onSubmit: (data: Omit<Workflow, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  isLoading?: boolean;
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

// 解析 curl 命令
function parseCurlCommand(curl: string): {
  paramTemplate: Record<string, unknown>;
  inputField: string;
  endpoint?: string;
  token?: string;
} | null {
  try {
    // 预处理：移除换行符和多余空格，统一格式
    const normalizedCurl = curl
      .replace(/\\\s*\n/g, ' ')  // 移除行尾的 \ 和换行
      .replace(/\n/g, ' ')       // 移除所有换行
      .replace(/\s+/g, ' ')      // 合并多余空格
      .trim();

    // 提取 URL（支持多种格式）
    let endpoint: string | undefined;
    // 格式1: --location 'url' 或 --location "url"
    const locationMatch = normalizedCurl.match(/--location\s+['"]?(https?:\/\/[^\s'"]+)['"]?/i);
    if (locationMatch) {
      endpoint = locationMatch[1];
    } else {
      // 格式2: curl 'url' 或 curl "url" 或 curl url
      const urlMatch = normalizedCurl.match(/curl\s+(?:-[^\s]+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i);
      if (urlMatch) {
        endpoint = urlMatch[1];
      } else {
        // 格式3: URL 在命令末尾或中间
        const anyUrlMatch = normalizedCurl.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
        if (anyUrlMatch) {
          endpoint = anyUrlMatch[1];
        }
      }
    }

    // 提取 Token（支持 -H 和 --header）
    let token: string | undefined;
    const authMatch = normalizedCurl.match(/(?:-H|--header)\s+['"]?Authorization:\s*Bearer\s+([^\s'"]+)['"]?/i);
    if (authMatch) {
      token = authMatch[1];
    }

    // 提取 data（支持 -d, --data, --data-raw 等）
    let jsonStr: string | undefined;

    // 方法1: 尝试匹配 --data/-d 后面的 JSON
    const dataPatterns = [
      /(?:--data-raw|--data|-d)\s+\$?'(\{[\s\S]*?\})'/,  // $'{...}' 或 '{...}'
      /(?:--data-raw|--data|-d)\s+"(\{[\s\S]*?\})"/,     // "{...}"
      /(?:--data-raw|--data|-d)\s+'(\{[\s\S]*?\})'/,     // '{...}'
      /(?:--data-raw|--data|-d)\s+(\{[^}]+\})/,          // {...} 无引号
    ];

    for (const pattern of dataPatterns) {
      const match = normalizedCurl.match(pattern);
      if (match) {
        jsonStr = match[1];
        break;
      }
    }

    // 方法2: 如果上面没找到，尝试提取最后一个 JSON 对象
    if (!jsonStr) {
      const jsonMatch = normalizedCurl.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
      if (jsonMatch && jsonMatch.length > 0) {
        // 取最后一个（通常是 data）
        jsonStr = jsonMatch[jsonMatch.length - 1];
      }
    }

    if (!jsonStr) {
      return null;
    }

    // 清理 JSON 字符串
    jsonStr = jsonStr
      .replace(/\\'/g, "'")      // 还原转义的单引号
      .replace(/\\"/g, '"')      // 还原转义的双引号
      .replace(/\\\\/g, '\\');   // 还原转义的反斜杠

    const paramTemplate = JSON.parse(jsonStr);

    // 自动识别用户输入字段（递归搜索嵌套对象）
    const findInputField = (obj: Record<string, unknown>, prefix = ""): string => {
      const fields = Object.keys(obj);

      // 先在当前层级精确匹配
      for (const pattern of INPUT_FIELD_PATTERNS) {
        const found = fields.find(
          (f) => f.toLowerCase() === pattern.toLowerCase()
        );
        if (found) {
          return prefix ? `${prefix}.${found}` : found;
        }
      }

      // 再在当前层级模糊匹配
      for (const pattern of INPUT_FIELD_PATTERNS) {
        const found = fields.find((f) =>
          f.toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) {
          return prefix ? `${prefix}.${found}` : found;
        }
      }

      // 递归搜索嵌套对象（如 parameters）
      for (const field of fields) {
        if (typeof obj[field] === "object" && obj[field] !== null && !Array.isArray(obj[field])) {
          const nested = findInputField(obj[field] as Record<string, unknown>, prefix ? `${prefix}.${field}` : field);
          if (nested) {
            return nested;
          }
        }
      }

      // 返回第一个字符串字段
      const stringField = fields.find((f) => typeof obj[f] === "string");
      if (stringField) {
        return prefix ? `${prefix}.${stringField}` : stringField;
      }

      return prefix ? `${prefix}.${fields[0]}` : fields[0] || "";
    };

    const inputField = findInputField(paramTemplate);

    return { paramTemplate, inputField, endpoint, token };
  } catch (e) {
    console.error("Parse curl error:", e);
    return null;
  }
}

export default function WorkflowForm({
  workflow,
  onSubmit,
  onCancel,
  isLoading = false,
}: WorkflowFormProps) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [curlCommand, setCurlCommand] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [parseResult, setParseResult] = useState<{
    paramTemplate: Record<string, unknown>;
    inputField: string;
  } | null>(null);
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setEndpoint(workflow.endpoint);
      setToken(workflow.token);
      setDescription(workflow.description);
      setIsDefault(workflow.isDefault);
      // 恢复解析结果
      if (workflow.paramTemplate) {
        try {
          setParseResult({
            paramTemplate: JSON.parse(workflow.paramTemplate),
            inputField: workflow.inputField || "",
          });
        } catch {
          // ignore
        }
      }
    }
  }, [workflow]);

  // 解析 curl 命令
  const handleParseCurl = () => {
    if (!curlCommand.trim()) {
      setParseError("请粘贴 curl 命令");
      return;
    }

    const result = parseCurlCommand(curlCommand);
    if (result) {
      setParseResult({
        paramTemplate: result.paramTemplate,
        inputField: result.inputField,
      });
      setParseError("");

      // 自动填充 endpoint 和 token（如果当前为空）
      if (result.endpoint && !endpoint) {
        setEndpoint(result.endpoint);
      }
      if (result.token && !token) {
        setToken(result.token);
      }
    } else {
      setParseError("无法解析 curl 命令，请检查格式是否正确");
      setParseResult(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      endpoint: endpoint.trim(),
      token: token.trim(),
      workflowId: "",
      description: description.trim(),
      isDefault,
      paramTemplate: parseResult
        ? JSON.stringify(parseResult.paramTemplate)
        : undefined,
      inputField: parseResult?.inputField || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {workflow ? "编辑工作流" : "添加工作流"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            从 Coze 复制 curl 命令即可自动配置
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 名称 */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              工作流名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：文章生成器"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              required
              disabled={isLoading}
            />
          </div>

          {/* curl 命令（可选） */}
          <div>
            <label
              htmlFor="curl"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Curl 命令{" "}
              <span className="text-gray-400 font-normal">
                （可选，粘贴后自动解析）
              </span>
            </label>
            <textarea
              id="curl"
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              placeholder="从 Coze 复制完整的 curl 命令粘贴到这里..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none font-mono text-xs"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleParseCurl}
                disabled={isLoading || !curlCommand.trim()}
                className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-600 text-sm font-medium hover:bg-purple-200 disabled:opacity-50 transition-colors"
              >
                解析 curl
              </button>
              {parseError && (
                <span className="text-sm text-red-500">{parseError}</span>
              )}
            </div>

            {/* 解析结果展示 */}
            {parseResult && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium mb-2">
                  <span>✓</span>
                  <span>解析成功</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="text-gray-500">用户输入字段：</span>
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded">
                      {parseResult.inputField}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">参数模板：</span>
                    <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded block mt-1 break-all">
                      {JSON.stringify(parseResult.paramTemplate)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* API 端点 */}
          <div>
            <label
              htmlFor="endpoint"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              API 端点 <span className="text-red-500">*</span>
            </label>
            <input
              id="endpoint"
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://xxx.coze.site/run"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all font-mono text-sm"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              粘贴 curl 后会自动填充
            </p>
          </div>

          {/* API Token */}
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              API Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJ..."
                className="w-full px-4 py-2.5 pr-20 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all font-mono text-sm"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showToken ? "隐藏" : "显示"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              粘贴 curl 后会自动填充
            </p>
          </div>

          {/* 描述 */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              描述 <span className="text-gray-400 font-normal">（可选）</span>
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这个工作流的用途..."
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              disabled={isLoading}
            />
          </div>

          {/* 设为默认 */}
          <div className="flex items-center gap-3">
            <input
              id="isDefault"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              disabled={isLoading}
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              设为默认工作流
            </label>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={
                isLoading || !name.trim() || !endpoint.trim() || !token.trim()
              }
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingIcon />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
