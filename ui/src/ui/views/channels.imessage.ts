import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { IMessageStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { buttonClass, calloutClass, CARD_CLASS, CARD_SUB_CLASS, CARD_TITLE_CLASS } from "./tw.ts";

export function renderIMessageCard(params: {
  props: ChannelsProps;
  imessage?: IMessageStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, imessage, accountCountLabel } = params;

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>iMessage</div>
      <div class=${CARD_SUB_CLASS}>macOS 桥接状态与通道配置。</div>
      ${accountCountLabel}

      ${renderChannelStatusList([
        { label: "已配置", value: boolLabel(imessage?.configured) },
        { label: "运行中", value: boolLabel(imessage?.running) },
        {
          label: "最近启动",
          value: imessage?.lastStartAt ? formatRelativeTimestamp(imessage.lastStartAt) : "暂无",
        },
        {
          label: "最近探测",
          value: imessage?.lastProbeAt ? formatRelativeTimestamp(imessage.lastProbeAt) : "暂无",
        },
      ])}

      ${
        imessage?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(imessage.lastError)}
          </div>`
          : nothing
      }

      ${
        imessage?.probe
          ? html`<div class="${calloutClass("default")} mt-3">
            探测 ${imessage.probe.ok ? "成功" : "失败"} ·
            ${localizeChannelValue(imessage.probe.error)}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "imessage", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          立即探测
        </button>
      </div>
    </div>
  `;
}
