import { parseGatewayAccessInput } from "../gateway-url.ts";

export type GatewayAuthMode = "none" | "token" | "password" | "trusted-proxy";

export type DeploymentStepId = "gateway" | "auth" | "connect";

export type DeploymentStep = {
  id: DeploymentStepId;
  done: boolean;
  detailKey:
    | "gateway.valid"
    | "gateway.invalid"
    | "auth.ready"
    | "auth.missing"
    | "auth.notRequired"
    | "connect.ready"
    | "connect.pending";
};

export type DeploymentReadiness = {
  steps: DeploymentStep[];
  completedCount: number;
  totalCount: number;
  nextCommand: string | null;
  parsedTokenDetected: boolean;
  parsedSessionKey: string | null;
};

export type DeploymentReadinessInput = {
  gatewayUrl: string;
  token: string;
  password: string;
  connected: boolean;
  authMode?: GatewayAuthMode;
};

const COMMAND_OPEN_DASHBOARD = "openclaw dashboard --no-open";
const COMMAND_GENERATE_TOKEN = "openclaw doctor --generate-gateway-token";
const COMMAND_CHECK_STATUS = "openclaw channels status --probe";

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function resolveAuthStep(params: {
  authMode?: GatewayAuthMode;
  hasToken: boolean;
  hasPassword: boolean;
}): Pick<DeploymentStep, "done" | "detailKey"> {
  const { authMode, hasToken, hasPassword } = params;
  if (authMode === "none" || authMode === "trusted-proxy") {
    return {
      done: true,
      detailKey: "auth.notRequired",
    };
  }
  if (authMode === "token") {
    return {
      done: hasToken,
      detailKey: hasToken ? "auth.ready" : "auth.missing",
    };
  }
  if (authMode === "password") {
    return {
      done: hasPassword,
      detailKey: hasPassword ? "auth.ready" : "auth.missing",
    };
  }
  const done = hasToken || hasPassword;
  return {
    done,
    detailKey: done ? "auth.ready" : "auth.missing",
  };
}

function resolveNextCommand(params: {
  gatewayReady: boolean;
  authReady: boolean;
  connectReady: boolean;
  authMode?: GatewayAuthMode;
}): string | null {
  if (!params.gatewayReady) {
    return COMMAND_OPEN_DASHBOARD;
  }
  const authRequired = params.authMode !== "none" && params.authMode !== "trusted-proxy";
  if (authRequired && !params.authReady) {
    return COMMAND_GENERATE_TOKEN;
  }
  if (!params.connectReady) {
    return COMMAND_CHECK_STATUS;
  }
  return null;
}

export function buildDeploymentReadiness(params: DeploymentReadinessInput): DeploymentReadiness {
  const parsedGateway = parseGatewayAccessInput(params.gatewayUrl);
  const hasToken = hasValue(params.token) || hasValue(parsedGateway?.token);
  const hasPassword = hasValue(params.password);
  const gatewayReady = parsedGateway !== null;
  const auth = resolveAuthStep({
    authMode: params.authMode,
    hasToken,
    hasPassword,
  });
  const connectReady = params.connected;

  const steps: DeploymentStep[] = [
    {
      id: "gateway",
      done: gatewayReady,
      detailKey: gatewayReady ? "gateway.valid" : "gateway.invalid",
    },
    {
      id: "auth",
      done: auth.done,
      detailKey: auth.detailKey,
    },
    {
      id: "connect",
      done: connectReady,
      detailKey: connectReady ? "connect.ready" : "connect.pending",
    },
  ];

  const completedCount = steps.reduce((count, step) => count + (step.done ? 1 : 0), 0);
  return {
    steps,
    completedCount,
    totalCount: steps.length,
    nextCommand: resolveNextCommand({
      gatewayReady,
      authReady: auth.done,
      connectReady,
      authMode: params.authMode,
    }),
    parsedTokenDetected: hasValue(parsedGateway?.token),
    parsedSessionKey: parsedGateway?.sessionKey?.trim() || null,
  };
}
