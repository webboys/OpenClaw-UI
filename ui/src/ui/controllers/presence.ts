import type { GatewayBrowserClient } from "../gateway.ts";
import { localizeUiError, localizeUiText } from "../error-localization.ts";
import type { PresenceEntry } from "../types.ts";

export type PresenceState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  presenceLoading: boolean;
  presenceEntries: PresenceEntry[];
  presenceError: string | null;
  presenceStatus: string | null;
};

export async function loadPresence(state: PresenceState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.presenceLoading) {
    return;
  }
  state.presenceLoading = true;
  state.presenceError = null;
  state.presenceStatus = null;
  try {
    const res = await state.client.request("system-presence", {});
    if (Array.isArray(res)) {
      state.presenceEntries = res;
      state.presenceStatus = res.length === 0 ? localizeUiText("暂无实例。") : null;
    } else {
      state.presenceEntries = [];
      state.presenceStatus = localizeUiText("未收到在线状态数据。");
    }
  } catch (err) {
    state.presenceError = localizeUiError(err);
  } finally {
    state.presenceLoading = false;
  }
}
