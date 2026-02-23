import { html, nothing } from "lit";
import type {
  ExecApprovalsAllowlistEntry,
  ExecApprovalsFile,
} from "../controllers/exec-approvals.ts";
import { clampText, formatRelativeTimestamp } from "../format.ts";
import type { NodesProps } from "./nodes.ts";
import {
  buttonClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  CHECKBOX_CLASS,
  CHECKBOX_FIELD_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_CLASS,
  LIST_CLASS,
  LIST_ITEM_CLASS,
  LIST_MAIN_CLASS,
  LIST_META_CLASS,
  LIST_SUB_CLASS,
  LIST_TITLE_CLASS,
  MONO_TEXT_CLASS,
  MUTED_TEXT_CLASS,
  SELECT_CLASS,
} from "./tw.ts";

type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk = "off" | "on-miss" | "always";

type ExecApprovalsResolvedDefaults = {
  security: ExecSecurity;
  ask: ExecAsk;
  askFallback: ExecSecurity;
  autoAllowSkills: boolean;
};

type ExecApprovalsAgentOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
};

type ExecApprovalsTargetNode = {
  id: string;
  label: string;
};

type ExecApprovalsState = {
  ready: boolean;
  disabled: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  form: ExecApprovalsFile | null;
  defaults: ExecApprovalsResolvedDefaults;
  selectedScope: string;
  selectedAgent: Record<string, unknown> | null;
  agents: ExecApprovalsAgentOption[];
  allowlist: ExecApprovalsAllowlistEntry[];
  target: "gateway" | "node";
  targetNodeId: string | null;
  targetNodes: ExecApprovalsTargetNode[];
  onSelectScope: (agentId: string) => void;
  onSelectTarget: (kind: "gateway" | "node", nodeId: string | null) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onLoad: () => void;
  onSave: () => void;
};

const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";

const SECURITY_OPTIONS: Array<{ value: ExecSecurity; label: string }> = [
  { value: "deny", label: "拒绝" },
  { value: "allowlist", label: "白名单" },
  { value: "full", label: "完全放行" },
];

const ASK_OPTIONS: Array<{ value: ExecAsk; label: string }> = [
  { value: "off", label: "关闭" },
  { value: "on-miss", label: "未命中时询问" },
  { value: "always", label: "始终询问" },
];

function getSecurityLabel(value: string): string {
  return SECURITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function getAskLabel(value: string): string {
  return ASK_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function normalizeSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") {
    return value;
  }
  return "deny";
}

function normalizeAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") {
    return value;
  }
  return "on-miss";
}

function resolveExecApprovalsDefaults(
  form: ExecApprovalsFile | null,
): ExecApprovalsResolvedDefaults {
  const defaults = form?.defaults ?? {};
  return {
    security: normalizeSecurity(defaults.security),
    ask: normalizeAsk(defaults.ask),
    askFallback: normalizeSecurity(defaults.askFallback ?? "deny"),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? false),
  };
}

function resolveConfigAgents(config: Record<string, unknown> | null): ExecApprovalsAgentOption[] {
  const agentsNode = (config?.agents ?? {}) as Record<string, unknown>;
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  const agents: ExecApprovalsAgentOption[] = [];
  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return;
    }
    const name = typeof record.name === "string" ? record.name.trim() : undefined;
    const isDefault = record.default === true;
    agents.push({ id, name: name || undefined, isDefault });
  });
  return agents;
}

function resolveExecApprovalsAgents(
  config: Record<string, unknown> | null,
  form: ExecApprovalsFile | null,
): ExecApprovalsAgentOption[] {
  const configAgents = resolveConfigAgents(config);
  const approvalsAgents = Object.keys(form?.agents ?? {});
  const merged = new Map<string, ExecApprovalsAgentOption>();
  configAgents.forEach((agent) => merged.set(agent.id, agent));
  approvalsAgents.forEach((id) => {
    if (merged.has(id)) {
      return;
    }
    merged.set(id, { id });
  });
  const agents = Array.from(merged.values());
  if (agents.length === 0) {
    agents.push({ id: "main", isDefault: true });
  }
  agents.sort((a, b) => {
    if (a.isDefault && !b.isDefault) {
      return -1;
    }
    if (!a.isDefault && b.isDefault) {
      return 1;
    }
    const aLabel = a.name?.trim() ? a.name : a.id;
    const bLabel = b.name?.trim() ? b.name : b.id;
    return aLabel.localeCompare(bLabel);
  });
  return agents;
}

function resolveExecApprovalsScope(
  selected: string | null,
  agents: ExecApprovalsAgentOption[],
): string {
  if (selected === EXEC_APPROVALS_DEFAULT_SCOPE) {
    return EXEC_APPROVALS_DEFAULT_SCOPE;
  }
  if (selected && agents.some((agent) => agent.id === selected)) {
    return selected;
  }
  return EXEC_APPROVALS_DEFAULT_SCOPE;
}

export function resolveExecApprovalsState(props: NodesProps): ExecApprovalsState {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const ready = Boolean(form);
  const defaults = resolveExecApprovalsDefaults(form);
  const agents = resolveExecApprovalsAgents(props.configForm, form);
  const targetNodes = resolveExecApprovalsNodes(props.nodes);
  const target = props.execApprovalsTarget;
  let targetNodeId =
    target === "node" && props.execApprovalsTargetNodeId ? props.execApprovalsTargetNodeId : null;
  if (target === "node" && targetNodeId && !targetNodes.some((node) => node.id === targetNodeId)) {
    targetNodeId = null;
  }
  const selectedScope = resolveExecApprovalsScope(props.execApprovalsSelectedAgent, agents);
  const selectedAgent =
    selectedScope !== EXEC_APPROVALS_DEFAULT_SCOPE
      ? (((form?.agents ?? {})[selectedScope] as Record<string, unknown> | undefined) ?? null)
      : null;
  const allowlist = Array.isArray((selectedAgent as { allowlist?: unknown })?.allowlist)
    ? ((selectedAgent as { allowlist?: ExecApprovalsAllowlistEntry[] }).allowlist ?? [])
    : [];
  return {
    ready,
    disabled: props.execApprovalsSaving || props.execApprovalsLoading,
    dirty: props.execApprovalsDirty,
    loading: props.execApprovalsLoading,
    saving: props.execApprovalsSaving,
    form,
    defaults,
    selectedScope,
    selectedAgent,
    agents,
    allowlist,
    target,
    targetNodeId,
    targetNodes,
    onSelectScope: props.onExecApprovalsSelectAgent,
    onSelectTarget: props.onExecApprovalsTargetChange,
    onPatch: props.onExecApprovalsPatch,
    onRemove: props.onExecApprovalsRemove,
    onLoad: props.onLoadExecApprovals,
    onSave: props.onSaveExecApprovals,
  };
}

export function renderExecApprovals(state: ExecApprovalsState) {
  const ready = state.ready;
  const targetReady = state.target !== "node" || Boolean(state.targetNodeId);
  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>Exec 审批</div>
          <div class=${CARD_SUB_CLASS}>
            管理 <span class="mono">exec host=gateway/node</span> 的白名单与审批策略。
          </div>
        </div>
        <button
          class=${buttonClass({ tone: "primary" })}
          ?disabled=${state.disabled || !state.dirty || !targetReady}
          @click=${state.onSave}
        >
          ${state.saving ? "保存中…" : "保存"}
        </button>
      </div>

      ${renderExecApprovalsTarget(state)}

      ${
        !ready
          ? html`<div class="mt-3 flex flex-wrap items-center gap-3">
            <div class=${MUTED_TEXT_CLASS}>请先加载 Exec 审批配置后再编辑白名单。</div>
            <button
              class=${buttonClass()}
              ?disabled=${state.loading || !targetReady}
              @click=${state.onLoad}
            >
              ${state.loading ? "加载中…" : "加载审批配置"}
            </button>
          </div>`
          : html`
            ${renderExecApprovalsTabs(state)}
            ${renderExecApprovalsPolicy(state)}
            ${
              state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE
                ? nothing
                : renderExecApprovalsAllowlist(state)
            }
          `
      }
    </section>
  `;
}

function renderExecApprovalsTarget(state: ExecApprovalsState) {
  const hasNodes = state.targetNodes.length > 0;
  const nodeValue = state.targetNodeId ?? "";
  return html`
    <div class="${LIST_CLASS} mt-3">
      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>目标</div>
          <div class=${LIST_SUB_CLASS}>
            选择在网关本地编辑，或切换到指定节点编辑。
          </div>
        </div>
        <div class="${LIST_META_CLASS} w-full gap-2 lg:w-auto lg:min-w-[220px] lg:items-stretch">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>宿主</span>
            <select
              class=${SELECT_CLASS}
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (value === "node") {
                  const first = state.targetNodes[0]?.id ?? null;
                  state.onSelectTarget("node", nodeValue || first);
                } else {
                  state.onSelectTarget("gateway", null);
                }
              }}
            >
              <option value="gateway" ?selected=${state.target === "gateway"}>网关</option>
              <option value="node" ?selected=${state.target === "node"}>节点</option>
            </select>
          </label>
          ${
            state.target === "node"
              ? html`
                <label class=${FIELD_CLASS}>
                  <span class=${FIELD_LABEL_CLASS}>节点</span>
                  <select
                    class=${SELECT_CLASS}
                    ?disabled=${state.disabled || !hasNodes}
                    @change=${(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      const value = target.value.trim();
                      state.onSelectTarget("node", value ? value : null);
                    }}
                  >
                    <option value="" ?selected=${nodeValue === ""}>选择节点</option>
                    ${state.targetNodes.map(
                      (node) =>
                        html`<option
                          value=${node.id}
                          ?selected=${nodeValue === node.id}
                        >
                          ${node.label}
                        </option>`,
                    )}
                  </select>
                </label>
              `
              : nothing
          }
        </div>
      </div>
      ${
        state.target === "node" && !hasNodes
          ? html`
              <div class="${MUTED_TEXT_CLASS} mt-2">暂无节点声明 Exec 审批能力。</div>
            `
          : nothing
      }
    </div>
  `;
}

function renderExecApprovalsTabs(state: ExecApprovalsState) {
  return html`
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class=${FIELD_LABEL_CLASS}>范围</span>
      <div class="flex flex-wrap gap-2">
        <button
          class=${buttonClass({
            small: true,
            active: state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE,
          })}
          @click=${() => state.onSelectScope(EXEC_APPROVALS_DEFAULT_SCOPE)}
        >
          默认策略
        </button>
        ${state.agents.map((agent) => {
          const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
          return html`
            <button
              class=${buttonClass({ small: true, active: state.selectedScope === agent.id })}
              @click=${() => state.onSelectScope(agent.id)}
            >
              ${label}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

function renderExecApprovalsPolicy(state: ExecApprovalsState) {
  const isDefaults = state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE;
  const defaults = state.defaults;
  const agent = state.selectedAgent ?? {};
  const basePath = isDefaults ? ["defaults"] : ["agents", state.selectedScope];
  const agentSecurity = typeof agent.security === "string" ? agent.security : undefined;
  const agentAsk = typeof agent.ask === "string" ? agent.ask : undefined;
  const agentAskFallback = typeof agent.askFallback === "string" ? agent.askFallback : undefined;
  const securityValue = isDefaults ? defaults.security : (agentSecurity ?? "__default__");
  const askValue = isDefaults ? defaults.ask : (agentAsk ?? "__default__");
  const askFallbackValue = isDefaults ? defaults.askFallback : (agentAskFallback ?? "__default__");
  const autoOverride =
    typeof agent.autoAllowSkills === "boolean" ? agent.autoAllowSkills : undefined;
  const autoEffective = autoOverride ?? defaults.autoAllowSkills;
  const autoIsDefault = autoOverride == null;

  return html`
    <div class="${LIST_CLASS} mt-4">
      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>安全策略</div>
          <div class=${LIST_SUB_CLASS}>
            ${isDefaults ? "全局默认安全模式。" : `默认值：${getSecurityLabel(defaults.security)}。`}
          </div>
        </div>
        <div class="${LIST_META_CLASS} w-full gap-2 lg:w-auto lg:min-w-[220px] lg:items-stretch">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>模式</span>
            <select
              class=${SELECT_CLASS}
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "security"]);
                } else {
                  state.onPatch([...basePath, "security"], value);
                }
              }}
            >
              ${
                !isDefaults
                  ? html`<option value="__default__" ?selected=${securityValue === "__default__"}>
                    使用默认（${getSecurityLabel(defaults.security)}）
                  </option>`
                  : nothing
              }
              ${SECURITY_OPTIONS.map(
                (option) =>
                  html`<option
                    value=${option.value}
                    ?selected=${securityValue === option.value}
                  >
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>询问策略</div>
          <div class=${LIST_SUB_CLASS}>
            ${isDefaults ? "默认提示策略。" : `默认值：${getAskLabel(defaults.ask)}。`}
          </div>
        </div>
        <div class="${LIST_META_CLASS} w-full gap-2 lg:w-auto lg:min-w-[220px] lg:items-stretch">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>模式</span>
            <select
              class=${SELECT_CLASS}
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "ask"]);
                } else {
                  state.onPatch([...basePath, "ask"], value);
                }
              }}
            >
              ${
                !isDefaults
                  ? html`<option value="__default__" ?selected=${askValue === "__default__"}>
                    使用默认（${getAskLabel(defaults.ask)}）
                  </option>`
                  : nothing
              }
              ${ASK_OPTIONS.map(
                (option) =>
                  html`<option
                    value=${option.value}
                    ?selected=${askValue === option.value}
                  >
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>询问回退</div>
          <div class=${LIST_SUB_CLASS}>
            ${
              isDefaults
                ? "当界面提示不可用时采用此策略。"
                : `默认值：${getSecurityLabel(defaults.askFallback)}。`
            }
          </div>
        </div>
        <div class="${LIST_META_CLASS} w-full gap-2 lg:w-auto lg:min-w-[220px] lg:items-stretch">
          <label class=${FIELD_CLASS}>
            <span class=${FIELD_LABEL_CLASS}>回退模式</span>
            <select
              class=${SELECT_CLASS}
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "askFallback"]);
                } else {
                  state.onPatch([...basePath, "askFallback"], value);
                }
              }}
            >
              ${
                !isDefaults
                  ? html`<option value="__default__" ?selected=${askFallbackValue === "__default__"}>
                    使用默认（${getSecurityLabel(defaults.askFallback)}）
                  </option>`
                  : nothing
              }
              ${SECURITY_OPTIONS.map(
                (option) =>
                  html`<option
                    value=${option.value}
                    ?selected=${askFallbackValue === option.value}
                  >
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class=${LIST_ITEM_CLASS}>
        <div class=${LIST_MAIN_CLASS}>
          <div class=${LIST_TITLE_CLASS}>自动放行技能 CLI</div>
          <div class=${LIST_SUB_CLASS}>
            ${
              isDefaults
                ? "自动放行网关技能清单中的可执行项。"
                : autoIsDefault
                  ? `使用默认 (${defaults.autoAllowSkills ? "开" : "关"})。`
                  : `覆盖值 (${autoEffective ? "开" : "关"})。`
            }
          </div>
        </div>
        <div class="${LIST_META_CLASS} w-full gap-2 lg:w-auto lg:min-w-[220px] lg:items-end">
          <label class=${CHECKBOX_FIELD_CLASS}>
            <span>启用</span>
            <input
              class=${CHECKBOX_CLASS}
              type="checkbox"
              ?disabled=${state.disabled}
              .checked=${autoEffective}
              @change=${(event: Event) => {
                const target = event.target as HTMLInputElement;
                state.onPatch([...basePath, "autoAllowSkills"], target.checked);
              }}
            />
          </label>
          ${
            !isDefaults && !autoIsDefault
              ? html`<button
                class=${buttonClass({ small: true })}
                ?disabled=${state.disabled}
                @click=${() => state.onRemove([...basePath, "autoAllowSkills"])}
              >
                使用默认
              </button>`
              : nothing
          }
        </div>
      </div>
    </div>
  `;
}

function renderExecApprovalsAllowlist(state: ExecApprovalsState) {
  const allowlistPath = ["agents", state.selectedScope, "allowlist"];
  const entries = state.allowlist;
  return html`
    <div class="mt-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class=${CARD_TITLE_CLASS}>白名单</div>
        <div class=${CARD_SUB_CLASS}>大小写不敏感的 glob 模式。</div>
      </div>
      <button
        class=${buttonClass({ small: true })}
        ?disabled=${state.disabled}
        @click=${() => {
          const next = [...entries, { pattern: "" }];
          state.onPatch(allowlistPath, next);
        }}
      >
        添加模式
      </button>
    </div>
    <div class="${LIST_CLASS} mt-3">
      ${
        entries.length === 0
          ? html`
              <div class=${MUTED_TEXT_CLASS}>暂未添加白名单条目。</div>
            `
          : entries.map((entry, index) => renderAllowlistEntry(state, entry, index))
      }
    </div>
  `;
}

function renderAllowlistEntry(
  state: ExecApprovalsState,
  entry: ExecApprovalsAllowlistEntry,
  index: number,
) {
  const lastUsed = entry.lastUsedAt ? formatRelativeTimestamp(entry.lastUsedAt) : "从未";
  const lastCommand = entry.lastUsedCommand ? clampText(entry.lastUsedCommand, 120) : null;
  const lastPath = entry.lastResolvedPath ? clampText(entry.lastResolvedPath, 120) : null;
  return html`
    <div class=${LIST_ITEM_CLASS}>
      <div class=${LIST_MAIN_CLASS}>
        <div class=${LIST_TITLE_CLASS}>${entry.pattern?.trim() ? entry.pattern : "新模式"}</div>
        <div class=${LIST_SUB_CLASS}>最近使用：${lastUsed}</div>
        ${lastCommand ? html`<div class="${LIST_SUB_CLASS} ${MONO_TEXT_CLASS}">${lastCommand}</div>` : nothing}
        ${lastPath ? html`<div class="${LIST_SUB_CLASS} ${MONO_TEXT_CLASS}">${lastPath}</div>` : nothing}
      </div>
      <div class="${LIST_META_CLASS} w-full gap-2 lg:w-auto lg:min-w-[260px] lg:items-stretch">
        <label class=${FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>模式</span>
          <input
            class=${INPUT_CLASS}
            type="text"
            .value=${entry.pattern ?? ""}
            ?disabled=${state.disabled}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              state.onPatch(
                ["agents", state.selectedScope, "allowlist", index, "pattern"],
                target.value,
              );
            }}
          />
        </label>
        <button
          class=${buttonClass({ small: true, tone: "danger" })}
          ?disabled=${state.disabled}
          @click=${() => {
            if (state.allowlist.length <= 1) {
              state.onRemove(["agents", state.selectedScope, "allowlist"]);
              return;
            }
            state.onRemove(["agents", state.selectedScope, "allowlist", index]);
          }}
        >
          删除
        </button>
      </div>
    </div>
  `;
}

function resolveExecApprovalsNodes(
  nodes: Array<Record<string, unknown>>,
): ExecApprovalsTargetNode[] {
  const list: ExecApprovalsTargetNode[] = [];
  for (const node of nodes) {
    const commands = Array.isArray(node.commands) ? node.commands : [];
    const supports = commands.some(
      (cmd) =>
        String(cmd) === "system.execApprovals.get" || String(cmd) === "system.execApprovals.set",
    );
    if (!supports) {
      continue;
    }
    const nodeId = typeof node.nodeId === "string" ? node.nodeId.trim() : "";
    if (!nodeId) {
      continue;
    }
    const displayName =
      typeof node.displayName === "string" && node.displayName.trim()
        ? node.displayName.trim()
        : nodeId;
    list.push({
      id: nodeId,
      label: displayName === nodeId ? nodeId : `${displayName} · ${nodeId}`,
    });
  }
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}
