import { en } from "../locales/en.ts";
import type { Locale, TranslationMap } from "./types.ts";

type Subscriber = (locale: Locale) => void;

export const SUPPORTED_LOCALES: ReadonlyArray<Locale> = ["en", "zh-CN", "zh-TW", "pt-BR"];

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && SUPPORTED_LOCALES.includes(value as Locale);
}

export function resolveInitialLocale(
  savedLocale: string | null | undefined,
  navigatorLanguage: string | null | undefined,
): Locale {
  if (isSupportedLocale(savedLocale)) {
    return savedLocale;
  }

  const normalized = String(navigatorLanguage ?? "").toLowerCase();
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk") || normalized.startsWith("zh-mo")) {
    return "zh-TW";
  }
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  // Product default for first-run UI language.
  return "zh-CN";
}

class I18nManager {
  private locale: Locale = "zh-CN";
  private translations: Record<Locale, TranslationMap> = { en } as Record<Locale, TranslationMap>;
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.loadLocale();
    void this.ensureLocaleLoaded(this.locale).then((loaded) => {
      if (!loaded) {
        return;
      }
      this.notify();
    });
  }

  private loadLocale() {
    const saved = localStorage.getItem("openclaw.i18n.locale");
    this.locale = resolveInitialLocale(saved, navigator.language);
    this.applyDocumentLocale(this.locale);
  }

  private applyDocumentLocale(locale: Locale) {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = locale;
  }

  public getLocale(): Locale {
    return this.locale;
  }

  private async ensureLocaleLoaded(locale: Locale): Promise<boolean> {
    if (this.translations[locale]) {
      return true;
    }

    try {
      let module: Record<string, TranslationMap>;
      if (locale === "zh-CN") {
        module = await import("../locales/zh-CN.ts");
      } else if (locale === "zh-TW") {
        module = await import("../locales/zh-TW.ts");
      } else if (locale === "pt-BR") {
        module = await import("../locales/pt-BR.ts");
      } else {
        return false;
      }
      const map = module[locale.replace("-", "_")];
      if (!map) {
        return false;
      }
      this.translations[locale] = map;
      return true;
    } catch (e) {
      console.error(`Failed to load locale: ${locale}`, e);
      return false;
    }
  }

  public async setLocale(locale: Locale) {
    const localeChanged = this.locale !== locale;
    const hadLocaleMap = Boolean(this.translations[locale]);
    if (!(await this.ensureLocaleLoaded(locale))) {
      return;
    }

    this.applyDocumentLocale(locale);
    if (!localeChanged) {
      if (!hadLocaleMap) {
        this.notify();
      }
      return;
    }

    this.locale = locale;
    localStorage.setItem("openclaw.i18n.locale", locale);
    this.notify();
  }

  public registerTranslation(locale: Locale, map: TranslationMap) {
    this.translations[locale] = map;
  }

  public subscribe(sub: Subscriber) {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private notify() {
    this.subscribers.forEach((sub) => sub(this.locale));
  }

  public t(key: string, params?: Record<string, string>): string {
    const keys = key.split(".");
    let value: unknown = this.translations[this.locale] || this.translations["en"];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }

    // Fallback to English
    if (value === undefined && this.locale !== "en") {
      value = this.translations["en"];
      for (const k of keys) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[k];
        } else {
          value = undefined;
          break;
        }
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
    }

    return value;
  }
}

export const i18n = new I18nManager();
export const t = (key: string, params?: Record<string, string>) => i18n.t(key, params);
