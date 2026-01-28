import { NextRequest } from "next/server";
import { getWorkflow, getDefaultWorkflow, Workflow } from "@/lib/workflows";
import { logApiCall } from "@/lib/api-logger";

// 构建请求参数
function buildPayload(workflow: Workflow, userInput: string, imageCount: number = 0): Record<string, unknown> {
  // 如果有参数模板，使用模板并填充用户输入
  if (workflow.paramTemplate && workflow.inputField) {
    try {
      const template = JSON.parse(workflow.paramTemplate);
      template[workflow.inputField] = userInput;
      // 添加图片数量参数
      template.image_count = imageCount;
      template.generate_images = imageCount > 0;
      return template;
    } catch {
      // 解析失败，使用默认参数
    }
  }

  // 默认兼容性参数（同时发送多种命名）
  return {
    topic: userInput,
    article_topic: userInput,
    article_type: "blog",
    article_title: "",
    word_count: 800,
    expected_word_count: "800",
    enable_web_search: false,
    web_search_time_range: "",
    search_time_range: "",
    publish_to_wechat: false,
    is_api_call: true,
    // 图片相关参数
    image_count: imageCount,
    generate_images: imageCount > 0,
    need_cover_image: imageCount > 0,
    illustration_count: imageCount,
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { message, workflowId, imageCount = 0 } = body;

    if (!message) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Message is required" })}\n\n`),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
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
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", error: "暂未配置服务，请联系管理员在后台添加工作流。" })}\n\n`),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }

    // 构建工作流参数
    const payload = buildPayload(workflow, message, imageCount);

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();
        try {
          // 发送开始信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`));

          // 调用 Coze API
          const response = await fetch(workflow!.endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${workflow!.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const duration = Date.now() - startTime;

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Coze API Error:", errorText);
            logApiCall('coze', 'workflow-generate', false, `Coze API error: ${response.status}`, duration);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: `Coze API error: ${response.status}` })}\n\n`)
            );
            controller.close();
            return;
          }

          const data = await response.json();
          logApiCall('coze', 'workflow-generate', true, undefined, duration);

          // 格式化返回数据
          const title = data.title || data.article_title || null;
          const content = data.formatted_article || data.article || data.generated_article || "";

          // 合并图片
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

          // 模拟流式输出内容（逐字符发送以模拟打字效果）
          if (content) {
            const chunkSize = 20; // 每次发送的字符数
            for (let i = 0; i < content.length; i += chunkSize) {
              const chunk = content.slice(i, i + chunkSize);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`)
              );
              // 小延迟以创建打字效果
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          }

          // 发送完成信号，包含完整数据
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "complete",
              title,
              content,
              images,
            })}\n\n`)
          );

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const duration = Date.now() - startTime;
          logApiCall('coze', 'workflow-generate', false, error instanceof Error ? error.message : 'Unknown error', duration);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: "生成内容时发生错误" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      }
    );
  }
}
