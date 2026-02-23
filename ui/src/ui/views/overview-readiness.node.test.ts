import { describe, expect, it } from "vitest";
import { buildDeploymentReadiness } from "./overview-readiness.ts";

describe("buildDeploymentReadiness", () => {
  it("treats tokenized dashboard URLs as gateway+auth ready", () => {
    const readiness = buildDeploymentReadiness({
      gatewayUrl: "https://example.com/control#token=abc123&session=agent:main:main",
      token: "",
      password: "",
      connected: false,
    });

    expect(readiness.steps.find((step) => step.id === "gateway")?.done).toBe(true);
    expect(readiness.steps.find((step) => step.id === "auth")?.done).toBe(true);
    expect(readiness.nextCommand).toBe("openclaw channels status --probe");
    expect(readiness.parsedTokenDetected).toBe(true);
    expect(readiness.parsedSessionKey).toBe("agent:main:main");
  });

  it("recommends dashboard command when gateway URL is invalid", () => {
    const readiness = buildDeploymentReadiness({
      gatewayUrl: "://not-a-url",
      token: "",
      password: "",
      connected: false,
    });

    expect(readiness.steps.find((step) => step.id === "gateway")?.done).toBe(false);
    expect(readiness.nextCommand).toBe("openclaw dashboard --no-open");
  });

  it("requires credentials when gateway auth mode is token", () => {
    const readiness = buildDeploymentReadiness({
      gatewayUrl: "ws://127.0.0.1:18789",
      token: "",
      password: "",
      connected: false,
      authMode: "token",
    });

    expect(readiness.steps.find((step) => step.id === "auth")?.done).toBe(false);
    expect(readiness.nextCommand).toBe("openclaw doctor --generate-gateway-token");
  });

  it("treats trusted-proxy auth as already satisfied", () => {
    const readiness = buildDeploymentReadiness({
      gatewayUrl: "ws://127.0.0.1:18789",
      token: "",
      password: "",
      connected: false,
      authMode: "trusted-proxy",
    });

    expect(readiness.steps.find((step) => step.id === "auth")?.done).toBe(true);
    expect(readiness.nextCommand).toBe("openclaw channels status --probe");
  });

  it("treats auth mode none as not requiring credentials", () => {
    const readiness = buildDeploymentReadiness({
      gatewayUrl: "ws://127.0.0.1:18789",
      token: "",
      password: "",
      connected: false,
      authMode: "none",
    });

    expect(readiness.steps.find((step) => step.id === "auth")?.done).toBe(true);
    expect(readiness.nextCommand).toBe("openclaw channels status --probe");
  });
});
