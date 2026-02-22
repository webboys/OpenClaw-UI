import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import type { OpenClawConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { createMockServerResponse } from "../../../src/test-utils/mock-http-response.js";
import type { ResolvedQqAccount } from "./accounts.js";
import { handleQqWebhookRequest, registerQqWebhookTarget } from "./monitor.js";
import { getQqRuntime } from "./runtime.js";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function deriveSeed(secret: string): Buffer {
  const raw = Buffer.from(secret, "utf8");
  let seed = Buffer.from(raw);
  while (seed.length < 32) {
    seed = Buffer.concat([seed, seed]);
  }
  return seed.subarray(0, 32);
}

function createKeys(secret: string) {
  const privateKeyDer = Buffer.concat([ED25519_PKCS8_PREFIX, deriveSeed(secret)]);
  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey };
}

function signPayload(secret: string, timestamp: string, rawBody: Buffer): string {
  const { privateKey } = createKeys(secret);
  const message = Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]);
  return sign(null, message, privateKey).toString("hex");
}

function verifyValidationSignature(params: {
  secret: string;
  eventTs: string;
  plainToken: string;
  signatureHex: string;
}): boolean {
  const { publicKey } = createKeys(params.secret);
  const message = Buffer.concat([
    Buffer.from(params.eventTs, "utf8"),
    Buffer.from(params.plainToken, "utf8"),
  ]);
  const signature = Buffer.from(params.signatureHex, "hex");
  return verify(null, message, publicKey, signature);
}

function createWebhookRequest(params: {
  payload: unknown;
  path?: string;
  secret?: string;
  signatureHex?: string;
  timestamp?: string;
}): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage & {
    destroyed?: boolean;
    destroy: (error?: Error) => IncomingMessage;
  };
  const timestamp = params.timestamp ?? "1700000000";
  const rawBody = Buffer.from(JSON.stringify(params.payload), "utf8");
  const signatureHex =
    params.signatureHex ??
    (params.secret ? signPayload(params.secret, timestamp, rawBody) : "00".repeat(64));

  req.method = "POST";
  req.url = params.path ?? "/qq-official-webhook";
  req.headers = {
    "content-type": "application/json",
    "x-signature-ed25519": signatureHex,
    "x-signature-timestamp": timestamp,
  };
  req.destroyed = false;
  req.destroy = () => {
    req.destroyed = true;
    return req;
  };

  void Promise.resolve().then(() => {
    req.emit("data", rawBody);
    if (!req.destroyed) {
      req.emit("end");
    }
  });

  return req;
}

function createAccount(secret: string): ResolvedQqAccount {
  return {
    accountId: "default",
    enabled: true,
    apiBaseUrl: "https://api.sgroup.qq.com",
    appId: "app_id",
    appSecret: secret,
    secretSource: "config",
    config: {
      webhookPath: "/qq-official-webhook",
    },
  };
}

function registerTestTarget(secret: string): () => void {
  return registerQqWebhookTarget({
    account: createAccount(secret),
    config: {} as OpenClawConfig,
    runtime: {
      log: vi.fn(),
      error: vi.fn(),
    } as unknown as RuntimeEnv,
    core: {} as ReturnType<typeof getQqRuntime>,
    path: "/qq-official-webhook",
  });
}

describe("QQ official webhook", () => {
  it("rejects requests with invalid signature", async () => {
    const unregister = registerTestTarget("qq-secret");
    try {
      const res = createMockServerResponse();
      const handled = await handleQqWebhookRequest(
        createWebhookRequest({
          payload: { op: 13, d: { plain_token: "token", event_ts: "1700000001" } },
          signatureHex: "ff".repeat(64),
          timestamp: "1700000001",
        }),
        res,
      );

      expect(handled).toBe(true);
      expect(res.statusCode).toBe(401);
      expect(res.body).toBe("unauthorized");
    } finally {
      unregister();
    }
  });

  it("returns callback validation signature for op 13", async () => {
    const secret = "qq-secret";
    const plainToken = "plain-token";
    const eventTs = "1700000002";
    const unregister = registerTestTarget(secret);
    try {
      const res = createMockServerResponse();
      const handled = await handleQqWebhookRequest(
        createWebhookRequest({
          payload: { op: 13, d: { plain_token: plainToken, event_ts: eventTs } },
          secret,
          timestamp: eventTs,
        }),
        res,
      );

      expect(handled).toBe(true);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body ?? "{}") as {
        plain_token?: string;
        signature?: string;
      };
      expect(body.plain_token).toBe(plainToken);
      expect(typeof body.signature).toBe("string");
      expect(
        verifyValidationSignature({
          secret,
          eventTs,
          plainToken,
          signatureHex: body.signature ?? "",
        }),
      ).toBe(true);
    } finally {
      unregister();
    }
  });

  it("acknowledges heartbeat payloads", async () => {
    const secret = "qq-secret";
    const unregister = registerTestTarget(secret);
    try {
      const res = createMockServerResponse();
      const handled = await handleQqWebhookRequest(
        createWebhookRequest({
          payload: { op: 1, d: 42 },
          secret,
          timestamp: "1700000003",
        }),
        res,
      );

      expect(handled).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body ?? "{}")).toEqual({ op: 11, d: 42 });
    } finally {
      unregister();
    }
  });

  it("returns dispatch ack for non-message dispatch events", async () => {
    const secret = "qq-secret";
    const unregister = registerTestTarget(secret);
    try {
      const res = createMockServerResponse();
      const handled = await handleQqWebhookRequest(
        createWebhookRequest({
          payload: { op: 0, t: "READY", d: {} },
          secret,
          timestamp: "1700000004",
        }),
        res,
      );

      expect(handled).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body ?? "{}")).toEqual({ op: 12, d: 0 });
    } finally {
      unregister();
    }
  });
});
