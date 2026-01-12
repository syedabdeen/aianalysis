import { FileQuestion, FileText, ClipboardList, CheckCircle, ShoppingCart, Truck, Package, BarChart } from "lucide-react";

const workflowSteps = [
  { icon: FileQuestion, label: "RFI", color: "from-blue-500 to-blue-600" },
  { icon: FileText, label: "RFQ", color: "from-cyan-500 to-cyan-600" },
  { icon: ClipboardList, label: "PR", color: "from-teal-500 to-teal-600" },
  { icon: CheckCircle, label: "Approval", color: "from-green-500 to-green-600" },
  { icon: ShoppingCart, label: "PO", color: "from-emerald-500 to-emerald-600" },
  { icon: Truck, label: "Delivery", color: "from-primary to-accent" },
  { icon: Package, label: "Inventory", color: "from-violet-500 to-violet-600" },
  { icon: BarChart, label: "Reports", color: "from-purple-500 to-purple-600" },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            <span className="gradient-text">Seamless</span>{" "}
            <span className="gradient-text-blue">Workflow Automation</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            End-to-end procurement lifecycle management with intelligent automation at every step.
          </p>
        </div>

        {/* Workflow Visualization */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
            <div className="h-full w-full bg-gradient-to-r from-primary to-accent opacity-30 blur-sm" />
          </div>

          {/* Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 lg:gap-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step.label}
                className="group flex flex-col items-center"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Hexagon Node */}
                <div className="relative mb-4">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 w-20 h-20 hexagon bg-primary/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Main Hexagon */}
                  <div className={`relative w-20 h-20 hexagon bg-gradient-to-br ${step.color} flex items-center justify-center shadow-metallic group-hover:scale-110 group-hover:shadow-glow transition-all duration-300`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Connector Arrow (not for last item) */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-6 w-8 h-0.5 -translate-y-1/2">
                      <div className="w-full h-full bg-gradient-to-r from-primary/50 to-transparent" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-primary/50" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="text-sm font-display font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Fully automated • AI-powered routing • Real-time tracking
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
