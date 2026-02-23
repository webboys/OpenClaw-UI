import { canonicalizeQueryKey, extractQueryTerms } from "../usage-helpers.ts";
import { CostDailyEntry, UsageAggregates, UsageSessionEntry } from "./usageTypes.ts";

function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsvRow(values: Array<string | number | undefined | null>): string {
  return values
    .map((value) => {
      if (value === undefined || value === null) {
        return "";
      }
      return csvEscape(String(value));
    })
    .join(",");
}

const buildSessionsCsv = (sessions: UsageSessionEntry[]): string => {
  const rows = [
    toCsvRow([
      "key",
      "label",
      "agentId",
      "channel",
      "provider",
      "model",
      "updatedAt",
      "durationMs",
      "messages",
      "errors",
      "toolCalls",
      "inputTokens",
      "outputTokens",
      "cacheReadTokens",
      "cacheWriteTokens",
      "totalTokens",
      "totalCost",
    ]),
  ];

  for (const session of sessions) {
    const usage = session.usage;
    rows.push(
      toCsvRow([
        session.key,
        session.label ?? "",
        session.agentId ?? "",
        session.channel ?? "",
        session.modelProvider ?? session.providerOverride ?? "",
        session.model ?? session.modelOverride ?? "",
        session.updatedAt ? new Date(session.updatedAt).toISOString() : "",
        usage?.durationMs ?? "",
        usage?.messageCounts?.total ?? "",
        usage?.messageCounts?.errors ?? "",
        usage?.messageCounts?.toolCalls ?? "",
        usage?.input ?? "",
        usage?.output ?? "",
        usage?.cacheRead ?? "",
        usage?.cacheWrite ?? "",
        usage?.totalTokens ?? "",
        usage?.totalCost ?? "",
      ]),
    );
  }

  return rows.join("\n");
};

const buildDailyCsv = (daily: CostDailyEntry[]): string => {
  const rows = [
    toCsvRow([
      "date",
      "inputTokens",
      "outputTokens",
      "cacheReadTokens",
      "cacheWriteTokens",
      "totalTokens",
      "inputCost",
      "outputCost",
      "cacheReadCost",
      "cacheWriteCost",
      "totalCost",
    ]),
  ];

  for (const day of daily) {
    rows.push(
      toCsvRow([
        day.date,
        day.input,
        day.output,
        day.cacheRead,
        day.cacheWrite,
        day.totalTokens,
        day.inputCost ?? "",
        day.outputCost ?? "",
        day.cacheReadCost ?? "",
        day.cacheWriteCost ?? "",
        day.totalCost,
      ]),
    );
  }

  return rows.join("\n");
};

type QuerySuggestion = {
  label: string;
  value: string;
};

const QUERY_KEY_LABELS: Record<string, string> = {
  agent: "智能体",
  channel: "频道",
  provider: "服务商",
  model: "模型",
  tool: "工具",
  has: "条件",
  minTokens: "最小令牌",
  maxTokens: "最大令牌",
  minCost: "最小成本",
  maxCost: "最大成本",
  minMessages: "最小消息数",
  maxMessages: "最大消息数",
};

const QUERY_KEY_TOKENS: Record<string, string> = {
  agent: "智能体",
  channel: "频道",
  provider: "服务商",
  model: "模型",
  tool: "工具",
  has: "条件",
  minTokens: "最小令牌",
  maxTokens: "最大令牌",
  minCost: "最小成本",
  maxCost: "最大成本",
  minMessages: "最小消息数",
  maxMessages: "最大消息数",
};

const HAS_VALUE_LABELS: Record<string, string> = {
  errors: "错误",
  tools: "工具",
  context: "上下文",
  usage: "用量",
  model: "模型",
  provider: "服务商",
};

const queryTokenKey = (key: string): string => QUERY_KEY_TOKENS[key] ?? key;

const buildQuerySuggestions = (
  query: string,
  sessions: UsageSessionEntry[],
  aggregates?: UsageAggregates | null,
): QuerySuggestion[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const tokens = trimmed.length ? trimmed.split(/\s+/) : [];
  const lastToken = tokens.length ? tokens[tokens.length - 1] : "";
  const [rawKey, rawValue] = lastToken.includes(":")
    ? [lastToken.slice(0, lastToken.indexOf(":")), lastToken.slice(lastToken.indexOf(":") + 1)]
    : ["", ""];

  const key = canonicalizeQueryKey(rawKey);
  const value = rawValue.toLowerCase();

  const unique = (items: Array<string | undefined>): string[] => {
    const set = new Set<string>();
    for (const item of items) {
      if (item) {
        set.add(item);
      }
    }
    return Array.from(set);
  };

  const agents = unique(sessions.map((s) => s.agentId)).slice(0, 6);
  const channels = unique(sessions.map((s) => s.channel)).slice(0, 6);
  const providers = unique([
    ...sessions.map((s) => s.modelProvider),
    ...sessions.map((s) => s.providerOverride),
    ...(aggregates?.byProvider.map((p) => p.provider) ?? []),
  ]).slice(0, 6);
  const models = unique([
    ...sessions.map((s) => s.model),
    ...(aggregates?.byModel.map((m) => m.model) ?? []),
  ]).slice(0, 6);
  const tools = unique(aggregates?.tools.tools.map((t) => t.name) ?? []).slice(0, 6);

  if (!key) {
    return [
      { label: QUERY_KEY_LABELS.agent, value: `${queryTokenKey("agent")}:` },
      { label: QUERY_KEY_LABELS.channel, value: `${queryTokenKey("channel")}:` },
      { label: QUERY_KEY_LABELS.provider, value: `${queryTokenKey("provider")}:` },
      { label: QUERY_KEY_LABELS.model, value: `${queryTokenKey("model")}:` },
      { label: QUERY_KEY_LABELS.tool, value: `${queryTokenKey("tool")}:` },
      { label: `${QUERY_KEY_LABELS.has}：${HAS_VALUE_LABELS.errors}`, value: "条件:错误" },
      { label: `${QUERY_KEY_LABELS.has}：${HAS_VALUE_LABELS.tools}`, value: "条件:工具" },
      { label: QUERY_KEY_LABELS.minTokens, value: `${queryTokenKey("minTokens")}:` },
      { label: QUERY_KEY_LABELS.maxCost, value: `${queryTokenKey("maxCost")}:` },
    ];
  }

  const suggestions: QuerySuggestion[] = [];
  const addValues = (prefix: string, values: string[]) => {
    const zhKey = QUERY_KEY_LABELS[prefix] ?? prefix;
    const tokenKey = queryTokenKey(prefix);
    for (const val of values) {
      if (!value || val.toLowerCase().includes(value)) {
        suggestions.push({ label: `${zhKey}：${val}`, value: `${tokenKey}:${val}` });
      }
    }
  };

  switch (key) {
    case "agent":
      addValues("agent", agents);
      break;
    case "channel":
      addValues("channel", channels);
      break;
    case "provider":
      addValues("provider", providers);
      break;
    case "model":
      addValues("model", models);
      break;
    case "tool":
      addValues("tool", tools);
      break;
    case "has":
      ["errors", "tools", "context", "usage", "model", "provider"].forEach((entry) => {
        const label = HAS_VALUE_LABELS[entry] ?? entry;
        if (!value || entry.includes(value) || label.includes(value)) {
          suggestions.push({
            label: `条件：${label}`,
            value: `条件:${label}`,
          });
        }
      });
      break;
    default:
      break;
  }

  return suggestions;
};

const applySuggestionToQuery = (query: string, suggestion: string): string => {
  const trimmed = query.trim();
  if (!trimmed) {
    return `${suggestion} `;
  }
  const tokens = trimmed.split(/\s+/);
  tokens[tokens.length - 1] = suggestion;
  return `${tokens.join(" ")} `;
};

const normalizeQueryText = (value: string): string => value.trim().toLowerCase();

const addQueryToken = (query: string, token: string): string => {
  const trimmed = query.trim();
  if (!trimmed) {
    return `${token} `;
  }
  const tokens = trimmed.split(/\s+/);
  const last = tokens[tokens.length - 1] ?? "";
  const tokenKey = token.includes(":") ? token.split(":")[0] : null;
  const lastKey = last.includes(":") ? last.split(":")[0] : null;
  if (last.endsWith(":") && tokenKey && lastKey === tokenKey) {
    tokens[tokens.length - 1] = token;
    return `${tokens.join(" ")} `;
  }
  if (tokens.includes(token)) {
    return `${tokens.join(" ")} `;
  }
  return `${tokens.join(" ")} ${token} `;
};

const removeQueryToken = (query: string, token: string): string => {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const next = tokens.filter((entry) => entry !== token);
  return next.length ? `${next.join(" ")} ` : "";
};

const setQueryTokensForKey = (query: string, key: string, values: string[]): string => {
  const normalizedKey = canonicalizeQueryKey(key);
  const tokens = extractQueryTerms(query)
    .filter((term) => canonicalizeQueryKey(term.key) !== normalizedKey)
    .map((term) => term.raw);
  const next = [...tokens, ...values.map((value) => `${key}:${value}`)];
  return next.length ? `${next.join(" ")} ` : "";
};

export type { QuerySuggestion };
export {
  addQueryToken,
  applySuggestionToQuery,
  buildDailyCsv,
  buildQuerySuggestions,
  buildSessionsCsv,
  downloadTextFile,
  normalizeQueryText,
  removeQueryToken,
  setQueryTokensForKey,
};
