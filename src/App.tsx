import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { StagingQueueProvider } from "@/contexts/StagingQueueContext";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Candidates from "./pages/Candidates";
import CandidateProfile from "./pages/CandidateProfile";
import Roles from "./pages/Roles";
import ROIDashboard from "./pages/ROIDashboard";
import BatchUpload from "./pages/BatchUpload";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <StagingQueueProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/analyze" element={<Index />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/candidates/:id" element={<CandidateProfile />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/roi" element={<ROIDashboard />} />
              <Route path="/batch" element={<BatchUpload />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StagingQueueProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
export default App;
