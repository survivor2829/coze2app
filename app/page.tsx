import Link from "next/link";
import { getPublicWorkflows } from "@/lib/workflows";

export default async function Home() {
  const workflows = await getPublicWorkflows();

  return (
    <div className="min-h-screen bg-animate flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6B5CE7] flex items-center justify-center">
              <span className="text-white text-lg">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1A1A1A]">AI 内容工坊</h1>
              <p className="text-xs text-[#666666]">智能创作，轻松生成</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#6B5CE7] flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-white">AI</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-3">AI 内容工坊</h2>
          <p className="text-[#666666] max-w-md mx-auto">
            无论你是想直接对话创作，还是需要一步步引导，都能帮你轻松完成
          </p>
        </div>

        {/* Entry Cards */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 animate-slide-up">
          {/* Direct Chat Card */}
          <Link
            href="/chat"
            className="group p-6 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#D0D0D0] hover:bg-[#F9F9F9] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F0EEFF] flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">直接对话</h3>
            <p className="text-sm text-[#666666] mb-4">
              已经知道要什么？直接输入你的想法，AI 立即为你创作
            </p>
            <span className="text-[#6B5CE7] text-sm font-medium group-hover:text-[#5A4BD6]">
              开始创作 →
            </span>
          </Link>

          {/* Smart Guide Card */}
          <Link
            href="/guide"
            className="group p-6 rounded-xl bg-[#F8F7FF] border border-[#6B5CE7] hover:bg-[#F0EEFF] transition-all relative"
          >
            {/* Recommended Badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[#6B5CE7] text-white text-xs font-medium">
              推荐
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#6B5CE7] flex items-center justify-center mb-4">
              <span className="text-2xl text-white">✨</span>
            </div>
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">智能引导</h3>
            <p className="text-sm text-[#666666] mb-4">
              不知道怎么开口？一步步回答问题，AI 帮你梳理需求
            </p>
            <span className="text-[#6B5CE7] text-sm font-medium group-hover:text-[#5A4BD6]">
              开始引导 →
            </span>
          </Link>
        </div>

        {/* Available Workflows */}
        {workflows.length > 0 && (
          <div className="w-full max-w-2xl animate-fade-in">
            <h3 className="text-sm font-medium text-[#999999] mb-4 text-center">可用工作流</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="px-4 py-2 rounded-full bg-white border border-[#E5E5E5] text-sm text-[#666666] flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#6B5CE7]" />
                  {workflow.name}
                  {workflow.isDefault && (
                    <span className="text-xs text-[#6B5CE7]">(默认)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {workflows.length === 0 && (
          <div className="text-center animate-fade-in">
            <p className="text-[#999999] text-sm mb-2">暂未配置工作流</p>
            <Link
              href="/admin"
              className="text-[#6B5CE7] text-sm hover:text-[#5A4BD6]"
            >
              前往配置 →
            </Link>
          </div>
        )}
      </main>

      {/* Footer with Admin Link */}
      <footer className="py-4 border-t border-[#E5E5E5]">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <span className="text-xs text-[#999999]">Powered by Coze</span>
          <Link
            href="/admin"
            className="text-xs text-[#999999] hover:text-[#666666] transition-colors flex items-center gap-1"
          >
            管理后台
          </Link>
        </div>
      </footer>
    </div>
  );
}
