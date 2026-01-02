import { features } from '../../lib/config'
import type { TranslationKeys } from '../../lib/i18n'

interface FeaturesProps {
  t: Record<TranslationKeys, string>
}

export function Features({ t }: FeaturesProps) {
  return (
    <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
      {features.map((feature) => (
        <div key={feature.titleKey} className="p-6 border bg-card">
          <div className="text-2xl mb-2">{feature.icon}</div>
          <h3 className="font-semibold text-lg mb-2">{t[feature.titleKey]}</h3>
          <p className="text-muted-foreground text-sm">{t[feature.descKey]}</p>
        </div>
      ))}
    </div>
  )
}
