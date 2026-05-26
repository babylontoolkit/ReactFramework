"use client";

import { useEffect } from "react";
import { useUnifiedNavigation } from "./platform";
import { readNavStateStore } from "./platform";

interface ApplicationRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowDevMode?: boolean;
}

/**
 * To properly access application routes, the user must navigate from within the app.
 * If they try to access it directly (e.g., via browser URL), they will be redirected.
 * The navigation within the app should set location state { fromApp: true }.
 * Example: navigate('/play', { state: { fromApp: true } });
 * OR
 * @example
 * GameManager.NavigateTo("/play", {
 *     gameMode: "PlayerControllerDemo",
 *     sceneUrl: GameManager.PlaygroundRepo + "samplescene.gltf",
 * });
 */
export default function ApplicationRoute({ children, redirectTo = '/', allowDevMode = false }: ApplicationRouteProps) {
  const { navigate, location } = useUnifiedNavigation();
  // Primary check: location.state set by navigate() — the normal SPA path.
  // Fallback check: sessionStorage bridge — survives an iframe reload where the
  // router drops state (e.g. Lovable preview). Data is never exposed in the URL.
  const allowByState: boolean = Boolean(location.state?.fromApp) || Boolean(readNavStateStore()?.fromApp);
  const isRouteAllowed = allowByState || allowDevMode;

  useEffect(() => {
    // If no state was passed (direct browser access), redirect
    if (!isRouteAllowed) {
      navigate(redirectTo, { replace: true });
    }
  }, [isRouteAllowed, navigate, redirectTo]);

  // Only render if accessed from within app
  if (!isRouteAllowed) {
    return null;
  }

  return <>{children}</>;
}
