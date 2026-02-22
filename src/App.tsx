import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { StagingQueueProvider } from "@/contexts/StagingQueueContext";
import WavesLoader from "@/components/WavesLoader";

// Eagerly load Home (landing page)
import Home from "./pages/Home";

// Lazy load all other pages
const Index = lazy(() => import("./pages/Index"));
const Candidates = lazy(() => import("./pages/Candidates"));
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"));
const Roles = lazy(() => import("./pages/Roles"));
const ROIDashboard = lazy(() => import("./pages/ROIDashboard"));
const CandidateRecommendations = lazy(() => import("./pages/CandidateRecommendations"));
const ExternalProfileView = lazy(() => import("./pages/ExternalProfileView"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min default stale time
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <WavesLoader size="md" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <StagingQueueProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/analyze" element={<Index />} />
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/candidates/:id" element={<CandidateProfile />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/roi" element={<ROIDashboard />} />
                <Route path="/candidate-recommendations" element={<CandidateRecommendations />} />
                <Route path="/external-profiles/:id" element={<ExternalProfileView />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </StagingQueueProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
export default App;
