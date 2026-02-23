import { formatDurationHuman } from "../../../src/infra/format-time/format-duration.ts";
import {
  formatRelativeTimestamp as formatRelativeTimestampBase,
  type FormatRelativeTimestampOptions,
} from "../../../src/infra/format-time/format-relative.ts";
import { stripReasoningTagsFromText } from "../../../src/shared/text/reasoning-tags.js";
import { i18n } from "../i18n/index.ts";

export { formatDurationHuman };

export function getUiLocale(): string {
  const locale = i18n.getLocale();
  if (locale === "en") {
    return "en-US";
  }
  return locale;
}

function getLocalizedNa(): string {
  const locale = i18n.getLocale();
  if (locale === "zh-TW") {
    return "暫無";
  }
  if (locale === "zh-CN") {
    return "暂无";
  }
  return "n/a";
}

function getLocalizedNone(): string {
  const locale = i18n.getLocale();
  if (locale === "zh-TW") {
    return "無";
  }
  if (locale === "zh-CN") {
    return "无";
  }
  return "none";
}

export function formatMs(ms?: number | null): string {
  if (!ms && ms !== 0) {
    return getLocalizedNa();
  }
  return new Date(ms).toLocaleString(getUiLocale());
}

export function formatList(values?: Array<string | null | undefined>): string {
  if (!values || values.length === 0) {
    return getLocalizedNone();
  }
  return values.filter((v): v is string => Boolean(v && v.trim())).join(", ");
}

export function clampText(value: string, max = 120): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function truncateText(
  value: string,
  max: number,
): {
  text: string;
  truncated: boolean;
  total: number;
} {
  if (value.length <= max) {
    return { text: value, truncated: false, total: value.length };
  }
  return {
    text: value.slice(0, Math.max(0, max)),
    truncated: true,
    total: value.length,
  };
}

export function toNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseList(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function localizeRelativeTimestamp(value: string): string {
  const locale = i18n.getLocale();
  if (locale !== "zh-CN" && locale !== "zh-TW") {
    return value;
  }

  const dict =
    locale === "zh-CN"
      ? {
          justNow: "刚刚",
          inLessThanMinute: "不到1分钟后",
          agoMinute: "分钟前",
          agoHour: "小时前",
          agoDay: "天前",
          inMinute: "分钟后",
          inHour: "小时后",
          inDay: "天后",
        }
      : {
          justNow: "剛剛",
          inLessThanMinute: "不到1分鐘後",
          agoMinute: "分鐘前",
          agoHour: "小時前",
          agoDay: "天前",
          inMinute: "分鐘後",
          inHour: "小時後",
          inDay: "天後",
        };

  if (value === "just now") {
    return dict.justNow;
  }
  if (value === "in <1m") {
    return dict.inLessThanMinute;
  }

  const past = value.match(/^(\d+)([mhd]) ago$/);
  if (past) {
    const unit = past[2];
    if (unit === "m") {
      return `${past[1]}${dict.agoMinute}`;
    }
    if (unit === "h") {
      return `${past[1]}${dict.agoHour}`;
    }
    if (unit === "d") {
      return `${past[1]}${dict.agoDay}`;
    }
  }

  const future = value.match(/^in (\d+)([mhd])$/);
  if (future) {
    const unit = future[2];
    if (unit === "m") {
      return `${future[1]}${dict.inMinute}`;
    }
    if (unit === "h") {
      return `${future[1]}${dict.inHour}`;
    }
    if (unit === "d") {
      return `${future[1]}${dict.inDay}`;
    }
  }

  return value;
}

export function formatRelativeTimestamp(
  timestampMs: number | null | undefined,
  options?: FormatRelativeTimestampOptions,
): string {
  const formatted = formatRelativeTimestampBase(timestampMs, options);
  return localizeRelativeTimestamp(formatted);
}

export function stripThinkingTags(value: string): string {
  const withoutReasoning = stripReasoningTagsFromText(value, { mode: "preserve", trim: "start" });
  const withoutInlineDirectives = withoutReasoning.replace(
    /\[\[\s*(?:audio_as_voice|reply_to_current|reply_to\s*:[^\]\n]+)\s*\]\]/gi,
    " ",
  );
  return withoutInlineDirectives.replace(/^[ \t]+/, "");
}
