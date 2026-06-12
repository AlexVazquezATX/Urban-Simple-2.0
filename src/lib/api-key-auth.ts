// Public API-key auth surface (backward-compatible).
//
// The actual logic now lives in two dependency-ordered modules to avoid a
// circular import:
//   - '@/lib/api-key-verify'  → leaf: key generation/hashing + verification
//   - '@/lib/auth'            → getCurrentUser() / getAuthenticatedUser()
// This file simply re-exports them so existing imports
// (`from '@/lib/api-key-auth'`) keep working unchanged.

export {
  generateRawApiKey,
  hashApiKey,
  getKeyPrefix,
  authenticateApiKey,
} from '@/lib/api-key-verify'

export { getAuthenticatedUser } from '@/lib/auth'

export { keyAllowsScope } from '@/lib/agent-scopes'
