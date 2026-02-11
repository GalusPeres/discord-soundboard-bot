const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const {
  MAX_FILE_SIZE,
  MAX_FILENAME_LENGTH,
  SOUNDS_DIR,
  SOUND_COUNTS_PATH,
  SOUND_LOGS_PATH
} = require('../utils/constants');

const DISCORD_API_BASE = 'https://discord.com/api';
const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;
const CONFIG_PATH = path.join(__dirname, '../config/config.json');

class DiscordApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'DiscordApiError';
    this.status = status;
  }
}

function readEnvValue(...keys) {
  for (const key of keys) {
    const rawValue = process.env[key];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return '';
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function parseAllowedGuildIds(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveSessionSecret(configSessionSecret) {
  const envSessionSecret = readEnvValue('SOUNDBOARD_SESSION_SECRET', 'SESSION_SECRET');
  const candidate = envSessionSecret || String(configSessionSecret || '');
  if (candidate.length >= 32) {
    return candidate;
  }

  console.warn('[WEB] Missing or weak session secret. Generating ephemeral secret for this process.');
  return crypto.randomBytes(48).toString('hex');
}

function loadWebConfig() {
  let config = {};
  try {
    config = require('../config/config.json');
  } catch {
    config = {};
  }

  const webConfig = config.web ?? {};
  const parsedPort = Number.parseInt(readEnvValue('WEB_PORT'), 10);
  const configPort = Number(webConfig.port ?? 3000);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : configPort;

  const baseUrl = readEnvValue('WEB_BASE_URL') || webConfig.baseUrl || `http://localhost:${port}`;
  const frontendUrl = readEnvValue('WEB_FRONTEND_URL') || webConfig.frontendUrl || baseUrl;

  const cookieSecureOverride = readEnvValue('WEB_COOKIE_SECURE');
  let inferredSecureCookie = false;
  try {
    inferredSecureCookie = new URL(baseUrl).protocol === 'https:';
  } catch {
    inferredSecureCookie = false;
  }

  const cookieSecure = cookieSecureOverride
    ? parseBoolean(cookieSecureOverride, inferredSecureCookie)
    : inferredSecureCookie;

  const allowedGuildIdsFromEnv = parseAllowedGuildIds(readEnvValue('WEB_ALLOWED_GUILD_IDS'));
  const allowedGuildIds = allowedGuildIdsFromEnv.length > 0
    ? allowedGuildIdsFromEnv
    : Array.isArray(webConfig.allowedGuildIds)
      ? webConfig.allowedGuildIds
      : [];

  const trustProxy = parseBoolean(readEnvValue('WEB_TRUST_PROXY'), cookieSecure);

  return {
    port,
    baseUrl,
    frontendUrl,
    callbackPath: readEnvValue('WEB_CALLBACK_PATH') || webConfig.callbackPath || '/auth/discord/callback',
    discordClientId: readEnvValue('DISCORD_CLIENT_ID') || webConfig.discordClientId || '',
    discordClientSecret: readEnvValue('DISCORD_CLIENT_SECRET') || webConfig.discordClientSecret || '',
    sessionSecret: resolveSessionSecret(webConfig.sessionSecret),
    allowedGuildIds,
    cookieSecure,
    trustProxy
  };
}

function sanitizeSoundName(rawValue) {
  const normalized = String(rawValue || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

  if (!normalized) {
    return '';
  }

  return normalized.slice(0, MAX_FILENAME_LENGTH);
}

function ensureSoundsDirectory() {
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  }
}

function readBotConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { prefix: '8' };
  }
}

function writeBotConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadSoundCounts() {
  try {
    const raw = fs.readFileSync(SOUND_COUNTS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSoundCounts(soundCounts) {
  fs.writeFileSync(SOUND_COUNTS_PATH, JSON.stringify(soundCounts, null, 2));
}

function logAction(message) {
  const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  fs.appendFileSync(SOUND_LOGS_PATH, `${berlinTime} - ${message}\n`, 'utf8');
}

function hasManageAccess(permissions, isOwner) {
  if (isOwner) {
    return true;
  }

  try {
    const bits = BigInt(permissions || '0');
    return (bits & ADMINISTRATOR) !== 0n || (bits & MANAGE_GUILD) !== 0n;
  } catch {
    return false;
  }
}

function resolveAvatarUrl(user) {
  if (!user?.avatar) {
    return null;
  }
  const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=128`;
}

function resolveGuildIcon(guild) {
  if (!guild.icon) {
    return null;
  }
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
}

async function fetchDiscordJSON(accessToken, endpoint, options = {}) {
  const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new DiscordApiError(`Discord API request failed: ${response.status}`, response.status);
  }

  return response.json();
}

async function refreshDiscordAccessToken(refreshToken, webConfig) {
  const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: webConfig.discordClientId,
      client_secret: webConfig.discordClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString()
  });

  if (!tokenResponse.ok) {
    throw new DiscordApiError(`Discord token refresh failed: ${tokenResponse.status}`, tokenResponse.status);
  }

  return tokenResponse.json();
}

function buildSessionContext(client, webConfig, discordUser, discordGuilds, preferredGuildId = null) {
  const allowedGuildIds = new Set(webConfig.allowedGuildIds);
  const canFilterByAllowedGuilds = allowedGuildIds.size > 0;

  const guilds = discordGuilds
    .filter((guild) => hasManageAccess(guild.permissions, guild.owner))
    .filter((guild) => (canFilterByAllowedGuilds ? allowedGuildIds.has(guild.id) : true))
    .filter((guild) => client.guilds.cache.has(guild.id))
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      iconUrl: resolveGuildIcon(guild)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedGuildId = guilds.some((guild) => guild.id === preferredGuildId)
    ? preferredGuildId
    : guilds[0]?.id ?? null;

  return {
    authenticated: true,
    user: {
      id: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.global_name || discordUser.username,
      avatarUrl: resolveAvatarUrl(discordUser)
    },
    guilds,
    selectedGuildId
  };
}

async function fetchDiscordDashboardContext(accessToken, client, webConfig, preferredGuildId = null) {
  const [discordUser, discordGuilds] = await Promise.all([
    fetchDiscordJSON(accessToken, '/users/@me'),
    fetchDiscordJSON(accessToken, '/users/@me/guilds')
  ]);

  return buildSessionContext(client, webConfig, discordUser, discordGuilds, preferredGuildId);
}

function getStoredSessionContext(req) {
  const context = req.session.authContext;
  if (!context?.authenticated || !context.user || !Array.isArray(context.guilds)) {
    return null;
  }

  const selectedGuildId = context.guilds.some((guild) => guild.id === context.selectedGuildId)
    ? context.selectedGuildId
    : context.guilds[0]?.id ?? null;

  if (selectedGuildId !== context.selectedGuildId) {
    context.selectedGuildId = selectedGuildId;
    req.session.authContext = context;
  }

  return context;
}

async function getDiscordSessionContext(req, client, webConfig) {
  const storedContext = getStoredSessionContext(req);
  if (storedContext) {
    return storedContext;
  }

  const authSession = req.session.auth;
  if (!authSession?.accessToken) {
    return null;
  }

  try {
    const context = await fetchDiscordDashboardContext(
      authSession.accessToken,
      client,
      webConfig,
      req.session.selectedGuildId || null
    );

    req.session.authContext = context;
    req.session.selectedGuildId = context.selectedGuildId;
    return context;
  } catch (error) {
    const canRefreshToken = error instanceof DiscordApiError
      && error.status === 401
      && typeof authSession.refreshToken === 'string'
      && authSession.refreshToken.length > 0
      && webConfig.discordClientId
      && webConfig.discordClientSecret;

    if (!canRefreshToken) {
      throw error;
    }

    const refreshed = await refreshDiscordAccessToken(authSession.refreshToken, webConfig);
    req.session.auth = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || authSession.refreshToken,
      expiresAt: typeof refreshed.expires_in === 'number'
        ? Date.now() + refreshed.expires_in * 1000
        : authSession.expiresAt ?? null
    };

    const context = await fetchDiscordDashboardContext(
      refreshed.access_token,
      client,
      webConfig,
      req.session.selectedGuildId || null
    );

    req.session.authContext = context;
    req.session.selectedGuildId = context.selectedGuildId;
    return context;
  }
}

function listSoundFiles() {
  ensureSoundsDirectory();
  return fs
    .readdirSync(SOUNDS_DIR)
    .filter((fileName) => fileName.endsWith('.mp3'))
    .map((fileName) => {
      const fullPath = path.join(SOUNDS_DIR, fileName);
      const stats = fs.statSync(fullPath);
      return {
        fileName,
        name: path.basename(fileName, '.mp3'),
        fullPath,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString()
      };
    });
}

function serializeSounds() {
  const files = listSoundFiles();
  const soundCounts = loadSoundCounts();

  const topSet = new Set(
    [...files]
      .sort((a, b) => (soundCounts[b.fileName] || 0) - (soundCounts[a.fileName] || 0))
      .slice(0, 12)
      .map((sound) => sound.name)
  );

  const newSet = new Set(
    [...files]
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))
      .slice(0, 12)
      .map((sound) => sound.name)
  );

  return files
    .map((sound) => ({
      name: sound.name,
      fileName: sound.fileName,
      sizeBytes: sound.sizeBytes,
      modifiedAt: sound.modifiedAt,
      playCount: soundCounts[sound.fileName] || 0,
      isTop: topSet.has(sound.name),
      isNew: newSet.has(sound.name),
      previewUrl: `/api/sounds/${encodeURIComponent(sound.name)}/preview`,
      downloadUrl: `/api/sounds/${encodeURIComponent(sound.name)}/download`
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function resolveSoundPath(soundName) {
  const normalized = sanitizeSoundName(soundName);
  if (!normalized) {
    return null;
  }

  const soundPath = path.join(SOUNDS_DIR, `${normalized}.mp3`);
  if (!fs.existsSync(soundPath)) {
    return null;
  }

  return {
    normalized,
    path: soundPath
  };
}

function isLikelyMp3(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 3) {
    return false;
  }

  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    return true;
  }

  return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

function createRateLimiter({ windowMs, maxRequests, errorMessage }) {
  const hits = new Map();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const existing = hits.get(key);

    if (!existing || existing.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: errorMessage });
      return;
    }

    next();
  };
}

function createSameOriginGuard(webConfig) {
  const allowedOrigins = new Set();
  for (const candidate of [webConfig.baseUrl, webConfig.frontendUrl]) {
    try {
      allowedOrigins.add(new URL(candidate).origin);
    } catch {
      // Ignore invalid configured URLs and keep remaining origins.
    }
  }

  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin || allowedOrigins.has(origin)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Cross-origin request blocked' });
  };
}

function applySecurityHeaders(req, res, next) {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https://cdn.discordapp.com",
      "media-src 'self' blob:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "form-action 'self' https://discord.com"
    ].join('; ')
  );
  next();
}

function createServer({ client, audioService }) {
  const webConfig = loadWebConfig();
  const app = express();

  if (webConfig.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use(
    session({
      name: 'discord_soundboard_session',
      secret: webConfig.sessionSecret,
      resave: false,
      saveUninitialized: false,
      proxy: webConfig.trustProxy,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: webConfig.cookieSecure,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    })
  );

  const requireSameOrigin = createSameOriginGuard(webConfig);
  const authRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    errorMessage: 'Too many authentication requests. Please try again in a minute.'
  });
  const mutationRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    errorMessage: 'Too many requests. Please try again shortly.'
  });
  const uploadRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    errorMessage: 'Too many upload requests. Please wait a minute and try again.'
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE
    }
  });

  const requireAuth = async (req, res, next) => {
    try {
      const context = await getDiscordSessionContext(req, client, webConfig);
      if (!context) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      req.authContext = context;
      next();
    } catch (error) {
      console.error('[WEB] Auth check failed:', error.message);
      res.status(401).json({ error: 'Authentication required' });
    }
  };

  app.get('/auth/discord/login', authRateLimit, (req, res) => {
    if (!webConfig.discordClientId || !webConfig.discordClientSecret) {
      res.status(500).send('Discord OAuth is not configured.');
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    req.session.oauthState = state;

    const redirectUri = new URL(webConfig.callbackPath, webConfig.baseUrl).toString();
    const authorizeUrl = new URL(`${DISCORD_API_BASE}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', webConfig.discordClientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'identify guilds');
    authorizeUrl.searchParams.set('state', state);

    res.redirect(authorizeUrl.toString());
  });

  app.get(webConfig.callbackPath, authRateLimit, async (req, res) => {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');

    if (!code || !state || state !== req.session.oauthState) {
      res.status(400).send('Invalid OAuth response.');
      return;
    }

    const redirectUri = new URL(webConfig.callbackPath, webConfig.baseUrl).toString();

    try {
      const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: webConfig.discordClientId,
          client_secret: webConfig.discordClientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        }).toString()
      });

      if (!tokenResponse.ok) {
        throw new Error(`Discord token exchange failed (${tokenResponse.status})`);
      }

      const tokenPayload = await tokenResponse.json();
      const context = await fetchDiscordDashboardContext(tokenPayload.access_token, client, webConfig, null);
      const nextSessionData = {
        auth: {
          accessToken: tokenPayload.access_token,
          refreshToken: tokenPayload.refresh_token || null,
          expiresAt: typeof tokenPayload.expires_in === 'number'
            ? Date.now() + tokenPayload.expires_in * 1000
            : null
        },
        authContext: context,
        oauthState: null,
        selectedGuildId: context.selectedGuildId
      };

      req.session.regenerate((regenerateError) => {
        if (regenerateError) {
          console.error('[WEB] Session regenerate after OAuth failed:', regenerateError.message);
          res.status(500).send('OAuth login failed.');
          return;
        }

        req.session.auth = nextSessionData.auth;
        req.session.authContext = nextSessionData.authContext;
        req.session.oauthState = nextSessionData.oauthState;
        req.session.selectedGuildId = nextSessionData.selectedGuildId;
        req.session.save((saveError) => {
          if (saveError) {
            console.error('[WEB] Session save after OAuth failed:', saveError.message);
            res.status(500).send('OAuth login failed.');
            return;
          }

          res.redirect(`${webConfig.frontendUrl}/app/soundboard`);
        });
      });
    } catch (error) {
      console.error('[WEB] OAuth callback failed:', error.message);
      res.status(500).send('OAuth login failed.');
    }
  });

  app.get('/auth/session', async (req, res) => {
    try {
      const context = await getDiscordSessionContext(req, client, webConfig);
      if (!context) {
        res.json({ authenticated: false, user: null, guilds: [], selectedGuildId: null });
        return;
      }
      res.json(context);
    } catch (error) {
      console.error('[WEB] /auth/session failed:', error.message);
      res.json({ authenticated: false, user: null, guilds: [], selectedGuildId: null });
    }
  });

  app.post('/auth/logout', requireSameOrigin, authRateLimit, (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('discord_soundboard_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: webConfig.cookieSecure,
        path: '/'
      });
      res.json({ success: true });
    });
  });

  app.post('/api/guilds/select', requireAuth, requireSameOrigin, mutationRateLimit, (req, res) => {
    const guildId = String(req.body.guildId || '');
    if (!req.authContext.guilds.some((guild) => guild.id === guildId)) {
      res.status(400).json({ error: 'Unknown guild selected' });
      return;
    }

    req.session.authContext = {
      ...req.authContext,
      selectedGuildId: guildId
    };
    req.session.selectedGuildId = guildId;
    res.json({ success: true });
  });

  app.get('/api/settings', requireAuth, (_req, res) => {
    const config = readBotConfig();
    const prefix = typeof config.prefix === 'string' && config.prefix.trim().length > 0 ? config.prefix : '8';
    res.json({
      prefix,
      maxFileSizeBytes: MAX_FILE_SIZE,
      maxFilenameLength: MAX_FILENAME_LENGTH
    });
  });

  app.patch('/api/settings', requireAuth, requireSameOrigin, mutationRateLimit, (req, res) => {
    const prefix = String(req.body.prefix || '').trim();
    if (!/^\S{1,5}$/.test(prefix)) {
      res.status(400).json({ error: 'Prefix must contain 1-5 non-space characters' });
      return;
    }

    try {
      const config = readBotConfig();
      config.prefix = prefix;
      writeBotConfig(config);
      logAction(`${req.authContext.user.username} updated bot prefix to "${prefix}"`);
      res.json({ success: true, prefix });
    } catch (error) {
      res.status(500).json({ error: 'Could not update settings' });
    }
  });

  app.get('/api/sounds', requireAuth, (_req, res) => {
    try {
      const sounds = serializeSounds();
      res.json({ sounds });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load sounds' });
    }
  });

  app.post('/api/sounds/play', requireAuth, requireSameOrigin, mutationRateLimit, async (req, res) => {
    const soundName = sanitizeSoundName(req.body.soundName);
    const guildId = String(req.body.guildId || req.authContext.selectedGuildId || '');

    if (!soundName) {
      res.status(400).json({ error: 'Sound name is required' });
      return;
    }

    if (!req.authContext.guilds.some((guild) => guild.id === guildId)) {
      res.status(400).json({ error: 'Select a valid guild first' });
      return;
    }

    const soundPath = resolveSoundPath(soundName);
    if (!soundPath) {
      res.status(404).json({ error: 'Sound not found' });
      return;
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        res.status(404).json({ error: 'Bot is not connected to the selected guild' });
        return;
      }

      const member = await guild.members.fetch(req.authContext.user.id);
      const voiceChannel = member.voice.channel;
      if (!voiceChannel) {
        res.status(400).json({ error: 'Join a voice channel in the selected guild before playing sounds.' });
        return;
      }

      await audioService.playSoundFromWeb(guild, voiceChannel, soundName, req.authContext.user.displayName);
      res.json({ success: true });
    } catch (error) {
      console.error('[WEB] Play sound failed:', error.message);
      res.status(500).json({ error: 'Could not play the requested sound' });
    }
  });

  app.post('/api/sounds/upload', requireAuth, requireSameOrigin, uploadRateLimit, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'MP3 file is required' });
      return;
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.mp3') {
      res.status(400).json({ error: 'Only MP3 uploads are allowed' });
      return;
    }

    if (!isLikelyMp3(file.buffer)) {
      res.status(400).json({ error: 'Uploaded file does not look like a valid MP3' });
      return;
    }

    const requestedName = req.body.soundName || path.basename(file.originalname, extension);
    const soundName = sanitizeSoundName(requestedName);
    if (!soundName) {
      res.status(400).json({ error: 'Invalid sound name' });
      return;
    }

    const overwrite = String(req.body.overwrite || 'false').toLowerCase() === 'true';
    const outputPath = path.join(SOUNDS_DIR, `${soundName}.mp3`);

    ensureSoundsDirectory();

    if (fs.existsSync(outputPath) && !overwrite) {
      res.status(409).json({ error: 'Sound already exists. Enable overwrite to replace it.' });
      return;
    }

    try {
      fs.writeFileSync(outputPath, file.buffer);
      logAction(`${req.authContext.user.username} uploaded sound ${soundName}`);
      const sound = serializeSounds().find((item) => item.name === soundName);
      res.json({ success: true, sound });
    } catch (error) {
      res.status(500).json({ error: 'Could not save uploaded file' });
    }
  });

  app.patch('/api/sounds/:soundName', requireAuth, requireSameOrigin, mutationRateLimit, (req, res) => {
    const oldName = sanitizeSoundName(req.params.soundName);
    const newName = sanitizeSoundName(req.body.newName);

    if (!oldName || !newName) {
      res.status(400).json({ error: 'Both current and new names are required' });
      return;
    }

    const sourcePath = path.join(SOUNDS_DIR, `${oldName}.mp3`);
    const targetPath = path.join(SOUNDS_DIR, `${newName}.mp3`);

    if (!fs.existsSync(sourcePath)) {
      res.status(404).json({ error: 'Sound not found' });
      return;
    }

    if (fs.existsSync(targetPath) && sourcePath !== targetPath) {
      res.status(409).json({ error: 'A sound with this name already exists' });
      return;
    }

    try {
      fs.renameSync(sourcePath, targetPath);
      const soundCounts = loadSoundCounts();
      if (soundCounts[`${oldName}.mp3`] !== undefined) {
        soundCounts[`${newName}.mp3`] = soundCounts[`${oldName}.mp3`];
        delete soundCounts[`${oldName}.mp3`];
        saveSoundCounts(soundCounts);
      }

      logAction(`${req.authContext.user.username} renamed sound ${oldName} -> ${newName}`);
      const sound = serializeSounds().find((item) => item.name === newName);
      res.json({ success: true, sound });
    } catch (error) {
      res.status(500).json({ error: 'Could not rename sound' });
    }
  });

  app.delete('/api/sounds/:soundName', requireAuth, requireSameOrigin, mutationRateLimit, (req, res) => {
    const soundName = sanitizeSoundName(req.params.soundName);
    if (!soundName) {
      res.status(400).json({ error: 'Invalid sound name' });
      return;
    }

    const soundPath = path.join(SOUNDS_DIR, `${soundName}.mp3`);
    if (!fs.existsSync(soundPath)) {
      res.status(404).json({ error: 'Sound not found' });
      return;
    }

    try {
      fs.unlinkSync(soundPath);
      const soundCounts = loadSoundCounts();
      if (soundCounts[`${soundName}.mp3`] !== undefined) {
        delete soundCounts[`${soundName}.mp3`];
        saveSoundCounts(soundCounts);
      }
      logAction(`${req.authContext.user.username} deleted sound ${soundName}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Could not delete sound' });
    }
  });

  app.get('/api/sounds/:soundName/download', requireAuth, (req, res) => {
    const resolved = resolveSoundPath(req.params.soundName);
    if (!resolved) {
      res.status(404).json({ error: 'Sound not found' });
      return;
    }

    res.download(resolved.path, `${resolved.normalized}.mp3`);
  });

  app.get('/api/sounds/:soundName/preview', requireAuth, (req, res) => {
    const resolved = resolveSoundPath(req.params.soundName);
    if (!resolved) {
      res.status(404).json({ error: 'Sound not found' });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.sendFile(resolved.path);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/^\/(?!api|auth).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: `File exceeds ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB limit` });
        return;
      }
      res.status(400).json({ error: 'Invalid file upload request' });
      return;
    }

    console.error('[WEB] Unexpected error:', error);
    res.status(500).json({ error: 'Unexpected server error' });
  });

  return { app, webConfig };
}

function startWebServer({ client, audioService }) {
  const { app, webConfig } = createServer({ client, audioService });
  const server = app.listen(webConfig.port, () => {
    console.log(`[WEB] Dashboard available at ${webConfig.baseUrl}`);
  });
  return server;
}

module.exports = {
  startWebServer
};
