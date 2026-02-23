import { html, nothing } from "lit";
import { normalizeToolName } from "../../../../src/agents/tool-policy-shared.js";
import type { SkillStatusEntry, SkillStatusReport } from "../types.ts";
import {
  isAllowedByPolicy,
  matchesList,
  PROFILE_OPTIONS,
  resolveAgentConfig,
  resolveToolProfile,
  TOOL_SECTIONS,
} from "./agents-utils.ts";
import type { SkillGroup } from "./skills-grouping.ts";
import { groupSkills } from "./skills-grouping.ts";
import {
  computeSkillMissing,
  computeSkillReasons,
  renderSkillStatusChips,
} from "./skills-shared.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_CLASS,
  MONO_TEXT_CLASS,
  MUTED_TEXT_CLASS,
} from "./tw.ts";

export function renderAgentTools(params: {
  agentId: string;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  onProfileChange: (agentId: string, profile: string | null, clearAllow: boolean) => void;
  onOverridesChange: (agentId: string, alsoAllow: string[], deny: string[]) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
}) {
  const config = resolveAgentConfig(params.configForm, params.agentId);
  const agentTools = config.entry?.tools ?? {};
  const globalTools = config.globalTools ?? {};
  const profile = agentTools.profile ?? globalTools.profile ?? "full";
  const profileSource = agentTools.profile
    ? "agent"
    : globalTools.profile
      ? "global"
      : "default";
  const hasAgentAllow = Array.isArray(agentTools.allow) && agentTools.allow.length > 0;
  const hasGlobalAllow = Array.isArray(globalTools.allow) && globalTools.allow.length > 0;
  const editable =
    Boolean(params.configForm) && !params.configLoading && !params.configSaving && !hasAgentAllow;
  const alsoAllow = hasAgentAllow
    ? []
    : Array.isArray(agentTools.alsoAllow)
      ? agentTools.alsoAllow
      : [];
  const deny = hasAgentAllow ? [] : Array.isArray(agentTools.deny) ? agentTools.deny : [];
  const basePolicy = hasAgentAllow
    ? { allow: agentTools.allow ?? [], deny: agentTools.deny ?? [] }
    : (resolveToolProfile(profile) ?? undefined);
  const toolIds = TOOL_SECTIONS.flatMap((section) => section.tools.map((tool) => tool.id));

  const resolveAllowed = (toolId: string) => {
    const baseAllowed = isAllowedByPolicy(toolId, basePolicy);
    const extraAllowed = matchesList(toolId, alsoAllow);
    const denied = matchesList(toolId, deny);
    const allowed = (baseAllowed || extraAllowed) && !denied;
    return {
      allowed,
      baseAllowed,
      denied,
    };
  };
  const enabledCount = toolIds.filter((toolId) => resolveAllowed(toolId).allowed).length;

  const updateTool = (toolId: string, nextEnabled: boolean) => {
    const nextAllow = new Set(
      alsoAllow.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const nextDeny = new Set(
      deny.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const baseAllowed = resolveAllowed(toolId).baseAllowed;
    const normalized = normalizeToolName(toolId);
    if (nextEnabled) {
      nextDeny.delete(normalized);
      if (!baseAllowed) {
        nextAllow.add(normalized);
      }
    } else {
      nextAllow.delete(normalized);
      nextDeny.add(normalized);
    }
    params.onOverridesChange(params.agentId, [...nextAllow], [...nextDeny]);
  };

  const updateAll = (nextEnabled: boolean) => {
    const nextAllow = new Set(
      alsoAllow.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const nextDeny = new Set(
      deny.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    for (const toolId of toolIds) {
      const baseAllowed = resolveAllowed(toolId).baseAllowed;
      const normalized = normalizeToolName(toolId);
      if (nextEnabled) {
        nextDeny.delete(normalized);
        if (!baseAllowed) {
          nextAllow.add(normalized);
        }
      } else {
        nextAllow.delete(normalized);
        nextDeny.add(normalized);
      }
    }
    params.onOverridesChange(params.agentId, [...nextAllow], [...nextDeny]);
  };

  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>工具权限</div>
          <div class=${CARD_SUB_CLASS}>
            基础策略 + 单工具覆盖。
            <span class=${MONO_TEXT_CLASS}>${enabledCount}/${toolIds.length}</span> 已启用。
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class=${buttonClass({ small: true })} ?disabled=${!editable} @click=${() => updateAll(true)}>
            全部启用
          </button>
          <button class=${buttonClass({ small: true })} ?disabled=${!editable} @click=${() => updateAll(false)}>
            全部禁用
          </button>
          <button class=${buttonClass({ small: true })} ?disabled=${params.configLoading} @click=${params.onConfigReload}>
            重载配置
          </button>
          <button
            class=${buttonClass({ small: true, tone: "primary" })}
            ?disabled=${params.configSaving || !params.configDirty}
            @click=${params.onConfigSave}
          >
            ${params.configSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      ${
        !params.configForm
          ? html`
              <div class="${calloutClass("default")} mt-3">
                请先加载网关配置，再调整工具权限策略。
              </div>
            `
          : nothing
      }
      ${
        hasAgentAllow
          ? html`
              <div class="${calloutClass("warn")} mt-3">
                当前智能体使用显式 allowlist。请在配置页直接维护工具名单。
              </div>
            `
          : nothing
      }
      ${
        hasGlobalAllow
          ? html`
              <div class="${calloutClass("warn")} mt-3">
                全局 tools.allow 已启用。智能体无法覆盖全局禁用项。
              </div>
            `
          : nothing
      }

      <div class="agent-tools-meta mt-4">
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>策略档位</div>
          <div class=${MONO_TEXT_CLASS}>${profile}</div>
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>来源</div>
          <div>${
            profileSource === "agent"
              ? "智能体覆盖"
              : profileSource === "global"
                ? "全局默认"
                : "内置默认"
          }</div>
        </div>
        ${
          params.configDirty
            ? html`
                <div class="agent-kv">
                  <div class=${FIELD_LABEL_CLASS}>状态</div>
                  <div class=${MONO_TEXT_CLASS}>未保存</div>
                </div>
              `
            : nothing
        }
      </div>

      <div class="agent-tools-presets mt-4">
        <div class=${FIELD_LABEL_CLASS}>快速预设</div>
        <div class="agent-tools-buttons">
          ${PROFILE_OPTIONS.map(
            (option) => html`
              <button
                class=${buttonClass({ small: true, active: profile === option.id })}
                ?disabled=${!editable}
                @click=${() => params.onProfileChange(params.agentId, option.id, true)}
              >
                ${option.label}
              </button>
            `,
          )}
          <button
            class=${buttonClass({ small: true })}
            ?disabled=${!editable}
            @click=${() => params.onProfileChange(params.agentId, null, false)}
          >
            继承默认
          </button>
        </div>
      </div>

      <div class="agent-tools-grid mt-5">
        ${TOOL_SECTIONS.map(
          (section) =>
            html`
              <div class="agent-tools-section">
                <div class="agent-tools-header">${section.label}</div>
                <div class="agent-tools-list">
                  ${section.tools.map((tool) => {
                    const { allowed } = resolveAllowed(tool.id);
                    return html`
                      <div class="agent-tool-row">
                        <div>
                          <div class="agent-tool-title mono">${tool.label}</div>
                          <div class="agent-tool-sub">${tool.description}</div>
                        </div>
                        <label class="cfg-toggle">
                          <input
                            type="checkbox"
                            .checked=${allowed}
                            ?disabled=${!editable}
                            @change=${(e: Event) =>
                              updateTool(tool.id, (e.target as HTMLInputElement).checked)}
                          />
                          <span class="cfg-toggle__track"></span>
                        </label>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `,
        )}
      </div>
    </section>
  `;
}

export function renderAgentSkills(params: {
  agentId: string;
  report: SkillStatusReport | null;
  loading: boolean;
  error: string | null;
  activeAgentId: string | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  filter: string;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  onClear: (agentId: string) => void;
  onDisableAll: (agentId: string) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
}) {
  const editable = Boolean(params.configForm) && !params.configLoading && !params.configSaving;
  const config = resolveAgentConfig(params.configForm, params.agentId);
  const allowlist = Array.isArray(config.entry?.skills) ? config.entry?.skills : undefined;
  const allowSet = new Set((allowlist ?? []).map((name) => name.trim()).filter(Boolean));
  const usingAllowlist = allowlist !== undefined;
  const reportReady = Boolean(params.report && params.activeAgentId === params.agentId);
  const rawSkills = reportReady ? (params.report?.skills ?? []) : [];
  const filter = params.filter.trim().toLowerCase();
  const filtered = filter
    ? rawSkills.filter((skill) =>
        [skill.name, skill.description, skill.source].join(" ").toLowerCase().includes(filter),
      )
    : rawSkills;
  const groups = groupSkills(filtered);
  const enabledCount = usingAllowlist
    ? rawSkills.filter((skill) => allowSet.has(skill.name)).length
    : rawSkills.length;
  const totalCount = rawSkills.length;

  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>智能体技能</div>
          <div class=${CARD_SUB_CLASS}>
            单智能体技能白名单与工作区技能。
            ${
              totalCount > 0
                ? html`<span class=${MONO_TEXT_CLASS}>${enabledCount}/${totalCount}</span>`
                : nothing
            }
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class=${buttonClass({ small: true })} ?disabled=${!editable} @click=${() => params.onClear(params.agentId)}>
            使用全部
          </button>
          <button
            class=${buttonClass({ small: true })}
            ?disabled=${!editable}
            @click=${() => params.onDisableAll(params.agentId)}
          >
            全部禁用
          </button>
          <button class=${buttonClass({ small: true })} ?disabled=${params.configLoading} @click=${params.onConfigReload}>
            重载配置
          </button>
          <button class=${buttonClass({ small: true })} ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? "加载中…" : "刷新"}
          </button>
          <button
            class=${buttonClass({ small: true, tone: "primary" })}
            ?disabled=${params.configSaving || !params.configDirty}
            @click=${params.onConfigSave}
          >
            ${params.configSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      ${
        !params.configForm
          ? html`
              <div class="${calloutClass("default")} mt-3">
                请先加载网关配置，再设置智能体技能策略。
              </div>
            `
          : nothing
      }
      ${
        usingAllowlist
          ? html`
              <div class="${calloutClass("default")} mt-3">当前智能体启用了自定义技能白名单。</div>
            `
          : html`
              <div class="${calloutClass("default")} mt-3">
                当前默认启用全部技能。禁用任一技能后将创建智能体级白名单。
              </div>
            `
      }
      ${
        !reportReady && !params.loading
          ? html`
              <div class="${calloutClass("default")} mt-3">
                请先刷新该智能体技能列表，再查看工作区专属技能项。
              </div>
            `
          : nothing
      }
      ${
        params.error
          ? html`<div class="${calloutClass("danger")} mt-3">${params.error}</div>`
          : nothing
      }

      <div class="filters mt-3.5">
        <label class="${FIELD_CLASS} flex-1">
          <span class=${FIELD_LABEL_CLASS}>筛选</span>
          <input
            class=${INPUT_CLASS}
            .value=${params.filter}
            @input=${(e: Event) => params.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="搜索智能体技能"
          />
        </label>
        <div class=${MUTED_TEXT_CLASS}>显示 ${filtered.length} 条</div>
      </div>

      ${
        filtered.length === 0
          ? html`
              <div class="${MUTED_TEXT_CLASS} mt-4">未找到匹配技能。</div>
            `
          : html`
              <div class="agent-skills-groups mt-4">
                ${groups.map((group) =>
                  renderAgentSkillGroup(group, {
                    agentId: params.agentId,
                    allowSet,
                    usingAllowlist,
                    editable,
                    onToggle: params.onToggle,
                  }),
                )}
              </div>
            `
      }
    </section>
  `;
}

function renderAgentSkillGroup(
  group: SkillGroup,
  params: {
    agentId: string;
    allowSet: Set<string>;
    usingAllowlist: boolean;
    editable: boolean;
    onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  },
) {
  const collapsedByDefault = group.id === "workspace" || group.id === "built-in";
  return html`
    <details class="agent-skills-group" ?open=${!collapsedByDefault}>
      <summary class="agent-skills-header">
        <span>${group.label}</span>
        <span class=${MUTED_TEXT_CLASS}>${group.skills.length}</span>
      </summary>
      <div class="list skills-grid">
        ${group.skills.map((skill) =>
          renderAgentSkillRow(skill, {
            agentId: params.agentId,
            allowSet: params.allowSet,
            usingAllowlist: params.usingAllowlist,
            editable: params.editable,
            onToggle: params.onToggle,
          }),
        )}
      </div>
    </details>
  `;
}

function renderAgentSkillRow(
  skill: SkillStatusEntry,
  params: {
    agentId: string;
    allowSet: Set<string>;
    usingAllowlist: boolean;
    editable: boolean;
    onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  },
) {
  const enabled = params.usingAllowlist ? params.allowSet.has(skill.name) : true;
  const missing = computeSkillMissing(skill);
  const reasons = computeSkillReasons(skill);
  return html`
    <div class="list-item agent-skill-row">
      <div class="list-main">
        <div class="list-title">${skill.emoji ? `${skill.emoji} ` : ""}${skill.name}</div>
        <div class="list-sub">${skill.description}</div>
        ${renderSkillStatusChips({ skill })}
        ${
          missing.length > 0
            ? html`<div class="${MUTED_TEXT_CLASS} mt-1.5">缺失项：${missing.join(", ")}</div>`
            : nothing
        }
        ${
          reasons.length > 0
            ? html`<div class="${MUTED_TEXT_CLASS} mt-1.5">原因：${reasons.join(", ")}</div>`
            : nothing
        }
      </div>
      <div class="list-meta">
        <label class="cfg-toggle">
          <input
            type="checkbox"
            .checked=${enabled}
            ?disabled=${!params.editable}
            @change=${(e: Event) =>
              params.onToggle(params.agentId, skill.name, (e.target as HTMLInputElement).checked)}
          />
          <span class="cfg-toggle__track"></span>
        </label>
      </div>
    </div>
  `;
}
