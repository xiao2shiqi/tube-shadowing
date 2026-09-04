export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  API_KEY_ENC_SECRET: string;
  ALLOWED_ORIGIN?: string;
}

// Minimal Cloudflare Workers runtime typings (worker file is compiled with the DOM lib)
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
declare const caches: CacheStorage & { default: Cache };

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: object;
}

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface TranscriptItem {
  id: number;
  start: number;
  end: number;
  en: string;
  zh: string;
  words?: WordTiming[];
}

interface JwtPayload {
  uid: number;
  sub: string;
  email: string;
  name: string;
  picture: string;
  exp: number;
}

interface GoogleUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface GithubUser {
  id: string;
  login: string;
  email: string;
  name?: string;
  picture?: string;
}

type AiProvider = 'deepseek' | 'zhipu' | 'kimi';

const AI_PROVIDERS: AiProvider[] = ['deepseek', 'zhipu', 'kimi'];

interface UserApiKeyRow {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string | null;
  model: string | null;
}

interface GoogleJwk extends JsonWebKey {
  kid: string;
}

interface BookshelfItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  sentenceCount: number;
  hasTranslation: boolean;
  lastPlayedTime: number;
  lastSentenceIndex: number;
  progressPercent: number;
  addedAt: number;
  lastStudiedAt: number;
}

type FeedCategory = 'learning' | 'tech';

interface CuratedFeedSource {
  id: string;
  name: string;
  type: 'channel' | 'playlist';
  category: FeedCategory;
  defaultLevel?: 'A2' | 'B1' | 'B2' | 'C1';
}

interface FeedVideoItem {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  relativeTime: string;
  category: FeedCategory;
  levelTag?: 'A2' | 'B1' | 'B2' | 'C1';
  duration?: string;
  sourceType?: 'interview' | 'clips';
}

const CURATED_SOURCES: CuratedFeedSource[] = [
  // 🎯 英语学习：BBC 6 Minute English 官方系列课
  {
    id: 'PLcetZ6gSk96-FECmH9l7Vlx5VDigvgZpt',
    name: 'BBC 6 Minute English',
    type: 'playlist',
    category: 'learning',
    defaultLevel: 'A2',
  },

  // 🚀 科技前沿：Lex Fridman 播客
  {
    id: 'UCSHZKyawb77ixDdsGog4iWA',
    name: 'Lex Fridman',
    type: 'channel',
    category: 'tech',
    defaultLevel: 'B2',
  },
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      const response = await route(request, url, env, ctx);
      // Merge CORS headers without overwriting existing ones
      const headers = new Headers(response.headers);
      const cors = corsHeaders(origin);
      for (const [key, value] of Object.entries(cors)) {
        if (!headers.has(key)) headers.set(key, value);
      }
      return new Response(response.body, { status: response.status, headers });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return jsonResponse({ error: message }, 500, origin);
    }
  },
};

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(body: unknown, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function route(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';

  if (url.pathname === '/api/config' && request.method === 'GET') {
    return jsonResponse(
      { googleClientId: env.GOOGLE_CLIENT_ID, githubClientId: env.GITHUB_CLIENT_ID || '' },
      200,
      origin
    );
  }

  if (url.pathname === '/api/auth/google' && request.method === 'POST') {
    return handleAuthGoogle(request, env, origin);
  }

  if (url.pathname === '/api/auth/github' && request.method === 'POST') {
    return handleAuthGithub(request, env, origin);
  }

  if (url.pathname === '/api/user/api-keys' && request.method === 'GET') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    return handleGetApiKeys(user.uid, env, origin);
  }

  if (url.pathname.startsWith('/api/user/api-keys/') && request.method === 'PUT') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    const provider = url.pathname.slice('/api/user/api-keys/'.length);
    return handlePutApiKey(request, user.uid, provider, env, origin);
  }

  if (url.pathname.startsWith('/api/user/api-keys/') && request.method === 'DELETE') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    const provider = url.pathname.slice('/api/user/api-keys/'.length);
    return handleDeleteApiKey(user.uid, provider, env, origin);
  }

  if (url.pathname === '/api/me' && request.method === 'GET') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    const displayName = await readDisplayName(env.DB, user.uid);
    return jsonResponse(
      {
        sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        displayName,
      },
      200,
      origin
    );
  }

  if (url.pathname === '/api/me' && request.method === 'PATCH') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    return handlePatchMe(request, user, env, origin);
  }

  if (url.pathname === '/api/bookshelf' && request.method === 'GET') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    return handleGetBookshelf(user.uid, env, origin);
  }

  if (url.pathname.startsWith('/api/bookshelf/') && request.method === 'PUT') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    const videoId = decodeURIComponent(url.pathname.slice('/api/bookshelf/'.length));
    return handlePutBookshelf(request, user.uid, videoId, env, origin);
  }

  if (url.pathname.startsWith('/api/bookshelf/') && request.method === 'DELETE') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    const videoId = decodeURIComponent(url.pathname.slice('/api/bookshelf/'.length));
    return handleDeleteBookshelf(user.uid, videoId, env, origin);
  }

  if (url.pathname === '/api/transcript' && request.method === 'GET') {
    return handleGetTranscript(request, url, ctx, origin);
  }

  if (url.pathname === '/api/transcript-cache' && request.method === 'GET') {
    return handleGetTranscriptCache(request, url, ctx, env, origin);
  }

  if (url.pathname === '/api/transcript-cache' && request.method === 'POST') {
    return handlePostTranscriptCache(request, env, origin);
  }

  if (url.pathname === '/api/curated-feed' && request.method === 'GET') {
    return handleGetCuratedFeed(request, url, ctx, origin);
  }

  return new Response('Not Found', { status: 404 });
}

// ---------- Auth handlers ----------

async function handleAuthGoogle(
  request: Request,
  env: Env,
  origin: string
): Promise<Response> {
  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const idToken = body.idToken;
  if (!idToken || typeof idToken !== 'string') {
    return jsonResponse({ error: 'Missing idToken' }, 400, origin);
  }

  const googleUser = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
  if (!googleUser) {
    return jsonResponse({ error: 'Invalid Google ID token' }, 401, origin);
  }

  const userId = await upsertUser(env.DB, 'google_sub', googleUser.sub, {
    email: googleUser.email,
    name: googleUser.name || googleUser.email,
    picture: googleUser.picture || '',
  });
  const token = await signJwt(
    {
      uid: userId,
      sub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name || googleUser.email,
      picture: googleUser.picture || '',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    },
    env.JWT_SECRET
  );

  return jsonResponse(
    {
      token,
      user: {
        sub: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name || googleUser.email,
        picture: googleUser.picture || '',
        displayName: await readDisplayName(env.DB, userId),
      },
    },
    200,
    origin
  );
}

async function handleAuthGithub(
  request: Request,
  env: Env,
  origin: string
): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return jsonResponse({ error: 'GitHub login is not configured' }, 500, origin);
  }

  let body: { code?: string; redirectUri?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const code = body.code;
  if (!code || typeof code !== 'string') {
    return jsonResponse({ error: 'Missing code' }, 400, origin);
  }

  const githubUser = await exchangeGithubCode(
    code,
    body.redirectUri,
    env.GITHUB_CLIENT_ID,
    env.GITHUB_CLIENT_SECRET
  );
  if (!githubUser) {
    return jsonResponse({ error: 'GitHub login failed' }, 401, origin);
  }

  const userId = await upsertUser(env.DB, 'github_id', githubUser.id, {
    email: githubUser.email,
    name: githubUser.name || githubUser.login,
    picture: githubUser.picture || '',
    githubLogin: githubUser.login,
  });
  const token = await signJwt(
    {
      uid: userId,
      sub: `github:${githubUser.id}`,
      email: githubUser.email,
      name: githubUser.name || githubUser.login,
      picture: githubUser.picture || '',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    },
    env.JWT_SECRET
  );

  return jsonResponse(
    {
      token,
      user: {
        sub: `github:${githubUser.id}`,
        email: githubUser.email,
        name: githubUser.name || githubUser.login,
        picture: githubUser.picture || '',
        displayName: await readDisplayName(env.DB, userId),
      },
    },
    200,
    origin
  );
}

async function exchangeGithubCode(
  code: string,
  redirectUri: string | undefined,
  clientId: string,
  clientSecret: string
): Promise<GithubUser | null> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return null;
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return null;

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    'User-Agent': 'tube-shadowing',
    Accept: 'application/vnd.github+json',
  };

  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) return null;
  const profile = (await userRes.json()) as {
    id?: number;
    login?: string;
    name?: string;
    email?: string | null;
    avatar_url?: string;
  };
  if (!profile.id || !profile.login) return null;

  let email = profile.email || '';
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
      email = primary?.email || '';
    }
  }
  if (!email) return null;

  return {
    id: String(profile.id),
    login: profile.login,
    email,
    name: profile.name || profile.login,
    picture: profile.avatar_url || '',
  };
}

async function upsertUser(
  db: D1Database,
  providerColumn: 'google_sub' | 'github_id',
  providerId: string,
  user: { email: string; name?: string; picture?: string; githubLogin?: string }
): Promise<number> {
  // Link to an existing account by email so a person who signed up with
  // Google and later signs in with GitHub (or vice versa) keeps one account.
  const existing = await db
    .prepare(`SELECT id FROM users WHERE ${providerColumn} = ? OR (email = ? AND email IS NOT NULL)`)
    .bind(providerId, user.email)
    .first<{ id: number }>();

  if (existing) {
    await db
      .prepare(
        `
        UPDATE users SET
          ${providerColumn} = ?,
          email = ?,
          name = ?,
          picture = ?,
          github_login = COALESCE(?, github_login),
          updated_at = unixepoch()
        WHERE id = ?
        `
      )
      .bind(providerId, user.email, user.name || null, user.picture || null, user.githubLogin || null, existing.id)
      .run();
    return existing.id;
  }

  const stmt = db
    .prepare(
      `
      INSERT INTO users (${providerColumn}, email, name, picture, github_login)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id
      `
    )
    .bind(providerId, user.email, user.name || null, user.picture || null, user.githubLogin || null);

  const id = await stmt.first<number>('id');
  if (id == null) throw new Error('Failed to upsert user');
  return id;
}

async function requireAuth(request: Request, env: Env): Promise<JwtPayload | null> {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return verifyJwt(token, env.JWT_SECRET);
}

// ---------- Profile handlers ----------

async function readDisplayName(db: D1Database, userId: number): Promise<string> {
  const row = await db
    .prepare('SELECT display_name FROM users WHERE id = ?')
    .bind(userId)
    .first<{ display_name: string | null }>();
  return row?.display_name || '';
}

async function handlePatchMe(
  request: Request,
  user: JwtPayload,
  env: Env,
  origin: string
): Promise<Response> {
  let body: { displayName?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  if (typeof body.displayName !== 'string') {
    return jsonResponse({ error: 'Missing displayName' }, 400, origin);
  }

  const displayName = body.displayName.trim().slice(0, 60);
  const result = await env.DB
    .prepare('UPDATE users SET display_name = ?, updated_at = unixepoch() WHERE id = ?')
    .bind(displayName || null, user.uid)
    .run();

  if (!result.success) {
    return jsonResponse({ error: 'Failed to save profile' }, 500, origin);
  }

  // Read back rather than echoing the input, so the response can't report a
  // save that didn't land (e.g. the row is gone and the UPDATE matched nothing).
  const stored = await env.DB
    .prepare('SELECT display_name FROM users WHERE id = ?')
    .bind(user.uid)
    .first<{ display_name: string | null }>();

  if (!stored) {
    return jsonResponse({ error: 'User not found' }, 404, origin);
  }

  return jsonResponse(
    {
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      displayName: stored.display_name || '',
    },
    200,
    origin
  );
}

// ---------- User AI API key handlers ----------

function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as string[]).includes(value);
}

async function handleGetApiKeys(userId: number, env: Env, origin: string): Promise<Response> {
  const { results } = await env.DB
    .prepare('SELECT provider, api_key_encrypted, base_url, model FROM user_api_keys WHERE user_id = ?')
    .bind(userId)
    .all<{ provider: string; api_key_encrypted: string; base_url: string | null; model: string | null }>();

  const encKey = await importEncKey(env.API_KEY_ENC_SECRET);
  const keys: UserApiKeyRow[] = [];
  for (const row of results || []) {
    if (!isAiProvider(row.provider)) continue;
    try {
      const apiKey = await decryptString(row.api_key_encrypted, encKey);
      keys.push({ provider: row.provider, apiKey, baseUrl: row.base_url, model: row.model });
    } catch {
      // Skip keys that fail to decrypt (e.g. secret rotated) rather than 500ing the whole list
    }
  }
  return jsonResponse({ keys }, 200, origin);
}

async function handlePutApiKey(
  request: Request,
  userId: number,
  provider: string,
  env: Env,
  origin: string
): Promise<Response> {
  if (!isAiProvider(provider)) {
    return jsonResponse({ error: 'Unknown provider' }, 400, origin);
  }

  let body: { apiKey?: string; baseUrl?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const apiKey = (body.apiKey || '').trim();
  if (!apiKey) {
    return jsonResponse({ error: 'Missing apiKey' }, 400, origin);
  }

  const encKey = await importEncKey(env.API_KEY_ENC_SECRET);
  const encrypted = await encryptString(apiKey, encKey);

  const result = await env.DB
    .prepare(
      `
      INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, base_url, model, updated_at)
      VALUES (?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(user_id, provider) DO UPDATE SET
        api_key_encrypted = excluded.api_key_encrypted,
        base_url = excluded.base_url,
        model = excluded.model,
        updated_at = unixepoch()
      `
    )
    .bind(userId, provider, encrypted, body.baseUrl || null, body.model || null)
    .run();

  if (!result.success) {
    return jsonResponse({ error: 'Failed to save API key' }, 500, origin);
  }
  return jsonResponse({ success: true }, 200, origin);
}

async function handleDeleteApiKey(
  userId: number,
  provider: string,
  env: Env,
  origin: string
): Promise<Response> {
  if (!isAiProvider(provider)) {
    return jsonResponse({ error: 'Unknown provider' }, 400, origin);
  }
  const result = await env.DB
    .prepare('DELETE FROM user_api_keys WHERE user_id = ? AND provider = ?')
    .bind(userId, provider)
    .run();
  if (!result.success) {
    return jsonResponse({ error: 'Failed to delete API key' }, 500, origin);
  }
  return jsonResponse({ success: true }, 200, origin);
}

// ---------- AES-GCM encryption for stored API keys ----------

async function importEncKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', utf8Buffer(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptString(plain: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8Buffer(plain));
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return base64url(combined.buffer);
}

async function decryptString(encoded: string, key: CryptoKey): Promise<string> {
  const combined = base64urlDecode(encoded);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

// ---------- Bookshelf handlers ----------

async function handleGetBookshelf(
  userId: number,
  env: Env,
  origin: string
): Promise<Response> {
  const stmt = env.DB
    .prepare(
      `
      SELECT
        video_id,
        title,
        thumbnail_url,
        duration,
        sentence_count,
        has_translation,
        last_played_time,
        last_sentence_index,
        progress_percent,
        added_at,
        last_studied_at
      FROM bookshelf_items
      WHERE user_id = ?
      ORDER BY last_studied_at DESC
      `
    )
    .bind(userId);

  const { results } = await stmt.all<Record<string, unknown>>();
  const items: BookshelfItem[] = (results || []).map((row) => ({
    videoId: String(row.video_id),
    title: String(row.title),
    thumbnailUrl: String(row.thumbnail_url),
    duration: Number(row.duration),
    sentenceCount: Number(row.sentence_count),
    hasTranslation: Boolean(row.has_translation),
    lastPlayedTime: Number(row.last_played_time),
    lastSentenceIndex: Number(row.last_sentence_index),
    progressPercent: Number(row.progress_percent),
    addedAt: Number(row.added_at),
    lastStudiedAt: Number(row.last_studied_at),
  }));

  return jsonResponse(items, 200, origin);
}

async function handlePutBookshelf(
  request: Request,
  userId: number,
  videoId: string,
  env: Env,
  origin: string
): Promise<Response> {
  let item: Partial<BookshelfItem>;
  try {
    item = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const now = Math.floor(Date.now() / 1000);
  const stmt = env.DB
    .prepare(
      `
      INSERT INTO bookshelf_items (
        user_id, video_id, title, thumbnail_url, duration, sentence_count,
        has_translation, last_played_time, last_sentence_index, progress_percent,
        added_at, last_studied_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, video_id) DO UPDATE SET
        title = excluded.title,
        thumbnail_url = excluded.thumbnail_url,
        duration = excluded.duration,
        sentence_count = excluded.sentence_count,
        has_translation = excluded.has_translation,
        last_played_time = excluded.last_played_time,
        last_sentence_index = excluded.last_sentence_index,
        progress_percent = excluded.progress_percent,
        last_studied_at = excluded.last_studied_at,
        updated_at = excluded.updated_at
      `
    )
    .bind(
      userId,
      videoId,
      item.title ?? '',
      item.thumbnailUrl ?? '',
      item.duration ?? 0,
      item.sentenceCount ?? 0,
      item.hasTranslation ? 1 : 0,
      item.lastPlayedTime ?? 0,
      item.lastSentenceIndex ?? 0,
      item.progressPercent ?? 0,
      item.addedAt ?? now,
      item.lastStudiedAt ?? now,
      now
    );

  const result = await stmt.run();
  if (!result.success) {
    return jsonResponse({ error: 'Failed to save bookshelf item' }, 500, origin);
  }
  return jsonResponse({ success: true }, 200, origin);
}

async function handleDeleteBookshelf(
  userId: number,
  videoId: string,
  env: Env,
  origin: string
): Promise<Response> {
  const result = await env.DB
    .prepare('DELETE FROM bookshelf_items WHERE user_id = ? AND video_id = ?')
    .bind(userId, videoId)
    .run();
  if (!result.success) {
    return jsonResponse({ error: 'Failed to delete bookshelf item' }, 500, origin);
  }
  return jsonResponse({ success: true }, 200, origin);
}

// ---------- Transcript handler ----------

async function handleGetTranscript(
  request: Request,
  url: URL,
  ctx: ExecutionContext,
  origin: string
): Promise<Response> {
  const videoId = url.searchParams.get('v');
  if (!videoId) {
    return jsonResponse({ error: 'Missing video ID parameter' }, 400, origin);
  }

  const cacheKey = new Request(url.toString(), request);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  try {
    const transcriptData = await fetchYouTubeSubtitles(videoId);
    const res = new Response(JSON.stringify(transcriptData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
    ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch transcript';
    return jsonResponse({ error: message }, 500, origin);
  }
}

// ---------- Shared transcript cache handlers ----------

async function handleGetTranscriptCache(
  request: Request,
  url: URL,
  ctx: ExecutionContext,
  env: Env,
  origin: string
): Promise<Response> {
  const videoId = url.searchParams.get('v');
  if (!videoId) {
    return jsonResponse({ error: 'Missing video ID parameter' }, 400, origin);
  }

  const cacheKey = new Request(url.toString(), request);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const row = await env.DB
    .prepare('SELECT sentences_json FROM shared_transcripts WHERE video_id = ? AND has_translation = 1')
    .bind(videoId)
    .first<{ sentences_json: string }>();

  if (!row) {
    return jsonResponse({ cached: false }, 404, origin);
  }

  let sentences: TranscriptItem[];
  try {
    sentences = JSON.parse(row.sentences_json);
  } catch {
    return jsonResponse({ cached: false }, 404, origin);
  }

  const res = new Response(JSON.stringify({ cached: true, sentences }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=1800',
    },
  });
  ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
  return res;
}

async function handlePostTranscriptCache(
  request: Request,
  env: Env,
  origin: string
): Promise<Response> {
  let body: { videoId?: string; sentences?: TranscriptItem[] };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const videoId = body.videoId;
  const sentences = body.sentences;

  if (!videoId || typeof videoId !== 'string') {
    return jsonResponse({ error: 'Missing videoId' }, 400, origin);
  }
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return jsonResponse({ error: 'Missing sentences' }, 400, origin);
  }

  const hasTranslation = sentences.some(
    (s) => typeof s?.zh === 'string' && s.zh.trim().length > 0
  );
  if (!hasTranslation) {
    return jsonResponse({ error: 'Sentences must include Chinese translation' }, 400, origin);
  }

  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB
    .prepare(
      `
      INSERT INTO shared_transcripts (video_id, sentences_json, sentence_count, has_translation, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(video_id) DO UPDATE SET
        sentences_json = excluded.sentences_json,
        sentence_count = excluded.sentence_count,
        has_translation = 1,
        updated_at = excluded.updated_at
      `
    )
    .bind(videoId, JSON.stringify(sentences), sentences.length, now, now)
    .run();

  if (!result.success) {
    return jsonResponse({ error: 'Failed to save transcript cache' }, 500, origin);
  }
  return jsonResponse({ success: true }, 200, origin);
}

// ---------- Curated feed handler ----------

function isValidFeedCategory(value: string): value is FeedCategory {
  return ['learning', 'tech'].includes(value);
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return '近期';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseYouTubeRss(xmlText: string, source: CuratedFeedSource): FeedVideoItem[] {
  const items: FeedVideoItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryBlock = match[1];

    const videoIdMatch = entryBlock.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entryBlock.match(/<title>(.*?)<\/title>/);
    const publishedMatch = entryBlock.match(/<published>(.*?)<\/published>/);
    const durationMatch = entryBlock.match(/<yt:duration seconds="(\d+)"\/>/);

    if (videoIdMatch && titleMatch && publishedMatch) {
      const videoId = videoIdMatch[1].trim();
      const rawTitle = decodeXmlEntities(titleMatch[1].trim());
      const publishedAt = publishedMatch[1].trim();

      if (rawTitle.toLowerCase().includes('#shorts')) continue;

      const durationSec = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

      if (source.category === 'learning' && durationSec && durationSec < 120) continue;

      items.push({
        videoId,
        title: rawTitle,
        channelId: source.id,
        channelName: source.name,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt,
        relativeTime: formatRelativeTime(new Date(publishedAt).getTime()),
        category: source.category,
        levelTag: source.defaultLevel,
        duration: durationSec ? formatDuration(durationSec) : undefined,
      });
    }
  }

  return items;
}

async function handleGetCuratedFeed(
  request: Request,
  url: URL,
  ctx: ExecutionContext,
  origin: string
): Promise<Response> {
  const rawCategory = url.searchParams.get('category') || 'learning';
  const category = isValidFeedCategory(rawCategory) ? rawCategory : 'learning';

  const cacheKey = new Request(url.toString(), request);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const targetSources = CURATED_SOURCES.filter((s) => s.category === category);

  const fetchPromises = targetSources.map(async (source) => {
    try {
      const rssUrl = source.type === 'playlist'
        ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${source.id}`
        : `https://www.youtube.com/feeds/videos.xml?channel_id=${source.id}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TubeShadowing/1.0)' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return [];
      const xml = await res.text();
      return parseYouTubeRss(xml, source);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const allItems = results
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 24);

  const responseData = {
    category,
    updatedAt: Date.now(),
    items: allItems,
  };

  const res = new Response(JSON.stringify(responseData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=1800',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

  ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
  return res;
}

// ---------- JWT utilities ----------

async function importJwtSecret(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    utf8Buffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64url(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function utf8Buffer(input: string): ArrayBuffer {
  return new TextEncoder().encode(input).buffer as ArrayBuffer;
}

function base64urlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function signJwt(payload: Omit<JwtPayload, 'iat'>, secret: string): Promise<string> {
  const key = await importJwtSecret(secret);
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(utf8Buffer(JSON.stringify(header)));
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const encodedPayload = base64url(utf8Buffer(JSON.stringify(fullPayload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    utf8Buffer(`${encodedHeader}.${encodedPayload}`)
  );
  return `${encodedHeader}.${encodedPayload}.${base64url(signature)}`;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;

  let signature: Uint8Array;
  let payloadJson: string;
  try {
    signature = base64urlDecode(s);
    payloadJson = new TextDecoder().decode(base64urlDecode(p));
  } catch {
    return null;
  }

  const key = await importJwtSecret(secret);
  const valid = await crypto.subtle.verify('HMAC', key, signature as BufferSource, utf8Buffer(`${h}.${p}`));
  if (!valid) return null;

  try {
    const payload = JSON.parse(payloadJson) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- Google ID token verification ----------

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleUser | null> {
  const [headerB64] = idToken.split('.');
  if (!headerB64) return null;

  let header: { kid?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64))) as { kid?: string };
  } catch {
    return null;
  }

  const jwksRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!jwksRes.ok) return null;
  const jwks = (await jwksRes.json()) as { keys?: GoogleJwk[] };
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const [h, p, s] = idToken.split('.');
  if (!h || !p || !s) return null;

  let signature: Uint8Array;
  let payloadJson: string;
  try {
    signature = base64urlDecode(s);
    payloadJson = new TextDecoder().decode(base64urlDecode(p));
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature as BufferSource,
    utf8Buffer(`${h}.${p}`)
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(payloadJson) as {
      iss?: string;
      aud?: string;
      exp?: number;
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss || '')) return null;
    if (payload.aud !== clientId) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub || !payload.email) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

// ---------- YouTube subtitle fetching ----------

async function innertubePlayer(apiKey: string, videoId: string, clientVersion: string): Promise<any> {
  const playerRes = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      context: {
        client: { clientName: 'ANDROID', clientVersion },
      },
      videoId,
    }),
  });
  return playerRes.json();
}

async function fetchYouTubeSubtitles(videoId: string): Promise<{
  title: string;
  duration: number;
  sentences: TranscriptItem[];
}> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(watchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    },
  });
  const html = await pageRes.text();

  const keyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
  const apiKey = keyMatch ? keyMatch[1] : 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

  let playerData = await innertubePlayer(apiKey, videoId, '20.10.38');
  let captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    playerData = await innertubePlayer(apiKey, videoId, '19.44.38');
    captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No subtitles found for this video');
  }

  const title: string = playerData?.videoDetails?.title || videoId;
  const duration: number = parseInt(playerData?.videoDetails?.lengthSeconds || '0', 10);

  let enTrack = captionTracks.find(
    (t: { languageCode?: string }) => t.languageCode === 'en' || t.languageCode?.startsWith('en-')
  );
  if (!enTrack) {
    enTrack = captionTracks[0];
  }

  const zhNativeTrack = captionTracks.find(
    (t: { languageCode?: string }) =>
      t.languageCode === 'zh-Hans' || t.languageCode === 'zh' || t.languageCode === 'zh-CN'
  );

  const enBaseUrl: string = enTrack.baseUrl;
  const enXmlRes = await fetch(enBaseUrl);
  const enXml = await enXmlRes.text();

  if (!enXmlRes.ok || enXml.includes('<html>')) {
    throw new Error('Failed to fetch English subtitles (rate limited). Please try again shortly.');
  }

  let zhXml = '';
  if (zhNativeTrack) {
    try {
      const zhRes = await fetch(zhNativeTrack.baseUrl);
      if (zhRes.ok) zhXml = await zhRes.text();
    } catch {
      /* fall through to auto-translation */
    }
  }

  if (!zhXml) {
    for (const tlang of ['zh-Hans', 'zh']) {
      try {
        const zhRes = await fetch(`${enBaseUrl}&tlang=${tlang}`);
        if (zhRes.ok) {
          const text = await zhRes.text();
          if (text.length > 200 && !text.includes('<html>')) {
            zhXml = text;
            break;
          }
        }
      } catch {
        /* try next variant */
      }
    }
  }

  const sentences = parseAndMergeTimedText(enXml, zhXml);
  return { title, duration, sentences };
}

function parseAndMergeTimedText(enXml: string, zhXml: string): TranscriptItem[] {
  const parseItems = (xml: string) => {
    const list: { start: number; end: number; text: string; words?: WordTiming[] }[] = [];
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let m;
    while ((m = pRegex.exec(xml)) !== null) {
      const pStartMs = parseInt(m[1], 10);
      const pDurMs = parseInt(m[2], 10);
      const innerContent = m[3];
      const pStart = pStartMs / 1000;
      const pEnd = (pStartMs + pDurMs) / 1000;

      const words: WordTiming[] = [];
      const sRegex = /<s(?:\s+t="(\d+)")?[^>]*>([\s\S]*?)<\/s>/g;
      let sm;
      let fullText = '';
      const sMatches: { offsetMs: number; text: string }[] = [];

      while ((sm = sRegex.exec(innerContent)) !== null) {
        const offsetMs = sm[1] ? parseInt(sm[1], 10) : 0;
        const text = decodeXmlEntities(sm[2]);
        if (text) {
          sMatches.push({ offsetMs, text });
          fullText += text;
        }
      }

      if (sMatches.length > 0) {
        for (let i = 0; i < sMatches.length; i++) {
          const curr = sMatches[i];
          const wStart = (pStartMs + curr.offsetMs) / 1000;
          const nextOffset = i < sMatches.length - 1 ? sMatches[i + 1].offsetMs : pDurMs;
          const wEnd = Math.max(wStart + 0.1, (pStartMs + nextOffset) / 1000);
          const cleanWord = curr.text.trim();
          if (cleanWord) {
            words.push({ word: cleanWord, start: wStart, end: wEnd });
          }
        }
      } else {
        fullText = decodeXmlEntities(innerContent);
      }

      if (fullText.trim()) {
        list.push({
          start: pStart,
          end: pEnd,
          text: fullText.trim(),
          words: words.length > 0 ? words : undefined,
        });
      }
    }

    if (list.length === 0) {
      const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
      while ((m = textRegex.exec(xml)) !== null) {
        const start = parseFloat(m[1]);
        const dur = parseFloat(m[2]);
        const text = decodeXmlEntities(m[3]);
        if (text) {
          list.push({ start, end: start + dur, text, words: undefined });
        }
      }
    }

    for (const item of list) {
      if (!item.words || item.words.length === 0) {
        item.words = interpolateWords(item.text, item.start, item.end);
      }
    }

    return list;
  };

  const enItems = parseItems(enXml);
  const zhItems = parseItems(zhXml);

  return enItems.map((item, idx) => {
    const zhItem = zhItems[idx] || zhItems.find((z) => Math.abs(z.start - item.start) < 0.8);
    return {
      id: idx + 1,
      start: item.start,
      end: item.end,
      en: item.text,
      zh: zhItem ? zhItem.text : '',
      words: item.words,
    };
  });
}

function interpolateWords(sentence: string, start: number, end: number): WordTiming[] {
  const rawTokens = sentence.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return [];
  const totalChars = rawTokens.reduce((acc, t) => acc + t.length, 0);
  const totalDuration = end - start;
  let currentStart = start;

  return rawTokens.map((token) => {
    const ratio = token.length / totalChars;
    const dur = Math.max(0.15, totalDuration * ratio);
    const wStart = currentStart;
    const wEnd = Math.min(end, currentStart + dur);
    currentStart = wEnd;
    return { word: token, start: wStart, end: wEnd };
  });
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\n/g, ' ')
    .trim();
}
