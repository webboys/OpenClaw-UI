import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { DiscordStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { buttonClass, calloutClass, CARD_CLASS, CARD_SUB_CLASS, CARD_TITLE_CLASS } from "./tw.ts";

export function renderDiscordCard(params: {
  props: ChannelsProps;
  discord?: DiscordStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, discord, accountCountLabel } = params;

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>Discord</div>
      <div class=${CARD_SUB_CLASS}>机器人状态与通道配置。</div>
      ${accountCountLabel}

      ${renderChannelStatusList([
        { label: "已配置", value: boolLabel(discord?.configured) },
        { label: "运行中", value: boolLabel(discord?.running) },
        {
          label: "最近启动",
          value: discord?.lastStartAt ? formatRelativeTimestamp(discord.lastStartAt) : "暂无",
        },
        {
          label: "最近探测",
          value: discord?.lastProbeAt ? formatRelativeTimestamp(discord.lastProbeAt) : "暂无",
        },
      ])}

      ${
        discord?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(discord.lastError)}
          </div>`
          : nothing
      }

      ${
        discord?.probe
          ? html`<div class="${calloutClass("default")} mt-3">
            探测 ${discord.probe.ok ? "成功" : "失败"} ·
            ${localizeChannelValue(discord.probe.status)}
            ${discord.probe.error ? ` ${localizeChannelValue(discord.probe.error)}` : ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "discord", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          立即探测
        </button>
      </div>
    </div>
  `;
}
