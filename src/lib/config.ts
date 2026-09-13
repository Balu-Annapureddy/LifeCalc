import crypto from 'crypto';

interface AppConfig {
  sessionSecret: string;
  guestQuotaSecret: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  isProduction: boolean;
}

function resolveSecret(envVarName: string, description: string): string {
  const value = process.env[envVarName]?.trim();

  // If provided, ensure it meets the cryptographic length standard
  if (value) {
    if (value.length < 32 && process.env.NODE_ENV === 'production') {
      throw new Error(
        `[CRITICAL CONFIG ERROR] Production secret ${envVarName} must be at least 32 characters long for cryptographic security.`
      );
    }
    return value;
  }

  // Next.js sets NODE_ENV='production' during `next build`.
  // During build phase (NEXT_PHASE=phase-production-build), allow ephemeral key so static bundling passes.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build';

  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    throw new Error(
      `[CRITICAL CONFIG ERROR] Required production secret ${envVarName} (${description}) is missing. Application refusing to start.`
    );
  }

  // Safe fallback for dev/test or build-time bundle collection
  return `dev_only_${envVarName.toLowerCase()}_${crypto.createHash('sha256').update(envVarName).digest('hex')}`;
}

export const config: AppConfig = {
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: resolveSecret('SESSION_SECRET', 'Session Authentication HMAC Secret'),
  guestQuotaSecret: resolveSecret('GUEST_QUOTA_SECRET', 'Guest Quota HMAC Secret'),
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
};