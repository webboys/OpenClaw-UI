import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { ChannelAccountSnapshot, TelegramStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  LIST_CLASS,
  LIST_ITEM_CLASS,
  LIST_MAIN_CLASS,
  LIST_SUB_CLASS,
  LIST_TITLE_CLASS,
} from "./tw.ts";

export function renderTelegramCard(params: {
  props: ChannelsProps;
  telegram?: TelegramStatus;
  telegramAccounts: ChannelAccountSnapshot[];
  accountCountLabel: unknown;
}) {
  const { props, telegram, telegramAccounts, accountCountLabel } = params;
  const hasMultipleAccounts = telegramAccounts.length > 1;

  const renderAccountCard = (account: ChannelAccountSnapshot) => {
    const probe = account.probe as { bot?: { username?: string } } | undefined;
    const botUsername = probe?.bot?.username;
    const label = account.name || account.accountId;
    return html`
      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>${botUsername ? `@${botUsername}` : label}</div>
          <div class=${LIST_SUB_CLASS}>${account.accountId}</div>
        </div>
        <div class="w-full md:w-auto md:min-w-[280px]">
          ${renderChannelStatusList([
            { label: "运行中", value: boolLabel(account.running) },
            { label: "已配置", value: boolLabel(account.configured) },
            {
              label: "最后入站",
              value: account.lastInboundAt
                ? formatRelativeTimestamp(account.lastInboundAt)
                : "暂无",
            },
          ])}
          ${
            account.lastError
              ? html`<div class="pt-2 text-[12px] text-[var(--danger)]">
                  ${localizeChannelValue(account.lastError)}
                </div>`
              : nothing
          }
        </div>
      </div>
    `;
  };

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>Telegram</div>
      <div class=${CARD_SUB_CLASS}>机器人状态与通道配置。</div>
      ${accountCountLabel}

      ${
        hasMultipleAccounts
          ? html`
            <div class=${LIST_CLASS}>
              ${telegramAccounts.map((account) => renderAccountCard(account))}
            </div>
          `
          : renderChannelStatusList([
              { label: "已配置", value: boolLabel(telegram?.configured) },
              { label: "运行中", value: boolLabel(telegram?.running) },
              { label: "模式", value: localizeChannelValue(telegram?.mode ?? "暂无") },
              {
                label: "最近启动",
                value: telegram?.lastStartAt
                  ? formatRelativeTimestamp(telegram.lastStartAt)
                  : "暂无",
              },
              {
                label: "最近探测",
                value: telegram?.lastProbeAt
                  ? formatRelativeTimestamp(telegram.lastProbeAt)
                  : "暂无",
              },
            ])
      }

      ${
        telegram?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(telegram.lastError)}
          </div>`
          : nothing
      }

      ${
        telegram?.probe
          ? html`<div class="${calloutClass("default")} mt-3">
            探测 ${telegram.probe.ok ? "成功" : "失败"} ·
            ${localizeChannelValue(telegram.probe.status)}
            ${telegram.probe.error ? ` ${localizeChannelValue(telegram.probe.error)}` : ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "telegram", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          立即探测
        </button>
      </div>
    </div>
  `;
}
