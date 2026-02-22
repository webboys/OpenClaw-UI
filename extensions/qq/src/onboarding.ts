import type {
  ChannelOnboardingAdapter,
  ChannelOnboardingDmPolicy,
  OpenClawConfig,
  WizardPrompter,
} from "openclaw/plugin-sdk";
import {
  addWildcardAllowFrom,
  DEFAULT_ACCOUNT_ID,
  formatDocsLink,
  mergeAllowFromEntries,
  normalizeWebhookPath,
  normalizeAccountId,
  promptAccountId,
} from "openclaw/plugin-sdk";
import { listQqAccountIds, resolveDefaultQqAccountId, resolveQqAccount } from "./accounts.js";
import { normalizeQqApiBaseUrl } from "./normalize.js";

const channel = "qq" as const;

function updateQqAccountConfig(
  cfg: OpenClawConfig,
  accountId: string,
  patch: Record<string, unknown>,
): OpenClawConfig {
  if (accountId === DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        qq: {
          ...cfg.channels?.qq,
          enabled: true,
          ...patch,
        },
      },
    } as OpenClawConfig;
  }

  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      qq: {
        ...cfg.channels?.qq,
        enabled: true,
        accounts: {
          ...cfg.channels?.qq?.accounts,
          [accountId]: {
            ...cfg.channels?.qq?.accounts?.[accountId],
            enabled: cfg.channels?.qq?.accounts?.[accountId]?.enabled ?? true,
            ...patch,
          },
        },
      },
    },
  } as OpenClawConfig;
}

function setQqDmPolicy(
  cfg: OpenClawConfig,
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled",
): OpenClawConfig {
  const allowFrom =
    dmPolicy === "open" ? addWildcardAllowFrom(cfg.channels?.qq?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      qq: {
        ...cfg.channels?.qq,
        dmPolicy,
        ...(allowFrom ? { allowFrom } : {}),
      },
    },
  } as OpenClawConfig;
}

async function noteQqSetupHelp(prompter: WizardPrompter): Promise<void> {
  await prompter.note(
    [
      "QQ setup uses the official QQ Bot API.",
      "1) Create a QQ Bot app and enable official callback events.",
      "2) Prepare appId + appSecret credentials.",
      "3) Set callback URL to your OpenClaw gateway webhook path.",
      `Docs: ${formatDocsLink("/channels/qq", "channels/qq")}`,
    ].join("\n"),
    "QQ setup",
  );
}

async function promptQqAllowFrom(params: {
  cfg: OpenClawConfig;
  prompter: WizardPrompter;
  accountId: string;
}): Promise<OpenClawConfig> {
  const { cfg, prompter, accountId } = params;
  const account = resolveQqAccount({ cfg, accountId });
  const existing = account.config.allowFrom ?? [];

  const rawValue = await prompter.text({
    message: "QQ allowFrom (QQ openid, comma-separated)",
    placeholder: "openid1, openid2",
    initialValue: existing.length ? String(existing[0]) : undefined,
    validate: (value) => {
      if (!String(value ?? "").trim()) {
        return "Required";
      }
      return undefined;
    },
  });

  const entries = String(rawValue)
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const merged = mergeAllowFromEntries(existing, entries);
  return updateQqAccountConfig(cfg, accountId, {
    dmPolicy: "allowlist",
    allowFrom: merged,
  });
}

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "QQ",
  channel,
  policyKey: "channels.qq.dmPolicy",
  allowFromKey: "channels.qq.allowFrom",
  getCurrent: (cfg) => (cfg.channels?.qq?.dmPolicy ?? "pairing") as "pairing",
  setPolicy: (cfg, policy) => setQqDmPolicy(cfg, policy),
  promptAllowFrom: async ({ cfg, prompter, accountId }) => {
    const resolvedAccountId = normalizeAccountId(accountId) ?? resolveDefaultQqAccountId(cfg);
    return await promptQqAllowFrom({
      cfg,
      prompter,
      accountId: resolvedAccountId,
    });
  },
};

export const qqOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  dmPolicy,
  getStatus: async ({ cfg }) => {
    const configured = listQqAccountIds(cfg).some((accountId) => {
      const account = resolveQqAccount({ cfg, accountId });
      return Boolean(account.apiBaseUrl.trim() && account.appId.trim() && account.appSecret.trim());
    });
    return {
      channel,
      configured,
      statusLines: [
        `QQ: ${configured ? "configured" : "needs official appId + appSecret + callback setup"}`,
      ],
      selectionHint: configured ? "configured" : "requires QQ official bot credentials",
      quickstartScore: configured ? 1 : 8,
    };
  },
  configure: async ({
    cfg,
    prompter,
    accountOverrides,
    shouldPromptAccountIds,
    forceAllowFrom,
  }) => {
    const overrideId = accountOverrides.qq?.trim();
    const defaultAccountId = resolveDefaultQqAccountId(cfg);
    let accountId = overrideId ? normalizeAccountId(overrideId) : defaultAccountId;
    if (shouldPromptAccountIds && !overrideId) {
      accountId = await promptAccountId({
        cfg,
        prompter,
        label: "QQ",
        currentId: accountId,
        listAccountIds: listQqAccountIds,
        defaultAccountId,
      });
    }

    let next = cfg;
    const account = resolveQqAccount({ cfg: next, accountId });
    if (!account.appId.trim() || !account.appSecret.trim()) {
      await noteQqSetupHelp(prompter);
    }

    const envApiBaseUrl =
      accountId === DEFAULT_ACCOUNT_ID ? process.env.QQ_BOT_API_BASE_URL?.trim() : undefined;
    const apiBaseUrl = normalizeQqApiBaseUrl(
      String(
        await prompter.text({
          message: "QQ official API base URL",
          initialValue: account.config.apiBaseUrl || envApiBaseUrl || account.apiBaseUrl,
          validate: (value) => {
            const raw = String(value ?? "").trim();
            if (!raw) {
              return "Required";
            }
            if (!/^https?:\/\//i.test(raw)) {
              return "Use http:// or https://";
            }
            return undefined;
          },
        }),
      ),
    );
    next = updateQqAccountConfig(next, accountId, { apiBaseUrl });

    const envAppId = accountId === DEFAULT_ACCOUNT_ID ? process.env.QQ_BOT_APP_ID?.trim() : "";
    const appId = String(
      await prompter.text({
        message: "QQ bot appId",
        initialValue: account.config.appId || envAppId || account.appId || undefined,
        validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
      }),
    ).trim();
    next = updateQqAccountConfig(next, accountId, { appId });

    const envAppSecret =
      accountId === DEFAULT_ACCOUNT_ID
        ? process.env.QQ_BOT_APP_SECRET?.trim() || process.env.QQ_APP_SECRET?.trim()
        : "";
    const hasConfigSecret = Boolean(
      account.config.appSecret?.trim() || account.config.appSecretFile?.trim(),
    );
    const wantsSecret = await prompter.confirm({
      message: "Configure QQ bot appSecret?",
      initialValue: Boolean(hasConfigSecret || envAppSecret),
    });

    if (wantsSecret) {
      if (envAppSecret && accountId === DEFAULT_ACCOUNT_ID && !hasConfigSecret) {
        const useEnv = await prompter.confirm({
          message: "appSecret found in env. Use it instead of writing config?",
          initialValue: true,
        });
        if (!useEnv) {
          const appSecret = String(
            await prompter.text({
              message: "QQ bot appSecret",
              validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
            }),
          ).trim();
          next = updateQqAccountConfig(next, accountId, {
            appSecret,
            appSecretFile: undefined,
          });
        }
      } else {
        const appSecret = String(
          await prompter.text({
            message: "QQ bot appSecret",
            initialValue: account.config.appSecret || undefined,
            validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
          }),
        ).trim();
        next = updateQqAccountConfig(next, accountId, {
          appSecret,
          appSecretFile: undefined,
        });
      }
    }

    const webhookPath = normalizeWebhookPath(
      String(
        await prompter.text({
          message: "Gateway webhook path",
          initialValue: account.config.webhookPath || "/qq-official-webhook",
          validate: (value) => {
            const raw = String(value ?? "").trim();
            if (!raw) {
              return "Required";
            }
            if (!raw.startsWith("/")) {
              return "Path must start with /";
            }
            return undefined;
          },
        }),
      ),
    );
    next = updateQqAccountConfig(next, accountId, {
      webhookPath,
    });

    if (forceAllowFrom) {
      next = await promptQqAllowFrom({
        cfg: next,
        prompter,
        accountId,
      });
    }

    return { cfg: next, accountId };
  },
  disable: (cfg) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      qq: {
        ...cfg.channels?.qq,
        enabled: false,
      },
    },
  }),
};
