# Testing Guide

## Quick Test

Run manual crypto tests:

```bash
npm run test:manual
```

## Tests Included

- ✅ Crypto encryption/decryption
- ✅ Wrong secret rejection
- ✅ Unicode support

## Type Checking

```bash
npm run typecheck
```

## Before Deployment

```bash
# 1. Type check
npm run typecheck

# 2. Run tests
npm run test:manual

# 3. Deploy
npm run deploy
```
