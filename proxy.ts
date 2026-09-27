import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the middleware convention to "proxy".
// next-intl's createMiddleware returns a (request) => response function,
// which is exactly what the proxy convention executes.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
