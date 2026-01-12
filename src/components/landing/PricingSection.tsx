import { Check, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "7-Day Free Trial",
    price: "Free",
    originalPrice: null,
    period: "",
    duration: "7 days",
    description: "Experience the full power of ProcureMind with no commitment.",
    features: [
      "Full platform access",
      "End-to-end procurement",
      "Customizable workflows",
      "AI-powered insights",
      "Reporting & analytics",
    ],
    cta: "Start Free Trial",
    ctaAction: "trial",
    popular: false,
  },
  {
    name: "6-Month Plan",
    price: "7,000",
    originalPrice: null,
    period: "AED",
    duration: "6 months",
    description: "Perfect for organizations ready to transform their procurement.",
    features: [
      "Everything in Free Trial",
      "Priority support",
      "Custom integrations",
      "Advanced analytics",
      "Dedicated onboarding",
    ],
    cta: "Contact Sales",
    ctaAction: "contact-6month",
    popular: false,
  },
  {
    name: "Yearly Plan",
    price: "10,000",
    originalPrice: "15,000",
    period: "AED",
    duration: "12 months",
    description: "Best value with maximum savings for long-term commitment.",
    features: [
      "Everything in 6-Month",
      "33% savings",
      "Premium support",
      "Custom AI models",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    ctaAction: "contact-yearly",
    popular: true,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  const openMailClient = (planName: string, duration: string, price: string) => {
    const subject = encodeURIComponent("Request for Demo & Quote");
    const body = encodeURIComponent(
`Dear ProcureMind Team,

I am interested in learning more about the ${planName} subscription plan.

Plan Details:
- Plan: ${planName}
- Duration: ${duration}
- Price: ${price} AED

I would appreciate it if you could provide me with a demo and a detailed quote for this plan. Please feel free to contact me at your earliest convenience.

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Company]
[Your Contact Number]`
    );
    
    window.location.href = `mailto:cmc@widelens.info?subject=${subject}&body=${body}`;
  };

  const handleCTAClick = (action: string, planName: string, duration: string, price: string) => {
    if (action === "trial") {
      navigate("/auth?mode=signup");
    } else if (action === "contact-6month" || action === "contact-yearly") {
      openMailClient(planName, duration, price);
    }
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            <span className="gradient-text">Simple,</span>{" "}
            <span className="gradient-text-blue">Transparent Pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your organization. Start with a free trial, no credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative ${plan.popular ? 'md:-mt-4' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Best Value
                  </div>
                </div>
              )}

              <div className={`h-full metallic-card p-8 ${
                plan.popular 
                  ? 'glow-border shadow-glow-lg' 
                  : 'hover:shadow-glow transition-shadow duration-500'
              }`}>
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  
                  {/* Duration Badge */}
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    {plan.duration}
                  </div>
                  
                  {/* Pricing */}
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    {plan.originalPrice && (
                      <span className="text-xl text-muted-foreground line-through">
                        {plan.originalPrice}
                      </span>
                    )}
                    <span className={`text-4xl font-display font-bold ${plan.popular ? 'text-primary' : 'gradient-text-blue'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground text-lg">{plan.period}</span>
                    )}
                  </div>
                  
                  {/* Savings Badge for Yearly */}
                  {plan.originalPrice && (
                    <div className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-semibold mb-2">
                      Save 5,000 AED
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => handleCTAClick(plan.ctaAction, plan.name, plan.duration, plan.price)}
                  className={`w-full group ${
                    plan.popular 
                      ? 'btn-metallic' 
                      : plan.ctaAction === 'trial'
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'btn-glass'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All prices in AED. Need a custom enterprise solution?{" "}
            <a 
              href="mailto:sales@procuremind.ai?subject=Enterprise%20Inquiry" 
              className="text-primary hover:underline"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
