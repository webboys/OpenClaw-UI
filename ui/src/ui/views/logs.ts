import { html, nothing } from "lit";
import { localizeUiText } from "../error-localization.ts";
import { getUiLocale } from "../format.ts";
import type { LogEntry, LogLevel } from "../types.ts";

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
const LEVEL_LABELS: Record<LogLevel, string> = {
  trace: "跟踪",
  debug: "调试",
  info: "信息",
  warn: "警告",
  error: "错误",
  fatal: "致命",
};

export type LogsProps = {
  loading: boolean;
  error: string | null;
  file: string | null;
  entries: LogEntry[];
  filterText: string;
  levelFilters: Record<LogLevel, boolean>;
  autoFollow: boolean;
  truncated: boolean;
  onFilterTextChange: (next: string) => void;
  onLevelToggle: (level: LogLevel, enabled: boolean) => void;
  onToggleAutoFollow: (next: boolean) => void;
  onRefresh: () => void;
  onExport: (lines: string[], label: string) => void;
  onScroll: (event: Event) => void;
};

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString(getUiLocale());
}

function matchesFilter(entry: LogEntry, needle: string) {
  if (!needle) {
    return true;
  }
  const haystack = [entry.message, entry.subsystem, entry.raw]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function formatLevel(level?: LogLevel | null) {
  if (!level) {
    return "原始";
  }
  return LEVEL_LABELS[level] ?? level.toUpperCase();
}

type LogsInsight = {
  points: string[];
  severe: boolean;
};

function buildLogsInsight(entries: LogEntry[]): LogsInsight | null {
  if (entries.length === 0) {
    return null;
  }

  const windowed = entries.slice(-Math.min(entries.length, 200));
  let errors = 0;
  let warns = 0;
  let infos = 0;
  const subsystemCount = new Map<string, number>();
  let recentError: string | null = null;

  for (let i = windowed.length - 1; i >= 0; i--) {
    const entry = windowed[i];
      if (entry.level === "error" || entry.level === "fatal") {
        errors += 1;
        if (!recentError && entry.message) {
          recentError = localizeUiText(entry.message);
        }
    } else if (entry.level === "warn") {
      warns += 1;
    } else {
      infos += 1;
    }
  }

  for (const entry of windowed) {
    const name = entry.subsystem?.trim();
    if (!name) {
      continue;
    }
    subsystemCount.set(name, (subsystemCount.get(name) ?? 0) + 1);
  }

  const hottestSubsystem = [...subsystemCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const severe = errors > 0 || warns > Math.max(2, Math.floor(windowed.length * 0.2));
  const points = [
    `最近 ${windowed.length} 条日志：信息 ${infos}，警告 ${warns}，错误 ${errors}。`,
    hottestSubsystem
      ? `最活跃子系统：${hottestSubsystem[0]}（${hottestSubsystem[1]} 条）。`
      : "当前日志无明显子系统热点。",
    recentError
      ? `最新错误摘要：${recentError.slice(0, 120)}${recentError.length > 120 ? "…" : ""}`
      : "未检测到新的错误日志。",
  ];

  return { points, severe };
}

function renderLogRows(filtered: LogEntry[]) {
  if (filtered.length === 0) {
    return html`<div class="muted p-4">暂无日志记录。</div>`;
  }

  return filtered.map(
    (entry) => html`
      <article class="log-row" data-level=${entry.level ?? "trace"}>
        <div class="log-row-head">
          <div class="log-time mono">${formatTime(entry.time)}</div>
          <div class="log-level ${entry.level ?? ""}">${formatLevel(entry.level)}</div>
          <div class="log-subsystem mono">${entry.subsystem ? localizeUiText(entry.subsystem) : "网关"}</div>
        </div>
        <div class="log-message mono">${
          entry.message ? localizeUiText(entry.message) : entry.raw
        }</div>
      </article>
    `,
  );
}

export function renderLogs(props: LogsProps) {
  const needle = props.filterText.trim().toLowerCase();
  const levelFiltered = LEVELS.some((level) => !props.levelFilters[level]);
  const filtered = props.entries.filter((entry) => {
    if (entry.level && !props.levelFilters[entry.level]) {
      return false;
    }
    return matchesFilter(entry, needle);
  });
  const exportLabel = needle || levelFiltered ? "筛选结果" : "全部";
  const shouldAutoCollapse = filtered.length > 120 && !needle && !levelFiltered;
  const insight = buildLogsInsight(filtered);

  return html`
    <section class="card logs-card">
      <div class="logs-toolbar flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="max-w-3xl">
          <div class="card-title text-balance">运行日志</div>
          <div class="card-sub text-balance">网关日志文件（JSONL）。</div>
        </div>
        <div class="row logs-toolbar-actions w-full justify-end gap-2 md:w-auto">
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "加载中…" : "刷新"}
          </button>
          <button
            class="btn"
            ?disabled=${filtered.length === 0}
            @click=${() =>
              props.onExport(
                filtered.map((entry) => entry.raw),
                exportLabel,
              )}
          >
            导出${exportLabel}
          </button>
        </div>
      </div>

      <div class="filters logs-filters mt-4 gap-3">
        <label class="field logs-filter-search min-w-[220px] flex-1">
          <span>筛选</span>
          <input
            .value=${props.filterText}
            @input=${(e: Event) => props.onFilterTextChange((e.target as HTMLInputElement).value)}
            placeholder="搜索日志"
          />
        </label>
        <label class="field checkbox logs-filter-autofollow min-w-max">
          <span>自动跟随</span>
          <input
            type="checkbox"
            .checked=${props.autoFollow}
            @change=${(e: Event) =>
              props.onToggleAutoFollow((e.target as HTMLInputElement).checked)}
          />
        </label>
      </div>

      <div class="chip-row mt-3">
        ${LEVELS.map(
          (level) => html`
            <label class="chip log-chip ${level}" data-level=${level}>
              <input
                type="checkbox"
                .checked=${props.levelFilters[level]}
                @change=${(e: Event) =>
                  props.onLevelToggle(level, (e.target as HTMLInputElement).checked)}
              />
              <span>${LEVEL_LABELS[level]}</span>
            </label>
          `,
        )}
      </div>

      ${props.file ? html`<div class="muted mt-3">文件：${props.file}</div>` : nothing}
      ${
        props.truncated
          ? html`
              <div class="callout mt-3">日志输出已截断，仅展示最新片段。</div>
            `
          : nothing
      }
      ${props.error ? html`<div class="callout danger mt-3">${props.error}</div>` : nothing}

      ${
        insight
          ? html`
              <details class="logs-insight" ?open=${!shouldAutoCollapse}>
                <summary>
                  <span class="logs-insight__dot"></span>
                  <span>${insight.severe ? "智能摘要点（关注告警）" : "智能摘要点（运行平稳）"}</span>
                </summary>
                <div class="logs-insight__body">
                  ${insight.points.map((line) => html`<div class="logs-insight__line">${line}</div>`)}
                </div>
              </details>
            `
          : nothing
      }

      ${
        shouldAutoCollapse
          ? html`
              <details class="logs-details-collapse">
                <summary>
                  <span>展开详细日志（${filtered.length} 条）</span>
                  <span class="muted">点击查看完整流</span>
                </summary>
                <div
                  class="log-stream cinematic-scroll"
                  @scroll=${props.onScroll}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  ${renderLogRows(filtered)}
                </div>
              </details>
            `
          : html`
              <div
                class="log-stream cinematic-scroll mt-3"
                @scroll=${props.onScroll}
                role="log"
                aria-live="polite"
                aria-relevant="additions"
              >
                ${renderLogRows(filtered)}
              </div>
            `
      }
    </section>
  `;
}
