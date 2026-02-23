import { html, nothing } from "lit";
import type { EventLogEntry } from "../app-events.ts";
import { getUiLocale } from "../format.ts";
import { formatEventPayload } from "../presenter.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  CODE_BLOCK_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_CLASS,
  LIST_CLASS,
  LIST_ITEM_CLASS,
  LIST_MAIN_CLASS,
  LIST_META_CLASS,
  LIST_SUB_CLASS,
  LIST_TITLE_CLASS,
  MUTED_TEXT_CLASS,
  TEXTAREA_CLASS,
} from "./tw.ts";

export type DebugProps = {
  loading: boolean;
  status: Record<string, unknown> | null;
  health: Record<string, unknown> | null;
  models: unknown[];
  heartbeat: unknown;
  eventLog: EventLogEntry[];
  callMethod: string;
  callParams: string;
  callResult: string | null;
  callError: string | null;
  onCallMethodChange: (next: string) => void;
  onCallParamsChange: (next: string) => void;
  onRefresh: () => void;
  onCall: () => void;
};

export function renderDebug(props: DebugProps) {
  const securityAudit =
    props.status && typeof props.status === "object"
      ? (props.status as { securityAudit?: { summary?: Record<string, number> } }).securityAudit
      : null;
  const securitySummary = securityAudit?.summary ?? null;
  const critical = securitySummary?.critical ?? 0;
  const warn = securitySummary?.warn ?? 0;
  const info = securitySummary?.info ?? 0;
  const securityTone = critical > 0 ? "danger" : warn > 0 ? "warn" : "success";
  const securityLabel =
    critical > 0 ? `${critical} 个严重问题` : warn > 0 ? `${warn} 个告警` : "无严重问题";

  return html`
    <section class="grid gap-4 xl:grid-cols-2">
      <div class=${CARD_CLASS}>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class=${CARD_TITLE_CLASS}>快照</div>
            <div class=${CARD_SUB_CLASS}>状态、健康检查与心跳数据。</div>
          </div>
          <button class=${buttonClass()} ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "刷新中…" : "刷新"}
          </button>
        </div>
        <div class="mt-3 space-y-3">
          <div>
            <div class=${MUTED_TEXT_CLASS}>状态</div>
            ${
              securitySummary
                ? html`<div class="${calloutClass(securityTone)} mt-2">
                  安全审计: ${securityLabel}${info > 0 ? ` · ${info} 条信息` : ""}。可执行
                  <span class="font-[var(--mono)] text-[12px]">openclaw security audit --deep</span> 查看详情。
                </div>`
                : nothing
            }
            <pre class=${CODE_BLOCK_CLASS}>${JSON.stringify(props.status ?? {}, null, 2)}</pre>
          </div>
          <div>
            <div class=${MUTED_TEXT_CLASS}>健康检查</div>
            <pre class=${CODE_BLOCK_CLASS}>${JSON.stringify(props.health ?? {}, null, 2)}</pre>
          </div>
          <div>
            <div class=${MUTED_TEXT_CLASS}>最近心跳</div>
            <pre class=${CODE_BLOCK_CLASS}>${JSON.stringify(props.heartbeat ?? {}, null, 2)}</pre>
          </div>
        </div>
      </div>

      <div class=${CARD_CLASS}>
        <div class=${CARD_TITLE_CLASS}>手动 RPC</div>
        <div class=${CARD_SUB_CLASS}>手动发送网关方法与 JSON 参数。</div>
        <div class="mt-4 grid gap-3">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>方法名</span>
            <input
              class=${INPUT_CLASS}
              .value=${props.callMethod}
              @input=${(e: Event) => props.onCallMethodChange((e.target as HTMLInputElement).value)}
              placeholder="system-presence"
            />
          </label>
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>参数（JSON）</span>
            <textarea
              class=${TEXTAREA_CLASS}
              .value=${props.callParams}
              @input=${(e: Event) =>
                props.onCallParamsChange((e.target as HTMLTextAreaElement).value)}
              rows="6"
            ></textarea>
          </label>
        </div>
        <div class="mt-3">
          <button class=${buttonClass({ tone: "primary" })} @click=${props.onCall}>调用</button>
        </div>
        ${
          props.callError
            ? html`<div class="${calloutClass("danger")} mt-3">
              ${props.callError}
            </div>`
            : nothing
        }
        ${
          props.callResult
            ? html`<pre class="${CODE_BLOCK_CLASS} mt-3">${props.callResult}</pre>`
            : nothing
        }
      </div>
    </section>

    <section class="${CARD_CLASS} mt-4">
      <div class=${CARD_TITLE_CLASS}>模型目录</div>
      <div class=${CARD_SUB_CLASS}>来自 models.list 的模型列表。</div>
      <pre class="${CODE_BLOCK_CLASS} mt-3">${JSON.stringify(props.models ?? [], null, 2)}</pre>
    </section>

    <section class="${CARD_CLASS} mt-4">
      <div class=${CARD_TITLE_CLASS}>事件日志</div>
      <div class=${CARD_SUB_CLASS}>最近网关事件。</div>
      ${
        props.eventLog.length === 0
          ? html`
              <div class="mt-3 ${MUTED_TEXT_CLASS}">暂无事件。</div>
            `
          : html`
            <div class=${LIST_CLASS}>
              ${props.eventLog.map(
                (evt) => html`
                  <div class=${LIST_ITEM_CLASS}>
                    <div class=${LIST_MAIN_CLASS}>
                      <div class=${LIST_TITLE_CLASS}>${evt.event}</div>
                      <div class=${LIST_SUB_CLASS}>${new Date(evt.ts).toLocaleTimeString(getUiLocale())}</div>
                    </div>
                    <div class=${LIST_META_CLASS}>
                      <pre class=${CODE_BLOCK_CLASS}>${formatEventPayload(evt.payload)}</pre>
                    </div>
                  </div>
                `,
              )}
            </div>
          `
      }
    </section>
  `;
}
