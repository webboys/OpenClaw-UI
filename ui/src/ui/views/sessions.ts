import { html, nothing } from "lit";
import { localizeUiText } from "../error-localization.ts";
import { formatRelativeTimestamp } from "../format.ts";
import { pathForTab } from "../navigation.ts";
import { formatSessionTokens } from "../presenter.ts";
import type { GatewaySessionRow, SessionsListResult } from "../types.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  CHECKBOX_CLASS,
  CHECKBOX_FIELD_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_CLASS,
  MUTED_TEXT_CLASS,
  MONO_TEXT_CLASS,
  SELECT_CLASS,
} from "./tw.ts";

export type SessionsProps = {
  loading: boolean;
  result: SessionsListResult | null;
  error: string | null;
  activeMinutes: string;
  limit: string;
  includeGlobal: boolean;
  includeUnknown: boolean;
  basePath: string;
  onFiltersChange: (next: {
    activeMinutes: string;
    limit: string;
    includeGlobal: boolean;
    includeUnknown: boolean;
  }) => void;
  onRefresh: () => void;
  onPatch: (
    key: string,
    patch: {
      label?: string | null;
      thinkingLevel?: string | null;
      verboseLevel?: string | null;
      reasoningLevel?: string | null;
    },
  ) => void;
  onDelete: (key: string) => void;
};

const THINK_LEVELS = ["", "off", "minimal", "low", "medium", "high", "xhigh"] as const;
const BINARY_THINK_LEVELS = ["", "off", "on"] as const;
const THINK_LEVEL_LABELS: Record<string, string> = {
  off: "关闭",
  on: "开启",
  minimal: "最小",
  low: "低",
  medium: "中",
  high: "高",
  xhigh: "超高",
};
const VERBOSE_LEVELS = [
  { value: "", label: "继承" },
  { value: "off", label: "关闭（显式）" },
  { value: "on", label: "开启" },
  { value: "full", label: "完整" },
] as const;
const REASONING_LEVELS = ["", "off", "on", "stream"] as const;
const REASONING_LEVEL_LABELS: Record<string, string> = {
  off: "关闭",
  on: "开启",
  stream: "流式",
};
const SESSION_KIND_LABELS: Record<string, string> = {
  global: "全局",
  main: "主会话",
  direct: "私聊",
  group: "群聊",
  subagent: "子助手",
  cron: "定时任务",
  unknown: "未知",
};
const SESSION_GRID_CLASS =
  "grid gap-2 lg:grid-cols-[minmax(220px,1.8fr)_minmax(140px,1fr)_70px_88px_96px_120px_120px_120px_86px] lg:items-center";

function normalizeProviderId(provider?: string | null): string {
  if (!provider) {
    return "";
  }
  const normalized = provider.trim().toLowerCase();
  if (normalized === "z.ai" || normalized === "z-ai") {
    return "zai";
  }
  return normalized;
}

function isBinaryThinkingProvider(provider?: string | null): boolean {
  return normalizeProviderId(provider) === "zai";
}

function resolveThinkLevelOptions(provider?: string | null): readonly string[] {
  return isBinaryThinkingProvider(provider) ? BINARY_THINK_LEVELS : THINK_LEVELS;
}

function withCurrentOption(options: readonly string[], current: string): string[] {
  if (!current) {
    return [...options];
  }
  if (options.includes(current)) {
    return [...options];
  }
  return [...options, current];
}

function formatEnumValueLabel(
  value: string,
  map: Record<string, string>,
  inheritLabel = "继承",
): string {
  if (!value) {
    return inheritLabel;
  }
  return map[value] ?? localizeUiText(value);
}

function formatSessionKind(kind?: string | null): string {
  const raw = kind?.trim();
  if (!raw) {
    return "未知";
  }
  const normalized = raw.toLowerCase();
  return SESSION_KIND_LABELS[normalized] ?? localizeUiText(raw);
}

function withCurrentLabeledOption(
  options: readonly { value: string; label: string }[],
  current: string,
): Array<{ value: string; label: string }> {
  if (!current) {
    return [...options];
  }
  if (options.some((option) => option.value === current)) {
    return [...options];
  }
  return [...options, { value: current, label: `${current}（自定义）` }];
}

function resolveThinkLevelDisplay(value: string, isBinary: boolean): string {
  if (!isBinary) {
    return value;
  }
  if (!value || value === "off") {
    return value;
  }
  return "on";
}

function resolveThinkLevelPatchValue(value: string, isBinary: boolean): string | null {
  if (!value) {
    return null;
  }
  if (!isBinary) {
    return value;
  }
  if (value === "on") {
    return "low";
  }
  return value;
}

export function renderSessions(props: SessionsProps) {
  const rows = props.result?.sessions ?? [];
  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class=${CARD_TITLE_CLASS}>会话</div>
          <div class=${CARD_SUB_CLASS}>活跃会话键与会话级覆盖配置。</div>
        </div>
        <button class=${buttonClass()} ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "加载中…" : "刷新"}
        </button>
      </div>

      <div class="mt-4 grid gap-3 xl:grid-cols-[minmax(200px,1fr)_minmax(160px,1fr)_auto_auto]">
        <label class=${FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>活跃时间窗口（分钟）</span>
          <input
            class=${INPUT_CLASS}
            .value=${props.activeMinutes}
            @input=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: (e.target as HTMLInputElement).value,
                limit: props.limit,
                includeGlobal: props.includeGlobal,
                includeUnknown: props.includeUnknown,
              })}
          />
        </label>
        <label class=${FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>数量上限</span>
          <input
            class=${INPUT_CLASS}
            .value=${props.limit}
            @input=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: (e.target as HTMLInputElement).value,
                includeGlobal: props.includeGlobal,
                includeUnknown: props.includeUnknown,
              })}
          />
        </label>
        <label class=${CHECKBOX_FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>包含全局会话</span>
          <input
            class=${CHECKBOX_CLASS}
            type="checkbox"
            .checked=${props.includeGlobal}
            @change=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: props.limit,
                includeGlobal: (e.target as HTMLInputElement).checked,
                includeUnknown: props.includeUnknown,
              })}
          />
        </label>
        <label class=${CHECKBOX_FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>包含未知会话</span>
          <input
            class=${CHECKBOX_CLASS}
            type="checkbox"
            .checked=${props.includeUnknown}
            @change=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: props.limit,
                includeGlobal: props.includeGlobal,
                includeUnknown: (e.target as HTMLInputElement).checked,
              })}
          />
        </label>
      </div>

      ${
        props.error
          ? html`<div class="${calloutClass("danger")} mt-3">${props.error}</div>`
          : nothing
      }

      <div class="mt-3 ${MUTED_TEXT_CLASS}">
        ${props.result ? `存储路径: ${props.result.path}` : ""}
      </div>

      <div
        class="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3"
      >
        <div class="${SESSION_GRID_CLASS} border-b border-[var(--border)] pb-2 text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
          <div>会话键</div>
          <div>标签</div>
          <div>类型</div>
          <div>更新时间</div>
          <div>令牌</div>
          <div>思考</div>
          <div>详细</div>
          <div>推理</div>
          <div>操作</div>
        </div>
        ${
          rows.length === 0
            ? html`
                <div class="pt-3 ${MUTED_TEXT_CLASS}">未找到会话。</div>
              `
            : rows.map((row) =>
                renderRow(row, props.basePath, props.onPatch, props.onDelete, props.loading),
              )
        }
      </div>
    </section>
  `;
}

function renderRow(
  row: GatewaySessionRow,
  basePath: string,
  onPatch: SessionsProps["onPatch"],
  onDelete: SessionsProps["onDelete"],
  disabled: boolean,
) {
  const updated = row.updatedAt ? formatRelativeTimestamp(row.updatedAt) : "暂无";
  const rawThinking = row.thinkingLevel ?? "";
  const isBinaryThinking = isBinaryThinkingProvider(row.modelProvider);
  const thinking = resolveThinkLevelDisplay(rawThinking, isBinaryThinking);
  const thinkLevels = withCurrentOption(resolveThinkLevelOptions(row.modelProvider), thinking);
  const verbose = row.verboseLevel ?? "";
  const verboseLevels = withCurrentLabeledOption(VERBOSE_LEVELS, verbose);
  const reasoning = row.reasoningLevel ?? "";
  const reasoningLevels = withCurrentOption(REASONING_LEVELS, reasoning);
  const displayName =
    typeof row.displayName === "string" && row.displayName.trim().length > 0
      ? row.displayName.trim()
      : null;
  const label = typeof row.label === "string" ? row.label.trim() : "";
  const showDisplayName = Boolean(displayName && displayName !== row.key && displayName !== label);
  const canLink = row.kind !== "global";
  const chatUrl = canLink
    ? `${pathForTab("chat", basePath)}?session=${encodeURIComponent(row.key)}`
    : null;

  return html`
    <div class="${SESSION_GRID_CLASS} border-b border-[var(--border)] py-2 text-[13px] last:border-b-0">
      <div class="flex min-w-0 flex-col gap-1">
        ${
          canLink
            ? html`<a
                href=${chatUrl}
                class="font-[var(--mono)] text-xs tracking-[-0.01em] text-[var(--accent)] hover:underline"
                >${row.key}</a
              >`
            : html`<span class=${MONO_TEXT_CLASS}>${row.key}</span>`
        }
        ${
          showDisplayName
            ? html`<span class="text-[12px] text-[var(--muted)]">${displayName}</span>`
            : nothing
        }
      </div>
      <div>
        <input
          class=${INPUT_CLASS}
          .value=${row.label ?? ""}
          ?disabled=${disabled}
          placeholder="（可选）"
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value.trim();
            onPatch(row.key, { label: value || null });
          }}
        />
      </div>
      <div>${formatSessionKind(row.kind)}</div>
      <div>${updated}</div>
      <div>${formatSessionTokens(row)}</div>
      <div>
        <select
          class=${SELECT_CLASS}
          ?disabled=${disabled}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            onPatch(row.key, {
              thinkingLevel: resolveThinkLevelPatchValue(value, isBinaryThinking),
            });
          }}
        >
          ${thinkLevels.map(
            (level) =>
              html`<option value=${level} ?selected=${thinking === level}>
                ${formatEnumValueLabel(level, THINK_LEVEL_LABELS)}
              </option>`,
          )}
        </select>
      </div>
      <div>
        <select
          class=${SELECT_CLASS}
          ?disabled=${disabled}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            onPatch(row.key, { verboseLevel: value || null });
          }}
        >
          ${verboseLevels.map(
            (level) =>
              html`<option value=${level.value} ?selected=${verbose === level.value}>
                ${level.label}
              </option>`,
          )}
        </select>
      </div>
      <div>
        <select
          class=${SELECT_CLASS}
          ?disabled=${disabled}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            onPatch(row.key, { reasoningLevel: value || null });
          }}
        >
          ${reasoningLevels.map(
            (level) =>
              html`<option value=${level} ?selected=${reasoning === level}>
                ${formatEnumValueLabel(level, REASONING_LEVEL_LABELS)}
              </option>`,
          )}
        </select>
      </div>
      <div>
        <button
          class=${buttonClass({ tone: "danger" })}
          ?disabled=${disabled}
          @click=${() => onDelete(row.key)}
        >
          删除
        </button>
      </div>
    </div>
  `;
}
