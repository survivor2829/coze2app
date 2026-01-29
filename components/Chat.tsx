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
  const [toast, setToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toast helper
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowWorkflowSelector(false);
      }
    };
    if (showWorkflowSelector) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showWorkflowSelector]);

  // Load workflows
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

  // Generate smart prompts
  const generateSmartPrompts = useCallback(async () => {
    if (workflows.length === 0) return;
    setIsLoadingPrompts(true);

    const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
    const workflowContext = selectedWorkflow
      ? `当前工作流：${selectedWorkflow.name}，${selectedWorkflow.description || "通用创作助手"}`
      : "通用 AI 创作助手";

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

  const getRecommendedWorkflow = (userInput: string): PublicWorkflow | null => {
    if (workflows.length <= 1) return null;

    const keywords: Record<string, string[]> = {
      "对标": ["对标", "竞品", "分析", "luna"],
      "公众号": ["公众号", "文章", "社区", "推送"],
    };

    const inputLower = userInput.toLowerCase();

    for (const workflow of workflows) {
      const nameLower = workflow.name.toLowerCase();
      for (const [, words] of Object.entries(keywords)) {
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
    showToast("已复制到剪贴板");
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
      showToast("下载已开始");
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-animate flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#111827]">
                {selectedWorkflow?.name || "AI 创作助手"}
              </h1>
              <p className="text-xs text-[#6B7280]">
                {selectedWorkflow?.description || "输入主题，智能创作"}
              </p>
            </div>
          </a>
          <div className="flex items-center gap-2.5">
            {/* Workflow selector */}
            {workflows.length > 1 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowWorkflowSelector(!showWorkflowSelector)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-[#E5E7EB] hover:bg-white hover:border-[#D1D5DB] transition-all text-sm"
                >
                  <span className="text-[#6B5CE7]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <span className="text-[#111827] max-w-[100px] truncate font-medium">
                    {selectedWorkflow?.name || "选择工作流"}
                  </span>
                  <ChevronIcon />
                </button>
                {showWorkflowSelector && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-[#E5E7EB] shadow-lg overflow-hidden z-50 animate-scale-in">
                    <div className="p-3 border-b border-[#F3F4F6]">
                      <p className="text-xs font-medium text-[#9CA3AF] px-1">选择工作流</p>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {workflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          onClick={() => handleSelectWorkflow(workflow.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                            workflow.id === selectedWorkflowId
                              ? "bg-[#EDE9FE] text-[#6B5CE7]"
                              : "hover:bg-[#F9FAFB] text-[#111827]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{workflow.name}</span>
                            <div className="flex items-center gap-1.5">
                              {workflow.isDefault && (
                                <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                                  默认
                                </span>
                              )}
                              {workflow.id === selectedWorkflowId && (
                                <svg className="w-4 h-4 text-[#6B5CE7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          {workflow.description && (
                            <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">
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
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-[#E5E7EB]">
              <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : workflows.length === 0 && isWorkflowsLoaded ? "bg-gray-400" : "bg-emerald-500"}`} />
              <span className="text-xs text-[#6B7280] font-medium">
                {isLoading ? "创作中" : workflows.length === 0 && isWorkflowsLoaded ? "未配置" : "在线"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Welcome */}
          {messages.length === 0 && isWorkflowsLoaded && (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              {workflows.length === 0 ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[#111827] mb-3">暂未配置服务</h2>
                  <p className="text-[#6B7280] mb-6">请联系管理员在后台添加工作流配置</p>
                  <a
                    href="/admin"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#8B5CF6] hover:shadow-lg hover:shadow-purple-500/25 text-white font-medium transition-all"
                  >
                    前往后台配置
                  </a>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[#111827] mb-2">你好，有什么可以帮你？</h2>
                  <p className="text-[#6B7280] mb-8">选择一个话题开始，或者直接输入你的想法</p>

                  {/* Smart prompts */}
                  <div className="w-full max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-[#9CA3AF]">智能推荐</span>
                      <button
                        onClick={generateSmartPrompts}
                        disabled={isLoadingPrompts}
                        className="text-[#6B5CE7] hover:text-[#5A4BD6] text-sm font-medium transition-colors"
                      >
                        {isLoadingPrompts ? "生成中..." : "换一批"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {smartPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="p-4 text-left rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] text-[#111827] text-sm transition-all group card-glow"
                        >
                          <span className="group-hover:text-[#6B5CE7] transition-colors line-clamp-2">{prompt}</span>
                          <span className="float-right text-[#D1D5DB] group-hover:text-[#6B5CE7] transition-colors mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading state */}
          {messages.length === 0 && !isWorkflowsLoaded && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-purple-500/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-[#6B7280]">加载中...</p>
            </div>
          )}

          {/* Message list */}
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                {message.role === "user" ? (
                  <div className="max-w-[85%] bg-gradient-to-br from-[#6B5CE7] to-[#7C6CF0] text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-md shadow-purple-500/10">
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%] space-y-4">
                    <div className="bg-white rounded-2xl rounded-tl-md border border-[#E5E7EB] overflow-hidden shadow-sm">
                      {/* Title */}
                      {message.title && (
                        <div className="px-5 py-4 border-b border-[#F3F4F6] bg-gradient-to-r from-[#FAFAFF] to-[#F9FAFB]">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold text-[#111827]">{message.title}</h3>
                            <button
                              onClick={() => copyContent(message.title || "")}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                              title="复制标题"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Images */}
                      {message.images && message.images.length > 0 && (
                        <div className="p-4 bg-[#FAFAFF]">
                          {message.images.length > 1 && (
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => message.images?.forEach((img, i) => downloadImage(img, `image-${i + 1}.jpg`))}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6B5CE7] to-[#8B5CF6] hover:shadow-md hover:shadow-purple-500/20 text-white text-xs font-medium transition-all"
                              >
                                <DownloadIcon />
                                下载全部 ({message.images.length})
                              </button>
                            </div>
                          )}
                          <div className={`grid gap-4 ${message.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                            {message.images.map((img, idx) => (
                              <div key={idx} className="rounded-xl overflow-hidden bg-white border border-[#E5E7EB] group">
                                <div
                                  className="cursor-pointer bg-[#F9FAFB] relative overflow-hidden"
                                  onClick={() => setLightboxImage(img)}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img}
                                    alt={`配图 ${idx + 1}`}
                                    className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                    style={{ maxHeight: '400px' }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-md">
                                      <svg className="w-5 h-5 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="px-3 py-2.5 bg-[#F9FAFB] border-t border-[#F3F4F6]">
                                  <button
                                    onClick={() => downloadImage(img, `image-${idx + 1}.jpg`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white text-xs font-medium transition-colors w-full justify-center"
                                  >
                                    <DownloadIcon />
                                    下载
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="px-5 py-4">
                        <div className="article-content text-[#111827] prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-5 py-3 border-t border-[#F3F4F6] bg-[#FAFAFF] flex items-center justify-between">
                        <span className="text-xs text-[#9CA3AF]">
                          {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className="flex items-center gap-2">
                          {message.images && message.images.length > 0 && (
                            <button
                              onClick={() => message.images?.forEach((img, i) => downloadImage(img, `image-${i + 1}.jpg`))}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F9FAFB] text-[#6B7280] text-xs font-medium transition-colors border border-[#E5E7EB]"
                            >
                              <DownloadIcon />
                              下载图片
                            </button>
                          )}
                          <button
                            onClick={() => copyContent(message.content)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F9FAFB] text-[#6B7280] text-xs font-medium transition-colors border border-[#E5E7EB]"
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

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="bg-white rounded-2xl rounded-tl-md border border-[#E5E7EB] px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-[#6B5CE7] rounded-full animate-bounce-subtle" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce-subtle" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-[#A78BFA] rounded-full animate-bounce-subtle" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm text-[#6B7280]">AI 正在创作中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Prompt editor */}
      {showPromptEditor && (
        <div className="bg-white border-t border-[#E5E7EB] px-4 py-3 animate-fade-in-up">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#4B5563]">编辑 Prompt</span>
              <button
                onClick={() => setShowPromptEditor(false)}
                className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors p-1 rounded-lg hover:bg-[#F3F4F6]"
              >
                <CloseIcon />
              </button>
            </div>
            <textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#6B5CE7] focus:ring-2 focus:ring-[#6B5CE7]/10 resize-none transition-all"
              rows={3}
              autoFocus
            />
            {/* AI recommended workflow */}
            {(() => {
              const recommended = getRecommendedWorkflow(editablePrompt);
              if (recommended && recommended.id !== selectedWorkflowId) {
                return (
                  <div className="mt-2 p-3 rounded-xl bg-[#EDE9FE] border border-[#6B5CE7]/20 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#6B5CE7]">
                          <span className="font-medium">推荐工作流：</span>{recommended.name}
                        </p>
                        <p className="text-xs text-[#6B7280]">{recommended.description}</p>
                      </div>
                      <button
                        onClick={() => sendMessage(editablePrompt, recommended.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white text-sm transition-colors"
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#7C6CF0] hover:shadow-md hover:shadow-purple-500/20 text-white font-medium disabled:opacity-50 transition-all"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      {!showPromptEditor && (
        <footer className="bg-white/90 backdrop-blur-sm border-t border-[#E5E7EB]/60 sticky bottom-0">
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
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6B5CE7] focus:ring-2 focus:ring-[#6B5CE7]/10 resize-none disabled:opacity-50 transition-all"
                  style={{ minHeight: "52px", maxHeight: "150px" }}
                />
              </div>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || (workflows.length === 0 && isWorkflowsLoaded)}
                className="flex-shrink-0 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] hover:shadow-lg hover:shadow-purple-500/25 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isLoading ? <LoadingIcon /> : <SendIcon />}
              </button>
            </div>
            <p className="text-center text-xs text-[#9CA3AF] mt-3">
              按 Enter 发送 · Shift + Enter 换行
            </p>
          </div>
        </footer>
      )}

      {/* Bottom admin link */}
      <div className="py-3 text-center border-t border-[#E5E7EB]/40">
        <a
          href="/admin"
          className="text-[11px] text-[#9CA3AF] hover:text-[#6B5CE7] transition-colors"
        >
          管理后台
        </a>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 lightbox-backdrop flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] animate-scale-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="预览"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(lightboxImage, "image.jpg");
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-[#111827] font-medium hover:bg-[#F9FAFB] transition-colors flex items-center gap-2 shadow-lg"
              >
                <DownloadIcon />
                下载图片
              </button>
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2.5 rounded-xl bg-[#111827]/80 text-white font-medium hover:bg-[#111827] transition-colors shadow-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>
        {toast}
      </div>
    </div>
  );
}

// Generate contextual prompts based on workflow
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

  return [
    "帮我写一篇关于人工智能的科普文章",
    "写一篇春季养生指南",
    "分享一些提高工作效率的技巧",
    "介绍一下最新的科技趋势",
  ];
}

// Icon components
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
    <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
