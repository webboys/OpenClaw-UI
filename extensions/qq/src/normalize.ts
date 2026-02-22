import type { QqGroupConfig } from "./types.js";

const CHANNEL_PREFIX_RE = /^(qq|qqbot|onebot):/i;
const USER_PREFIX_RE = /^(user|private|u):/i;
const GROUP_PREFIX_RE = /^(group|g):/i;
const QQ_ID_RE = /^[A-Za-z0-9_-]{3,}$/;

export function normalizeQqApiBaseUrl(raw?: string | null): string {
  const trimmed = raw?.trim() || "https://api.sgroup.qq.com";
  return trimmed.replace(/\/+$/, "");
}

function stripChannelPrefix(raw: string): string {
  return raw.replace(CHANNEL_PREFIX_RE, "").trim();
}

function isLikelyQqId(raw: string): boolean {
  return QQ_ID_RE.test(raw);
}

export function normalizeQqAllowEntry(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const withoutChannelPrefix = stripChannelPrefix(trimmed);
  if (!withoutChannelPrefix) {
    return "";
  }
  if (withoutChannelPrefix === "*") {
    return "*";
  }
  if (GROUP_PREFIX_RE.test(withoutChannelPrefix)) {
    return withoutChannelPrefix.replace(GROUP_PREFIX_RE, "").trim();
  }
  if (USER_PREFIX_RE.test(withoutChannelPrefix)) {
    return withoutChannelPrefix.replace(USER_PREFIX_RE, "").trim();
  }
  return withoutChannelPrefix;
}

export function normalizeQqMessagingTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const withoutChannelPrefix = stripChannelPrefix(trimmed);
  if (!withoutChannelPrefix) {
    return undefined;
  }
  if (GROUP_PREFIX_RE.test(withoutChannelPrefix)) {
    return `group:${withoutChannelPrefix.replace(GROUP_PREFIX_RE, "").trim()}`;
  }
  if (USER_PREFIX_RE.test(withoutChannelPrefix)) {
    return `user:${withoutChannelPrefix.replace(USER_PREFIX_RE, "").trim()}`;
  }
  return withoutChannelPrefix;
}

export function looksLikeQqTargetId(raw: string): boolean {
  const normalized = normalizeQqMessagingTarget(raw);
  if (!normalized) {
    return false;
  }
  if (GROUP_PREFIX_RE.test(normalized)) {
    const id = normalized.replace(GROUP_PREFIX_RE, "").trim();
    return isLikelyQqId(id);
  }
  if (USER_PREFIX_RE.test(normalized)) {
    const id = normalized.replace(USER_PREFIX_RE, "").trim();
    return isLikelyQqId(id);
  }
  return isLikelyQqId(normalized);
}

export function parseQqOutboundTarget(
  raw: string,
): { kind: "private" | "group"; id: string } | { kind: null; error: string } {
  const normalized = normalizeQqMessagingTarget(raw);
  if (!normalized) {
    return { kind: null, error: "empty target" };
  }
  if (GROUP_PREFIX_RE.test(normalized)) {
    const groupId = normalized.replace(GROUP_PREFIX_RE, "").trim();
    if (isLikelyQqId(groupId)) {
      return { kind: "group", id: groupId };
    }
    return {
      kind: null,
      error: `unsupported group target id: ${groupId || "<empty>"}`,
    };
  }
  if (USER_PREFIX_RE.test(normalized)) {
    const userId = normalized.replace(USER_PREFIX_RE, "").trim();
    if (isLikelyQqId(userId)) {
      return { kind: "private", id: userId };
    }
    return {
      kind: null,
      error: `unsupported user target id: ${userId || "<empty>"}`,
    };
  }
  if (isLikelyQqId(normalized)) {
    return { kind: "private", id: normalized };
  }
  return {
    kind: null,
    error: `unsupported target format: ${normalized}; use <qqOpenId>, user:<qqOpenId>, or group:<groupOpenId>`,
  };
}

export function resolveQqGroupConfig(params: {
  groups?: Record<string, QqGroupConfig | undefined>;
  groupId?: string | null;
}): QqGroupConfig | undefined {
  const groups = params.groups ?? {};
  const groupId = params.groupId?.trim();
  if (!groupId) {
    return groups["*"];
  }
  return groups[groupId] ?? groups[`group:${groupId}`] ?? groups["*"];
}
