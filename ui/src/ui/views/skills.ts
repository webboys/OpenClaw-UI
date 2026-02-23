import { html, nothing } from "lit";
import type { SkillMessageMap } from "../controllers/skills.ts";
import { clampText } from "../format.ts";
import type { SkillStatusEntry, SkillStatusReport } from "../types.ts";
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
  MUTED_TEXT_CLASS,
} from "./tw.ts";

export type SkillsProps = {
  loading: boolean;
  report: SkillStatusReport | null;
  error: string | null;
  filter: string;
  edits: Record<string, string>;
  busyKey: string | null;
  messages: SkillMessageMap;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onToggle: (skillKey: string, enabled: boolean) => void;
  onEdit: (skillKey: string, value: string) => void;
  onSaveKey: (skillKey: string) => void;
  onInstall: (skillKey: string, name: string, installId: string) => void;
};

export function renderSkills(props: SkillsProps) {
  const skills = props.report?.skills ?? [];
  const filter = props.filter.trim().toLowerCase();
  const filtered = filter
    ? skills.filter((skill) =>
        [skill.name, skill.description, skill.source].join(" ").toLowerCase().includes(filter),
      )
    : skills;
  const groups = groupSkills(filtered);

  return html`
    <section class=${CARD_CLASS}>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class=${CARD_TITLE_CLASS}>能力中心</div>
          <div class=${CARD_SUB_CLASS}>网关中的内置、托管与工作区能力。</div>
        </div>
        <button class=${buttonClass()} ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "加载中…" : "刷新"}
        </button>
      </div>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label class="${FIELD_CLASS} sm:flex-1">
          <span class=${FIELD_LABEL_CLASS}>筛选</span>
          <input
            class=${INPUT_CLASS}
            .value=${props.filter}
            @input=${(e: Event) => props.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="搜索能力"
          />
        </label>
        <div class=${MUTED_TEXT_CLASS}>已显示 ${filtered.length} 项</div>
      </div>

      ${
        props.error
          ? html`<div class="${calloutClass("danger")} mt-3">${props.error}</div>`
          : nothing
      }

      ${
        filtered.length === 0
          ? html`
              <div class="mt-4 ${MUTED_TEXT_CLASS}">未找到能力。</div>
            `
          : html`
            <div class="mt-4 space-y-3">
              ${groups.map((group) => {
                const collapsedByDefault = group.id === "workspace" || group.id === "built-in";
                return html`
                  <details
                    class="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)]"
                    ?open=${!collapsedByDefault}
                  >
                    <summary class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-[var(--text-strong)]">
                      <span>${group.label}</span>
                      <span class=${MUTED_TEXT_CLASS}>${group.skills.length}</span>
                    </summary>
                    <div class="grid gap-3 border-t border-[var(--border)] p-3">
                      ${group.skills.map((skill) => renderSkill(skill, props))}
                    </div>
                  </details>
                `;
              })}
            </div>
          `
      }
    </section>
  `;
}

function renderSkill(skill: SkillStatusEntry, props: SkillsProps) {
  const busy = props.busyKey === skill.skillKey;
  const apiKey = props.edits[skill.skillKey] ?? "";
  const message = props.messages[skill.skillKey] ?? null;
  const canInstall = skill.install.length > 0 && skill.missing.bins.length > 0;
  const showBundledBadge = Boolean(skill.bundled && skill.source !== "openclaw-bundled");
  const missing = computeSkillMissing(skill);
  const reasons = computeSkillReasons(skill);
  return html`
    <div class="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="text-sm font-semibold text-[var(--text-strong)]">
          ${skill.emoji ? `${skill.emoji} ` : ""}${skill.name}
        </div>
        <div class="text-[13px] leading-relaxed text-[var(--muted)]">
          ${clampText(skill.description, 140)}
        </div>
        ${renderSkillStatusChips({ skill, showBundledBadge })}
        ${
          missing.length > 0
            ? html`
              <div class="pt-1 ${MUTED_TEXT_CLASS}">
                缺失: ${missing.join(", ")}
              </div>
            `
            : nothing
        }
        ${
          reasons.length > 0
            ? html`
              <div class="pt-1 ${MUTED_TEXT_CLASS}">
                原因: ${reasons.join(", ")}
              </div>
            `
            : nothing
        }
      </div>
      <div class="flex w-full flex-col gap-2 md:w-auto md:items-end">
        <div class="flex flex-wrap justify-end gap-2">
          <button
            class=${buttonClass()}
            ?disabled=${busy}
            @click=${() => props.onToggle(skill.skillKey, skill.disabled)}
          >
            ${skill.disabled ? "启用" : "禁用"}
          </button>
          ${
            canInstall
              ? html`<button
                class=${buttonClass()}
                ?disabled=${busy}
                @click=${() => props.onInstall(skill.skillKey, skill.name, skill.install[0].id)}
              >
                ${busy ? "安装中…" : skill.install[0].label}
              </button>`
              : nothing
          }
        </div>
        ${
          message
            ? html`<div
              class="text-[12px] ${
                message.kind === "error" ? "text-[var(--danger)]" : "text-[var(--ok)]"
              }"
            >
              ${message.message}
            </div>`
            : nothing
        }
        ${
          skill.primaryEnv
            ? html`
              <div class="${FIELD_CLASS} mt-1 w-full md:w-[280px]">
                <span class=${FIELD_LABEL_CLASS}>API 密钥</span>
                <input
                  class=${INPUT_CLASS}
                  type="password"
                  .value=${apiKey}
                  @input=${(e: Event) =>
                    props.onEdit(skill.skillKey, (e.target as HTMLInputElement).value)}
                />
              </div>
              <button
                class=${buttonClass({ tone: "primary" })}
                ?disabled=${busy}
                @click=${() => props.onSaveKey(skill.skillKey)}
              >
                保存密钥
              </button>
            `
            : nothing
        }
      </div>
    </div>
  `;
}
