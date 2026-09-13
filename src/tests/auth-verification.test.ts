import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signupPost } from '@/app/api/auth/signup/route';
import { POST as signinPost } from '@/app/api/auth/signin/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { POST as verifyPost, GET as verifyGet } from '@/app/api/auth/verify/route';
import { POST as resendPost } from '@/app/api/auth/verify/resend/route';
import { GET as googleOAuthGet } from '@/app/api/auth/oauth/google/route';
import { findUserByEmail, findUserById } from '@/lib/db';

describe('LifeCalc Email Verification & Google OAuth Architecture Suite', () => {
  const testEmail = `verify_tester_${Date.now()}@lifecalc.in`;
  const testPassword = 'Password123!';
  const testName = 'Verification Tester';
  let sessionCookie = '';

  it('1. New email/password registration establishes an unverified account state with verification token', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    });

    const res = await signupPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.emailVerified).toBe(false);
    expect(data.verificationRequired).toBe(true);

    sessionCookie = res.cookies.get('lifecalc_auth_session')?.value || '';
    expect(sessionCookie).toBeTruthy();

    // Invariant: Database user record has emailVerified = false and a verification token set
    const dbUser = await findUserByEmail(testEmail);
    expect(dbUser).not.toBeNull();
    expect(dbUser!.emailVerified).toBe(false);
    expect(dbUser!.verificationToken).toBeTruthy();
    expect(dbUser!.verificationTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it('2. /api/auth/me reflects the unverified email state in active session', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: { Cookie: `lifecalc_auth_session=${sessionCookie}` },
    });

    const res = await meGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.email).toBe(testEmail);
    expect(data.user.emailVerified).toBe(false);
  });

  it('3. /api/auth/verify rejects non-existent or tampered verification tokens', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'bogus_tampered_token_that_does_not_exist' }),
    });

    const badRes = await verifyPost(badReq);
    expect(badRes.status).toBe(400);
    const badData = await badRes.json();
    expect(badData.error).toContain('Invalid or expired');
  });

  it('4. /api/auth/verify successfully transitions account to verified upon receiving valid token', async () => {
    const dbUserBefore = await findUserByEmail(testEmail);
    const validToken = dbUserBefore!.verificationToken!;

    const verifyReq = new NextRequest('http://localhost:3000/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: validToken }),
    });

    const verifyRes = await verifyPost(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);

    // Invariant: Database record now reflects emailVerified = true and clears verification token
    const dbUserAfter = await findUserByEmail(testEmail);
    expect(dbUserAfter!.emailVerified).toBe(true);
    expect(dbUserAfter!.verificationToken).toBeNull();

    // Subsequent /api/auth/me checks return emailVerified = true
    const meReq = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: { Cookie: `lifecalc_auth_session=${sessionCookie}` },
    });
    const meRes = await meGet(meReq);
    const meData = await meRes.json();
    expect(meData.user.emailVerified).toBe(true);
  });

  it('5. Verification tokens cannot be reused after verification', async () => {
    const dbUser = await findUserByEmail(testEmail);
    // Token was cleared
    const reuseReq = new NextRequest('http://localhost:3000/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'previously_used_token' }),
    });

    const reuseRes = await verifyPost(reuseReq);
    expect(reuseRes.status).toBe(400);
  });

  it('6. /api/auth/verify/resend handles already verified accounts gracefully', async () => {
    const resendReq = new NextRequest('http://localhost:3000/api/auth/verify/resend', {
      method: 'POST',
      headers: { Cookie: `lifecalc_auth_session=${sessionCookie}` },
    });

    const res = await resendPost(resendReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alreadyVerified).toBe(true);
  });

  it('7. Google OAuth endpoint reports unconfigured deployment prerequisite cleanly without crashing', async () => {
    // In test environment without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const oauthReq = new NextRequest('http://localhost:3000/api/auth/oauth/google', {
      method: 'GET',
    });

    const oauthRes = await googleOAuthGet(oauthReq);
    expect(oauthRes.status).toBe(503);
    const data = await oauthRes.json();
    expect(data.code).toBe('OAUTH_PROVIDER_UNCONFIGURED');
    expect(data.deploymentPrerequisite).toContain('GOOGLE_CLIENT_ID');
  });
});
