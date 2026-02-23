import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { SlackStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { buttonClass, calloutClass, CARD_CLASS, CARD_SUB_CLASS, CARD_TITLE_CLASS } from "./tw.ts";

export function renderSlackCard(params: {
  props: ChannelsProps;
  slack?: SlackStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, slack, accountCountLabel } = params;

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>Slack</div>
      <div class=${CARD_SUB_CLASS}>Socket mode 状态与通道配置。</div>
      ${accountCountLabel}

      ${renderChannelStatusList([
        { label: "已配置", value: boolLabel(slack?.configured) },
        { label: "运行中", value: boolLabel(slack?.running) },
        {
          label: "最近启动",
          value: slack?.lastStartAt ? formatRelativeTimestamp(slack.lastStartAt) : "暂无",
        },
        {
          label: "最近探测",
          value: slack?.lastProbeAt ? formatRelativeTimestamp(slack.lastProbeAt) : "暂无",
        },
      ])}

      ${
        slack?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(slack.lastError)}
          </div>`
          : nothing
      }

      ${
        slack?.probe
          ? html`<div class="${calloutClass("default")} mt-3">
            探测 ${slack.probe.ok ? "成功" : "失败"} ·
            ${localizeChannelValue(slack.probe.status)}
            ${slack.probe.error ? ` ${localizeChannelValue(slack.probe.error)}` : ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "slack", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          立即探测
        </button>
      </div>
    </div>
  `;
}
