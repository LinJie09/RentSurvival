"use client";
import * as React from "react";
import { useSignIn } from "@clerk/nextjs";
// ✨ 保持 Browser 引入，因為 authenticateWithRedirect 需要它在 Capacitor 環境下運作
// import { Browser } from "@capacitor/browser"; 

export default function SignInPage() {
  const { signIn, isLoaded } = useSignIn();

  const handleGoogleLogin = async () => {
    if (!isLoaded || !signIn) return; // 確保 signIn 資源已載入

    try {
      // ✨ 修正：直接使用 authenticateWithRedirect 啟動流程
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        
        // 這是 Clerk 流程結束後要跳轉回 App 的 Deep Link
        redirectUrl: "rentsurvival://oauth-callback",
        
        // 這是登入完成後，App 內最終要導航到的路由
        redirectUrlComplete: "/dashboard",
      });
      
    } catch (err) {
      // 建議在這裡增加錯誤日誌，有助於除錯
      console.error("Clerk OAuth Login error:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-6">
      <h1 className="text-3xl font-serif font-bold text-stone-800 mb-8">Rent Survival</h1>
      
      <button
        onClick={handleGoogleLogin}
        className="w-full max-w-xs bg-white border border-stone-300 text-stone-700 font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-3 hover:bg-stone-50 transition-all active:scale-95"
      >
        {/* Google Icon SVG... */}
        Sign in with Google
      </button>
    </div>
  );
}