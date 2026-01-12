import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Users,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: "prediction" | "recommendation" | "anomaly" | "trend";
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  severity?: "low" | "medium" | "high";
  confidence: number;
  actionUrl?: string;
}

// Mock insights - in production, these would come from AI analysis
const mockInsights: Insight[] = [
  {
    id: "1",
    type: "prediction",
    title: "Budget Alert: Project Alpha",
    titleAr: "تنبيه الميزانية: مشروع ألفا",
    description:
      "Based on current spending patterns, Project Alpha is projected to exceed budget by 15% within 45 days.",
    descriptionAr:
      "بناءً على أنماط الإنفاق الحالية، من المتوقع أن يتجاوز مشروع ألفا الميزانية بنسبة 15% خلال 45 يومًا.",
    severity: "high",
    confidence: 87,
    actionUrl: "/projects",
  },
  {
    id: "2",
    type: "recommendation",
    title: "Vendor Recommendation",
    titleAr: "توصية المورد",
    description:
      "ABC Supplies shows 20% better delivery times and 5% lower costs than current preferred vendors for electrical materials.",
    descriptionAr:
      "تظهر ABC Supplies أوقات تسليم أفضل بنسبة 20% وتكاليف أقل بنسبة 5% من الموردين المفضلين الحاليين للمواد الكهربائية.",
    severity: "low",
    confidence: 92,
    actionUrl: "/vendors",
  },
  {
    id: "3",
    type: "anomaly",
    title: "Unusual Purchase Pattern",
    titleAr: "نمط شراء غير عادي",
    description:
      "Detected 3x increase in office supplies purchases this month compared to historical average.",
    descriptionAr:
      "تم اكتشاف زيادة 3 أضعاف في مشتريات اللوازم المكتبية هذا الشهر مقارنة بالمتوسط التاريخي.",
    severity: "medium",
    confidence: 78,
    actionUrl: "/procurement",
  },
  {
    id: "4",
    type: "trend",
    title: "Steel Price Trend",
    titleAr: "اتجاه أسعار الصلب",
    description:
      "Steel prices are predicted to increase by 8% over the next quarter. Consider advance procurement.",
    descriptionAr:
      "من المتوقع أن ترتفع أسعار الصلب بنسبة 8% خلال الربع القادم. فكر في الشراء المسبق.",
    severity: "medium",
    confidence: 85,
    actionUrl: "/inventory",
  },
];

const typeConfig = {
  prediction: {
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Prediction",
    labelAr: "توقع",
  },
  recommendation: {
    icon: Lightbulb,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "Recommendation",
    labelAr: "توصية",
  },
  anomaly: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "Anomaly",
    labelAr: "شذوذ",
  },
  trend: {
    icon: TrendingUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Trend",
    labelAr: "اتجاه",
  },
};

const severityColors = {
  low: "bg-green-500/10 text-green-600 dark:text-green-400",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export const AIInsightsPanel = () => {
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [insights] = useState<Insight[]>(mockInsights);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate AI analysis
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="flex items-center gap-2">
                {language === "ar" ? "رؤى الذكاء الاصطناعي" : "AI Insights"}
                <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              </span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                {language === "ar"
                  ? "تحليلات وتوصيات مدعومة بالذكاء الاصطناعي"
                  : "AI-powered analytics and recommendations"}
              </p>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <AnimatePresence>
          {insights.map((insight, index) => {
            const config = typeConfig[insight.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "p-4 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200",
                  "hover:shadow-md hover:border-primary/30 cursor-pointer group"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", config.bgColor)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {language === "ar" ? config.labelAr : config.label}
                      </Badge>
                      {insight.severity && (
                        <Badge
                          className={cn(
                            "text-xs",
                            severityColors[insight.severity]
                          )}
                        >
                          {insight.severity}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                      {language === "ar" ? insight.titleAr : insight.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {language === "ar"
                        ? insight.descriptionAr
                        : insight.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {language === "ar" ? "الثقة:" : "Confidence:"}
                      </span>
                      <Progress value={insight.confidence} className="h-1.5 flex-1 max-w-20" />
                      <span className="text-xs font-medium">
                        {insight.confidence}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
