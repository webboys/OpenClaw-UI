import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.ts";
import { localizeUiText } from "../error-localization.ts";

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}小时`;
}

function renderMetaRow(label: string, value?: string | null) {
  if (!value) {
    return nothing;
  }
  return html`<div class="exec-approval-meta-row"><span>${label}</span><span>${localizeUiText(value)}</span></div>`;
}

function formatSecurity(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "deny") {
    return "拒绝";
  }
  if (normalized === "allowlist") {
    return "白名单";
  }
  if (normalized === "full") {
    return "完全放行";
  }
  return value;
}

function formatAsk(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "off") {
    return "关闭";
  }
  if (normalized === "on-miss") {
    return "未命中时询问";
  }
  if (normalized === "always") {
    return "始终询问";
  }
  return value;
}

export function renderExecApprovalPrompt(state: AppViewState) {
  const active = state.execApprovalQueue[0];
  if (!active) {
    return nothing;
  }
  const request = active.request;
  const remainingMs = active.expiresAtMs - Date.now();
  const remaining = remainingMs > 0 ? `${formatRemaining(remainingMs)}后过期` : "已过期";
  const queueCount = state.execApprovalQueue.length;
  return html`
    <div class="exec-approval-overlay" role="dialog" aria-live="polite">
      <div class="exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div class="exec-approval-title">需要执行审批</div>
            <div class="exec-approval-sub">${remaining}</div>
          </div>
          ${
            queueCount > 1
              ? html`<div class="exec-approval-queue">${queueCount} 个待处理</div>`
              : nothing
          }
        </div>
        <div class="exec-approval-command mono">${request.command}</div>
        <div class="exec-approval-meta">
          ${renderMetaRow("主机", request.host)}
          ${renderMetaRow("助手", request.agentId)}
          ${renderMetaRow("会话", request.sessionKey)}
          ${renderMetaRow("工作目录", request.cwd)}
          ${renderMetaRow("解析路径", request.resolvedPath)}
          ${renderMetaRow("安全级别", formatSecurity(request.security))}
          ${renderMetaRow("询问策略", formatAsk(request.ask))}
        </div>
        ${
          state.execApprovalError
            ? html`<div class="exec-approval-error">${state.execApprovalError}</div>`
            : nothing
        }
        <div class="exec-approval-actions">
          <button
            class="btn primary"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-once")}
          >
            仅允许一次
          </button>
          <button
            class="btn"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-always")}
          >
            始终允许
          </button>
          <button
            class="btn danger"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("deny")}
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
  `;
}
