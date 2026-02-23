import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { renderInstances, type InstancesProps } from "./instances.ts";
import { renderSessions, type SessionsProps } from "./sessions.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  MONO_TEXT_CLASS,
  MUTED_TEXT_CLASS,
} from "./tw.ts";

export type RuntimePanel = "instances" | "sessions";

export type RuntimeProps = {
  panel: RuntimePanel;
  presenceCount: number;
  sessionsCount: number | null;
  onPanelChange: (panel: RuntimePanel) => void;
  onOpenChannels: () => void;
  onOpenChat: () => void;
  instances: InstancesProps;
  sessions: SessionsProps;
};

export function renderRuntime(props: RuntimeProps) {
  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div class=${CARD_TITLE_CLASS}>${t("tabs.runtime")}</div>
          <div class=${CARD_SUB_CLASS}>
            ${t("tabs.instances")}: <span class=${MONO_TEXT_CLASS}>${props.presenceCount}</span>
            <span class=${MUTED_TEXT_CLASS}> / </span>
            ${t("tabs.sessions")}: <span class=${MONO_TEXT_CLASS}>${props.sessionsCount ?? t("common.na")}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            data-testid="runtime-panel-instances"
            class=${buttonClass({ small: true, active: props.panel === "instances" })}
            @click=${() => props.onPanelChange("instances")}
          >
            ${t("tabs.instances")}
          </button>
          <button
            data-testid="runtime-panel-sessions"
            class=${buttonClass({ small: true, active: props.panel === "sessions" })}
            @click=${() => props.onPanelChange("sessions")}
          >
            ${t("tabs.sessions")}
          </button>
        </div>
      </div>
      ${
        props.panel === "instances" && props.presenceCount === 0
          ? html`
              <div class="${calloutClass("default")} mt-3">
                <div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <span>${t("runtime.empty.instances")}</span>
                  <button
                    data-testid="runtime-open-channels"
                    class=${buttonClass({ small: true })}
                    @click=${props.onOpenChannels}
                  >
                    ${t("runtime.empty.openChannels")}
                  </button>
                </div>
              </div>
            `
          : nothing
      }
      ${
        props.panel === "sessions" && props.sessionsCount === 0
          ? html`
              <div class="${calloutClass("default")} mt-3">
                <div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <span>${t("runtime.empty.sessions")}</span>
                  <button
                    data-testid="runtime-open-chat"
                    class=${buttonClass({ small: true })}
                    @click=${props.onOpenChat}
                  >
                    ${t("runtime.empty.openChat")}
                  </button>
                </div>
              </div>
            `
          : nothing
      }
    </section>
    ${props.panel === "instances" ? renderInstances(props.instances) : renderSessions(props.sessions)}
  `;
}
