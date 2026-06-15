import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { LangProvider } from "@/lib/i18n";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setBaseUrl } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import MovieDetail from "@/pages/MovieDetail";
import Watchlists from "@/pages/Watchlists";
import RandomPick from "@/pages/RandomPick";
import Friends from "@/pages/Friends";
import FriendProfile from "@/pages/FriendProfile";
import Profile from "@/pages/Profile";
import Recommendations from "@/pages/Recommendations";
import Notifications from "@/pages/Notifications";
import ActorDetail from "@/pages/ActorDetail";

const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) setBaseUrl(apiBase);

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <Route {...rest}>
      {!isLoaded ? null : isSignedIn ? (
        <AppLayout>
          <Component />
        </AppLayout>
      ) : (
        <Redirect to="/login" />
      )}
    </Route>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/home" />;
  return <Landing />;
}

function AuthCacheSync() {
  const { isSignedIn } = useAuth();
  const qc = useQueryClient();
  const prev = useRef<boolean | null>(null);
  useEffect(() => {
    if (prev.current !== null && prev.current !== isSignedIn) {
      qc.clear();
    }
    prev.current = isSignedIn;
  }, [isSignedIn, qc]);
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <ProtectedRoute path="/home" component={Home} />
      <ProtectedRoute path="/search" component={Search} />
      <ProtectedRoute path="/movie/:tmdbId" component={MovieDetail} />
      <ProtectedRoute path="/watchlists" component={Watchlists} />
      <ProtectedRoute path="/random-pick" component={RandomPick} />
      <ProtectedRoute path="/friends" component={Friends} />
      <ProtectedRoute path="/friends/:userId" component={FriendProfile} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/recommendations" component={Recommendations} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/actor/:personId" component={ActorDetail} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <LangProvider>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ScrollToTop />
              <AuthCacheSync />
              <Router />
            </AuthProvider>
          </QueryClientProvider>
        </WouterRouter>
        <Toaster theme="dark" richColors position="top-center" />
      </TooltipProvider>
    </LangProvider>
  );
}

export default App;
