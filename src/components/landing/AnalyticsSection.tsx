import { TrendingUp, TrendingDown, AlertTriangle, Star, Clock, Brain } from "lucide-react";

const dashboardTiles = [
  {
    title: "Budget vs Spend",
    value: "$1.2M / $1.5M",
    change: "+12%",
    trend: "up",
    progress: 80,
  },
  {
    title: "Inventory Alerts",
    value: "23",
    change: "-8%",
    trend: "down",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
  },
  {
    title: "Vendor Rating",
    value: "4.7",
    change: "+0.3",
    trend: "up",
    icon: Star,
    iconColor: "text-primary",
  },
  {
    title: "Pending Approvals",
    value: "12",
    change: "-15%",
    trend: "down",
    icon: Clock,
    iconColor: "text-accent",
  },
  {
    title: "AI Risk Score",
    value: "Low",
    subtitle: "2 items flagged",
    icon: Brain,
    iconColor: "text-green-500",
  },
];

export function AnalyticsSection() {
  return (
    <section id="analytics" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 circuit-pattern opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            <span className="gradient-text-blue">Real-Time</span>{" "}
            <span className="gradient-text">Analytics Dashboard</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get instant visibility into your procurement operations with AI-powered insights.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-5xl mx-auto">
          <div className="metallic-card p-8 glow-border">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">AI Analytics Engine</h3>
                  <p className="text-xs text-muted-foreground">Last updated: 2 mins ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-500">Live</span>
              </div>
            </div>

            {/* Dashboard Tiles */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardTiles.map((tile, index) => (
                <div
                  key={tile.title}
                  className="glass-card p-6 group hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">{tile.title}</span>
                    {tile.icon && (
                      <tile.icon className={`w-5 h-5 ${tile.iconColor}`} />
                    )}
                    {tile.trend && (
                      <div className={`flex items-center gap-1 text-sm ${tile.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {tile.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{tile.change}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-3xl font-display font-bold gradient-text-blue mb-2">
                    {tile.value}
                  </div>

                  {tile.subtitle && (
                    <div className="text-xs text-muted-foreground">{tile.subtitle}</div>
                  )}

                  {tile.progress && (
                    <div className="mt-4">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                          style={{ width: `${tile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Chart Tile */}
              <div className="glass-card p-6 sm:col-span-2 lg:col-span-1">
                <div className="text-sm text-muted-foreground mb-4">Weekly Trend</div>
                <div className="flex items-end gap-2 h-24">
                  {[30, 45, 35, 60, 50, 75, 65].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className="bg-gradient-to-t from-primary/60 to-accent/80 rounded-t transition-all duration-500 hover:from-primary hover:to-accent"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Mon</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
