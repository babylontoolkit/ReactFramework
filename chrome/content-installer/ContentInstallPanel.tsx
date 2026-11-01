import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from "react";
import type { IContentGroupStatus, IContentInstallerError, IContentInstallerState, IContentStorageEstimate } from "@babylonjs-toolkit/next";
import { useContentInstaller } from "./useContentInstaller";
import { formatMegabytes, formatProgressBytes, useInstallProgressRefs } from "./useInstallProgressRefs";

/** Props of ContentInstallPanel. */
export interface IContentInstallPanelProps {
    /** Called by Cancel and Close: the host closes its dialog (a running download keeps going). */
    onClose: () => void;
    /** Extra class names for the panel root. */
    className?: string;
}

/** What the dialog shows: not available here, nothing or part stored, a download running or paused, everything stored. */
type PanelView = "unavailable" | "notDownloaded" | "downloading" | "downloaded";

/** The dialog's title in every state. */
const PANEL_TITLE: string = "Download Game Data";
/** Megabytes in one gigabyte. */
const MEGABYTES_PER_GIGABYTE: number = 1024;
/** Bytes in one gigabyte. */
const BYTES_PER_GIGABYTE: number = 1024 * 1024 * MEGABYTES_PER_GIGABYTE;
/** Shown when the browser gives no storage estimate. */
const UNKNOWN_FREE_SPACE_TEXT: string = "unknown";
/** The player's text for each installer error kind (the installer's own messages are for developers). */
const ERROR_TEXT_BY_KIND: Record<IContentInstallerError["kind"], string> = {
    cors: "The game data server does not allow downloads to this page.",
    quota: "There is not enough free space on this device for the game data.",
    mismatch: "Some game data did not match the server's list and was not saved.",
    network: "Some game data could not be downloaded. Check the connection and try again.",
    manifest: "The game data list could not be found: the game loads from the network.",
    evicted: "The browser removed some stored game data: it loads from the network until it is downloaded again.",
};

/**
 * Formats free storage space: gigabytes with one decimal from 1 GB, else megabytes.
 * @param bytes - Free bytes.
 * @returns The text with its unit.
 */
function formatFreeSpace(bytes: number): string {
    return bytes >= BYTES_PER_GIGABYTE ? `${(bytes / BYTES_PER_GIGABYTE).toFixed(1)} GB` : formatMegabytes(bytes);
}

/**
 * Joins the base class with extra class names.
 * @param baseClassName - The component's class.
 * @param extraClassName - The host's extra classes, if any.
 * @returns The class attribute.
 */
function joinClassNames(baseClassName: string, extraClassName: string | undefined): string {
    return extraClassName ? `${baseClassName} ${extraClassName}` : baseClassName;
}

/**
 * Picks the dialog state from the installer state: a running or paused download first, then everything stored, else
 * not downloaded.
 * @param state - The installer state, or null before it loaded.
 * @returns The view, or null when the panel renders nothing (not loaded, or disabled).
 */
function selectPanelView(state: IContentInstallerState | null): PanelView | null {
    if (state == null || state.availability === "disabled") return null;
    if (state.availability !== "available") return "unavailable";
    if (state.installing || state.paused) return "downloading";
    return state.everythingInstalled ? "downloaded" : "notDownloaded";
}

/**
 * Describes an installer error for the player.
 * @param error - The installer's last error.
 * @returns One sentence.
 */
function describeContentError(error: IContentInstallerError): string {
    return ERROR_TEXT_BY_KIND[error.kind];
}

/**
 * The "Download Game Data" dialog body (unstyled; the app skins its class hooks), for a host dialog. Three states plus
 * one: Not downloaded (game data size, what is already on this device, free space — Download / Cancel), Downloading
 * (the bar with percent, downloaded and total size and speed — Pause or Resume in one slot, Close),
 * Downloaded ("All game data is on this device" — Close / Remove, which deletes the stored game data and closes the
 * dialog), and Not available (Close). Closing never stops a
 * download. The state's primary button takes focus on arrival and again when the state changes under the focus.
 * Progress reaches the DOM through refs only (D25). Renders nothing while the installer is not loaded or disabled.
 * @param props - The close callback and extra class names.
 * @returns The panel, or null.
 */
export function ContentInstallPanel(props: IContentInstallPanelProps): ReactElement | null {
    const { onClose, className } = props;
    const { state, actions } = useContentInstaller();
    const titleId: string = useId();
    const rootRef = useRef<HTMLElement | null>(null);
    const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);
    const percentRef = useRef<HTMLSpanElement | null>(null);
    const bytesRef = useRef<HTMLSpanElement | null>(null);
    const speedRef = useRef<HTMLSpanElement | null>(null);
    const [estimate, setEstimate] = useState<IContentStorageEstimate | null>(null);
    useInstallProgressRefs({ barRef, percentRef, bytesRef, speedRef });

    const view: PanelView | null = selectPanelView(state);
    const totalBytes: number = state?.totalBytes ?? 0;
    // What is already on this device, file by file (the state's installedBytes counts whole groups only, so a group
    // stopped half way would read 0). Re-read on discrete state changes, never per progress event.
    const storedBytes: number = useMemo(() => {
        if (state == null) return 0;
        const groupStoredBytes: number = actions.groupStatus().reduce((total: number, group: IContentGroupStatus) => total + group.storedBytes, 0);
        return Math.min(groupStoredBytes, state.totalBytes);
    }, [state, actions]);

    // Free space: read whenever the Not downloaded state shows, and again when what is stored changed.
    useEffect(() => {
        if (view !== "notDownloaded") return undefined;
        let cancelled: boolean = false;
        void actions.estimate(null).then((nextEstimate: IContentStorageEstimate | null) => {
            if (!cancelled) setEstimate(nextEstimate);
        });
        return () => {
            cancelled = true;
        };
    }, [actions, view, storedBytes]);

    // A download shown before its next progress event (reopened while running or paused) starts from the stored share.
    useEffect(() => {
        if (view !== "downloading" || percentRef.current == null || percentRef.current.textContent !== "") return;
        const storedFraction: number = totalBytes > 0 ? storedBytes / totalBytes : 0;
        if (barRef.current != null) barRef.current.style.transform = `scaleX(${storedFraction})`;
        percentRef.current.textContent = `${Math.floor(storedFraction * 100)}%`;
        if (bytesRef.current != null) bytesRef.current.textContent = formatProgressBytes(storedBytes, totalBytes);
    }, [view, storedBytes, totalBytes]);

    // Focus on arrival, and when a state change removed the focused button: the new state's primary button.
    useEffect(() => {
        const root: HTMLElement | null = rootRef.current;
        if (root == null || view == null) return;
        const activeElement: Element | null = document.activeElement;
        const focusIsFree: boolean = activeElement == null || activeElement === document.body || activeElement === root.closest("dialog");
        if (focusIsFree || root.contains(activeElement)) primaryButtonRef.current?.focus();
    }, [view]);

    if (state == null || view == null) return null;
    const rootClassName: string = joinClassNames("content-install-panel", className);
    const errorLine: ReactElement | null = state.lastError != null && (view === "notDownloaded" || view === "downloading")
        ? <p className="content-install-panel__error" role="alert">{describeContentError(state.lastError)}</p>
        : null;

    if (view === "unavailable") {
        return (
            <section key="unavailable" className={rootClassName} aria-labelledby={titleId} ref={rootRef}>
                <h2 className="content-install-panel__title" id={titleId}>{PANEL_TITLE}</h2>
                <p className="content-install-panel__text">Downloading the game data is not available in this browser.</p>
                <div className="content-install-panel__actions">
                    <button type="button" className="content-install-panel__button content-install-panel__button--primary" ref={primaryButtonRef} onClick={onClose}>
                        Close
                    </button>
                </div>
            </section>
        );
    }

    if (view === "downloaded") {
        return (
            <section key="downloaded" className={rootClassName} aria-labelledby={titleId} ref={rootRef}>
                <h2 className="content-install-panel__title" id={titleId}>{PANEL_TITLE}</h2>
                <p className="content-install-panel__text">All game data is on this device — {formatMegabytes(totalBytes)}</p>
                <div className="content-install-panel__actions">
                    <button type="button" className="content-install-panel__button content-install-panel__button--primary" ref={primaryButtonRef} onClick={onClose}>
                        Close
                    </button>
                    <button type="button" className="content-install-panel__button" onClick={() => { void actions.remove(null); onClose(); }}>
                        Remove
                    </button>
                </div>
            </section>
        );
    }

    if (view === "downloading") {
        return (
            <section key="downloading" className={rootClassName} aria-labelledby={titleId} ref={rootRef}>
                <h2 className="content-install-panel__title" id={titleId}>{PANEL_TITLE}</h2>
                <div className="content-install-panel__bar">
                    <div className="content-install-panel__bar-fill" ref={barRef} />
                </div>
                <p className="content-install-panel__readout">
                    <span className="content-install-panel__percent" ref={percentRef} />
                    <span className="content-install-panel__bytes" ref={bytesRef} />
                    <span className="content-install-panel__speed" ref={speedRef} />
                </p>
                <div className="content-install-panel__actions">
                    <button
                        type="button"
                        className="content-install-panel__button content-install-panel__button--primary"
                        ref={primaryButtonRef}
                        onClick={() => (state.paused ? actions.resume() : actions.pause())}
                    >
                        {state.paused ? "Resume" : "Pause"}
                    </button>
                    <button type="button" className="content-install-panel__button" onClick={onClose}>
                        Close
                    </button>
                </div>
                {errorLine}
            </section>
        );
    }

    const freeSpaceText: string = estimate?.freeBytes != null ? formatFreeSpace(estimate.freeBytes) : UNKNOWN_FREE_SPACE_TEXT;
    return (
        <section key="notDownloaded" className={rootClassName} aria-labelledby={titleId} ref={rootRef}>
            <h2 className="content-install-panel__title" id={titleId}>{PANEL_TITLE}</h2>
            <p className="content-install-panel__text">
                Save the game's levels, models, textures and sounds on this device for faster loading and offline play.
            </p>
            <p className="content-install-panel__summary">
                <span className="content-install-panel__size">Game data {formatMegabytes(totalBytes)}</span>
                <span aria-hidden="true">·</span>
                <span className="content-install-panel__stored">On this device {formatMegabytes(storedBytes)}</span>
                <span aria-hidden="true">·</span>
                <span className="content-install-panel__free">Free space {freeSpaceText}</span>
            </p>
            {storedBytes > 0 && (
                <p className="content-install-panel__partial">
                    {formatMegabytes(storedBytes)} of {formatMegabytes(totalBytes)} is already on this device.
                </p>
            )}
            <div className="content-install-panel__actions">
                <button type="button" className="content-install-panel__button content-install-panel__button--primary" ref={primaryButtonRef} onClick={() => void actions.install(null)}>
                    Download
                </button>
                <button type="button" className="content-install-panel__button" onClick={onClose}>
                    Cancel
                </button>
            </div>
            {errorLine}
        </section>
    );
}
