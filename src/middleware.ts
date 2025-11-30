import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. 定義哪些路徑需要保護？ (這裡是設定：除了靜態檔案外，全部都要保護)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', // 儀表板相關
  '/api(.*)',    // 所有 API
]);

export default clerkMiddleware(async (auth, req) => {
  // 2. 如果使用者訪問的是受保護路徑，且未登入 -> 強制踢去登入頁面
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // 這是 Clerk 建議的 matcher，用來過濾靜態檔案
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};