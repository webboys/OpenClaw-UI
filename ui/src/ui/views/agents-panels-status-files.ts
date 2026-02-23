import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { AgentFileEntry, AgentsFilesListResult } from "../types.ts";
import { formatBytes } from "./agents-utils.ts";
import {
  buttonClass,
  calloutClass,
  CARD_CLASS,
  CARD_SUB_CLASS,
  CARD_TITLE_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  MONO_TEXT_CLASS,
  MUTED_TEXT_CLASS,
  TEXTAREA_CLASS,
} from "./tw.ts";

export function renderAgentFiles(params: {
  agentId: string;
  agentFilesList: AgentsFilesListResult | null;
  agentFilesLoading: boolean;
  agentFilesError: string | null;
  agentFileActive: string | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  onLoadFiles: (agentId: string) => void;
  onSelectFile: (name: string) => void;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
}) {
  const list = params.agentFilesList?.agentId === params.agentId ? params.agentFilesList : null;
  const files = list?.files ?? [];
  const active = params.agentFileActive ?? null;
  const activeEntry = active ? (files.find((file) => file.name === active) ?? null) : null;
  const baseContent = active ? (params.agentFileContents[active] ?? "") : "";
  const draft = active ? (params.agentFileDrafts[active] ?? baseContent) : "";
  const isDirty = active ? draft !== baseContent : false;

  return html`
    <section class=${CARD_CLASS}>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class=${CARD_TITLE_CLASS}>核心文件</div>
          <div class=${CARD_SUB_CLASS}>管理系统提示、身份配置与工具指导文件。</div>
        </div>
        <button
          class=${buttonClass({ small: true })}
          ?disabled=${params.agentFilesLoading}
          @click=${() => params.onLoadFiles(params.agentId)}
        >
          ${params.agentFilesLoading ? "加载中…" : "刷新"}
        </button>
      </div>
      ${
        list
          ? html`<div class="${MUTED_TEXT_CLASS} ${MONO_TEXT_CLASS} mt-2">工作区：${list.workspace}</div>`
          : nothing
      }
      ${
        params.agentFilesError
          ? html`<div class="${calloutClass("danger")} mt-3">${params.agentFilesError}</div>`
          : nothing
      }
      ${
        !list
          ? html`
              <div class="${calloutClass("default")} mt-3">
                请先加载智能体工作区文件，再编辑核心指令。
              </div>
            `
          : html`
              <div class="agent-files-grid mt-4">
                <div class="agent-files-list">
                  ${
                    files.length === 0
                      ? html`
                          <div class=${MUTED_TEXT_CLASS}>没有发现文件。</div>
                        `
                      : files.map((file) =>
                          renderAgentFileRow(file, active, () => params.onSelectFile(file.name)),
                        )
                  }
                </div>
                <div class="agent-files-editor">
                  ${
                    !activeEntry
                      ? html`
                          <div class=${MUTED_TEXT_CLASS}>请选择一个文件开始编辑。</div>
                        `
                      : html`
                          <div class="agent-file-header">
                            <div>
                              <div class="agent-file-title mono">${activeEntry.name}</div>
                              <div class="agent-file-sub mono">${activeEntry.path}</div>
                            </div>
                            <div class="agent-file-actions">
                              <button
                                class=${buttonClass({ small: true })}
                                ?disabled=${!isDirty}
                                @click=${() => params.onFileReset(activeEntry.name)}
                              >
                                重置
                              </button>
                              <button
                                class=${buttonClass({ small: true, tone: "primary" })}
                                ?disabled=${params.agentFileSaving || !isDirty}
                                @click=${() => params.onFileSave(activeEntry.name)}
                              >
                                ${params.agentFileSaving ? "保存中…" : "保存"}
                              </button>
                            </div>
                          </div>
                          ${
                            activeEntry.missing
                              ? html`
                                  <div class="${calloutClass("warn")} mt-2.5">
                                    该文件不存在。点击保存后会在智能体工作区中创建它。
                                  </div>
                                `
                              : nothing
                          }
                          <label class="${FIELD_CLASS} mt-3">
                            <span class=${FIELD_LABEL_CLASS}>内容</span>
                            <textarea
                              class=${TEXTAREA_CLASS}
                              .value=${draft}
                              @input=${(e: Event) =>
                                params.onFileDraftChange(
                                  activeEntry.name,
                                  (e.target as HTMLTextAreaElement).value,
                                )}
                            ></textarea>
                          </label>
                        `
                  }
                </div>
              </div>
            `
      }
    </section>
  `;
}

function renderAgentFileRow(file: AgentFileEntry, active: string | null, onSelect: () => void) {
  const status = file.missing
    ? "缺失"
    : `${formatBytes(file.size)} | ${formatRelativeTimestamp(file.updatedAtMs ?? null)}`;
  return html`
    <button
      type="button"
      class="agent-file-row ${active === file.name ? "active" : ""}"
      @click=${onSelect}
    >
      <div>
        <div class="agent-file-name mono">${file.name}</div>
        <div class="agent-file-meta">${status}</div>
      </div>
      ${
        file.missing
          ? html`
              <span class="agent-pill warn">缺失</span>
            `
          : nothing
      }
    </button>
  `;
}
