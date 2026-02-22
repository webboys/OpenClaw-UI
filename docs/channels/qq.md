---
summary: "QQ official bot support status, capabilities, and configuration"
read_when:
  - Working on QQ channel features
  - Setting up QQ with the official bot callback API
title: "QQ"
---

# QQ (plugin)

QQ support in OpenClaw is provided by the `@openclaw/qq` plugin.
It uses the QQ official Bot API callback events and send endpoints.

Status: supported via plugin. Direct messages and groups are supported.

## Plugin required

QQ ships as a plugin and is not bundled with the core install.

Install via CLI (npm registry):

```bash
openclaw plugins install @openclaw/qq
```

Local checkout (when running from a git repo):

```bash
openclaw plugins install ./extensions/qq
```

If you choose QQ during configure or onboarding and a git checkout is detected,
OpenClaw will offer the local install path automatically.

Details: [Plugins](/tools/plugin)

## Setup

1. Install the QQ plugin:
   - From npm: `openclaw plugins install @openclaw/qq`
   - From a local checkout: `openclaw plugins install ./extensions/qq`
2. Create a QQ bot application in the QQ official platform.
3. Copy your app credentials:
   - `appId`
   - `appSecret`
4. Configure callback URL in QQ platform:
   - Callback URL: `https://gateway-host/qq-official-webhook`
   - Event types: include `GROUP_AT_MESSAGE_CREATE` and `C2C_MESSAGE_CREATE`
5. Configure OpenClaw:

```json5
{
  channels: {
    qq: {
      enabled: true,
      apiBaseUrl: "https://api.sgroup.qq.com",
      appId: "your-qq-app-id",
      appSecret: "your-qq-app-secret",
      webhookPath: "/qq-official-webhook",
      dmPolicy: "pairing",
    },
  },
}
```

6. Restart gateway and verify:

```bash
openclaw channels status --probe
openclaw gateway status
```

### Faster first deploy (recommended)

If you run OpenClaw from a git checkout, use the helper script to reduce manual steps.

Create `.env.qq` in repo root:

```bash
QQ_BOT_API_BASE_URL=https://api.sgroup.qq.com
QQ_BOT_APP_ID=your-qq-app-id
QQ_BOT_APP_SECRET=your-qq-app-secret
QQ_OFFICIAL_WEBHOOK_PATH=/qq-official-webhook
QQ_DM_POLICY=pairing
QQ_ALLOW_FROM=
```

Run:

```bash
pnpm qq:setup
```

What it does:

- loads `.env.qq` (and `.env` as fallback)
- probes QQ official token and profile APIs
- writes `channels.qq.*` with `openclaw config set`
- runs `openclaw channels status --probe`

Optional:

- preview only: `pnpm qq:setup -- --dry-run`
- custom env file: `pnpm qq:setup -- --env-file .env.qq.local`
- skip API probe in offline mode: `pnpm qq:setup -- --dry-run --skip-api-probe`

## Environment variables

Default account supports:

- `QQ_BOT_API_BASE_URL`
- `QQ_BOT_APP_ID`
- `QQ_BOT_APP_SECRET`
- `QQ_APP_SECRET` (fallback)

Config values under `channels.qq` take precedence over environment variables.

## Access control (DMs)

- Default: `channels.qq.dmPolicy = "pairing"`.
- Approve pending users:
  - `openclaw pairing list qq`
  - `openclaw pairing approve qq <CODE>`
- Public DMs: set `channels.qq.dmPolicy="open"` and include `"*"` in `channels.qq.allowFrom`.

## Groups

- Default: `channels.qq.groupPolicy = "allowlist"`.
- Allow specific groups in `channels.qq.groups`.
- Per-group controls:
  - `requireMention`
  - `allowFrom`
  - `tools`
  - `systemPrompt`

Example:

```json5
{
  channels: {
    qq: {
      groupPolicy: "allowlist",
      groups: {
        group_openid_123: { requireMention: true },
        "*": { requireMention: true },
      },
      groupAllowFrom: ["user_openid_1", "user_openid_2"],
    },
  },
}
```

## Routing model

- Replies always go back to QQ.
- DMs map to direct sessions.
- Groups map to group sessions.

## Capabilities

| Feature         | Status                                       |
| --------------- | -------------------------------------------- |
| Direct messages | Supported                                    |
| Groups          | Supported                                    |
| Threads         | Not supported                                |
| Media           | Supported (media URLs are delivered as text) |
| Reactions       | Not supported                                |
| Native commands | Not supported                                |

## Troubleshooting

Run this ladder first:

```bash
openclaw status
openclaw gateway status
openclaw channels status --probe
openclaw logs --follow
```

Common failures:

- Webhook receives no events: check QQ callback URL and webhook path.
- Probe fails with auth error: verify `channels.qq.appId` and `channels.qq.appSecret`.
- DMs ignored: sender is pending approval under pairing mode.

For full triage flow: [/channels/troubleshooting](/channels/troubleshooting).

## Configuration reference (QQ)

Full configuration: [Configuration](/gateway/configuration)

Provider options:

- `channels.qq.enabled`: enable or disable QQ startup.
- `channels.qq.apiBaseUrl`: QQ official API base URL.
- `channels.qq.appId`: QQ bot application id.
- `channels.qq.appSecret`: QQ bot application secret.
- `channels.qq.appSecretFile`: app secret file path.
- `channels.qq.webhookPath`: gateway webhook path for QQ callback events.
- `channels.qq.dmPolicy`: `pairing | allowlist | open | disabled`.
- `channels.qq.allowFrom`: DM allowlist (`open` requires `"*"`).
- `channels.qq.groupPolicy`: `allowlist | open | disabled`.
- `channels.qq.groupAllowFrom`: sender allowlist for groups.
- `channels.qq.groups`: group allowlist and per-group settings.
- `channels.qq.textChunkLimit`: outbound text chunk size.
- `channels.qq.chunkMode`: `length | newline`.
- `channels.qq.accounts`: multi-account configuration map.
