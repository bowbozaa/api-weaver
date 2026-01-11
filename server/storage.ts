import type { APILog, APIStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // API Logs
  addLog(log: Omit<APILog, "id">): Promise<APILog>;
  getLogs(limit?: number): Promise<APILog[]>;
  clearLogs(): Promise<void>;
  
  // API Stats
  getStats(): Promise<APIStats>;
  incrementRequests(success: boolean, duration: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private logs: APILog[] = [];
  private stats: APIStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    uptime: 0,
  };
  private startTime: number;
  private totalResponseTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async addLog(log: Omit<APILog, "id">): Promise<APILog> {
    const newLog: APILog = {
      ...log,
      id: randomUUID(),
    };
    this.logs.unshift(newLog);
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    return newLog;
  }

  async getLogs(limit: number = 100): Promise<APILog[]> {
    return this.logs.slice(0, limit);
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
  }

  async getStats(): Promise<APIStats> {
    return {
      ...this.stats,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async incrementRequests(success: boolean, duration: number): Promise<void> {
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    this.totalResponseTime += duration;
    this.stats.averageResponseTime = this.totalResponseTime / this.stats.totalRequests;
  }
}

export const storage = new MemStorage();
