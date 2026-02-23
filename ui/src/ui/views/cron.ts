import { html, nothing } from "lit";
import { formatRelativeTimestamp, formatMs } from "../format.ts";
import { pathForTab } from "../navigation.ts";
import { formatCronSchedule, formatNextRun } from "../presenter.ts";
import type { ChannelUiMetaEntry, CronJob, CronRunLogEntry, CronStatus } from "../types.ts";
import type { CronFormState } from "../ui-types.ts";
import {
  buttonClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  CHECKBOX_CLASS,
  CHECKBOX_FIELD_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_CLASS,
  LIST_CLASS,
  MUTED_TEXT_CLASS,
  SELECT_CLASS,
  TEXTAREA_CLASS,
} from "./tw.ts";

export type CronProps = {
  basePath: string;
  loading: boolean;
  status: CronStatus | null;
  jobs: CronJob[];
  error: string | null;
  busy: boolean;
  form: CronFormState;
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];
  runsJobId: string | null;
  runs: CronRunLogEntry[];
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
};

function buildChannelOptions(props: CronProps): string[] {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.deliveryChannel?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  const seen = new Set<string>();
  return options.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function resolveChannelLabel(props: CronProps, channel: string): string {
  if (channel === "last") {
    return "最近会话";
  }
  const meta = props.channelMeta?.find((entry) => entry.id === channel);
  if (meta?.label) {
    return meta.label;
  }
  return props.channelLabels?.[channel] ?? channel;
}

export function renderCron(props: CronProps) {
  const channelOptions = buildChannelOptions(props);
  const selectedJob =
    props.runsJobId == null ? undefined : props.jobs.find((job) => job.id === props.runsJobId);
  const selectedRunTitle = selectedJob?.name ?? props.runsJobId ?? "（请选择任务）";
  const orderedRuns = props.runs.toSorted((a, b) => b.ts - a.ts);
  const supportsAnnounce =
    props.form.sessionTarget === "isolated" && props.form.payloadKind === "agentTurn";
  const selectedDeliveryMode =
    props.form.deliveryMode === "announce" && !supportsAnnounce ? "none" : props.form.deliveryMode;
  return html`
    <section class="grid gap-4 xl:grid-cols-2">
      <div class="card ${CARD_CLASS}">
        <div class="card-title ${CARD_TITLE_CLASS}">调度器</div>
        <div class="card-sub ${CARD_SUB_CLASS}">网关内置 Cron 调度状态。</div>
        <div class="stat-grid mt-4">
          <div class="stat">
            <div class="stat-label">启用</div>
            <div class="stat-value">
              ${props.status ? (props.status.enabled ? "是" : "否") : "暂无"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">任务数</div>
            <div class="stat-value">${props.status?.jobs ?? "暂无"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">下次唤醒</div>
            <div class="stat-value">${formatNextRun(props.status?.nextWakeAtMs ?? null)}</div>
          </div>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <button class=${buttonClass()} ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "刷新中…" : "刷新"}
          </button>
          ${props.error ? html`<span class=${MUTED_TEXT_CLASS}>${props.error}</span>` : nothing}
        </div>
      </div>

      <div class="card ${CARD_CLASS}">
        <div class="card-title ${CARD_TITLE_CLASS}">新建任务</div>
        <div class="card-sub ${CARD_SUB_CLASS}">创建定时唤醒或智能体执行任务。</div>
        <div class="form-grid mt-4">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>名称</span>
            <input
              class=${INPUT_CLASS}
              .value=${props.form.name}
              @input=${(e: Event) =>
                props.onFormChange({ name: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>描述</span>
            <input
              class=${INPUT_CLASS}
              .value=${props.form.description}
              @input=${(e: Event) =>
                props.onFormChange({ description: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>智能体 ID</span>
            <input
              class=${INPUT_CLASS}
              .value=${props.form.agentId}
              @input=${(e: Event) =>
                props.onFormChange({ agentId: (e.target as HTMLInputElement).value })}
              placeholder="默认"
            />
          </label>
          <label class=${CHECKBOX_FIELD_CLASS}>
            <span>启用</span>
            <input
              class=${CHECKBOX_CLASS}
              type="checkbox"
              .checked=${props.form.enabled}
              @change=${(e: Event) =>
                props.onFormChange({ enabled: (e.target as HTMLInputElement).checked })}
            />
          </label>
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>调度方式</span>
            <select
              class=${SELECT_CLASS}
              .value=${props.form.scheduleKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  scheduleKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["scheduleKind"],
                })}
            >
              <option value="every">每隔</option>
              <option value="at">指定时间</option>
              <option value="cron">Cron 表达式</option>
            </select>
          </label>
        </div>
        ${renderScheduleFields(props)}
        <div class="form-grid mt-3">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>会话目标</span>
            <select
              class=${SELECT_CLASS}
              .value=${props.form.sessionTarget}
              @change=${(e: Event) =>
                props.onFormChange({
                  sessionTarget: (e.target as HTMLSelectElement)
                    .value as CronFormState["sessionTarget"],
                })}
            >
              <option value="main">主会话</option>
              <option value="isolated">隔离会话</option>
            </select>
          </label>
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>唤醒模式</span>
            <select
              class=${SELECT_CLASS}
              .value=${props.form.wakeMode}
              @change=${(e: Event) =>
                props.onFormChange({
                    wakeMode: (e.target as HTMLSelectElement).value as CronFormState["wakeMode"],
                })}
            >
              <option value="now">立即</option>
              <option value="next-heartbeat">下次心跳</option>
            </select>
          </label>
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>负载类型</span>
            <select
              class=${SELECT_CLASS}
              .value=${props.form.payloadKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  payloadKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["payloadKind"],
                })}
            >
              <option value="systemEvent">系统事件</option>
              <option value="agentTurn">智能体对话</option>
            </select>
          </label>
        </div>
        <label class="${FIELD_CLASS} mt-3">
          <span class=${FIELD_LABEL_CLASS}>${props.form.payloadKind === "systemEvent" ? "系统文本" : "智能体消息"}</span>
          <textarea
            class=${TEXTAREA_CLASS}
            .value=${props.form.payloadText}
            @input=${(e: Event) =>
              props.onFormChange({
                payloadText: (e.target as HTMLTextAreaElement).value,
              })}
            rows="4"
          ></textarea>
        </label>
        <div class="form-grid mt-3">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>投递方式</span>
            <select
              class=${SELECT_CLASS}
              .value=${selectedDeliveryMode}
              @change=${(e: Event) =>
                props.onFormChange({
                  deliveryMode: (e.target as HTMLSelectElement)
                    .value as CronFormState["deliveryMode"],
                })}
            >
              ${
                supportsAnnounce
                  ? html`
                      <option value="announce">消息摘要播报（默认）</option>
                    `
                  : nothing
              }
              <option value="webhook">回调推送</option>
              <option value="none">无（仅内部）</option>
            </select>
          </label>
          ${
            props.form.payloadKind === "agentTurn"
              ? html`
                  <label class=${FIELD_CLASS}>
                    <span class=${FIELD_LABEL_CLASS}>超时（秒）</span>
                    <input
                      class=${INPUT_CLASS}
                      .value=${props.form.timeoutSeconds}
                      @input=${(e: Event) =>
                        props.onFormChange({
                          timeoutSeconds: (e.target as HTMLInputElement).value,
                        })}
                    />
                  </label>
                `
              : nothing
          }
          ${
            selectedDeliveryMode !== "none"
              ? html`
                  <label class=${FIELD_CLASS}>
                    <span class=${FIELD_LABEL_CLASS}>${selectedDeliveryMode === "webhook" ? "回调地址" : "频道"}</span>
                    ${
                      selectedDeliveryMode === "webhook"
                        ? html`
                            <input
                              class=${INPUT_CLASS}
                              .value=${props.form.deliveryTo}
                              @input=${(e: Event) =>
                                props.onFormChange({
                                  deliveryTo: (e.target as HTMLInputElement).value,
                                })}
                              placeholder="https://example.invalid/cron"
                            />
                          `
                        : html`
                            <select
                              class=${SELECT_CLASS}
                              .value=${props.form.deliveryChannel || "last"}
                              @change=${(e: Event) =>
                                props.onFormChange({
                                  deliveryChannel: (e.target as HTMLSelectElement).value,
                                })}
                            >
                              ${channelOptions.map(
                                (channel) =>
                                  html`<option value=${channel}>
                                    ${resolveChannelLabel(props, channel)}
                                  </option>`,
                              )}
                            </select>
                          `
                    }
                  </label>
                  ${
                    selectedDeliveryMode === "announce"
                      ? html`
                          <label class=${FIELD_CLASS}>
                            <span class=${FIELD_LABEL_CLASS}>接收方</span>
                            <input
                              class=${INPUT_CLASS}
                              .value=${props.form.deliveryTo}
                              @input=${(e: Event) =>
                                props.onFormChange({
                                  deliveryTo: (e.target as HTMLInputElement).value,
                                })}
                              placeholder="手机号或会话标识"
                            />
                          </label>
                        `
                      : nothing
                  }
                `
              : nothing
          }
        </div>
        <div class="mt-3.5 flex items-center gap-2">
          <button class=${buttonClass({ tone: "primary" })} ?disabled=${props.busy} @click=${props.onAdd}>
            ${props.busy ? "保存中…" : "添加任务"}
          </button>
        </div>
      </div>
    </section>

    <section class="card ${CARD_CLASS} mt-4.5">
      <div class="card-title ${CARD_TITLE_CLASS}">任务列表</div>
      <div class="card-sub ${CARD_SUB_CLASS}">网关中已保存的全部计划任务。</div>
      ${
        props.jobs.length === 0
          ? html`
              <div class="${MUTED_TEXT_CLASS} mt-3">暂无任务。</div>
            `
          : html`
            <div class="${LIST_CLASS} mt-3">
              ${props.jobs.map((job) => renderJob(job, props))}
            </div>
          `
      }
    </section>

    <section class="card ${CARD_CLASS} mt-4.5">
      <div class="card-title ${CARD_TITLE_CLASS}">运行历史</div>
      <div class="card-sub ${CARD_SUB_CLASS}">最近运行：${selectedRunTitle}</div>
      ${
        props.runsJobId == null
          ? html`
              <div class="${MUTED_TEXT_CLASS} mt-3">请先选择任务，再查看运行历史。</div>
            `
          : orderedRuns.length === 0
            ? html`
                <div class="${MUTED_TEXT_CLASS} mt-3">暂无运行记录。</div>
              `
            : html`
              <div class="${LIST_CLASS} mt-3">
                ${orderedRuns.map((entry) => renderRun(entry, props.basePath))}
              </div>
            `
      }
    </section>
  `;
}

function renderScheduleFields(props: CronProps) {
  const form = props.form;
  if (form.scheduleKind === "at") {
    return html`
      <label class="${FIELD_CLASS} mt-3">
        <span class=${FIELD_LABEL_CLASS}>执行时间</span>
        <input
          class=${INPUT_CLASS}
          type="datetime-local"
          .value=${form.scheduleAt}
          @input=${(e: Event) =>
            props.onFormChange({
              scheduleAt: (e.target as HTMLInputElement).value,
            })}
        />
      </label>
    `;
  }
  if (form.scheduleKind === "every") {
    return html`
      <div class="form-grid mt-3">
        <label class=${FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>每隔</span>
          <input
            class=${INPUT_CLASS}
            .value=${form.everyAmount}
            @input=${(e: Event) =>
              props.onFormChange({
                everyAmount: (e.target as HTMLInputElement).value,
            })}
          />
        </label>
        <label class=${FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>单位</span>
          <select
            class=${SELECT_CLASS}
            .value=${form.everyUnit}
            @change=${(e: Event) =>
              props.onFormChange({
                everyUnit: (e.target as HTMLSelectElement).value as CronFormState["everyUnit"],
              })}
          >
            <option value="minutes">分钟</option>
            <option value="hours">小时</option>
            <option value="days">天</option>
          </select>
        </label>
      </div>
    `;
  }
  return html`
    <div class="form-grid mt-3">
      <label class=${FIELD_CLASS}>
        <span class=${FIELD_LABEL_CLASS}>表达式</span>
        <input
          class=${INPUT_CLASS}
          .value=${form.cronExpr}
          @input=${(e: Event) =>
            props.onFormChange({ cronExpr: (e.target as HTMLInputElement).value })}
        />
      </label>
      <label class=${FIELD_CLASS}>
        <span class=${FIELD_LABEL_CLASS}>时区（可选）</span>
        <input
          class=${INPUT_CLASS}
          .value=${form.cronTz}
          @input=${(e: Event) =>
            props.onFormChange({ cronTz: (e.target as HTMLInputElement).value })}
        />
      </label>
    </div>
  `;
}

function renderJob(job: CronJob, props: CronProps) {
  const isSelected = props.runsJobId === job.id;
  const itemClass = `list-item list-item-clickable cron-job${isSelected ? " list-item-selected" : ""}`;
  return html`
    <div class=${itemClass} @click=${() => props.onLoadRuns(job.id)}>
      <div class="list-main">
        <div class="list-title">${job.name}</div>
        <div class="list-sub">${formatCronSchedule(job)}</div>
        ${renderJobPayload(job)}
        ${job.agentId ? html`<div class="muted cron-job-agent">助手：${job.agentId}</div>` : nothing}
      </div>
      <div class="list-meta">
        ${renderJobState(job)}
      </div>
      <div class="cron-job-footer">
        <div class="chip-row cron-job-chips">
          <span class=${`chip ${job.enabled ? "chip-ok" : "chip-danger"}`}>
            ${job.enabled ? "已启用" : "已禁用"}
          </span>
          <span class="chip">${formatSessionTarget(job.sessionTarget)}</span>
          <span class="chip">${formatWakeMode(job.wakeMode)}</span>
        </div>
        <div class="row cron-job-actions">
          <button
            class="btn"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onToggle(job, !job.enabled);
            }}
          >
            ${job.enabled ? "禁用" : "启用"}
          </button>
          <button
            class="btn"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onRun(job);
            }}
          >
            立即运行
          </button>
          <button
            class="btn"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onLoadRuns(job.id);
            }}
          >
            历史
          </button>
          <button
            class="btn danger"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onRemove(job);
            }}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderJobPayload(job: CronJob) {
  if (job.payload.kind === "systemEvent") {
    return html`<div class="cron-job-detail">
      <span class="cron-job-detail-label">系统</span>
      <span class="muted cron-job-detail-value">${job.payload.text}</span>
    </div>`;
  }

  const delivery = job.delivery;
  const deliveryTarget =
    delivery?.mode === "webhook"
      ? delivery.to
        ? ` (${delivery.to})`
        : ""
      : delivery?.channel || delivery?.to
        ? ` (${delivery.channel ?? "最近会话"}${delivery.to ? ` -> ${delivery.to}` : ""})`
        : "";

  return html`
    <div class="cron-job-detail">
      <span class="cron-job-detail-label">提示词</span>
      <span class="muted cron-job-detail-value">${job.payload.message}</span>
    </div>
    ${
      delivery
        ? html`<div class="cron-job-detail">
            <span class="cron-job-detail-label">投递</span>
            <span class="muted cron-job-detail-value">${formatDeliveryMode(delivery.mode)}${deliveryTarget}</span>
          </div>`
        : nothing
    }
  `;
}

function formatStateRelative(ms?: number) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "暂无";
  }
  return formatRelativeTimestamp(ms);
}

function renderJobState(job: CronJob) {
  const rawStatus = (job.state?.lastStatus ?? "na").trim().toLowerCase();
  const status = formatRunStatus(job.state?.lastStatus ?? "暂无");
  const statusClass =
    rawStatus === "ok" || rawStatus === "success"
      ? "cron-job-status-ok"
      : rawStatus === "error" || rawStatus === "failed" || rawStatus === "fail"
        ? "cron-job-status-error"
        : rawStatus === "skipped"
          ? "cron-job-status-skipped"
          : "cron-job-status-na";
  const nextRunAtMs = job.state?.nextRunAtMs;
  const lastRunAtMs = job.state?.lastRunAtMs;

  return html`
    <div class="cron-job-state">
      <div class="cron-job-state-row">
        <span class="cron-job-state-key">状态</span>
        <span class=${`cron-job-status-pill ${statusClass}`}>${status}</span>
      </div>
      <div class="cron-job-state-row">
        <span class="cron-job-state-key">下次</span>
        <span class="cron-job-state-value" title=${formatMs(nextRunAtMs)}>
          ${formatStateRelative(nextRunAtMs)}
        </span>
      </div>
      <div class="cron-job-state-row">
        <span class="cron-job-state-key">上次</span>
        <span class="cron-job-state-value" title=${formatMs(lastRunAtMs)}>
          ${formatStateRelative(lastRunAtMs)}
        </span>
      </div>
    </div>
  `;
}

function renderRun(entry: CronRunLogEntry, basePath: string) {
  const chatUrl =
    typeof entry.sessionKey === "string" && entry.sessionKey.trim().length > 0
      ? `${pathForTab("chat", basePath)}?session=${encodeURIComponent(entry.sessionKey)}`
      : null;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${formatRunStatus(entry.status)}</div>
        <div class="list-sub">${entry.summary ?? ""}</div>
      </div>
      <div class="list-meta">
        <div>${formatMs(entry.ts)}</div>
        <div class="muted">${entry.durationMs ?? 0} 毫秒</div>
        ${
          chatUrl
            ? html`<div><a class="session-link" href=${chatUrl}>打开运行会话</a></div>`
            : nothing
        }
        ${entry.error ? html`<div class="muted">${entry.error}</div>` : nothing}
      </div>
    </div>
  `;
}

function formatSessionTarget(value: string): string {
  if (value === "main") {
    return "主会话";
  }
  if (value === "isolated") {
    return "隔离会话";
  }
  return value;
}

function formatWakeMode(value: string): string {
  if (value === "now") {
    return "立即";
  }
  if (value === "next-heartbeat") {
    return "下次心跳";
  }
  return value;
}

function formatDeliveryMode(value: string): string {
  if (value === "announce") {
    return "消息播报";
  }
  if (value === "webhook") {
    return "回调推送";
  }
  if (value === "none") {
    return "无";
  }
  return value;
}

function formatRunStatus(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ok" || normalized === "success") {
    return "成功";
  }
  if (normalized === "error" || normalized === "failed" || normalized === "fail") {
    return "失败";
  }
  if (normalized === "skipped") {
    return "已跳过";
  }
  if (normalized === "running") {
    return "运行中";
  }
  if (normalized === "pending") {
    return "等待中";
  }
  return value;
}
