/**
 * The React content installer layer (pwa-content-installer D25): provider, hooks, install panel, update toast and the
 * installed-app offer. Nothing here imports Babylon or the toolkit with a value import, so Home can use it freely; the
 * installer itself is loaded by the provider with `import()`. `sceneLoad.ts` is not re-exported: only `babylon.tsx`
 * imports it.
 */
import "./content-installer.css";

export {
    createContentInstallerOptions,
    isStandaloneLaunch,
    rememberInstallOfferAnswered,
    shouldOfferInstall,
    type ContentInstallPolicyOption,
    type ContentUpdatePolicyOption,
    type IContentInstallerHostOptions,
} from "./contentInstallerConfig";
export {
    ContentInstallerProvider,
    getLoadedContentInstaller,
    isContentInstallerMounted,
    loadContentInstallerNow,
    type ContentInstallerClass,
    type IContentInstallerProviderProps,
} from "./ContentInstallerProvider";
export {
    ContentInstallerContext,
    useContentInstaller,
    type IContentInstallerActions,
    type IContentInstallerContextValue,
} from "./useContentInstaller";
export { formatMegabytes, formatTimeLeft, useInstallProgressRefs, type IInstallProgressRefs } from "./useInstallProgressRefs";
export { useInstallAppPrompt, type IInstallAppPrompt } from "./useInstallAppPrompt";
export { ContentInstallPanel, type IContentInstallPanelProps } from "./ContentInstallPanel";
export { ContentUpdateToast, type IContentUpdateToastProps } from "./ContentUpdateToast";
export { ContentInstallOffer, type IContentInstallOfferProps } from "./ContentInstallOffer";
