// Ambient declarations for the Babylon Toolkit runtime globals.
// Keeps strict-TS hosts (Next.js, TanStack Start, Remix, etc.) happy
// without scattering @ts-ignore / `as any` through the code.
declare const BABYLON: any;
declare const TOOLKIT: any;
declare const HavokPhysics: any;
declare const PROJECT: any;

declare global {
  // eslint-disable-next-line no-var
  var HK: any;
  // eslint-disable-next-line no-var
  var HKP: any;
  // eslint-disable-next-line no-var
  var HAVOKPHYSCIS_JS: any;
  // eslint-disable-next-line no-var
  var SCRIPTBUNDLE_JS: any;
}

export {};
