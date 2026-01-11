import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture the original end function
  const originalEnd = res.end;
  
  res.end = function(this: Response, ...args: Parameters<typeof originalEnd>) {
    const duration = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 400;
    
    // Log the request (don't await - fire and forget)
    storage.addLog({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    }).catch(console.error);

    // Update stats
    storage.incrementRequests(success, duration).catch(console.error);

    return originalEnd.apply(this, args);
  };

  next();
}
