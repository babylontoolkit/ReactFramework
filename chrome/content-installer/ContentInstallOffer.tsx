import { useState, type ReactElement } from "react";
import { isStandaloneLaunch, rememberInstallOfferAnswered, shouldOfferInstall } from "./contentInstallerConfig";
import { useContentInstaller } from "./useContentInstaller";
import { formatMegabytes } from "./useInstallProgressRefs";

/** Props of ContentInstallOffer. */
export interface IContentInstallOfferProps {
    /** Extra class names for the card root. */
    className?: string;
}

/** Where the player's answer to the standalone offer is kept (D7: offered once). */
const STANDALONE_OFFER_STORAGE_KEY: string = "bt-content-installer.standaloneOffer.v1";

/**
 * Returns `localStorage`, or null where reading it throws (blocked storage).
 * @returns The storage, or null.
 */
function readLocalStorage(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

/**
 * The installed-app offer (D7; unstyled, the app skins its class hooks): on a standalone launch whose content is not
 * installed, a card "Install the game on this device — <size>" with Install everything and Not now. Shown once: either
 * button records the answer.
 * @param props - Extra class names.
 * @returns The card, or null when there is nothing to offer.
 */
export function ContentInstallOffer(props: IContentInstallOfferProps): ReactElement | null {
    const { className } = props;
    const { state, actions } = useContentInstaller();
    const [answered, setAnswered] = useState<boolean>(false);

    if (answered || state == null || !isStandaloneLaunch()) return null;
    if (!shouldOfferInstall(state, readLocalStorage(), STANDALONE_OFFER_STORAGE_KEY)) return null;

    const answer = (installEverything: boolean): void => {
        rememberInstallOfferAnswered(readLocalStorage(), STANDALONE_OFFER_STORAGE_KEY);
        setAnswered(true);
        if (installEverything) void actions.install(null);
    };
    const rootClassName: string = className ? `content-install-offer ${className}` : "content-install-offer";

    return (
        <aside className={rootClassName} aria-label="Install the game">
            <p className="content-install-offer__message">Install the game on this device — {formatMegabytes(state.totalBytes)}</p>
            <div className="content-install-offer__actions">
                <button type="button" className="content-install-offer__button" onClick={() => answer(true)}>
                    Install everything
                </button>
                <button type="button" className="content-install-offer__button" onClick={() => answer(false)}>
                    Not now
                </button>
            </div>
        </aside>
    );
}
