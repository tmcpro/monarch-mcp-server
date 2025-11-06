/**
 * Token Refresh and Keep-Alive Manager
 * Handles automatic token refresh to maintain Monarch Money sessions
 */

import { MonarchMoney, MonarchAuthError } from './monarch-client.js';
import { MonarchTokenManager, type Env } from './auth.js';
import { AuthHealthManager } from './auth-flow.js';

export interface TokenRefreshConfig {
  /**
   * Number of days before expiry to trigger automatic refresh
   * Default: 7 days
   */
  refreshThresholdDays?: number;

  /**
   * Whether to validate the token by making a test API call
   * Default: true
   */
  validateToken?: boolean;
}

/**
 * Token Refresh Manager
 * Handles proactive token validation and refresh notifications
 */
export class TokenRefreshManager {
  private env: Env;
  private userId: string;

  constructor(env: Env, userId: string) {
    this.env = env;
    this.userId = userId;
  }

  /**
   * Check if token needs refresh based on expiry date
   */
  async needsRefresh(config: TokenRefreshConfig = {}): Promise<{
    needsRefresh: boolean;
    reason?: string;
    daysUntilExpiry?: number;
  }> {
    const { refreshThresholdDays = 7 } = config;

    const healthManager = new AuthHealthManager(this.env);
    const daysUntilExpiry = await healthManager.getDaysUntilExpiry(this.userId);

    // No token exists
    if (daysUntilExpiry === null) {
      return {
        needsRefresh: true,
        reason: 'No token found',
      };
    }

    // Token expired
    if (daysUntilExpiry <= 0) {
      return {
        needsRefresh: true,
        reason: 'Token has expired',
        daysUntilExpiry,
      };
    }

    // Token expiring soon
    if (daysUntilExpiry <= refreshThresholdDays) {
      return {
        needsRefresh: true,
        reason: `Token expires in ${daysUntilExpiry} days`,
        daysUntilExpiry,
      };
    }

    return {
      needsRefresh: false,
      daysUntilExpiry,
    };
  }

  /**
   * Validate token by making a test API call
   */
  async validateToken(): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const tokenManager = new MonarchTokenManager(this.env.MONARCH_KV, this.env.COOKIE_ENCRYPTION_KEY);
      const token = await tokenManager.getToken(this.userId);

      if (!token) {
        return {
          valid: false,
          error: 'No token found',
        };
      }

      // Make a lightweight API call to validate the token
      const client = new MonarchMoney(token);

      // Try to fetch accounts as a validation check
      try {
        await client.getAccounts();
        return { valid: true };
      } catch (error) {
        if (error instanceof MonarchAuthError) {
          return {
            valid: false,
            error: error.message,
          };
        }
        throw error;
      }
    } catch (error) {
      console.error('[TokenRefresh] Validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get refresh reminder message for user
   */
  async getRefreshReminder(): Promise<string | null> {
    const refreshStatus = await this.needsRefresh({ refreshThresholdDays: 7 });

    if (!refreshStatus.needsRefresh) {
      return null;
    }

    const baseUrl = this.env.PUBLIC_BASE_URL || 'https://monarch-mcp.tm3.workers.dev';
    const refreshUrl = `${baseUrl}/auth/refresh`;

    if (refreshStatus.daysUntilExpiry !== undefined && refreshStatus.daysUntilExpiry > 0) {
      return `⚠️ **Token Refresh Reminder**

Your Monarch Money token expires in ${refreshStatus.daysUntilExpiry} day${refreshStatus.daysUntilExpiry === 1 ? '' : 's'}.

To avoid interruption, please refresh your token:
🔗 ${refreshUrl}

Or use the \`setup_wizard\` tool for a guided refresh.`;
    }

    return `🔴 **Token Expired**

Your Monarch Money token has expired. Please refresh to continue:
🔗 ${refreshUrl}

Or use the \`setup_wizard\` tool to re-authenticate.`;
  }

  /**
   * Store last validation timestamp
   */
  async recordValidation(success: boolean): Promise<void> {
    const key = `token:validation:${this.userId}`;
    await this.env.OAUTH_KV.put(
      key,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        success,
      }),
      { expirationTtl: 60 * 60 * 24 } // 24 hours
    );
  }

  /**
   * Get last validation info
   */
  async getLastValidation(): Promise<{
    timestamp?: string;
    success?: boolean;
  } | null> {
    const key = `token:validation:${this.userId}`;
    const data = await this.env.OAUTH_KV.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

/**
 * Proactive token validation for keep-alive
 * Call this periodically to ensure tokens remain valid
 */
export async function performTokenKeepAlive(env: Env, userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const refreshManager = new TokenRefreshManager(env, userId);

  // Check if refresh is needed
  const refreshStatus = await refreshManager.needsRefresh({ refreshThresholdDays: 30 });

  if (refreshStatus.needsRefresh && refreshStatus.daysUntilExpiry !== undefined && refreshStatus.daysUntilExpiry <= 0) {
    return {
      success: false,
      message: 'Token has expired. User needs to re-authenticate.',
    };
  }

  // Validate token
  const validation = await refreshManager.validateToken();
  await refreshManager.recordValidation(validation.valid);

  if (!validation.valid) {
    return {
      success: false,
      message: `Token validation failed: ${validation.error}`,
    };
  }

  // Return warning if token expires soon
  if (refreshStatus.needsRefresh) {
    return {
      success: true,
      message: `Token is valid but expires in ${refreshStatus.daysUntilExpiry} days. Recommend refresh soon.`,
    };
  }

  return {
    success: true,
    message: 'Token is valid and active.',
  };
}
