import { formatRelativeTimestamp, formatDurationHuman, formatMs } from "./format.ts";
import type { CronJob, GatewaySessionRow, PresenceEntry } from "./types.ts";

export function formatPresenceSummary(entry: PresenceEntry): string {
  const host = entry.host ?? "未知主机";
  const ip = entry.ip ? `(${entry.ip})` : "";
  const mode = entry.mode ?? "";
  const version = entry.version ?? "";
  return `${host} ${ip} ${mode} ${version}`.trim();
}

export function formatPresenceAge(entry: PresenceEntry): string {
  const ts = entry.ts ?? null;
  return ts ? formatRelativeTimestamp(ts) : "暂无";
}

export function formatNextRun(ms?: number | null) {
  if (!ms) {
    return "暂无";
  }
  return `${formatMs(ms)} (${formatRelativeTimestamp(ms)})`;
}

export function formatSessionTokens(row: GatewaySessionRow) {
  if (row.totalTokens == null) {
    return "暂无";
  }
  const total = row.totalTokens ?? 0;
  const ctx = row.contextTokens ?? 0;
  return ctx ? `${total} / ${ctx}` : String(total);
}

export function formatEventPayload(payload: unknown): string {
  if (payload == null) {
    return "";
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    // oxlint-disable typescript/no-base-to-string
    return String(payload);
  }
}

export function formatCronState(job: CronJob) {
  const state = job.state ?? {};
  const next = state.nextRunAtMs ? formatMs(state.nextRunAtMs) : "暂无";
  const last = state.lastRunAtMs ? formatMs(state.lastRunAtMs) : "暂无";
  const status = state.lastStatus ?? "暂无";
  return `${status} · 下次 ${next} · 上次 ${last}`;
}

export function formatCronSchedule(job: CronJob) {
  const s = job.schedule;
  if (s.kind === "at") {
    const atMs = Date.parse(s.at);
    return Number.isFinite(atMs) ? `在 ${formatMs(atMs)}` : `在 ${s.at}`;
  }
  if (s.kind === "every") {
    return `每隔 ${formatDurationHuman(s.everyMs)}`;
  }
  return `Cron ${s.expr}${s.tz ? `（${s.tz}）` : ""}`;
}

export function formatCronPayload(job: CronJob) {
  const p = job.payload;
  if (p.kind === "systemEvent") {
    return `系统：${p.text}`;
  }
  const base = `助手：${p.message}`;
  const delivery = job.delivery;
  if (delivery && delivery.mode !== "none") {
    const modeLabel = delivery.mode === "webhook" ? "Webhook" : "消息播报";
    const target =
      delivery.mode === "webhook"
        ? delivery.to
          ? ` (${delivery.to})`
          : ""
        : delivery.channel || delivery.to
          ? ` (${delivery.channel ?? "最近会话"}${delivery.to ? ` -> ${delivery.to}` : ""})`
          : "";
    return `${base} · ${modeLabel}${target}`;
  }
  return base;
}
