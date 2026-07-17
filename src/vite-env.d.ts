/// <reference types="vite/client" />

declare const __BUILD_SHA__: string;

declare module "*.svg?url" {
  const url: string;
  export default url;
}
