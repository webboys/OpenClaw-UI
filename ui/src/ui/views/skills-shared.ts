import { html, nothing } from "lit";
import type { SkillStatusEntry } from "../types.ts";

function localizeSkillSource(source: string): string {
  const normalized = source.trim().toLowerCase();
  if (normalized === "builtin" || normalized === "bundled") {
    return "内置";
  }
  if (normalized === "extension" || normalized === "plugin") {
    return "扩展";
  }
  if (normalized === "external") {
    return "外部";
  }
  if (normalized === "local") {
    return "本地";
  }
  return source;
}

export function computeSkillMissing(skill: SkillStatusEntry): string[] {
  return [
    ...skill.missing.bins.map((b) => `命令:${b}`),
    ...skill.missing.env.map((e) => `环境变量:${e}`),
    ...skill.missing.config.map((c) => `配置:${c}`),
    ...skill.missing.os.map((o) => `系统:${o}`),
  ];
}

export function computeSkillReasons(skill: SkillStatusEntry): string[] {
  const reasons: string[] = [];
  if (skill.disabled) {
    reasons.push("已禁用");
  }
  if (skill.blockedByAllowlist) {
    reasons.push("被白名单拦截");
  }
  return reasons;
}

export function renderSkillStatusChips(params: {
  skill: SkillStatusEntry;
  showBundledBadge?: boolean;
}) {
  const skill = params.skill;
  const showBundledBadge = Boolean(params.showBundledBadge);
  return html`
    <div class="chip-row" style="margin-top: 6px;">
      <span class="chip">${localizeSkillSource(skill.source)}</span>
      ${
        showBundledBadge
          ? html`
              <span class="chip">内置</span>
            `
          : nothing
      }
      <span class="chip ${skill.eligible ? "chip-ok" : "chip-warn"}">
        ${skill.eligible ? "可用" : "受限"}
      </span>
      ${
        skill.disabled
          ? html`
              <span class="chip chip-warn">已禁用</span>
            `
          : nothing
      }
    </div>
  `;
}
