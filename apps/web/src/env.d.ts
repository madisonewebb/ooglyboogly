/** Root package.json version, baked in by vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** "1" builds the dice lab into a production bundle, for screenshots. */
  readonly VITE_LAB?: string;
}
