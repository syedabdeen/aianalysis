import { Crown, Mail, Clock, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const TrialExpired = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const plans = [
    {
      name: "6-Month Plan",
      price: "7,000",
      duration: "6 months",
      features: ["Full platform access", "Priority support", "Custom integrations"],
    },
    {
      name: "Yearly Plan",
      price: "10,000",
      originalPrice: "15,000",
      duration: "12 months",
      features: ["Everything in 6-Month", "33% savings", "Premium support"],
      recommended: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
            <Clock className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Your Free Trial Has Expired
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            We hope you enjoyed exploring ProcureMind. To continue streamlining your procurement processes, please choose a plan below.
          </p>
          {profile?.email && (
            <p className="text-sm text-muted-foreground mt-2">
              Signed in as <span className="font-medium text-foreground">{profile.email}</span>
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.recommended ? 'border-primary shadow-glow' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Best Value
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.duration}</CardDescription>
                <div className="flex items-baseline justify-center gap-2 mt-4">
                  {plan.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      {plan.originalPrice}
                    </span>
                  )}
                  <span className={`text-4xl font-bold ${plan.recommended ? 'text-primary' : ''}`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">AED</span>
                </div>
                {plan.originalPrice && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium">
                    Save 5,000 AED
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Crown className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.recommended ? "default" : "outline"}
                  onClick={() => window.location.href = `mailto:sales@procuremind.ai?subject=${encodeURIComponent(plan.name)} Subscription Inquiry`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Sales
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
          <span className="text-muted-foreground text-sm">or</span>
          <a
            href="mailto:sales@procuremind.ai?subject=Enterprise%20Inquiry"
            className="text-primary hover:underline text-sm font-medium"
          >
            Need a custom enterprise solution?
          </a>
        </div>
      </div>
    </div>
  );
};

export default TrialExpired;
