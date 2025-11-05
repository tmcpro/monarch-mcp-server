# 🔄 User Flow Guide: Authentication & MFA Handling

This guide explains how users interact with the Monarch Money MCP server from Claude Desktop, Claude Web, or ChatGPT, especially when authentication is needed or tokens expire.

---

## 🎯 **The Problem We Solved**

MCP tools run in a request-response cycle. When a tool needs authentication or MFA, it can't:
- ❌ Open a browser automatically
- ❌ Redirect the user to a webpage
- ❌ Create interactive prompts for 2FA codes
- ❌ Show clickable links (in most clients)

**Solution:** Out-of-band authentication with clear, actionable messages and magic links.

---

## 🚀 **User Flow Scenarios**

### **Scenario 1: First-Time Setup**

**User Action:**
```
User: "Show me my Monarch Money accounts"
```

**What Happens:**

1. **Tool Called:** `get_accounts`

2. **Server Response:**
```
🔐 **Authentication Required**

📋 **First-Time Setup Needed**

Your Monarch Money token has not been configured yet.

**Steps to complete setup:**
1. Open your web browser
2. Visit: https://monarch-mcp.tm3.workers.dev/auth/refresh
3. Enter your Monarch Money email and password
4. Enter your 2FA code if you have MFA enabled
5. Return here and try your command again

💡 **Tip:** Use the `setup_wizard` tool for a guided setup experience.

✅ Your token will be stored securely for 90 days.
```

3. **User Action:** Runs `setup_wizard` tool

4. **Setup Wizard Response:**
```
🧙 **Monarch Money MCP - Setup Wizard**

Welcome! Let's get your Monarch Money integration set up.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **Setup Checklist:**

✅ **Step 1: Authenticate with GitHub**
   Status: COMPLETE ✓

🔄 **Step 2: Connect Monarch Money**
   Status: NEEDED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 **Your Personal Setup Link:**

https://monarch-mcp.tm3.workers.dev/auth/magic/AB3CD5FG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 **Instructions:**

1. Click or copy the link above
2. It will open in your browser (already logged in via GitHub)
3. Enter your Monarch Money credentials:
   • Email address
   • Password
   • 2FA code (if you have MFA enabled)
4. Click "Authenticate"
5. Return to this conversation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 **Security Notes:**

• Your credentials are NEVER stored
• Only your authentication token is saved (encrypted)
• Token is stored in Cloudflare KV (enterprise-grade encryption)
• Token lasts 90 days before needing refresh
• Magic link expires in 10 minutes

Ready? Click the link above to get started! 🚀
```

5. **User Action:** Clicks magic link, opens in browser

6. **Browser Experience:**
   - Magic link validates and auto-logs user in
   - Shows token refresh form
   - User enters Monarch Money email/password
   - User enters 2FA code if MFA is enabled
   - Form submits, token is saved
   - Success message shown

7. **Back in Claude:** User tries command again
```
User: "Show me my Monarch Money accounts"
```

8. **Success!** Tool returns account data

---

### **Scenario 2: Token Expired (90 days later)**

**User Action:**
```
User: "What's my current spending this month?"
```

**What Happens:**

1. **Tool Called:** `get_transactions`

2. **Server Response:**
```
🔐 **Authentication Required**

⏰ **Token Expired**

Your Monarch Money authentication token has expired.

**Steps to refresh:**
1. Open your web browser
2. Visit: https://monarch-mcp.tm3.workers.dev/auth/refresh
3. Re-enter your Monarch Money credentials
4. Enter your 2FA code if prompted
5. Return here and try your command again

🕒 Last token expiry: 2025-02-03T10:30:00Z

💡 **Tip:** Tokens last 90 days. Set a calendar reminder!
```

3. **User Action:** Either:
   - **Option A:** Manually visits the URL
   - **Option B:** Runs `setup_wizard` to get magic link

4. **After refresh:** User returns and retries command successfully

---

### **Scenario 3: Proactive Status Check**

**User Action:**
```
User: "Check my Monarch MCP status"
```

**What Happens:**

1. **Tool Called:** `check_status`

2. **Server Response:**
```
📊 **Monarch Money MCP - Status Report**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**GitHub Authentication:**
✅ Connected

**Monarch Money Token:**
✅ Active
🟡 Expires in: 15 days (consider refreshing soon)
📅 Expiry Date: 2025-02-15T10:30:00Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **All Systems Ready**

Your MCP server is fully configured and ready to use!

🚀 Try these commands:
• `get_accounts` - View your accounts
• `get_transactions` - See recent transactions
• `get_budgets` - Check budget status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🛠️ **Available Tools for Authentication**

### **1. setup_wizard**
- **Purpose:** Guided first-time setup or token refresh
- **Output:** Generates magic link for easy authentication
- **Best For:** Initial setup, token expiry, helping users who are stuck

### **2. check_status**
- **Purpose:** Check authentication health and token expiry
- **Output:** Comprehensive status report with days until expiry
- **Best For:** Proactive monitoring, troubleshooting

### **3. setup_authentication** (legacy)
- **Purpose:** Show manual setup instructions
- **Output:** Step-by-step manual process
- **Best For:** Users who prefer manual setup or magic links aren't working

### **4. check_auth_status** (legacy)
- **Purpose:** Simple token presence check
- **Output:** Basic yes/no token status
- **Best For:** Quick checks

---

## 🔗 **Magic Links Explained**

### **What are Magic Links?**

Magic links are one-time-use URLs that:
- ✅ Auto-authenticate the user (no GitHub OAuth needed)
- ✅ Expire after 10 minutes
- ✅ Can only be used once
- ✅ Direct user straight to token refresh form

### **Magic Link Format:**
```
https://monarch-mcp.tm3.workers.dev/auth/magic/AB3CD5FG
                                          ↑
                                    8-character code
```

### **How They Work:**

1. **Generation:** `setup_wizard` tool creates a unique code
2. **Storage:** Code stored in KV with user ID (10 min TTL)
3. **Click:** User clicks/copies link
4. **Validation:** Server validates code, creates temporary session
5. **Redirect:** User redirected to `/auth/refresh` form
6. **One-Time:** Code deleted after use

---

## 📱 **Client-Specific Behavior**

### **Claude Desktop**

- **Links:** Not clickable, user must copy-paste
- **UX:** Clear instructions with formatted URLs
- **Best Practice:** Always provide magic link via `setup_wizard`

### **Claude Web**

- **Links:** May be clickable (browser-dependent)
- **UX:** Same formatted instructions
- **Best Practice:** Magic links work well

### **ChatGPT (with MCP)**

- **Links:** Depends on ChatGPT's MCP implementation
- **UX:** Formatted text with copy-able URLs
- **Best Practice:** Test magic links, fallback to manual URLs

---

## 🔐 **Security Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                       USER FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. User tries tool (e.g., get_accounts)
           │
           ▼
2. Worker checks token in KV
           │
     ┌─────┴─────┐
     │  Token?   │
     └─────┬─────┘
           │
    ┌──────┴──────┐
    NO             YES
    │              │
    ▼              ▼
3. Return       Check expiry
   auth error      │
   message    ┌────┴────┐
              │ Valid?  │
              └────┬────┘
                   │
            ┌──────┴──────┐
            NO             YES
            │              │
            ▼              ▼
       Return          Execute
       expiry           tool
       error            │
       message          ▼
                    Return data


4. User runs setup_wizard
           │
           ▼
5. Magic link generated
           │
           ▼
6. User clicks link
           │
           ▼
7. Server validates code
           │
           ▼
8. Temporary session created
           │
           ▼
9. User sees token form
           │
           ▼
10. User enters Monarch credentials + MFA
           │
           ▼
11. Worker calls Monarch API
           │
           ▼
12. Token received and stored (with metadata)
           │
           ▼
13. Success message shown
           │
           ▼
14. User returns to Claude
           │
           ▼
15. User retries tool → SUCCESS! ✅
```

---

## ⚡ **Error Handling**

### **Error Types and Messages:**

| Error Type | User Message | Action Required |
|------------|--------------|-----------------|
| **No Token** | "First-Time Setup Needed" | Run `setup_wizard` |
| **Token Expired** | "Token Expired" | Run `setup_wizard` or visit refresh URL |
| **Invalid Credentials** | "Authentication failed: Invalid email or password" | Check credentials, try again |
| **MFA Required** | "MFA code required" | Enter 2FA code in form |
| **MFA Invalid** | "Invalid 2FA code" | Check code timing, retry |
| **Magic Link Expired** | "Magic link expired" | Run `setup_wizard` again |
| **Network Error** | "Failed to connect to Monarch API" | Check internet, retry |

---

## 📊 **Token Lifecycle**

```
Day 0:    User authenticates → Token stored
Day 1-60: Token valid, all tools work normally
Day 61-80: Token valid, status shows "🟢 Healthy"
Day 81-89: Token valid, status shows "🟡 Refresh soon"
Day 90:   Token expires → Tools return auth error
Day 90+:  User must re-authenticate via setup_wizard
```

---

## 💡 **Best Practices for Users**

### **For Daily Use:**

✅ **DO:**
- Check status periodically with `check_status`
- Refresh token when you see 🟡 warning (under 30 days)
- Bookmark the magic link from first setup
- Set a calendar reminder for day 80

❌ **DON'T:**
- Wait until token expires
- Ignore expiry warnings
- Share magic links (they're one-time use anyway)

### **For Troubleshooting:**

1. **Try `check_status` first** - shows exact issue
2. **Use `setup_wizard`** - easiest path to re-auth
3. **Keep 2FA app handy** - you'll need it for refresh
4. **Check browser cookies** - must be enabled for magic links

---

## 🔄 **Token Refresh Frequency**

| Use Case | Recommended Refresh |
|----------|---------------------|
| **Active daily use** | Every 60 days |
| **Weekly use** | Every 80 days |
| **Monthly use** | Check status before each use |
| **Infrequent use** | Expect to re-auth each time |

---

## 📞 **Support & Troubleshooting**

### **Issue: "Magic link expired"**
**Solution:** Run `setup_wizard` again to generate a new link.

### **Issue: "2FA code invalid"**
**Solution:** Wait for next 2FA code cycle (codes refresh every 30 seconds).

### **Issue: "Can't click the link in Claude Desktop"**
**Solution:** Copy and paste the URL into your browser.

### **Issue: "Token refresh not working"**
**Solution:**
1. Check browser cookies are enabled
2. Try incognito/private browsing
3. Clear browser cache
4. Try manual refresh at `/auth/refresh`

### **Issue: "Setup wizard keeps asking me to authenticate"**
**Solution:** Token storage may have failed. Check:
1. Cloudflare Workers logs: `npx wrangler tail`
2. KV namespace configuration
3. Secrets are set correctly

---

## 🎉 **Summary**

✅ **No authentication:** Use `setup_wizard` for magic link
✅ **Token expired:** Use `setup_wizard` for easy refresh
✅ **Check health:** Use `check_status` for detailed report
✅ **MFA required:** Form handles 2FA automatically
✅ **Out-of-band:** All auth happens in browser
✅ **Secure:** Tokens encrypted in Cloudflare KV
✅ **Long-lived:** 90-day token lifetime

The enhanced authentication flow ensures users are never stuck, always know what action to take, and can easily complete MFA challenges outside the MCP conversation context!
