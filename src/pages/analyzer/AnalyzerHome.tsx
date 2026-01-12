import { Link } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  Globe, 
  FileSpreadsheet, 
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  FileText,
  Languages,
  Palette,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyzerHome() {
  const { language, isRTL } = useLanguage();

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
        { en: 'Text & image search', ar: 'البحث بالنص أو الصورة' },
        { en: 'Global manufacturers', ar: 'مصنعين عالميين' },
        { en: 'Market insights', ar: 'رؤى السوق' },
        { en: 'Price ranges', ar: 'نطاقات الأسعار' },
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
        { en: 'Technical comparison', ar: 'مقارنة فنية' },
        { en: 'Commercial analysis', ar: 'تحليل تجاري' },
        { en: 'AI recommendations', ar: 'توصيات الذكاء الاصطناعي' },
        { en: 'Risk assessment', ar: 'تقييم المخاطر' },
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
      <div className={cn("min-h-[calc(100vh-200px)] flex flex-col", isRTL && "rtl")}>
        {/* Compact Hero Section - Just tagline and feature pills */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center py-6 md:py-8 relative"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          
          <p className="text-lg text-muted-foreground mb-4">
            {language === 'ar'
              ? 'منصة ذكاء المشتريات الذكية'
              : 'Intelligent Procurement Intelligence Platform'}
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-sm"
              >
                <feature.icon className={cn("w-4 h-4", feature.color)} />
                <span className="text-muted-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Divider */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-border" />
          <span className="text-sm text-muted-foreground font-medium">
            {language === 'ar' ? 'اختر أداة التحليل' : 'Select Analysis Tool'}
          </span>
          <div className="h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-border" />
        </div>

        {/* Tools Grid - Centered Icons Above Title, Uniform Height */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid md:grid-cols-2 gap-6 lg:gap-8 py-6 flex-1 max-w-5xl mx-auto w-full"
        >
          {tools.map((tool, idx) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1, duration: 0.5 }}
              className="h-full"
            >
              <Link to={tool.href} className="group block h-full">
                <Card className={cn(
                  "h-full min-h-[380px] relative overflow-hidden transition-all duration-500",
                  "hover:shadow-2xl hover:shadow-primary/20",
                  "border-2 border-transparent hover:border-primary/30",
                  "bg-gradient-to-br", tool.bgGradient
                )}>
                  {/* Animated Border Glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={cn("absolute inset-0 bg-gradient-to-r rounded-2xl blur-xl", tool.gradient, "opacity-20")} />
                  </div>

                  <CardContent className="p-0 h-full flex flex-col relative">
                    {/* Header with Centered Icon */}
                    <div className={cn("p-6 bg-gradient-to-br flex flex-col items-center text-center", tool.bgGradient)}>
                      <div className={cn(
                        'w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-4',
                        'transition-all duration-500 group-hover:scale-110',
                        'shadow-lg group-hover:shadow-xl',
                        tool.iconBg
                      )}>
                        <tool.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </div>
                      
                      <h2 className="text-xl md:text-2xl font-bold mb-1 group-hover:text-primary transition-colors">
                        {tool.title}
                      </h2>
                      <p className="text-sm font-medium text-primary/80">
                        {tool.subtitle}
                      </p>
                    </div>

                    {/* Content - Flex grow for uniform height */}
                    <div className="p-6 flex flex-col flex-1">
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                        {tool.description}
                      </p>

                      {/* Features Grid */}
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        {tool.features.map((feature, fidx) => (
                          <div key={fidx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {isRTL ? feature.ar : feature.en}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <Button 
                        className={cn(
                          "w-full h-11 text-base font-semibold transition-all duration-300 mt-4",
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
                    </div>
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
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-6 py-8 border-t border-border/50 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span>{language === 'ar' ? 'آمن وخاص' : 'Secure & Private'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>{language === 'ar' ? 'سريع ودقيق' : 'Fast & Accurate'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span>{language === 'ar' ? 'جاهز للمؤسسات' : 'Enterprise Ready'}</span>
          </div>
        </motion.section>
      </div>
    </AnalyzerLayout>
  );
}