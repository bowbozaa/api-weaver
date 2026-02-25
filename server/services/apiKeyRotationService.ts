import crypto from "crypto";

interface ApiKeyStatus {
  isSet: boolean;
  keyLength: number | null;
  isSecureLength: boolean;
  lastChecked: Date;
  recommendations: string[];
}

export function getApiKeyStatus(): ApiKeyStatus {
  const isSet = !!process.env.API_KEY;
  const actualLength = process.env.API_KEY?.length || 0;
  const keyLength = isSet ? (actualLength >= 32 ? 32 : actualLength) : null;
  const isSecureLength = actualLength >= 32;
  const recommendations: string[] = [];
  
  if (!isSet) {
    recommendations.push("API_KEY environment variable is not set. Set it for API authentication.");
    return {
      isSet: false,
      keyLength: null,
      isSecureLength: false,
      lastChecked: new Date(),
      recommendations,
    };
  }

  if (!isSecureLength) {
    recommendations.push("API key is shorter than 32 characters. Use a longer key for better security.");
  }

  recommendations.push("Rotate API keys periodically (recommended every 90 days) for security.");

  return {
    isSet,
    keyLength,
    isSecureLength,
    lastChecked: new Date(),
    recommendations,
  };
}

export function generateSecureApiKey(length: number = 48): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export function getSecurityRecommendations(): string[] {
  const recommendations: string[] = [];
  const status = getApiKeyStatus();
  
  recommendations.push(...status.recommendations);

  if (!process.env.NODE_ENV || process.env.NODE_ENV !== "production") {
    recommendations.push("Consider setting NODE_ENV=production for enhanced security headers.");
  }

  return recommendations;
}
