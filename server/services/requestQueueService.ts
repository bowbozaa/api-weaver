import { randomUUID } from "crypto";

type Priority = "high" | "normal" | "low";
type QueueItemStatus = "pending" | "processing" | "completed" | "failed";

interface QueueRequest {
  id?: string;
  type: string;
  payload: Record<string, unknown>;
  priority?: Priority;
}

interface QueueItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: Priority;
  status: QueueItemStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  result: unknown;
  error: string | null;
}

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
}

const priorityWeight: Record<Priority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

const queue: QueueItem[] = [];
const history: QueueItem[] = [];
const MAX_HISTORY = 500;

export function enqueueRequest(req: QueueRequest): QueueItem {
  const item: QueueItem = {
    id: req.id || randomUUID(),
    type: req.type,
    payload: req.payload,
    priority: req.priority || "normal",
    status: "pending",
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
  };
  queue.push(item);
  queue.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  return item;
}

export function processNext(): QueueItem | null {
  const index = queue.findIndex((item) => item.status === "pending");
  if (index === -1) return null;

  const item = queue[index];
  item.status = "processing";
  item.startedAt = new Date();
  return item;
}

export function completeRequest(id: string, result: unknown): QueueItem | null {
  const index = queue.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const item = queue[index];
  item.status = "completed";
  item.completedAt = new Date();
  item.result = result;

  queue.splice(index, 1);
  history.unshift(item);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  return item;
}

export function failRequest(id: string, error: string): QueueItem | null {
  const index = queue.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const item = queue[index];
  item.status = "failed";
  item.completedAt = new Date();
  item.error = error;

  queue.splice(index, 1);
  history.unshift(item);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  return item;
}

export function getQueueStatus(): QueueStatus {
  const completedItems = history.filter((i) => i.status === "completed");
  let totalWait = 0;
  for (const item of completedItems) {
    if (item.startedAt) {
      totalWait += item.startedAt.getTime() - item.createdAt.getTime();
    }
  }
  const averageWaitTime =
    completedItems.length > 0 ? totalWait / completedItems.length : 0;

  return {
    pending: queue.filter((i) => i.status === "pending").length,
    processing: queue.filter((i) => i.status === "processing").length,
    completed: history.filter((i) => i.status === "completed").length,
    failed: history.filter((i) => i.status === "failed").length,
    averageWaitTime,
  };
}

export function getQueueHistory(limit: number = 50): QueueItem[] {
  return history.slice(0, limit);
}
