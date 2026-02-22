#!/usr/bin/env -S node --import tsx

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { config as loadDotenv } from "dotenv";

type ParsedArgs = {
  envFiles: string[];
  dryRun: boolean;
  skipStatusProbe: boolean;
  skipApiProbe: boolean;
};

type QqOfficialProbeResult = {
  ok: boolean;
  message: string;
  botId?: string;
  botUsername?: string;
};

type QqTokenResponse = {
  code?: number;
  message?: string;
  access_token?: string;
};

const DEFAULT_ENV_FILES = [".env.qq", ".env"];
const DM_POLICIES = new Set(["pairing", "allowlist", "open", "disabled"]);
const DEFAULT_QQ_API_BASE_URL = "https://api.sgroup.qq.com";
const DEFAULT_QQ_TOKEN_DOMAIN = "https://bots.qq.com";

function parseArgs(argv: string[]): ParsedArgs {
  const envFiles: string[] = [];
  let dryRun = false;
  let skipStatusProbe = false;
  let skipApiProbe = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      continue;
    }
    if (arg === "--env-file") {
      const next = argv[i + 1];
      if (!next?.trim()) {
        throw new Error("Missing value for --env-file");
      }
      envFiles.push(next.trim());
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--skip-status-probe") {
      skipStatusProbe = true;
      continue;
    }
    if (arg === "--skip-api-probe") {
      skipApiProbe = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsageAndExit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    envFiles: envFiles.length > 0 ? envFiles : DEFAULT_ENV_FILES,
    dryRun,
    skipStatusProbe,
    skipApiProbe,
  };
}

function printUsageAndExit(code: number): never {
  // eslint-disable-next-line no-console
  console.log(
    [
      "Usage: node --import tsx scripts/qq-first-deploy.ts [options]",
      "",
      "Options:",
      "  --env-file <path>       Additional env file (repeatable)",
      "  --dry-run               Print what would be changed without writing config",
      "  --skip-status-probe     Skip `openclaw channels status --probe`",
      "  --skip-api-probe        Skip QQ official credential/API probe",
      "  --help                  Show this help",
      "",
      "Env variables:",
      `  QQ_BOT_API_BASE_URL     Optional, default ${DEFAULT_QQ_API_BASE_URL}`,
      "  QQ_BOT_APP_ID           Required",
      "  QQ_BOT_APP_SECRET       Required (QQ_APP_SECRET accepted as fallback)",
      "  QQ_OFFICIAL_WEBHOOK_PATH Optional, default /qq-official-webhook",
      "  QQ_BOT_TOKEN_DOMAIN     Optional, default https://bots.qq.com",
      "  QQ_DM_POLICY            Optional: pairing|allowlist|open|disabled (default pairing)",
      "  QQ_ALLOW_FROM           Optional list: openid_a,openid_b",
    ].join("\n"),
  );
  process.exit(code);
}

function loadEnvFiles(envFiles: string[]): string[] {
  const loaded: string[] = [];
  for (const rawFile of envFiles) {
    const resolved = path.resolve(rawFile);
    if (!existsSync(resolved)) {
      continue;
    }
    loadDotenv({ path: resolved, override: false });
    loaded.push(resolved);
  }
  return loaded;
}

function normalizeApiBaseUrl(raw?: string): string {
  const trimmed = raw?.trim() || DEFAULT_QQ_API_BASE_URL;
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`QQ_BOT_API_BASE_URL must start with http:// or https://, got "${raw}"`);
  }
  return trimmed.replace(/\/+$/, "");
}

function normalizeTokenDomain(raw?: string): string {
  const trimmed = raw?.trim() || DEFAULT_QQ_TOKEN_DOMAIN;
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`QQ_BOT_TOKEN_DOMAIN must start with http:// or https://, got "${raw}"`);
  }
  return trimmed.replace(/\/+$/, "");
}

function normalizeWebhookPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "/qq-official-webhook";
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

function parseAllowFromList(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return Array.from(
    new Set(
      raw
        .split(/[\n,;]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function resolveDmPolicy(raw?: string): string {
  const value = raw?.trim().toLowerCase() || "pairing";
  if (!DM_POLICIES.has(value)) {
    throw new Error(
      `Invalid QQ_DM_POLICY "${raw}", expected one of: pairing, allowlist, open, disabled`,
    );
  }
  return value;
}

function parseQqToken(
  payload: unknown,
): { ok: true; accessToken: string } | { ok: false; message: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "QQ token API response is empty" };
  }
  const record = payload as QqTokenResponse;
  if (typeof record.code === "number" && record.code !== 0) {
    return {
      ok: false,
      message:
        record.message?.trim() || `QQ token API rejected credentials (code=${String(record.code)})`,
    };
  }
  const accessToken = record.access_token?.trim();
  if (!accessToken) {
    return { ok: false, message: "QQ token API returned empty access_token" };
  }
  return { ok: true, accessToken };
}

async function probeQqOfficial(params: {
  tokenDomain: string;
  apiBaseUrl: string;
  appId: string;
  appSecret: string;
}): Promise<QqOfficialProbeResult> {
  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(`${params.tokenDomain}/app/getAppAccessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: params.appId,
        clientSecret: params.appSecret,
      }),
    });
  } catch (err) {
    return {
      ok: false,
      message: `Failed to reach QQ token API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!tokenResponse.ok) {
    return {
      ok: false,
      message: `QQ token API returned HTTP ${String(tokenResponse.status)} ${tokenResponse.statusText}`,
    };
  }

  let tokenPayload: unknown;
  try {
    tokenPayload = await tokenResponse.json();
  } catch (err) {
    return {
      ok: false,
      message: `QQ token API response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const tokenResult = parseQqToken(tokenPayload);
  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  let profileResponse: Response;
  try {
    profileResponse = await fetch(`${params.apiBaseUrl}/users/@me`, {
      method: "GET",
      headers: {
        Authorization: `QQBot ${tokenResult.accessToken}`,
        "X-Union-Appid": params.appId,
      },
    });
  } catch (err) {
    return {
      ok: false,
      message: `Failed to reach QQ official API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!profileResponse.ok) {
    return {
      ok: false,
      message: `QQ official API /users/@me returned HTTP ${String(profileResponse.status)} ${profileResponse.statusText}`,
    };
  }

  let profilePayload: unknown;
  try {
    profilePayload = await profileResponse.json();
  } catch (err) {
    return {
      ok: false,
      message: `QQ official API /users/@me response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!profilePayload || typeof profilePayload !== "object" || Array.isArray(profilePayload)) {
    return {
      ok: true,
      message: "QQ official probe passed (bot profile payload is empty)",
    };
  }

  const profile = profilePayload as { id?: unknown; username?: unknown };
  const botId =
    typeof profile.id === "string" || typeof profile.id === "number"
      ? String(profile.id)
      : undefined;
  const botUsername = typeof profile.username === "string" ? profile.username : undefined;
  return {
    ok: true,
    message: "QQ official probe passed",
    botId,
    botUsername,
  };
}

function runCommand(
  command: string,
  args: string[],
  inheritOutput: boolean,
): SpawnSyncReturns<Buffer> {
  return spawnSync(command, args, {
    stdio: inheritOutput ? "inherit" : "pipe",
    shell: false,
    windowsHide: true,
  });
}

function runOpenclaw(args: string[], options?: { inheritOutput?: boolean }): void {
  const inheritOutput = options?.inheritOutput ?? true;
  const corepackCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";
  const attempts: Array<{ command: string; args: string[] }> = [
    { command: corepackCommand, args: ["pnpm", "openclaw", ...args] },
    { command: "openclaw", args },
  ];

  let lastError = "";
  for (const attempt of attempts) {
    const result = runCommand(attempt.command, attempt.args, inheritOutput);
    if (!result.error && result.status === 0) {
      return;
    }
    if (!result.error && result.status != null && result.status !== 0) {
      lastError = `${attempt.command} ${attempt.args.join(" ")} exited with code ${String(result.status)}`;
      continue;
    }
    if (result.error) {
      lastError = `${attempt.command}: ${result.error.message}`;
    }
  }

  throw new Error(lastError || "failed to execute openclaw command");
}

function runOpenclawSet(pathKey: string, value: unknown, dryRun: boolean): void {
  const valueJson = JSON.stringify(value);
  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[dry-run] openclaw config set ${pathKey} ${valueJson} --json`);
    return;
  }
  runOpenclaw(["config", "set", pathKey, valueJson, "--json"]);
}

function printSummary(params: {
  loadedFiles: string[];
  apiBaseUrl: string;
  webhookPath: string;
  dmPolicy: string;
  allowFrom: string[];
  appId: string;
  dryRun: boolean;
  probe: QqOfficialProbeResult;
}): void {
  const loaded = params.loadedFiles.length > 0 ? params.loadedFiles.join(", ") : "(none)";
  const lines = [
    "",
    "QQ quick setup summary",
    `- env files loaded: ${loaded}`,
    `- apiBaseUrl: ${params.apiBaseUrl}`,
    `- webhookPath: ${params.webhookPath}`,
    `- dmPolicy: ${params.dmPolicy}`,
    `- allowFrom entries: ${params.allowFrom.length}`,
    `- appId: ${params.appId}`,
    `- QQ official probe: ${params.probe.ok ? "ok" : "failed"}${params.probe.botId ? ` (id=${params.probe.botId})` : ""}${params.probe.botUsername ? ` (${params.probe.botUsername})` : ""}`,
    `- probe detail: ${params.probe.message}`,
    params.dryRun ? "- mode: dry-run (no config written)" : "- mode: applied",
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loadedFiles = loadEnvFiles(args.envFiles);

  const appId = process.env.QQ_BOT_APP_ID?.trim();
  if (!appId) {
    throw new Error("Missing QQ_BOT_APP_ID. Put it in .env.qq or .env.");
  }

  const appSecret = process.env.QQ_BOT_APP_SECRET?.trim() || process.env.QQ_APP_SECRET?.trim();
  if (!appSecret) {
    throw new Error("Missing QQ_BOT_APP_SECRET (or QQ_APP_SECRET fallback).");
  }

  const apiBaseUrl = normalizeApiBaseUrl(process.env.QQ_BOT_API_BASE_URL);
  const tokenDomain = normalizeTokenDomain(process.env.QQ_BOT_TOKEN_DOMAIN);
  const webhookPath = normalizeWebhookPath(
    process.env.QQ_OFFICIAL_WEBHOOK_PATH || "/qq-official-webhook",
  );
  const dmPolicy = resolveDmPolicy(process.env.QQ_DM_POLICY);
  const allowFrom = parseAllowFromList(process.env.QQ_ALLOW_FROM);

  const probe = args.skipApiProbe
    ? { ok: true, message: "QQ official probe skipped" }
    : await probeQqOfficial({
        tokenDomain,
        apiBaseUrl,
        appId,
        appSecret,
      });
  if (!probe.ok) {
    throw new Error(probe.message);
  }

  runOpenclawSet("channels.qq.enabled", true, args.dryRun);
  runOpenclawSet("channels.qq.apiBaseUrl", apiBaseUrl, args.dryRun);
  runOpenclawSet("channels.qq.appId", appId, args.dryRun);
  runOpenclawSet("channels.qq.appSecret", appSecret, args.dryRun);
  runOpenclawSet("channels.qq.webhookPath", webhookPath, args.dryRun);
  runOpenclawSet("channels.qq.dmPolicy", dmPolicy, args.dryRun);

  if (allowFrom.length > 0) {
    runOpenclawSet("channels.qq.allowFrom", allowFrom, args.dryRun);
  }

  printSummary({
    loadedFiles,
    apiBaseUrl,
    webhookPath,
    dmPolicy,
    allowFrom,
    appId,
    dryRun: args.dryRun,
    probe,
  });

  if (!args.dryRun && !args.skipStatusProbe) {
    // eslint-disable-next-line no-console
    console.log("\nRunning channel probe...");
    runOpenclaw(["channels", "status", "--probe"], { inheritOutput: true });
  }

  if (!args.dryRun) {
    // eslint-disable-next-line no-console
    console.log("\nNext step: restart gateway if it is already running.");
    // eslint-disable-next-line no-console
    console.log("Command: openclaw gateway run --bind 0.0.0.0 --port 18789 --force");
  }
}

await main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`qq-first-deploy failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
