import { useCallback, useSyncExternalStore } from "react";
import { isStandaloneLaunch } from "./contentInstallerConfig";
import { isContentInstallerMounted } from "./ContentInstallerProvider";

/** What `useInstallAppPrompt` reports. */
export interface IInstallAppPrompt {
    /** True when the browser offered its install prompt (Chromium) and it can be shown. */
    canPrompt: boolean;
    /** True when the page already runs as an installed app. */
    isStandalone: boolean;
    /** True on iOS Safari outside the installed app: there is no prompt, show the Add to Home Screen steps instead. */
    isIosSafari: boolean;
    /** Shows the browser's install prompt; resolves true when the player accepted. */
    promptInstall(): Promise<boolean>;
}

/** Chromium's `beforeinstallprompt` event (not in the DOM typings). */
interface IBeforeInstallPromptEvent extends Event {
    /** Shows the install prompt. */
    prompt(): Promise<void>;
    /** The player's answer. */
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Devices that run iOS Safari (iPadOS that reports a Mac is not detected, a known limit). */
const IOS_DEVICE_PATTERN: RegExp = /iPad|iPhone|iPod/;

/** The captured prompt event, kept from page start so a prompt fired before any component mounted is not lost. */
let capturedPromptEvent: IBeforeInstallPromptEvent | null = null;
/** Mounted hooks to tell when the prompt becomes available or is used. */
const promptListeners: Set<() => void> = new Set<() => void>();

/**
 * Sets the captured prompt and tells every mounted hook.
 * @param promptEvent - The event, or null once it was used or the app was installed.
 */
function setCapturedPrompt(promptEvent: IBeforeInstallPromptEvent | null): void {
    capturedPromptEvent = promptEvent;
    promptListeners.forEach((listener: () => void) => listener());
}

/**
 * Subscribes a mounted hook to prompt changes (useSyncExternalStore).
 * @param listener - Called when the prompt becomes available or is used.
 * @returns The unsubscribe.
 */
function subscribeToPrompt(listener: () => void): () => void {
    promptListeners.add(listener);
    return () => {
        promptListeners.delete(listener);
    };
}

/**
 * Tells whether a captured prompt can be shown (useSyncExternalStore snapshot).
 * @returns True while a prompt is captured.
 */
function hasCapturedPrompt(): boolean {
    return capturedPromptEvent != null;
}

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (event: Event) => {
        // With the layer off the browser keeps its own install banner, exactly as before.
        if (!isContentInstallerMounted()) return;
        // Keep the browser's own mini-infobar away; the app shows its own Install App button.
        event.preventDefault();
        setCapturedPrompt(event as IBeforeInstallPromptEvent);
    });
    window.addEventListener("appinstalled", () => setCapturedPrompt(null));
}

/**
 * Reports whether the app can be installed from the browser, and shows the browser's install prompt on request.
 * Chromium fires `beforeinstallprompt` once; it is captured from page start while the installer layer is on (with the
 * layer off the browser keeps its own banner). iOS Safari has no prompt.
 * @returns The prompt state and the prompt call.
 */
export function useInstallAppPrompt(): IInstallAppPrompt {
    const canPrompt: boolean = useSyncExternalStore(subscribeToPrompt, hasCapturedPrompt, () => false);

    const promptInstall = useCallback(async (): Promise<boolean> => {
        const promptEvent: IBeforeInstallPromptEvent | null = capturedPromptEvent;
        if (promptEvent == null) return false;
        setCapturedPrompt(null);
        await promptEvent.prompt();
        const choice: { outcome: "accepted" | "dismissed" } = await promptEvent.userChoice;
        return choice.outcome === "accepted";
    }, []);

    const isStandalone: boolean = isStandaloneLaunch();
    const isIosSafari: boolean = typeof navigator !== "undefined" && IOS_DEVICE_PATTERN.test(navigator.userAgent) && !isStandalone;
    return { canPrompt, isStandalone, isIosSafari, promptInstall };
}
