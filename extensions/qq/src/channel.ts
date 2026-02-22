import type {
  ChannelAccountSnapshot,
  ChannelDock,
  ChannelGroupContext,
  ChannelPlugin,
  GroupToolPolicyConfig,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import {
  applyAccountNameToChannelSection,
  buildChannelConfigSchema,
  chunkTextForOutbound,
  DEFAULT_ACCOUNT_ID,
  deleteAccountFromConfigSection,
  formatPairingApproveHint,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  PAIRING_APPROVED_MESSAGE,
  resolveChannelAccountConfigBasePath,
  setAccountEnabledInConfigSection,
} from "openclaw/plugin-sdk";
import {
  listQqAccountIds,
  resolveDefaultQqAccountId,
  resolveQqAccount,
  type ResolvedQqAccount,
} from "./accounts.js";
import { getQqBotIdentity } from "./api.js";
import { QqConfigSchema } from "./config-schema.js";
import {
  looksLikeQqTargetId,
  normalizeQqApiBaseUrl,
  normalizeQqAllowEntry,
  normalizeQqMessagingTarget,
  resolveQqGroupConfig,
} from "./normalize.js";
import { qqOnboardingAdapter } from "./onboarding.js";
import { sendMessageQq } from "./send.js";
import type { QqGroupConfig } from "./types.js";

const meta = {
  id: "qq",
  label: "QQ",
  selectionLabel: "QQ (Official Bot API)",
  docsPath: "/channels/qq",
  docsLabel: "qq",
  blurb: "QQ official bot integration via QQ Bot API callback + send endpoints.",
  aliases: ["qqbot"],
  order: 78,
  quickstartAllowFrom: true,
};

type QqSetupInput = {
  name?: string;
  apiBaseUrl?: string;
  appId?: string;
  appSecret?: string;
  appSecretFile?: string;
  webhookPath?: string;
  useEnv?: boolean;
};

function resolveQqGroupToolPolicy(params: ChannelGroupContext): GroupToolPolicyConfig | undefined {
  const account = resolveQqAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  return resolveQqGroupConfig({
    groups: account.config.groups,
    groupId: params.groupId ?? params.groupChannel,
  })?.tools;
}

function resolveQqRequireMention(params: ChannelGroupContext): boolean {
  const account = resolveQqAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  const groupConfig = resolveQqGroupConfig({
    groups: account.config.groups,
    groupId: params.groupId ?? params.groupChannel,
  });
  return groupConfig?.requireMention ?? true;
}

function normalizeGroupId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.replace(/^group:/i, "");
}

function formatQqAllowFrom(entries: Array<string | number>): string[] {
  return entries.map((entry) => normalizeQqAllowEntry(String(entry))).filter(Boolean);
}

export const qqDock: ChannelDock = {
  id: "qq",
  capabilities: {
    chatTypes: ["direct", "group"],
    media: true,
    blockStreaming: true,
  },
  outbound: { textChunkLimit: 1800 },
  config: {
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveQqAccount({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)),
    formatAllowFrom: ({ allowFrom }) => formatQqAllowFrom(allowFrom),
  },
  groups: {
    resolveRequireMention: resolveQqRequireMention,
    resolveToolPolicy: resolveQqGroupToolPolicy,
  },
  threading: {
    resolveReplyToMode: () => "off",
  },
};

export const qqPlugin: ChannelPlugin<ResolvedQqAccount> = {
  id: "qq",
  meta,
  onboarding: qqOnboardingAdapter,
  pairing: {
    idLabel: "qqOpenId",
    normalizeAllowEntry: (entry) => normalizeQqAllowEntry(entry),
    notifyApproval: async ({ cfg, id }) => {
      const result = await sendMessageQq(`user:${id}`, PAIRING_APPROVED_MESSAGE, { cfg });
      if (!result.ok) {
        throw new Error(result.error ?? "failed to send pairing approval");
      }
    },
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reactions: false,
    threads: false,
    polls: false,
    media: true,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.qq"] },
  configSchema: buildChannelConfigSchema(QqConfigSchema),
  config: {
    listAccountIds: (cfg) => listQqAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveQqAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultQqAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "qq",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "qq",
        accountId,
        clearBaseFields: [
          "name",
          "apiBaseUrl",
          "appId",
          "appSecret",
          "appSecretFile",
          "webhookPath",
        ],
      }),
    isConfigured: (account) =>
      Boolean(account.apiBaseUrl.trim() && account.appId.trim() && account.appSecret.trim()),
    describeAccount: (account): ChannelAccountSnapshot => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(
        account.apiBaseUrl.trim() && account.appId.trim() && account.appSecret.trim(),
      ),
      baseUrl: account.apiBaseUrl,
      application: { appId: account.appId },
      secretSource: account.secretSource,
    }),
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveQqAccount({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)),
    formatAllowFrom: ({ allowFrom }) => formatQqAllowFrom(allowFrom),
  },
  security: {
    resolveDmPolicy: ({ cfg, accountId, account }) => {
      const resolvedAccountId = accountId ?? account.accountId ?? DEFAULT_ACCOUNT_ID;
      const basePath = resolveChannelAccountConfigBasePath({
        cfg,
        channelKey: "qq",
        accountId: resolvedAccountId,
      });
      return {
        policy: account.config.dmPolicy ?? "pairing",
        allowFrom: account.config.allowFrom ?? [],
        policyPath: `${basePath}dmPolicy`,
        allowFromPath: basePath,
        approveHint: formatPairingApproveHint("qq"),
        normalizeEntry: (raw) => normalizeQqAllowEntry(raw),
      };
    },
  },
  groups: {
    resolveRequireMention: resolveQqRequireMention,
    resolveToolPolicy: resolveQqGroupToolPolicy,
  },
  messaging: {
    normalizeTarget: normalizeQqMessagingTarget,
    targetResolver: {
      looksLikeId: looksLikeQqTargetId,
      hint: "<qqOpenId|user:<qqOpenId>|group:<groupOpenId>>",
    },
  },
  directory: {
    self: async () => null,
    listPeers: async ({ cfg, accountId, query, limit }) => {
      const account = resolveQqAccount({ cfg, accountId });
      const q = query?.trim().toLowerCase() ?? "";
      const ids = new Set<string>();
      for (const entry of account.config.allowFrom ?? []) {
        const normalized = normalizeQqAllowEntry(String(entry));
        if (normalized && normalized !== "*") {
          ids.add(normalized);
        }
      }
      for (const entry of account.config.groupAllowFrom ?? []) {
        const normalized = normalizeQqAllowEntry(String(entry));
        if (normalized && normalized !== "*") {
          ids.add(normalized);
        }
      }
      return Array.from(ids)
        .filter((id) => (q ? id.includes(q) : true))
        .slice(0, limit && limit > 0 ? limit : undefined)
        .map((id) => ({ kind: "user", id }));
    },
    listGroups: async ({ cfg, accountId, query, limit }) => {
      const account = resolveQqAccount({ cfg, accountId });
      const q = query?.trim().toLowerCase() ?? "";
      const groups = Object.entries(account.config.groups ?? {})
        .filter(([key]) => key !== "*")
        .map(([key, value]) => ({ key: normalizeGroupId(key), value }))
        .filter(({ key, value }) => key && value?.enabled !== false && value?.allow !== false)
        .filter(({ key }) => (q ? key.toLowerCase().includes(q) : true))
        .slice(0, limit && limit > 0 ? limit : undefined)
        .map(({ key }) => ({ kind: "group" as const, id: `group:${key}` }));
      return groups;
    },
  },
  setup: {
    resolveAccountId: ({ accountId }) => normalizeAccountId(accountId),
    applyAccountName: ({ cfg, accountId, name }) =>
      applyAccountNameToChannelSection({
        cfg,
        channelKey: "qq",
        accountId,
        name,
      }),
    validateInput: ({ accountId, input }) => {
      const qqInput = input as QqSetupInput;
      if (qqInput.useEnv && accountId !== DEFAULT_ACCOUNT_ID) {
        return "QQ_BOT_APP_ID / QQ_BOT_APP_SECRET can only be used for the default account.";
      }
      if (!qqInput.useEnv && !qqInput.appId?.trim()) {
        return "QQ requires --app-id unless --use-env is set.";
      }
      if (!qqInput.useEnv && !qqInput.appSecret?.trim() && !qqInput.appSecretFile?.trim()) {
        return "QQ requires --app-secret (or --app-secret-file) unless --use-env is set.";
      }
      return null;
    },
    applyAccountConfig: ({ cfg, accountId, input }) => {
      const qqInput = input as QqSetupInput;
      const namedConfig = applyAccountNameToChannelSection({
        cfg,
        channelKey: "qq",
        accountId,
        name: qqInput.name,
      });
      const next =
        accountId !== DEFAULT_ACCOUNT_ID
          ? migrateBaseNameToDefaultAccount({
              cfg: namedConfig,
              channelKey: "qq",
            })
          : namedConfig;

      const credentialPatch = qqInput.useEnv
        ? {}
        : {
            ...(qqInput.appId?.trim() ? { appId: qqInput.appId.trim() } : {}),
            ...(qqInput.appSecretFile?.trim()
              ? { appSecretFile: qqInput.appSecretFile.trim(), appSecret: undefined }
              : qqInput.appSecret?.trim()
                ? { appSecret: qqInput.appSecret.trim(), appSecretFile: undefined }
                : {}),
          };

      if (accountId === DEFAULT_ACCOUNT_ID) {
        return {
          ...next,
          channels: {
            ...next.channels,
            qq: {
              ...next.channels?.qq,
              enabled: true,
              apiBaseUrl: normalizeQqApiBaseUrl(qqInput.apiBaseUrl),
              webhookPath: qqInput.webhookPath,
              ...credentialPatch,
            },
          },
        } as OpenClawConfig;
      }

      return {
        ...next,
        channels: {
          ...next.channels,
          qq: {
            ...next.channels?.qq,
            enabled: true,
            accounts: {
              ...next.channels?.qq?.accounts,
              [accountId]: {
                ...next.channels?.qq?.accounts?.[accountId],
                enabled: true,
                apiBaseUrl: normalizeQqApiBaseUrl(qqInput.apiBaseUrl),
                webhookPath: qqInput.webhookPath,
                ...credentialPatch,
              },
            },
          },
        },
      } as OpenClawConfig;
    },
  },
  outbound: {
    deliveryMode: "direct",
    chunker: chunkTextForOutbound,
    chunkerMode: "text",
    textChunkLimit: 1800,
    sendText: async ({ to, text, accountId, cfg }) => {
      const result = await sendMessageQq(to, text, {
        cfg,
        accountId: accountId ?? undefined,
      });
      return {
        channel: "qq",
        ok: result.ok,
        messageId: result.messageId ?? "",
        error: result.error ? new Error(result.error) : undefined,
      };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
      const result = await sendMessageQq(to, text, {
        cfg,
        accountId: accountId ?? undefined,
        mediaUrl,
      });
      return {
        channel: "qq",
        ok: result.ok,
        messageId: result.messageId ?? "",
        error: result.error ? new Error(result.error) : undefined,
      };
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      application:
        snapshot.application && typeof snapshot.application === "object"
          ? (snapshot.application as Record<string, unknown>)
          : undefined,
      configured: snapshot.configured ?? false,
      baseUrl: snapshot.baseUrl ?? null,
      appId:
        snapshot.application && typeof snapshot.application === "object"
          ? ((snapshot.application as Record<string, unknown>).appId ?? null)
          : null,
      secretSource: snapshot.secretSource ?? "none",
      running: snapshot.running ?? false,
      webhookPath: snapshot.webhookPath ?? null,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    probeAccount: async ({ account, timeoutMs }) => {
      try {
        const me = await getQqBotIdentity(
          {
            apiBaseUrl: account.apiBaseUrl,
            appId: account.appId,
            appSecret: account.appSecret,
          },
          timeoutMs,
        );
        return {
          status: "ok",
          id: me.id ?? null,
          username: me.username ?? null,
        };
      } catch (err) {
        return {
          status: "failed",
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(
        account.apiBaseUrl.trim() && account.appId.trim() && account.appSecret.trim(),
      ),
      apiBaseUrl: account.apiBaseUrl,
      application: { appId: account.appId },
      secretSource: account.secretSource,
      webhookPath: account.config.webhookPath ?? "/qq-official-webhook",
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      probe,
      lastInboundAt: runtime?.lastInboundAt ?? null,
      lastOutboundAt: runtime?.lastOutboundAt ?? null,
      dmPolicy: account.config.dmPolicy ?? "pairing",
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      if (!account.apiBaseUrl.trim()) {
        throw new Error(`QQ is not configured for "${account.accountId}" (missing apiBaseUrl).`);
      }
      if (!account.appId.trim()) {
        throw new Error(`QQ is not configured for "${account.accountId}" (missing appId).`);
      }
      if (!account.appSecret.trim()) {
        throw new Error(`QQ is not configured for "${account.accountId}" (missing appSecret).`);
      }
      const webhookPath = account.config.webhookPath ?? "/qq-official-webhook";
      ctx.setStatus({
        accountId: account.accountId,
        baseUrl: account.apiBaseUrl,
        application: { appId: account.appId },
        webhookPath,
      });
      ctx.log?.info(
        `[${account.accountId}] starting QQ official provider (webhook path ${webhookPath})`,
      );
      const { monitorQqProvider } = await import("./monitor.js");
      return await monitorQqProvider({
        account,
        config: ctx.cfg,
        runtime: ctx.runtime,
        abortSignal: ctx.abortSignal,
        statusSink: (patch) => ctx.setStatus({ accountId: ctx.accountId, ...patch }),
      });
    },
  },
};

export type { QqGroupConfig };
