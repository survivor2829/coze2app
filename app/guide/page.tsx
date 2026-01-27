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

  const totalSteps = 5;
  const contentType = selectedType === "other" ? customType : CONTENT_TYPES.find(t => t.id === selectedType)?.name || "";
  const actualWordCount = wordCount === "custom" ? customWordCount : wordCount;

  // Word count options
  const WORD_COUNT_OPTIONS = [
    { value: "500", label: "短文 (约500字)", description: "简洁精炼，适合快速阅读" },
    { value: "1000", label: "中等 (约1000字)", description: "详略得当，信息丰富" },
    { value: "2000", label: "长文 (约2000字)", description: "深度分析，全面详尽" },
    { value: "custom", label: "自定义", description: "输入你需要的字数" },
  ];

  // Step 1: Select content type
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

  // Step 2: Answer questions
  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleStep2Next = async () => {
    // Check required questions
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

  // Regenerate prompt with DeepSeek (换一批)
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

  // Step 3: Confirm prompt
  const handleStep3Next = async () => {
    if (!editablePrompt.trim()) {
      setError("Prompt不能为空");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Load workflows
      const workflowsRes = await fetch("/api/workflows");
      const workflowsData = await workflowsRes.json();
      setWorkflows(workflowsData.workflows || []);

      // Get recommendations
      const recRes = await fetch("/api/guide/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editablePrompt }),
      });

      const recData = await recRes.json();
      setRecommendations(recData.recommendations || []);

      // Auto-select recommended workflow or default
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

  // Generate content (used by both step 4 and regenerate)
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
        }),
      });

      if (!response.ok) {
        // Fallback to non-streaming API
        const fallbackResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: editablePrompt,
            workflowId: selectedWorkflowId,
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

      // Set final result
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

  // Step 4: Select workflow
  const handleStep4Next = async () => {
    await generateContent();
  };

  // Regenerate with same prompt
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
    } catch {
      window.open(url, "_blank");
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getRecommendationForWorkflow = (workflowId: string) => {
    return recommendations.find(r => r.workflowId === workflowId);
  };

  return (
    <div className="min-h-screen bg-animate">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">智能引导</h1>
              <p className="text-xs text-gray-500">一步步创作你想要的内容</p>
            </div>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/50 border border-white/30 text-gray-600 text-sm hover:bg-white/70 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  step < currentStep
                    ? "bg-emerald-500 text-white"
                    : step === currentStep
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step < currentStep ? "✓" : step}
              </div>
              {step < 5 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-2 rounded ${
                    step < currentStep ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>选类型</span>
          <span>回答问题</span>
          <span>确认Prompt</span>
          <span>选工作流</span>
          <span>生成结果</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select Content Type */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">选择内容类型</h2>
            <p className="text-gray-500 mb-6">你想创作什么类型的内容？</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type.id)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedType === type.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl mb-2 block">{type.icon}</span>
                  <h3 className="font-medium text-gray-800">{type.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>

            {selectedType === "other" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  请输入自定义内容类型
                </label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="例如：产品介绍、活动策划..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleStep1Next}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {isLoading ? "生成问题中..." : "下一步"}
            </button>
          </div>
        )}

        {/* Step 2: Answer Questions */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">回答几个问题</h2>
            <p className="text-gray-500 mb-6">帮助我们更好地理解你的需求</p>

            {/* Word Count Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <label className="block text-sm font-medium text-gray-800 mb-3">
                期望字数 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WORD_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWordCount(option.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      wordCount === option.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium text-gray-800 block">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </button>
                ))}
              </div>
              {wordCount === "custom" && (
                <div className="mt-3">
                  <input
                    type="number"
                    placeholder="请输入期望字数，例如 1500"
                    value={customWordCount}
                    onChange={(e) => setCustomWordCount(e.target.value)}
                    min="100"
                    max="10000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-6 mb-6">
              {questions.map((question) => (
                <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    {question.label}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.type === "text" && (
                    <input
                      type="text"
                      placeholder={question.placeholder}
                      value={(answers[question.id] as string) || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none"
                    />
                  )}

                  {question.type === "textarea" && (
                    <textarea
                      placeholder={question.placeholder}
                      value={(answers[question.id] as string) || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  )}

                  {question.type === "radio" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label
                          key={option}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            answers[question.id] === option
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-3"
                          />
                          <span className="text-gray-700">{option}</span>
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
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 hover:bg-gray-50"
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
                              className="mr-3"
                            />
                            <span className="text-gray-700">{option}</span>
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
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleStep2Next}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {isLoading ? "生成Prompt中..." : "下一步"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Prompt */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">确认 Prompt</h2>
            <p className="text-gray-500 mb-6">AI 根据你的回答生成了以下 Prompt，你可以编辑调整</p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none resize-none font-mono text-sm"
              />
              <div className="flex justify-between items-center mt-3 text-sm">
                <span className="text-gray-400">{editablePrompt.length} 字符</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditablePrompt(generatedPrompt)}
                    className="text-gray-500 hover:text-gray-600"
                  >
                    撤销编辑
                  </button>
                  <button
                    onClick={handleRegeneratePrompt}
                    disabled={isRegeneratingPrompt}
                    className="text-indigo-500 hover:text-indigo-600 font-medium disabled:opacity-50"
                  >
                    {isRegeneratingPrompt ? "生成中..." : "🔄 换一批"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleStep3Next}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {isLoading ? "加载工作流..." : "下一步"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Select Workflow */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">选择工作流</h2>
            <p className="text-gray-500 mb-6">选择一个工作流来生成内容</p>

            {workflows.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-gray-500">暂无可用工作流，请先在后台配置</p>
                <Link
                  href="/admin/workflows"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm"
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
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedWorkflowId === workflow.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-800 flex items-center gap-2">
                            {workflow.name}
                            {workflow.isDefault && (
                              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">
                                默认
                              </span>
                            )}
                            {rec && (
                              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                                推荐 {rec.matchScore}%
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{workflow.description || "暂无描述"}</p>
                          {rec && (
                            <p className="text-xs text-indigo-500 mt-2">💡 {rec.reason}</p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedWorkflowId === workflow.id
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedWorkflowId === workflow.id && (
                            <span className="text-white text-xs">✓</span>
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
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleStep4Next}
                disabled={isLoading || workflows.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {isLoading ? "生成中..." : "生成内容"}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {currentStep === 5 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {isStreaming ? "正在生成中..." : "生成完成 🎉"}
            </h2>
            <p className="text-gray-500 mb-6">
              {isStreaming ? "内容正在生成，请稍候..." : "以下是根据你的需求生成的内容"}
            </p>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              {/* Title */}
              {result?.title && (
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800">{result.title}</h3>
                </div>
              )}

              {/* Images */}
              {result?.images && result.images.length > 0 && (
                <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                  {result.images.length > 1 && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => result.images?.forEach((img, i) => downloadImage(img, `image-${i + 1}.jpg`))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors"
                      >
                        📦 下载全部 ({result.images.length})
                      </button>
                    </div>
                  )}
                  <div className={`grid gap-4 ${result.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {result.images.map((img, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`配图 ${idx + 1}`}
                          className="w-full h-auto object-contain"
                          style={{ maxHeight: '400px' }}
                        />
                        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                          <button
                            onClick={() => downloadImage(img, `image-${idx + 1}.jpg`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors w-full justify-center"
                          >
                            ⬇️ 下载
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content - Show streaming content or final result */}
              <div className="px-5 py-4">
                <div className="article-content text-gray-700 prose prose-sm max-w-none">
                  {isStreaming && streamingContent ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingContent}
                      </ReactMarkdown>
                      <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
                    </>
                  ) : result?.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.content}
                    </ReactMarkdown>
                  ) : isStreaming ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-2">正在生成...</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              {!isStreaming && result && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
                  <button
                    onClick={() => copyContent(result.content || "")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors border border-gray-200"
                  >
                    📋 复制全文
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors text-center"
              >
                返回首页
              </Link>
              {/* 再换一篇 - 用相同 Prompt 重新生成 */}
              <button
                onClick={handleRegenerate}
                disabled={isLoading || isStreaming}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {isLoading || isStreaming ? "生成中..." : "🔄 再换一篇"}
              </button>
              {/* 重新创作 - 回到第一步 */}
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
                }}
                disabled={isLoading || isStreaming}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                ✨ 重新创作
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
