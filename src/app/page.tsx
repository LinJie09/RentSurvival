import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center font-sans">
      {/* 裝飾背景 */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-50 z-0"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 z-0"></div>

      <div className="relative z-10 max-w-2xl space-y-8">
        {/* LOGO 與標題 */}
        <div className="space-y-4">
          <div className="text-6xl mb-4">💰</div>
          <h1 className="text-5xl font-serif font-bold text-stone-800 tracking-tight">
            Rent Survival
          </h1>
          <p className="text-xl text-stone-500 font-medium">
            每個人的
            <br className="sm:hidden" />
            理財自動導航系統
          </p>
        </div>

        {/* 功能介紹卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
            <div className="text-2xl mb-2">🏦</div>
            <h3 className="font-bold text-stone-700">自動分帳</h3>
            <p className="text-xs text-stone-400 mt-1">
              薪水一進來，自動分配儲蓄與風險規劃。
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-bold text-stone-700">資產圖表</h3>
            <p className="text-xs text-stone-400 mt-1">
              透過圓餅圖，一眼掌握生活費還剩多少。
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-bold text-stone-700">投資管理</h3>
            <p className="text-xs text-stone-400 mt-1">
              整合股票庫存與緊急預備金，資產一目瞭然。
            </p>
          </div>
        </div>

        {/* 按鈕區 (根據登入狀態顯示不同按鈕) */}
        <div className="pt-4">
          {/* 如果已經登入：顯示「進入儀表板」 */}
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 bg-stone-800 text-white rounded-xl font-bold text-lg hover:bg-black transition-transform active:scale-95 shadow-xl"
            >
              進入我的帳本 →
            </Link>
          </SignedIn>

          {/* 如果還沒登入：顯示「開始使用」 (點了會跳登入框) */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-transform active:scale-95 shadow-xl shadow-emerald-200">
                🚀 免費開始使用
              </button>
            </SignInButton>
            <p className="text-xs text-stone-400 mt-4">
              支援 Google 一鍵登入 • 資料雲端同步
            </p>
          </SignedOut>
        </div>
      </div>
    </div>
  );
}
