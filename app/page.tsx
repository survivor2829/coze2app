import Link from "next/link";
import { getPublicWorkflows } from "@/lib/workflows";

export default async function Home() {
  const workflows = await getPublicWorkflows();

  return (
    <div className="min-h-screen bg-animate flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white text-lg">🎨</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">AI 内容工坊</h1>
              <p className="text-xs text-gray-500">智能创作，轻松生成</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 mx-auto mb-6">
            <span className="text-4xl">🎨</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">AI 内容工坊</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            无论你是想直接对话创作，还是需要一步步引导，都能帮你轻松完成
          </p>
        </div>

        {/* Entry Cards */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12 animate-slide-up">
          {/* Direct Chat Card */}
          <Link
            href="/chat"
            className="group p-6 rounded-2xl bg-white/70 border border-white/40 hover:border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">直接对话</h3>
            <p className="text-sm text-gray-500 mb-4">
              已经知道要什么？直接输入你的想法，AI 立即为你创作
            </p>
            <span className="text-indigo-500 text-sm font-medium group-hover:text-indigo-600">
              开始创作 →
            </span>
          </Link>

          {/* Smart Guide Card */}
          <Link
            href="/guide"
            className="group p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 hover:border-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
          >
            {/* Recommended Badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium">
              推荐
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
              <span className="text-3xl text-white">✨</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">智能引导</h3>
            <p className="text-sm text-gray-500 mb-4">
              不知道怎么开口？一步步回答问题，AI 帮你梳理需求
            </p>
            <span className="text-indigo-600 text-sm font-medium group-hover:text-indigo-700">
              开始引导 →
            </span>
          </Link>
        </div>

        {/* Available Workflows */}
        {workflows.length > 0 && (
          <div className="w-full max-w-2xl animate-fade-in">
            <h3 className="text-sm font-medium text-gray-400 mb-4 text-center">可用工作流</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="px-4 py-2 rounded-full bg-white/60 border border-gray-200 text-sm text-gray-600 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {workflow.name}
                  {workflow.isDefault && (
                    <span className="text-xs text-emerald-500">(默认)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {workflows.length === 0 && (
          <div className="text-center animate-fade-in">
            <p className="text-gray-400 text-sm mb-2">暂未配置工作流</p>
            <Link
              href="/admin"
              className="text-indigo-500 text-sm hover:text-indigo-600"
            >
              前往配置 →
            </Link>
          </div>
        )}
      </main>

      {/* Footer with Admin Link */}
      <footer className="py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <span className="text-xs text-gray-300">Powered by Coze</span>
          <Link
            href="/admin"
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <span>⚙️</span>
            管理后台
          </Link>
        </div>
      </footer>
    </div>
  );
}
