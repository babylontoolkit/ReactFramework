import { useEffect, type RefObject } from "react";
import type { IContentInstallProgress } from "@babylonjs-toolkit/next";
import { useContentInstaller } from "./useContentInstaller";

/** The elements install progress is written into; any of them may be left out. */
export interface IInstallProgressRefs {
    /** Bar fill: `style.transform = scaleX(fraction)`, quantized to 0.001 (give it `transform-origin: left`). */
    barRef?: RefObject<HTMLElement | null>;
    /** Percent text, e.g. "42%". */
    percentRef?: RefObject<HTMLElement | null>;
    /** Downloaded and total size, e.g. "215 / 512 MB". */
    bytesRef?: RefObject<HTMLElement | null>;
    /** Download speed, e.g. "8.4 MB/s". */
    speedRef?: RefObject<HTMLElement | null>;
    /** Time left, e.g. "1:02", or "—" while unknown. */
    timeLeftRef?: RefObject<HTMLElement | null>;
}

/** Bytes in one megabyte (binary, as the toolkit's loading screens count them). */
const BYTES_PER_MEGABYTE: number = 1024 * 1024;
/** Sizes below this many megabytes show one decimal. */
const ONE_DECIMAL_LIMIT_MEGABYTES: number = 100;
/** The smallest size shown as a number, in megabytes (one decimal). */
const SMALLEST_SHOWN_MEGABYTES: number = 0.1;
/** Sizes above zero below this many bytes (half of 0.1 MB, which toFixed(1) would show as "0.0") read "< 0.1 MB". */
const SMALLEST_SHOWN_BYTES: number = (SMALLEST_SHOWN_MEGABYTES / 2) * BYTES_PER_MEGABYTE;
/** Bar fractions are rounded to thousandths, so tiny changes write nothing. */
const FRACTION_STEPS: number = 1000;
/** Fraction steps per whole percent. */
const STEPS_PER_PERCENT: number = FRACTION_STEPS / 100;
/** Seconds per minute. */
const SECONDS_PER_MINUTE: number = 60;
/** Shown for an unknown time left. */
const UNKNOWN_TIME_TEXT: string = "—";

/**
 * Formats a byte count as megabytes: one decimal under 100 MB, none from there ("34.2 MB", "512 MB"); a size above
 * zero that would round to "0.0" reads "< 0.1 MB", so a tiny update never claims to be empty.
 * @param bytes - The byte count.
 * @returns The text with its unit.
 */
export function formatMegabytes(bytes: number): string {
    if (bytes > 0 && bytes < SMALLEST_SHOWN_BYTES) return `< ${SMALLEST_SHOWN_MEGABYTES} MB`;
    return `${formatMegabyteNumber(bytes)} MB`;
}

/**
 * Formats seconds as minutes and seconds ("1:02"), or "—" when unknown.
 * @param seconds - Seconds left, or null.
 * @returns The text.
 */
export function formatTimeLeft(seconds: number | null): string {
    if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return UNKNOWN_TIME_TEXT;
    const wholeSeconds: number = Math.round(seconds);
    const minutes: number = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
    const remainingSeconds: number = wholeSeconds % SECONDS_PER_MINUTE;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * Writes install progress into the given elements on each installer progress event (at most every 250 ms, D20/D25).
 * Text goes through `textContent`, the bar through `transform: scaleX()`; a value equal to what the element already
 * shows is not written again, and nothing is written while the page is hidden or the element is not in the document.
 * No React state is touched.
 * @param refs - The elements to write.
 */
export function useInstallProgressRefs(refs: IInstallProgressRefs): void {
    const { subscribeProgress } = useContentInstaller();
    const { barRef, percentRef, bytesRef, speedRef, timeLeftRef } = refs;

    useEffect(() => {
        return subscribeProgress((progress: IContentInstallProgress) => {
            if (document.hidden) return;
            // Whole steps keep the comparison exact: 0.29 never turns into 28.999 %.
            const fractionSteps: number = Math.round(Math.min(1, Math.max(0, progress.fraction)) * FRACTION_STEPS);
            writeTransform(barRef?.current, `scaleX(${fractionSteps / FRACTION_STEPS})`);
            writeText(percentRef?.current, `${Math.floor(fractionSteps / STEPS_PER_PERCENT)}%`);
            writeText(bytesRef?.current, `${formatMegabyteNumber(progress.completedBytes)} / ${formatMegabytes(progress.totalBytes)}`);
            writeText(speedRef?.current, `${(progress.bytesPerSecond / BYTES_PER_MEGABYTE).toFixed(1)} MB/s`);
            writeText(timeLeftRef?.current, formatTimeLeft(progress.secondsRemaining));
        });
    }, [subscribeProgress, barRef, percentRef, bytesRef, speedRef, timeLeftRef]);
}

/**
 * Formats a byte count as a megabyte number without its unit.
 * @param bytes - The byte count.
 * @returns "34.2" under 100 MB, "512" from there.
 */
function formatMegabyteNumber(bytes: number): string {
    const megabytes: number = Math.max(0, bytes) / BYTES_PER_MEGABYTE;
    return megabytes < ONE_DECIMAL_LIMIT_MEGABYTES ? megabytes.toFixed(1) : megabytes.toFixed(0);
}

/**
 * Sets an element's text when it differs from what it shows.
 * @param element - The element, or null/undefined when not mounted.
 * @param text - The text.
 */
function writeText(element: HTMLElement | null | undefined, text: string): void {
    if (element == null || !element.isConnected || element.textContent === text) return;
    element.textContent = text;
}

/**
 * Sets an element's transform when it differs from its current inline transform.
 * @param element - The element, or null/undefined when not mounted.
 * @param transform - The transform.
 */
function writeTransform(element: HTMLElement | null | undefined, transform: string): void {
    if (element == null || !element.isConnected || element.style.transform === transform) return;
    element.style.transform = transform;
}
