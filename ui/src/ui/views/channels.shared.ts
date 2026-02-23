import { html, nothing } from "lit";
import { localizeUiText } from "../error-localization.ts";
import type { ChannelAccountSnapshot } from "../types.ts";
import type { ChannelKey, ChannelsProps } from "./channels.types.ts";
import {
  STATUS_LABEL_CLASS,
  STATUS_LIST_CLASS,
  STATUS_ROW_CLASS,
  STATUS_VALUE_CLASS,
} from "./tw.ts";

export type ChannelStatusRow = {
  label: string;
  value: unknown;
};

export function localizeChannelValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "暂无";
    }
    return localizeUiText(trimmed);
  }
  if (value == null) {
    return "暂无";
  }
  return value;
}

export function channelEnabled(key: ChannelKey, props: ChannelsProps) {
  const snapshot = props.snapshot;
  const channels = snapshot?.channels as Record<string, unknown> | null;
  if (!snapshot || !channels) {
    return false;
  }
  const channelStatus = channels[key] as Record<string, unknown> | undefined;
  const configured = typeof channelStatus?.configured === "boolean" && channelStatus.configured;
  const running = typeof channelStatus?.running === "boolean" && channelStatus.running;
  const connected = typeof channelStatus?.connected === "boolean" && channelStatus.connected;
  const accounts = snapshot.channelAccounts?.[key] ?? [];
  const accountActive = accounts.some(
    (account) => account.configured || account.running || account.connected,
  );
  return configured || running || connected || accountActive;
}

export function getChannelAccountCount(
  key: ChannelKey,
  channelAccounts?: Record<string, ChannelAccountSnapshot[]> | null,
): number {
  return channelAccounts?.[key]?.length ?? 0;
}

export function renderChannelAccountCount(
  key: ChannelKey,
  channelAccounts?: Record<string, ChannelAccountSnapshot[]> | null,
) {
  const count = getChannelAccountCount(key, channelAccounts);
  if (count < 2) {
    return nothing;
  }
  return html`<div class="mt-3 text-[12px] font-medium text-[var(--muted)]">账号数 (${count})</div>`;
}

export function boolLabel(value: boolean | null | undefined): string {
  if (value == null) {
    return "未知";
  }
  return value ? "是" : "否";
}

export function renderChannelStatusList(rows: ChannelStatusRow[]) {
  return html`
    <div class=${STATUS_LIST_CLASS}>
      ${rows.map(
        (row) => html`
          <div class=${STATUS_ROW_CLASS}>
            <span class=${STATUS_LABEL_CLASS}>${row.label}</span>
            <span class=${STATUS_VALUE_CLASS}>${localizeChannelValue(row.value)}</span>
          </div>
        `,
      )}
    </div>
  `;
}
