import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { qqDock, qqPlugin } from "./src/channel.js";
import { handleQqWebhookRequest } from "./src/monitor.js";
import { setQqRuntime } from "./src/runtime.js";

const plugin = {
  id: "qq",
  name: "QQ",
  description: "QQ channel plugin (Official Bot API)",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setQqRuntime(api.runtime);
    api.registerChannel({ plugin: qqPlugin, dock: qqDock });
    api.registerHttpHandler(handleQqWebhookRequest);
  },
};

export default plugin;
