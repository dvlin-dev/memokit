/** Supported locales */
export type Locale = 'en' | 'zh'

/** Default locale */
export const DEFAULT_LOCALE: Locale = 'en'

/** All supported locales */
export const LOCALES: readonly Locale[] = ['en', 'zh'] as const

/** Check if a string is a valid locale */
export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale)
}

/** Get locale from string, fallback to default */
export function getLocale(value: string | undefined): Locale {
  if (value && isValidLocale(value)) {
    return value
  }
  return DEFAULT_LOCALE
}
