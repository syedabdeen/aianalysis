import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "PROCUREMIND AI transformed our procurement process. We reduced approval times by 70% and gained complete visibility into our spend.",
    author: "Sarah Chen",
    role: "VP of Procurement",
    company: "TechCorp Industries",
    rating: 5,
  },
  {
    quote: "The AI-powered vendor analysis has been a game changer. We've identified cost savings we never knew existed.",
    author: "Michael Rodriguez",
    role: "Chief Procurement Officer",
    company: "Global Manufacturing Co.",
    rating: 5,
  },
  {
    quote: "Implementation was seamless and the ROI was evident within the first quarter. Highly recommend for any enterprise.",
    author: "Emily Thompson",
    role: "Director of Operations",
    company: "HealthTech Solutions",
    rating: 5,
  },
];

const companyLogos = [
  "TechCorp", "GlobalMfg", "HealthTech", "FinanceFirst", "RetailPro", "EnergyCo"
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            <span className="gradient-text">Trusted by</span>{" "}
            <span className="gradient-text-blue">Industry Leaders</span>
          </h2>
        </div>

        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="metallic-card p-8 md:p-12 relative">
            {/* Quote Icon */}
            <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Quote className="w-6 h-6 text-primary" />
            </div>

            {/* Content */}
            <div className="pt-8">
              <blockquote className="text-xl md:text-2xl text-foreground leading-relaxed mb-8">
                "{testimonials[currentIndex].quote}"
              </blockquote>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
                    {testimonials[currentIndex].author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonials[currentIndex].author}</div>
                    <div className="text-sm text-muted-foreground">{testimonials[currentIndex].role}</div>
                    <div className="text-sm text-primary">{testimonials[currentIndex].company}</div>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex gap-1">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-4">
              <button
                onClick={prevTestimonial}
                className="pointer-events-auto w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-glow transition-all -translate-x-1/2"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextTestimonial}
                className="pointer-events-auto w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-glow transition-all translate-x-1/2"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex 
                      ? 'w-8 bg-primary' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Company Logos */}
        <div className="border-t border-b border-border/30 py-8">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {companyLogos.map((logo, i) => (
              <div
                key={logo}
                className="text-xl font-display font-bold text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
