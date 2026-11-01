# Babylon Toolkit React Framework Submodule (ES6)

* WEBGPU Public Web Assemblies (public/scripts)

The required `glslang` and `twgsl` web assemblies **must** reside in the application scripts folder:

```
await webgpuEngine.initAsync(
    { jsPath: "scripts/glslang.js", wasmPath: "scripts/glslang.wasm" },
    { jsPath: "scripts/twgsl.js", wasmPath: "scripts/twgsl.wasm" }
);
```

* DRACO Mesh Decoder (public/scripts)

The required `draco.js` and `draco.wasm` files **must** reside in the application scripts folder. They decode
Draco-compressed meshes (`KHR_draco_mesh_compression`) on both WebGL and WebGPU:

```
DracoDecoder.DefaultConfiguration = { wasmUrl: "scripts/draco.js", wasmBinaryUrl: "scripts/draco.wasm" };
```

`draco.js` is the Babylon snapshot's `draco_wasm_wrapper_gltf.js` (with its default wasm name set to `draco.wasm`),
and `draco.wasm` is the snapshot's `draco_decoder_gltf.wasm`.

* Content Installer (chrome/content-installer)

Lets the player download the hosted game data to the device for faster loading and offline play, on top of the
toolkit's `ContentInstaller` and its service worker. Copy the folder into the app's `src/chrome/` unchanged. Its 10
files:

```
index.ts                     re-exports everything below except sceneLoad.ts (Home-safe: no Babylon value imports)
contentInstallerConfig.ts    IContentInstallerHostOptions, createContentInstallerOptions, isStandaloneLaunch, offer helpers
ContentInstallerProvider.tsx loads @babylonjs-toolkit/next/contentinstaller with import() on idle; discrete state in React
useContentInstaller.ts       the context: state, actions, subscribeProgress
useInstallProgressRefs.ts    writes progress into refs (textContent, scaleX) at the installer's 250 ms cadence
ContentInstallPanel.tsx      the "Download Game Data" dialog body: Not downloaded / Downloading / Downloaded / not available
ContentUpdateToast.tsx       new app version (Reload), content update (Update, then Apply), CSS enter/exit
ContentInstallOffer.tsx      installed-app launch: "Download the game data to this device" (Download / Maybe Later) once
content-installer.css        layout and neutral defaults; skin the class hooks in the app
sceneLoad.ts                 prepareContentSceneLoad(sceneUrl), imported only by babylon/system/babylon.tsx
```

Wiring an app: wrap the router in `<ContentInstallerProvider options={…}>` with `{ enabled, sceneBaseUrl,
enableOnLocalHost }`, render `<ContentUpdateToast />` and `<ContentInstallOffer />` beside the router, give Home one
**Download** button (it reads **Downloaded ✓** once `state.everythingInstalled`) that opens a modal `<dialog>`
(`showModal()`, Escape closes it) holding `<ContentInstallPanel onClose={…} />`, add the app's
`vite-content-installer.ts` plugin (serves and emits `bt-content-worker.js`, writes `bt-shell-manifest.json` at build)
and a `manifest.webmanifest`. `babylon.tsx` already calls `prepareContentSceneLoad` before every scene import (it
resolves `false` at once when no provider is enabled).

The dialog, titled "Download Game Data", has three states plus one. Not downloaded: what the game data is for, its
size, what is already on this device ("412 MB of 559 MB is already on this device.") and the free space, with Download
and Cancel. Downloading: the bar with percent, downloaded and total size and speed (no time-left estimate: it jumps around too much), with Pause (Resume while
paused) and Close; closing never stops the download. Downloaded: "All game data is on this device — <size>", with
Close and Remove (Remove deletes the stored game data, the app shell stays, and closes the dialog). Where the browser cannot store it:
"Downloading the game data is not available in this browser." with Close. Each state's first button takes focus. No
text a player sees says "install": installing the app is the browser's own option, never the game's.

* KTX2 Texture Transcoders (public/scripts)

`viewer.tsx` points `KhronosTextureContainer2.URLConfig` at `scripts/`: copy `babylon.ktx2decoder.js`,
`msc_basis_transcoder.js`, `msc_basis_transcoder.wasm`, `zstddec.wasm`, `uastc_astc.wasm`, `uastc_bc7.wasm`,
`uastc_rgba8_unorm_v2.wasm`, `uastc_rgba8_srgb_v2.wasm`, `uastc_r8_unorm.wasm` and `uastc_rg8_unorm.wasm` from the
exporter's `Template/Scripts` into the app's `public/scripts`, so KTX2 textures never load decoders from the Babylon CDN.

---
React UI Framework Documentation: https://raw.githubusercontent.com/babylontoolkit/agent/main/references/react-framework.md
---
