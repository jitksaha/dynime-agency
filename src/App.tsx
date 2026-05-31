import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { LocationProvider } from "@/contexts/LocationContext";
import "@/i18n";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import DynamicFavicon from "@/components/shared/DynamicFavicon";
import ProductUrlInterceptor from "@/components/shared/ProductUrlInterceptor";
import LiveChatEmbed from "@/components/shared/LiveChatEmbed";
import { useHashScroll } from "@/hooks/use-hash-scroll";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

const HashScroll = () => {
  useHashScroll();
  return null;
};

const RealtimeSync = () => {
  useRealtimeSync();
  return null;
};

const LegacyServiceRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/${slug}` : "/services"} replace />;
};

// Eager: home page (LCP) only
import Index from "./pages/Index.tsx";

// Lazy: every other route — keeps initial bundle small
const About = lazy(() => import("./pages/About.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const ServicesPricing = lazy(() => import("./pages/ServicesPricing.tsx"));
const ServicesDss = lazy(() => import("./pages/ServicesDss.tsx"));
const ProductDbm = lazy(() => import("./pages/ProductDbm.tsx"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail.tsx"));
const Portfolio = lazy(() => import("./pages/Portfolio.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const BlogTaxonomy = lazy(() => import("./pages/BlogTaxonomy.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Careers = lazy(() => import("./pages/Careers.tsx"));
const CareerDetail = lazy(() => import("./pages/CareerDetail.tsx"));
const OrderHistory = lazy(() => import("./pages/OrderHistory.tsx"));
const AccountLogin = lazy(() => import("./pages/account/AccountLogin.tsx"));
const ResetPassword = lazy(() => import("./pages/account/ResetPassword.tsx"));
const AccountDashboard = lazy(() => import("./pages/account/AccountDashboard.tsx"));
const AccountOrders = lazy(() => import("./pages/account/AccountOrders.tsx"));
const AccountServices = lazy(() => import("./pages/account/AccountServices.tsx"));
const AccountInvoices = lazy(() => import("./pages/account/AccountInvoices.tsx"));
const AccountMilestones = lazy(() => import("./pages/account/AccountMilestones.tsx"));
const AccountProfile = lazy(() => import("./pages/account/AccountProfile.tsx"));
const AccountTracking = lazy(() => import("./pages/account/AccountTracking.tsx"));
const AccountRecurring = lazy(() => import("./pages/account/AccountRecurring.tsx"));
const AccountFormation = lazy(() => import("./pages/account/AccountFormation.tsx"));
const AccountCompliance = lazy(() => import("./pages/account/AccountCompliance.tsx"));
const AccountTickets = lazy(() => import("./pages/account/AccountTickets.tsx"));
const AccountTicketDetail = lazy(() => import("./pages/account/AccountTicketDetail.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Invoice = lazy(() => import("./pages/Invoice.tsx"));
const Agreement = lazy(() => import("./pages/Agreement.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const DynamicPage = lazy(() => import("./pages/DynamicPage.tsx"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus.tsx"));
const TrackOrder = lazy(() => import("./pages/TrackOrder.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const USAFormation = lazy(() => import("./pages/USAFormation.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const PayOpenSource = lazy(() => import("./pages/PayOpenSource.tsx"));
const Verify = lazy(() => import("./pages/Verify.tsx"));
const Invest = lazy(() => import("./pages/Invest.tsx"));
const InvestApply = lazy(() => import("./pages/InvestApply.tsx"));
const InvestorRelations = lazy(() => import("./pages/InvestorRelations.tsx"));
const FlexPay = lazy(() => import("./pages/FlexPay.tsx"));
const FlexPayApply = lazy(() => import("./pages/FlexPayApply.tsx"));
const AccountFlexPay = lazy(() => import("./pages/account/AccountFlexPay.tsx"));
const FlexPayReceipt = lazy(() => import("./pages/account/FlexPayReceipt.tsx"));
const AdminFlexPay = lazy(() => import("./pages/superadmin/AdminFlexPay.tsx"));

// Investor Portal (lazy)
const InvestorLogin = lazy(() => import("./pages/investor-portal/InvestorLogin.tsx"));
const InvestorDashboard = lazy(() => import("./pages/investor-portal/InvestorDashboard.tsx"));
const InvestorAgreements = lazy(() => import("./pages/investor-portal/InvestorAgreements.tsx"));
const InvestorStatements = lazy(() => import("./pages/investor-portal/InvestorStatements.tsx"));
const InvestorWithdrawals = lazy(() => import("./pages/investor-portal/InvestorWithdrawals.tsx"));
const InvestorProfile = lazy(() => import("./pages/investor-portal/InvestorProfile.tsx"));
import InvestorProtectedRoute from "@/components/investor/InvestorProtectedRoute";

// Super Admin (lazy — never loaded for normal visitors)
const SuperAdminLogin = lazy(() => import("./pages/superadmin/SuperAdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminContactInfo = lazy(() => import("./pages/admin/AdminContactInfo.tsx"));
const AdminFormBuilder = lazy(() => import("./pages/admin/AdminFormBuilder.tsx"));
const AdminSubmissions = lazy(() => import("./pages/admin/AdminSubmissions.tsx"));
const AdminInbox = lazy(() => import("./pages/admin/AdminInbox.tsx"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminTaxSettings = lazy(() => import("./pages/superadmin/AdminTaxSettings.tsx"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages.tsx"));
const PageEditor = lazy(() => import("./pages/admin/PageEditor.tsx"));
const AdminSEO = lazy(() => import("./pages/admin/AdminSEO.tsx"));
const AdminPortfolio = lazy(() => import("./pages/admin/AdminPortfolio.tsx"));
const AdminOrders = lazy(() => import("./pages/superadmin/AdminOrders.tsx"));
const AdminOrderNew = lazy(() => import("./pages/superadmin/AdminOrderNew.tsx"));
const AdminOrderDetail = lazy(() => import("./pages/superadmin/AdminOrderDetail.tsx"));
const AdminAgreementBuilder = lazy(() => import("./pages/superadmin/AdminAgreementBuilder.tsx"));
const PaymentGateways = lazy(() => import("./pages/superadmin/PaymentGateways.tsx"));
const AdminTeam = lazy(() => import("./pages/superadmin/AdminTeam.tsx"));
const AdminTeamSection = lazy(() => import("./pages/superadmin/AdminTeamSection.tsx"));
const AdminAboutTimeline = lazy(() => import("./pages/superadmin/AdminAboutTimeline.tsx"));
const AdminCoupons = lazy(() => import("./pages/superadmin/AdminCoupons.tsx"));
const AdminHeaderFooter = lazy(() => import("./pages/admin/AdminHeaderFooter.tsx"));
const AdminPricing = lazy(() => import("./pages/superadmin/AdminPricing.tsx"));
const AdminSubscribers = lazy(() => import("./pages/superadmin/AdminSubscribers.tsx"));
const AdminInvestLeads = lazy(() => import("./pages/superadmin/AdminInvestLeads.tsx"));
const AdminInvestmentPlans = lazy(() => import("./pages/superadmin/AdminInvestmentPlans.tsx"));
const AdminInvestors = lazy(() => import("./pages/superadmin/AdminInvestors.tsx"));
const AdminCareers = lazy(() => import("./pages/superadmin/AdminCareers.tsx"));
const AdminJobApplications = lazy(() => import("./pages/superadmin/AdminJobApplications.tsx"));
const AdminSocialLinks = lazy(() => import("./pages/superadmin/AdminSocialLinks.tsx"));
const AdminBrandTone = lazy(() => import("./pages/superadmin/AdminBrandTone.tsx"));
const AdminPageSEO = lazy(() => import("./pages/superadmin/AdminPageSEO.tsx"));
const AdminSeoRules = lazy(() => import("./pages/superadmin/AdminSeoRules.tsx"));
const AdminUSAStatePricing = lazy(() => import("./pages/superadmin/AdminUSAStatePricing.tsx"));
const AdminBlog = lazy(() => import("./pages/superadmin/AdminBlog.tsx"));
const AdminNotifications = lazy(() => import("./pages/superadmin/AdminNotifications.tsx"));
const AdminEmailPortal = lazy(() => import("./pages/superadmin/AdminEmailPortal.tsx"));
const AdminCountryEligibility = lazy(() => import("./pages/superadmin/AdminCountryEligibility.tsx"));
const AdminCustomerServices = lazy(() => import("./pages/superadmin/AdminCustomerServices.tsx"));
const SearchConsole = lazy(() => import("./pages/superadmin/SearchConsole.tsx"));
const OgValidator = lazy(() => import("./pages/superadmin/OgValidator.tsx"));
const SeoHub = lazy(() => import("./pages/superadmin/SeoHub.tsx"));
const SeoDashboard = lazy(() => import("./pages/superadmin/SeoDashboard.tsx"));
const KeywordTracker = lazy(() => import("./pages/superadmin/KeywordTracker.tsx"));
const SeoIntegrations = lazy(() => import("./pages/superadmin/SeoIntegrations.tsx"));
const AdminProductUrls = lazy(() => import("./pages/superadmin/AdminProductUrls.tsx"));
const AdminIdCards = lazy(() => import("./pages/superadmin/AdminIdCards.tsx"));
const AdminEmployees = lazy(() => import("./pages/superadmin/AdminEmployees.tsx"));
const AdminHR = lazy(() => import("./pages/superadmin/AdminHR.tsx"));
const AdminHRRequests = lazy(() => import("./pages/superadmin/AdminHRRequests.tsx"));
const AdminCrmDashboard = lazy(() => import("./pages/superadmin/crm/AdminCrmDashboard.tsx"));
const AdminCrmLeads = lazy(() => import("./pages/superadmin/crm/AdminCrmLeads.tsx"));
const AdminCrmPipeline = lazy(() => import("./pages/superadmin/crm/AdminCrmPipeline.tsx"));
const AdminCrmActivities = lazy(() => import("./pages/superadmin/crm/AdminCrmActivities.tsx"));
const AdminCrmAutomations = lazy(() => import("./pages/superadmin/crm/AdminCrmAutomations.tsx"));
const AdminCrmAutomationEditor = lazy(() => import("./pages/superadmin/crm/AdminCrmAutomationEditor.tsx"));
const AdminCrmEmailTemplates = lazy(() => import("./pages/superadmin/crm/AdminCrmEmailTemplates.tsx"));

const AdminHRExtras = lazy(() => import("./pages/superadmin/AdminHRExtras.tsx"));
const AdminPayroll = lazy(() => import("./pages/superadmin/AdminPayroll.tsx"));
const AdminFxOrders = lazy(() => import("./pages/superadmin/AdminFxOrders.tsx"));
const AdminKyc = lazy(() => import("./pages/superadmin/AdminKyc.tsx"));
const AdminKyb = lazy(() => import("./pages/superadmin/AdminKyb.tsx"));
const AdminCredit = lazy(() => import("./pages/superadmin/AdminCredit.tsx"));
const AccountVerification = lazy(() => import("./pages/account/AccountVerification.tsx"));

// Employee Portal
const EmployeeLogin = lazy(() => import("./pages/employee/EmployeeLogin.tsx"));
const EmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboard.tsx"));
const EmployeeDocuments = lazy(() => import("./pages/employee/EmployeeDocuments.tsx"));
const EmployeeRequests = lazy(() => import("./pages/employee/EmployeeRequests.tsx"));
const EmployeeProfile = lazy(() => import("./pages/employee/EmployeeProfile.tsx"));
import EmployeeProtectedRoute from "@/components/employee/EmployeeProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false, trickleSpeed: 80, minimum: 0.2, easing: "ease", speed: 300 });

// Route-level fallback: NProgress drives the loading UX, so we render nothing
// instead of a full-page spinner. This eliminates the "double loading" flash
// (spinner + top bar) and lets the new page paint as soon as it's ready.
const RouteFallback = () => {
  useEffect(() => {
    NProgress.start();
    return () => {
      NProgress.done();
    };
  }, []);
  return null;
};

// Apple-style route transition: subtle fade + lift + de-blur on every
// navigation. Keyed by pathname so React remounts the wrapper and the
// CSS animation re-runs.
const RouteTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="route-enter">
      {children}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <LocationProvider>
          <ThemeProvider>
            <TooltipProvider>
              <RealtimeSync />
              <DynamicFavicon />
              <ProductUrlInterceptor />
              <LiveChatEmbed />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                  <ScrollToTop />
                  <HashScroll />
                  
                  <Suspense fallback={<RouteFallback />}>
                  <RouteTransition>
                  <Routes>
                    {/* Public */}
                    <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services-pricing" element={<ServicesPricing />} />
                  <Route path="/pricing" element={<Navigate to="/services-pricing" replace />} />
                  <Route path="/services/dss" element={<ServicesDss />} />
                  <Route path="/products/os" element={<ProductDbm />} />
                  <Route path="/products/dbm" element={<Navigate to="/products/os" replace />} />
                  <Route path="/services/:slug" element={<LegacyServiceRedirect />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/category/:slug" element={<BlogTaxonomy mode="category" />} />
                  <Route path="/blog/tag/:slug" element={<BlogTaxonomy mode="tag" />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  
                  <Route path="/orders" element={<OrderHistory />} />
                  {/* Customer Account Portal */}
                  <Route path="/account/login" element={<AccountLogin />} />
                  <Route path="/account/reset-password" element={<ResetPassword />} />
                  <Route path="/account" element={<AccountDashboard />} />
                  <Route path="/account/orders" element={<AccountOrders />} />
                  <Route path="/account/tracking" element={<AccountTracking />} />
                  <Route path="/account/services" element={<AccountServices />} />
                  <Route path="/account/services/recurring" element={<AccountRecurring />} />
                  <Route path="/account/compliance" element={<AccountCompliance />} />
                  <Route path="/account/services/formation" element={<AccountFormation />} />
                  <Route path="/account/invoices" element={<AccountInvoices />} />
                  <Route path="/account/milestones" element={<AccountMilestones />} />
                  <Route path="/account/profile" element={<AccountProfile />} />
                  <Route path="/account/tickets" element={<AccountTickets />} />
                  <Route path="/account/tickets/:id" element={<AccountTicketDetail />} />
                  <Route path="/account/verification" element={<AccountVerification />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/invoice/:id" element={<Invoice />} />
                  <Route path="/invoice/*" element={<Invoice />} />
                  <Route path="/i/:id" element={<Invoice />} />
                  <Route path="/i/*" element={<Invoice />} />
                  <Route path="/agreement/:id" element={<Agreement />} />
                  <Route path="/agreement/*" element={<Agreement />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/careers/:slug" element={<CareerDetail />} />
                  <Route path="/page/:slug" element={<DynamicPage />} />
                  <Route path="/usa-business-formation" element={<USAFormation />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                 <Route path="/pay-open-source" element={<PayOpenSource />} />
                 <Route path="/verify" element={<Verify />} />
                  <Route path="/invest" element={<Invest />} />
                  <Route path="/shareholders" element={<Invest />} />
                  <Route path="/invest/apply" element={<InvestApply />} />
                  <Route path="/investor-relations" element={<InvestorRelations />} />
                  <Route path="/ir" element={<InvestorRelations />} />
                  <Route path="/flexpay" element={<FlexPay />} />
                  <Route path="/flexpay/apply" element={<FlexPayApply />} />
                  <Route path="/account/flexpay" element={<AccountFlexPay />} />
                  <Route path="/account/flexpay/receipt/:id" element={<FlexPayReceipt />} />
                  <Route path="/superadmin/flexpay" element={<ProtectedRoute><AdminFlexPay /></ProtectedRoute>} />

                  {/* Investor Portal */}
                  <Route path="/investor/login" element={<InvestorLogin />} />
                  <Route path="/investor" element={<InvestorProtectedRoute><InvestorDashboard /></InvestorProtectedRoute>} />
                  <Route path="/investor/agreements" element={<InvestorProtectedRoute><InvestorAgreements /></InvestorProtectedRoute>} />
                  <Route path="/investor/statements" element={<InvestorProtectedRoute><InvestorStatements /></InvestorProtectedRoute>} />
                  <Route path="/investor/withdrawals" element={<InvestorProtectedRoute><InvestorWithdrawals /></InvestorProtectedRoute>} />
                  <Route path="/investor/profile" element={<InvestorProtectedRoute><InvestorProfile /></InvestorProtectedRoute>} />
                  {/* Legacy redirects: old /investor-portal/* paths */}
                  <Route path="/investor-portal" element={<Navigate to="/investor" replace />} />
                  <Route path="/investor-portal/*" element={<Navigate to="/investor" replace />} />

                  {/* Employee Portal */}
                  <Route path="/employee/login" element={<EmployeeLogin />} />
                  <Route path="/employee" element={<EmployeeProtectedRoute><EmployeeDashboard /></EmployeeProtectedRoute>} />
                  <Route path="/employee/documents" element={<EmployeeProtectedRoute><EmployeeDocuments /></EmployeeProtectedRoute>} />
                  <Route path="/employee/requests" element={<EmployeeProtectedRoute><EmployeeRequests /></EmployeeProtectedRoute>} />
                  <Route path="/employee/profile" element={<EmployeeProtectedRoute><EmployeeProfile /></EmployeeProtectedRoute>} />

                  <Route path="/payment/status/:sessionId" element={<PaymentStatus />} />
                  <Route path="/track" element={<TrackOrder />} />
                  <Route path="/track/:ref" element={<TrackOrder />} />

                  {/* Legal */}
                  <Route path="/privacy" element={<Legal docKey="privacy" />} />
                  <Route path="/terms" element={<Legal docKey="terms" />} />
                  <Route path="/refund" element={<Legal docKey="refund" />} />
                  <Route path="/cookies" element={<Legal docKey="cookies" />} />
                  <Route path="/aml" element={<Legal docKey="aml" />} />
                  <Route path="/compliance" element={<Legal docKey="aml" />} />
                  <Route path="/payments" element={<Legal docKey="payments" />} />
                  <Route path="/support" element={<Legal docKey="support" />} />
                  <Route path="/acceptable-use" element={<Legal docKey="acceptable-use" />} />
                  <Route path="/legal/:slug" element={<Legal />} />

                  {/* Super Admin */}
                  <Route path="/superadmin/login" element={<SuperAdminLogin />} />
                  <Route path="/superadmin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/superadmin/contact-info" element={<ProtectedRoute><AdminContactInfo /></ProtectedRoute>} />
                  <Route path="/superadmin/forms" element={<ProtectedRoute><AdminFormBuilder /></ProtectedRoute>} />
                  <Route path="/superadmin/submissions" element={<ProtectedRoute><AdminSubmissions /></ProtectedRoute>} />
                  <Route path="/superadmin/inbox" element={<ProtectedRoute><AdminInbox /></ProtectedRoute>} />
                  <Route path="/superadmin/chat" element={<ProtectedRoute><AdminChat /></ProtectedRoute>} />
                  <Route path="/superadmin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                  <Route path="/superadmin/tax-settings" element={<ProtectedRoute><AdminTaxSettings /></ProtectedRoute>} />
                  <Route path="/superadmin/payment-gateways" element={<ProtectedRoute><PaymentGateways /></ProtectedRoute>} />
                  <Route path="/superadmin/pages" element={<ProtectedRoute><AdminPages /></ProtectedRoute>} />
                  <Route path="/superadmin/pages/:id" element={<ProtectedRoute><PageEditor /></ProtectedRoute>} />
                  <Route path="/superadmin/seo" element={<ProtectedRoute><AdminSEO /></ProtectedRoute>} />
                  <Route path="/superadmin/page-seo" element={<ProtectedRoute><AdminPageSEO /></ProtectedRoute>} />
                  <Route path="/superadmin/seo-rules" element={<ProtectedRoute><AdminSeoRules /></ProtectedRoute>} />
                  <Route path="/superadmin/search-console" element={<ProtectedRoute><SearchConsole /></ProtectedRoute>} />
                  <Route path="/superadmin/og-validator" element={<ProtectedRoute><OgValidator /></ProtectedRoute>} />
                  <Route path="/superadmin/seo-hub" element={<ProtectedRoute><SeoHub /></ProtectedRoute>} />
                  <Route path="/superadmin/seo-dashboard" element={<ProtectedRoute><SeoDashboard /></ProtectedRoute>} />
                  <Route path="/superadmin/keyword-tracker" element={<ProtectedRoute><KeywordTracker /></ProtectedRoute>} />
                  <Route path="/superadmin/seo-integrations" element={<ProtectedRoute><SeoIntegrations /></ProtectedRoute>} />
                  <Route path="/superadmin/product-urls" element={<ProtectedRoute><AdminProductUrls /></ProtectedRoute>} />
                  <Route path="/superadmin/portfolio" element={<ProtectedRoute><AdminPortfolio /></ProtectedRoute>} />
                  
                  <Route path="/superadmin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
                  <Route path="/superadmin/orders/new" element={<ProtectedRoute><AdminOrderNew /></ProtectedRoute>} />
                  <Route path="/superadmin/orders/:id/edit" element={<ProtectedRoute><AdminOrderNew mode="edit" /></ProtectedRoute>} />
                  <Route path="/superadmin/orders/:id" element={<ProtectedRoute><AdminOrderDetail /></ProtectedRoute>} />
                  <Route path="/superadmin/agreement-builder" element={<ProtectedRoute><AdminAgreementBuilder /></ProtectedRoute>} />
                  <Route path="/superadmin/fx-orders" element={<ProtectedRoute><AdminFxOrders /></ProtectedRoute>} />
                  <Route path="/superadmin/kyc" element={<ProtectedRoute><AdminKyc /></ProtectedRoute>} />
                  <Route path="/superadmin/kyb" element={<ProtectedRoute><AdminKyb /></ProtectedRoute>} />
                  <Route path="/superadmin/credit" element={<ProtectedRoute><AdminCredit /></ProtectedRoute>} />
                  <Route path="/superadmin/customer-services" element={<ProtectedRoute><AdminCustomerServices /></ProtectedRoute>} />
                  <Route path="/superadmin/team" element={<ProtectedRoute><AdminTeam /></ProtectedRoute>} />
                  <Route path="/superadmin/team-section" element={<ProtectedRoute><AdminTeamSection /></ProtectedRoute>} />
                  <Route path="/superadmin/id-cards" element={<ProtectedRoute><AdminIdCards /></ProtectedRoute>} />
                  <Route path="/superadmin/employees" element={<ProtectedRoute><AdminEmployees /></ProtectedRoute>} />
                  <Route path="/superadmin/hr" element={<ProtectedRoute><AdminHR /></ProtectedRoute>} />
                  <Route path="/superadmin/hr-requests" element={<ProtectedRoute><AdminHRRequests /></ProtectedRoute>} />
                  <Route path="/superadmin/about-timeline" element={<ProtectedRoute><AdminAboutTimeline /></ProtectedRoute>} />
                  <Route path="/superadmin/coupons" element={<ProtectedRoute><AdminCoupons /></ProtectedRoute>} />
                  <Route path="/superadmin/header-footer" element={<ProtectedRoute><AdminHeaderFooter /></ProtectedRoute>} />
                  <Route path="/superadmin/pricing" element={<ProtectedRoute><AdminPricing /></ProtectedRoute>} />
                  <Route path="/superadmin/usa-state-pricing" element={<ProtectedRoute><AdminUSAStatePricing /></ProtectedRoute>} />
                  <Route path="/superadmin/subscribers" element={<ProtectedRoute><AdminSubscribers /></ProtectedRoute>} />
                  <Route path="/superadmin/invest-leads" element={<ProtectedRoute><AdminInvestLeads /></ProtectedRoute>} />
                  <Route path="/superadmin/investment-plans" element={<ProtectedRoute><AdminInvestmentPlans /></ProtectedRoute>} />
                  <Route path="/superadmin/investors" element={<ProtectedRoute><AdminInvestors /></ProtectedRoute>} />
                  <Route path="/superadmin/careers" element={<ProtectedRoute><AdminCareers /></ProtectedRoute>} />
                  <Route path="/superadmin/careers/applications" element={<ProtectedRoute><AdminJobApplications /></ProtectedRoute>} />
                  <Route path="/superadmin/social-links" element={<ProtectedRoute><AdminSocialLinks /></ProtectedRoute>} />
                  <Route path="/superadmin/brand-tone" element={<ProtectedRoute><AdminBrandTone /></ProtectedRoute>} />
                  <Route path="/superadmin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
                  <Route path="/superadmin/notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
                  <Route path="/superadmin/email-portal" element={<ProtectedRoute><AdminEmailPortal /></ProtectedRoute>} />
                  <Route path="/superadmin/country-eligibility" element={<ProtectedRoute><AdminCountryEligibility /></ProtectedRoute>} />

                  {/* Legacy admin redirects */}
                  <Route path="/admin/*" element={<NotFound />} />

                  {/* Dynamic service pages */}
                  <Route path="/superadmin/crm" element={<ProtectedRoute><AdminCrmDashboard /></ProtectedRoute>} />
                  <Route path="/superadmin/crm/leads" element={<ProtectedRoute><AdminCrmLeads /></ProtectedRoute>} />
                  <Route path="/superadmin/crm/pipeline" element={<ProtectedRoute><AdminCrmPipeline /></ProtectedRoute>} />
                  <Route path="/superadmin/crm/activities" element={<ProtectedRoute><AdminCrmActivities /></ProtectedRoute>} />
                  <Route path="/superadmin/crm/automations" element={<ProtectedRoute><AdminCrmAutomations /></ProtectedRoute>} />
                  <Route path="/superadmin/crm/automations/:id" element={<ProtectedRoute><AdminCrmAutomationEditor /></ProtectedRoute>} />
                  <Route path="/superadmin/crm/email-templates" element={<ProtectedRoute><AdminCrmEmailTemplates /></ProtectedRoute>} />
                  
                  <Route path="/superadmin/hr-extras" element={<ProtectedRoute><AdminHRExtras /></ProtectedRoute>} />
                  <Route path="/superadmin/payroll" element={<ProtectedRoute><AdminPayroll /></ProtectedRoute>} />

                  {/* Dynamic service pages */}
                  <Route path="/:slug" element={<ServiceDetail />} />

                  <Route path="*" element={<NotFound />} />
                  </Routes>
                  </RouteTransition>
                  </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
          </LocationProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
