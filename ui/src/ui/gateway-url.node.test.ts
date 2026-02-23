import { describe, expect, it } from "vitest";
import { parseGatewayAccessInput } from "./gateway-url.ts";

describe("parseGatewayAccessInput", () => {
  it("accepts dashboard http URL and extracts token/session", () => {
    const parsed = parseGatewayAccessInput(
      "http://127.0.0.1:18789/openclaw/#token=abc123&session=agent:ops:main",
    );

    expect(parsed).toEqual({
      gatewayUrl: "ws://127.0.0.1:18789/openclaw/",
      token: "abc123",
      sessionKey: "agent:ops:main",
    });
  });

  it("accepts host:port input and normalizes to ws URL", () => {
    const parsed = parseGatewayAccessInput("127.0.0.1:18789");
    expect(parsed).toEqual({
      gatewayUrl: "ws://127.0.0.1:18789",
    });
  });

  it("keeps existing ws URL and strips auth params from query", () => {
    const parsed = parseGatewayAccessInput(
      "ws://gateway.example/openclaw/chat?token=token-from-query&foo=bar",
    );
    expect(parsed).toEqual({
      gatewayUrl: "ws://gateway.example/openclaw/chat?foo=bar",
      token: "token-from-query",
    });
  });

  it("parses relative URL with base URL", () => {
    const parsed = parseGatewayAccessInput("/openclaw/?token=abc", {
      baseUrl: "https://dashboard.example/chat",
    });
    expect(parsed).toEqual({
      gatewayUrl: "wss://dashboard.example/openclaw/",
      token: "abc",
    });
  });

  it("rejects unsupported schemes", () => {
    const parsed = parseGatewayAccessInput("ftp://example.com");
    expect(parsed).toBeNull();
  });

  it("rejects malformed URL input", () => {
    const parsed = parseGatewayAccessInput("ws://exa mple.com");
    expect(parsed).toBeNull();
  });
});
