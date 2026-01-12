import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";

import AnalyzerHome from "./pages/analyzer/AnalyzerHome";
import MarketAnalysisPage from "./pages/analyzer/MarketAnalysisPage";
import OfferAnalysisPage from "./pages/analyzer/OfferAnalysisPage";
import AnalyzerSettings from "./pages/analyzer/AnalyzerSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AnalyzerHome />} />
              <Route path="/market-analysis" element={<MarketAnalysisPage />} />
              <Route path="/offer-analysis" element={<OfferAnalysisPage />} />
              <Route path="/settings" element={<AnalyzerSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
