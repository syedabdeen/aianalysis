import { 
  FileText, 
  Users, 
  ClipboardCheck, 
  ShoppingCart, 
  Package, 
  BarChart3 
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "RFI → RFQ Automation",
    description: "Seamlessly convert requests for information to quotations with intelligent form mapping.",
  },
  {
    icon: Users,
    title: "Vendor Onboarding with OCR",
    description: "Automated document processing and vendor registration with smart data extraction.",
  },
  {
    icon: ClipboardCheck,
    title: "Purchase Request Workflow",
    description: "Configurable approval matrices with role-based routing and automated notifications.",
  },
  {
    icon: ShoppingCart,
    title: "Purchase Orders & Compliance",
    description: "Generate compliant POs with built-in validation rules and regulatory checks.",
  },
  {
    icon: Package,
    title: "Inventory & Material Codes",
    description: "Comprehensive material management with automated stock tracking and reorder alerts.",
  },
  {
    icon: BarChart3,
    title: "KPI Dashboards & Analytics",
    description: "Real-time performance metrics, spend analytics, and executive reporting.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <span className="text-sm font-medium text-accent">Complete Feature Set</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            <span className="text-foreground">Everything You Need for</span>
            <br />
            <span className="gradient-text-blue">Modern Procurement</span>
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative glass-card p-8 hover:bg-card/80 transition-all duration-500 cursor-pointer"
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Glow Border on Hover */}
              <div className="absolute inset-0 rounded-2xl glow-border opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-display font-semibold mb-3 text-foreground group-hover:gradient-text-blue transition-all">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Arrow */}
                <div className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium">Learn more</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
