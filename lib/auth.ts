import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// 使用简单的加密方式生成 session token
function generateSessionToken(username: string): string {
  const timestamp = Date.now();
  const data = `${username}:${timestamp}:${process.env.AUTH_SECRET}`;
  // Base64 编码作为简单的 session token
  return Buffer.from(data).toString("base64");
}

// 验证 session token
function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false };

    const [username, timestamp, secret] = parts;

    // 验证 secret
    if (secret !== process.env.AUTH_SECRET) return { valid: false };

    // 验证时间（24小时有效期）
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - tokenTime > maxAge) return { valid: false };

    return { valid: true, username };
  } catch {
    return { valid: false };
  }
}

// 登录验证
export function validateCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error("Admin credentials not configured");
    return false;
  }

  return username === adminUsername && password === adminPassword;
}

// 创建登录 session
export async function createSession(username: string): Promise<string> {
  const token = generateSessionToken(username);

  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return token;
}

// 验证当前 session
export async function verifySession(): Promise<{ authenticated: boolean; username?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!token) {
    return { authenticated: false };
  }

  const result = verifySessionToken(token);
  return { authenticated: result.valid, username: result.username };
}

// 从 request 验证 session（用于 middleware）
export function verifySessionFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get("admin_session")?.value;

  if (!token) {
    return false;
  }

  return verifySessionToken(token).valid;
}

// 清除 session
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}
