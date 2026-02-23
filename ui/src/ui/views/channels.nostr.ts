import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { ChannelAccountSnapshot, NostrStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import {
  renderNostrProfileForm,
  type NostrProfileFormState,
  type NostrProfileFormCallbacks,
} from "./channels.nostr-profile-form.ts";
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
  MUTED_TEXT_CLASS,
} from "./tw.ts";

/**
 * Truncate a pubkey for display (shows first and last 8 chars)
 */
function truncatePubkey(pubkey: string | null | undefined): string {
  if (!pubkey) {
    return "暂无";
  }
  if (pubkey.length <= 20) {
    return pubkey;
  }
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}

function displayAccountId(value: string): string {
  return value === "default" ? "默认" : value;
}

export function renderNostrCard(params: {
  props: ChannelsProps;
  nostr?: NostrStatus | null;
  nostrAccounts: ChannelAccountSnapshot[];
  accountCountLabel: unknown;
  /** Profile form state (optional - if provided, shows form) */
  profileFormState?: NostrProfileFormState | null;
  /** Profile form callbacks */
  profileFormCallbacks?: NostrProfileFormCallbacks | null;
  /** Called when Edit Profile is clicked */
  onEditProfile?: () => void;
}) {
  const {
    props,
    nostr,
    nostrAccounts,
    accountCountLabel,
    profileFormState,
    profileFormCallbacks,
    onEditProfile,
  } = params;
  const primaryAccount = nostrAccounts[0];
  const summaryConfigured = nostr?.configured ?? primaryAccount?.configured ?? false;
  const summaryRunning = nostr?.running ?? primaryAccount?.running ?? false;
  const summaryPublicKey =
    nostr?.publicKey ?? (primaryAccount as { publicKey?: string } | undefined)?.publicKey;
  const summaryLastStartAt = nostr?.lastStartAt ?? primaryAccount?.lastStartAt ?? null;
  const summaryLastError = nostr?.lastError ?? primaryAccount?.lastError ?? null;
  const hasMultipleAccounts = nostrAccounts.length > 1;
  const showingForm = profileFormState !== null && profileFormState !== undefined;

  const renderAccountCard = (account: ChannelAccountSnapshot) => {
    const publicKey = (account as { publicKey?: string }).publicKey;
    const profile = (account as { profile?: { name?: string; displayName?: string } }).profile;
    const displayName = profile?.displayName ?? profile?.name ?? account.name ?? account.accountId;

    return html`
      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>${displayName}</div>
          <div class=${LIST_SUB_CLASS}>${displayAccountId(account.accountId)}</div>
        </div>
        <div class="w-full md:w-auto md:min-w-[280px]">
          ${renderChannelStatusList([
            { label: "运行中", value: boolLabel(account.running) },
            { label: "已配置", value: boolLabel(account.configured) },
            {
              label: "公钥",
              value: html`<span class="font-[var(--mono)] text-[12px]" title="${publicKey ?? ""}"
                >${truncatePubkey(publicKey)}</span
              >`,
            },
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

  const renderProfileSection = () => {
    // If showing form, render the form instead of the read-only view
    if (showingForm && profileFormCallbacks) {
      return renderNostrProfileForm({
        state: profileFormState,
        callbacks: profileFormCallbacks,
        accountId: nostrAccounts[0]?.accountId ?? "default",
      });
    }

    const profile =
      (
        primaryAccount as
          | {
              profile?: {
                name?: string;
                displayName?: string;
                about?: string;
                picture?: string;
                nip05?: string;
              };
            }
          | undefined
      )?.profile ?? nostr?.profile;
    const { name, displayName, about, picture, nip05 } = profile ?? {};
    const hasAnyProfileData = name || displayName || about || picture || nip05;

    return html`
      <div class="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="text-sm font-medium text-[var(--text-strong)]">资料</div>
          ${
            summaryConfigured
              ? html`
                <button
                  class=${buttonClass({ small: true })}
                  @click=${onEditProfile}
                >
                  编辑资料
                </button>
              `
              : nothing
          }
        </div>
        ${
          hasAnyProfileData
            ? html`
              <div class="space-y-2">
                ${
                  picture
                    ? html`
                      <div>
                        <img
                          src=${picture}
                          alt="资料头像"
                          class="size-12 rounded-full border-2 border-[var(--border)] object-cover"
                          @error=${(e: Event) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    `
                    : nothing
                }
                ${
                  name
                    ? html`<div class="flex items-center justify-between gap-3">
                        <span class=${MUTED_TEXT_CLASS}>名称</span><span>${name}</span>
                      </div>`
                    : nothing
                }
                ${
                  displayName
                    ? html`<div class="flex items-center justify-between gap-3">
                        <span class=${MUTED_TEXT_CLASS}>显示名</span><span>${displayName}</span>
                      </div>`
                    : nothing
                }
                ${
                  about
                    ? html`<div class="flex items-start justify-between gap-3">
                        <span class=${MUTED_TEXT_CLASS}>简介</span
                        ><span class="max-w-[300px] overflow-hidden text-ellipsis">${about}</span>
                      </div>`
                    : nothing
                }
                ${
                  nip05
                    ? html`<div class="flex items-center justify-between gap-3">
                        <span class=${MUTED_TEXT_CLASS}>NIP-05</span><span>${nip05}</span>
                      </div>`
                    : nothing
                }
              </div>
            `
            : html`
                <div class=${MUTED_TEXT_CLASS}>
                  当前未设置资料。点击“编辑资料”可补充名称、简介和头像。
                </div>
              `
        }
      </div>
    `;
  };

  return html`
    <div class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>Nostr</div>
      <div class=${CARD_SUB_CLASS}>基于 Nostr Relay 的去中心化私信（NIP-04）。</div>
      ${accountCountLabel}

      ${
        hasMultipleAccounts
          ? html`
            <div class=${LIST_CLASS}>
              ${nostrAccounts.map((account) => renderAccountCard(account))}
            </div>
          `
          : renderChannelStatusList([
              { label: "已配置", value: boolLabel(summaryConfigured) },
              { label: "运行中", value: boolLabel(summaryRunning) },
              {
                label: "公钥",
                value: html`<span class="font-[var(--mono)] text-[12px]" title="${summaryPublicKey ?? ""}"
                  >${truncatePubkey(summaryPublicKey)}</span
                >`,
              },
              {
                label: "最近启动",
                value: summaryLastStartAt ? formatRelativeTimestamp(summaryLastStartAt) : "暂无",
              },
            ])
      }

      ${
        summaryLastError
          ? html`<div class="${calloutClass("danger")} mt-3">
              ${localizeChannelValue(summaryLastError)}
            </div>`
          : nothing
      }

      ${renderProfileSection()}

      ${renderChannelConfigSection({ channelId: "nostr", props })}

      <div class="mt-3">
        <button class=${buttonClass()} @click=${() => props.onRefresh(false)}>刷新</button>
      </div>
    </div>
  `;
}
