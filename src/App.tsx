import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { QuickActionWidget } from "@/components/ui/QuickActionWidget";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import TrialExpired from "./pages/TrialExpired";
import ReportsPage from "./pages/reports/ReportsPage";
import ReportsCentrePage from "./pages/reports/ReportsCentrePage";
import UsersManagement from "./pages/admin/UsersManagement";
import DepartmentsManagement from "./pages/admin/DepartmentsManagement";
import CostCentersManagement from "./pages/admin/CostCentersManagement";
import ApprovalMatrixPage from "./pages/admin/ApprovalMatrixPage";
import MaterialCategoriesManagement from "./pages/admin/MaterialCategoriesManagement";
import VendorsPage from "./pages/vendors/VendorsPage";
import NewVendorPage from "./pages/vendors/NewVendorPage";
import VendorDetailPage from "./pages/vendors/VendorDetailPage";
import EditVendorPage from "./pages/vendors/EditVendorPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import NewProjectPage from "./pages/projects/NewProjectPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import EditProjectPage from "./pages/projects/EditProjectPage";
import ProcurementPage from "./pages/procurement/ProcurementPage";
import NewRFIPage from "./pages/procurement/rfi/NewRFIPage";
import RFIDetailPage from "./pages/procurement/rfi/RFIDetailPage";
import NewRFQPage from "./pages/procurement/rfq/NewRFQPage";
import RFQDetailPage from "./pages/procurement/rfq/RFQDetailPage";
import NewPRPage from "./pages/procurement/pr/NewPRPage";
import PRDetailPage from "./pages/procurement/pr/PRDetailPage";
import NewPOPage from "./pages/procurement/po/NewPOPage";
import PODetailPage from "./pages/procurement/po/PODetailPage";
import AIOfferAnalysisPage from "./pages/procurement/ai/AIOfferAnalysisPage";
import AIMarketAnalysisPage from "./pages/procurement/ai/AIMarketAnalysisPage";
import PettyCashPage from "./pages/procurement/petty-cash/PettyCashPage";
import NewPettyCashPage from "./pages/procurement/petty-cash/NewPettyCashPage";
import PettyCashDetailPage from "./pages/procurement/petty-cash/PettyCashDetailPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import NewMaterialPage from "./pages/inventory/NewMaterialPage";
import MaterialDetailPage from "./pages/inventory/MaterialDetailPage";
import EditMaterialPage from "./pages/inventory/EditMaterialPage";
import StockAdjustmentPage from "./pages/inventory/StockAdjustmentPage";
import GoodsReceiptPage from "./pages/inventory/GoodsReceiptPage";
import InstallApp from "./pages/InstallApp";
import NotFound from "./pages/NotFound";
import ApprovalsPage from "./pages/approvals/ApprovalsPage";
import QuotationSubmissionPage from "./pages/vendor-portal/QuotationSubmissionPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          <CompanyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              {/* Public vendor portal - no auth required */}
              <Route path="/vendor-portal/quotation" element={<QuotationSubmissionPage />} />
              <Route path="/install" element={<InstallApp />} />
              <Route
                path="/trial-expired"
                element={
                  <ProtectedRoute>
                    <TrialExpired />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute>
                    <ApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <UsersManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DepartmentsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cost-centers"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CostCentersManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/approval-matrix"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ApprovalMatrixPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/material-categories"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MaterialCategoriesManagement />
                  </ProtectedRoute>
                }
              />
              {/* Project routes */}
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute>
                    <NewProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditProjectPage />
                  </ProtectedRoute>
                }
              />
              {/* Inventory routes */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/new"
                element={
                  <ProtectedRoute>
                    <NewMaterialPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/:id"
                element={
                  <ProtectedRoute>
                    <MaterialDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditMaterialPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/adjustment"
                element={
                  <ProtectedRoute>
                    <StockAdjustmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/receipt/new"
                element={
                  <ProtectedRoute>
                    <GoodsReceiptPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors"
                element={
                  <ProtectedRoute>
                    <VendorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors/new"
                element={
                  <ProtectedRoute>
                    <NewVendorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors/:id"
                element={
                  <ProtectedRoute>
                    <VendorDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditVendorPage />
                  </ProtectedRoute>
                }
              />
              {/* Procurement routes */}
              <Route
                path="/procurement"
                element={
                  <ProtectedRoute>
                    <ProcurementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/rfi/new"
                element={
                  <ProtectedRoute>
                    <NewRFIPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/rfi/:id"
                element={
                  <ProtectedRoute>
                    <RFIDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/rfq/new"
                element={
                  <ProtectedRoute>
                    <NewRFQPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/rfq/:id"
                element={
                  <ProtectedRoute>
                    <RFQDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/pr/new"
                element={
                  <ProtectedRoute>
                    <NewPRPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/pr/:id"
                element={
                  <ProtectedRoute>
                    <PRDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/po/new"
                element={
                  <ProtectedRoute>
                    <NewPOPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/po/:id"
                element={
                  <ProtectedRoute>
                    <PODetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/ai/offer-analysis"
                element={
                  <ProtectedRoute>
                    <AIOfferAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/ai/market-analysis"
                element={
                  <ProtectedRoute>
                    <AIMarketAnalysisPage />
                  </ProtectedRoute>
                }
              />
              {/* Petty Cash routes */}
              <Route
                path="/procurement/petty-cash"
                element={
                  <ProtectedRoute>
                    <PettyCashPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/petty-cash/new"
                element={
                  <ProtectedRoute>
                    <NewPettyCashPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procurement/petty-cash/:id"
                element={
                  <ProtectedRoute>
                    <PettyCashDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports-centre"
                element={
                  <ProtectedRoute>
                    <ReportsCentrePage />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <QuickActionWidget />
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
