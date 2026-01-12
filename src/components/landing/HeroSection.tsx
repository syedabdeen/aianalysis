import { ArrowRight, Play, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 circuit-pattern opacity-30" />
      
      {/* Animated Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      
      {/* Geometric Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="hsl(var(--glow-blue))" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="url(#line-gradient)" strokeWidth="1" />
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="url(#line-gradient)" strokeWidth="1" />
      </svg>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-tight animate-slide-up">
              <span className="gradient-text">Reinventing</span>
              <br />
              <span className="text-foreground">Procurement with</span>
              <br />
              <span className="gradient-text-blue">Intelligence.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              AI-driven procurement, vendor insights, project budgeting, and inventory automation — all in one platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <Button 
                className="btn-metallic group text-lg"
                onClick={() => window.location.href = '/auth?mode=signup'}
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                className="btn-glass group text-lg"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 w-5 h-5" />
                View Pricing
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm">Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm">Real-time Analytics</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative perspective-1000">
              {/* Main Dashboard Card */}
              <div className="metallic-card p-6 glow-border animate-float">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">PROCUREMIND DASHBOARD</div>
                </div>

                {/* Dashboard Content */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Stat Card 1 */}
                  <div className="glass-card p-4">
                    <div className="text-2xl font-display font-bold gradient-text-blue">$2.4M</div>
                    <div className="text-xs text-muted-foreground mt-1">Total Spend</div>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                    </div>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="glass-card p-4">
                    <div className="text-2xl font-display font-bold gradient-text-blue">847</div>
                    <div className="text-xs text-muted-foreground mt-1">Active Vendors</div>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-accent to-primary rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Chart Visualization */}
                <div className="glass-card p-4">
                  <div className="flex items-end gap-2 h-24">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 85, 75, 95, 80].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary/50 to-accent/80 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Monthly Procurement Analytics</div>
                </div>

                {/* AI Indicator */}
                <div className="absolute -bottom-3 -right-3 w-16 h-16 hexagon bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-6 -left-6 glass-card p-3 glow-border animate-float" style={{ animationDelay: '-2s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">98.5%</div>
                    <div className="text-xs text-muted-foreground">Approval Rate</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-10 -left-4 glass-card p-3 glow-border animate-float" style={{ animationDelay: '-4s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">AI Active</div>
                    <div className="text-xs text-muted-foreground">Processing</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
