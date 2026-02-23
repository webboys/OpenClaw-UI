const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /^invalid gateway url\. use ws:\/\/ or wss:\/\/, or paste the dashboard http\(s\) url\.$/i,
    "网关地址无效。请使用 ws:// 或 wss://，或粘贴控制台 http(s) 地址。",
  ],
  [
    /^event gap detected \(expected seq (\d+), got (\d+)\); refresh recommended$/i,
    "检测到事件序号跳跃（期望 $1，收到 $2），建议刷新。",
  ],
  [/^gateway not connected$/i, "网关未连接。"],
  [/^gateway client stopped$/i, "网关客户端已停止。"],
  [/^connect failed$/i, "连接失败。"],
  [/^ok$/i, "正常"],
  [/^success$/i, "成功"],
  [/^failed$/i, "失败"],
  [/^running$/i, "运行中"],
  [/^stopped$/i, "已停止"],
  [/^connected$/i, "已连接"],
  [/^disconnected$/i, "已断开"],
  [/^configured$/i, "已配置"],
  [/^not configured$/i, "未配置"],
  [/^unknown$/i, "未知"],
  [/^default$/i, "默认"],
  [/^none$/i, "无"],
  [/^last$/i, "最近会话"],
  [/^allowlist$/i, "白名单"],
  [/^deny$/i, "拒绝"],
  [/^full$/i, "完全放行"],
  [/^on-miss$/i, "未命中时询问"],
  [/^always$/i, "始终询问"],
  [/^off$/i, "关闭"],
  [/^request failed$/i, "请求失败。"],
  [/^config hash missing; reload and retry\.$/i, "配置哈希缺失，请刷新后重试。"],
  [/^exec approvals hash missing; reload and retry\.$/i, "执行审批哈希缺失，请刷新后重试。"],
  [/^select a node before loading exec approvals\.$/i, "请先选择节点，再加载执行审批。"],
  [/^select a node before saving exec approvals\.$/i, "请先选择节点，再保存执行审批。"],
  [/^chat error$/i, "聊天请求失败。"],
  [/^logged out\.?$/i, "已登出。"],
  [/^invalid run time\.?$/i, "执行时间无效。"],
  [/^invalid interval amount\.?$/i, "间隔数值无效。"],
  [/^cron expression required\.?$/i, "定时表达式不能为空。"],
  [/^system event text required\.?$/i, "系统事件文本不能为空。"],
  [/^agent message required\.?$/i, "智能体消息不能为空。"],
  [/^name required\.?$/i, "名称不能为空。"],
  [/^no instances yet\.?$/i, "暂无实例。"],
  [/^no presence payload\.?$/i, "未收到在线状态数据。"],
  [/^skill enabled$/i, "能力已启用。"],
  [/^skill disabled$/i, "能力已禁用。"],
  [/^api key saved$/i, "接口密钥已保存。"],
  [/^installed$/i, "已安装。"],
];

const INLINE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bno reason\b/gi, "无原因"],
  [/\bgateway\b/gi, "网关"],
  [/\bsession\b/gi, "会话"],
  [/\bcron\b/gi, "定时任务"],
  [/\bchannel\b/gi, "频道"],
  [/\bchannels\b/gi, "频道"],
  [/\bnode\b/gi, "节点"],
  [/\bnodes\b/gi, "节点"],
  [/\bconnected\b/gi, "已连接"],
  [/\bdisconnected\b/gi, "已断开"],
  [/\bconfigured\b/gi, "已配置"],
  [/\brunning\b/gi, "运行中"],
  [/\bstopped\b/gi, "已停止"],
  [/\bfailed\b/gi, "失败"],
  [/\berror\b/gi, "错误"],
  [/\bread\b/gi, "读取"],
  [/\bwrite\b/gi, "写入"],
  [/\bedit\b/gi, "编辑"],
  [/\bsearch\b/gi, "搜索"],
  [/\bfetch\b/gi, "抓取"],
  [/\bstart\b/gi, "启动"],
  [/\bstop\b/gi, "停止"],
  [/\bstatus\b/gi, "状态"],
  [/\blist\b/gi, "列表"],
  [/\badd\b/gi, "添加"],
  [/\bremove\b/gi, "删除"],
  [/\bupdate\b/gi, "更新"],
  [/\brun\b/gi, "运行"],
  [/\bopen\b/gi, "打开"],
  [/\bclose\b/gi, "关闭"],
  [/\bnavigate\b/gi, "导航"],
];

export function localizeUiText(input: string): string {
  let text = input.trim();
  if (!text) {
    return "";
  }

  // Normalize common Error wrappers so mapping hits cleanly.
  text = text.replace(/^error:\s*/i, "").trim();

  const disconnected = /^disconnected \((\d+)\):\s*(.*)$/i.exec(text);
  if (disconnected) {
    const [, code, reasonRaw] = disconnected;
    const reason = localizeUiText(reasonRaw || "无原因");
    return reason ? `连接已断开（${code}）：${reason}` : `连接已断开（${code}）`;
  }

  const gatewayClosed = /^gateway closed \((\d+)\):\s*(.*)$/i.exec(text);
  if (gatewayClosed) {
    const [, code, reasonRaw] = gatewayClosed;
    const reason = localizeUiText(reasonRaw || "无原因");
    return reason ? `网关连接已关闭（${code}）：${reason}` : `网关连接已关闭（${code}）`;
  }

  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement).trim();
    }
  }

  for (const [pattern, replacement] of INLINE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function localizeUiError(error: unknown): string {
  if (error instanceof Error) {
    return localizeUiText(error.message || String(error));
  }
  return localizeUiText(String(error));
}
