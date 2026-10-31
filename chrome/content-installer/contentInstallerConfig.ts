import type { IContentInstallerOptions, IContentInstallerState, IContentRootOptions } from "@babylonjs-toolkit/next";

/** What the installer stores: every group, each group the first time it loads, or nothing. */
export type ContentInstallPolicyOption = "everything" | "as-you-play" | "off";

/** How content updates are taken: announced for the player, applied automatically, or only on request. */
export type ContentUpdatePolicyOption = "prompt" | "automatic" | "manual";

/** Options a host app gives the provider (one object per app, usually in `src/config`). */
export interface IContentInstallerHostOptions {
    /** False keeps the whole layer inert: no worker, no state, components render nothing. */
    enabled: boolean;
    /** The app's one scene base URL (ends with "/"); the content manifest is "<sceneBaseUrl>content-manifest.json". */
    sceneBaseUrl: string;
    /** What to store; the installer's default is "as-you-play". */
    installPolicy?: ContentInstallPolicyOption;
    /** How updates are taken; the installer's default is "prompt". */
    updatePolicy?: ContentUpdatePolicyOption;
    /** Runs the installer on localhost and private network hosts too (off by default, so dev sessions behave as before). */
    enableOnLocalHost?: boolean;
    /** Adds the app shell root "./bt-shell-manifest.json"; defaults to `import.meta.env.PROD` (D23). */
    includeAppShell?: boolean;
}

/** The service worker script the app serves at its root (written by `vite-content-installer.ts`). */
const WORKER_URL: string = "./bt-content-worker.js";
/** The worker's registration scope: the app's root folder. */
const WORKER_SCOPE: string = "./";
/** File name of an export's content manifest inside its scenes folder. */
const CONTENT_MANIFEST_FILE_NAME: string = "content-manifest.json";
/** The app shell manifest the Vite plugin writes at build. */
const SHELL_MANIFEST_URL: string = "./bt-shell-manifest.json";
/** The display-mode media query of a page launched as an installed app. */
const STANDALONE_MEDIA_QUERY: string = "(display-mode: standalone)";

/** iOS Safari's own flag for a page launched from the home screen. */
interface INavigatorWithStandalone extends Navigator {
    standalone?: boolean;
}

/**
 * Resolves a URL against the document's base URL, so relative host settings work under any serving prefix.
 * @param url - An absolute or relative URL.
 * @returns The absolute URL.
 */
function resolveAgainstDocument(url: string): string {
    return new URL(url, document.baseURI).href;
}

/**
 * Builds the options of `ContentInstaller.Initialize` from the host options: the content root (and, in production
 * builds, the app shell root) resolved against `document.baseURI`, the worker "./bt-content-worker.js" and scope "./".
 * @param hostOptions - The app's installer options.
 * @returns The Initialize options.
 */
export function createContentInstallerOptions(hostOptions: IContentInstallerHostOptions): IContentInstallerOptions {
    const includeAppShell: boolean = hostOptions.includeAppShell ?? import.meta.env.PROD;
    const roots: IContentRootOptions[] = [
        { manifestUrl: resolveAgainstDocument(hostOptions.sceneBaseUrl + CONTENT_MANIFEST_FILE_NAME) },
    ];
    if (includeAppShell) roots.push({ manifestUrl: resolveAgainstDocument(SHELL_MANIFEST_URL), isAppShell: true });
    return {
        roots,
        workerUrl: resolveAgainstDocument(WORKER_URL),
        workerScope: resolveAgainstDocument(WORKER_SCOPE),
        installPolicy: hostOptions.installPolicy,
        updatePolicy: hostOptions.updatePolicy,
        enableOnLocalHost: hostOptions.enableOnLocalHost,
    };
}

/**
 * Tells whether the page runs as an installed app.
 * @returns True for `display-mode: standalone`, or `navigator.standalone` on iOS.
 */
export function isStandaloneLaunch(): boolean {
    if (typeof window === "undefined") return false;
    const matchesStandalone: boolean = typeof window.matchMedia === "function" && window.matchMedia(STANDALONE_MEDIA_QUERY).matches;
    return matchesStandalone || (navigator as INavigatorWithStandalone).standalone === true;
}

/**
 * Tells whether to offer "Install everything": the installer runs, not everything is installed, and the player has
 * not answered the offer yet. Storage access is guarded: a throwing or missing storage counts as unanswered.
 * @param state - The installer state, or null before it loaded.
 * @param storage - Where the answer is kept (usually `localStorage`), or null.
 * @param storageKey - The key of the answer.
 * @returns True when the offer should show.
 */
export function shouldOfferInstall(state: IContentInstallerState | null, storage: Pick<Storage, "getItem"> | null, storageKey: string): boolean {
    if (state == null || state.availability !== "available" || state.everythingInstalled) return false;
    if (storage == null) return true;
    try {
        return storage.getItem(storageKey) == null;
    } catch {
        return true;
    }
}

/**
 * Records the player's answer to the install offer, so it is not shown again. Storage failures are ignored.
 * @param storage - Where the answer is kept (usually `localStorage`), or null.
 * @param storageKey - The key of the answer.
 */
export function rememberInstallOfferAnswered(storage: Pick<Storage, "setItem"> | null, storageKey: string): void {
    if (storage == null) return;
    try {
        storage.setItem(storageKey, "answered");
    } catch {
        // Private mode or a full storage: the offer may show again next time, which is harmless.
    }
}
