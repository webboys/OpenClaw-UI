export type ButtonTone = "default" | "primary" | "danger";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[linear-gradient(135deg,var(--secondary)_0%,var(--bg-elevated)_100%)] px-3 py-2 text-[13px] font-medium text-[var(--text-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.16)] transition motion-safe:hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_SMALL = "px-2.5 py-1.5 text-[12px]";
const BUTTON_ACTIVE = "border-[var(--accent)] bg-[var(--accent-subtle)]";
const BUTTON_PRIMARY = "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-strong)]";
const BUTTON_DANGER = "border-[var(--danger-muted)] bg-[var(--danger-subtle)] text-[var(--danger)]";

const CALLOUT_BASE = "rounded-[var(--radius-md)] border px-3 py-2 text-[13px] leading-relaxed";
const CALLOUT_DEFAULT = "border-[var(--border)] bg-[var(--secondary)] text-[var(--text)]";
const CALLOUT_DANGER =
  "border-[var(--danger-muted)] bg-[var(--danger-subtle)] text-[var(--danger)]";
const CALLOUT_WARN = "border-[var(--warn-muted)] bg-[var(--warn-subtle)] text-[var(--warn)]";
const CALLOUT_SUCCESS = "border-[var(--ok-muted)] bg-[var(--ok-subtle)] text-[var(--ok)]";

export const CARD_CLASS =
  "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,var(--card)_0%,var(--bg-elevated)_100%)] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.26)] backdrop-blur-md transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_22px_56px_rgba(0,0,0,0.34)]";
export const CARD_TITLE_CLASS =
  "text-[17px] font-semibold tracking-[-0.03em] text-[var(--text-strong)]";
export const CARD_SUB_CLASS = "mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]";

export const MUTED_TEXT_CLASS = "text-[13px] text-[var(--muted)]";
export const MUTED_TEXT_SMALL_CLASS = "text-[12px] text-[var(--muted)]";
export const MONO_TEXT_CLASS =
  "font-[var(--mono)] text-[12px] tracking-[-0.01em] text-[var(--text-strong)]";

export const FIELD_CLASS = "flex min-w-0 flex-col gap-1.5";
export const FIELD_LABEL_CLASS =
  "text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]";
export const CHECKBOX_FIELD_CLASS =
  "flex min-w-max items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[13px] text-[var(--text)]";
export const CHECKBOX_CLASS = "size-4 accent-[var(--accent)]";
export const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25";
export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[132px] resize-y`;
export const SELECT_CLASS = `${INPUT_CLASS} pr-8`;

export const STATUS_LIST_CLASS =
  "mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[linear-gradient(160deg,var(--bg-elevated)_0%,var(--panel-strong)_100%)]";
export const STATUS_ROW_CLASS =
  "flex items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2 last:border-b-0";
export const STATUS_LABEL_CLASS = "text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]";
export const STATUS_VALUE_CLASS = "text-[13px] font-medium text-[var(--text-strong)]";

export const LIST_CLASS = "mt-4 space-y-3";
export const LIST_ITEM_CLASS =
  "flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[linear-gradient(150deg,var(--bg-elevated)_0%,var(--panel-strong)_100%)] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition motion-safe:hover:-translate-y-0.5 lg:flex-row lg:items-start lg:justify-between";
export const LIST_MAIN_CLASS = "min-w-0 flex-1 space-y-1.5";
export const LIST_TITLE_CLASS = "text-sm font-semibold text-[var(--text-strong)]";
export const LIST_SUB_CLASS = "text-[13px] leading-relaxed text-[var(--muted)] break-words";
export const LIST_META_CLASS =
  "flex shrink-0 flex-col gap-1 text-xs text-[var(--muted)] lg:items-end";

export const CHIP_ROW_CLASS = "mt-2 flex flex-wrap gap-2";
export const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-[var(--border)] bg-[linear-gradient(135deg,var(--secondary)_0%,var(--bg-elevated)_100%)] px-2 py-1 text-[11px] font-medium text-[var(--text-strong)]";

export const CODE_BLOCK_CLASS =
  "mt-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[linear-gradient(145deg,var(--panel)_0%,var(--bg-accent)_100%)] p-3 font-[var(--mono)] text-xs leading-relaxed text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export function buttonClass(options?: { small?: boolean; active?: boolean; tone?: ButtonTone }) {
  const tone = options?.tone ?? "default";
  return [
    BUTTON_BASE,
    options?.small ? BUTTON_SMALL : "",
    options?.active ? BUTTON_ACTIVE : "",
    tone === "primary" ? BUTTON_PRIMARY : "",
    tone === "danger" ? BUTTON_DANGER : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function calloutClass(tone: "default" | "danger" | "warn" | "success" = "default") {
  return [
    CALLOUT_BASE,
    tone === "default"
      ? CALLOUT_DEFAULT
      : tone === "danger"
        ? CALLOUT_DANGER
        : tone === "warn"
          ? CALLOUT_WARN
          : CALLOUT_SUCCESS,
  ].join(" ");
}
