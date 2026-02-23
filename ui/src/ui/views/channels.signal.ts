import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { SignalStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { buttonClass, calloutClass, CARD_CLASS, CARD_SUB_CLASS, CARD_TITLE_CLASS } from "./tw.ts";

export function renderSignalCard(params: {
  props: ChannelsProps;
  signal?: SignalStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, signal, accountCountLabel } = params;

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>Signal</div>
      <div class=${CARD_SUB_CLASS}>signal-cli 状态与通道配置。</div>
      ${accountCountLabel}

      ${renderChannelStatusList([
        { label: "已配置", value: boolLabel(signal?.configured) },
        { label: "运行中", value: boolLabel(signal?.running) },
        { label: "基础地址", value: localizeChannelValue(signal?.baseUrl ?? "暂无") },
        {
          label: "最近启动",
          value: signal?.lastStartAt ? formatRelativeTimestamp(signal.lastStartAt) : "暂无",
        },
        {
          label: "最近探测",
          value: signal?.lastProbeAt ? formatRelativeTimestamp(signal.lastProbeAt) : "暂无",
        },
      ])}

      ${
        signal?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(signal.lastError)}
          </div>`
          : nothing
      }

      ${
        signal?.probe
          ? html`<div class="${calloutClass("default")} mt-3">
            探测 ${signal.probe.ok ? "成功" : "失败"} ·
            ${localizeChannelValue(signal.probe.status)}
            ${signal.probe.error ? ` ${localizeChannelValue(signal.probe.error)}` : ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "signal", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          立即探测
        </button>
      </div>
    </div>
  `;
}
