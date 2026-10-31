import { createContext, useContext } from "react";
import type { IContentGroupStatus, IContentInstallerState, IContentInstallProgress, IContentStorageEstimate } from "@babylonjs-toolkit/next";

/** The installer calls a host component can make; each is a safe no-op until the installer has loaded. */
export interface IContentInstallerActions {
    /** Installs groups (null or empty = everything, app shell included); resolves true when all of them are installed. */
    install(groupIds?: string[] | null, options?: { background?: boolean }): Promise<boolean>;
    /** Pauses the running install after the files already downloading. */
    pause(): void;
    /** Resumes a paused install. */
    resume(): void;
    /** Cancels every queued install. */
    cancel(): void;
    /** Removes stored groups (null or empty = everything). */
    remove(groupIds?: string[] | null): Promise<void>;
    /** Free space versus what installing the groups needs; null before the installer loaded or when it failed. */
    estimate(groupIds?: string[] | null): Promise<IContentStorageEstimate | null>;
    /** Downloads a found content update in the background; resolves true when it is ready to apply. */
    downloadUpdate(): Promise<boolean>;
    /** Applies the ready update at the next scene load or page start. */
    acceptUpdate(): void;
    /** Activates a waiting app shell update and reloads the page. */
    applyShellUpdate(): void;
    /** Holds background installs while true (D20); hosts call it around play. */
    setBusy(busy: boolean): void;
    /** Install status of groups of the active version (every group when omitted); empty before the installer loaded. */
    groupStatus(groupIds?: string[]): IContentGroupStatus[];
}

/** What `useContentInstaller` returns. */
export interface IContentInstallerContextValue {
    /** Null until the installer module has loaded (or forever when disabled). */
    state: IContentInstallerState | null;
    /** The installer calls. */
    actions: IContentInstallerActions;
    /** Subscribes to throttled progress (telemetry: write it through refs, never React state); returns the unsubscribe. */
    subscribeProgress(listener: (progress: IContentInstallProgress) => void): () => void;
}

/** Actions used outside a provider, or while the layer is disabled: they do nothing. */
const INERT_ACTIONS: IContentInstallerActions = {
    install: () => Promise.resolve(false),
    pause: () => undefined,
    resume: () => undefined,
    cancel: () => undefined,
    remove: () => Promise.resolve(),
    estimate: () => Promise.resolve(null),
    downloadUpdate: () => Promise.resolve(false),
    acceptUpdate: () => undefined,
    applyShellUpdate: () => undefined,
    setBusy: () => undefined,
    groupStatus: () => [],
};

/** The context value outside a provider: no state, inert actions, no progress. */
const INERT_CONTEXT_VALUE: IContentInstallerContextValue = {
    state: null,
    actions: INERT_ACTIONS,
    subscribeProgress: () => () => undefined,
};

/** The content installer context, filled by `ContentInstallerProvider`. */
export const ContentInstallerContext = createContext<IContentInstallerContextValue>(INERT_CONTEXT_VALUE);

/**
 * Reads the content installer's discrete state, its actions and the progress subscription.
 * Outside a provider (or with the layer disabled) the state stays null and the actions do nothing.
 * @returns The installer context value.
 */
export function useContentInstaller(): IContentInstallerContextValue {
    return useContext(ContentInstallerContext);
}
