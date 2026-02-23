import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { GoogleChatStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { buttonClass, calloutClass, CARD_CLASS, CARD_SUB_CLASS, CARD_TITLE_CLASS } from "./tw.ts";

export function renderGoogleChatCard(params: {
  props: ChannelsProps;
  googleChat?: GoogleChatStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, googleChat, accountCountLabel } = params;

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>Google Chat</div>
      <div class=${CARD_SUB_CLASS}>Chat API webhook 状态与通道配置。</div>
      ${accountCountLabel}

      ${renderChannelStatusList([
        { label: "已配置", value: boolLabel(googleChat?.configured) },
        { label: "运行中", value: boolLabel(googleChat?.running) },
        { label: "凭据来源", value: localizeChannelValue(googleChat?.credentialSource ?? "暂无") },
        {
          label: "受众",
          value: googleChat?.audienceType
            ? `${localizeChannelValue(googleChat.audienceType)}${
                googleChat.audience ? ` · ${googleChat.audience}` : ""
              }`
            : "暂无",
        },
        {
          label: "最近启动",
          value: googleChat?.lastStartAt ? formatRelativeTimestamp(googleChat.lastStartAt) : "暂无",
        },
        {
          label: "最近探测",
          value: googleChat?.lastProbeAt ? formatRelativeTimestamp(googleChat.lastProbeAt) : "暂无",
        },
      ])}

      ${
        googleChat?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(googleChat.lastError)}
          </div>`
          : nothing
      }

      ${
        googleChat?.probe
          ? html`<div class="${calloutClass("default")} mt-3">
            探测 ${googleChat.probe.ok ? "成功" : "失败"} ·
            ${localizeChannelValue(googleChat.probe.status)}
            ${googleChat.probe.error ? ` ${localizeChannelValue(googleChat.probe.error)}` : ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "googlechat", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          立即探测
        </button>
      </div>
    </div>
  `;
}
