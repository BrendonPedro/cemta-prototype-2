// // Old details -------
// import { authMiddleware } from "@clerk/nextjs";

// export default authMiddleware({
//   // Allow signed out users to access the specified routes:
//     publicRoutes: ['/'],
// });
 
// export const config = {
//   matcher: [
//     // Exclude files with a "." followed by an extension, which are typically static files.
//     // Exclude files in the _next directory, which are Next.js internals.
//     "/((?!.+\\.[\\w]+$|_next).*)",
//     // Re-include any files in the api or trpc folders that might have an extension
//     "/(api|trpc)(.*)",
//   ],
// };


//New details ----

// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Exclude static files and Next.js internals
    "/((?!.+\\.[\\w]+$|_next).*)",
    // Include API routes
    "/api/(.*)",
  ],
};


