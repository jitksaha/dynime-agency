import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import bn from "./locales/bn.json";
import hi from "./locales/hi.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";

export const LANGUAGE_STORAGE_KEY = "dynime-language-v1";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        bn: { translation: bn },
        hi: { translation: hi },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
        ar: { translation: ar },
        zh: { translation: zh },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "bn", "hi", "es", "fr", "de", "ar", "zh"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ["localStorage"],
      },
      returnNull: false,
    });
}

export default i18n;
