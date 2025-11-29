"use client";

import { useState, useEffect } from "react";

// 定義分類選項
const CATEGORIES = [
  { icon: "🍱", label: "飲食" },
  { icon: "🥤", label: "飲料" },
  { icon: "🚗", label: "交通" },
  { icon: "🛍️", label: "購物" },
  { icon: "🎬", label: "娛樂" },
  { icon: "🏠", label: "居家" },
  { icon: "💊", label: "醫療" },
  { icon: "💸", label: "其他" },
];

// 定義資料庫回傳的格式
interface Transaction {
  id: number;
  name: string;
  amount: number;
  createdAt: string;
}

export default function Dashboard() {
  const [isEditing, setIsEditing] = useState(false);
  // 1. 定義狀態：明細列表
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(CATEGORIES[0].icon); // 預設選第一個
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  // 2. 定義狀態：預算設定
  const [budget, setBudget] = useState({
    totalSalary: 32000,
    rent: 8500,
    savingsTarget: 6200,
    fixedCost: 3000,
    currentMonthSpent: 0,
  });

  const [tempBudget, setTempBudget] = useState(budget);

  // ✨ 載入時：同時抓取「預算設定」與「花費明細」
  useEffect(() => {
    const initData = async () => {
      try {
        const [budgetRes, spendRes] = await Promise.all([
          fetch("/api/budget"),
          fetch("/api/spend"),
        ]);

        const budgetData = await budgetRes.json();
        const spendData = await spendRes.json();

        // 更新 State
        setBudget((prev) => ({
          ...prev,
          totalSalary: budgetData.totalSalary,
          rent: budgetData.rent,
          savingsTarget: budgetData.savingsTarget,
          fixedCost: budgetData.fixedCost,
          currentMonthSpent: spendData.totalSpent,
        }));

        // 更新明細列表
        setTransactions(spendData.history);
      } catch (error) {
        console.error("讀取失敗:", error);
      }
    };
    initData();
  }, []);

  // ✨ 記帳功能
  // 1. 核心記帳函式
  const handleSpend = async (amount: number, itemName: string) => {
    try {
      // (1) 先告訴後端記一筆帳
      const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, name: itemName }),
      });

      if (res.ok) {
        
        const refreshRes = await fetch('/api/spend');
        const refreshData = await refreshRes.json();

        const safeTotalSpent = Number(refreshData.totalSpent) || 0;

        // (3) 更新總金額 (Remaining Budget 會自動根據這個計算)
        setBudget((prev) => ({
          ...prev,
          currentMonthSpent: safeTotalSpent,
        }));

        // (4) 更新列表 (直接用後端回傳的完整列表，最準確)
        setTransactions(refreshData.history);

      } else {
        alert("記帳失敗，請檢查網路");
      }
    } catch (error) {
      console.error("連線錯誤:", error);
    }
  };

  const handleCustomSubmit = () => {
    if (!customName || !customAmount) return;

    // 💡 關鍵：把 Icon 和 名稱 組合起來 (例如: "🚗 加油")
    // 這樣存進資料庫，顯示時就自帶圖示了！
    const finalName = `${selectedIcon} ${customName}`;

    handleSpend(Number(customAmount), finalName);

    // 重置表單
    setCustomName("");
    setCustomAmount("");
    setSelectedIcon(CATEGORIES[0].icon); // 重置回預設
    setIsAdding(false);
  };

  // ✨ 新增：刪除功能
  const handleDelete = async (id: number) => {
    // 1. 先確認是否真的要刪
    if (!confirm("確定要刪除這筆紀錄嗎？錢會補回來喔！")) return;

    try {
      const res = await fetch('/api/spend', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const refreshRes = await fetch('/api/spend');
        const refreshData = await refreshRes.json();
        
        const safeTotalSpent = Number(refreshData.totalSpent) || 0;
        // 2. 更新總金額 (把花掉的錢減回來 = 預算變多)
        setBudget(prev => ({
          ...prev,
          currentMonthSpent: safeTotalSpent,
        }));

        // 3. 更新列表 (把這筆資料過濾掉)
        setTransactions(refreshData.history || []);
      } else {
        alert("刪除失敗");
      }
    } catch (error) {
      console.error("連線錯誤:", error);
    }
  };




  const startEditing = () => {
    setTempBudget(budget);
    setIsEditing(true);
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempBudget),
      });
      if (res.ok) {
        setBudget(tempBudget);
        setIsEditing(false);
        alert("設定已儲存！🎉");
      } else {
        alert("儲存失敗，請檢查網路");
      }
    } catch (error) {
      console.error("儲存錯誤:", error);
    }
  };

  // --- 計算邏輯 ---
  const livingBudget =
    budget.totalSalary - budget.rent - budget.savingsTarget - budget.fixedCost;
  const remaining = livingBudget - budget.currentMonthSpent;

  const today = new Date();
  const nextPayDay = new Date();
  nextPayDay.setDate(5);
  if (today.getDate() >= 5) {
    nextPayDay.setMonth(nextPayDay.getMonth() + 1);
  }
  const daysLeft = Math.ceil(
    (nextPayDay.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );
  const safeDaysLeft = daysLeft > 0 ? daysLeft : 1;
  const dailyBudget = Math.floor(remaining / safeDaysLeft);
  const progressPercentage = Math.min(
    100,
    Math.max(0, (remaining / livingBudget) * 100)
  );

  // --- 圓餅圖 CSS ---
  const pRent = (budget.rent / budget.totalSalary) * 100;
  const pSavings = (budget.savingsTarget / budget.totalSalary) * 100;
  const pFixed = (budget.fixedCost / budget.totalSalary) * 100;

  const pieChartStyle = {
    background: `conic-gradient(
      #ECA8A8 0% ${pRent}%, 
      #D6CEA6 ${pRent}% ${pRent + pSavings}%, 
      #E7E5E4 ${pRent + pSavings}% ${pRent + pSavings + pFixed}%, 
      #FAD1A5 ${pRent + pSavings + pFixed}% 100%
    )`,
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-700 p-6 flex justify-center font-sans selection:bg-orange-100">
      <div className="max-w-md w-full space-y-6 relative">
        {/* 背景裝飾 */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-stone-200 rounded-full blur-3xl opacity-50 z-0"></div>

        {/* Header */}
        <header className="relative z-10 flex justify-between items-end pt-6 pb-2 border-b-2 border-dashed border-stone-200">
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-800 tracking-wide">
              Rent Survival
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-stone-200/50 rounded-full text-xs text-stone-600 font-medium">
                Plan B
              </span>
            </div>
          </div>
          <button
            onClick={startEditing}
            className="p-2 bg-white border border-stone-200 rounded-full shadow-sm hover:bg-stone-50 active:scale-95 transition-all text-stone-400"
          >
            ⚙️ 設定
          </button>
        </header>

        {isEditing ? (
          // === 📝 編輯模式 ===
          <section className="relative z-10 bg-white rounded-3xl p-8 shadow-lg border border-stone-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-2">
              ✏️ 財務設定
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  月薪 (Total Income)
                </label>
                <input
                  type="number"
                  value={tempBudget.totalSalary || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempBudget({
                      ...tempBudget,
                      totalSalary: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 font-bold text-lg text-stone-700 placeholder-stone-300"
                  placeholder="輸入金額"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  房租 (Rent)
                </label>
                <input
                  type="number"
                  value={tempBudget.rent || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempBudget({
                      ...tempBudget,
                      rent: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 font-bold text-lg text-stone-700 placeholder-stone-300"
                  placeholder="輸入金額"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  儲蓄目標 (Savings)
                </label>
                <input
                  type="number"
                  value={tempBudget.savingsTarget || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempBudget({
                      ...tempBudget,
                      savingsTarget: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 font-bold text-lg text-stone-700 placeholder-stone-300"
                  placeholder="輸入金額"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  固定雜支 (Bills)
                </label>
                <input
                  type="number"
                  value={tempBudget.fixedCost || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempBudget({
                      ...tempBudget,
                      fixedCost: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 font-bold text-lg text-stone-700 placeholder-stone-300"
                  placeholder="輸入金額"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 font-bold hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 py-3 rounded-xl bg-stone-800 text-white font-bold hover:bg-black shadow-lg shadow-stone-200"
              >
                儲存設定
              </button>
            </div>
          </section>
        ) : (
          // === 📊 儀表板模式 ===
          <>
            {/* 1. 儀表板卡片 */}
            <section className="relative z-10 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div
                  className="relative w-28 h-28 rounded-full shadow-inner flex-shrink-0"
                  style={pieChartStyle}
                >
                  <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-[10px] text-stone-400 font-medium">
                      總收入
                    </span>
                    <span className="text-sm font-bold text-stone-600">
                      {budget.totalSalary / 1000}K
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-right space-y-1">
                  <h2 className="text-xs font-bold tracking-widest uppercase text-stone-400">
                    Today's Allowance
                  </h2>
                  <div
                    className={`text-4xl font-serif font-bold ${
                      dailyBudget < 300 ? "text-red-500" : "text-stone-800"
                    }`}
                  >
                    ${dailyBudget}
                  </div>
                  <div className="text-xs text-stone-500 font-medium bg-stone-100 inline-block px-2 py-1 rounded-md">
                    距離發薪 {daysLeft} 天
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs bg-stone-50 p-4 rounded-xl border border-stone-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ECA8A8]"></span>
                    房租
                  </div>
                  <span className="font-bold text-stone-600">
                    ${budget.rent}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#D6CEA6]"></span>
                    儲蓄
                  </div>
                  <span className="font-bold text-stone-600">
                    ${budget.savingsTarget}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E7E5E4]"></span>
                    雜支
                  </div>
                  <span className="font-bold text-stone-600">
                    ${budget.fixedCost}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FAD1A5]"></span>
                    生活
                  </div>
                  <span className="font-bold text-stone-600">
                    ${livingBudget}
                  </span>
                </div>
              </div>
            </section>

            {/* 2. 進度條 */}
            <section className="relative z-10 space-y-3 px-2">
              <div className="flex justify-between text-sm text-stone-500 font-serif italic">
                <span>Remaining Monthly Budget</span>
                <span
                  className={remaining < 2000 ? "text-red-500 font-bold" : ""}
                >
                  ${remaining.toLocaleString()}
                </span>
              </div>
              <div className="h-3 w-full bg-stone-200/50 rounded-full overflow-hidden border border-stone-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    progressPercentage < 30 ? "bg-[#ECA8A8]" : "bg-[#D6CEA6]"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {dailyBudget < 300 && (
                <div className="text-center">
                  <span className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                    ⚠️ 預算吃緊，建議晚餐控制在 $80 以內
                  </span>
                </div>
              )}
            </section>

            {/* 3. 按鈕區 */}
            {/* 3. 按鈕區 (改為 3 欄) */}
            <section className="relative z-10 grid grid-cols-3 gap-3 pt-2">
              {/* 按鈕 1: 便當 */}
              <button
                onClick={() => handleSpend(100, "🍱 食物")}
                className="group relative bg-white p-4 rounded-2xl border-2 border-stone-100 hover:border-orange-200 transition-all active:top-[2px] active:shadow-none shadow-[0_4px_0_#E7E5E4]"
              >
                <div className="text-center">
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">
                    🍱
                  </span>
                  <span className="text-stone-600 font-bold text-xs tracking-wide">
                    食物
                  </span>
                </div>
              </button>

              {/* 按鈕 2: 飲料 */}
              <button
                onClick={() => handleSpend(60, "🥤 飲料")}
                className="group relative bg-white p-4 rounded-2xl border-2 border-stone-100 hover:border-blue-200 transition-all active:top-[2px] active:shadow-none shadow-[0_4px_0_#E7E5E4]"
              >
                <div className="text-center">
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">
                    🥤
                  </span>
                  <span className="text-stone-600 font-bold text-xs tracking-wide">
                    飲料
                  </span>
                </div>
              </button>

              {/* ✨ 按鈕 3: 自訂 (開啟視窗) */}
              <button
                onClick={() => setIsAdding(true)}
                className="group relative bg-stone-800 p-4 rounded-2xl border-2 border-stone-800 hover:bg-stone-700 transition-all active:top-[2px] active:shadow-none shadow-[0_4px_0_#44403C]"
              >
                <div className="text-center text-white">
                  <span className="text-2xl block mb-1 group-hover:rotate-90 transition-transform">
                    ➕
                  </span>
                  <span className="font-bold text-xs tracking-wide">
                    Custom
                  </span>
                </div>
              </button>
            </section>

            {/* ✨ 升級版：自訂支出彈出視窗 */}
            {isAdding && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div
                  className="absolute inset-0"
                  onClick={() => setIsAdding(false)}
                ></div>

                <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-serif font-bold text-stone-800">
                      ✨ 新增支出
                    </h3>
                    {/* 顯示目前選中的預覽 */}
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-2xl border border-stone-200">
                      {selectedIcon}
                    </div>
                  </div>

                  {/* 1. Icon 選擇網格 */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.label}
                        onClick={() => setSelectedIcon(cat.icon)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                          selectedIcon === cat.icon
                            ? "bg-stone-800 text-white shadow-lg scale-105"
                            : "bg-stone-50 text-stone-500 hover:bg-stone-100"
                        }`}
                      >
                        <span className="text-xl mb-1">{cat.icon}</span>
                        <span className="text-[10px] font-bold">
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 2. 輸入框 */}
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                          備註名稱
                        </label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="例如: 麥當勞"
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-200 font-bold text-stone-700 placeholder-stone-300"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                          金額
                        </label>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="$"
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-200 font-bold text-stone-700 placeholder-stone-300 text-center"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCustomSubmit}
                      className="w-full py-4 bg-stone-800 text-white rounded-xl font-bold text-lg hover:bg-black active:scale-95 transition-all mt-2 shadow-xl shadow-stone-200"
                    >
                      確認記帳
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ✨ 明細列表區 (History) */}
            <section className="relative z-10 pt-4 pb-12">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 pl-2">
                Recent History
              </h3>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center text-stone-400 text-sm py-4 italic">
                    本月還沒有記帳紀錄 🍃
                  </div>
                ) : (
                  transactions.map((item) => {
                    const nameStr = String(item.name || "");
                    
                    // ✨ 聰明的圖示判斷邏輯
                    let icon = "";
                    let text = "";
  
                    if (nameStr.includes(" ")) {
                      // Case 1: 新格式 (有空白鍵，例如 "🍱 食物")
                      const parts = nameStr.split(" ");
                      icon = parts[0];
                      text = parts.slice(1).join(" ");
                    } else {
                      // Case 2: 舊格式 (純文字，例如 "食物") -> 自動補圖示
                      text = nameStr;
                      if (text.includes("食") || text.includes("餐") || text.includes("飯") || text.includes("便當")) {
                        icon = "🍱";
                      } else if (text.includes("飲") || text.includes("茶") || text.includes("咖") || text.includes("水")) {
                        icon = "🥤";
                      } else if (text.includes("車") || text.includes("油")) {
                        icon = "🚗";
                      } else {
                        // 真的認不出來，就用第一個字
                        icon = text[0];
                      }
                    }
  
                    return (
                      <div
                        key={item.id}
                        className="group flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-100 shadow-sm animate-in slide-in-from-top-2 duration-300"
                      >
                        <div className="flex items-center gap-3">
                          {/* Icon 顯示區 */}
                          <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-xl shadow-inner border border-stone-100 shrink-0">
                            {icon}
                          </div>
  
                          {/* 文字資訊 */}
                          <div>
                            <p className="font-bold text-stone-700 text-sm">
                              {text}
                            </p>
                            <p className="text-xs text-stone-400">
                              {new Date(item.createdAt).toLocaleDateString()}{" "}
                              {new Date(item.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
  
                        {/* 金額與刪除 */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-stone-800">
                            -${item.amount}
                          </span>
                          
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
