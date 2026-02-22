import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import { resolveQqAccount } from "./accounts.js";
import { sendQqC2cMessage, sendQqGroupMessage, type QqOfficialApiAccount } from "./api.js";
import { normalizeQqApiBaseUrl, parseQqOutboundTarget } from "./normalize.js";

export type QqSendOptions = {
  cfg?: OpenClawConfig;
  accountId?: string;
  apiBaseUrl?: string;
  appId?: string;
  appSecret?: string;
  mediaUrl?: string;
  caption?: string;
  replyToMessageId?: string;
};

export type QqSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

function resolveApiAccount(options: QqSendOptions): QqOfficialApiAccount | null {
  if (options.cfg) {
    const account = resolveQqAccount({
      cfg: options.cfg,
      accountId: options.accountId ?? DEFAULT_ACCOUNT_ID,
    });
    if (!account.appId.trim() || !account.appSecret.trim()) {
      return null;
    }
    return {
      apiBaseUrl: normalizeQqApiBaseUrl(account.apiBaseUrl || options.apiBaseUrl),
      appId: options.appId ?? account.appId,
      appSecret: options.appSecret ?? account.appSecret,
    };
  }
  const apiBaseUrl = normalizeQqApiBaseUrl(
    options.apiBaseUrl ?? process.env.QQ_BOT_API_BASE_URL ?? "https://api.sgroup.qq.com",
  );
  const appId = options.appId ?? process.env.QQ_BOT_APP_ID ?? "";
  const appSecret = options.appSecret ?? process.env.QQ_BOT_APP_SECRET ?? process.env.QQ_APP_SECRET;
  if (!appId.trim() || !appSecret?.trim()) {
    return null;
  }
  return { apiBaseUrl, appId, appSecret };
}

function buildTextPayload(text: string, mediaUrl?: string, caption?: string): string {
  const normalizedText = text.trim();
  if (!mediaUrl?.trim()) {
    return normalizedText;
  }
  const effectiveCaption = caption?.trim() || normalizedText;
  return effectiveCaption
    ? `${effectiveCaption}\n\nAttachment: ${mediaUrl.trim()}`
    : mediaUrl.trim();
}

export async function sendMessageQq(
  target: string,
  text: string,
  options: QqSendOptions = {},
): Promise<QqSendResult> {
  const parsed = parseQqOutboundTarget(target);
  if (!parsed.kind) {
    return { ok: false, error: parsed.error };
  }

  const message = buildTextPayload(text, options.mediaUrl, options.caption);
  if (!message.trim()) {
    return { ok: false, error: "message text is empty" };
  }

  const apiAccount = resolveApiAccount(options);
  if (!apiAccount) {
    return { ok: false, error: "missing QQ official credentials (appId/appSecret)" };
  }

  try {
    const response =
      parsed.kind === "group"
        ? await sendQqGroupMessage(apiAccount, {
            groupId: parsed.id,
            content: message,
            replyToMessageId: options.replyToMessageId,
          })
        : await sendQqC2cMessage(apiAccount, {
            userId: parsed.id,
            content: message,
            replyToMessageId: options.replyToMessageId,
          });
    return {
      ok: true,
      messageId:
        response.id != null
          ? String(response.id)
          : response.message_id != null
            ? String(response.message_id)
            : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
