import { Link } from 'react-router-dom';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
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
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyzerHome() {
  const { language, isRTL } = useLanguage();

  const tools = [
    {
      id: 'market',
      title: language === 'ar' ? 'تحليل السوق' : 'Market Analysis',
      description: language === 'ar' 
        ? 'ابحث عن المنتجات واعثر على المصنعين والموردين في منطقتك باستخدام الذكاء الاصطناعي'
        : 'Find products and discover manufacturers & suppliers in your region using AI',
      icon: Globe,
      features: [
        { icon: Search, text: language === 'ar' ? 'البحث بالنص أو الصورة' : 'Search by text or image' },
        { icon: Factory, text: language === 'ar' ? 'قائمة المصنعين العالميين' : 'Global manufacturer list' },
        { icon: TrendingUp, text: language === 'ar' ? 'ملخص السوق والتوصيات' : 'Market summary & recommendations' },
      ],
      href: '/market-analysis',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'offer',
      title: language === 'ar' ? 'تحليل العروض' : 'Offer Analysis',
      description: language === 'ar'
        ? 'قم بتحميل عروض الموردين للمقارنة الذكية والتحليل الشامل'
        : 'Upload supplier quotations for intelligent comparison and comprehensive analysis',
      icon: FileSpreadsheet,
      features: [
        { icon: DollarSign, text: language === 'ar' ? 'المقارنة التجارية' : 'Commercial comparison' },
        { icon: Shield, text: language === 'ar' ? 'المقارنة الفنية' : 'Technical comparison' },
        { icon: Award, text: language === 'ar' ? 'توصية الذكاء الاصطناعي' : 'AI recommendation' },
      ],
      href: '/offer-analysis',
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <AnalyzerLayout>
      <div className="space-y-12">
        {/* Hero Section */}
        <section className="text-center py-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl -z-10" />
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-float">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl -z-10 animate-glow" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-blue">
            {language === 'ar' ? 'أداة التحليل الذكي' : 'AI Analyzer'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar'
              ? 'أدوات تحليل قوية مدعومة بالذكاء الاصطناعي لأبحاث السوق ومقارنة عروض الأسعار'
              : 'Powerful AI-driven analysis tools for market research and quotation comparison'}
          </p>
        </section>

        {/* Tools Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link key={tool.id} to={tool.href} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 metallic-card overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-110',
                      tool.gradient
                    )}>
                      <tool.icon className="w-7 h-7 text-white" />
                    </div>
                    <ArrowRight className={cn(
                      'w-5 h-5 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-1',
                      isRTL && 'rotate-180 group-hover:-translate-x-1'
                    )} />
                  </div>
                  <CardTitle className="text-xl mt-4">{tool.title}</CardTitle>
                  <CardDescription className="text-base">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tool.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <feature.icon className="w-4 h-4" />
                        </div>
                        <span>{feature.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-6 group-hover:bg-primary/90" 
                    variant="default"
                  >
                    {language === 'ar' ? 'ابدأ التحليل' : 'Start Analysis'}
                    <ArrowRight className={cn(
                      'w-4 h-4 ml-2 transition-transform group-hover:translate-x-1',
                      isRTL && 'rotate-180 mr-2 ml-0 group-hover:-translate-x-1'
                    )} />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {/* Features Section */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-6">
            {language === 'ar' ? 'المميزات الرئيسية' : 'Key Features'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🚀', text: language === 'ar' ? 'بدون تسجيل دخول' : 'No Login Required' },
              { icon: '📊', text: language === 'ar' ? 'تصدير PDF و Excel' : 'PDF & Excel Export' },
              { icon: '🌍', text: language === 'ar' ? 'دعم ثنائي اللغة' : 'Bilingual Support' },
              { icon: '🎨', text: language === 'ar' ? 'تقارير مخصصة بعلامتك التجارية' : 'Branded Reports' },
            ].map((feature, idx) => (
              <div key={idx} className="glass-card p-4 text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <p className="text-sm font-medium">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AnalyzerLayout>
  );
}
