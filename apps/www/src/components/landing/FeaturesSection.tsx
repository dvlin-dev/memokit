import { Container } from '@/components/layout'
import {
  Zap,
  Globe,
  Shield,
  Layers,
  Cpu,
  Clock,
  Code2,
  ImageIcon,
} from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Blazing Fast',
    description: 'Sub-500ms response times with smart pre-warming and caching.',
  },
  {
    icon: Globe,
    title: 'Global Edge Network',
    description: '50+ edge locations for low-latency screenshot capture worldwide.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with encrypted storage and secure API access.',
  },
  {
    icon: Layers,
    title: 'Multiple Formats',
    description: 'Export to PNG, JPEG, WebP, or PDF with customizable quality.',
  },
  {
    icon: Cpu,
    title: 'Smart Rendering',
    description: 'Chromium-based rendering with JavaScript execution support.',
  },
  {
    icon: Clock,
    title: 'Scheduled Captures',
    description: 'Automate recurring screenshots with cron-like scheduling.',
  },
  {
    icon: Code2,
    title: 'Developer First',
    description: 'RESTful API with webhooks, SDKs, and comprehensive docs.',
  },
  {
    icon: ImageIcon,
    title: 'Image Processing',
    description: 'Built-in cropping, resizing, and watermarking capabilities.',
  },
]

export function FeaturesSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            FEATURES
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need for production-grade screenshot automation
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center border border-border bg-background">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="font-mono text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
