export type ParsedGatewayAccessInput = {
  gatewayUrl: string;
  token?: string;
  sessionKey?: string;
};

export type ParseGatewayAccessInputOptions = {
  baseUrl?: string;
};

const INVALID_LITERAL_VALUES = new Set(["undefined", "null"]);

function sanitizeParamValue(raw: string | null): string | undefined {
  if (raw == null) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (INVALID_LITERAL_VALUES.has(trimmed.toLowerCase())) {
    return undefined;
  }
  return trimmed;
}

function consumeParam(params: URLSearchParams, key: string): string | undefined {
  const value = sanitizeParamValue(params.get(key));
  if (params.has(key)) {
    params.delete(key);
  }
  return value;
}

function parseHashParams(hash: string): URLSearchParams {
  if (!hash) {
    return new URLSearchParams();
  }
  const withoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!withoutHash.includes("=") && !withoutHash.includes("&")) {
    return new URLSearchParams();
  }
  return new URLSearchParams(withoutHash);
}

function resolveBaseUrl(opts?: ParseGatewayAccessInputOptions): string | undefined {
  const fromOptions = opts?.baseUrl?.trim();
  if (fromOptions) {
    return fromOptions;
  }
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href;
  }
  return undefined;
}

function parseRawInput(raw: string, opts?: ParseGatewayAccessInputOptions): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  // Reject unencoded whitespace in access input to avoid normalizing malformed hosts.
  if (/\s/.test(trimmed)) {
    return null;
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  try {
    if (hasScheme) {
      return new URL(trimmed);
    }
    if (trimmed.startsWith("//")) {
      return new URL(`ws:${trimmed}`);
    }
    if (trimmed.startsWith("/")) {
      const baseUrl = resolveBaseUrl(opts);
      if (!baseUrl) {
        return null;
      }
      return new URL(trimmed, baseUrl);
    }
    return new URL(`ws://${trimmed}`);
  } catch {
    return null;
  }
}

function normalizeGatewayProtocol(protocol: string): "ws:" | "wss:" | null {
  const normalized = protocol.toLowerCase();
  if (normalized === "ws:" || normalized === "wss:") {
    return normalized;
  }
  if (normalized === "http:") {
    return "ws:";
  }
  if (normalized === "https:") {
    return "wss:";
  }
  return null;
}

function formatGatewayUrl(url: URL): string {
  const serialized = url.toString();
  if (url.pathname === "/" && !url.search) {
    return serialized.endsWith("/") ? serialized.slice(0, -1) : serialized;
  }
  return serialized;
}

export function parseGatewayAccessInput(
  raw: string,
  opts?: ParseGatewayAccessInputOptions,
): ParsedGatewayAccessInput | null {
  const parsed = parseRawInput(raw, opts);
  if (!parsed) {
    return null;
  }

  const hashParams = parseHashParams(parsed.hash);
  const token = consumeParam(hashParams, "token") ?? consumeParam(parsed.searchParams, "token");
  const sessionKey =
    consumeParam(hashParams, "session") ?? consumeParam(parsed.searchParams, "session");
  consumeParam(hashParams, "gatewayUrl");
  consumeParam(parsed.searchParams, "gatewayUrl");

  const nextProtocol = normalizeGatewayProtocol(parsed.protocol);
  if (!nextProtocol) {
    return null;
  }

  parsed.protocol = nextProtocol;
  // Never keep URL hash fragments on the websocket target.
  parsed.hash = "";

  return {
    gatewayUrl: formatGatewayUrl(parsed),
    token,
    sessionKey,
  };
}
