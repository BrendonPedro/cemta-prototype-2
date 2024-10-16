// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Exclude static files and Next.js internals
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/((?!account/).*)",
    // Include API routes
    "/api/(.*)",
  ],
};
