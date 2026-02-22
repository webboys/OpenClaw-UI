import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/account-id";
import { normalizeQqApiBaseUrl } from "./normalize.js";
import { resolveQqAppSecret } from "./token.js";
import type { QqAccountConfig, QqConfig, ResolvedQqAccount } from "./types.js";

export type { ResolvedQqAccount };

function listConfiguredAccountIds(cfg: OpenClawConfig): string[] {
  const accounts = (cfg.channels?.qq as QqConfig | undefined)?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return Object.keys(accounts).filter(Boolean);
}

export function listQqAccountIds(cfg: OpenClawConfig): string[] {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}

export function resolveDefaultQqAccountId(cfg: OpenClawConfig): string {
  const qqConfig = cfg.channels?.qq as QqConfig | undefined;
  if (qqConfig?.defaultAccount?.trim()) {
    return qqConfig.defaultAccount.trim();
  }
  const ids = listQqAccountIds(cfg);
  if (ids.includes(DEFAULT_ACCOUNT_ID)) {
    return DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

function resolveAccountConfig(cfg: OpenClawConfig, accountId: string): QqAccountConfig | undefined {
  const accounts = (cfg.channels?.qq as QqConfig | undefined)?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  return accounts[accountId] as QqAccountConfig | undefined;
}

function mergeQqAccountConfig(cfg: OpenClawConfig, accountId: string): QqAccountConfig {
  const raw = (cfg.channels?.qq ?? {}) as QqConfig;
  const { accounts: _accounts, defaultAccount: _defaultAccount, ...base } = raw;
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}

export function resolveQqAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedQqAccount {
  const accountId = normalizeAccountId(params.accountId);
  const merged = mergeQqAccountConfig(params.cfg, accountId);
  const baseEnabled = (params.cfg.channels?.qq as QqConfig | undefined)?.enabled !== false;
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const appSecret = resolveQqAppSecret(params.cfg.channels?.qq as QqConfig | undefined, accountId);
  const envApiBaseUrl =
    accountId === DEFAULT_ACCOUNT_ID ? process.env.QQ_BOT_API_BASE_URL?.trim() : "";
  const envAppId = accountId === DEFAULT_ACCOUNT_ID ? process.env.QQ_BOT_APP_ID?.trim() : "";
  const apiBaseUrl = normalizeQqApiBaseUrl(merged.apiBaseUrl?.trim() || envApiBaseUrl || undefined);
  const appId = merged.appId?.trim() || envAppId || "";

  return {
    accountId,
    name: merged.name?.trim() || undefined,
    enabled,
    apiBaseUrl,
    appId,
    appSecret: appSecret.token,
    secretSource: appSecret.source,
    config: merged,
  };
}

export function listEnabledQqAccounts(cfg: OpenClawConfig): ResolvedQqAccount[] {
  return listQqAccountIds(cfg)
    .map((accountId) => resolveQqAccount({ cfg, accountId }))
    .filter((account) => account.enabled);
}
