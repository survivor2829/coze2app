import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  setDefaultWorkflow,
} from "@/lib/workflows";

// 验证管理员身份
async function checkAuth() {
  const session = await verifySession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// GET: 获取所有工作流
export async function GET() {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const workflows = await getWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Failed to get workflows:", error);
    return NextResponse.json(
      { error: "Failed to get workflows" },
      { status: 500 }
    );
  }
}

// POST: 创建工作流
export async function POST(request: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, endpoint, token, workflowId, description, isDefault, paramTemplate, inputField } = body;

    if (!name || !endpoint || !token) {
      return NextResponse.json(
        { error: "Name, endpoint, and token are required" },
        { status: 400 }
      );
    }

    const workflow = await createWorkflow({
      name,
      endpoint,
      token,
      workflowId: workflowId || "",
      description: description || "",
      isDefault: isDefault || false,
      paramTemplate: paramTemplate || undefined,
      inputField: inputField || undefined,
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}

// PUT: 更新工作流
export async function PUT(request: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, name, endpoint, token, workflowId, description, isDefault, paramTemplate, inputField } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const workflow = await updateWorkflow(id, {
      name,
      endpoint,
      token,
      workflowId,
      description,
      isDefault,
      paramTemplate,
      inputField,
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

// PATCH: 特殊操作（如设置默认）
export async function PATCH(request: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "ID and action are required" },
        { status: 400 }
      );
    }

    if (action === "setDefault") {
      const success = await setDefaultWorkflow(id);
      if (!success) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "toggleEnabled") {
      const { enabled } = body;
      const workflow = await updateWorkflow(id, { enabled });
      if (!workflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, workflow });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to perform action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}

// DELETE: 删除工作流
export async function DELETE(request: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const success = await deleteWorkflow(id);

    if (!success) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
