import { html, nothing } from "lit";
import type {
  AgentIdentityResult,
  AgentsFilesListResult,
  AgentsListResult,
  SkillStatusReport,
} from "../types.ts";
import { renderAgentFiles } from "./agents-panels-status-files.ts";
import { renderAgentTools, renderAgentSkills } from "./agents-panels-tools-skills.ts";
import {
  agentBadgeText,
  buildModelOptions,
  normalizeAgentLabel,
  normalizeModelValue,
  parseFallbackList,
  resolveAgentConfig,
  resolveAgentEmoji,
  resolveModelFallbacks,
  resolveModelLabel,
  resolveModelPrimary,
} from "./agents-utils.ts";
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
  SELECT_CLASS,
} from "./tw.ts";
import { icons } from "../icons.ts";

export type AgentsPanel = "overview" | "files" | "tools" | "skills";

export type AgentsProps = {
  loading: boolean;
  error: string | null;
  agentsList: AgentsListResult | null;
  selectedAgentId: string | null;
  activePanel: AgentsPanel;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  agentFilesLoading: boolean;
  agentFilesError: string | null;
  agentFilesList: AgentsFilesListResult | null;
  agentFileActive: string | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  agentIdentityById: Record<string, AgentIdentityResult>;
  agentSkillsLoading: boolean;
  agentSkillsReport: SkillStatusReport | null;
  agentSkillsError: string | null;
  agentSkillsAgentId: string | null;
  skillsFilter: string;
  onRefresh: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectPanel: (panel: AgentsPanel) => void;
  onLoadFiles: (agentId: string) => void;
  onSelectFile: (name: string) => void;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
  onToolsProfileChange: (agentId: string, profile: string | null, clearAllow: boolean) => void;
  onToolsOverridesChange: (agentId: string, alsoAllow: string[], deny: string[]) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onIdentityNameChange: (agentId: string, name: string) => void;
  onIdentityEmojiChange: (agentId: string, emoji: string) => void;
  onIdentityAvatarChange: (agentId: string, avatar: string | null) => void;
  onSkillsFilterChange: (next: string) => void;
  onSkillsRefresh: () => void;
  onAgentSkillToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  onAgentSkillsClear: (agentId: string) => void;
  onAgentSkillsDisableAll: (agentId: string) => void;
};

export type AgentContext = {
  workspace: string;
  model: string;
  identityName: string;
  identityEmoji: string;
  skillsLabel: string;
  isDefault: boolean;
};

const AVATAR_URL_RE = /^(?:https?:\/\/|data:image\/|\/|\.{1,2}\/|avatar\/)/i;
const AVATAR_FILE_RE = /\.(?:png|jpe?g|gif|webp|svg|ico)(?:$|[?#])/i;

function isImageAvatar(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return AVATAR_URL_RE.test(trimmed) || AVATAR_FILE_RE.test(trimmed);
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("不支持的图片类型"));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("读取图片失败"));
      }
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("读取图片失败")));
    reader.readAsDataURL(file);
  });
}

function buildAvatarInputId(agentId: string): string {
  return `agent-avatar-upload-${agentId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function renderAgents(props: AgentsProps) {
  const agents = props.agentsList?.agents ?? [];
  const defaultId = props.agentsList?.defaultId ?? null;
  const selectedId = props.selectedAgentId ?? defaultId ?? agents[0]?.id ?? null;
  const selectedAgent = selectedId
    ? (agents.find((agent) => agent.id === selectedId) ?? null)
    : null;

  return html`
    <div class="agents-layout">
      <section class="${CARD_CLASS} agents-sidebar">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class=${CARD_TITLE_CLASS}>智能体</div>
            <div class=${CARD_SUB_CLASS}>已配置 ${agents.length} 个。</div>
          </div>
          <button class=${buttonClass({ small: true })} ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "加载中…" : "刷新"}
          </button>
        </div>
        ${
          props.error
            ? html`<div class="${calloutClass("danger")} mt-3">${props.error}</div>`
            : nothing
        }
        <div class="agent-list mt-3">
          ${
            agents.length === 0
              ? html`
                  <div class=${MUTED_TEXT_CLASS}>未找到智能体。</div>
                `
              : agents.map((agent) => {
                  const badge = agentBadgeText(agent.id, defaultId);
                  const emoji = resolveAgentEmoji(agent, props.agentIdentityById[agent.id] ?? null);
                  return html`
                    <button
                      type="button"
                      class="agent-row ${selectedId === agent.id ? "active" : ""}"
                      @click=${() => props.onSelectAgent(agent.id)}
                    >
                      <div class="agent-avatar">${emoji || normalizeAgentLabel(agent).slice(0, 1)}</div>
                      <div class="agent-info">
                        <div class="agent-title">${normalizeAgentLabel(agent)}</div>
                        <div class="agent-sub mono">${agent.id}</div>
                      </div>
                      ${badge ? html`<span class="agent-pill">${badge}</span>` : nothing}
                    </button>
                  `;
                })
          }
        </div>
      </section>
      <section class="agents-main">
        ${
          !selectedAgent
            ? html`
                <div class=${CARD_CLASS}>
                  <div class=${CARD_TITLE_CLASS}>选择一个智能体</div>
                  <div class=${CARD_SUB_CLASS}>选中后可查看其工作区、工具权限与技能。</div>
                </div>
              `
            : html`
                ${renderAgentHeader(
                  selectedAgent,
                  defaultId,
                  props.agentIdentityById[selectedAgent.id] ?? null,
                )}
                ${renderAgentTabs(props.activePanel, (panel) => props.onSelectPanel(panel))}
                ${
                  props.activePanel === "overview"
                    ? renderAgentOverview({
                        agent: selectedAgent,
                        defaultId,
                        configForm: props.configForm,
                        agentFilesList: props.agentFilesList,
                        agentIdentity: props.agentIdentityById[selectedAgent.id] ?? null,
                        agentIdentityError: props.agentIdentityError,
                        agentIdentityLoading: props.agentIdentityLoading,
                        configLoading: props.configLoading,
                        configSaving: props.configSaving,
                        configDirty: props.configDirty,
                        onConfigReload: props.onConfigReload,
                        onConfigSave: props.onConfigSave,
                        onModelChange: props.onModelChange,
                        onModelFallbacksChange: props.onModelFallbacksChange,
                        onIdentityNameChange: props.onIdentityNameChange,
                        onIdentityEmojiChange: props.onIdentityEmojiChange,
                        onIdentityAvatarChange: props.onIdentityAvatarChange,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "files"
                    ? renderAgentFiles({
                        agentId: selectedAgent.id,
                        agentFilesList: props.agentFilesList,
                        agentFilesLoading: props.agentFilesLoading,
                        agentFilesError: props.agentFilesError,
                        agentFileActive: props.agentFileActive,
                        agentFileContents: props.agentFileContents,
                        agentFileDrafts: props.agentFileDrafts,
                        agentFileSaving: props.agentFileSaving,
                        onLoadFiles: props.onLoadFiles,
                        onSelectFile: props.onSelectFile,
                        onFileDraftChange: props.onFileDraftChange,
                        onFileReset: props.onFileReset,
                        onFileSave: props.onFileSave,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "tools"
                    ? renderAgentTools({
                        agentId: selectedAgent.id,
                        configForm: props.configForm,
                        configLoading: props.configLoading,
                        configSaving: props.configSaving,
                        configDirty: props.configDirty,
                        onProfileChange: props.onToolsProfileChange,
                        onOverridesChange: props.onToolsOverridesChange,
                        onConfigReload: props.onConfigReload,
                        onConfigSave: props.onConfigSave,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "skills"
                    ? renderAgentSkills({
                        agentId: selectedAgent.id,
                        report: props.agentSkillsReport,
                        loading: props.agentSkillsLoading,
                        error: props.agentSkillsError,
                        activeAgentId: props.agentSkillsAgentId,
                        configForm: props.configForm,
                        configLoading: props.configLoading,
                        configSaving: props.configSaving,
                        configDirty: props.configDirty,
                        filter: props.skillsFilter,
                        onFilterChange: props.onSkillsFilterChange,
                        onRefresh: props.onSkillsRefresh,
                        onToggle: props.onAgentSkillToggle,
                        onClear: props.onAgentSkillsClear,
                        onDisableAll: props.onAgentSkillsDisableAll,
                        onConfigReload: props.onConfigReload,
                        onConfigSave: props.onConfigSave,
                      })
                    : nothing
                }
              `
        }
      </section>
    </div>
  `;
}

function renderAgentHeader(
  agent: AgentsListResult["agents"][number],
  defaultId: string | null,
  agentIdentity: AgentIdentityResult | null,
) {
  const badge = agentBadgeText(agent.id, defaultId);
  const displayName = normalizeAgentLabel(agent);
  const subtitle = agent.identity?.theme?.trim() || "智能体工作区与路由配置。";
  const emoji = resolveAgentEmoji(agent, agentIdentity);
  return html`
    <section class="${CARD_CLASS} agent-header">
      <div class="agent-header-main">
        <div class="agent-avatar agent-avatar--lg">${emoji || displayName.slice(0, 1)}</div>
        <div>
          <div class=${CARD_TITLE_CLASS}>${displayName}</div>
          <div class=${CARD_SUB_CLASS}>${subtitle}</div>
        </div>
      </div>
      <div class="agent-header-meta">
        <div class=${MONO_TEXT_CLASS}>${agent.id}</div>
        ${badge ? html`<span class="agent-pill">${badge}</span>` : nothing}
      </div>
    </section>
  `;
}

function renderAgentTabs(active: AgentsPanel, onSelect: (panel: AgentsPanel) => void) {
  const tabs: Array<{ id: AgentsPanel; label: string }> = [
    { id: "overview", label: "概览" },
    { id: "files", label: "文件" },
    { id: "tools", label: "工具" },
    { id: "skills", label: "智能体技能" },
  ];
  return html`
    <div class="agent-tabs">
      ${tabs.map(
        (tab) => html`
          <button
            class="agent-tab ${active === tab.id ? "active" : ""}"
            type="button"
            @click=${() => onSelect(tab.id)}
          >
            ${tab.label}
          </button>
        `,
      )}
    </div>
  `;
}

function renderAgentOverview(params: {
  agent: AgentsListResult["agents"][number];
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onIdentityNameChange: (agentId: string, name: string) => void;
  onIdentityEmojiChange: (agentId: string, emoji: string) => void;
  onIdentityAvatarChange: (agentId: string, avatar: string | null) => void;
}) {
  const {
    agent,
    configForm,
    agentFilesList,
    agentIdentity,
    agentIdentityLoading,
    agentIdentityError,
    configLoading,
    configSaving,
    configDirty,
    onConfigReload,
    onConfigSave,
    onModelChange,
    onModelFallbacksChange,
    onIdentityNameChange,
    onIdentityEmojiChange,
    onIdentityAvatarChange,
  } = params;
  const config = resolveAgentConfig(configForm, agent.id);
  const workspaceFromFiles =
    agentFilesList && agentFilesList.agentId === agent.id ? agentFilesList.workspace : null;
  const workspace =
    workspaceFromFiles || config.entry?.workspace || config.defaults?.workspace || "默认";
  const model = config.entry?.model
    ? resolveModelLabel(config.entry?.model)
    : resolveModelLabel(config.defaults?.model);
  const defaultModel = resolveModelLabel(config.defaults?.model);
  const modelPrimary =
    resolveModelPrimary(config.entry?.model) || (model !== "-" ? normalizeModelValue(model) : null);
  const defaultPrimary =
    resolveModelPrimary(config.defaults?.model) ||
    (defaultModel !== "-" ? normalizeModelValue(defaultModel) : null);
  const effectivePrimary = modelPrimary ?? defaultPrimary ?? null;
  const modelFallbacks = resolveModelFallbacks(config.entry?.model);
  const fallbackText = modelFallbacks ? modelFallbacks.join(", ") : "";
  const identityName =
    agentIdentity?.name?.trim() ||
    agent.identity?.name?.trim() ||
    agent.name?.trim() ||
    config.entry?.name ||
    "-";
  const resolvedEmoji = resolveAgentEmoji(agent, agentIdentity);
  const identityEmoji = resolvedEmoji || "-";
  const identityNameInput =
    config.entry?.identity?.name?.trim() ||
    config.entry?.name?.trim() ||
    (identityName === "-" ? "" : identityName);
  const identityEmojiInput = config.entry?.identity?.emoji?.trim() || (resolvedEmoji ?? "");
  const identityAvatarInput =
    config.entry?.identity?.avatar?.trim() ||
    agent.identity?.avatarUrl?.trim() ||
    agent.identity?.avatar?.trim() ||
    agentIdentity?.avatar?.trim() ||
    "";
  const identityAvatarPreview = isImageAvatar(identityAvatarInput) ? identityAvatarInput : "";
  const avatarInputId = buildAvatarInputId(agent.id);
  const skillFilter = Array.isArray(config.entry?.skills) ? config.entry?.skills : null;
  const skillCount = skillFilter?.length ?? null;
  const identityStatus = agentIdentityLoading
    ? "加载中…"
    : agentIdentityError
      ? "不可用"
      : "";
  const isDefault = Boolean(params.defaultId && agent.id === params.defaultId);
  const identityEditable = Boolean(configForm) && !configLoading && !configSaving;

  return html`
    <section class=${CARD_CLASS}>
      <div class=${CARD_TITLE_CLASS}>概览</div>
      <div class=${CARD_SUB_CLASS}>工作区路径、身份元数据与模型设置。</div>
      <div class="agents-overview-grid mt-4">
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>工作区</div>
          <div class=${MONO_TEXT_CLASS}>${workspace}</div>
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>主模型</div>
          <div class=${MONO_TEXT_CLASS}>${model}</div>
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>身份名称</div>
          <input
            class=${INPUT_CLASS}
            .value=${identityNameInput}
            ?disabled=${!identityEditable}
            placeholder="例如：客服助手"
            @input=${(e: Event) =>
              onIdentityNameChange(agent.id, (e.target as HTMLInputElement).value)}
          />
          ${identityStatus ? html`<div class="agent-kv-sub ${MUTED_TEXT_CLASS}">${identityStatus}</div>` : nothing}
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>默认</div>
          <div>${isDefault ? "是" : "否"}</div>
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>身份表情</div>
          <input
            class=${INPUT_CLASS}
            .value=${identityEmojiInput}
            ?disabled=${!identityEditable}
            placeholder="例如：🤖"
            @input=${(e: Event) =>
              onIdentityEmojiChange(agent.id, (e.target as HTMLInputElement).value)}
          />
          ${!identityEmojiInput && identityEmoji !== "-" ? html`<div>${identityEmoji}</div>` : nothing}
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>身份头像</div>
          <div class="agent-avatar-upload">
            <label
              class="${buttonClass({ small: true })} agent-avatar-upload__label ${
                !identityEditable ? "agent-avatar-upload__label--disabled" : ""
              }"
              aria-disabled=${String(!identityEditable)}
            >
              上传图片
              <input
                id=${avatarInputId}
                class="agent-avatar-upload__input"
                type="file"
                accept="image/*"
                ?disabled=${!identityEditable}
                @change=${(e: Event) => {
                  const input = e.target as HTMLInputElement;
                  const file = input.files?.[0];
                  input.value = "";
                  if (!file) {
                    return;
                  }
                  void readImageFileAsDataUrl(file)
                    .then((dataUrl) => onIdentityAvatarChange(agent.id, dataUrl))
                    .catch(() => {});
                }}
              />
            </label>
            <button
              class=${buttonClass({ small: true })}
              type="button"
              ?disabled=${!identityEditable || !identityAvatarPreview}
              @click=${() => onIdentityAvatarChange(agent.id, null)}
            >
              清除头像
            </button>
          </div>
          ${
            identityAvatarPreview
              ? html`<img class="agent-avatar-preview" src=${identityAvatarPreview} alt="助手头像预览" />`
              : html`
                  <div class="agent-avatar-preview agent-avatar-preview--glyph" aria-hidden="true">
                    ${icons.assistantBadge}
                  </div>
                `
          }
          <div class="agent-kv-sub ${MUTED_TEXT_CLASS}">仅影响当前助手头像</div>
        </div>
        <div class="agent-kv">
          <div class=${FIELD_LABEL_CLASS}>技能过滤</div>
          <div>${skillFilter ? `已选择 ${skillCount} 项` : "全部技能"}</div>
        </div>
      </div>

      <div class="agent-model-select mt-5">
        <div class=${FIELD_LABEL_CLASS}>模型选择</div>
        <div class="mt-2 flex flex-wrap gap-3">
          <label class="${FIELD_CLASS} min-w-[260px] flex-1">
            <span class=${FIELD_LABEL_CLASS}>主模型${isDefault ? "（默认）" : ""}</span>
            <select
              class=${SELECT_CLASS}
              .value=${effectivePrimary ?? ""}
              ?disabled=${!configForm || configLoading || configSaving}
              @change=${(e: Event) =>
                onModelChange(agent.id, (e.target as HTMLSelectElement).value || null)}
            >
              ${
                isDefault
                  ? nothing
                  : html`
                      <option value="">
                        ${defaultPrimary ? `继承默认（${defaultPrimary}）` : "继承默认"}
                      </option>
                    `
              }
              ${buildModelOptions(configForm, effectivePrimary ?? undefined)}
            </select>
          </label>
          <label class="${FIELD_CLASS} min-w-[260px] flex-1">
            <span class=${FIELD_LABEL_CLASS}>回退模型（逗号分隔）</span>
            <input
              class=${INPUT_CLASS}
              .value=${fallbackText}
              ?disabled=${!configForm || configLoading || configSaving}
              placeholder="示例：服务商/模型, 服务商/模型"
              @input=${(e: Event) =>
                onModelFallbacksChange(
                  agent.id,
                  parseFallbackList((e.target as HTMLInputElement).value),
                )}
            />
          </label>
        </div>
        <div class="mt-3 flex justify-end gap-2">
          <button class=${buttonClass({ small: true })} ?disabled=${configLoading} @click=${onConfigReload}>
            重新加载配置
          </button>
          <button
            class=${buttonClass({ small: true, tone: "primary" })}
            ?disabled=${configSaving || !configDirty}
            @click=${onConfigSave}
          >
            ${configSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </section>
  `;
}
