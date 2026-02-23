const EXACT_TEXT_MAP: Record<string, string> = {
  "all settings": "全部设置",
  "environment variables": "环境变量",
  update: "更新",
  updates: "更新",
  agents: "助手",
  agent: "助手",
  authentication: "鉴权",
  auth: "鉴权",
  channels: "机器人",
  channel: "机器人",
  messages: "消息",
  message: "消息",
  commands: "命令",
  command: "命令",
  hooks: "钩子",
  hook: "钩子",
  skills: "能力",
  skill: "能力",
  tools: "工具",
  tool: "工具",
  gateway: "网关",
  "setup wizard": "初始化向导",
  wizard: "初始化向导",
  metadata: "元数据",
  meta: "元数据",
  diagnostics: "诊断",
  logging: "日志",
  browser: "浏览器",
  ui: "界面",
  models: "模型",
  bindings: "绑定",
  broadcast: "广播",
  audio: "音频",
  session: "会话",
  cron: "定时任务",
  web: "网页服务",
  discovery: "发现",
  "canvas host": "画布宿主",
  talk: "语音",
  plugins: "插件",
  "messaging channels": "机器人",
  "node host": "节点主机",
  presence: "在线状态",
  "voice wake": "语音唤醒",
  "gateway token": "网关令牌",
  "gateway password": "网关密码",
  "assistant name": "助手名称",
  "assistant avatar": "助手头像",
  "plugin enabled": "插件启用",
};

const ENUM_VALUE_MAP: Record<string, string> = {
  on: "开启",
  off: "关闭",
  true: "是",
  false: "否",
  auto: "自动",
  manual: "手动",
  default: "默认",
  local: "本地",
  remote: "远程",
  stable: "稳定版",
  beta: "测试版",
  dev: "开发版",
  token: "令牌",
  password: "密码",
  none: "无",
  minimal: "最小",
  full: "完整",
  hybrid: "混合",
  loopback: "回环",
  lan: "局域网",
  tailnet: "Tailnet",
  tree: "树状",
  self: "仅当前会话",
  agent: "当前助手",
  all: "全部",
  thread: "线程",
  channel: "频道",
  system: "系统",
  user: "用户",
  workspace: "工作区",
};

const PATH_SEGMENT_MAP: Record<string, string> = {
  all: "全部",
  config: "配置",
  update: "更新",
  channel: "通道",
  check: "检查",
  start: "启动",
  diagnostics: "诊断",
  enabled: "启用",
  api: "接口",
  url: "地址",
  uri: "地址",
  id: "标识",
  flags: "标志",
  endpoint: "端点",
  protocol: "协议",
  headers: "请求头",
  service: "服务",
  name: "名称",
  traces: "追踪",
  metrics: "指标",
  logs: "日志",
  sample: "采样",
  rate: "率",
  flush: "刷新",
  interval: "间隔",
  cache: "缓存",
  trace: "追踪",
  file: "文件",
  path: "路径",
  include: "包含",
  messages: "消息",
  prompt: "提示词",
  system: "系统",
  identity: "身份",
  avatar: "头像",
  agent: "助手",
  agents: "助手",
  skills: "能力",
  skill: "能力",
  filter: "筛选",
  remote: "远程",
  gateway: "网关",
  auth: "鉴权",
  token: "令牌",
  password: "密码",
  tls: "TLS",
  fingerprint: "指纹",
  enable: "启用",
  image: "图像",
  audio: "音频",
  video: "视频",
  understanding: "理解",
  max: "最大",
  bytes: "字节",
  chars: "字符",
  timeout: "超时",
  attachment: "附件",
  policy: "策略",
  models: "模型",
  model: "模型",
  scope: "范围",
  media: "媒体",
  shared: "共享",
  concurrency: "并发",
  link: "链接",
  profile: "配置档",
  allowlist: "允许列表",
  additions: "附加项",
  provider: "提供商",
  providers: "提供商",
  workspace: "工作区",
  only: "仅",
  history: "历史",
  warning: "告警",
  critical: "严重",
  global: "全局",
  circuit: "熔断",
  breaker: "保护",
  detection: "检测",
  repeat: "重复",
  visibility: "可见性",
  notify: "通知",
  exit: "退出",
  running: "运行中",
  notice: "提示",
  host: "主机",
  security: "安全",
  node: "节点",
  binding: "绑定",
  safe: "安全",
  cross: "跨",
  context: "上下文",
  marker: "标记",
  prefix: "前缀",
  suffix: "后缀",
  broadcast: "广播",
  web: "网页",
  search: "搜索",
  fetch: "抓取",
  results: "结果",
  redirects: "重定向",
  control: "控制",
  ui: "界面",
  base: "基础",
  root: "根目录",
  allowed: "允许",
  origins: "来源",
  insecure: "不安全",
  disable: "禁用",
  chat: "聊天",
  completions: "补全",
  reload: "重载",
  mode: "模式",
  debounce: "防抖",
  browser: "浏览器",
  pin: "固定",
  commands: "命令",
  denylist: "拒绝列表",
  proxy: "代理",
  watch: "监听",
  repo: "仓库",
  bootstrap: "启动引导",
  timezone: "时区",
  timestamp: "时间戳",
  elapsed: "耗时",
  memory: "记忆",
  sources: "来源",
  extra: "额外",
  experimental: "实验性",
  session: "会话",
  index: "索引",
  local: "本地",
  embedding: "向量嵌入",
  store: "存储",
  chunk: "分块",
  tokens: "令牌数",
  overlap: "重叠",
  sync: "同步",
  query: "查询",
  score: "分数",
  hybrid: "混合",
  vector: "向量",
  weight: "权重",
  text: "文本",
  candidate: "候选",
  multiplier: "倍数",
  backend: "后端",
  citations: "引用",
  command: "命令",
  dm: "私聊",
  slack: "Slack",
  discord: "Discord",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  plugins: "插件",
  plugin: "插件",
  metadata: "元数据",
  wizard: "初始化向导",
  logging: "日志",
  tools: "工具",
  default: "默认",
  auto: "自动",
  allow: "允许",
  deny: "拒绝",
  list: "列表",
  level: "级别",
  type: "类型",
  target: "目标",
  port: "端口",
  user: "用户",
  role: "角色",
  payload: "负载",
  delivery: "投递",
  webhook: "回调",
  cron: "定时任务",
  reasoning: "推理",
  thinking: "思考",
  verbose: "详细",
  defaults: "默认值",
  entries: "条目",
  status: "状态",
  health: "健康",
  heartbeat: "心跳",
  retries: "重试",
  retry: "重试",
  intervalms: "间隔毫秒",
  timeoutms: "超时毫秒",
  filepath: "文件路径",
  filename: "文件名",
  workdir: "工作目录",
  cwd: "工作目录",
  origin: "来源",
  request: "请求",
  response: "响应",
  body: "正文",
  method: "方法",
  headersize: "请求头大小",
  maxsize: "最大大小",
  duration: "时长",
  sessionkey: "会话键",
  agentid: "助手标识",
};

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bOpenAI-compatible\b/gi, "兼容接口"],
  [/\bControl UI\b/gi, "控制台界面"],
  [/\bWebSocket\b/gi, "WebSocket"],
  [/\bdefault:\s*/gi, "默认："],
  [/\bdefault value\b/gi, "默认值"],
  [/\bglobal default\b/gi, "全局默认"],
  [/\bagent override\b/gi, "助手覆盖"],
  [/\bopenclaw\b/gi, "OpenClaw"],
  [/\boptional\b/gi, "可选"],
  [/\brequired\b/gi, "必填"],
  [/\bwhen true\b/gi, "当为开启时"],
  [/\bwhen false\b/gi, "当为关闭时"],
  [/\bset to\b/gi, "设置为"],
  [/\bused for\b/gi, "用于"],
  [/\benable\b/gi, "启用"],
  [/\bdisable\b/gi, "禁用"],
];

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bAPI\b/gi, "接口"],
  [/\bURL\b/gi, "地址"],
  [/\bURI\b/gi, "地址"],
  [/\bID\b/gi, "标识"],
  [/\bCLI\b/gi, "命令行"],
  [/\bUI\b/gi, "界面"],
  [/\bWebhook\b/gi, "回调"],
  [/\bGateway\b/gi, "网关"],
  [/\bAssistant\b/gi, "助手"],
  [/\bAuth\b/gi, "鉴权"],
  [/\bToken\b/gi, "令牌"],
  [/\bPassword\b/gi, "密码"],
  [/\bChannel\b/gi, "通道"],
  [/\bChannels\b/gi, "通道"],
  [/\bMessage\b/gi, "消息"],
  [/\bMessages\b/gi, "消息"],
  [/\bCommand\b/gi, "命令"],
  [/\bCommands\b/gi, "命令"],
  [/\bHook\b/gi, "钩子"],
  [/\bHooks\b/gi, "钩子"],
  [/\bSkill\b/gi, "能力"],
  [/\bSkills\b/gi, "能力"],
  [/\bTool\b/gi, "工具"],
  [/\bTools\b/gi, "工具"],
  [/\bModel\b/gi, "模型"],
  [/\bModels\b/gi, "模型"],
  [/\bConfig\b/gi, "配置"],
  [/\bEnable\b/gi, "启用"],
  [/\bEnabled\b/gi, "已启用"],
  [/\bDisable\b/gi, "禁用"],
  [/\bPath\b/gi, "路径"],
  [/\bPaths\b/gi, "路径"],
  [/\bFile\b/gi, "文件"],
  [/\bFiles\b/gi, "文件"],
  [/\bMode\b/gi, "模式"],
  [/\bTimeout\b/gi, "超时"],
  [/\bCache\b/gi, "缓存"],
  [/\bPolicy\b/gi, "策略"],
  [/\bProvider\b/gi, "提供商"],
  [/\bProviders\b/gi, "提供商"],
  [/\bUpdate\b/gi, "更新"],
  [/\bVersion\b/gi, "版本"],
  [/\bMetadata\b/gi, "元数据"],
  [/\bDiagnostics\b/gi, "诊断"],
  [/\bLogging\b/gi, "日志"],
  [/\bBrowser\b/gi, "浏览器"],
  [/\bSession\b/gi, "会话"],
  [/\bSessions\b/gi, "会话"],
  [/\bSearch\b/gi, "搜索"],
  [/\bFetch\b/gi, "抓取"],
  [/\bNode\b/gi, "节点"],
  [/\bLocal\b/gi, "本地"],
  [/\bRemote\b/gi, "远程"],
  [/\bSystem\b/gi, "系统"],
  [/\bName\b/gi, "名称"],
  [/\bAvatar\b/gi, "头像"],
  [/\bDefault\b/gi, "默认"],
  [/\bGlobal\b/gi, "全局"],
  [/\bAuto\b/gi, "自动"],
  [/\bAllow\b/gi, "允许"],
  [/\bAllowed\b/gi, "允许"],
  [/\bDeny\b/gi, "拒绝"],
  [/\bList\b/gi, "列表"],
  [/\bLevel\b/gi, "级别"],
  [/\bType\b/gi, "类型"],
  [/\bTarget\b/gi, "目标"],
  [/\bPort\b/gi, "端口"],
  [/\bRole\b/gi, "角色"],
  [/\bScope\b/gi, "范围"],
  [/\bPayload\b/gi, "负载"],
  [/\bDelivery\b/gi, "投递"],
  [/\bReasoning\b/gi, "推理"],
  [/\bThinking\b/gi, "思考"],
  [/\bVerbose\b/gi, "详细"],
  [/\bStatus\b/gi, "状态"],
  [/\bHealth\b/gi, "健康"],
  [/\bHeartbeat\b/gi, "心跳"],
  [/\bRetry\b/gi, "重试"],
  [/\bRetries\b/gi, "重试"],
  [/\bInterval\b/gi, "间隔"],
  [/\bDuration\b/gi, "时长"],
];

function normalizeTextKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`"'“”]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function containsLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

const PRESERVE_ENGLISH_TERMS = new Set([
  "uuid",
  "http",
  "https",
  "ws",
  "wss",
  "json",
  "json5",
  "yaml",
  "toml",
  "rpc",
  "utc",
  "tcp",
  "udp",
  "ip",
  "oauth",
  "tls",
  "ssl",
  "websocket",
  "openai",
  "openclaw",
  "gpt",
  "tailnet",
  "tailscale",
  "discord",
  "telegram",
  "slack",
  "signal",
  "whatsapp",
  "imessage",
  "nostr",
  "nip",
  "lud",
  "a2ui",
  "webhook",
]);

function stripUntranslatedEnglish(text: string): string {
  const stripped = text.replace(/\b[A-Za-z][A-Za-z0-9-]*\b/g, (token) => {
    const normalized = token.toLowerCase();
    if (PRESERVE_ENGLISH_TERMS.has(normalized)) {
      return token;
    }
    return "";
  });
  return stripped
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/^[\s\-:;,./]+|[\s\-:;,./]+$/g, "")
    .trim();
}

function translateByPathSegments(value: string): string | null {
  const normalizedInput = value.trim();
  if (!normalizedInput) {
    return null;
  }
  const withSpacing = normalizedInput
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  const pieces = withSpacing
    .split(/[.\s/:[\](),]+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (pieces.length === 0) {
    return null;
  }
  let changed = false;
  const translated = pieces.map((piece) => {
    const mapped = PATH_SEGMENT_MAP[piece.toLowerCase()];
    if (mapped) {
      changed = true;
      return mapped;
    }
    return piece;
  });
  return changed ? translated.join(" ") : null;
}

function localizeWithoutCodeSpans(value: string): string {
  let localized = value;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }
  return localized
    .replace(/\s+([,.;:)\]])/g, "$1")
    .replace(/([([])\s+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function localizeConfigText(text: string | undefined, fallbackKey?: string): string {
  if (!text) {
    return "";
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  if (containsChinese(trimmed)) {
    return trimmed;
  }

  const exact = EXACT_TEXT_MAP[normalizeTextKey(trimmed)];
  if (exact) {
    return exact;
  }

  const segments = trimmed.split(/(`[^`]*`)/g);
  const localized = segments
    .map((segment) =>
      segment.startsWith("`") && segment.endsWith("`") ? segment : localizeWithoutCodeSpans(segment),
    )
    .join("");
  if (containsChinese(localized) && !containsLatin(localized)) {
    return localized;
  }

  const byPath =
    translateByPathSegments(trimmed) ??
    (fallbackKey ? translateByPathSegments(fallbackKey) : null);
  if (byPath) {
    if (containsLatin(byPath) && containsChinese(byPath)) {
      const stripped = stripUntranslatedEnglish(byPath);
      return stripped || "配置项";
    }
    return byPath;
  }

  if (containsChinese(localized) && containsLatin(localized)) {
    const stripped = stripUntranslatedEnglish(localized);
    if (stripped) {
      return stripped;
    }
  }

  if (containsLatin(localized)) {
    const stripped = stripUntranslatedEnglish(localized);
    if (stripped) {
      return stripped;
    }
    if (fallbackKey) {
      const fallback = translateByPathSegments(fallbackKey);
      if (fallback) {
        return fallback;
      }
    }
    return "配置项";
  }
  return localized || trimmed;
}

export function localizeConfigHelp(text: string | undefined, fallbackKey?: string): string {
  if (!text) {
    return "";
  }
  const localized = localizeConfigText(text, fallbackKey);
  if (containsChinese(localized) && !containsLatin(localized)) {
    return localized;
  }
  // Hide untouched English descriptions to keep the UI fully localized.
  if (containsLatin(localized)) {
    return "";
  }
  return localized;
}

export function localizeConfigEnumValue(value: unknown): string {
  const raw = String(value ?? "");
  const normalized = normalizeTextKey(raw);
  if (!normalized) {
    return raw;
  }
  const exact = ENUM_VALUE_MAP[normalized];
  if (exact) {
    return exact;
  }
  return localizeConfigText(raw) || raw;
}

export function localizeConfigPathLabel(path: string): string {
  return localizeConfigText(path, path);
}
