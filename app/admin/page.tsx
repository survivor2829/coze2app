import Link from "next/link";
import { getWorkflows } from "@/lib/workflows";
import { getTodayStats } from "@/lib/api-logger";

// Force dynamic rendering to get real-time stats
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const workflows = await getWorkflows();
  const defaultWorkflow = workflows.find((w) => w.isDefault);
  const stats = getTodayStats();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-1">欢迎回来</h2>
        <p className="text-white/80 text-sm">管理你的 AI 工作流配置</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 今日调用 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">今日调用</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCalls}</p>
              <p className="text-xs text-gray-400">
                DeepSeek: {stats.deepseekCalls} | Coze: {stats.cozeCalls}
              </p>
            </div>
          </div>
        </div>

        {/* 成功率 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">成功率</p>
              <p className={`text-2xl font-bold ${stats.successRate >= 90 ? 'text-emerald-600' : stats.successRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {stats.successRate}%
              </p>
              <p className="text-xs text-gray-400">
                成功: {stats.successCalls} | 失败: {stats.failedCalls}
              </p>
            </div>
          </div>
        </div>

        {/* 工作流数 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">工作流数</p>
              <p className="text-2xl font-bold text-gray-800">{workflows.length}</p>
              <p className="text-xs text-gray-400">{defaultWorkflow ? `默认: ${defaultWorkflow.name}` : "未设默认"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/workflows"
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 transition-all group"
          >
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                管理工作流
              </p>
              <p className="text-sm text-gray-500">添加、编辑或删除工作流</p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all group"
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">最近添加的工作流</h2>
            <Link
              href="/admin/workflows"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="space-y-3">
            {workflows.slice(0, 3).map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
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
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">还没有工作流</h3>
          <p className="text-gray-500 mb-4">创建你的第一个工作流开始使用 AI 创作助手</p>
          <Link
            href="/admin/workflows"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
          >
            <span>+</span>
            创建工作流
          </Link>
        </div>
      )}
    </div>
  );
}
