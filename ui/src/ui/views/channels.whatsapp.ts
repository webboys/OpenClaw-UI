import { html, nothing } from "lit";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import type { WhatsAppStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import { boolLabel, localizeChannelValue, renderChannelStatusList } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { buttonClass, calloutClass, CARD_CLASS, CARD_SUB_CLASS, CARD_TITLE_CLASS } from "./tw.ts";

export function renderWhatsAppCard(params: {
  props: ChannelsProps;
  whatsapp?: WhatsAppStatus;
  accountCountLabel: unknown;
}) {
  const { props, whatsapp, accountCountLabel } = params;

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>WhatsApp</div>
      <div class=${CARD_SUB_CLASS}>连接 WhatsApp Web 并监控在线状态。</div>
      ${accountCountLabel}

      ${renderChannelStatusList([
        { label: "已配置", value: boolLabel(whatsapp?.configured) },
        { label: "已绑定", value: boolLabel(whatsapp?.linked) },
        { label: "运行中", value: boolLabel(whatsapp?.running) },
        { label: "已连接", value: boolLabel(whatsapp?.connected) },
        {
          label: "最近连接",
          value: whatsapp?.lastConnectedAt
            ? formatRelativeTimestamp(whatsapp.lastConnectedAt)
            : "暂无",
        },
        {
          label: "最近消息",
          value: whatsapp?.lastMessageAt ? formatRelativeTimestamp(whatsapp.lastMessageAt) : "暂无",
        },
        {
          label: "认证时长",
          value: whatsapp?.authAgeMs != null ? formatDurationHuman(whatsapp.authAgeMs) : "暂无",
        },
      ])}

      ${
        whatsapp?.lastError
          ? html`<div class="${calloutClass("danger")} mt-3">
            ${localizeChannelValue(whatsapp.lastError)}
          </div>`
          : nothing
      }

      ${
        props.whatsappMessage
          ? html`<div class="${calloutClass("default")} mt-3">
            ${localizeChannelValue(props.whatsappMessage)}
          </div>`
          : nothing
      }

      ${
        props.whatsappQrDataUrl
          ? html`<div class="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <img
              src=${props.whatsappQrDataUrl}
              alt="WhatsApp 二维码"
              class="mx-auto max-w-[260px] rounded-[var(--radius-sm)] border border-[var(--border)]"
            />
          </div>`
          : nothing
      }

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          class=${buttonClass({ tone: "primary" })}
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppStart(false)}
        >
          ${props.whatsappBusy ? "处理中…" : "显示二维码"}
        </button>
        <button
          class=${buttonClass()}
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppStart(true)}
        >
          重新绑定
        </button>
        <button
          class=${buttonClass()}
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppWait()}
        >
          等待扫码
        </button>
        <button
          class=${buttonClass({ tone: "danger" })}
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppLogout()}
        >
          登出
        </button>
        <button class=${buttonClass()} @click=${() => props.onRefresh(true)}>
          刷新
        </button>
      </div>

      ${renderChannelConfigSection({ channelId: "whatsapp", props })}
    </div>
  `;
}
