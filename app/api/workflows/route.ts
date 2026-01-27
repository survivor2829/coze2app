import { NextResponse } from "next/server";
import { getPublicWorkflows } from "@/lib/workflows";

// GET: 获取前台可用的工作流列表（不含敏感信息）
export async function GET() {
  try {
    const workflows = await getPublicWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Failed to get workflows:", error);
    return NextResponse.json(
      { error: "Failed to get workflows" },
      { status: 500 }
    );
  }
}
