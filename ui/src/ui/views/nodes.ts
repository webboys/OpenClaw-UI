import { html, nothing } from "lit";
import type {
  DevicePairingList,
  DeviceTokenSummary,
  PairedDevice,
  PendingDevice,
} from "../controllers/devices.ts";
import type { ExecApprovalsFile, ExecApprovalsSnapshot } from "../controllers/exec-approvals.ts";
import { formatRelativeTimestamp, formatList } from "../format.ts";
import { renderExecApprovals, resolveExecApprovalsState } from "./nodes-exec-approvals.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  CHIP_CLASS,
  CHIP_ROW_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
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
export type NodesProps = {
  loading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  configFormMode: "form" | "raw";
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  execApprovalsSelectedAgent: string | null;
  execApprovalsTarget: "gateway" | "node";
  execApprovalsTargetNodeId: string | null;
  onRefresh: () => void;
  onDevicesRefresh: () => void;
  onDeviceApprove: (requestId: string) => void;
  onDeviceReject: (requestId: string) => void;
  onDeviceRotate: (deviceId: string, role: string, scopes?: string[]) => void;
  onDeviceRevoke: (deviceId: string, role: string) => void;
  onLoadConfig: () => void;
  onLoadExecApprovals: () => void;
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSaveBindings: () => void;
  onExecApprovalsTargetChange: (kind: "gateway" | "node", nodeId: string | null) => void;
  onExecApprovalsSelectAgent: (agentId: string) => void;
  onExecApprovalsPatch: (path: Array<string | number>, value: unknown) => void;
  onExecApprovalsRemove: (path: Array<string | number>) => void;
  onSaveExecApprovals: () => void;
};

export function renderNodes(props: NodesProps) {
  const bindingState = resolveBindingsState(props);
  const approvalsState = resolveExecApprovalsState(props);
  return html`
    ${renderExecApprovals(approvalsState)}
    ${renderBindings(bindingState)}
    ${renderDevices(props)}
    <section class=${CARD_CLASS}>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>在线设备</div>
          <div class=${CARD_SUB_CLASS}>查看已配对设备与在线连接状态。</div>
        </div>
        <button class=${buttonClass()} ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "加载中…" : "刷新"}
        </button>
      </div>
      <div class="${LIST_CLASS} mt-4">
        ${
          props.nodes.length === 0
            ? html`
                <div class=${MUTED_TEXT_CLASS}>未发现在线设备。</div>
              `
            : props.nodes.map((n) => renderNode(n))
        }
      </div>
    </section>
  `;
}

function renderDevices(props: NodesProps) {
  const list = props.devicesList ?? { pending: [], paired: [] };
  const pending = Array.isArray(list.pending) ? list.pending : [];
  const paired = Array.isArray(list.paired) ? list.paired : [];
  return html`
    <section class=${CARD_CLASS}>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>设备</div>
          <div class=${CARD_SUB_CLASS}>配对申请、角色与令牌管理。</div>
        </div>
        <button class=${buttonClass()} ?disabled=${props.devicesLoading} @click=${props.onDevicesRefresh}>
          ${props.devicesLoading ? "加载中…" : "刷新"}
        </button>
      </div>
      ${
        props.devicesError
          ? html`<div class="${calloutClass("danger")} mt-3">${props.devicesError}</div>`
          : nothing
      }
      <div class="${LIST_CLASS} mt-4">
        ${
          pending.length > 0
            ? html`
              <div class="${MUTED_TEXT_CLASS} mb-2">待处理</div>
              ${pending.map((req) => renderPendingDevice(req, props))}
            `
            : nothing
        }
        ${
          paired.length > 0
            ? html`
              <div class="${MUTED_TEXT_CLASS} mb-2 mt-3">已配对</div>
              ${paired.map((device) => renderPairedDevice(device, props))}
            `
            : nothing
        }
        ${
          pending.length === 0 && paired.length === 0
            ? html`
                <div class=${MUTED_TEXT_CLASS}>暂无配对设备。</div>
              `
            : nothing
        }
      </div>
    </section>
  `;
}

function renderPendingDevice(req: PendingDevice, props: NodesProps) {
  const name = req.displayName?.trim() || req.deviceId;
  const age = typeof req.ts === "number" ? formatRelativeTimestamp(req.ts) : "暂无";
  const role = req.role?.trim() ? `角色: ${req.role}` : "角色: -";
  const repair = req.isRepair ? " · 修复请求" : "";
  const ip = req.remoteIp ? ` · ${req.remoteIp}` : "";
  return html`
    <div class=${LIST_ITEM_CLASS}>
      <div class=${LIST_MAIN_CLASS}>
        <div class=${LIST_TITLE_CLASS}>${name}</div>
        <div class=${LIST_SUB_CLASS}>${req.deviceId}${ip}</div>
        <div class="${MUTED_TEXT_CLASS} mt-1.5">
          ${role} · 申请于 ${age}${repair}
        </div>
      </div>
      <div class=${LIST_META_CLASS}>
        <div class="flex flex-wrap justify-end gap-2">
          <button class=${buttonClass({ small: true, tone: "primary" })} @click=${() => props.onDeviceApprove(req.requestId)}>
            通过
          </button>
          <button class=${buttonClass({ small: true })} @click=${() => props.onDeviceReject(req.requestId)}>
            拒绝
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPairedDevice(device: PairedDevice, props: NodesProps) {
  const name = device.displayName?.trim() || device.deviceId;
  const ip = device.remoteIp ? ` · ${device.remoteIp}` : "";
  const roles = `角色: ${formatList(device.roles)}`;
  const scopes = `作用域: ${formatList(device.scopes)}`;
  const tokens = Array.isArray(device.tokens) ? device.tokens : [];
  return html`
    <div class=${LIST_ITEM_CLASS}>
      <div class=${LIST_MAIN_CLASS}>
        <div class=${LIST_TITLE_CLASS}>${name}</div>
        <div class=${LIST_SUB_CLASS}>${device.deviceId}${ip}</div>
        <div class="${MUTED_TEXT_CLASS} mt-1.5">${roles} · ${scopes}</div>
        ${
          tokens.length === 0
            ? html`
                <div class="${MUTED_TEXT_CLASS} mt-1.5">令牌：无</div>
              `
            : html`
              <div class="${MUTED_TEXT_CLASS} mt-2.5">令牌</div>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
                ${tokens.map((token) => renderTokenRow(device.deviceId, token, props))}
              </div>
            `
        }
      </div>
    </div>
  `;
}

function renderTokenRow(deviceId: string, token: DeviceTokenSummary, props: NodesProps) {
  const status = token.revokedAtMs ? "已撤销" : "生效中";
  const scopes = `作用域: ${formatList(token.scopes)}`;
  const when = formatRelativeTimestamp(
    token.rotatedAtMs ?? token.createdAtMs ?? token.lastUsedAtMs ?? null,
  );
  return html`
    <div class="flex items-start justify-between gap-2">
      <div class=${LIST_SUB_CLASS}>${token.role} · ${status} · ${scopes} · ${when}</div>
      <div class="flex flex-wrap justify-end gap-1.5">
        <button
          class=${buttonClass({ small: true })}
          @click=${() => props.onDeviceRotate(deviceId, token.role, token.scopes)}
        >
          轮换
        </button>
        ${
          token.revokedAtMs
            ? nothing
            : html`
              <button
                class=${buttonClass({ small: true, tone: "danger" })}
                @click=${() => props.onDeviceRevoke(deviceId, token.role)}
              >
                撤销
              </button>
            `
        }
      </div>
    </div>
  `;
}

type BindingAgent = {
  id: string;
  name?: string;
  index: number;
  isDefault: boolean;
  binding?: string | null;
};

type BindingNode = {
  id: string;
  label: string;
};

type BindingState = {
  ready: boolean;
  disabled: boolean;
  configDirty: boolean;
  configLoading: boolean;
  configSaving: boolean;
  defaultBinding?: string | null;
  agents: BindingAgent[];
  nodes: BindingNode[];
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSave: () => void;
  onLoadConfig: () => void;
  formMode: "form" | "raw";
};

function resolveBindingsState(props: NodesProps): BindingState {
  const config = props.configForm;
  const nodes = resolveExecNodes(props.nodes);
  const { defaultBinding, agents } = resolveAgentBindings(config);
  const ready = Boolean(config);
  const disabled = props.configSaving || props.configFormMode === "raw";
  return {
    ready,
    disabled,
    configDirty: props.configDirty,
    configLoading: props.configLoading,
    configSaving: props.configSaving,
    defaultBinding,
    agents,
    nodes,
    onBindDefault: props.onBindDefault,
    onBindAgent: props.onBindAgent,
    onSave: props.onSaveBindings,
    onLoadConfig: props.onLoadConfig,
    formMode: props.configFormMode,
  };
}

function renderBindings(state: BindingState) {
  const supportsBinding = state.nodes.length > 0;
  const defaultValue = state.defaultBinding ?? "";
  return html`
    <section class=${CARD_CLASS}>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>执行设备绑定</div>
          <div class=${CARD_SUB_CLASS}>
            在 <span class=${MONO_TEXT_CLASS}>exec host=node</span> 模式下，为助手固定执行设备。
          </div>
        </div>
        <button
          class=${buttonClass()}
          ?disabled=${state.disabled || !state.configDirty}
          @click=${state.onSave}
        >
          ${state.configSaving ? "保存中…" : "保存"}
        </button>
      </div>

      ${
        state.formMode === "raw"
          ? html`
              <div class="${calloutClass("warn")} mt-3">
                请先把配置页切到 <strong>表单模式</strong>，再在此编辑绑定策略。
              </div>
            `
          : nothing
      }

      ${
        !state.ready
          ? html`<div class="mt-3 flex items-center gap-3">
            <div class=${MUTED_TEXT_CLASS}>请先加载配置后再编辑绑定。</div>
            <button class=${buttonClass()} ?disabled=${state.configLoading} @click=${state.onLoadConfig}>
              ${state.configLoading ? "加载中…" : "加载配置"}
            </button>
          </div>`
          : html`
            <div class="${LIST_CLASS} mt-4">
              <div class=${LIST_ITEM_CLASS}>
                <div class=${LIST_MAIN_CLASS}>
                  <div class=${LIST_TITLE_CLASS}>默认绑定</div>
                  <div class=${LIST_SUB_CLASS}>当智能体未配置单独绑定时，将使用该默认节点。</div>
                </div>
                <div class=${LIST_META_CLASS}>
                  <label class=${FIELD_CLASS}>
                    <span class=${FIELD_LABEL_CLASS}>节点</span>
                    <select
                      class=${SELECT_CLASS}
                      ?disabled=${state.disabled || !supportsBinding}
                      @change=${(event: Event) => {
                        const target = event.target as HTMLSelectElement;
                        const value = target.value.trim();
                        state.onBindDefault(value ? value : null);
                      }}
                    >
                      <option value="" ?selected=${defaultValue === ""}>任意节点</option>
                      ${state.nodes.map(
                        (node) =>
                          html`<option
                            value=${node.id}
                            ?selected=${defaultValue === node.id}
                          >
                            ${node.label}
                          </option>`,
                      )}
                    </select>
                  </label>
                  ${
                    !supportsBinding
                      ? html`
                          <div class=${MUTED_TEXT_CLASS}>暂无支持 system.run 的节点。</div>
                        `
                      : nothing
                  }
                </div>
              </div>

              ${
                state.agents.length === 0
                  ? html`
                      <div class=${MUTED_TEXT_CLASS}>未找到智能体。</div>
                    `
                  : state.agents.map((agent) => renderAgentBinding(agent, state))
              }
            </div>
          `
      }
    </section>
  `;
}

function renderAgentBinding(agent: BindingAgent, state: BindingState) {
  const bindingValue = agent.binding ?? "__default__";
  const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
  const supportsBinding = state.nodes.length > 0;
  return html`
    <div class=${LIST_ITEM_CLASS}>
      <div class=${LIST_MAIN_CLASS}>
        <div class=${LIST_TITLE_CLASS}>${label}</div>
        <div class=${LIST_SUB_CLASS}>
          ${agent.isDefault ? "默认智能体" : "智能体"} ·
          ${
            bindingValue === "__default__"
              ? `使用默认 (${state.defaultBinding ?? "任意"})`
              : `覆盖为: ${agent.binding}`
          }
        </div>
      </div>
      <div class=${LIST_META_CLASS}>
        <label class=${FIELD_CLASS}>
          <span class=${FIELD_LABEL_CLASS}>绑定</span>
          <select
            class=${SELECT_CLASS}
            ?disabled=${state.disabled || !supportsBinding}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              const value = target.value.trim();
              state.onBindAgent(agent.index, value === "__default__" ? null : value);
            }}
          >
            <option value="__default__" ?selected=${bindingValue === "__default__"}>
              使用默认
            </option>
            ${state.nodes.map(
              (node) =>
                html`<option
                  value=${node.id}
                  ?selected=${bindingValue === node.id}
                >
                  ${node.label}
                </option>`,
            )}
          </select>
        </label>
      </div>
    </div>
  `;
}

function resolveExecNodes(nodes: Array<Record<string, unknown>>): BindingNode[] {
  const list: BindingNode[] = [];
  for (const node of nodes) {
    const commands = Array.isArray(node.commands) ? node.commands : [];
    const supports = commands.some((cmd) => String(cmd) === "system.run");
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

function resolveAgentBindings(config: Record<string, unknown> | null): {
  defaultBinding?: string | null;
  agents: BindingAgent[];
} {
  const fallbackAgent: BindingAgent = {
    id: "main",
    name: undefined,
    index: 0,
    isDefault: true,
    binding: null,
  };
  if (!config || typeof config !== "object") {
    return { defaultBinding: null, agents: [fallbackAgent] };
  }
  const tools = (config.tools ?? {}) as Record<string, unknown>;
  const exec = (tools.exec ?? {}) as Record<string, unknown>;
  const defaultBinding =
    typeof exec.node === "string" && exec.node.trim() ? exec.node.trim() : null;

  const agentsNode = (config.agents ?? {}) as Record<string, unknown>;
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  if (list.length === 0) {
    return { defaultBinding, agents: [fallbackAgent] };
  }

  const agents: BindingAgent[] = [];
  list.forEach((entry, index) => {
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
    const toolsEntry = (record.tools ?? {}) as Record<string, unknown>;
    const execEntry = (toolsEntry.exec ?? {}) as Record<string, unknown>;
    const binding =
      typeof execEntry.node === "string" && execEntry.node.trim() ? execEntry.node.trim() : null;
    agents.push({
      id,
      name: name || undefined,
      index,
      isDefault,
      binding,
    });
  });

  if (agents.length === 0) {
    agents.push(fallbackAgent);
  }

  return { defaultBinding, agents };
}

function renderNode(node: Record<string, unknown>) {
  const connected = Boolean(node.connected);
  const paired = Boolean(node.paired);
  const title =
    (typeof node.displayName === "string" && node.displayName.trim()) ||
    (typeof node.nodeId === "string" ? node.nodeId : "未知节点");
  const caps = Array.isArray(node.caps) ? (node.caps as unknown[]) : [];
  const commands = Array.isArray(node.commands) ? (node.commands as unknown[]) : [];
  return html`
    <div class=${LIST_ITEM_CLASS}>
      <div class=${LIST_MAIN_CLASS}>
        <div class=${LIST_TITLE_CLASS}>${title}</div>
        <div class=${LIST_SUB_CLASS}>
          ${typeof node.nodeId === "string" ? node.nodeId : ""}
          ${typeof node.remoteIp === "string" ? ` · ${node.remoteIp}` : ""}
          ${typeof node.version === "string" ? ` · ${node.version}` : ""}
        </div>
        <div class="${CHIP_ROW_CLASS} mt-1.5">
          <span class=${CHIP_CLASS}>${paired ? "已配对" : "未配对"}</span>
          <span class="${CHIP_CLASS} ${connected ? "chip-ok" : "chip-warn"}">
            ${connected ? "在线" : "离线"}
          </span>
          ${caps.slice(0, 12).map((c) => html`<span class=${CHIP_CLASS}>${String(c)}</span>`)}
          ${commands.slice(0, 8).map((c) => html`<span class=${CHIP_CLASS}>${String(c)}</span>`)}
        </div>
      </div>
    </div>
  `;
}
