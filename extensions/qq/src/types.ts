import type { GroupToolPolicyConfig } from "openclaw/plugin-sdk";

export type QqDmPolicy = "pairing" | "allowlist" | "open" | "disabled";
export type QqGroupPolicy = "disabled" | "allowlist" | "open";

export type QqGroupConfig = {
  allow?: boolean;
  enabled?: boolean;
  requireMention?: boolean;
  allowFrom?: Array<string | number>;
  tools?: GroupToolPolicyConfig;
  systemPrompt?: string;
};

export type QqAccountConfig = {
  name?: string;
  enabled?: boolean;
  apiBaseUrl?: string;
  appId?: string;
  appSecret?: string;
  appSecretFile?: string;
  webhookPath?: string;
  dmPolicy?: QqDmPolicy;
  allowFrom?: Array<string | number>;
  groupPolicy?: QqGroupPolicy;
  groupAllowFrom?: Array<string | number>;
  groups?: Record<string, QqGroupConfig | undefined>;
  textChunkLimit?: number;
  chunkMode?: "length" | "newline";
  mediaMaxMb?: number;
  responsePrefix?: string;
  blockStreaming?: boolean;
};

export type QqConfig = {
  accounts?: Record<string, QqAccountConfig | undefined>;
  defaultAccount?: string;
} & QqAccountConfig;

export type QqSecretSource = "env" | "config" | "configFile" | "none";

export type ResolvedQqAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  apiBaseUrl: string;
  appId: string;
  appSecret: string;
  secretSource: QqSecretSource;
  config: QqAccountConfig;
};

export type QqWebhookPayload = {
  op?: number;
  s?: number;
  t?: string;
  id?: string;
  d?: unknown;
};

export type QqMessageAuthor = {
  id?: string;
  username?: string;
  nick?: string;
  user_openid?: string;
};

export type QqOfficialMessageData = {
  id?: string;
  content?: string;
  timestamp?: string;
  group_id?: string;
  group_openid?: string;
  msg_id?: string;
  author?: QqMessageAuthor;
};

export type QqOfficialApiError = {
  code?: number;
  message?: string;
  err_code?: number;
  trace_id?: string;
};

export type QqAccessTokenResponse = {
  code?: number;
  message?: string;
  access_token?: string;
  expires_in?: number | string;
};
