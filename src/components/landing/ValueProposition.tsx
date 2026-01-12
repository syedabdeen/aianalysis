import { Brain, GitBranch, Shield, TrendingUp } from "lucide-react";

const values = [
  {
    icon: Brain,
    title: "AI-Driven Quotation Analysis",
    description: "Leverage machine learning to analyze vendor quotes, identify optimal pricing, and make data-driven procurement decisions.",
  },
  {
    icon: GitBranch,
    title: "Multi-Layer Approval Automation",
    description: "Streamline complex approval workflows with intelligent routing, automated escalations, and real-time status tracking.",
  },
  {
    icon: Shield,
    title: "Vendor & Risk Intelligence",
    description: "Comprehensive vendor scoring, compliance monitoring, and risk assessment powered by AI analytics.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Project Tracking",
    description: "Monitor project budgets, track spending patterns, and forecast costs with precision analytics dashboards.",
  },
];

export function ValueProposition() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            <span className="gradient-text">Why Choose</span>{" "}
            <span className="gradient-text-blue">PROCUREMIND AI?</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Transform your procurement operations with cutting-edge AI technology and enterprise-grade automation.
          </p>
        </div>

        {/* Value Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <div
              key={value.title}
              className="group metallic-card p-6 hover:shadow-glow-lg transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-display font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                {value.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>

              {/* Bottom Glow Line */}
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
