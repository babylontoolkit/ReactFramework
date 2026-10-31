import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import type { ContentInstaller, IContentInstallerState, IContentInstallProgress } from "@babylonjs-toolkit/next";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { createContentInstallerOptions, type IContentInstallerHostOptions } from "./contentInstallerConfig";
import { ContentInstallerContext, type IContentInstallerActions, type IContentInstallerContextValue } from "./useContentInstaller";

/** The toolkit's installer class (a type only: the module itself is loaded with `import()`). */
export type ContentInstallerClass = typeof ContentInstaller;

/** A progress subscriber. */
type ProgressListener = (progress: IContentInstallProgress) => void;

/** Props of ContentInstallerProvider. */
export interface IContentInstallerProviderProps {
    /** The app's installer options. */
    options: IContentInstallerHostOptions;
    /** The app. */
    children: ReactNode;
}

/** Reason shown when the toolkit package has no content installer (D34). */
const NO_INSTALLER_REASON: string = "this @babylonjs-toolkit/next has no content installer";
/** Fallback delay before loading the installer where `requestIdleCallback` is missing, in milliseconds. */
const IDLE_FALLBACK_DELAY_MS: number = 1500;
/** The installer's default install policy (D19), shown while it is unavailable. */
const DEFAULT_INSTALL_POLICY: IContentInstallerState["installPolicy"] = "as-you-play";
/** The installer's default update policy (D19), shown while it is unavailable. */
const DEFAULT_UPDATE_POLICY: IContentInstallerState["updatePolicy"] = "prompt";

/** The loaded and initialized installer class, shared with `sceneLoad.ts`; null until then. */
let loadedContentInstaller: ContentInstallerClass | null = null;
/** Starts (or joins) the mounted provider's load; null while no enabled provider is mounted. */
let startMountedProvider: (() => Promise<ContentInstallerClass | null>) | null = null;

/**
 * Returns the installer class once the provider has loaded and initialized it.
 * @returns The class, or null before that (or when the layer is disabled).
 */
export function getLoadedContentInstaller(): ContentInstallerClass | null {
    return loadedContentInstaller;
}

/**
 * Tells whether an enabled provider is mounted (the layer is on for this app).
 * @returns True while an enabled ContentInstallerProvider is mounted.
 */
export function isContentInstallerMounted(): boolean {
    return startMountedProvider != null;
}

/**
 * Loads and initializes the installer now instead of waiting for idle (a scene is about to load). Joins a load that
 * is already running.
 * @returns The initialized class, or null when no enabled provider is mounted or the installer could not load.
 */
export function loadContentInstallerNow(): Promise<ContentInstallerClass | null> {
    if (startMountedProvider == null) return Promise.resolve(loadedContentInstaller);
    return startMountedProvider();
}

/**
 * A full state for an installer that cannot run.
 * @param hostOptions - The app's installer options (their policies are shown).
 * @param reason - Why it cannot run.
 * @returns The state.
 */
function createUnavailableState(hostOptions: IContentInstallerHostOptions, reason: string): IContentInstallerState {
    return {
        availability: "unavailable",
        reason,
        installPolicy: hostOptions.installPolicy ?? DEFAULT_INSTALL_POLICY,
        updatePolicy: hostOptions.updatePolicy ?? DEFAULT_UPDATE_POLICY,
        isLeader: false,
        installing: false,
        paused: false,
        persisted: null,
        totalBytes: 0,
        installedBytes: 0,
        everythingInstalled: false,
        updateAvailable: null,
        updateReady: false,
        applyOnNextLoad: false,
        shellUpdateReady: false,
        lastError: null,
    };
}

/**
 * Shallow equality of two states (nested objects compare by reference; the installer replaces them when they change).
 * @param previous - The current React state.
 * @param next - The new installer state.
 * @returns True when every field is identical.
 */
function statesEqual(previous: IContentInstallerState | null, next: IContentInstallerState): boolean {
    if (previous == null) return false;
    const keys: Array<keyof IContentInstallerState> = Object.keys(next) as Array<keyof IContentInstallerState>;
    return keys.every((key: keyof IContentInstallerState) => previous[key] === next[key]);
}

/**
 * Runs a callback when the browser is idle (or after a short delay where idle callbacks are missing).
 * @param callback - What to run.
 * @returns Cancels the callback when it has not run yet.
 */
function scheduleIdle(callback: () => void): () => void {
    if (typeof window.requestIdleCallback === "function") {
        const idleHandle: number = window.requestIdleCallback(callback);
        return () => window.cancelIdleCallback(idleHandle);
    }
    const timeoutHandle: number = window.setTimeout(callback, IDLE_FALLBACK_DELAY_MS);
    return () => window.clearTimeout(timeoutHandle);
}

/**
 * Describes a thrown value in one line.
 * @param error - The thrown value.
 * @returns Its message.
 */
function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * The installer calls, each made on the loaded installer at call time (inert before it loaded).
 * @returns The actions.
 */
function createActions(): IContentInstallerActions {
    return {
        install: (groupIds, options) => loadedContentInstaller?.Install(groupIds ?? null, options) ?? Promise.resolve(false),
        pause: () => loadedContentInstaller?.Pause(),
        resume: () => loadedContentInstaller?.Resume(),
        cancel: () => loadedContentInstaller?.Cancel(),
        remove: (groupIds) => loadedContentInstaller?.Remove(groupIds ?? null) ?? Promise.resolve(),
        estimate: async (groupIds) => {
            if (loadedContentInstaller == null) return null;
            try {
                return await loadedContentInstaller.EstimateInstall(groupIds ?? undefined);
            } catch {
                return null;
            }
        },
        downloadUpdate: () => loadedContentInstaller?.DownloadUpdate() ?? Promise.resolve(false),
        acceptUpdate: () => loadedContentInstaller?.AcceptUpdate(),
        applyShellUpdate: () => loadedContentInstaller?.ApplyShellUpdate(),
        setBusy: (busy) => loadedContentInstaller?.SetBusy(busy),
        groupStatus: (groupIds) => loadedContentInstaller?.GetGroupStatus(groupIds) ?? [],
    };
}

/**
 * Hosts the content installer for the app (pwa-content-installer D6, D18, D25). When enabled it loads
 * `@babylonjs-toolkit/next/contentinstaller` with `import()` once the page is idle (so Home loads no Babylon code first),
 * initializes it and keeps its discrete state in React state, set only when it changed. Progress never touches React
 * state: components subscribe to it and write the DOM through refs (`useInstallProgressRefs`).
 * @param props - The options and the app.
 * @returns The app inside the installer context.
 */
export function ContentInstallerProvider(props: IContentInstallerProviderProps): ReactElement {
    const { options, children } = props;
    const [state, setState] = useState<IContentInstallerState | null>(null);
    const progressListeners = useRef<Set<ProgressListener>>(new Set<ProgressListener>());
    const actions: IContentInstallerActions = useMemo(() => createActions(), []);

    const subscribeProgress = useCallback((listener: ProgressListener): (() => void) => {
        progressListeners.current.add(listener);
        return () => {
            progressListeners.current.delete(listener);
        };
    }, []);

    useEffect(() => {
        if (!options.enabled) return undefined;
        let disposed: boolean = false;
        let startPromise: Promise<ContentInstallerClass | null> | null = null;
        let removeObservers: (() => void) | null = null;

        const applyState = (next: IContentInstallerState): void => {
            if (disposed) return;
            setState((previous: IContentInstallerState | null) => (statesEqual(previous, next) ? previous : next));
        };
        const forwardProgress = (progress: IContentInstallProgress): void => {
            progressListeners.current.forEach((listener: ProgressListener) => listener(progress));
        };
        const loadAndInitialize = async (): Promise<ContentInstallerClass | null> => {
            let installer: ContentInstallerClass;
            try {
                installer = (await import("@babylonjs-toolkit/next/contentinstaller")).ContentInstaller;
            } catch {
                applyState(createUnavailableState(options, NO_INSTALLER_REASON));
                return null;
            }
            if (disposed) return null;
            const stateObserver: Observer<IContentInstallerState> | null = installer.OnStateChangedObservable.add(applyState);
            const progressObserver: Observer<IContentInstallProgress> | null = installer.OnProgressObservable.add(forwardProgress);
            removeObservers = () => {
                installer.OnStateChangedObservable.remove(stateObserver);
                installer.OnProgressObservable.remove(progressObserver);
            };
            try {
                applyState(await installer.Initialize(createContentInstallerOptions(options)));
            } catch (error) {
                applyState(createUnavailableState(options, describeError(error)));
                return null;
            }
            loadedContentInstaller = installer;
            return installer;
        };
        const start = (): Promise<ContentInstallerClass | null> => {
            if (startPromise == null) startPromise = loadAndInitialize();
            return startPromise;
        };

        startMountedProvider = start;
        const cancelIdleStart: () => void = scheduleIdle(() => {
            void start();
        });
        return () => {
            disposed = true;
            cancelIdleStart();
            if (startMountedProvider === start) startMountedProvider = null;
            removeObservers?.();
        };
    }, [options]);

    const contextValue: IContentInstallerContextValue = useMemo(
        () => ({ state, actions, subscribeProgress }),
        [state, actions, subscribeProgress],
    );

    if (!options.enabled) return <>{children}</>;
    return <ContentInstallerContext.Provider value={contextValue}>{children}</ContentInstallerContext.Provider>;
}
