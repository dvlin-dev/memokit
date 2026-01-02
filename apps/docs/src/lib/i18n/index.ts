import { defineI18n } from 'fumadocs-core/i18n'
import { en, type TranslationKeys } from './en'
import { zh } from './zh'
import { type Locale, DEFAULT_LOCALE, LOCALES, getLocale } from '../types'

/** Fumadocs i18n configuration */
export const i18n = defineI18n({
  defaultLanguage: DEFAULT_LOCALE,
  languages: [...LOCALES],
  hideLocale: 'default-locale',
})

/** All translations indexed by locale */
const translations: Record<Locale, Record<TranslationKeys, string>> = {
  en,
  zh,
}

/** Get translation object for a locale */
export function getTranslation(lang: string): Record<TranslationKeys, string> {
  const locale = getLocale(lang)
  return translations[locale]
}

/** Get locale display name */
export function getLocaleDisplayName(locale: Locale): string {
  const names: Record<Locale, string> = {
    en: 'English',
    zh: '中文',
  }
  return names[locale]
}

// Re-export types
export type { TranslationKeys }
export { translations }
