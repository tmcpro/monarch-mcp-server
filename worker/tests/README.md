# Testing Guide for Monarch MCP Server

This document describes the testing infrastructure and how to run tests.

## Test Structure

```
tests/
├── e2e.test.ts       # End-to-end integration tests
├── manual-test.ts    # Manual test script
├── setup.ts          # Test configuration
└── README.md         # This file
```

## Running Tests

### Manual Tests (Recommended for Quick Validation)

Run the manual test script to verify basic functionality:

```bash
npm run test:manual
```

This will test:
- ✅ Crypto encryption/decryption
- ✅ Wrong secret rejection
- ✅ Unicode and special character handling

**Output:**
```
🧪 Starting manual tests...
Test 1: Crypto encryption/decryption
  ✅ Crypto test PASSED
Test 2: Decryption with wrong secret should fail
  ✅ Correctly rejected wrong secret
Test 3: Special characters and Unicode
  ✅ Unicode test PASSED
✅ All manual tests completed!
```

### Type Checking

Verify TypeScript types are correct:

```bash
npm run typecheck
```

This ensures:
- No TypeScript compilation errors
- All imports are valid
- Type safety is maintained

## Test Coverage

### Current Tests

1. **Crypto Functions** ✅
   - String encryption/decryption
   - Wrong secret rejection
   - Unicode support
   - Special characters

2. **Type Safety** ✅
   - TypeScript compilation
   - Import validation
   - Type checking

### Future Tests (E2E)

The `e2e.test.ts` file contains placeholders for comprehensive end-to-end tests:

- OAuth flow testing
- MCP tool execution
- Token management
- Error handling
- API integration

To implement these tests, you'll need:
- Jest or Vitest test framework
- Cloudflare Workers testing utilities
- Mock KV namespaces

## Pre-Deployment Checklist

Before deploying, run these commands:

```bash
# 1. Type check
npm run typecheck

# 2. Run manual tests
npm run test:manual

# 3. Build (via deploy dry-run)
npx wrangler deploy --dry-run
```

All should pass without errors.

## Testing Locally

### Using Wrangler Dev

Test the worker locally with hot reload:

```bash
npm run dev
```

Then visit: http://localhost:8787

### Testing Authentication Flow

1. Start local dev server: `npm run dev`
2. Visit: http://localhost:8787
3. Click "Login with GitHub"
4. Complete OAuth flow
5. Test MCP tools via dashboard

### Testing MCP Endpoints

Use the `test-local.sh` script to test specific endpoints:

```bash
./test-local.sh
```

## Common Test Scenarios

### 1. Test Encryption

```typescript
import { encryptString, decryptString } from '../src/crypto.js';

const secret = 'my-secret-key';
const data = 'sensitive-token';

const encrypted = await encryptString(secret, data);
const decrypted = await decryptString(secret, encrypted);

console.assert(decrypted === data);
```

### 2. Test Token Health Check

```typescript
import { TokenRefreshManager } from '../src/token-refresh.js';

const manager = new TokenRefreshManager(env, userId);
const status = await manager.needsRefresh();

console.log('Needs refresh:', status.needsRefresh);
console.log('Days until expiry:', status.daysUntilExpiry);
```

### 3. Test Error Handling

```typescript
import { MonarchMoney } from '../src/monarch-client.js';

try {
  const client = new MonarchMoney('invalid-token');
  await client.getAccounts();
} catch (error) {
  console.log('Correctly caught error:', error.message);
}
```

## CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
- name: Run tests
  run: |
    npm run typecheck
    npm run test:manual
```

## Debugging Tests

### Enable Verbose Logging

Set environment variable:

```bash
DEBUG=* npm run test:manual
```

### Check Worker Logs

View real-time logs when testing deployed worker:

```bash
npx wrangler tail
```

## Performance Testing

### Load Testing

Use tools like:
- `wrk` - HTTP benchmarking
- `artillery` - Load testing
- `k6` - Performance testing

Example with curl:

```bash
# Test health endpoint
time curl https://monarch-mcp.tm3.workers.dev/health

# Test OAuth metadata
time curl https://monarch-mcp.tm3.workers.dev/.well-known/oauth-authorization-server
```

## Security Testing

### Test Token Encryption

Verify tokens are encrypted at rest:

```bash
npm run test:manual
```

Should show encrypted values are not plain text.

### Test Authentication

Verify unauthorized requests are rejected:

```bash
curl -X POST https://monarch-mcp.tm3.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return 401 or redirect to login.

## Troubleshooting

### Tests Fail Locally

1. Check Node.js version (requires 18+)
2. Ensure dependencies are installed: `npm install`
3. Check TypeScript compilation: `npm run typecheck`

### Crypto Tests Fail

Ensure you're running in an environment with Web Crypto API:
- Node.js 18+ has built-in Web Crypto
- Cloudflare Workers have Web Crypto

### Can't Test OAuth Flow Locally

Use ngrok or similar to get a public URL for OAuth callbacks:

```bash
ngrok http 8787
```

Then update GitHub OAuth app callback URL.

## Best Practices

1. ✅ **Always run tests before deploying**
2. ✅ **Test both success and error paths**
3. ✅ **Verify error messages are helpful**
4. ✅ **Test with real data when possible**
5. ✅ **Monitor production logs after deployment**

## Contributing

When adding new features:

1. Add type checks
2. Add manual tests if applicable
3. Update this README
4. Test locally before pushing

## Resources

- [Wrangler Testing Docs](https://developers.cloudflare.com/workers/testing/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
