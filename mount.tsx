'use client';
/*
 * <BabylonMount /> — router-agnostic, SSR-safe entry point.
 *
 * All Babylon Toolkit imports are loaded behind React.lazy so the UMD
 * globals (BABYLON / TOOLKIT / HavokPhysics) are only touched on the
 * client. Drop into any host: Next.js App Router, TanStack Start,
 * Remix, or a plain Vite + BrowserRouter SPA — no per-host glue needed
 * beyond a NavigationProvider adapter for your router.
 *
 * Usage (Next.js):
 *   import dynamic from "next/dynamic";
 *   const BabylonMount = dynamic(() => import("@/babylon/mount"), { ssr: false });
 *
 * Usage (TanStack Start):
 *   export const Route = createFileRoute("/play")({
 *     ssr: false,
 *     component: () => <BabylonMount />,
 *   });
 *
 * Usage (Vite + BrowserRouter): just <BabylonMount /> inside a <Route />.
 */
import { lazy, Suspense, type ReactNode } from "react";

const LazyViewer = lazy(async () => {
  const [{ default: BabylonSceneViewer }, { default: ApplicationRoute }] = await Promise.all([
    import("./system/babylon"),
    import("./system/routing"),
  ]);
  return {
    default: function MountedViewer() {
      return (
        <ApplicationRoute allowDevMode={true}>
          <BabylonSceneViewer fullPage={true} allowQueryParams={true} enableCustomOverlay={false} />
        </ApplicationRoute>
      );
    },
  };
});

export interface BabylonMountProps {
  fallback?: ReactNode;
}

export default function BabylonMount({ fallback }: BabylonMountProps = {}) {
  return (
    <Suspense
      fallback={
        fallback ?? (
          <div style={{ width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#2A2342", color: "#E0684B", fontFamily: "system-ui, sans-serif" }}>
            Loading 3D engine...
          </div>
        )
      }
    >
      <LazyViewer />
    </Suspense>
  );
}
