import { normalizeQqApiBaseUrl } from "./normalize.js";
import type { QqAccessTokenResponse, QqOfficialApiError } from "./types.js";

export type QqOfficialApiAccount = {
  apiBaseUrl: string;
  appId: string;
  appSecret: string;
  tokenDomain?: string;
};

type QqAccessTokenCacheEntry = {
  accessToken: string;
  expiresAtMs: number;
};

type QqApiRequest = {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

const DEFAULT_TOKEN_DOMAIN = "https://bots.qq.com";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;
const accessTokenCache = new Map<string, QqAccessTokenCacheEntry>();

function resolveTokenDomain(raw?: string): string {
  const trimmed = raw?.trim() || DEFAULT_TOKEN_DOMAIN;
  return trimmed.replace(/\/+$/, "");
}

function resolveAccessTokenCacheKey(account: QqOfficialApiAccount): string {
  return `${account.appId}:${account.appSecret}`;
}

function parseExpiresInSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  // QQ official token usually lasts around 2 hours.
  // Fall back to 5 minutes if the API omits expiration metadata.
  return 300;
}

function resolveApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }
  const record = payload as QqOfficialApiError;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  if (typeof record.err_code === "number") {
    return `err_code ${String(record.err_code)}`;
  }
  if (typeof record.code === "number") {
    return `code ${String(record.code)}`;
  }
  return fallback;
}

function buildApiHeaders(params: { appId: string; accessToken: string }): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `QQBot ${params.accessToken}`,
    "X-Union-Appid": params.appId,
  };
}

async function withAbortTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getQqAppAccessToken(
  account: QqOfficialApiAccount,
  timeoutMs = 10_000,
): Promise<string> {
  const appId = account.appId.trim();
  const appSecret = account.appSecret.trim();
  if (!appId) {
    throw new Error("QQ official appId is required");
  }
  if (!appSecret) {
    throw new Error("QQ official appSecret is required");
  }

  const cacheKey = resolveAccessTokenCacheKey(account);
  const cached = accessTokenCache.get(cacheKey);
  const nowMs = Date.now();
  if (cached && cached.expiresAtMs - ACCESS_TOKEN_REFRESH_BUFFER_MS > nowMs) {
    return cached.accessToken;
  }

  const tokenDomain = resolveTokenDomain(account.tokenDomain);
  const tokenResponse = await withAbortTimeout(timeoutMs, async (signal) => {
    return await fetch(`${tokenDomain}/app/getAppAccessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId,
        clientSecret: appSecret,
      }),
      signal,
    });
  });

  if (!tokenResponse.ok) {
    throw new Error(
      `QQ token API failed: HTTP ${String(tokenResponse.status)} ${tokenResponse.statusText}`,
    );
  }

  const payload = (await tokenResponse.json()) as QqAccessTokenResponse;
  if (typeof payload.code === "number" && payload.code !== 0) {
    throw new Error(resolveApiErrorMessage(payload, "QQ token API rejected credentials"));
  }
  const accessToken = payload.access_token?.trim();
  if (!accessToken) {
    throw new Error("QQ token API returned empty access_token");
  }
  const expiresInSeconds = parseExpiresInSeconds(payload.expires_in);
  accessTokenCache.set(cacheKey, {
    accessToken,
    expiresAtMs: nowMs + expiresInSeconds * 1000,
  });
  return accessToken;
}

export async function callQqOfficialApi<T>(
  account: QqOfficialApiAccount,
  request: QqApiRequest,
): Promise<T> {
  const timeoutMs = request.timeoutMs ?? 10_000;
  const accessToken = await getQqAppAccessToken(account, timeoutMs);
  const baseUrl = normalizeQqApiBaseUrl(account.apiBaseUrl);
  const url = `${baseUrl}${request.path}`;

  const response = await withAbortTimeout(timeoutMs, async (signal) => {
    return await fetch(url, {
      method: request.method,
      headers: buildApiHeaders({
        appId: account.appId,
        accessToken,
      }),
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal,
    });
  });

  const rawBody = await response.text();
  const parsedBody =
    rawBody.trim().length > 0
      ? (() => {
          try {
            return JSON.parse(rawBody) as unknown;
          } catch {
            return rawBody;
          }
        })()
      : null;

  if (!response.ok) {
    const errorMessage = resolveApiErrorMessage(parsedBody, rawBody || response.statusText);
    throw new Error(`QQ official API failed: ${errorMessage}`);
  }

  if (!parsedBody) {
    return {} as T;
  }
  return parsedBody as T;
}

export async function sendQqGroupMessage(
  account: QqOfficialApiAccount,
  params: { groupId: string; content: string; replyToMessageId?: string },
): Promise<{ id?: string; message_id?: string }> {
  const groupId = params.groupId.trim();
  if (!groupId) {
    throw new Error("groupId is required");
  }
  return await callQqOfficialApi<{ id?: string; message_id?: string }>(account, {
    method: "POST",
    path: `/v2/groups/${encodeURIComponent(groupId)}/messages`,
    body: {
      content: params.content,
      msg_type: 0,
      ...(params.replyToMessageId?.trim() ? { msg_id: params.replyToMessageId.trim() } : {}),
    },
  });
}

export async function sendQqC2cMessage(
  account: QqOfficialApiAccount,
  params: { userId: string; content: string; replyToMessageId?: string },
): Promise<{ id?: string; message_id?: string }> {
  const userId = params.userId.trim();
  if (!userId) {
    throw new Error("userId is required");
  }
  return await callQqOfficialApi<{ id?: string; message_id?: string }>(account, {
    method: "POST",
    path: `/v2/users/${encodeURIComponent(userId)}/messages`,
    body: {
      content: params.content,
      msg_type: 0,
      ...(params.replyToMessageId?.trim() ? { msg_id: params.replyToMessageId.trim() } : {}),
    },
  });
}

export async function getQqBotIdentity(
  account: QqOfficialApiAccount,
  timeoutMs = 4_000,
): Promise<{ id?: string; username?: string }> {
  return await callQqOfficialApi<{ id?: string; username?: string }>(account, {
    method: "GET",
    path: "/users/@me",
    timeoutMs,
  });
}
