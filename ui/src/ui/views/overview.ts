import { html } from "lit";
import { t, i18n, type Locale } from "../../i18n/index.ts";
import type { PendingDevice } from "../controllers/devices.ts";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import type { GatewayHelloOk } from "../gateway.ts";
import type { Tab } from "../navigation.ts";
import { formatNextRun } from "../presenter.ts";
import type { UiSettings } from "../storage.ts";
import { buildDeploymentReadiness } from "./overview-readiness.ts";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  devicesLoading: boolean;
  devicesError: string | null;
  pendingDevices: PendingDevice[];
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onOpenRuntimePanel: (panel: "instances" | "sessions") => void;
  onConnect: () => void;
  onRefresh: () => void;
  onDevicesRefresh: () => void;
  onDeviceApprove: (requestId: string) => void;
  onOpenTab: (tab: Tab) => void;
};

type ConnectionFix = {
  title: string;
  message: string;
  commands: string[];
  docs?: Array<{ label: string; href: string }>;
  needsPairingApproval?: boolean;
};

async function copyCommandsToClipboard(commands: string[]): Promise<boolean> {
  const text = commands.join("\n").trim();
  if (!text) {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to document.execCommand below when clipboard API is blocked.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = (
    document as Document & { execCommand?: (command: string) => boolean }
  ).execCommand?.("copy");
  textarea.remove();
  return Boolean(copied);
}

function resolveConnectionFix(lastError: string | null): ConnectionFix | null {
  if (!lastError) {
    return null;
  }
  const lower = lastError.toLowerCase();
  if (lower.includes("pairing required")) {
    return {
      title: t("overview.fix.pairingTitle"),
      message: t("overview.fix.pairingMessage"),
      commands: ["openclaw devices list", "openclaw devices approve <requestId>"],
      docs: [
        { label: t("overview.fix.devicesDocs"), href: "https://docs.openclaw.ai/cli/devices" },
      ],
      needsPairingApproval: true,
    };
  }
  if (lower.includes("unauthorized") || lower.includes("connect failed")) {
    return {
      title: t("overview.fix.authTitle"),
      message: t("overview.fix.authMessage"),
      commands: ["openclaw dashboard --no-open", "openclaw config get gateway.auth.token"],
      docs: [
        { label: t("overview.fix.dashboardDocs"), href: "https://docs.openclaw.ai/web/dashboard" },
      ],
    };
  }
  if (lower.includes("secure context") || lower.includes("device identity required")) {
    return {
      title: t("overview.fix.secureTitle"),
      message: t("overview.fix.secureMessage"),
      commands: ["openclaw dashboard --no-open"],
      docs: [
        {
          label: t("overview.fix.insecureHttpDocs"),
          href: "https://docs.openclaw.ai/web/control-ui#insecure-http",
        },
      ],
    };
  }
  if (lower.includes("origin not allowed")) {
    return {
      title: t("overview.fix.originTitle"),
      message: t("overview.fix.originMessage"),
      commands: [
        'openclaw config set gateway.controlUi.allowedOrigins "[\\"https://claw.vip996.pro\\"]"',
      ],
      docs: [
        { label: t("overview.fix.controlUiDocs"), href: "https://docs.openclaw.ai/web/control-ui" },
      ],
    };
  }
  return {
    title: t("overview.fix.genericTitle"),
    message: t("overview.fix.genericMessage"),
    commands: ["openclaw status"],
    docs: [
      {
        label: t("overview.fix.troubleshootingDocs"),
        href: "https://docs.openclaw.ai/gateway/troubleshooting",
      },
    ],
  };
}

function renderPendingApprovals(props: OverviewProps) {
  const pending = Array.isArray(props.pendingDevices) ? props.pendingDevices : [];
  if (pending.length === 0) {
    return null;
  }
  const rows = pending.slice(0, 3);
  return html`
    <div class="callout" style="margin-top: 12px;">
      <div class="row" style="justify-content: space-between; align-items: center; gap: 8px;">
        <strong>${t("overview.devices.pendingTitle", { count: String(pending.length) })}</strong>
        <button class="btn btn--sm" ?disabled=${props.devicesLoading} @click=${props.onDevicesRefresh}>
          ${props.devicesLoading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>
      ${
        props.devicesError
          ? html`<div class="muted" style="margin-top: 8px;">${props.devicesError}</div>`
          : null
      }
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        ${rows.map((req) => {
          const name = req.displayName?.trim() || req.deviceId;
          const meta = [
            req.role ? `${t("overview.devices.roleLabel")}: ${req.role}` : "",
            req.remoteIp ? req.remoteIp : "",
          ]
            .filter(Boolean)
            .join(" · ");
          return html`
            <div class="row" style="justify-content: space-between; align-items: center; gap: 8px;">
              <div>
                <div class="mono">${name}</div>
                <div class="muted">${meta || req.deviceId}</div>
              </div>
              <button
                class="btn btn--sm primary"
                ?disabled=${props.devicesLoading}
                @click=${() => props.onDeviceApprove(req.requestId)}
              >
                ${t("overview.devices.approve")}
              </button>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

function renderConnectionFixCard(fix: ConnectionFix | null) {
  if (!fix) {
    return null;
  }
  return html`
    <div class="callout" style="margin-top: 12px;">
      <div><strong>${fix.title}</strong></div>
      <div class="muted" style="margin-top: 4px;">${fix.message}</div>
      <div class="row" style="margin-top: 8px; justify-content: space-between; align-items: center; gap: 8px;">
        <span>${t("overview.fix.runLabel")}</span>
        <button
          data-testid="overview-copy-commands"
          class="btn btn--sm"
          @click=${() => void copyCommandsToClipboard(fix.commands)}
        >
          ${t("overview.fix.copyCommands")}
        </button>
      </div>
      <pre class="code-block" style="margin-top: 6px;">${fix.commands.join("\n")}</pre>
      ${
        fix.docs?.length
          ? html`
              <div style="margin-top: 8px;">
                ${fix.docs.map(
                  (entry, index) => html`
                    ${
                      index > 0
                        ? html`
                            <span class="muted"> · </span>
                          `
                        : null
                    }
                    <a class="session-link" href=${entry.href} target="_blank" rel="noreferrer">${entry.label}</a>
                  `,
                )}
              </div>
            `
          : null
      }
    </div>
  `;
}

function renderDeploymentChecklist(readiness: ReturnType<typeof buildDeploymentReadiness>) {
  return html`
    <div class="callout overview-readiness" style="margin-top: 12px;">
      <div class="row" style="justify-content: space-between; align-items: center; gap: 8px;">
        <strong>${t("overview.readiness.title")}</strong>
        <span class="pill">
          ${t("overview.readiness.progress", {
            done: String(readiness.completedCount),
            total: String(readiness.totalCount),
          })}
        </span>
      </div>
      <div class="overview-readiness__list">
        ${readiness.steps.map(
          (step) => html`
            <div class="overview-readiness__item">
              <span class="overview-readiness__state ${step.done ? "overview-readiness__state--done" : ""}">
                ${step.done ? "OK" : "..."}
              </span>
              <div class="overview-readiness__text">
                <div class="overview-readiness__title">
                  ${t(`overview.readiness.steps.${step.id}.label`)}
                  <span class="muted">
                    (${step.done ? t("overview.readiness.done") : t("overview.readiness.pending")})
                  </span>
                </div>
                <div class="muted">${t(`overview.readiness.details.${step.detailKey}`)}</div>
              </div>
            </div>
          `,
        )}
      </div>
      ${
        readiness.parsedTokenDetected
          ? html`<div class="muted" style="margin-top: 8px;">
              ${t("overview.readiness.detectedToken")}
            </div>`
          : null
      }
      ${
        readiness.parsedSessionKey
          ? html`<div class="muted" style="margin-top: 4px;">
              ${t("overview.readiness.detectedSession", { session: readiness.parsedSessionKey })}
            </div>`
          : null
      }
      ${
        readiness.nextCommand
          ? html`
              <div class="row" style="margin-top: 10px; justify-content: space-between; align-items: center; gap: 8px;">
                <span>${t("overview.readiness.nextCommandLabel")}</span>
                <button
                  data-testid="overview-copy-next-command"
                  class="btn btn--sm"
                  @click=${() => void copyCommandsToClipboard([readiness.nextCommand ?? ""])}
                >
                  ${t("overview.readiness.copyNextCommand")}
                </button>
              </div>
              <pre class="code-block" style="margin-top: 6px;">${readiness.nextCommand}</pre>
            `
          : html`<div class="callout success" style="margin-top: 10px;">
              ${t("overview.readiness.readyMessage")}
            </div>`
      }
      <div style="margin-top: 8px;">
        <a class="session-link" href="https://docs.openclaw.ai/web/dashboard" target="_blank" rel="noreferrer">
          ${t("overview.readiness.docsLabel")}
        </a>
      </div>
    </div>
  `;
}

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | {
        uptimeMs?: number;
        policy?: { tickIntervalMs?: number };
        authMode?: "none" | "token" | "password" | "trusted-proxy";
      }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationHuman(snapshot.uptimeMs) : t("common.na");
  const tick = snapshot?.policy?.tickIntervalMs
    ? `${snapshot.policy.tickIntervalMs}ms`
    : t("common.na");
  const authMode = snapshot?.authMode;
  const isTrustedProxy = authMode === "trusted-proxy";
  const connectionFix = resolveConnectionFix(props.lastError);
  const readiness = buildDeploymentReadiness({
    gatewayUrl: props.settings.gatewayUrl,
    token: props.settings.token,
    password: props.password,
    connected: props.connected,
    authMode,
  });

  const authHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px">
          ${t("overview.auth.required")}
          <div style="margin-top: 6px">
            <span class="mono">openclaw dashboard --no-open</span> - ${t("overview.auth.tokenizedUrlHint")}<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> - ${t("overview.auth.generateTokenHint")}
          </div>
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              >${t("overview.auth.docsLabel")}</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.auth.failed", { command: "openclaw dashboard --no-open" })}
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            >${t("overview.auth.docsLabel")}</a
          >
        </div>
      </div>
    `;
  })();

  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.insecure.hint", { url: "http://127.0.0.1:18789" })}
        <div style="margin-top: 6px">
          ${t("overview.insecure.stayHttp", { config: "gateway.controlUi.allowInsecureAuth: true" })}
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            >${t("overview.insecure.tailscaleDocsLabel")}</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            >${t("overview.insecure.httpDocsLabel")}</a
          >
        </div>
      </div>
    `;
  })();

  const currentLocale = i18n.getLocale();

  return html`
    <section class="overview-bento">
      <article class="card overview-bento__card overview-bento__card--access">
        <div class="card-title">${t("overview.access.title")}</div>
        <div class="card-sub">${t("overview.access.subtitle")}</div>
        <div class="form-grid overview-access-grid" style="margin-top: 16px;">
          <label class="field overview-access-field overview-access-field--ws">
            <span>${t("overview.access.wsUrl")}</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSettingsChange({ ...props.settings, gatewayUrl: v });
              }}
              placeholder="wss://claw.vip996.pro"
            />
            <div class="muted" style="margin-top: 4px;">
              ${t("overview.access.wsUrlHint")}
            </div>
          </label>
          ${
            isTrustedProxy
              ? ""
              : html`
                <label class="field overview-access-field overview-access-field--token">
                  <span>${t("overview.access.token")}</span>
                  <input
                    .value=${props.settings.token}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onSettingsChange({ ...props.settings, token: v });
                    }}
                    placeholder="OPENCLAW_GATEWAY_TOKEN"
                  />
                </label>
                <label class="row" style="align-items: center; gap: 8px; margin-top: 4px;">
                  <input
                    data-testid="persist-token-toggle"
                    type="checkbox"
                    .checked=${props.settings.persistToken}
                    @change=${(e: Event) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      props.onSettingsChange({
                        ...props.settings,
                        persistToken: checked,
                      });
                    }}
                  />
                  <span>${t("overview.access.rememberToken")}</span>
                </label>
                <label class="field">
                  <span>${t("overview.access.password")}</span>
                  <input
                    type="password"
                    .value=${props.password}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onPasswordChange(v);
                    }}
                    placeholder=${t("overview.access.passwordPlaceholder")}
                  />
                </label>
              `
          }
          <label class="field">
            <span>${t("overview.access.sessionKey")}</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSessionKeyChange(v);
              }}
            />
          </label>
          <label class="field">
            <span>${t("overview.access.language")}</span>
            <select
              .value=${currentLocale}
              @change=${(e: Event) => {
                const v = (e.target as HTMLSelectElement).value as Locale;
                void i18n.setLocale(v);
                props.onSettingsChange({ ...props.settings, locale: v });
              }}
            >
              <option value="en">${t("languages.en")}</option>
              <option value="zh-CN">${t("languages.zhCN")}</option>
              <option value="zh-TW">${t("languages.zhTW")}</option>
              <option value="pt-BR">${t("languages.ptBR")}</option>
            </select>
          </label>
        </div>
        <div class="row" style="margin-top: 14px;">
          <button class="btn" @click=${() => props.onConnect()}>${t("common.connect")}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${t("common.refresh")}</button>
          <span class="muted">${
            isTrustedProxy ? t("overview.access.trustedProxy") : t("overview.access.connectHint")
          }</span>
        </div>
        ${renderDeploymentChecklist(readiness)}
      </article>

      <article class="card overview-bento__card overview-bento__card--snapshot">
        <div class="card-title">${t("overview.snapshot.title")}</div>
        <div class="card-sub">${t("overview.snapshot.subtitle")}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.status")}</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? t("common.ok") : t("common.offline")}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.uptime")}</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.tickInterval")}</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.lastChannelsRefresh")}</div>
            <div class="stat-value">
              ${props.lastChannelsRefresh ? formatRelativeTimestamp(props.lastChannelsRefresh) : t("common.na")}
            </div>
          </div>
        </div>
        ${
          props.lastError
            ? html`<div class="callout danger" style="margin-top: 14px;">
              <div>${connectionFix?.message ?? t("overview.fix.genericMessage")}</div>
              <details style="margin-top: 8px;">
                <summary>${t("overview.fix.rawErrorLabel")}</summary>
                <pre class="code-block" style="margin-top: 6px;">${props.lastError}</pre>
              </details>
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
            : html`
                <div class="callout" style="margin-top: 14px">
                  ${t("overview.snapshot.channelsHint")}
                </div>
              `
        }
        ${renderConnectionFixCard(connectionFix)}
        ${
          connectionFix?.needsPairingApproval || props.pendingDevices.length > 0
            ? renderPendingApprovals(props)
            : null
        }
      </article>
      <button
        type="button"
        class="card stat-card stat-card-action overview-bento__card overview-bento__card--instances"
        @click=${() => props.onOpenRuntimePanel("instances")}
      >
        <div class="stat-label">${t("overview.stats.instances")}</div>
        <div class="stat-value">${props.presenceCount}</div>
        <div class="muted">${t("overview.stats.instancesHint")}</div>
      </button>
      <button
        type="button"
        class="card stat-card stat-card-action overview-bento__card overview-bento__card--sessions"
        @click=${() => props.onOpenRuntimePanel("sessions")}
      >
        <div class="stat-label">${t("overview.stats.sessions")}</div>
        <div class="stat-value">${props.sessionsCount ?? t("common.na")}</div>
        <div class="muted">${t("overview.stats.sessionsHint")}</div>
      </button>
      <button
        type="button"
        class="card stat-card stat-card-action overview-bento__card overview-bento__card--cron"
        @click=${() => props.onOpenTab("cron")}
      >
        <div class="stat-label">${t("overview.stats.cron")}</div>
        <div class="stat-value">
          ${props.cronEnabled == null ? t("common.na") : props.cronEnabled ? t("common.enabled") : t("common.disabled")}
        </div>
        <div class="muted">${t("overview.stats.cronNext", { time: formatNextRun(props.cronNext) })}</div>
      </button>

      <section class="card overview-bento__card overview-bento__card--notes">
      <div class="card-title">${t("overview.notes.title")}</div>
      <div class="card-sub">${t("overview.notes.subtitle")}</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div>
          <div class="note-title">${t("overview.notes.tailscaleTitle")}</div>
          <div class="muted">
            ${t("overview.notes.tailscaleText")}
          </div>
        </div>
        <div>
          <div class="note-title">${t("overview.notes.sessionTitle")}</div>
          <div class="muted">${t("overview.notes.sessionText")}</div>
        </div>
        <div>
          <div class="note-title">${t("overview.notes.cronTitle")}</div>
          <div class="muted">${t("overview.notes.cronText")}</div>
        </div>
      </div>
      </section>
    </section>
  `;
}
