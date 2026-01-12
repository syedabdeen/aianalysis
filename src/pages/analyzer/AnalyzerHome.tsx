import { Link } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { motion } from 'framer-motion';
import { 
  Globe, 
  FileSpreadsheet, 
  Sparkles,
  ArrowRight,
  Search,
  Factory,
  DollarSign,
  Award,
  TrendingUp,
  Shield,
  Zap,
  FileText,
  Languages,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyzerHome() {
  const { language, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();

  const hasCompanyName = settings.company_name_en || settings.company_name_ar;
  const displayName = language === 'ar' 
    ? (settings.company_name_ar || settings.company_name_en) 
    : settings.company_name_en;

  const tools = [
    {
      id: 'market',
      title: language === 'ar' ? 'تحليل السوق' : 'Market Analysis',
      subtitle: language === 'ar' ? 'اكتشف الموردين والمصنعين' : 'Discover Suppliers & Manufacturers',
      description: language === 'ar' 
        ? 'ابحث عن المنتجات واعثر على المصنعين والموردين في منطقتك باستخدام الذكاء الاصطناعي'
        : 'Find products and discover manufacturers & suppliers in your region using AI intelligence',
      icon: Globe,
      features: [
        { icon: Search, text: language === 'ar' ? 'البحث بالنص أو الصورة' : 'Text or image search' },
        { icon: Factory, text: language === 'ar' ? 'المصنعين العالميين والإقليميين' : 'Global & regional manufacturers' },
        { icon: TrendingUp, text: language === 'ar' ? 'رؤى السوق والتوصيات' : 'Market insights & recommendations' },
        { icon: DollarSign, text: language === 'ar' ? 'نطاقات الأسعار ووقت التسليم' : 'Price ranges & lead times' },
      ],
      href: '/market-analysis',
      gradient: 'from-blue-600 via-cyan-500 to-teal-400',
      bgGradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    },
    {
      id: 'offer',
      title: language === 'ar' ? 'تحليل العروض' : 'Offer Analysis',
      subtitle: language === 'ar' ? 'قارن وقيّم عروض الأسعار' : 'Compare & Evaluate Quotations',
      description: language === 'ar'
        ? 'قم بتحميل عروض الموردين للمقارنة الذكية والتحليل الشامل والتوصيات'
        : 'Upload supplier quotations for intelligent comparison, comprehensive analysis and AI recommendations',
      icon: FileSpreadsheet,
      features: [
        { icon: Shield, text: language === 'ar' ? 'المقارنة الفنية التفصيلية' : 'Detailed technical comparison' },
        { icon: DollarSign, text: language === 'ar' ? 'المقارنة التجارية الشاملة' : 'Comprehensive commercial comparison' },
        { icon: Award, text: language === 'ar' ? 'توصية الذكاء الاصطناعي' : 'AI-powered recommendation' },
        { icon: TrendingUp, text: language === 'ar' ? 'تحليل المخاطر والتقييم' : 'Risk analysis & scoring' },
      ],
      href: '/offer-analysis',
      gradient: 'from-purple-600 via-pink-500 to-rose-400',
      bgGradient: 'from-purple-500/10 via-pink-500/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
  ];

  const features = [
    { icon: Zap, text: language === 'ar' ? 'بدون تسجيل دخول' : 'No Login Required', color: 'text-yellow-500' },
    { icon: FileText, text: language === 'ar' ? 'تصدير PDF و Excel' : 'PDF & Excel Export', color: 'text-blue-500' },
    { icon: Languages, text: language === 'ar' ? 'دعم ثنائي اللغة' : 'Bilingual Support', color: 'text-green-500' },
    { icon: Palette, text: language === 'ar' ? 'تقارير بعلامتك التجارية' : 'Branded Reports', color: 'text-purple-500' },
  ];

  return (
    <AnalyzerLayout>
      <div className="min-h-[calc(100vh-200px)] flex flex-col">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-16 md:py-24 relative overflow-hidden"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute inset-0 circuit-pattern opacity-30" />
          </div>
          
          {/* Company Logo */}
          {settings.logo_url ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                <img 
                  src={settings.logo_url} 
                  alt="Company Logo" 
                  className="h-24 md:h-32 object-contain drop-shadow-xl"
                />
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl -z-10" />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative inline-flex items-center justify-center mb-8"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-primary-foreground" />
              </div>
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 to-accent/30 rounded-[2rem] blur-2xl -z-10 animate-glow" />
            </motion.div>
          )}
          
          {/* Company Name or App Name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {hasCompanyName ? (
              <>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
                  {displayName}
                </h1>
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-lg md:text-xl font-semibold text-primary">
                    {language === 'ar' ? 'محلل الذكاء الاصطناعي' : 'AI Analyzer'}
                  </span>
                </div>
              </>
            ) : (
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 gradient-text-blue tracking-tight">
                {language === 'ar' ? 'محلل الذكاء الاصطناعي' : 'AI Analyzer'}
              </h1>
            )}
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            {language === 'ar'
              ? 'منصة ذكاء اصطناعي متقدمة لأبحاث السوق وتحليل العروض التنافسية بدقة عالية'
              : 'Advanced AI-powered platform for intelligent market research and competitive quotation analysis'}
          </motion.p>

          {/* Feature Pills */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-3 md:gap-4"
          >
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
              >
                <feature.icon className={cn("w-4 h-4", feature.color)} />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* Divider */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-border" />
          <span className="text-sm text-muted-foreground font-medium">
            {language === 'ar' ? 'اختر أداة التحليل' : 'Select Analysis Tool'}
          </span>
          <div className="h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-border" />
        </div>

        {/* Tools Grid */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="grid md:grid-cols-2 gap-6 lg:gap-8 py-8 flex-1"
        >
          {tools.map((tool, idx) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + idx * 0.1, duration: 0.5 }}
            >
              <Link to={tool.href} className="group block h-full">
                <Card className={cn(
                  "h-full relative overflow-hidden transition-all duration-500",
                  "hover:shadow-2xl hover:shadow-primary/20",
                  "border-2 border-transparent hover:border-primary/30",
                  "bg-gradient-to-br", tool.bgGradient
                )}>
                  {/* Animated Border Glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={cn("absolute inset-0 bg-gradient-to-r rounded-2xl blur-xl", tool.gradient, "opacity-20")} />
                  </div>

                  <CardContent className="p-6 md:p-8 relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className={cn(
                        'w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center',
                        'transition-all duration-500 group-hover:scale-110 group-hover:rotate-3',
                        'shadow-lg group-hover:shadow-xl',
                        tool.iconBg
                      )}>
                        <tool.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </div>
                      <ArrowRight className={cn(
                        'w-6 h-6 text-muted-foreground/50 transition-all duration-300',
                        'group-hover:text-primary group-hover:translate-x-2',
                        isRTL && 'rotate-180 group-hover:-translate-x-2'
                      )} />
                    </div>

                    {/* Title & Description */}
                    <div className="mb-6">
                      <h2 className="text-2xl md:text-3xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {tool.title}
                      </h2>
                      <p className="text-sm font-medium text-primary/80 mb-3">
                        {tool.subtitle}
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        {tool.description}
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 mb-8">
                      {tool.features.map((feature, fidx) => (
                        <motion.div 
                          key={fidx} 
                          initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + fidx * 0.05, duration: 0.3 }}
                          className="flex items-center gap-3"
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                            "bg-muted group-hover:bg-primary/10"
                          )}>
                            <feature.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {feature.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className={cn(
                        "w-full h-12 text-base font-semibold transition-all duration-300",
                        "bg-gradient-to-r shadow-lg group-hover:shadow-xl group-hover:scale-[1.02]",
                        tool.gradient
                      )}
                    >
                      {language === 'ar' ? 'ابدأ التحليل' : 'Launch Analysis'}
                      <ArrowRight className={cn(
                        'w-5 h-5 ml-2 transition-transform group-hover:translate-x-1',
                        isRTL && 'rotate-180 mr-2 ml-0 group-hover:-translate-x-1'
                      )} />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.section>

        {/* Bottom Trust Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center py-8 border-t border-border/50"
        >
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? '🔒 آمن وخاص • ⚡ سريع ودقيق • 🌍 جاهز للمؤسسات'
              : '🔒 Secure & Private • ⚡ Fast & Accurate • 🌍 Enterprise Ready'}
          </p>
        </motion.section>
      </div>
    </AnalyzerLayout>
  );
}