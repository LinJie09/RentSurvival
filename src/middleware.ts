import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 定義受保護的路由 (排除 sign-in 和首頁)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api(.*)',
]);

// ✨ 修改重點 1: 加上 async
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect({ 
      unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL 
    });
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};