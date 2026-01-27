"use client";

import type { Workflow } from "@/lib/workflows";

interface WorkflowListProps {
  workflows: Workflow[];
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onSetDefault: (workflow: Workflow) => void;
}

export default function WorkflowList({
  workflows,
  onEdit,
  onDelete,
  onSetDefault,
}: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <div className="glass rounded-2xl border border-white/30 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📭</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">还没有工作流</h3>
        <p className="text-gray-500">点击上方的「添加工作流」按钮创建你的第一个工作流</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          className="glass rounded-2xl border border-white/30 p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            {/* 左侧信息 */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⚡</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{workflow.name}</h3>
                  {workflow.isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-medium">
                      默认
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                  {workflow.description || "暂无描述"}
                </p>
                <p className="text-xs text-gray-400 font-mono truncate">
                  {maskEndpoint(workflow.endpoint)}
                </p>
              </div>
            </div>

            {/* 右侧操作 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!workflow.isDefault && (
                <button
                  onClick={() => onSetDefault(workflow)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  title="设为默认"
                >
                  设为默认
                </button>
              )}
              <button
                onClick={() => onEdit(workflow)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="编辑"
              >
                <EditIcon />
              </button>
              <button
                onClick={() => onDelete(workflow)}
                className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="删除"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
            <span>创建于 {formatDate(workflow.createdAt)}</span>
            <span>更新于 {formatDate(workflow.updatedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 隐藏端点中间部分
function maskEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    if (host.length > 20) {
      return `${url.protocol}//${host.substring(0, 10)}...${host.substring(host.length - 8)}${url.pathname}`;
    }
    return endpoint;
  } catch {
    return endpoint.length > 40 ? `${endpoint.substring(0, 30)}...` : endpoint;
  }
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
