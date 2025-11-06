/**
 * Enhanced Authentication Flow for MCP Users
 * Handles out-of-band authentication and user notifications
 */

import { MonarchTokenManager, type Env } from './auth.js';

export interface AuthStatus {
  authenticated: boolean;
  hasMonarchToken: boolean;
  tokenExpiry?: string;
  needsAction: boolean;
  actionRequired?: string;
  setupUrl?: string;
  magicLink?: string;
}

export interface SetupState {
  userId: string;
  step: 'github_auth' | 'monarch_token' | 'complete';
  lastUpdated: string;
  magicCode?: string;
}

/**
 * Auth Health Manager - tracks authentication state for users
 */
export class AuthHealthManager {
  constructor(private env: Env) {}

  /**
   * Check comprehensive auth status for a user
   */
  async checkAuthHealth(userId: string, baseUrl?: string): Promise<AuthStatus> {
    // Check if Monarch token exists and its expiry
    const tokenKey = `monarch:token:${userId}`;
    const tokenMetaKey = `monarch:token:meta:${userId}`;

    let token: string | null = null;
    try {
      const tokenManager = new MonarchTokenManager(this.env.MONARCH_KV, this.env.COOKIE_ENCRYPTION_KEY);
      token = await tokenManager.getToken(userId);
    } catch (error) {
      console.error('Auth health token fetch failed:', error);
    }
    const tokenMeta = await this.env.MONARCH_KV.get(tokenMetaKey);

    let tokenExpiry: string | undefined;
    let hasValidToken = false;

    if (token && tokenMeta) {
      const meta = JSON.parse(tokenMeta);
      const expiresAtRaw = typeof meta.expiresAt === 'string' ? meta.expiresAt : undefined;

      if (expiresAtRaw) {
        const expiryDate = new Date(expiresAtRaw);
        if (!Number.isNaN(expiryDate.getTime())) {
          tokenExpiry = expiresAtRaw;
          hasValidToken = expiryDate > new Date();
        }
      }
    }

    // Determine what action is needed
    const needsAction = !token || !hasValidToken;
    let actionRequired: string | undefined;
    let setupUrl: string | undefined;
    const origin = baseUrl || this.env.PUBLIC_BASE_URL;

    if (needsAction) {
      if (!token) {
        actionRequired = 'initial_setup';
        if (origin) {
          setupUrl = new URL('/auth/refresh', origin).toString();
        }
      } else if (!hasValidToken) {
        actionRequired = 'token_expired';
        if (origin) {
          setupUrl = new URL('/auth/refresh', origin).toString();
        }
      }
    }

    return {
      authenticated: true, // GitHub auth (already validated)
      hasMonarchToken: !!token && hasValidToken,
      tokenExpiry,
      needsAction,
      actionRequired,
      setupUrl,
    };
  }

  /**
   * Store token with metadata
   */
  async storeTokenWithMetadata(userId: string, token: string, expiryDays: number = 90): Promise<void> {
    const tokenMetaKey = `monarch:token:meta:${userId}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Store token (encrypted)
    const tokenManager = new MonarchTokenManager(this.env.MONARCH_KV, this.env.COOKIE_ENCRYPTION_KEY);
    await tokenManager.storeToken(userId, token);

    // Store metadata
    await this.env.MONARCH_KV.put(tokenMetaKey, JSON.stringify({
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      userId
    }), {
      expirationTtl: expiryDays * 24 * 60 * 60
    });
  }

  /**
   * Get days until token expires
   */
  async getDaysUntilExpiry(userId: string): Promise<number | null> {
    const tokenMetaKey = `monarch:token:meta:${userId}`;
    const tokenMeta = await this.env.MONARCH_KV.get(tokenMetaKey);

    if (!tokenMeta) return null;

    const meta = JSON.parse(tokenMeta);
    const expiresAtRaw = typeof meta.expiresAt === 'string' ? meta.expiresAt : undefined;
    if (!expiresAtRaw) return null;

    const expiryDate = new Date(expiresAtRaw);
    if (Number.isNaN(expiryDate.getTime())) return null;
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}

/**
 * Magic Link Manager - for out-of-band authentication
 */
export class MagicLinkManager {
  constructor(private env: Env) {}

  /**
   * Generate a magic link for authentication
   */
  async generateMagicLink(userId: string, baseUrl?: string): Promise<string> {
    const code = this.generateRandomCode(8);
    const magicKey = `magic:${code}`;

    // Store magic link mapping (10 minute expiry)
    await this.env.OAUTH_KV.put(magicKey, JSON.stringify({
      userId,
      createdAt: new Date().toISOString()
    }), {
      expirationTtl: 600 // 10 minutes
    });

    const origin = baseUrl || this.env.PUBLIC_BASE_URL;
    if (!origin) {
      throw new Error('Cannot generate magic link without a base URL. Configure PUBLIC_BASE_URL.');
    }

    return new URL(`/auth/magic/${code}`, origin).toString();
  }

  /**
   * Validate and consume magic link
   */
  async validateMagicLink(code: string): Promise<string | null> {
    const magicKey = `magic:${code}`;
    const data = await this.env.OAUTH_KV.get(magicKey);

    if (!data) return null;

    const parsed = JSON.parse(data);

    // Delete after use (one-time use)
    await this.env.OAUTH_KV.delete(magicKey);

    return parsed.userId;
  }

  /**
   * Generate random code
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }

    return result;
  }
}

/**
 * Setup Wizard State Manager
 */
export class SetupWizardManager {
  constructor(private env: Env) {}

  /**
   * Get current setup state
   */
  async getSetupState(userId: string): Promise<SetupState | null> {
    const setupKey = `setup:state:${userId}`;
    const data = await this.env.OAUTH_KV.get(setupKey);

    if (!data) return null;

    return JSON.parse(data);
  }

  /**
   * Update setup state
   */
  async updateSetupState(userId: string, step: SetupState['step'], magicCode?: string): Promise<void> {
    const setupKey = `setup:state:${userId}`;

    const state: SetupState = {
      userId,
      step,
      lastUpdated: new Date().toISOString(),
      magicCode
    };

    await this.env.OAUTH_KV.put(setupKey, JSON.stringify(state), {
      expirationTtl: 60 * 60 * 24 // 24 hours
    });
  }

  /**
   * Clear setup state (setup complete)
   */
  async clearSetupState(userId: string): Promise<void> {
    const setupKey = `setup:state:${userId}`;
    await this.env.OAUTH_KV.delete(setupKey);
  }
}

/**
 * Generate user-friendly error messages for MCP tools
 */
export function generateAuthErrorMessage(status: AuthStatus): string {
  if (!status.needsAction) {
    return '';
  }

  let message = '🔐 **Authentication Required**\n\n';

  if (status.actionRequired === 'initial_setup') {
    message += '📋 **First-Time Setup Needed**\n\n';
    message += 'Your Monarch Money token has not been configured yet.\n\n';
    message += '**Steps to complete setup:**\n';
    message += '1. Open your web browser\n';
    message += `2. Visit: ${status.setupUrl}\n`;
    message += '3. Enter your Monarch Money email and password\n';
    message += '4. Enter your 2FA code if you have MFA enabled\n';
    message += '5. Return here and try your command again\n\n';
    message += '💡 **Tip:** Use the `setup_wizard` tool for a guided setup experience.\n\n';
    message += '✅ Your token will be stored securely for 90 days.';
  } else if (status.actionRequired === 'token_expired') {
    message += '⏰ **Token Expired**\n\n';
    message += 'Your Monarch Money authentication token has expired.\n\n';
    message += '**Steps to refresh:**\n';
    message += '1. Open your web browser\n';
    message += `2. Visit: ${status.setupUrl}\n`;
    message += '3. Re-enter your Monarch Money credentials\n';
    message += '4. Enter your 2FA code if prompted\n';
    message += '5. Return here and try your command again\n\n';
    message += `🕒 Last token expiry: ${status.tokenExpiry || 'unknown'}\n\n`;
    message += '💡 **Tip:** Tokens last 90 days. Set a calendar reminder!';
  }

  return message;
}

/**
 * Generate setup wizard instructions
 */
export function generateSetupWizardMessage(magicLink: string, daysUntilExpiry: number | null): string {
  if (daysUntilExpiry && daysUntilExpiry > 0) {
    return `✅ You are already authenticated. Your token is valid for ${daysUntilExpiry} more days.`;
  }

  const message = `
🧙 **Monarch Money MCP - Setup Wizard**

Welcome! Let's get your Monarch Money integration set up.

To connect your Monarch Money account, please follow these steps:

1. **Click the magic link below to open a secure authentication page in your browser.**

   🔗 **[Authenticate with Monarch Money](${magicLink})**

2. **Enter your Monarch Money credentials in the secure browser window.**

3. **After successful authentication, you can close the browser window and return to your chat.**

Your authentication token will be securely stored for 90 days.

This magic link will expire in 10 minutes.
`.trim();

  return message;
}

/**
 * Generate status report message
 */
export function generateStatusReport(status: AuthStatus, daysUntilExpiry: number | null): string {
  let message = '📊 **Monarch Money MCP - Status Report**\n\n';

  if (status.hasMonarchToken) {
    message += '✅ Your Monarch Money account is connected.\n';
    if (daysUntilExpiry !== null) {
      message += `Your token is valid for ${daysUntilExpiry} more days.\n`;
    }
  } else {
    message += '❌ Your Monarch Money account is not connected.\n';
    message += 'Please use the `setup_wizard` tool to connect your account.\n';
  }

  return message;
}
