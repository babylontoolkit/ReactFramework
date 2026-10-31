import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { IContentGroupStatus, IContentStorageEstimate } from "@babylonjs-toolkit/next";
import { useContentInstaller } from "./useContentInstaller";
import { formatMegabytes, useInstallProgressRefs } from "./useInstallProgressRefs";

/** Props of ContentInstallPanel. */
export interface IContentInstallPanelProps {
    /** Display name per group id; groups without one show their id. */
    groupLabels?: Record<string, string>;
    /** Extra class names for the panel root. */
    className?: string;
}

/** Megabytes in one gigabyte. */
const MEGABYTES_PER_GIGABYTE: number = 1024;
/** Bytes in one gigabyte. */
const BYTES_PER_GIGABYTE: number = 1024 * 1024 * MEGABYTES_PER_GIGABYTE;
/** Shown when the browser gives no storage estimate. */
const UNKNOWN_FREE_SPACE_TEXT: string = "unknown";

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
 * The "Install Game" panel (unstyled; the app skins its class hooks): game size and free space, Install everything,
 * Pause, Resume and Remove, the progress bar with percent, speed and time left, and each group's install status.
 * Progress reaches the DOM through refs only (D25). Renders nothing while the installer is not loaded or disabled,
 * and one line with the reason when it is unavailable.
 * @param props - Group labels and extra class names.
 * @returns The panel, or null.
 */
export function ContentInstallPanel(props: IContentInstallPanelProps): ReactElement | null {
    const { groupLabels, className } = props;
    const { state, actions } = useContentInstaller();
    const barRef = useRef<HTMLDivElement | null>(null);
    const percentRef = useRef<HTMLSpanElement | null>(null);
    const bytesRef = useRef<HTMLSpanElement | null>(null);
    const speedRef = useRef<HTMLSpanElement | null>(null);
    const timeLeftRef = useRef<HTMLSpanElement | null>(null);
    const [estimate, setEstimate] = useState<IContentStorageEstimate | null>(null);
    useInstallProgressRefs({ barRef, percentRef, bytesRef, speedRef, timeLeftRef });

    const isAvailable: boolean = state?.availability === "available";
    const isInstalling: boolean = state?.installing === true;
    const installedBytes: number = state?.installedBytes ?? 0;
    const totalBytes: number = state?.totalBytes ?? 0;

    // Free space: read on mount and again whenever an install or a removal settles.
    useEffect(() => {
        if (!isAvailable || isInstalling) return undefined;
        let cancelled: boolean = false;
        void actions.estimate(null).then((nextEstimate: IContentStorageEstimate | null) => {
            if (!cancelled) setEstimate(nextEstimate);
        });
        return () => {
            cancelled = true;
        };
    }, [actions, isAvailable, isInstalling, installedBytes]);

    // At rest the bar shows the installed share; while installing the progress events own it.
    useEffect(() => {
        if (!isAvailable || isInstalling) return;
        const installedFraction: number = totalBytes > 0 ? Math.min(1, installedBytes / totalBytes) : 0;
        if (barRef.current != null) barRef.current.style.transform = `scaleX(${installedFraction})`;
        if (percentRef.current != null) percentRef.current.textContent = `${Math.floor(installedFraction * 100)}%`;
        if (bytesRef.current != null) bytesRef.current.textContent = `${formatMegabytes(installedBytes)} installed`;
        // Speed and time left belong to a running install only.
        if (speedRef.current != null) speedRef.current.textContent = "";
        if (timeLeftRef.current != null) timeLeftRef.current.textContent = "";
    }, [isAvailable, isInstalling, installedBytes, totalBytes]);

    // Group statuses change only with the discrete state, so they are re-read on state changes, never per progress event.
    const groups: IContentGroupStatus[] = useMemo(() => (state != null ? actions.groupStatus() : []), [state, actions]);

    if (state == null || state.availability === "disabled") return null;
    const rootClassName: string = joinClassNames("content-install-panel", className);
    if (state.availability !== "available") {
        return (
            <section className={rootClassName} aria-label="Install game">
                <p className="content-install-panel__error">Installing is not available: {state.reason ?? "unknown reason"}.</p>
            </section>
        );
    }

    const canInstall: boolean = !isInstalling && !state.everythingInstalled;
    const canPause: boolean = isInstalling && !state.paused;
    const canResume: boolean = state.paused;
    const canRemove: boolean = !isInstalling && installedBytes > 0;
    const freeSpaceText: string = estimate?.freeBytes != null ? formatFreeSpace(estimate.freeBytes) : UNKNOWN_FREE_SPACE_TEXT;

    return (
        <section className={rootClassName} aria-label="Install game">
            <p className="content-install-panel__summary">
                <span className="content-install-panel__size">Game size {formatMegabytes(totalBytes)}</span>
                <span className="content-install-panel__free">Free space {freeSpaceText}</span>
            </p>
            <div className="content-install-panel__bar">
                <div className="content-install-panel__bar-fill" ref={barRef} />
            </div>
            <p className="content-install-panel__readout">
                <span className="content-install-panel__percent" ref={percentRef} />
                <span className="content-install-panel__bytes" ref={bytesRef} />
                <span className="content-install-panel__speed" ref={speedRef} />
                <span className="content-install-panel__time" ref={timeLeftRef} />
            </p>
            <div className="content-install-panel__actions">
                <button type="button" className="content-install-panel__button" disabled={!canInstall} onClick={() => void actions.install(null)}>
                    Install everything
                </button>
                <button type="button" className="content-install-panel__button" disabled={!canPause} onClick={() => actions.pause()}>
                    Pause
                </button>
                <button type="button" className="content-install-panel__button" disabled={!canResume} onClick={() => actions.resume()}>
                    Resume
                </button>
                <button type="button" className="content-install-panel__button" disabled={!canRemove} onClick={() => void actions.remove(null)}>
                    Remove
                </button>
            </div>
            <ul className="content-install-panel__groups">
                {groups.map((group: IContentGroupStatus) => (
                    <li
                        key={`${group.rootKey}|${group.groupId}`}
                        className={group.installed ? "content-install-panel__group content-install-panel__group--installed" : "content-install-panel__group"}
                    >
                        {groupLabels?.[group.groupId] ?? group.groupId} — {formatMegabytes(group.totalBytes)}
                        {group.installed ? " — installed" : ""}
                    </li>
                ))}
            </ul>
            {state.lastError != null && (
                <p className="content-install-panel__error" role="alert">{state.lastError.message}</p>
            )}
        </section>
    );
}
