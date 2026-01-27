import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export interface ApiLog {
  id: string;
  timestamp: string;
  type: 'coze' | 'deepseek';
  action: string;
  success: boolean;
  error?: string;
  duration?: number;
}

interface LogData {
  logs: ApiLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'api-logs.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read logs from file
export function readLogs(): ApiLog[] {
  ensureDataDir();
  try {
    if (!existsSync(LOG_FILE)) {
      return [];
    }
    const data = readFileSync(LOG_FILE, 'utf-8');
    const parsed: LogData = JSON.parse(data);
    return parsed.logs || [];
  } catch {
    return [];
  }
}

// Write logs to file
function writeLogs(logs: ApiLog[]) {
  ensureDataDir();
  const data: LogData = { logs };
  writeFileSync(LOG_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Add a new log entry
export function logApiCall(
  type: 'coze' | 'deepseek',
  action: string,
  success: boolean,
  error?: string,
  duration?: number
): ApiLog {
  const logs = readLogs();

  const newLog: ApiLog = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type,
    action,
    success,
    error,
    duration,
  };

  logs.push(newLog);

  // Keep only last 1000 logs to prevent file from growing too large
  const trimmedLogs = logs.slice(-1000);
  writeLogs(trimmedLogs);

  return newLog;
}

// Get today's statistics
export function getTodayStats(): {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  cozeCalls: number;
  deepseekCalls: number;
  successRate: number;
} {
  const logs = readLogs();
  const today = new Date().toISOString().split('T')[0];

  const todayLogs = logs.filter(log => log.timestamp.startsWith(today));

  const totalCalls = todayLogs.length;
  const successCalls = todayLogs.filter(log => log.success).length;
  const failedCalls = totalCalls - successCalls;
  const cozeCalls = todayLogs.filter(log => log.type === 'coze').length;
  const deepseekCalls = todayLogs.filter(log => log.type === 'deepseek').length;
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 100;

  return {
    totalCalls,
    successCalls,
    failedCalls,
    cozeCalls,
    deepseekCalls,
    successRate,
  };
}

// Get recent logs
export function getRecentLogs(limit: number = 10): ApiLog[] {
  const logs = readLogs();
  return logs.slice(-limit).reverse();
}
