import { NextRequest, NextResponse } from "next/server";
import { getWorkflow, getDefaultWorkflow, Workflow } from "@/lib/workflows";
import { logApiCall } from "@/lib/api-logger";

// 构建请求参数
function buildPayload(workflow: Workflow, userInput: string): Record<string, unknown> {
  // 如果有参数模板，使用模板并填充用户输入
  if (workflow.paramTemplate && workflow.inputField) {
    try {
      const template = JSON.parse(workflow.paramTemplate);
      template[workflow.inputField] = userInput;
      return template;
    } catch {
      // 解析失败，使用默认参数
    }
  }

  // 默认兼容性参数（同时发送多种命名）
  return {
    // 主题字段 - 不同工作流可能用不同的名称
    topic: userInput,
    article_topic: userInput,

    // 文章类型
    article_type: "blog",
    article_title: "",

    // 字数限制 - 不同工作流可能用不同的名称
    word_count: 800,
    expected_word_count: "800",

    // 搜索相关
    enable_web_search: false,
    web_search_time_range: "",
    search_time_range: "",

    // 其他选项
    publish_to_wechat: false,
    is_api_call: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, workflowId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 获取工作流配置
    let workflow: Workflow | null = null;

    if (workflowId) {
      workflow = await getWorkflow(workflowId);
    }

    if (!workflow) {
      workflow = await getDefaultWorkflow();
    }

    if (!workflow || !workflow.endpoint || !workflow.token) {
      return NextResponse.json(
        { error: "暂未配置服务，请联系管理员在后台添加工作流。" },
        { status: 503 }
      );
    }

    // 构建工作流参数
    const payload = buildPayload(workflow, message);
    const startTime = Date.now();

    // 调用 Coze 专属工作流端点
    const response = await fetch(workflow.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workflow.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Coze API Error:", errorText);
      logApiCall('coze', 'workflow-generate', false, `Coze API error: ${response.status}`, duration);
      return NextResponse.json(
        { error: `Coze API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    logApiCall('coze', 'workflow-generate', true, undefined, duration);

    // 格式化返回数据 - 兼容不同工作流的响应格式
    // 工作流1（公众号）: title, formatted_article, images, image_positions
    // 工作流2（Luna）: article_title, generated_article, cover_image_url, illustration_urls
    const title = data.title || data.article_title || null;
    const content = data.formatted_article || data.article || data.generated_article || null;

    // 合并图片：工作流1用images，工作流2用cover_image_url + illustration_urls
    let images: string[] = [];
    if (data.images && data.images.length > 0) {
      images = data.images;
    } else {
      if (data.cover_image_url) {
        images.push(data.cover_image_url);
      }
      if (data.illustration_urls && data.illustration_urls.length > 0) {
        images = images.concat(data.illustration_urls);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        title,
        content,
        images,
        imagePositions: data.image_positions || [],
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    logApiCall('coze', 'workflow-generate', false, error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
