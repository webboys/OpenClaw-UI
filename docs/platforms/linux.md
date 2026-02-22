---
summary: "Linux support + companion app status"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Linux App"
---

# Linux App

The Gateway is fully supported on Linux. **Node is the recommended runtime**.
Bun is not recommended for the Gateway (WhatsApp/Telegram bugs).

Native Linux companion apps are planned. Contributions are welcome if you want to help build one.

## Beginner quick path (VPS)

1. Install OpenClaw with system Node 22 (see [Install](/install#linux-server-from-zero-non-docker))
2. Install/reinstall the service: `openclaw gateway install --force --runtime node`
3. Verify: `openclaw gateway status --deep` (look for `RPC probe: ok`)
4. From your laptop: `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Run `openclaw dashboard --no-open` and open the printed URL from your laptop

If the UI reports `pairing required`, approve the browser device:

```bash
openclaw devices list
openclaw devices approve --latest
```

Step-by-step VPS guide: [exe.dev](/install/exe-dev)

## Install

- [Getting Started](/start/getting-started)
- [Install & updates](/install/updating)
- Optional flows: [Bun (experimental)](/install/bun), [Nix](/install/nix), [Docker](/install/docker)

<Warning>
Do not mix host service and Docker service on the same host/port. If you choose Docker, stay on the Docker flow and do not run `openclaw gateway install` on the host.
</Warning>

## Gateway

- [Gateway runbook](/gateway)
- [Configuration](/gateway/configuration)

## Gateway service install (CLI)

Use one of these:

```
openclaw onboard --install-daemon
```

Or:

```
openclaw gateway install
```

Or:

```
openclaw configure
```

Select **Gateway service** when prompted.

Repair/migrate:

```
openclaw doctor
```

## System control (systemd user unit)

OpenClaw installs a systemd **user** service by default. Use a **system**
service for shared or always-on servers. The full unit example and guidance
live in the [Gateway runbook](/gateway).

Minimal setup:

Create `~/.config/systemd/user/openclaw-gateway[-<profile>].service`:

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

Enable it:

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
