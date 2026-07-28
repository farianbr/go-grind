import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router";
import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";

// Entry routes stay in the main chunk so the first paint needs no extra request.
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";

// Everything behind auth is split out. The Stream chat and video SDKs are the
// bulk of the bundle and are only needed on the chat and call routes.
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const FocusPage = lazy(() => import("./pages/FocusPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const CallPage = lazy(() => import("./pages/CallPage.jsx"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.jsx"));
const UpdateProfilePage = lazy(() => import("./pages/UpdateProfilePage.jsx"));
const ChatsPage = lazy(() => import("./pages/ChatsPage.jsx"));
const FriendsPage = lazy(() => import("./pages/FriendsPage.jsx"));
const RoomsPage = lazy(() => import("./pages/RoomsPage.jsx"));
const RoomDetailPage = lazy(() => import("./pages/RoomDetailPage.jsx"));
const StreamRoomPage = lazy(() => import("./pages/StreamRoomPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const LegalPage = lazy(() => import("./pages/LegalPage.jsx"));
const TeamsPage = lazy(() => import("./pages/TeamsPage.jsx"));
const TeamDetailPage = lazy(() => import("./pages/TeamDetailPage.jsx"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));

// Only same-origin paths, so `?next=` can never be pointed at another site.
const safeNext = (value) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();
  const [searchParams] = useSearchParams();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  if (isLoading) return <PageLoader />;

  // Signed in and onboarded -> render it. Otherwise send them where they need
  // to go, rather than assuming everyone belongs at /login.
  const guard = (element, { withSidebar = true } = {}) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isOnboarded) return <Navigate to="/onboarding" replace />;
    return withSidebar ? <Layout showSidebar>{element}</Layout> : element;
  };

  // Signing in lands you where you were headed. "Take a desk" on the landing
  // page means the session page, not the dashboard.
  const publicOnly = (element) =>
    isAuthenticated ? (
      <Navigate
        to={isOnboarded ? safeNext(searchParams.get("next")) ?? "/" : "/onboarding"}
        replace
      />
    ) : (
      element
    );

  return (
    <div className="min-h-screen" data-theme={theme}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Anonymous visitors get a real front door, not a password field. */}
            <Route
              path="/"
              element={
                isAuthenticated && isOnboarded ? (
                  <Layout showSidebar>
                    <HomePage />
                  </Layout>
                ) : isAuthenticated ? (
                  <Navigate to="/onboarding" replace />
                ) : (
                  <LandingPage />
                )
              }
            />

            <Route path="/signup" element={publicOnly(<SignUpPage />)} />
            <Route path="/login" element={publicOnly(<LoginPage />)} />
            <Route path="/terms" element={<LegalPage kind="terms" />} />
            <Route path="/privacy" element={<LegalPage kind="privacy" />} />

            <Route path="/focus" element={guard(<FocusPage />)} />
            <Route path="/teams" element={guard(<TeamsPage />)} />
            <Route path="/teams/:id" element={guard(<TeamDetailPage />)} />
            <Route path="/invite/:token" element={guard(<InviteAcceptPage />)} />
            <Route path="/friends" element={guard(<FriendsPage />)} />
            <Route path="/rooms" element={guard(<RoomsPage />)} />
            <Route path="/rooms/:id" element={guard(<RoomDetailPage />)} />
            <Route
              path="/rooms/:id/stream"
              element={guard(<StreamRoomPage />)}
            />
            <Route path="/chats" element={guard(<ChatsPage />)} />
            <Route path="/chats/:id" element={guard(<ChatsPage />)} />
            <Route
              path="/notifications"
              element={guard(<NotificationsPage />)}
            />
            <Route path="/settings" element={guard(<SettingsPage />)} />
            <Route path="/profile" element={guard(<ProfilePage />)} />
            <Route path="/profile/:userId" element={guard(<ProfilePage />)} />
            <Route
              path="/call/:id"
              element={guard(<CallPage />, { withSidebar: false })}
            />

            <Route
              path="/onboarding"
              element={
                isAuthenticated ? (
                  !isOnboarded ? (
                    <OnboardingPage />
                  ) : (
                    <Navigate to="/" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/update-profile"
              element={
                isAuthenticated ? (
                  <UpdateProfilePage />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toaster />
    </div>
  );
};

export default App;
