# Add Remote MCP Server Support with Cloudflare Workers

## 🎯 Overview

This PR converts the Monarch Money MCP server to support **remote deployment** on Cloudflare Workers, enabling access from anywhere via Claude Desktop, Claude Web, and ChatGPT.

## ✨ Key Features

### 🌐 Remote MCP Server
- **Cloudflare Workers deployment** - Global edge network
- **TypeScript implementation** - Complete port from Python
- **OAuth 2.1 authentication** - Compliant with MCP specification (RFC 8414)
- **Server-Sent Events (SSE)** transport for MCP protocol

### 🔐 Enhanced Authentication
- **Dual OAuth support:**
  - GitHub OAuth for user authentication
  - MCP OAuth 2.1 for client access (ChatGPT, Claude)
- **Magic links** for simplified authentication flow
- **Token health monitoring** with expiry tracking
- **MFA support** via web-based authentication

### 🛠️ Complete Tool Set
All 11 original MCP tools ported to TypeScript:
- `setup_wizard` - Guided authentication with magic links
- `check_status` - Token health and expiry monitoring
- `get_accounts` - Financial accounts retrieval
- `get_transactions` - Transaction history with filters
- `get_budgets` - Budget information
- `get_cashflow` - Income/expense analysis
- `get_account_holdings` - Investment holdings
- `create_transaction` - Create new transactions
- `update_transaction` - Modify existing transactions
- `refresh_accounts` - Request account data refresh

### 🔒 Security
- **Encrypted token storage** in Cloudflare KV
- **PKCE (Proof Key for Code Exchange)** for OAuth flows
- **Bearer token authentication** for MCP endpoints
- **HTTPOnly secure cookies** for web sessions
- **No plaintext credentials** ever stored

## 📊 Changes Summary

**19 files changed, 7,543 insertions(+), 3 deletions(-)**

### New Files

#### Worker Implementation
- `worker/src/index.ts` - Main worker entry point with routing
- `worker/src/mcp-server.ts` - MCP server with all 11 tools
- `worker/src/monarch-client.ts` - Monarch Money API client (TypeScript)
- `worker/src/auth.ts` - GitHub OAuth and session management
- `worker/src/auth-flow.ts` - Enhanced authentication flow logic
- `worker/src/oauth-mcp.ts` - MCP OAuth 2.1 implementation
- `worker/package.json` - Worker dependencies
- `worker/tsconfig.json` - TypeScript configuration
- `worker/wrangler.jsonc` - Cloudflare Workers configuration
- `worker/.dev.vars.example` - Local development template
- `worker/test-local.sh` - Automated local testing script

#### Documentation
- `DEPLOYMENT.md` - Complete deployment guide
- `USER-FLOW-GUIDE.md` - Authentication UX and user flows
- `AUTHENTICATION-UX-SUMMARY.md` - Authentication solution overview
- `TESTING-CHATGPT.md` - ChatGPT integration testing guide
- `worker/README.md` - Worker-specific documentation

### Modified Files
- `.gitignore` - Added Cloudflare Workers security patterns
- `README.md` - Updated with deployment options

## 🚀 Deployment

### Prerequisites
- Cloudflare account (free tier works)
- GitHub OAuth apps (development + production)
- Node.js 18+
- Wrangler CLI

### Quick Start

```bash
cd worker

# Authenticate
npx wrangler login

# Create KV namespaces
npx wrangler kv namespace create "OAUTH_KV"
npx wrangler kv namespace create "MONARCH_KV"

# Update wrangler.jsonc with KV IDs
# Set secrets
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Deploy
npm run deploy
```

See `DEPLOYMENT.md` for complete instructions.

## 🧪 Testing

### ChatGPT Integration
1. ChatGPT Plus/Pro/Team/Enterprise required
2. Enable Developer Mode in Settings → Connectors
3. Add Custom Connector with server URL
4. OAuth flow completes automatically
5. All tools available in ChatGPT

See `TESTING-CHATGPT.md` for detailed testing instructions.

### Local Testing

```bash
cd worker
./test-local.sh
```

## 📱 User Experience

### First-Time Setup (with Magic Links)

```
User: "Show my accounts"

Bot: 🔐 Authentication Required
     Use the `setup_wizard` tool

User: "setup wizard"

Bot: 🧙 Your magic link:
     https://monarch-mcp.tm3.workers.dev/auth/magic/ABC123

User: [Clicks link, enters credentials + MFA in browser]

User: "Show my accounts" [retry]

Bot: ✅ [Returns account data]
```

### Token Expiry (90 days later)

```
User: "Check my status"

Bot: 📊 Status Report
     Token: ✅ Active
     🟡 Expires in: 15 days (consider refreshing soon)
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│     Cloudflare Workers (Global Edge)    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │   GitHub OAuth                 │    │
│  │   (User Authentication)        │    │
│  └────────────────────────────────┘    │
│             │                           │
│             ▼                           │
│  ┌────────────────────────────────┐    │
│  │   MCP OAuth 2.1                │    │
│  │   (Client Access)              │    │
│  └────────────────────────────────┘    │
│             │                           │
│             ▼                           │
│  ┌────────────────────────────────┐    │
│  │   Cloudflare KV                │    │
│  │   - OAuth sessions             │    │
│  │   - Access tokens              │    │
│  │   - Monarch Money tokens       │    │
│  └────────────────────────────────┘    │
│             │                           │
│             ▼                           │
│  ┌────────────────────────────────┐    │
│  │   MCP Server (12 tools)        │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │ Monarch Money│
      │     API      │
      └──────────────┘
```

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| **User Auth** | GitHub OAuth 2.0 |
| **Client Auth** | MCP OAuth 2.1 (RFC 8414) |
| **Token Storage** | Encrypted Cloudflare KV |
| **PKCE** | Required for all OAuth flows |
| **Bearer Tokens** | 7-day access tokens |
| **Refresh Tokens** | 90-day refresh tokens |
| **Magic Links** | 10-minute expiry, one-time use |
| **Sessions** | HTTPOnly, Secure, SameSite cookies |

## 📚 Documentation

Comprehensive documentation included:

- **DEPLOYMENT.md** - Step-by-step deployment guide
- **USER-FLOW-GUIDE.md** - Complete authentication flows and scenarios
- **AUTHENTICATION-UX-SUMMARY.md** - UX solution architecture
- **TESTING-CHATGPT.md** - ChatGPT integration and testing
- **worker/README.md** - Worker-specific information

## 🎯 Key Innovations

### 1. Magic Links for Out-of-Band Authentication
Solves the problem of MFA in conversational AI contexts - users can't enter 2FA codes in chat, so magic links redirect to a web form.

### 2. Dual OAuth Implementation
- **GitHub OAuth** for human users
- **MCP OAuth 2.1** for AI clients (ChatGPT, Claude)

### 3. Token Health Monitoring
- Proactive expiry warnings (🟢 🟡 🔴)
- `check_status` tool shows days until expiry
- Prevents surprise expirations

### 4. Universal Client Support
Works with:
- ✅ Claude Desktop
- ✅ Claude Web
- ✅ ChatGPT (Plus/Pro/Team/Enterprise)

## 🔄 Migration Path

### Existing Local Users
The local Python server still works! This PR adds remote deployment as an **additional option**:

- **Local**: `src/monarch_mcp_server/` (unchanged)
- **Remote**: `worker/` (new)

Users can choose either or both.

## ✅ Testing Checklist

- [x] Local development with `wrangler dev`
- [x] OAuth metadata endpoint (/.well-known/oauth-authorization-server)
- [x] OAuth authorization flow with PKCE
- [x] Token exchange endpoint
- [x] Bearer token validation
- [x] All 11 MCP tools functional
- [x] Magic link generation and validation
- [x] Token expiry tracking
- [x] GitHub OAuth integration
- [x] Session management
- [x] Error handling and user messages
- [x] Security patterns in .gitignore
- [x] Comprehensive documentation

## 📝 Commits

This PR includes 11 commits:

1. Add Cloudflare Workers security patterns to .gitignore
2. Add Cloudflare Workers MCP server implementation
3. Fix gitignore to allow config JSON files
4. Add comprehensive documentation for remote MCP deployment
5. Add enhanced authentication flow with magic links and improved UX
6. Update DEPLOYMENT.md with new authentication tools and user flow
7. Add comprehensive authentication UX solution summary
8. Add comprehensive ChatGPT testing guide and local test script
9. Update wrangler.jsonc with OAUTH_KV namespace ID
10. Update wrangler.jsonc with MONARCH_KV namespace ID
11. Implement MCP OAuth 2.1 specification (RFC 8414) for ChatGPT compatibility

## 🎉 Impact

After this PR:
- ✅ Users can access Monarch Money data from anywhere
- ✅ No local process needed
- ✅ Works with ChatGPT and Claude (web + desktop)
- ✅ Seamless MFA handling via magic links
- ✅ Proactive token management
- ✅ Enterprise-grade security
- ✅ Global edge deployment (fast worldwide)
- ✅ Free tier deployment available

## 🚧 Future Enhancements

Potential future improvements:
- [ ] Multi-user support with per-user Monarch accounts
- [ ] Custom domains
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Metrics and analytics
- [ ] QR codes for magic links (mobile)
- [ ] Email notifications for token expiry
- [ ] Webhook support for real-time updates

## 📞 Questions?

See documentation:
- Deployment: `DEPLOYMENT.md`
- Testing: `TESTING-CHATGPT.md`
- User Flows: `USER-FLOW-GUIDE.md`
- Auth Architecture: `AUTHENTICATION-UX-SUMMARY.md`

---

**Ready to merge and deploy! 🚀**
