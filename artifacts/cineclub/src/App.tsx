import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { LangProvider } from "@/lib/i18n";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { useEffect, useRef } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
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

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f59e0b",
    colorBackground: "#050505",
    colorForeground: "#ffffff",
    colorMutedForeground: "#9ca3af",
    colorDanger: "#ef4444",
    colorInput: "#111111",
    colorInputForeground: "#ffffff",
    colorNeutral: "#374151",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#050505] rounded-2xl w-[440px] max-w-full overflow-hidden border border-yellow-500/20",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-gray-300",
    footerActionLink: "text-yellow-400 hover:text-yellow-300",
    footerActionText: "text-gray-400",
    dividerText: "text-gray-500",
    identityPreviewEditButton: "text-yellow-400",
    formFieldSuccessText: "text-green-400",
    alertText: "text-red-400",
    logoBox: "mb-4",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-gray-700 hover:border-yellow-500/50 bg-black/50 text-white",
    formButtonPrimary: "bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-black font-semibold",
    formFieldInput: "bg-black border-gray-700 text-white placeholder-gray-500",
    footerAction: "bg-transparent",
    dividerLine: "bg-gray-800",
    alert: "bg-red-500/10 border-red-500/30",
    otpCodeFieldInput: "bg-black border-gray-700 text-white",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/home" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 w-full">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 w-[440px] max-w-full">
          <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-500 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-black fill-current"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          </div>
          <span className="text-gray-400">Beni hatırla — <span className="text-gray-500">oturumunuz otomatik olarak hatırlanır</span></span>
        </div>
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function AuthTokenSetup() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }: { user?: { id?: string } | null }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      
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

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ScrollToTop />
        <AuthTokenSetup />
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <LangProvider>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </LangProvider>
  );
}

export default App;
