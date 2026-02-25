interface RequestRecord {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: Date;
}

interface EndpointStats {
  method: string;
  path: string;
  count: number;
  avgResponseTime: number;
  errorRate: number;
  totalDuration: number;
  errorCount: number;
}

interface TimeAggregation {
  period: string;
  count: number;
  avgResponseTime: number;
  errorRate: number;
}

interface AnalyticsResult {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  requestsByPeriod: TimeAggregation[];
  topEndpoints: EndpointStats[];
}

interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  errorsByStatus: Record<number, number>;
  topErrorEndpoints: EndpointStats[];
}

const records: RequestRecord[] = [];
const MAX_RECORDS = 10000;

export function trackRequest(
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  records.unshift({
    method: method.toUpperCase(),
    path,
    status,
    duration,
    timestamp: new Date(),
  });
  if (records.length > MAX_RECORDS) {
    records.length = MAX_RECORDS;
  }
}

function filterByTimeRange(
  timeRange?: "hour" | "day" | "week" | "month"
): RequestRecord[] {
  if (!timeRange) return records;
  const now = Date.now();
  const ranges: Record<string, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - (ranges[timeRange] || ranges.day);
  return records.filter((r) => r.timestamp.getTime() >= cutoff);
}

function buildEndpointStats(data: RequestRecord[]): Map<string, EndpointStats> {
  const map = new Map<string, EndpointStats>();
  for (const r of data) {
    const key = `${r.method} ${r.path}`;
    let stats = map.get(key);
    if (!stats) {
      stats = {
        method: r.method,
        path: r.path,
        count: 0,
        avgResponseTime: 0,
        errorRate: 0,
        totalDuration: 0,
        errorCount: 0,
      };
      map.set(key, stats);
    }
    stats.count++;
    stats.totalDuration += r.duration;
    if (r.status >= 400) stats.errorCount++;
    stats.avgResponseTime = stats.totalDuration / stats.count;
    stats.errorRate = stats.errorCount / stats.count;
  }
  return map;
}

function aggregateByPeriod(
  data: RequestRecord[],
  periodType: "hourly" | "daily" = "hourly"
): TimeAggregation[] {
  const buckets = new Map<
    string,
    { count: number; totalDuration: number; errors: number }
  >();

  for (const r of data) {
    const d = r.timestamp;
    let key: string;
    if (periodType === "hourly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, totalDuration: 0, errors: 0 };
      buckets.set(key, bucket);
    }
    bucket.count++;
    bucket.totalDuration += r.duration;
    if (r.status >= 400) bucket.errors++;
  }

  return Array.from(buckets.entries())
    .map(([period, b]) => ({
      period,
      count: b.count,
      avgResponseTime: b.totalDuration / b.count,
      errorRate: b.errors / b.count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function getAnalytics(
  timeRange?: "hour" | "day" | "week" | "month"
): AnalyticsResult {
  const data = filterByTimeRange(timeRange);
  const totalRequests = data.length;
  const totalDuration = data.reduce((sum, r) => sum + r.duration, 0);
  const errors = data.filter((r) => r.status >= 400).length;
  const endpointMap = buildEndpointStats(data);
  const topEndpoints = Array.from(endpointMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRequests,
    avgResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
    errorRate: totalRequests > 0 ? errors / totalRequests : 0,
    requestsByPeriod: aggregateByPeriod(data, timeRange === "hour" ? "hourly" : "daily"),
    topEndpoints,
  };
}

export function getEndpointStats(): EndpointStats[] {
  const map = buildEndpointStats(records);
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function getTopEndpoints(limit: number = 10): EndpointStats[] {
  return getEndpointStats().slice(0, limit);
}

export function getErrorAnalytics(): ErrorAnalytics {
  const errors = records.filter((r) => r.status >= 400);
  const errorsByStatus: Record<number, number> = {};
  for (const r of errors) {
    errorsByStatus[r.status] = (errorsByStatus[r.status] || 0) + 1;
  }
  const errorEndpoints = buildEndpointStats(errors);
  const topErrorEndpoints = Array.from(errorEndpoints.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalErrors: errors.length,
    errorRate: records.length > 0 ? errors.length / records.length : 0,
    errorsByStatus,
    topErrorEndpoints,
  };
}
