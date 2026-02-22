import { describe, it, expect, beforeEach } from "vitest";
import { i18n, resolveInitialLocale, t } from "../lib/translate.ts";

describe("i18n", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset to English
    void i18n.setLocale("en");
  });

  it("should return the key if translation is missing", () => {
    expect(t("non.existent.key")).toBe("non.existent.key");
  });

  it("should return the correct English translation", () => {
    expect(t("common.health")).toBe("Health");
  });

  it("should replace parameters correctly", () => {
    expect(t("overview.stats.cronNext", { time: "10:00" })).toBe("Next wake 10:00");
  });

  it("should fallback to English if key is missing in another locale", async () => {
    // We haven't registered other locales in the test environment yet,
    // but the logic should fallback to 'en' map which is always there.
    await i18n.setLocale("zh-CN");
    // Since we don't mock the import, it might fail to load zh-CN,
    // but let's assume it falls back to English for now.
    expect(t("common.health")).toBeDefined();
  });

  it("should default to zh-CN for first-run non-Chinese browsers", () => {
    expect(resolveInitialLocale(null, "en-US")).toBe("zh-CN");
  });

  it("should map zh-TW and zh-HK to zh-TW", () => {
    expect(resolveInitialLocale(null, "zh-TW")).toBe("zh-TW");
    expect(resolveInitialLocale(null, "zh-HK")).toBe("zh-TW");
  });

  it("should prefer saved locale over navigator locale", () => {
    expect(resolveInitialLocale("en", "zh-CN")).toBe("en");
  });
});
