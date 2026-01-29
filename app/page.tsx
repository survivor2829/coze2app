import Link from "next/link";
import { getPublicWorkflows } from "@/lib/workflows";

export default async function Home() {
  const workflows = await getPublicWorkflows();

  return (
    <div className="min-h-screen bg-mesh-animated flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#111827]">AI 内容工坊</h1>
              <p className="text-xs text-[#6B7280]">智能创作，轻松生成</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs text-[#9CA3AF] hover:text-[#6B5CE7] transition-colors"
          >
            管理后台
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative inline-block mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6B5CE7] via-[#8B5CF6] to-[#A78BFA] flex items-center justify-center shadow-xl shadow-purple-500/25 animate-float">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-2 -right-3 w-3 h-3 rounded-full bg-[#A78BFA]/40 animate-pulse" />
            <div className="absolute -bottom-1 -left-4 w-2 h-2 rounded-full bg-[#6B5CE7]/30 animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient">AI 内容工坊</span>
          </h2>
          <p className="text-[#6B7280] max-w-md mx-auto text-base leading-relaxed">
            无论你是想直接对话创作，还是需要一步步引导，
            <br className="hidden sm:block" />
            都能帮你轻松完成
          </p>
        </div>

        {/* Entry Cards */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          {/* Direct Chat Card */}
          <Link
            href="/chat"
            className="group card-glow p-6 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-[#6B5CE7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#111827] mb-2">直接对话</h3>
            <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
              已经知道要什么？直接输入你的想法，AI 立即为你创作
            </p>
            <span className="inline-flex items-center gap-1.5 text-[#6B5CE7] text-sm font-medium group-hover:gap-2.5 transition-all">
              开始创作
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          {/* Smart Guide Card */}
          <Link
            href="/guide"
            className="group card-glow p-6 rounded-2xl bg-gradient-to-br from-[#FAFAFF] to-[#F5F3FF] border border-[#6B5CE7]/20 hover:border-[#6B5CE7]/40 transition-all relative overflow-hidden"
          >
            {/* Recommended Badge */}
            <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#6B5CE7] to-[#8B5CF6] text-white text-xs font-medium shadow-sm">
              推荐
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-md shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#111827] mb-2">智能引导</h3>
            <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
              不知道怎么开口？一步步回答问题，AI 帮你梳理需求
            </p>
            <span className="inline-flex items-center gap-1.5 text-[#6B5CE7] text-sm font-medium group-hover:gap-2.5 transition-all">
              开始引导
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Available Workflows */}
        {workflows.length > 0 && (
          <div className="w-full max-w-2xl animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-[#E5E7EB]" />
              <h3 className="text-sm font-medium text-[#9CA3AF]">可用工作流</h3>
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-[#E5E7EB]" />
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="px-4 py-2 rounded-full bg-white border border-[#E5E7EB] text-sm text-[#4B5563] flex items-center gap-2 hover:border-[#D1D5DB] hover:shadow-sm transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B5CE7]" />
                  {workflow.name}
                  {workflow.isDefault && (
                    <span className="text-xs text-[#6B5CE7] font-medium">(默认)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {workflows.length === 0 && (
          <div className="text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <p className="text-[#9CA3AF] text-sm mb-3">暂未配置工作流</p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-[#6B5CE7] text-sm font-medium hover:text-[#5A4BD6] transition-colors"
            >
              前往配置
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-5 border-t border-[#E5E7EB]/60">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
          <span className="text-xs text-[#9CA3AF]">Powered by Coze</span>
        </div>
      </footer>
    </div>
  );
}
