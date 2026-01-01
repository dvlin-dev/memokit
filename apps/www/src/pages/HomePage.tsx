import { Header, Footer } from '@/components/layout'
import {
  HeroSection,
  StatsSection,
  PlaygroundSection,
  UseCasesSection,
  CodeExampleSection,
  FeaturesSection,
  PricingSection,
  CTASection,
} from '@/components/landing'

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <PlaygroundSection />
        <StatsSection />
        <UseCasesSection />
        <CodeExampleSection />
        <FeaturesSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
