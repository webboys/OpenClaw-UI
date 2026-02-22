# 🦞 OpenClaw 个人 AI 助手

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text-dark.png">
    <img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text.png" alt="OpenClaw" width="500">
  </picture>
</p>

<p align="center">
  <strong>EXFOLIATE! EXFOLIATE!</strong>
</p>

<p align="center">
  <a href="https://github.com/openclaw/openclaw/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/openclaw/openclaw/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/openclaw/openclaw/releases"><img src="https://img.shields.io/github/v/release/openclaw/openclaw?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**OpenClaw** 是一个运行在你自己设备上的个人 AI 助手。
它支持在 WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、Microsoft Teams、WebChat 等渠道工作，也支持扩展渠道（如 BlueBubbles、Matrix、Zalo、Zalo Personal）。

你可以把它理解为一个本地优先、可长期在线的 AI 控制平面：
- Gateway 负责连接、路由、会话、工具、事件
- Agent 负责实际推理和执行
- WebUI / CLI / App 负责操作和观测

如果你希望拥有一个单用户、低延迟、可控且私有的助手，OpenClaw 就是这个定位。

## 快速导航

- 官网: https://openclaw.ai
- 文档首页: https://docs.openclaw.ai
- 快速开始: https://docs.openclaw.ai/start/getting-started
- 安装与升级: https://docs.openclaw.ai/install/updating
- Onboarding 向导: https://docs.openclaw.ai/start/wizard
- 渠道总览: https://docs.openclaw.ai/channels
- Web 控制台: https://docs.openclaw.ai/web
- Showcase: https://docs.openclaw.ai/start/showcase
- FAQ: https://docs.openclaw.ai/start/faq
- 项目愿景: https://github.com/openclaw/openclaw/blob/main/VISION.md
- Discord 社区: https://discord.gg/clawd

## 推荐安装

运行时要求: **Node >= 22**

```bash
npm install -g openclaw@latest
# 或
pnpm add -g openclaw@latest

openclaw onboard --install-daemon
```

`onboard` 会引导完成 gateway、workspace、渠道、技能等配置。

## 快速开始

```bash
# 首次引导
openclaw onboard --install-daemon

# 启动 gateway
openclaw gateway --port 18789 --verbose

# 发送消息
openclaw message send --to +1234567890 --message "Hello from OpenClaw"

# 直接给助手下达任务
openclaw agent --message "Ship checklist" --thinking high
```

升级请参考: https://docs.openclaw.ai/install/updating

## WebUI 语言

- 部署后 WebUI 默认显示 **简体中文 (`zh-CN`)**。
- 用户可以在 `Overview -> Language` 中切换语言。
- 当前内置语言: `简体中文`、`繁體中文`、`English`、`Português (Brasil)`。

## 模型与认证

支持 OAuth 和 API Key 模式，常见配置参考：
- 模型配置: https://docs.openclaw.ai/concepts/models
- 故障转移: https://docs.openclaw.ai/concepts/model-failover
- Onboarding: https://docs.openclaw.ai/start/onboarding

常见订阅来源：
- Anthropic (Claude Pro / Max)
- OpenAI (ChatGPT / Codex)

## 发布通道

- `stable`: 正式 tag 版本，npm dist-tag `latest`
- `beta`: 预发布版本，npm dist-tag `beta`
- `dev`: main 分支滚动版本，npm dist-tag `dev`

切换通道：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

更多说明: https://docs.openclaw.ai/install/development-channels

## 从源码开发

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw

pnpm install
pnpm ui:build
pnpm build

# 开发模式
pnpm gateway:watch
```

常用命令：

```bash
pnpm test
pnpm check
pnpm build
```

## 默认安全策略

OpenClaw 会直接连接真实消息渠道，务必把外部输入视为不可信。

默认策略（Telegram / WhatsApp / Signal / iMessage / Microsoft Teams / Discord / Google Chat / Slack）：
- 新发信人默认走配对流程（`dmPolicy="pairing"`）
- 通过配对码审批后才进入 allowlist
- 若要开放公共私信，需显式配置 `dmPolicy="open"` 与 allowlist

安全文档: https://docs.openclaw.ai/gateway/security

## 核心能力

- 网关控制平面: https://docs.openclaw.ai/gateway
- 多渠道接入: https://docs.openclaw.ai/channels
- 多 Agent 路由: https://docs.openclaw.ai/gateway/configuration
- Voice Wake / Talk Mode: https://docs.openclaw.ai/nodes/voicewake
- Canvas / A2UI: https://docs.openclaw.ai/platforms/mac/canvas
- Skills 与工具生态: https://docs.openclaw.ai/tools
- WebChat 与控制台: https://docs.openclaw.ai/web/webchat

## 工作方式（简版）

```text
WhatsApp / Telegram / Slack / Discord / Google Chat / Signal / iMessage / Teams / Matrix / Zalo / WebChat
                                   |
                                Gateway
                           ws://127.0.0.1:18789
                                   |
                     Pi agent / CLI / WebUI / macOS / iOS / Android
```

## 常用会话命令

以下命令可在已接入渠道中使用：

- `/status` 查看会话状态
- `/new` 或 `/reset` 重置会话
- `/compact` 压缩上下文
- `/think <level>` 设置思考等级
- `/verbose on|off` 开关详细输出
- `/usage off|tokens|full` 控制用量显示
- `/restart` 重启网关（受权限控制）

## 远程部署与运维

- Tailscale 远程访问: https://docs.openclaw.ai/gateway/tailscale
- 远程网关: https://docs.openclaw.ai/gateway/remote
- Doctor 诊断: https://docs.openclaw.ai/gateway/doctor
- 日志与故障排查: https://docs.openclaw.ai/channels/troubleshooting

## 文档入口

- 文档目录: https://docs.openclaw.ai/start/docs-directory
- 配置参考: https://docs.openclaw.ai/gateway/configuration
- 自动化（Hook / Cron / Webhook）: https://docs.openclaw.ai/automation/hooks
- 插件与扩展: https://docs.openclaw.ai/tools/plugin

## 社区

- Discord: https://discord.gg/clawd
- GitHub Issues: https://github.com/openclaw/openclaw/issues
- Releases: https://github.com/openclaw/openclaw/releases

## 许可证

MIT
