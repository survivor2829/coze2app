"use client";

import { useState, useEffect } from "react";
import WorkflowForm from "@/components/admin/WorkflowForm";
import WorkflowList from "@/components/admin/WorkflowList";
import type { Workflow } from "@/lib/workflows";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Workflow | null>(null);

  // 加载工作流列表
  const loadWorkflows = async () => {
    try {
      const response = await fetch("/api/admin/workflows");
      const data = await response.json();
      if (data.workflows) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  // 创建/更新工作流
  const handleSubmit = async (data: Omit<Workflow, "id" | "createdAt" | "updatedAt">) => {
    setIsSaving(true);
    try {
      const url = "/api/admin/workflows";
      const method = editingWorkflow ? "PUT" : "POST";
      const body = editingWorkflow ? { ...data, id: editingWorkflow.id } : data;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadWorkflows();
        setShowForm(false);
        setEditingWorkflow(null);
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 删除工作流
  const handleDelete = async (workflow: Workflow) => {
    try {
      const response = await fetch(`/api/admin/workflows?id=${workflow.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadWorkflows();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  // 设置默认工作流
  const handleSetDefault = async (workflow: Workflow) => {
    try {
      const response = await fetch("/api/admin/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workflow.id, action: "setDefault" }),
      });

      if (response.ok) {
        await loadWorkflows();
      }
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  // 打开编辑表单
  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowForm(true);
  };

  // 关闭表单
  const handleCancel = () => {
    setShowForm(false);
    setEditingWorkflow(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">工作流管理</h1>
          <p className="text-gray-500 mt-1">管理你的 Coze 工作流配置</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
        >
          <span className="text-lg">+</span>
          添加工作流
        </button>
      </div>

      {/* 加载状态 */}
      {isLoading ? (
        <div className="glass rounded-2xl border border-white/30 p-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <LoadingIcon />
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      ) : (
        <WorkflowList
          workflows={workflows}
          onEdit={handleEdit}
          onDelete={setDeleteConfirm}
          onSetDefault={handleSetDefault}
        />
      )}

      {/* 表单弹窗 */}
      {showForm && (
        <WorkflowForm
          workflow={editingWorkflow}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSaving}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-white/30 shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
              <p className="text-gray-500 mb-6">
                确定要删除工作流「{deleteConfirm.name}」吗？此操作无法撤销。
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingIcon() {
  return (
    <svg className="w-5 h-5 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
