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
import ReportsPage from "./pages/analyzer/ReportsPage";
import InstallApp from "./pages/InstallApp";
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
              {/* Primary routes */}
              <Route path="/" element={<AnalyzerHome />} />
              <Route path="/market-analysis" element={<MarketAnalysisPage />} />
              <Route path="/offer-analysis" element={<OfferAnalysisPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<AnalyzerSettings />} />
              
              {/* Alias routes for /analyzer prefix */}
              <Route path="/analyzer" element={<AnalyzerHome />} />
              <Route path="/analyzer/market-analysis" element={<MarketAnalysisPage />} />
              <Route path="/analyzer/offer-analysis" element={<OfferAnalysisPage />} />
              <Route path="/analyzer/reports" element={<ReportsPage />} />
              <Route path="/analyzer/settings" element={<AnalyzerSettings />} />
              
              {/* PWA Install page */}
              <Route path="/install" element={<InstallApp />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
