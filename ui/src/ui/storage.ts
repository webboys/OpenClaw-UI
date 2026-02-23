const KEY = "openclaw.control.settings.v1";

import { isSupportedLocale } from "../i18n/index.ts";
import type { ThemeMode } from "./theme.ts";

export type UiSettings = {
  gatewayUrl: string;
  token: string;
  persistToken: boolean;
  sessionKey: string;
  lastActiveSessionKey: string;
  theme: ThemeMode;
  chatFocusMode: boolean;
  chatShowThinking: boolean;
  splitRatio: number; // Sidebar split ratio (0.4 to 0.7, default 0.6)
  navCollapsed: boolean; // Collapsible sidebar state
  navBeginnerMode?: boolean; // Hide advanced tabs until the user opts in
  navGroupsCollapsed: Record<string, boolean>; // Which nav groups are collapsed
  locale?: string;
};

export function loadSettings(): UiSettings {
  const defaultUrl = (() => {
    const preferredHost = "claw.vip996.pro";
    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const host = isLocalhost ? preferredHost : location.host;
    const proto = host === preferredHost || location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${host}`;
  })();

  const defaults: UiSettings = {
    gatewayUrl: defaultUrl,
    token: "",
    persistToken: true,
    sessionKey: "main",
    lastActiveSessionKey: "main",
    theme: "system",
    chatFocusMode: false,
    chatShowThinking: true,
    splitRatio: 0.6,
    navCollapsed: false,
    navBeginnerMode: true,
    navGroupsCollapsed: {},
    locale: "zh-CN",
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    const persistToken =
      typeof parsed.persistToken === "boolean" ? parsed.persistToken : defaults.persistToken;
    return {
      gatewayUrl:
        typeof parsed.gatewayUrl === "string" && parsed.gatewayUrl.trim()
          ? parsed.gatewayUrl.trim()
          : defaults.gatewayUrl,
      token: persistToken && typeof parsed.token === "string" ? parsed.token : defaults.token,
      persistToken,
      sessionKey:
        typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()
          ? parsed.sessionKey.trim()
          : defaults.sessionKey,
      lastActiveSessionKey:
        typeof parsed.lastActiveSessionKey === "string" && parsed.lastActiveSessionKey.trim()
          ? parsed.lastActiveSessionKey.trim()
          : (typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()) ||
            defaults.lastActiveSessionKey,
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
          ? parsed.theme
          : defaults.theme,
      chatFocusMode:
        typeof parsed.chatFocusMode === "boolean" ? parsed.chatFocusMode : defaults.chatFocusMode,
      chatShowThinking:
        typeof parsed.chatShowThinking === "boolean"
          ? parsed.chatShowThinking
          : defaults.chatShowThinking,
      splitRatio:
        typeof parsed.splitRatio === "number" &&
        parsed.splitRatio >= 0.4 &&
        parsed.splitRatio <= 0.7
          ? parsed.splitRatio
          : defaults.splitRatio,
      navCollapsed:
        typeof parsed.navCollapsed === "boolean" ? parsed.navCollapsed : defaults.navCollapsed,
      navBeginnerMode:
        typeof parsed.navBeginnerMode === "boolean"
          ? parsed.navBeginnerMode
          : defaults.navBeginnerMode,
      navGroupsCollapsed:
        typeof parsed.navGroupsCollapsed === "object" && parsed.navGroupsCollapsed !== null
          ? parsed.navGroupsCollapsed
          : defaults.navGroupsCollapsed,
      locale: isSupportedLocale(parsed.locale) ? parsed.locale : defaults.locale,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(next: UiSettings) {
  const stored: UiSettings = {
    ...next,
    // Keep token in-memory for the current tab, but don't persist it when disabled.
    token: next.persistToken ? next.token : "",
  };
  localStorage.setItem(KEY, JSON.stringify(stored));
}
