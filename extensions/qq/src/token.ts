import { readFileSync } from "node:fs";
import { type BaseTokenResolution, DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import type { QqConfig } from "./types.js";

export type QqSecretResolution = BaseTokenResolution & {
  source: "env" | "config" | "configFile" | "none";
};

function resolveSecretFromEntry(
  entry: { appSecret?: string; appSecretFile?: string } | undefined,
): {
  token: string;
  source: "config" | "configFile" | "none";
} {
  const directSecret = entry?.appSecret?.trim();
  if (directSecret) {
    return { token: directSecret, source: "config" };
  }
  const secretFile = entry?.appSecretFile?.trim();
  if (secretFile) {
    try {
      const fileSecret = readFileSync(secretFile, "utf8").trim();
      if (fileSecret) {
        return { token: fileSecret, source: "configFile" };
      }
    } catch {
      // Ignore missing or unreadable files here.
    }
  }
  return { token: "", source: "none" };
}

export function resolveQqAppSecret(
  config: QqConfig | undefined,
  accountId?: string | null,
): QqSecretResolution {
  const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
  const isDefaultAccount = resolvedAccountId === DEFAULT_ACCOUNT_ID;

  if (!isDefaultAccount) {
    const accountConfig = config?.accounts?.[resolvedAccountId];
    const accountSecret = resolveSecretFromEntry(accountConfig);
    if (accountSecret.source !== "none") {
      return accountSecret;
    }
  }

  const baseSecret = resolveSecretFromEntry(config);
  if (baseSecret.source !== "none") {
    return baseSecret;
  }

  if (isDefaultAccount) {
    const envSecret = process.env.QQ_BOT_APP_SECRET?.trim() || process.env.QQ_APP_SECRET?.trim();
    if (envSecret) {
      return { token: envSecret, source: "env" };
    }
  }

  return { token: "", source: "none" };
}
