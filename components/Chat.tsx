"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  title?: string;
  images?: string[];
  timestamp: Date;
}

interface PublicWorkflow {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

const STORAGE_KEY = "selected_workflow_id";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [workflows, setWorkflows] = useState<PublicWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [isWorkflowsLoaded, setIsWorkflowsLoaded] = useState(false);
  const [smartPrompts, setSmartPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 加载工作流列表
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const response = await fetch("/api/workflows");
        const data = await response.json();
        if (data.workflows) {
          setWorkflows(data.workflows);
          if (data.workflows.length > 0) {
            const savedId = localStorage.getItem(STORAGE_KEY);
            const savedWorkflow = data.workflows.find((w: PublicWorkflow) => w.id === savedId);
            if (savedWorkflow) {
              setSelectedWorkflowId(savedWorkflow.id);
            } else {
              const defaultWorkflow = data.workflows.find((w: PublicWorkflow) => w.isDefault) || data.workflows[0];
              setSelectedWorkflowId(defaultWorkflow.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load workflows:", error);
      } finally {
        setIsWorkflowsLoaded(true);
      }
    };
    loadWorkflows();
  }, []);

  // 生成智能引导问题
  const generateSmartPrompts = useCallback(async () => {
    if (workflows.length === 0) return;
    setIsLoadingPrompts(true);

    const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
    const workflowContext = selectedWorkflow
      ? `当前工作流：${selectedWorkflow.name}，${selectedWorkflow.description || "通用创作助手"}`
      : "通用 AI 创作助手";

    // 根据工作流类型生成相关的引导问题
    const prompts = generateContextualPrompts(workflowContext, selectedWorkflow?.name || "");
    setSmartPrompts(prompts);
    setIsLoadingPrompts(false);
  }, [workflows, selectedWorkflowId]);

  useEffect(() => {
    if (isWorkflowsLoaded && workflows.length > 0) {
      generateSmartPrompts();
    }
  }, [isWorkflowsLoaded, selectedWorkflowId, generateSmartPrompts, workflows.length]);

  const handleSelectWorkflow = (id: string) => {
    setSelectedWorkflowId(id);
    localStorage.setItem(STORAGE_KEY, id);
    setShowWorkflowSelector(false);
  };

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  // 获取推荐的工作流
  const getRecommendedWorkflow = (userInput: string): PublicWorkflow | null => {
    if (workflows.length <= 1) return null;

    const keywords: Record<string, string[]> = {
      "对标": ["对标", "竞品", "分析", "luna"],
      "公众号": ["公众号", "文章", "社区", "推送"],
    };

    const inputLower = userInput.toLowerCase();

    for (const workflow of workflows) {
      const nameLower = workflow.name.toLowerCase();
      for (const [key, words] of Object.entries(keywords)) {
        if (words.some(w => nameLower.includes(w.toLowerCase()))) {
          if (words.some(w => inputLower.includes(w.toLowerCase()))) {
            return workflow;
          }
        }
      }
    }
    return null;
  };

  const sendMessage = async (text: string, workflowOverride?: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowPromptEditor(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          workflowId: workflowOverride || selectedWorkflowId || undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.data.content || "生成完成",
          title: result.data.title,
          images: result.data.images,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error || "请求失败");
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `抱歉，出现了一些问题：${error instanceof Error ? error.message : "请稍后重试"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showPromptEditor) {
        sendMessage(editablePrompt);
      } else {
        sendMessage(input);
      }
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setEditablePrompt(prompt);
    setShowPromptEditor(true);
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-animate flex flex-col">
      {/* 头部 */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                {selectedWorkflow?.name || "AI 创作助手"}
              </h1>
              <p className="text-xs text-gray-500">
                {selectedWorkflow?.description || "输入主题，智能创作"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 工作流选择器 */}
            {workflows.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowWorkflowSelector(!showWorkflowSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-white/30 hover:bg-white/70 transition-colors text-sm"
                >
                  <span className="text-purple-500">⚡</span>
                  <span className="text-gray-700 max-w-[100px] truncate">
                    {selectedWorkflow?.name || "选择工作流"}
                  </span>
                  <ChevronIcon />
                </button>
                {showWorkflowSelector && (
                  <div className="absolute right-0 top-full mt-2 w-72 glass rounded-xl border border-white/30 shadow-xl overflow-hidden z-50">
                    <div className="p-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 px-2">选择工作流</p>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {workflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          onClick={() => handleSelectWorkflow(workflow.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                            workflow.id === selectedWorkflowId
                              ? "bg-purple-100 text-purple-700"
                              : "hover:bg-white/50 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{workflow.name}</span>
                            {workflow.isDefault && (
                              <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                默认
                              </span>
                            )}
                          </div>
                          {workflow.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {workflow.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 状态指示器 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-white/30">
              <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : workflows.length === 0 && isWorkflowsLoaded ? "bg-gray-400" : "bg-emerald-400"}`} />
              <span className="text-xs text-gray-600">
                {isLoading ? "创作中" : workflows.length === 0 && isWorkflowsLoaded ? "未配置" : "在线"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 消息区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 欢迎界面 */}
          {messages.length === 0 && isWorkflowsLoaded && (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              {workflows.length === 0 ? (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-2xl shadow-gray-500/30 mb-8">
                    <span className="text-4xl">⚙️</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-3">暂未配置服务</h2>
                  <p className="text-gray-500 mb-6">请联系管理员在后台添加工作流配置</p>
                  <a
                    href="/admin"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
                  >
                    前往后台配置
                  </a>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-6">
                    <span className="text-4xl">✨</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">你好，有什么可以帮你？</h2>
                  <p className="text-gray-500 mb-8">选择一个话题开始，或者直接输入你的想法</p>

                  {/* 智能引导问题 */}
                  <div className="w-full max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">智能推荐</span>
                      <button
                        onClick={generateSmartPrompts}
                        disabled={isLoadingPrompts}
                        className="text-purple-500 hover:text-purple-600 text-sm"
                      >
                        {isLoadingPrompts ? "生成中..." : "换一批"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {smartPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="p-4 text-left rounded-2xl bg-white/60 hover:bg-white/80 border border-white/40 hover:border-purple-200 text-gray-700 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 group"
                        >
                          <span className="group-hover:text-purple-600 transition-colors line-clamp-2">{prompt}</span>
                          <span className="float-right text-gray-300 group-hover:text-purple-400 transition-colors mt-1">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 加载中 */}
          {messages.length === 0 && !isWorkflowsLoaded && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-8 animate-pulse">
                <span className="text-4xl">✨</span>
              </div>
              <p className="text-gray-500">加载中...</p>
            </div>
          )}

          {/* 消息列表 */}
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
              >
                {message.role === "user" ? (
                  <div className="max-w-[85%] bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg shadow-purple-500/20">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%] space-y-4">
                    <div className="glass rounded-2xl rounded-tl-md border border-white/30 shadow-xl overflow-hidden">
                      {/* 标题 */}
                      {message.title && (
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold text-gray-800">{message.title}</h3>
                            <button
                              onClick={() => copyContent(message.title || "")}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              title="复制标题"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 图片展示 - 使用 object-contain 保持完整比例 */}
                      {message.images && message.images.length > 0 && (
                        <div className="p-4 bg-gray-50/50">
                          {/* 多张图片时显示下载全部按钮 */}
                          {message.images.length > 1 && (
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => message.images?.forEach((img, i) => downloadImage(img, `image-${i + 1}.jpg`))}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors"
                              >
                                <DownloadIcon />
                                📦 下载全部 ({message.images.length})
                              </button>
                            </div>
                          )}
                          <div className={`grid gap-4 ${message.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                            {message.images.map((img, idx) => (
                              <div key={idx} className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
                                {/* 图片区域 - 使用 object-contain 保持完整比例 */}
                                <div
                                  className="cursor-pointer bg-gray-50"
                                  onClick={() => setLightboxImage(img)}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img}
                                    alt={`配图 ${idx + 1}`}
                                    className="w-full h-auto object-contain"
                                    style={{ maxHeight: '400px' }}
                                  />
                                </div>
                                {/* 每张图片下方的下载按钮 */}
                                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                                  <button
                                    onClick={() => downloadImage(img, `image-${idx + 1}.jpg`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors w-full justify-center"
                                  >
                                    <DownloadIcon />
                                    ⬇️ 下载
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 正文内容 - 支持 Markdown 渲染 */}
                      <div className="px-5 py-4">
                        <div className="article-content text-gray-700 prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* 操作栏 */}
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className="flex items-center gap-2">
                          {message.images && message.images.length > 0 && (
                            <button
                              onClick={() => message.images?.forEach((img, i) => downloadImage(img, `image-${i + 1}.jpg`))}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors border border-gray-200"
                            >
                              <DownloadIcon />
                              下载全部图片
                            </button>
                          )}
                          <button
                            onClick={() => copyContent(message.content)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors border border-gray-200"
                          >
                            <CopyIcon />
                            复制全文
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 加载状态 */}
            {isLoading && (
              <div className="flex justify-start animate-slide-up">
                <div className="glass rounded-2xl rounded-tl-md border border-white/30 px-5 py-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce-subtle" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce-subtle" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce-subtle" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm text-gray-500">AI 正在创作中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Prompt 编辑器 */}
      {showPromptEditor && (
        <div className="glass border-t border-white/20 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">编辑 Prompt</span>
              <button
                onClick={() => setShowPromptEditor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            </div>
            <textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/80 border border-purple-200 text-gray-800 focus:outline-none focus:border-purple-400 resize-none"
              rows={3}
              autoFocus
            />
            {/* AI 推荐工作流 */}
            {(() => {
              const recommended = getRecommendedWorkflow(editablePrompt);
              if (recommended && recommended.id !== selectedWorkflowId) {
                return (
                  <div className="mt-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700">
                          <span className="font-medium">推荐工作流：</span>{recommended.name}
                        </p>
                        <p className="text-xs text-purple-500">{recommended.description}</p>
                      </div>
                      <button
                        onClick={() => sendMessage(editablePrompt, recommended.id)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600 transition-colors"
                      >
                        使用此工作流
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex justify-end mt-2">
              <button
                onClick={() => sendMessage(editablePrompt)}
                disabled={!editablePrompt.trim() || isLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      {!showPromptEditor && (
        <footer className="glass border-t border-white/20 sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={workflows.length === 0 && isWorkflowsLoaded ? "暂未配置服务..." : "输入你想创作的主题..."}
                  rows={1}
                  disabled={isLoading || (workflows.length === 0 && isWorkflowsLoaded)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/80 border border-white/50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-300 input-glow resize-none disabled:opacity-50 transition-all"
                  style={{ minHeight: "52px", maxHeight: "150px" }}
                />
              </div>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || (workflows.length === 0 && isWorkflowsLoaded)}
                className="flex-shrink-0 w-[52px] h-[52px] rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {isLoading ? <LoadingIcon /> : <SendIcon />}
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              按 Enter 发送 · Shift + Enter 换行
            </p>
          </div>
        </footer>
      )}

      {/* 底部管理后台链接 */}
      <div className="py-3 text-center">
        <a
          href="/admin"
          className="text-[11px] text-gray-300 hover:text-gray-400 transition-colors"
        >
          管理后台
        </a>
      </div>

      {/* 图片灯箱 */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="预览"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(lightboxImage, "image.jpg");
                }}
                className="px-4 py-2 rounded-lg bg-white/90 text-gray-800 font-medium hover:bg-white transition-colors flex items-center gap-2"
              >
                <DownloadIcon />
                下载图片
              </button>
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2 rounded-lg bg-gray-800/90 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 根据工作流生成相关的引导问题
function generateContextualPrompts(context: string, workflowName: string): string[] {
  const nameLower = workflowName.toLowerCase();

  if (nameLower.includes("对标") || nameLower.includes("luna")) {
    return [
      "帮我分析小红书热门笔记的写作技巧",
      "分析抖音爆款视频的标题规律",
      "研究一下知乎高赞回答的结构特点",
      "对比分析头部自媒体的选题策略",
    ];
  }

  if (nameLower.includes("公众号") || nameLower.includes("文章")) {
    return [
      "写一篇关于社区活动的推文",
      "帮我写一篇节日祝福推送",
      "写一篇健康生活小贴士",
      "帮我写一篇新年社区活动预告",
    ];
  }

  // 默认通用引导
  return [
    "帮我写一篇关于人工智能的科普文章",
    "写一篇春季养生指南",
    "分享一些提高工作效率的技巧",
    "介绍一下最新的科技趋势",
  ];
}

// 图标组件
function SendIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
