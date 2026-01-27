import Link from "next/link";
import { getWorkflows } from "@/lib/workflows";

export default async function AdminDashboard() {
  const workflows = await getWorkflows();
  const defaultWorkflow = workflows.find((w) => w.isDefault);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">仪表板</h1>
        <p className="text-gray-500 mt-1">管理你的 AI 工作流配置</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 工作流数量 */}
        <div className="glass rounded-2xl border border-white/30 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">工作流总数</p>
              <p className="text-2xl font-semibold text-gray-800">{workflows.length}</p>
            </div>
          </div>
        </div>

        {/* 默认工作流 */}
        <div className="glass rounded-2xl border border-white/30 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">默认工作流</p>
              <p className="text-lg font-medium text-gray-800 truncate max-w-[150px]">
                {defaultWorkflow?.name || "未设置"}
              </p>
            </div>
          </div>
        </div>

        {/* 状态 */}
        <div className="glass rounded-2xl border border-white/30 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">系统状态</p>
              <p className="text-lg font-medium text-emerald-600">正常运行</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="glass rounded-2xl border border-white/30 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/workflows"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/60 hover:bg-white/80 border border-white/40 hover:border-purple-200 transition-all group"
          >
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-medium text-gray-800 group-hover:text-purple-600 transition-colors">
                管理工作流
              </p>
              <p className="text-sm text-gray-500">添加、编辑或删除工作流</p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/60 hover:bg-white/80 border border-white/40 hover:border-purple-200 transition-all group"
          >
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-medium text-gray-800 group-hover:text-purple-600 transition-colors">
                前往前台
              </p>
              <p className="text-sm text-gray-500">使用 AI 创作助手</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 最近工作流 */}
      {workflows.length > 0 && (
        <div className="glass rounded-2xl border border-white/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">最近添加的工作流</h2>
            <Link
              href="/admin/workflows"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {workflows.slice(0, 3).map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-white/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{workflow.name}</p>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                      {workflow.description || "暂无描述"}
                    </p>
                  </div>
                </div>
                {workflow.isDefault && (
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-xs font-medium">
                    默认
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {workflows.length === 0 && (
        <div className="glass rounded-2xl border border-white/30 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">还没有工作流</h3>
          <p className="text-gray-500 mb-4">创建你的第一个工作流开始使用 AI 创作助手</p>
          <Link
            href="/admin/workflows"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
          >
            <span>+</span>
            创建工作流
          </Link>
        </div>
      )}
    </div>
  );
}
