"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Content type options
const CONTENT_TYPES = [
  { id: "xiaohongshu", name: "小红书", icon: "📕", description: "种草笔记、生活分享" },
  { id: "weekly", name: "周报", icon: "📝", description: "工作周报、总结报告" },
  { id: "wechat", name: "公众号", icon: "📰", description: "公众号文章、推文" },
  { id: "code", name: "代码", icon: "💻", description: "技术文档、代码说明" },
  { id: "email", name: "邮件", icon: "📧", description: "商务邮件、通知" },
  { id: "other", name: "其他", icon: "➕", description: "自定义内容类型" },
];

const STEP_LABELS = ["选类型", "答问题", "确认Prompt", "选工作流", "看结果"];

interface Question {
  id: string;
  type: "text" | "radio" | "checkbox" | "textarea";
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

interface Recommendation {
  workflowId: string;
  matchScore: number;
  reason: string;
}

interface ResultData {
  title?: string;
  content?: string;
  images?: string[];
}

export default function GuidePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [customType, setCustomType] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [editablePrompt, setEditablePrompt] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [wordCount, setWordCount] = useState<string>("1000");
  const [customWordCount, setCustomWordCount] = useState("");
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState(false);
  const [imageCount, setImageCount] = useState<string>("0");
  const [toast, setToast] = useState<string | null>(null);

  const totalSteps = 5;
  const contentType = selectedType === "other" ? customType : CONTENT_TYPES.find(t => t.id === selectedType)?.name || "";
  const actualWordCount = wordCount === "custom" ? customWordCount : wordCount;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const WORD_COUNT_OPTIONS = [
    { value: "500", label: "短文 (约500字)", description: "简洁精炼，适合快速阅读" },
    { value: "1000", label: "中等 (约1000字)", description: "详略得当，信息丰富" },
    { value: "2000", label: "长文 (约2000字)", description: "深度分析，全面详尽" },
    { value: "custom", label: "自定义", description: "输入你需要的字数" },
  ];

  const IMAGE_COUNT_OPTIONS = [
    { value: "0", label: "不需要配图", description: "纯文字内容", icon: "📝" },
    { value: "1", label: "1张配图", description: "画龙点睛", icon: "🖼️" },
    { value: "2", label: "2张配图", description: "图文并茂", icon: "🎨" },
  ];

  // Step handlers
  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setError("");
  };

  const handleStep1Next = async () => {
    if (!selectedType) {
      setError("请选择内容类型");
      return;
    }
    if (selectedType === "other" && !customType.trim()) {
      setError("请输入自定义内容类型");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/guide/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setQuestions(data.questions || []);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成问题失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleStep2Next = async () => {
    const unansweredRequired = questions.filter(
      q => q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))
    );

    if (unansweredRequired.length > 0) {
      setError("请回答所有必填问题");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/guide/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, answers, wordCount: actualWordCount }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedPrompt(data.prompt);
      setEditablePrompt(data.prompt);
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成Prompt失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePrompt = async () => {
    setIsRegeneratingPrompt(true);
    setError("");

    try {
      const response = await fetch("/api/guide/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, answers, wordCount: actualWordCount, regenerate: true }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedPrompt(data.prompt);
      setEditablePrompt(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新生成Prompt失败");
    } finally {
      setIsRegeneratingPrompt(false);
    }
  };

  const handleStep3Next = async () => {
    if (!editablePrompt.trim()) {
      setError("Prompt不能为空");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const workflowsRes = await fetch("/api/workflows");
      const workflowsData = await workflowsRes.json();
      setWorkflows(workflowsData.workflows || []);

      const recRes = await fetch("/api/guide/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editablePrompt }),
      });

      const recData = await recRes.json();
      setRecommendations(recData.recommendations || []);

      if (recData.recommendations?.length > 0) {
        setSelectedWorkflowId(recData.recommendations[0].workflowId);
      } else if (workflowsData.workflows?.length > 0) {
        const defaultWorkflow = workflowsData.workflows.find((w: Workflow) => w.isDefault);
        setSelectedWorkflowId(defaultWorkflow?.id || workflowsData.workflows[0].id);
      }

      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载工作流失败");
    } finally {
      setIsLoading(false);
    }
  };

  const generateContent = async () => {
    if (!selectedWorkflowId) {
      setError("请选择工作流");
      return;
    }

    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent("");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: editablePrompt,
          workflowId: selectedWorkflowId,
          imageCount: parseInt(imageCount),
        }),
      });

      if (!response.ok) {
        const fallbackResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: editablePrompt,
            workflowId: selectedWorkflowId,
            imageCount: parseInt(imageCount),
          }),
        });
        const data = await fallbackResponse.json();
        if (data.error) throw new Error(data.error);
        setResult(data.data);
        setCurrentStep(5);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      setCurrentStep(5);
      let fullContent = "";
      let resultData: ResultData = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content") {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              } else if (parsed.type === "complete") {
                resultData = {
                  title: parsed.title,
                  content: parsed.content || fullContent,
                  images: parsed.images,
                };
              } else if (parsed.type === "error") {
                throw new Error(parsed.error);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      if (resultData.content || fullContent) {
        setResult({
          ...resultData,
          content: resultData.content || fullContent,
        });
      }
      setIsStreaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成内容失败");
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4Next = async () => {
    await generateContent();
  };

  const handleRegenerate = async () => {
    await generateContent();
  };

  const goBack = () => {
    setError("");
    setCurrentStep(prev => Math.max(1, prev - 1));
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
    } catch {
      window.open(url, "_blank");
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("已复制到剪贴板");
  };

  const getRecommendationForWorkflow = (workflowId: string) => {
    return recommendations.find(r => r.workflowId === workflowId);
  };

  return (
    <div className="min-h-screen bg-animate">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#111827]">智能引导</h1>
              <p className="text-xs text-[#6B7280]">一步步创作你想要的内容</p>
            </div>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/80 border border-[#E5E7EB] text-[#4B5563] text-sm font-medium hover:bg-white hover:border-[#D1D5DB] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step < currentStep
                    ? "bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] text-white shadow-md shadow-purple-500/20"
                    : step === currentStep
                    ? "bg-gradient-to-br from-[#6B5CE7] to-[#8B5CF6] text-white shadow-lg shadow-purple-500/25 scale-110"
                    : "bg-[#F3F4F6] text-[#9CA3AF] border border-[#E5E7EB]"
                }`}
              >
                {step < currentStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step}
              </div>
              {step < totalSteps && (
                <div
                  className={`w-10 sm:w-16 lg:w-20 h-[2px] mx-1.5 rounded-full transition-all duration-500 ${
                    step < currentStep ? "bg-gradient-to-r from-[#6B5CE7] to-[#8B5CF6]" : "bg-[#E5E7EB]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs">
          {STEP_LABELS.map((label, i) => (
            <span
              key={i}
              className={`transition-colors duration-300 ${
                i + 1 <= currentStep ? "text-[#6B5CE7] font-medium" : "text-[#9CA3AF]"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3 animate-fade-in-down">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Step 1: Select Content Type */}
        {currentStep === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">选择内容类型</h2>
            <p className="text-[#6B7280] mb-6">你想创作什么类型的内容？</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type.id)}
                  className={`p-5 rounded-2xl border transition-all text-left group ${
                    selectedType === type.id
                      ? "border-[#6B5CE7] bg-[#EDE9FE]/50 shadow-md shadow-purple-500/10"
                      : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm"
                  }`}
                >
                  <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform inline-block">{type.icon}</span>
                  <h3 className={`font-semibold ${selectedType === type.id ? "text-[#6B5CE7]" : "text-[#111827]"}`}>{type.name}</h3>
                  <p className="text-xs text-[#6B7280] mt-1">{type.description}</p>
                </button>
              ))}
            </div>

            {selectedType === "other" && (
              <div className="mb-6 animate-fade-in">
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  请输入自定义内容类型
                </label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="例如：产品介绍、活动策划..."
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:border-[#6B5CE7] focus:outline-none focus:ring-2 focus:ring-[#6B5CE7]/10 text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                />
              </div>
            )}

            <button
              onClick={handleStep1Next}
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#7C6CF0] hover:shadow-lg hover:shadow-purple-500/20 text-white font-medium disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成问题中...
                </span>
              ) : "下一步"}
            </button>
          </div>
        )}

        {/* Step 2: Answer Questions */}
        {currentStep === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">回答几个问题</h2>
            <p className="text-[#6B7280] mb-6">帮助我们更好地理解你的需求</p>

            {/* Word Count */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-5 shadow-sm">
              <label className="block text-sm font-semibold text-[#111827] mb-3">
                期望字数 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WORD_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWordCount(option.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      wordCount === option.value
                        ? "border-[#6B5CE7] bg-[#EDE9FE]/50 shadow-sm shadow-purple-500/10"
                        : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <span className={`font-medium block text-sm ${wordCount === option.value ? "text-[#6B5CE7]" : "text-[#111827]"}`}>{option.label}</span>
                    <span className="text-xs text-[#6B7280]">{option.description}</span>
                  </button>
                ))}
              </div>
              {wordCount === "custom" && (
                <div className="mt-3 animate-fade-in">
                  <input
                    type="number"
                    placeholder="请输入期望字数，例如 1500"
                    value={customWordCount}
                    onChange={(e) => setCustomWordCount(e.target.value)}
                    min="100"
                    max="10000"
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:border-[#6B5CE7] focus:outline-none focus:ring-2 focus:ring-[#6B5CE7]/10 text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                  />
                </div>
              )}
            </div>

            {/* Image Count */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-5 shadow-sm">
              <label className="block text-sm font-semibold text-[#111827] mb-3">
                AI配图数量
              </label>
              <div className="grid grid-cols-3 gap-3">
                {IMAGE_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setImageCount(option.value)}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      imageCount === option.value
                        ? "border-[#6B5CE7] bg-[#EDE9FE]/50 shadow-sm shadow-purple-500/10"
                        : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{option.icon}</span>
                    <span className={`font-medium block text-sm ${imageCount === option.value ? "text-[#6B5CE7]" : "text-[#111827]"}`}>{option.label}</span>
                    <span className="text-xs text-[#6B7280]">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-5 mb-6">
              {questions.map((question, qi) => (
                <div key={question.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm" style={{ animationDelay: `${qi * 0.05}s` }}>
                  <label className="block text-sm font-semibold text-[#111827] mb-3">
                    {question.label}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.type === "text" && (
                    <input
                      type="text"
                      placeholder={question.placeholder}
                      value={(answers[question.id] as string) || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:border-[#6B5CE7] focus:outline-none focus:ring-2 focus:ring-[#6B5CE7]/10 text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                    />
                  )}

                  {question.type === "textarea" && (
                    <textarea
                      placeholder={question.placeholder}
                      value={(answers[question.id] as string) || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:border-[#6B5CE7] focus:outline-none focus:ring-2 focus:ring-[#6B5CE7]/10 resize-none text-[#111827] placeholder:text-[#9CA3AF] transition-all"
                    />
                  )}

                  {question.type === "radio" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label
                          key={option}
                          className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                            answers[question.id] === option
                              ? "border-[#6B5CE7] bg-[#EDE9FE]/50"
                              : "border-[#E5E7EB] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-3 accent-[#6B5CE7]"
                          />
                          <span className="text-[#111827] text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === "checkbox" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => {
                        const selectedOptions = (answers[question.id] as string[]) || [];
                        const isChecked = selectedOptions.includes(option);
                        return (
                          <label
                            key={option}
                            className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? "border-[#6B5CE7] bg-[#EDE9FE]/50"
                                : "border-[#E5E7EB] hover:bg-[#F9FAFB]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={option}
                              checked={isChecked}
                              onChange={(e) => {
                                const newSelected = e.target.checked
                                  ? [...selectedOptions, option]
                                  : selectedOptions.filter((o) => o !== option);
                                handleAnswerChange(question.id, newSelected);
                              }}
                              className="mr-3 accent-[#6B5CE7]"
                            />
                            <span className="text-[#111827] text-sm">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="px-6 py-3 rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] font-medium hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all"
              >
                上一步
              </button>
              <button
                onClick={handleStep2Next}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#7C6CF0] hover:shadow-lg hover:shadow-purple-500/20 text-white font-medium disabled:opacity-50 transition-all"
              >
                {isLoading ? "生成Prompt中..." : "下一步"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Prompt */}
        {currentStep === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">确认 Prompt</h2>
            <p className="text-[#6B7280] mb-6">AI 根据你的回答生成了以下 Prompt，你可以编辑调整</p>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-6 shadow-sm">
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:border-[#6B5CE7] focus:outline-none focus:ring-2 focus:ring-[#6B5CE7]/10 resize-none font-mono text-sm text-[#111827] transition-all"
              />
              <div className="flex justify-between items-center mt-3 text-sm">
                <span className="text-[#9CA3AF]">{editablePrompt.length} 字符</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditablePrompt(generatedPrompt)}
                    className="text-[#6B7280] hover:text-[#111827] transition-colors"
                  >
                    撤销编辑
                  </button>
                  <button
                    onClick={handleRegeneratePrompt}
                    disabled={isRegeneratingPrompt}
                    className="text-[#6B5CE7] hover:text-[#5A4BD6] font-medium disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {isRegeneratingPrompt ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        生成中...
                      </>
                    ) : "换一批"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="px-6 py-3 rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] font-medium hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all"
              >
                上一步
              </button>
              <button
                onClick={handleStep3Next}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#7C6CF0] hover:shadow-lg hover:shadow-purple-500/20 text-white font-medium disabled:opacity-50 transition-all"
              >
                {isLoading ? "加载工作流..." : "下一步"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Select Workflow */}
        {currentStep === 4 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">选择工作流</h2>
            <p className="text-[#6B7280] mb-6">选择一个工作流来生成内容</p>

            {workflows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 text-center mb-6 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[#6B7280] mb-4">暂无可用工作流，请先在后台配置</p>
                <Link
                  href="/admin/workflows"
                  className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#8B5CF6] hover:shadow-lg hover:shadow-purple-500/20 text-white text-sm font-medium transition-all"
                >
                  前往配置
                </Link>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {workflows.map((workflow) => {
                  const rec = getRecommendationForWorkflow(workflow.id);
                  return (
                    <button
                      key={workflow.id}
                      onClick={() => setSelectedWorkflowId(workflow.id)}
                      className={`w-full p-5 rounded-2xl border transition-all text-left ${
                        selectedWorkflowId === workflow.id
                          ? "border-[#6B5CE7] bg-[#EDE9FE]/50 shadow-md shadow-purple-500/10"
                          : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-semibold flex items-center gap-2 ${selectedWorkflowId === workflow.id ? "text-[#6B5CE7]" : "text-[#111827]"}`}>
                            {workflow.name}
                            {workflow.isDefault && (
                              <span className="text-xs bg-[#F3F4F6] text-[#6B7280] px-2 py-0.5 rounded-full">
                                默认
                              </span>
                            )}
                            {rec && (
                              <span className="text-xs bg-[#EDE9FE] text-[#6B5CE7] px-2 py-0.5 rounded-full font-medium">
                                推荐 {rec.matchScore}%
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-[#6B7280] mt-1">{workflow.description || "暂无描述"}</p>
                          {rec && (
                            <p className="text-xs text-[#6B5CE7] mt-2">{rec.reason}</p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            selectedWorkflowId === workflow.id
                              ? "border-[#6B5CE7] bg-[#6B5CE7]"
                              : "border-[#D1D5DB]"
                          }`}
                        >
                          {selectedWorkflowId === workflow.id && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="px-6 py-3 rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] font-medium hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all"
              >
                上一步
              </button>
              <button
                onClick={handleStep4Next}
                disabled={isLoading || workflows.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#7C6CF0] hover:shadow-lg hover:shadow-purple-500/20 text-white font-medium disabled:opacity-50 transition-all"
              >
                {isLoading ? "生成中..." : "生成内容"}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {currentStep === 5 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              {isStreaming ? (
                <span className="flex items-center gap-2">
                  正在生成中
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#6B5CE7] rounded-full animate-bounce-subtle" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce-subtle" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#A78BFA] rounded-full animate-bounce-subtle" style={{ animationDelay: "300ms" }} />
                  </span>
                </span>
              ) : (
                <span className="text-gradient">生成完成</span>
              )}
            </h2>
            <p className="text-[#6B7280] mb-6">
              {isStreaming ? "内容正在生成，请稍候..." : "以下是根据你的需求生成的内容"}
            </p>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden mb-6 shadow-sm">
              {/* Title */}
              {result?.title && (
                <div className="px-5 py-4 border-b border-[#F3F4F6] bg-gradient-to-r from-[#FAFAFF] to-[#F9FAFB]">
                  <h3 className="text-lg font-semibold text-[#111827]">{result.title}</h3>
                </div>
              )}

              {/* Images */}
              {result?.images && result.images.length > 0 && (
                <div className="p-4 bg-[#FAFAFF] border-b border-[#F3F4F6]">
                  {result.images.length > 1 && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => result.images?.forEach((img, i) => downloadImage(img, `image-${i + 1}.jpg`))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6B5CE7] to-[#8B5CF6] hover:shadow-md hover:shadow-purple-500/20 text-white text-xs font-medium transition-all"
                      >
                        下载全部 ({result.images.length})
                      </button>
                    </div>
                  )}
                  <div className={`grid gap-4 ${result.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {result.images.map((img, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden bg-white border border-[#E5E7EB]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`配图 ${idx + 1}`}
                          className="w-full h-auto object-contain"
                          style={{ maxHeight: '400px' }}
                        />
                        <div className="px-3 py-2.5 bg-[#F9FAFB] border-t border-[#F3F4F6]">
                          <button
                            onClick={() => downloadImage(img, `image-${idx + 1}.jpg`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white text-xs font-medium transition-colors w-full justify-center"
                          >
                            下载
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="px-5 py-5">
                <div className="article-content text-[#111827] prose prose-sm max-w-none">
                  {isStreaming && streamingContent ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingContent}
                      </ReactMarkdown>
                      <span className="streaming-cursor" />
                    </>
                  ) : result?.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.content}
                    </ReactMarkdown>
                  ) : isStreaming ? (
                    <div className="flex items-center gap-3 text-[#9CA3AF] py-4">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-[#6B5CE7] rounded-full animate-bounce-subtle" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce-subtle" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#A78BFA] rounded-full animate-bounce-subtle" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>正在生成...</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              {!isStreaming && result && (
                <div className="px-5 py-3 border-t border-[#F3F4F6] bg-[#FAFAFF] flex items-center justify-end gap-2">
                  <button
                    onClick={() => copyContent(result.content || "")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#F9FAFB] text-[#6B7280] text-sm font-medium transition-colors border border-[#E5E7EB]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制全文
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] font-medium hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all text-center"
              >
                返回首页
              </Link>
              <button
                onClick={handleRegenerate}
                disabled={isLoading || isStreaming}
                className="px-6 py-3 rounded-xl bg-white border border-[#6B5CE7] text-[#6B5CE7] font-medium hover:bg-[#EDE9FE]/50 disabled:opacity-50 transition-all"
              >
                {isLoading || isStreaming ? "生成中..." : "再换一篇"}
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedType("");
                  setCustomType("");
                  setQuestions([]);
                  setAnswers({});
                  setGeneratedPrompt("");
                  setEditablePrompt("");
                  setWorkflows([]);
                  setRecommendations([]);
                  setSelectedWorkflowId("");
                  setResult(null);
                  setStreamingContent("");
                  setWordCount("1000");
                  setCustomWordCount("");
                  setImageCount("0");
                }}
                disabled={isLoading || isStreaming}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#7C6CF0] hover:shadow-lg hover:shadow-purple-500/20 text-white font-medium disabled:opacity-50 transition-all"
              >
                重新创作
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>
        {toast}
      </div>
    </div>
  );
}
