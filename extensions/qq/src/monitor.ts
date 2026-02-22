import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { MarkdownTableMode, OpenClawConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import {
  createReplyPrefixOptions,
  normalizeWebhookPath,
  registerWebhookTarget,
  rejectNonPostWebhookRequest,
  resolveSenderCommandAuthorization,
  resolveWebhookTargets,
} from "openclaw/plugin-sdk";
import type { ResolvedQqAccount } from "./accounts.js";
import { normalizeQqAllowEntry, resolveQqGroupConfig } from "./normalize.js";
import { getQqRuntime } from "./runtime.js";
import { sendMessageQq } from "./send.js";
import type { QqOfficialMessageData, QqWebhookPayload } from "./types.js";

export type QqMonitorOptions = {
  account: ResolvedQqAccount;
  config: OpenClawConfig;
  runtime: RuntimeEnv;
  abortSignal: AbortSignal;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
};

export type QqMonitorResult = {
  stop: () => void;
};

type QqCoreRuntime = ReturnType<typeof getQqRuntime>;

type WebhookTarget = {
  account: ResolvedQqAccount;
  config: OpenClawConfig;
  runtime: RuntimeEnv;
  core: QqCoreRuntime;
  path: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
};

const DEFAULT_WEBHOOK_PATH = "/qq-official-webhook";
const QQ_TEXT_LIMIT = 1800;

const QQ_OP_DISPATCH = 0;
const QQ_OP_HEARTBEAT = 1;
const QQ_OP_HEARTBEAT_ACK = 11;
const QQ_OP_DISPATCH_ACK = 12;
const QQ_OP_CALLBACK_VALIDATION = 13;

const QQ_EVENT_GROUP_AT_MESSAGE_CREATE = "GROUP_AT_MESSAGE_CREATE";
const QQ_EVENT_C2C_MESSAGE_CREATE = "C2C_MESSAGE_CREATE";

const QQ_SIGNATURE_HEADER = "x-signature-ed25519";
const QQ_TIMESTAMP_HEADER = "x-signature-timestamp";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

const webhookTargets = new Map<string, WebhookTarget[]>();
const ed25519KeyCache = new Map<string, { privateKey: KeyObject; publicKey: KeyObject }>();

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function logVerbose(core: QqCoreRuntime, runtime: RuntimeEnv, message: string): void {
  if (core.logging.shouldLogVerbose()) {
    runtime.log(`[qq] ${message}`);
  }
}

function normalizeAllowList(entries: Array<string | number> | undefined): string[] {
  return Array.from(
    new Set(
      (entries ?? [])
        .map((entry) => normalizeQqAllowEntry(String(entry)))
        .filter((entry) => Boolean(entry)),
    ),
  );
}

function isSenderAllowed(senderId: string, allowFrom: string[]): boolean {
  if (allowFrom.includes("*")) {
    return true;
  }
  const normalizedSenderId = normalizeQqAllowEntry(senderId);
  return allowFrom.some((entry) => normalizeQqAllowEntry(entry) === normalizedSenderId);
}

function resolveGroupAllowed(groupId: string, account: ResolvedQqAccount): boolean {
  const policy = account.config.groupPolicy ?? "allowlist";
  if (policy === "open") {
    return true;
  }
  if (policy === "disabled") {
    return false;
  }

  const matched = resolveQqGroupConfig({
    groups: account.config.groups,
    groupId,
  });
  if (!matched) {
    return false;
  }
  return matched.allow !== false && matched.enabled !== false;
}

function resolveTimestampMs(timestamp: string | undefined): number {
  if (!timestamp?.trim()) {
    return Date.now();
  }
  const parsed = Date.parse(timestamp);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return Date.now();
}

function resolveHeaderValue(headers: IncomingMessage["headers"], key: string): string {
  const raw = headers[key];
  if (Array.isArray(raw)) {
    return raw[0]?.trim() ?? "";
  }
  return typeof raw === "string" ? raw.trim() : "";
}

function deriveSeed(secret: string): Buffer {
  const raw = Buffer.from(secret, "utf8");
  let seed = Buffer.from(raw);
  while (seed.length < 32) {
    seed = Buffer.concat([seed, seed]);
  }
  return seed.subarray(0, 32);
}

function resolveEd25519KeyPair(secret: string): { privateKey: KeyObject; publicKey: KeyObject } {
  const cached = ed25519KeyCache.get(secret);
  if (cached) {
    return cached;
  }
  const seed = deriveSeed(secret);
  const privateKeyDer = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  const pair = { privateKey, publicKey };
  ed25519KeyCache.set(secret, pair);
  return pair;
}

function verifyOfficialWebhookSignature(params: {
  secret: string;
  req: IncomingMessage;
  rawBody: Buffer;
}): boolean {
  const signatureHex = resolveHeaderValue(params.req.headers, QQ_SIGNATURE_HEADER);
  const timestamp = resolveHeaderValue(params.req.headers, QQ_TIMESTAMP_HEADER);
  if (!signatureHex || !timestamp || !params.secret.trim()) {
    return false;
  }

  let signatureBuffer: Buffer;
  try {
    signatureBuffer = Buffer.from(signatureHex, "hex");
  } catch {
    return false;
  }
  if (signatureBuffer.length !== 64) {
    return false;
  }

  const message = Buffer.concat([Buffer.from(timestamp, "utf8"), params.rawBody]);
  const keyPair = resolveEd25519KeyPair(params.secret.trim());
  return verify(null, message, keyPair.publicKey, signatureBuffer);
}

function generateValidationSignature(params: {
  secret: string;
  eventTs: string;
  plainToken: string;
}): string {
  const keyPair = resolveEd25519KeyPair(params.secret.trim());
  const content = Buffer.concat([
    Buffer.from(params.eventTs, "utf8"),
    Buffer.from(params.plainToken, "utf8"),
  ]);
  return sign(null, content, keyPair.privateKey).toString("hex");
}

async function readJsonBodyWithRaw(params: {
  req: IncomingMessage;
  maxBytes: number;
  timeoutMs: number;
}): Promise<
  | { ok: true; rawBody: Buffer; json: unknown }
  | { ok: false; code: "PAYLOAD_TOO_LARGE" | "REQUEST_BODY_TIMEOUT" | "BAD_REQUEST" }
> {
  const { req, maxBytes, timeoutMs } = params;
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  return await new Promise((resolve) => {
    let settled = false;
    const done = (
      result:
        | { ok: true; rawBody: Buffer; json: unknown }
        | { ok: false; code: "PAYLOAD_TOO_LARGE" | "REQUEST_BODY_TIMEOUT" | "BAD_REQUEST" },
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      done({ ok: false, code: "REQUEST_BODY_TIMEOUT" });
      req.destroy();
    }, timeoutMs);

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        done({ ok: false, code: "PAYLOAD_TOO_LARGE" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const rawBody = Buffer.concat(chunks);
        const text = rawBody.toString("utf8");
        const json = JSON.parse(text) as unknown;
        done({ ok: true, rawBody, json });
      } catch {
        done({ ok: false, code: "BAD_REQUEST" });
      }
    });

    req.on("error", () => {
      done({ ok: false, code: "BAD_REQUEST" });
    });
  });
}

function stripQqMentions(content: string): string {
  return content.replace(/<@!?\w+>/g, "").trim();
}

function parseMessageData(eventType: string, payload: Record<string, unknown>) {
  const data = payload as QqOfficialMessageData;
  const contentRaw = typeof data.content === "string" ? data.content : "";
  const content = stripQqMentions(contentRaw) || contentRaw.trim();
  const author = data.author;
  const senderId =
    (typeof author?.id === "string" && author.id.trim()) ||
    (typeof author?.user_openid === "string" && author.user_openid.trim()) ||
    "";
  const senderName =
    (typeof author?.username === "string" && author.username.trim()) ||
    (typeof author?.nick === "string" && author.nick.trim()) ||
    senderId;
  const messageId =
    (typeof data.id === "string" && data.id.trim()) ||
    (typeof data.msg_id === "string" && data.msg_id.trim()) ||
    "";
  const groupIdCandidate =
    (typeof data.group_id === "string" && data.group_id.trim()) ||
    (typeof data.group_openid === "string" && data.group_openid.trim()) ||
    "";
  const isGroup = eventType === QQ_EVENT_GROUP_AT_MESSAGE_CREATE;

  return {
    content,
    senderId,
    senderName,
    messageId,
    groupId: isGroup ? groupIdCandidate : "",
    isGroup,
    timestampMs: resolveTimestampMs(data.timestamp),
  };
}

async function deliverQqReply(params: {
  payload: { text?: string; mediaUrls?: string[]; mediaUrl?: string };
  account: ResolvedQqAccount;
  target: string;
  runtime: RuntimeEnv;
  core: QqCoreRuntime;
  config: OpenClawConfig;
  tableMode: MarkdownTableMode;
  replyToMessageId?: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
}): Promise<void> {
  const {
    payload,
    account,
    target,
    runtime,
    core,
    config,
    tableMode,
    replyToMessageId,
    statusSink,
  } = params;
  const convertedText = core.channel.text
    .convertMarkdownTables(payload.text ?? "", tableMode)
    .trim();
  const mediaList = payload.mediaUrls?.length
    ? payload.mediaUrls
    : payload.mediaUrl
      ? [payload.mediaUrl]
      : [];
  const mediaBlock = mediaList.length
    ? mediaList.map((url) => `Attachment: ${url}`).join("\n")
    : "";
  const finalText = convertedText
    ? mediaBlock
      ? `${convertedText}\n\n${mediaBlock}`
      : convertedText
    : mediaBlock;
  if (!finalText.trim()) {
    return;
  }

  const chunkMode = core.channel.text.resolveChunkMode(config, "qq", account.accountId);
  const limit = account.config.textChunkLimit ?? QQ_TEXT_LIMIT;
  const chunks = core.channel.text.chunkMarkdownTextWithMode(finalText, limit, chunkMode);

  let replyId = replyToMessageId;
  for (const chunk of chunks) {
    const result = await sendMessageQq(target, chunk, {
      cfg: config,
      accountId: account.accountId,
      replyToMessageId: replyId,
    });
    replyId = undefined;
    if (!result.ok) {
      runtime.error(`qq send failed: ${result.error ?? "unknown error"}`);
      continue;
    }
    statusSink?.({ lastOutboundAt: Date.now() });
  }
}

async function processQqDispatch(params: {
  eventType: string;
  eventData: Record<string, unknown>;
  account: ResolvedQqAccount;
  config: OpenClawConfig;
  runtime: RuntimeEnv;
  core: QqCoreRuntime;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
}): Promise<void> {
  const { eventType, eventData, account, config, runtime, core, statusSink } = params;
  const parsed = parseMessageData(eventType, eventData);
  const { senderId, senderName, content, isGroup, groupId, messageId, timestampMs } = parsed;
  if (!senderId || !content) {
    return;
  }

  const dmPolicy = account.config.dmPolicy ?? "pairing";
  const configuredAllowFrom = normalizeAllowList(account.config.allowFrom);
  const groupConfig = resolveQqGroupConfig({
    groups: account.config.groups,
    groupId,
  });

  const { senderAllowedForCommands, commandAuthorized } = await resolveSenderCommandAuthorization({
    cfg: config,
    rawBody: content,
    isGroup,
    dmPolicy,
    configuredAllowFrom,
    senderId,
    isSenderAllowed,
    readAllowFromStore: () => core.channel.pairing.readAllowFromStore("qq"),
    shouldComputeCommandAuthorized: (body, cfg) =>
      core.channel.commands.shouldComputeCommandAuthorized(body, cfg),
    resolveCommandAuthorizedFromAuthorizers: (resolverParams) =>
      core.channel.commands.resolveCommandAuthorizedFromAuthorizers(resolverParams),
  });

  if (!isGroup) {
    if (dmPolicy === "disabled") {
      logVerbose(core, runtime, `drop DM sender=${senderId} (dmPolicy=disabled)`);
      return;
    }
    if (dmPolicy !== "open" && !senderAllowedForCommands) {
      if (dmPolicy === "pairing") {
        const { code, created } = await core.channel.pairing.upsertPairingRequest({
          channel: "qq",
          id: senderId,
          meta: { name: senderName || undefined },
        });
        if (created) {
          const pairingText = core.channel.pairing.buildPairingReply({
            channel: "qq",
            idLine: `Your QQ user id: ${senderId}`,
            code,
          });
          const result = await sendMessageQq(`user:${senderId}`, pairingText, {
            cfg: config,
            accountId: account.accountId,
            replyToMessageId: messageId || undefined,
          });
          if (result.ok) {
            statusSink?.({ lastOutboundAt: Date.now() });
          }
        }
      }
      return;
    }
  } else {
    if (!groupId) {
      return;
    }
    if (!resolveGroupAllowed(groupId, account)) {
      logVerbose(core, runtime, `drop group=${groupId} (groupPolicy/allowlist)`);
      return;
    }

    const scopedGroupAllowFrom = normalizeAllowList(
      groupConfig?.allowFrom ?? account.config.groupAllowFrom,
    );
    if (scopedGroupAllowFrom.length > 0 && !isSenderAllowed(senderId, scopedGroupAllowFrom)) {
      logVerbose(core, runtime, `drop group sender=${senderId} in ${groupId} (groupAllowFrom)`);
      return;
    }
  }

  if (
    isGroup &&
    core.channel.commands.isControlCommandMessage(content, config) &&
    commandAuthorized !== true
  ) {
    logVerbose(core, runtime, `drop unauthorized control command sender=${senderId}`);
    return;
  }

  const requireMention = Boolean(groupConfig?.requireMention ?? true);
  const wasMentioned = isGroup ? eventType === QQ_EVENT_GROUP_AT_MESSAGE_CREATE : false;
  const allowTextCommands = core.channel.commands.shouldHandleTextCommands({
    cfg: config,
    surface: "qq",
  });
  const hasControlCommand = core.channel.text.hasControlCommand(content, config);
  if (isGroup && requireMention && !wasMentioned && !(allowTextCommands && hasControlCommand)) {
    logVerbose(core, runtime, `drop group message without mention sender=${senderId}`);
    return;
  }

  const conversationId = isGroup ? groupId : senderId;
  const route = core.channel.routing.resolveAgentRoute({
    cfg: config,
    channel: "qq",
    accountId: account.accountId,
    peer: {
      kind: isGroup ? "group" : "direct",
      id: conversationId,
    },
  });

  const fromLabel = isGroup ? `group:${groupId}` : senderName || `user:${senderId}`;
  const storePath = core.channel.session.resolveStorePath(config.session?.store, {
    agentId: route.agentId,
  });
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });
  const body = core.channel.reply.formatAgentEnvelope({
    channel: "QQ",
    from: fromLabel,
    timestamp: timestampMs,
    previousTimestamp,
    envelope: core.channel.reply.resolveEnvelopeFormatOptions(config),
    body: content,
  });

  const target = isGroup ? `qq:group:${groupId}` : `qq:${senderId}`;
  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    BodyForAgent: content,
    RawBody: content,
    CommandBody: content,
    From: target,
    To: target,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: isGroup ? "group" : "direct",
    ConversationLabel: fromLabel,
    SenderName: senderName || undefined,
    SenderId: senderId,
    GroupSubject: isGroup ? `group:${groupId}` : undefined,
    GroupSystemPrompt: isGroup ? groupConfig?.systemPrompt?.trim() || undefined : undefined,
    WasMentioned: isGroup ? wasMentioned : undefined,
    Provider: "qq",
    Surface: "qq",
    MessageSid: messageId || undefined,
    Timestamp: timestampMs,
    CommandAuthorized: commandAuthorized,
    OriginatingChannel: "qq",
    OriginatingTo: target,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err) => runtime.error(`qq: failed updating session metadata: ${String(err)}`),
  });

  const tableMode = core.channel.text.resolveMarkdownTableMode({
    cfg: config,
    channel: "qq",
    accountId: account.accountId,
  });
  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg: config,
    agentId: route.agentId,
    channel: "qq",
    accountId: account.accountId,
  });

  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: config,
    dispatcherOptions: {
      ...prefixOptions,
      deliver: async (payload) => {
        const replyTarget = isGroup ? `group:${groupId}` : `user:${senderId}`;
        await deliverQqReply({
          payload,
          account,
          target: replyTarget,
          runtime,
          core,
          config,
          tableMode,
          replyToMessageId: messageId || undefined,
          statusSink,
        });
      },
      onError: (err, info) => {
        runtime.error(`qq ${info.kind} reply failed: ${String(err)}`);
      },
    },
    replyOptions: {
      onModelSelected,
      disableBlockStreaming:
        typeof account.config.blockStreaming === "boolean"
          ? !account.config.blockStreaming
          : undefined,
    },
  });
}

function buildDispatchAck(success: boolean): { op: number; d: number } {
  return { op: QQ_OP_DISPATCH_ACK, d: success ? 0 : 1 };
}

function buildHeartbeatAck(seq: number): { op: number; d: number } {
  return { op: QQ_OP_HEARTBEAT_ACK, d: seq };
}

export function registerQqWebhookTarget(target: WebhookTarget): () => void {
  return registerWebhookTarget(webhookTargets, target).unregister;
}

export async function handleQqWebhookRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const resolved = resolveWebhookTargets(req, webhookTargets);
  if (!resolved) {
    return false;
  }
  const { targets } = resolved;

  if (rejectNonPostWebhookRequest(req, res)) {
    return true;
  }

  if (targets.length > 1) {
    res.statusCode = 409;
    res.end("ambiguous webhook target: use distinct webhookPath per account");
    return true;
  }

  const target = targets[0];
  const body = await readJsonBodyWithRaw({
    req,
    maxBytes: 1024 * 1024,
    timeoutMs: 20_000,
  });
  if (!body.ok) {
    if (body.code === "PAYLOAD_TOO_LARGE") {
      res.statusCode = 413;
      res.end("Payload Too Large");
      return true;
    }
    if (body.code === "REQUEST_BODY_TIMEOUT") {
      res.statusCode = 408;
      res.end("Request Timeout");
      return true;
    }
    res.statusCode = 400;
    res.end("Bad Request");
    return true;
  }

  if (
    !verifyOfficialWebhookSignature({
      secret: target.account.appSecret,
      req,
      rawBody: body.rawBody,
    })
  ) {
    res.statusCode = 401;
    res.end("unauthorized");
    return true;
  }

  const payload = body.json as QqWebhookPayload;
  const op = typeof payload.op === "number" ? payload.op : -1;
  if (op === QQ_OP_CALLBACK_VALIDATION) {
    const data =
      payload.d && typeof payload.d === "object" && !Array.isArray(payload.d)
        ? (payload.d as Record<string, unknown>)
        : {};
    const plainToken = typeof data.plain_token === "string" ? data.plain_token : "";
    const eventTs = typeof data.event_ts === "string" ? data.event_ts : "";
    if (!plainToken || !eventTs) {
      res.statusCode = 400;
      res.end("invalid callback validation payload");
      return true;
    }
    sendJson(res, 200, {
      plain_token: plainToken,
      signature: generateValidationSignature({
        secret: target.account.appSecret,
        eventTs,
        plainToken,
      }),
    });
    return true;
  }

  if (op === QQ_OP_HEARTBEAT) {
    const seq =
      payload.d != null && typeof payload.d === "number" && Number.isFinite(payload.d)
        ? payload.d
        : 0;
    sendJson(res, 200, buildHeartbeatAck(seq));
    return true;
  }

  if (op !== QQ_OP_DISPATCH) {
    sendJson(res, 200, { ok: true });
    return true;
  }

  target.statusSink?.({ lastInboundAt: Date.now() });
  const eventType = typeof payload.t === "string" ? payload.t : "";
  const eventData = payload.d;
  if (
    (eventType === QQ_EVENT_GROUP_AT_MESSAGE_CREATE || eventType === QQ_EVENT_C2C_MESSAGE_CREATE) &&
    eventData &&
    typeof eventData === "object" &&
    !Array.isArray(eventData)
  ) {
    processQqDispatch({
      eventType,
      eventData: eventData as Record<string, unknown>,
      account: target.account,
      config: target.config,
      runtime: target.runtime,
      core: target.core,
      statusSink: target.statusSink,
    }).catch((err) => {
      target.runtime.error(`qq webhook processing failed: ${String(err)}`);
    });
  }

  sendJson(res, 200, buildDispatchAck(true));
  return true;
}

export async function monitorQqProvider(options: QqMonitorOptions): Promise<QqMonitorResult> {
  const { account, config, runtime, abortSignal, statusSink } = options;
  const core = getQqRuntime();
  const path = normalizeWebhookPath(account.config.webhookPath?.trim() || DEFAULT_WEBHOOK_PATH);
  const unregister = registerQqWebhookTarget({
    account,
    config,
    runtime,
    core,
    path,
    statusSink,
  });

  abortSignal.addEventListener("abort", unregister, { once: true });

  return {
    stop: unregister,
  };
}
