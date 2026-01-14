import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SimpleAuthProvider } from "@/contexts/SimpleAuthContext";
import { ValidityGuard } from "@/components/ValidityGuard";
import { AdminGuard } from "@/components/AdminGuard";

import LoginPage from "./pages/LoginPage";
import AnalyzerHome from "./pages/analyzer/AnalyzerHome";
import MarketAnalysisPage from "./pages/analyzer/MarketAnalysisPage";
import OfferAnalysisPage from "./pages/analyzer/OfferAnalysisPage";
import AnalyzerSettings from "./pages/analyzer/AnalyzerSettings";
import ReportsPage from "./pages/analyzer/ReportsPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import InstallApp from "./pages/InstallApp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <SimpleAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Root redirects to login */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes - require login + validity */}
                <Route path="/landing" element={
                  <ValidityGuard>
                    <AnalyzerHome />
                  </ValidityGuard>
                } />
                <Route path="/market-analysis" element={
                  <ValidityGuard>
                    <MarketAnalysisPage />
                  </ValidityGuard>
                } />
                <Route path="/offer-analysis" element={
                  <ValidityGuard>
                    <OfferAnalysisPage />
                  </ValidityGuard>
                } />
                <Route path="/reports" element={
                  <ValidityGuard>
                    <ReportsPage />
                  </ValidityGuard>
                } />
                <Route path="/settings" element={
                  <ValidityGuard>
                    <AnalyzerSettings />
                  </ValidityGuard>
                } />
                
                {/* Alias routes for /analyzer prefix - also protected */}
                <Route path="/analyzer" element={
                  <ValidityGuard>
                    <AnalyzerHome />
                  </ValidityGuard>
                } />
                <Route path="/analyzer/market-analysis" element={
                  <ValidityGuard>
                    <MarketAnalysisPage />
                  </ValidityGuard>
                } />
                <Route path="/analyzer/offer-analysis" element={
                  <ValidityGuard>
                    <OfferAnalysisPage />
                  </ValidityGuard>
                } />
                <Route path="/analyzer/reports" element={
                  <ValidityGuard>
                    <ReportsPage />
                  </ValidityGuard>
                } />
                <Route path="/analyzer/settings" element={
                  <ValidityGuard>
                    <AnalyzerSettings />
                  </ValidityGuard>
                } />
                
                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/dashboard" element={
                  <AdminGuard>
                    <AdminDashboardPage />
                  </AdminGuard>
                } />
                
                {/* PWA Install page */}
                <Route path="/install" element={<InstallApp />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SimpleAuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
