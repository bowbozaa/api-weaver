import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

interface APILog {
  id: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  ip: string;
  userAgent: string;
  timestamp: string;
}

const apiLogs: APILog[] = [];
let totalRequests = 0;
let successRequests = 0;
let totalDuration = 0;

export const storage: IAuthStorage & {
  getStats: () => Promise<any>;
  getLogs: (limit: number) => Promise<APILog[]>;
  addLog: (log: Omit<APILog, "id">) => Promise<void>;
  incrementRequests: (success: boolean, duration: number) => Promise<void>;
} = {
  ...authStorage,

  async getStats() {
    const avgDuration = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;
    const errorCount = totalRequests - successRequests;
    return {
      totalRequests,
      averageDuration: avgDuration,
      errorCount,
      successRate: totalRequests > 0 ? Math.round((successRequests / totalRequests) * 100) : 100,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  },

  async getLogs(limit: number) {
    return apiLogs.slice(-limit).reverse();
  },

  async addLog(log: Omit<APILog, "id">) {
    apiLogs.push({ ...log, id: crypto.randomUUID() });
    if (apiLogs.length > 10000) apiLogs.splice(0, apiLogs.length - 10000);
  },

  async incrementRequests(success: boolean, duration: number) {
    totalRequests++;
    if (success) successRequests++;
    totalDuration += duration;
  },
};
