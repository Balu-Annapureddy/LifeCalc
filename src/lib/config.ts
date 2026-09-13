import crypto from 'crypto';

export type DatabaseMode = 'supabase' | 'local';

interface AppConfig {
  sessionSecret: string;
  guestQuotaSecret: string;
  databaseMode: DatabaseMode;
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

function resolveDatabaseMode(): DatabaseMode {
  const mode = process.env.DATABASE_MODE?.trim().toLowerCase();
  if (mode === 'supabase') return 'supabase';
  if (mode === 'local') return 'local';

  // In production, default is supabase
  if (process.env.NODE_ENV === 'production') {
    return 'supabase';
  }

  return 'local';
}

const isProduction = process.env.NODE_ENV === 'production';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build';
const databaseMode = resolveDatabaseMode();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Production validation: If DATABASE_MODE is supabase in production runtime, verify credentials exist
if (isProduction && databaseMode === 'supabase' && !isBuildPhase) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      '[CRITICAL DATABASE ERROR] Production requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Fail-closed: Cannot start without authoritative database.'
    );
  }
}

export const config: AppConfig = {
  isProduction,
  databaseMode,
  sessionSecret: resolveSecret('SESSION_SECRET', 'Session Authentication HMAC Secret'),
  guestQuotaSecret: resolveSecret('GUEST_QUOTA_SECRET', 'Guest Quota HMAC Secret'),
  supabaseUrl,
  supabaseServiceRoleKey,
};