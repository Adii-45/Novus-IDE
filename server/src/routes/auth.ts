import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, publicUser, type IUser } from '../models/User.js';
import { Session } from '../models/Session.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  randomToken,
  sha256,
} from '../utils/tokens.js';
import { config } from '../config.js';
import { sendVerificationEmail, sendPasswordResetEmail, emailConfigured } from '../services/email.js';
import { claimInvitations } from '../services/invitations.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'novus_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
}

async function issueSession(res: Response, user: IUser, req: Request) {
  const session = await Session.create({
    user: user._id,
    refreshTokenHash: 'pending',
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
    expiresAt: new Date(Date.now() + config.jwt.refreshTtlDays * 86400_000),
  });
  const refreshToken = signRefreshToken(String(user._id), String(session._id));
  session.refreshTokenHash = sha256(refreshToken);
  await session.save();

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  const accessToken = signAccessToken({ sub: String(user._id), name: user.name, email: user.email });
  return { accessToken, user: publicUser(user) };
}

// ---------------------------------------------------------------- register
const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const verifyToken = randomToken();
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 11),
      verifyToken: sha256(verifyToken),
      verifyTokenExpires: new Date(Date.now() + 24 * 3600_000),
    });

    await sendVerificationEmail(email, name, verifyToken);
    await claimInvitations(user);

    const payload = await issueSession(res, user, req);
    res.status(201).json({
      ...payload,
      // Dev convenience when SMTP isn't configured — the link is also logged server-side.
      devVerifyLink: !emailConfigured && !config.isProd ? `/verify-email?token=${verifyToken}` : undefined,
    });
  })
);

// ------------------------------------------------------------------- login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    res.json(await issueSession(res, user, req));
  })
);

// ----------------------------------------------------------------- refresh
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw ApiError.unauthorized('No refresh token');

    let decoded: { sub: string; sid: string };
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const session = await Session.findById(decoded.sid);
    if (!session || session.refreshTokenHash !== sha256(token) || session.expiresAt < new Date()) {
      throw ApiError.unauthorized('Session expired');
    }
    const user = await User.findById(decoded.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists');

    // Rotate the refresh token in place.
    const newRefresh = signRefreshToken(String(user._id), String(session._id));
    session.refreshTokenHash = sha256(newRefresh);
    session.lastActiveAt = new Date();
    session.expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 86400_000);
    await session.save();

    res.cookie(REFRESH_COOKIE, newRefresh, refreshCookieOptions());
    res.json({
      accessToken: signAccessToken({ sub: String(user._id), name: user.name, email: user.email }),
      user: publicUser(user),
    });
  })
);

// ------------------------------------------------------------------ logout
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        await Session.findByIdAndDelete(decoded.sid);
      } catch {
        // already invalid — nothing to revoke
      }
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.json({ ok: true });
  })
);

// ------------------------------------------------------------ verify email
authRouter.post(
  '/verify-email',
  validate(z.object({ token: z.string().min(10) })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      verifyToken: sha256(req.body.token),
      verifyTokenExpires: { $gt: new Date() },
    });
    if (!user) throw ApiError.badRequest('This verification link is invalid or has expired');
    user.emailVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();
    res.json({ ok: true });
  })
);

authRouter.post(
  '/resend-verification',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user) throw ApiError.notFound();
    if (user.emailVerified) throw ApiError.badRequest('Email is already verified');
    const token = randomToken();
    user.verifyToken = sha256(token);
    user.verifyTokenExpires = new Date(Date.now() + 24 * 3600_000);
    await user.save();
    await sendVerificationEmail(user.email, user.name, token);
    res.json({
      ok: true,
      devVerifyLink: !emailConfigured && !config.isProd ? `/verify-email?token=${token}` : undefined,
    });
  })
);

// -------------------------------------------------------- forgot / reset pw
authRouter.post(
  '/forgot-password',
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    let devResetLink: string | undefined;
    if (user) {
      const token = randomToken();
      user.resetToken = sha256(token);
      user.resetTokenExpires = new Date(Date.now() + 3600_000);
      await user.save();
      await sendPasswordResetEmail(user.email, user.name, token);
      if (!emailConfigured && !config.isProd) devResetLink = `/reset-password?token=${token}`;
    }
    // Same response either way — don't leak which emails exist.
    res.json({ ok: true, devResetLink });
  })
);

authRouter.post(
  '/reset-password',
  validate(z.object({ token: z.string().min(10), password: z.string().min(8).max(128) })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      resetToken: sha256(req.body.token),
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
    user.passwordHash = await bcrypt.hash(req.body.password, 11);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    await Session.deleteMany({ user: user._id }); // revoke everywhere
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------- sessions
authRouter.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await Session.find({ user: req.auth!.sub }).sort({ lastActiveAt: -1 });
    const currentToken = req.cookies?.[REFRESH_COOKIE];
    let currentSid: string | null = null;
    if (currentToken) {
      try {
        currentSid = verifyRefreshToken(currentToken).sid;
      } catch {
        // ignore
      }
    }
    res.json(
      sessions.map((s) => ({
        id: String(s._id),
        userAgent: s.userAgent,
        ip: s.ip,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        current: String(s._id) === currentSid,
      }))
    );
  })
);

authRouter.delete(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Session.deleteOne({ _id: req.params.id, user: req.auth!.sub });
    res.json({ ok: true });
  })
);

// ------------------------------------------------------------------- OAuth
// Manual authorization-code flow. Enabled only when env credentials exist.
const oauthProviders = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    configured: () => Boolean(config.oauth.github.clientId && config.oauth.github.clientSecret),
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    configured: () => Boolean(config.oauth.google.clientId && config.oauth.google.clientSecret),
  },
} as const;

authRouter.get('/oauth/providers', (_req, res) => {
  res.json({
    github: oauthProviders.github.configured(),
    google: oauthProviders.google.configured(),
  });
});

authRouter.get(
  '/oauth/:provider',
  asyncHandler(async (req, res) => {
    const name = req.params.provider as keyof typeof oauthProviders;
    const provider = oauthProviders[name];
    if (!provider) throw ApiError.notFound('Unknown provider');
    if (!provider.configured()) {
      throw ApiError.unavailable(`${name} OAuth is not configured on this server`);
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/oauth/${name}/callback`;
    const clientId = name === 'github' ? config.oauth.github.clientId : config.oauth.google.clientId;
    const state = randomToken(16);
    res.cookie(`oauth_state_${name}`, state, { httpOnly: true, maxAge: 600_000, sameSite: 'lax' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: provider.scope,
      state,
      ...(name === 'google' ? { response_type: 'code', access_type: 'offline' } : {}),
    });
    res.redirect(`${provider.authUrl}?${params}`);
  })
);

authRouter.get(
  '/oauth/:provider/callback',
  asyncHandler(async (req, res) => {
    const name = req.params.provider as keyof typeof oauthProviders;
    const provider = oauthProviders[name];
    if (!provider?.configured()) throw ApiError.notFound();

    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state || state !== req.cookies?.[`oauth_state_${name}`]) {
      return res.redirect(`${config.clientUrl}/signin?error=oauth_state`);
    }
    res.clearCookie(`oauth_state_${name}`);

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/oauth/${name}/callback`;
    const creds = name === 'github' ? config.oauth.github : config.oauth.google;

    try {
      const tokenRes = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code,
          redirect_uri: redirectUri,
          ...(name === 'google' ? { grant_type: 'authorization_code' } : {}),
        }),
      });
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      if (!tokenJson.access_token) throw new Error('No access token from provider');

      let profile: { id: string; email: string; name: string; username?: string };
      if (name === 'github') {
        const ghUser = (await (
          await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` },
          })
        ).json()) as { id: number; login: string; name?: string; email?: string };
        let email = ghUser.email;
        if (!email) {
          const emails = (await (
            await fetch('https://api.github.com/user/emails', {
              headers: { Authorization: `Bearer ${tokenJson.access_token}` },
            })
          ).json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
          email = emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email;
        }
        if (!email) throw new Error('GitHub account has no accessible email');
        profile = { id: String(ghUser.id), email, name: ghUser.name || ghUser.login, username: ghUser.login };
      } else {
        const gUser = (await (
          await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` },
          })
        ).json()) as { id: string; email: string; name: string };
        profile = { id: gUser.id, email: gUser.email, name: gUser.name };
      }

      let user = await User.findOne({
        $or: [{ [`oauth.${name}.id`]: profile.id }, { email: profile.email }],
      });
      if (!user) {
        user = await User.create({
          name: profile.name,
          email: profile.email,
          emailVerified: true,
          oauth: { [name]: name === 'github' ? { id: profile.id, username: profile.username } : { id: profile.id, email: profile.email } },
        });
        await claimInvitations(user);
      } else {
        user.set(`oauth.${name}`, name === 'github' ? { id: profile.id, username: profile.username } : { id: profile.id, email: profile.email });
        user.emailVerified = true;
        await user.save();
      }

      await issueSession(res, user, req);
      res.redirect(`${config.clientUrl}/dashboard?oauth=1`);
    } catch (err) {
      logger.error('OAuth callback failed', err);
      res.redirect(`${config.clientUrl}/signin?error=oauth_failed`);
    }
  })
);
