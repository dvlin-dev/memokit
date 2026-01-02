import { createFileRoute } from '@tanstack/react-router'
import { getTranslation } from '../lib/i18n'
import { HomePage } from '../components/home'

export const Route = createFileRoute('/')({
  head: () => {
    const t = getTranslation('en')
    return {
      meta: [
        { title: t.siteTitle },
        { name: 'description', content: t.siteDescription },
      ],
    }
  },
  component: () => <HomePage locale="en" />,
})
