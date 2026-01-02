import type { Locale } from './types'

/** Site configuration */
export const siteConfig = {
  name: 'Memokit',
  url: 'https://docs.memokit.dev',
  console: 'https://console.memokit.dev',
  status: 'https://status.memokit.dev',
  github: 'https://github.com/memokit',
  api: 'https://api.memokit.dev',
} as const

/** Feature item configuration */
export interface FeatureItem {
  icon: string
  titleKey: 'featureSemanticTitle' | 'featureKnowledgeTitle' | 'featureMultiTenantTitle' | 'featureWebhooksTitle'
  descKey: 'featureSemanticDesc' | 'featureKnowledgeDesc' | 'featureMultiTenantDesc' | 'featureWebhooksDesc'
}

/** Features list */
export const features: FeatureItem[] = [
  { icon: '🔍', titleKey: 'featureSemanticTitle', descKey: 'featureSemanticDesc' },
  { icon: '🕸️', titleKey: 'featureKnowledgeTitle', descKey: 'featureKnowledgeDesc' },
  { icon: '👥', titleKey: 'featureMultiTenantTitle', descKey: 'featureMultiTenantDesc' },
  { icon: '⚡', titleKey: 'featureWebhooksTitle', descKey: 'featureWebhooksDesc' },
]

/** Code example for homepage */
export const codeExample = `curl -X POST https://api.memokit.dev/v1/memories \\
  -H "Authorization: Bearer mk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode",
    "user_id": "user_123"
  }'`

/** Get docs path based on locale */
export function getDocsPath(locale: Locale): string {
  return locale === 'zh' ? '/zh/docs' : '/docs'
}

/** Get home path based on locale */
export function getHomePath(locale: Locale): string {
  return locale === 'zh' ? '/zh' : '/'
}
