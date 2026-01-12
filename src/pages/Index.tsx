import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { AnalyticsSection } from "@/components/landing/AnalyticsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ValueProposition />
        <FeaturesGrid />
        <WorkflowSection />
        <AnalyticsSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
