type TierName = "free" | "pro" | "enterprise";

interface TierDefinition {
  name: TierName;
  maxRequests: number;
  windowMs: number;
  description: string;
}

interface TierStatus {
  tier: TierName;
  maxRequests: number;
  windowMs: number;
  currentUsage: number;
  remaining: number;
  resetsAt: Date;
}

interface UserUsage {
  count: number;
  windowStart: number;
}

const tiers: Record<TierName, TierDefinition> = {
  free: {
    name: "free",
    maxRequests: 30,
    windowMs: 15 * 60 * 1000,
    description: "Free tier: 30 requests per 15 minutes",
  },
  pro: {
    name: "pro",
    maxRequests: 300,
    windowMs: 15 * 60 * 1000,
    description: "Pro tier: 300 requests per 15 minutes",
  },
  enterprise: {
    name: "enterprise",
    maxRequests: 3000,
    windowMs: 15 * 60 * 1000,
    description: "Enterprise tier: 3000 requests per 15 minutes",
  },
};

const userTiers = new Map<string, TierName>();
const userUsage = new Map<string, UserUsage>();

export function getTierForUser(userId: string): TierDefinition {
  const tierName = userTiers.get(userId) || "free";
  return tiers[tierName];
}

export function getAllTiers(): TierDefinition[] {
  return Object.values(tiers);
}

export function setUserTier(userId: string, tier: TierName): void {
  if (!tiers[tier]) {
    throw new Error(`Invalid tier: ${tier}. Valid tiers: ${Object.keys(tiers).join(", ")}`);
  }
  userTiers.set(userId, tier);
}

export function getCurrentTierStatus(userId: string): TierStatus {
  const tierDef = getTierForUser(userId);
  const now = Date.now();
  const usage = userUsage.get(userId);

  let currentUsage = 0;
  let windowStart = now;

  if (usage) {
    if (now - usage.windowStart < tierDef.windowMs) {
      currentUsage = usage.count;
      windowStart = usage.windowStart;
    }
  }

  return {
    tier: tierDef.name,
    maxRequests: tierDef.maxRequests,
    windowMs: tierDef.windowMs,
    currentUsage,
    remaining: Math.max(0, tierDef.maxRequests - currentUsage),
    resetsAt: new Date(windowStart + tierDef.windowMs),
  };
}

export function checkRateLimit(userId: string): { allowed: boolean; status: TierStatus } {
  const tierDef = getTierForUser(userId);
  const now = Date.now();
  let usage = userUsage.get(userId);

  if (!usage || now - usage.windowStart >= tierDef.windowMs) {
    usage = { count: 0, windowStart: now };
    userUsage.set(userId, usage);
  }

  usage.count++;
  const allowed = usage.count <= tierDef.maxRequests;
  const status = getCurrentTierStatus(userId);

  return { allowed, status };
}
