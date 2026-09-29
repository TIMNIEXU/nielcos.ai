import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the middleware convention to "proxy".
// next-intl's createMiddleware returns a (request) => response function,
// which is exactly what the proxy convention executes.
export default createMiddleware(routing);

export const config = {
  // Public share links (/share/...) stay locale-free; everything else goes
  // through next-intl's locale prefixing.
  matcher: "/((?!api|trpc|_next|_vercel|share|.*\\..*).*)",
};
