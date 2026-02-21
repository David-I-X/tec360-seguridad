declare module "next-pwa" {
    import type { NextConfig } from "next";

    interface PWAConfig {
        dest?: string;
        register?: boolean;
        skipWaiting?: boolean;
        disable?: boolean;
        scope?: string;
        sw?: string;
        fallbacks?: {
            document?: string;
            image?: string;
            font?: string;
            audio?: string;
            video?: string;
        };
        cacheOnFrontEndNav?: boolean;
        reloadOnOnline?: boolean;
        buildExcludes?: (string | RegExp)[];
        publicExcludes?: string[];
    }

    export default function withPWA(
        config?: PWAConfig
    ): (nextConfig: NextConfig) => NextConfig;
}
