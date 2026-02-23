import { html, nothing } from "lit";
import { formatPresenceAge, formatPresenceSummary } from "../presenter.ts";
import type { PresenceEntry } from "../types.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  CHIP_CLASS,
  CHIP_ROW_CLASS,
  LIST_CLASS,
  LIST_ITEM_CLASS,
  LIST_MAIN_CLASS,
  LIST_META_CLASS,
  LIST_SUB_CLASS,
  LIST_TITLE_CLASS,
  MUTED_TEXT_CLASS,
} from "./tw.ts";

export type InstancesProps = {
  loading: boolean;
  entries: PresenceEntry[];
  lastError: string | null;
  statusMessage: string | null;
  onRefresh: () => void;
};

export function renderInstances(props: InstancesProps) {
  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class=${CARD_TITLE_CLASS}>连接实例</div>
          <div class=${CARD_SUB_CLASS}>来自网关与客户端的在线心跳。</div>
        </div>
        <button class=${buttonClass()} ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "加载中…" : "刷新"}
        </button>
      </div>
      ${
        props.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${props.lastError}
          </div>`
          : nothing
      }
      ${
        props.statusMessage
          ? html`<div class="${calloutClass("default")} mt-3">
            ${props.statusMessage}
          </div>`
          : nothing
      }
      <div class=${LIST_CLASS}>
        ${
          props.entries.length === 0
            ? html`
                <div class=${MUTED_TEXT_CLASS}>暂无实例上报。</div>
              `
            : props.entries.map((entry) => renderEntry(entry))
        }
      </div>
    </section>
  `;
}

function renderEntry(entry: PresenceEntry) {
  const lastInput = entry.lastInputSeconds != null ? `${entry.lastInputSeconds} 秒前` : "暂无";
  const mode = entry.mode ?? "未知";
  const roles = Array.isArray(entry.roles) ? entry.roles.filter(Boolean) : [];
  const scopes = Array.isArray(entry.scopes) ? entry.scopes.filter(Boolean) : [];
  const scopesLabel =
    scopes.length > 0
      ? scopes.length > 3
        ? `${scopes.length} 个作用域`
        : `作用域: ${scopes.join(", ")}`
      : null;
  return html`
    <div class=${LIST_ITEM_CLASS}>
      <div class=${LIST_MAIN_CLASS}>
        <div class=${LIST_TITLE_CLASS}>${entry.host ?? "未知主机"}</div>
        <div class=${LIST_SUB_CLASS}>${formatPresenceSummary(entry)}</div>
        <div class=${CHIP_ROW_CLASS}>
          <span class=${CHIP_CLASS}>${mode}</span>
          ${roles.map((role) => html`<span class=${CHIP_CLASS}>${role}</span>`)}
          ${scopesLabel ? html`<span class=${CHIP_CLASS}>${scopesLabel}</span>` : nothing}
          ${entry.platform ? html`<span class=${CHIP_CLASS}>${entry.platform}</span>` : nothing}
          ${entry.deviceFamily ? html`<span class=${CHIP_CLASS}>${entry.deviceFamily}</span>` : nothing}
          ${
            entry.modelIdentifier
              ? html`<span class=${CHIP_CLASS}>${entry.modelIdentifier}</span>`
              : nothing
          }
          ${entry.version ? html`<span class=${CHIP_CLASS}>${entry.version}</span>` : nothing}
        </div>
      </div>
      <div class=${LIST_META_CLASS}>
        <div>${formatPresenceAge(entry)}</div>
        <div class=${MUTED_TEXT_CLASS}>最后输入 ${lastInput}</div>
        <div class=${MUTED_TEXT_CLASS}>原因 ${entry.reason ?? "暂无"}</div>
      </div>
    </div>
  `;
}
