import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useSessionBootstrap,
  type BootstrapOutcome
} from "@/hooks/useSessionBootstrap";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LogoLoader } from "@/components/LogoLoader";
import { useAuthStore } from "@/store/authStore";
import { AppShell } from "@/layouts/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import SessionsPage from "@/pages/SessionsPage";
import ClientsPage from "@/pages/ClientsPage";
import BookingsPage from "@/pages/BookingsPage";
import UploadsPage from "@/pages/UploadsPage";
import DownloadsPage from "@/pages/DownloadsPage";
import SettingsPage from "@/pages/SettingsPage";
import CmsPage from "@/pages/CmsPage";
import StudioPage from "@/pages/StudioPage";
import HomePageManager from "@/pages/cms/HomePageManager";
import CategoryPagesManager from "@/pages/cms/CategoryPagesManager";
import FooterPageManager from "@/pages/cms/FooterPageManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000
    }
  }
});

function AppRoutes() {
  const { checking, outcome } = useSessionBootstrap();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <LogoLoader />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute bootstrapOutcome={outcome} />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ShellRoutes />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function ShellRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/studio" element={<StudioPage />} />
        {/* Specific CMS routes must precede the :pageKey wildcard below. */}
        <Route path="/cms" element={<Navigate to="/cms/home" replace />} />
        <Route path="/cms/home" element={<HomePageManager />} />
        <Route path="/cms/footer" element={<FooterPageManager />} />
        <Route path="/cms/categories" element={<Navigate to="/cms/categories/weddings" replace />} />
        <Route path="/cms/categories/:categoryId" element={<CategoryPagesManager />} />
        <Route path="/cms/pages" element={<CmsPage />} />
        <Route path="/cms/:pageKey" element={<CmsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function LoginRoute({
  bootstrapOutcome
}: {
  bootstrapOutcome: BootstrapOutcome | null;
}) {
  const status = useAuthStore((s) => s.status);
  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }
  // Passed through so the page can explain an unreachable server rather than
  // presenting an unexplained sign-in form.
  return <LoginPage bootstrapOutcome={bootstrapOutcome} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
