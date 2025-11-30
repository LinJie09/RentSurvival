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

export default function Dashboard() {
  // ✨ 新增：解決 Hydration Error 的關鍵狀態
  const [mounted, setMounted] = useState(false);

  // 模式控制
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "investment" | "risk">(
    "dashboard"
  );

  // 資料狀態
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [riskItems, setRiskItems] = useState<any[]>([]);

  // Modal 狀態
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingStock, setIsBuyingStock] = useState(false);
  const [isAddingRisk, setIsAddingRisk] = useState(false);

  // 編輯 ID 狀態
  const [editId, setEditId] = useState<number | null>(null);
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editingRiskId, setEditingRiskId] = useState<number | null>(null);

  // 表單狀態
  const [selectedIcon, setSelectedIcon] = useState(CATEGORIES[0].icon);
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const [stockSymbol, setStockSymbol] = useState("");
  const [stockShares, setStockShares] = useState("");
  const [stockPrice, setStockPrice] = useState("");

  const [riskName, setRiskName] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [riskType, setRiskType] = useState("insurance");

  // 財務設定
  const [budget, setBudget] = useState({
    totalSalary: 32000,
    rent: 8500,
    savingsTarget: 6200,
    riskTarget: 3200,
    fixedCost: 3000,
    currentMonthSpent: 0,
  });
  const [tempBudget, setTempBudget] = useState(budget);

  // 初始化資料
  useEffect(() => {
    // ✨ 關鍵：設定 mounted 為 true，代表瀏覽器已經準備好了
    setMounted(true);

    const initData = async () => {
      try {
        const [budgetRes, spendRes, investRes, riskRes] = await Promise.all([
          fetch("/api/budget"),
          fetch("/api/spend"),
          fetch("/api/investment"),
          fetch("/api/risk"),
        ]);

        const budgetData = await budgetRes.json();
        const spendData = await spendRes.json();
        const investData = await investRes.json();
        const riskData = await riskRes.json();

        setBudget((prev) => ({
          ...prev,
          // ✨ 關鍵修改：把 || 全部改成 ??
          totalSalary: budgetData.totalSalary ?? 32000,
          rent: budgetData.rent ?? 8500,
          savingsTarget: budgetData.savingsTarget ?? 6200,
          riskTarget: budgetData.riskTarget ?? 3200,
          fixedCost: budgetData.fixedCost ?? 3000,
          // 下面這行維持 || 0 或是 ?? 0 都可以，因為 totalSpent 通常不會是預設值問題
          currentMonthSpent: Number(spendData.totalSpent) || 0,
        }));

        setTransactions(spendData.history || []);
        setPortfolio(investData || []);
        setRiskItems(riskData || []);
      } catch (error) {
        console.error("讀取失敗:", error);
      }
    };
    initData();
  }, []);

  // --- 邏輯區 ---

  // 1. 股票邏輯
  const handleEditStockClick = (stock: any) => {
    setStockSymbol(stock.symbol);
    setStockShares(stock.shares.toString());
    setStockPrice(stock.avgCost.toString());
    setEditingStockId(stock.id);
    setIsBuyingStock(true);
  };

  const handleBuyStock = async () => {
    if (!stockSymbol || !stockShares || !stockPrice) return;
    try {
      const payload = {
        symbol: stockSymbol,
        shares: stockShares,
        avgCost: stockPrice,
        currentPrice: stockPrice,
      };
      if (editingStockId) {
        await fetch("/api/investment", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingStockId }),
        });
      } else {
        await fetch("/api/investment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const refreshRes = await fetch("/api/investment");
      setPortfolio(await refreshRes.json());
      setIsBuyingStock(false);
      setEditingStockId(null);
      setStockSymbol("");
      setStockShares("");
      setStockPrice("");
    } catch (e) {
      console.error(e);
    }
  };
  const handleSellStock = async (id: number) => {
    if (!confirm("確定賣出？")) return;
    await fetch("/api/investment", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    const refreshRes = await fetch("/api/investment");
    setPortfolio(await refreshRes.json());
  };

  // 股票資產計算
  const totalStockValue = portfolio.reduce(
    (acc, stock) => acc + stock.shares * stock.avgCost,
    0
  );
  const cashAvailable = budget.savingsTarget;
  const totalWealth = totalStockValue + cashAvailable;
  const stockRatio =
    totalWealth > 0 ? (totalStockValue / totalWealth) * 100 : 0;

  // 2. 風險邏輯
  const handleEditRiskClick = (item: any) => {
    setRiskName(item.name);
    setRiskAmount(item.amount.toString());
    setRiskType(item.type);
    setEditingRiskId(item.id);
    setIsAddingRisk(true);
  };

  const handleAddRiskItem = async () => {
    if (!riskName || !riskAmount) return;
    try {
      const payload = { name: riskName, amount: riskAmount, type: riskType };
      if (editingRiskId) {
        await fetch("/api/risk", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingRiskId }),
        });
      } else {
        await fetch("/api/risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const refreshRes = await fetch("/api/risk");
      setRiskItems(await refreshRes.json());
      setIsAddingRisk(false);
      setEditingRiskId(null);
      setRiskName("");
      setRiskAmount("");
    } catch (e) {
      console.error(e);
    }
  };
  const handleDeleteRiskItem = async (id: number) => {
    if (!confirm("確定刪除？")) return;
    await fetch("/api/risk", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    const refreshRes = await fetch("/api/risk");
    setRiskItems(await refreshRes.json());
  };

  // 風險資產計算
  const totalRiskListValue = riskItems.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );
  const totalInsurance = riskItems
    .filter((item) => item.type === "insurance")
    .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const totalCashItems = riskItems
    .filter((item) => item.type === "cash")
    .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const riskBudgetAvailable = budget.riskTarget;
  const totalProtectionWealth = totalRiskListValue + riskBudgetAvailable;
  const totalRealCash = totalCashItems + riskBudgetAvailable;
  const insuranceRatio =
    totalProtectionWealth > 0
      ? (totalInsurance / totalProtectionWealth) * 100
      : 0;

  // 3. 記帳邏輯
  const livingAccountTotal =
    budget.totalSalary - budget.savingsTarget - budget.riskTarget;
  const livingRemaining =
    livingAccountTotal -
    budget.rent -
    budget.fixedCost -
    budget.currentMonthSpent;
  const today = new Date();
  const nextPayDay = new Date();
  nextPayDay.setDate(5);
  if (today.getDate() >= 5) nextPayDay.setMonth(nextPayDay.getMonth() + 1);
  const daysLeft = Math.ceil(
    (nextPayDay.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );
  const safeDaysLeft = daysLeft > 0 ? daysLeft : 1;
  const dailyBudget = Math.floor(livingRemaining / safeDaysLeft);

  // 圓餅圖計算
  const total = budget.totalSalary || 1;
  const vSavings = budget.savingsTarget;
  const vRisk = budget.riskTarget;
  const vFixed = budget.rent + budget.fixedCost;
  const vSpent = budget.currentMonthSpent;
  // const vRemaining = Math.max(0, total - vSavings - vRisk - vFixed - vSpent);

  const p1 = (vSavings / total) * 100;
  const p2 = p1 + (vRisk / total) * 100;
  const p3 = p2 + (vFixed / total) * 100;
  const p4 = p3 + (vSpent / total) * 100;

  const pieChartStyle = {
    background: `conic-gradient(
      #10B981 0% ${p1}%,  
      #3B82F6 ${p1}% ${p2}%, 
      #78716C ${p2}% ${p3}%, 
      #EF4444 ${p3}% ${p4}%, 
      #F59E0B ${p4}% 100%
    )`,
  };

  const handleEditClick = (item: any) => {
    setEditId(item.id);
    setCustomAmount(item.amount.toString());
    const nameStr = String(item.name || "");
    if (nameStr.includes(" ")) {
      const parts = nameStr.split(" ");
      setSelectedIcon(parts[0]);
      setCustomName(parts.slice(1).join(" "));
    } else {
      setSelectedIcon(CATEGORIES[0].icon);
      setCustomName(nameStr);
    }
    setIsAdding(true);
  };

  const handleSpend = async (amount: number, itemName: string) => {
    try {
      const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, name: itemName }),
      });
      if (res.ok) {
        const refreshRes = await fetch("/api/spend");
        const refreshData = await refreshRes.json();
        const safeTotalSpent = Number(refreshData.totalSpent) || 0;
        setBudget((prev) => ({ ...prev, currentMonthSpent: safeTotalSpent }));
        setTransactions(refreshData.history || []);
      } else {
        alert("記帳失敗");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customName || !customAmount) return;
    const finalName = `${selectedIcon} ${customName}`;
    const amountNum = Number(customAmount);
    try {
      if (editId) {
        await fetch("/api/spend", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            amount: amountNum,
            name: finalName,
          }),
        });
      } else {
        await fetch("/api/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountNum, name: finalName }),
        });
      }
      const refreshRes = await fetch("/api/spend");
      const refreshData = await refreshRes.json();
      const safeTotalSpent = Number(refreshData.totalSpent) || 0;
      setBudget((prev) => ({ ...prev, currentMonthSpent: safeTotalSpent }));
      setTransactions(refreshData.history || []);
      setCustomName("");
      setCustomAmount("");
      setSelectedIcon(CATEGORIES[0].icon);
      setEditId(null);
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定刪除？")) return;
    const res = await fetch("/api/spend", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const refreshRes = await fetch("/api/spend");
      const refreshData = await refreshRes.json();
      const safeTotalSpent = Number(refreshData.totalSpent) || 0;
      setBudget((prev) => ({ ...prev, currentMonthSpent: safeTotalSpent }));
      setTransactions(refreshData.history || []);
    }
  };

  const saveSettings = async () => {
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tempBudget),
    });
    if (res.ok) {
      setBudget(tempBudget);
      setIsEditing(false);
    }
  };

  // ✨ 關鍵修復：如果還沒 mounted (代表還在伺服器端)，就先不要顯示畫面
  // 這樣就不會因為伺服器時間 vs 瀏覽器時間不同而報錯
  if (!mounted) {
    return <div className="min-h-screen bg-[#FDFBF7]"></div>;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-700 p-6 flex justify-center font-sans selection:bg-orange-100">
      <div className="max-w-md w-full space-y-6 relative">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-stone-200 rounded-full blur-3xl opacity-50 z-0"></div>

        {/* Header */}
        <header className="relative z-10 flex justify-between items-end pt-6 pb-2 border-b-2 border-dashed border-stone-200">
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-800 tracking-wide">
              {viewMode === "dashboard"
                ? "RentSurvival"
                : viewMode === "investment"
                ? "Investment Portfolio"
                : "Risk Management"}
            </h1>
            <p className="text-xs text-stone-500 font-medium mt-1">
              {viewMode === "dashboard"
                ? "理財自動導航系統"
                : viewMode === "investment"
                ? "資產增值計畫"
                : "保險與預備金"}
            </p>
          </div>
          <button
            onClick={() => {
              if (viewMode !== "dashboard") setViewMode("dashboard");
              else {
                setTempBudget(budget);
                setIsEditing(true);
              }
            }}
            className="p-2 bg-white border border-stone-200 rounded-full shadow-sm hover:bg-stone-50 active:scale-95 transition-all text-stone-400"
          >
            {viewMode !== "dashboard" ? "↩️" : "⚙️"}
          </button>
        </header>

        {isEditing ? (
          /* 設定頁面 */
          <section className="relative z-10 bg-white rounded-3xl p-8 shadow-lg border border-stone-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
              ✏️ 分配您的薪水
            </h2>
            {(() => {
              const tTotal = tempBudget.totalSalary || 0;
              const tSavings = tempBudget.savingsTarget || 0;
              const tRisk = tempBudget.riskTarget || 0;
              const tRent = tempBudget.rent || 0;
              const tFixed = tempBudget.fixedCost || 0;
              const tRemaining = tTotal - tSavings - tRisk - tRent - tFixed;
              const isNegative = tRemaining < 0;
              return (
                <div
                  className={`mb-6 p-4 rounded-2xl border-2 transition-colors ${
                    isNegative
                      ? "bg-red-50 border-red-100"
                      : "bg-stone-50 border-stone-100"
                  }`}
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                        預估生活費 (Living)
                      </div>
                      <div
                        className={`text-3xl font-serif font-bold ${
                          isNegative ? "text-red-500" : "text-stone-800"
                        }`}
                      >
                        ${tRemaining.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-stone-400">
                      {isNegative ? "⚠️ 預算超支！" : "每月可用"}
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isNegative ? "bg-red-500" : "bg-stone-800"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (tRemaining / (tTotal || 1)) * 100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })()}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  月薪
                </label>
                <input
                  type="number"
                  value={tempBudget.totalSalary}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempBudget({
                      ...tempBudget,
                      totalSalary: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                    儲蓄投資
                  </label>
                  <input
                    type="number"
                    value={tempBudget.savingsTarget}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setTempBudget({
                        ...tempBudget,
                        savingsTarget: Number(e.target.value),
                      })
                    }
                    className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-lg text-emerald-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                    風險規劃
                  </label>
                  <input
                    type="number"
                    value={tempBudget.riskTarget}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setTempBudget({
                        ...tempBudget,
                        riskTarget: Number(e.target.value),
                      })
                    }
                    className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-lg text-blue-700"
                  />
                </div>
              </div>
              <div className="border-t border-dashed border-stone-200 my-2 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      房租
                    </label>
                    <input
                      type="number"
                      value={tempBudget.rent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setTempBudget({
                          ...tempBudget,
                          rent: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      固定帳單
                    </label>
                    <input
                      type="number"
                      value={tempBudget.fixedCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setTempBudget({
                          ...tempBudget,
                          fixedCost: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 font-bold hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 py-3 rounded-xl bg-stone-800 text-white font-bold hover:bg-black shadow-lg"
              >
                儲存分配
              </button>
            </div>

            {/* 重置按鈕 */}
            <div className="mt-8 pt-6 border-t border-stone-100 text-center">
              <button
                onClick={async () => {
                  if (!confirm("⚠️ 警告：確定要清空所有資料嗎？")) return;
                  try {
                    await fetch("/api/reset", { method: "POST" });
                    window.location.reload();
                  } catch (e) {
                    alert("重置失敗");
                  }
                }}
                className="text-red-400 text-xs font-bold hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
              >
                🔴 重置所有資料 (Reset Data)
              </button>
            </div>
          </section>
        ) : viewMode === "investment" ? (
          /* 📈 投資模式 */
          <section className="relative z-10 space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-8xl opacity-10">
                🐂
              </div>
              <div className="relative z-10">
                <div className="text-xs text-emerald-300 font-bold uppercase tracking-widest mb-1">
                  Total Investment Assets
                </div>
                <div className="text-4xl font-serif font-bold mb-4">
                  ${totalWealth.toLocaleString()}
                </div>
                <div className="flex h-3 w-full bg-emerald-950/50 rounded-full overflow-hidden mb-3 border border-emerald-800">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${stockRatio}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-0.5">
                      Stock Value
                    </div>
                    <div className="font-bold text-lg">
                      ${totalStockValue.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-300/60">
                      {stockRatio.toFixed(0)}%
                    </div>
                  </div>
                  <div className="border-l border-emerald-800 pl-4">
                    <div className="text-[10px] text-emerald-200 uppercase tracking-wider mb-0.5">
                      Cash Available
                    </div>
                    <div className="font-bold text-lg text-emerald-200">
                      ${cashAvailable.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-300/60">
                      可加碼資金
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 min-h-[300px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-stone-700">My Holdings</h3>
                <button
                  onClick={() => setIsBuyingStock(true)}
                  className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-bold hover:bg-emerald-200"
                >
                  + 買入
                </button>
              </div>
              <div className="space-y-3">
                {portfolio.length === 0 ? (
                  <div className="text-center text-stone-400 text-sm py-8">
                    尚未持有任何股票 📉
                  </div>
                ) : (
                  portfolio.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex justify-between items-center border-b border-dashed border-stone-100 pb-3 last:border-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800 text-lg">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 rounded">
                            現股
                          </span>
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {stock.shares} 股 • 均價 ${stock.avgCost}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-800">
                          ${(stock.shares * stock.avgCost).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditStockClick(stock)}
                            className="text-[10px] text-stone-300 hover:text-blue-500 underline mr-2"
                          >
                            修改
                          </button>
                          <button
                            onClick={() => handleSellStock(stock.id)}
                            className="text-[10px] text-stone-300 hover:text-red-500 underline"
                          >
                            賣出
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : viewMode === "risk" ? (
          // === 🛡️ 風險模式 ===
          <section className="relative z-10 space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-8xl opacity-10">
                🛡️
              </div>
              <div className="relative z-10">
                <div className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">
                  Total Protection
                </div>
                <div className="text-4xl font-serif font-bold mb-4">
                  ${totalProtectionWealth.toLocaleString()}
                </div>
                <div className="flex h-3 w-full bg-green-900/30 rounded-full overflow-hidden mb-3 border border-blue-800">
                  <div
                    className="bg-orange-400 h-full transition-all duration-500"
                    style={{ width: `${insuranceRatio}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-orange-300 uppercase tracking-wider mb-0.5">
                      Insurance Value
                    </div>
                    <div className="font-bold text-lg text-orange-50">
                      ${totalInsurance.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-orange-300/60">
                      {insuranceRatio.toFixed(0)}%
                    </div>
                  </div>
                  <div className="border-l border-blue-800 pl-4">
                    <div className="text-[10px] text-green-300 uppercase tracking-wider mb-0.5">
                      Total Cash
                    </div>
                    <div className="font-bold text-lg text-green-50">
                      ${totalRealCash.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-green-300/60">
                      含本月預算
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 min-h-[300px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-stone-700">Policies & Cash</h3>
                <button
                  onClick={() => setIsAddingRisk(true)}
                  className="bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-bold hover:bg-blue-200"
                >
                  + 新增
                </button>
              </div>
              <div className="space-y-3">
                {riskItems.length === 0 ? (
                  <div className="text-center text-stone-400 text-sm py-8">
                    尚未新增任何項目 🍃
                    <br />
                    <span className="text-xs">記錄您的保險或預備金</span>
                  </div>
                ) : (
                  riskItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border-b border-dashed border-stone-100 pb-3 last:border-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800 text-base">
                            {item.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 rounded ${
                              item.type === "insurance"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {item.type === "insurance" ? "保險" : "存款"}
                          </span>
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString()} 加入
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-800">
                          ${item.amount.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditRiskClick(item)}
                            className="text-[10px] text-stone-300 hover:text-blue-500 underline mr-2"
                          >
                            修改
                          </button>
                          <button
                            onClick={() => handleDeleteRiskItem(item.id)}
                            className="text-[10px] text-stone-300 hover:text-red-500 underline"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : (
          /* 主頁 (Dashboard) */
          <>
            <section className="relative z-10 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setViewMode("investment")}
                  className="bg-white p-4 rounded-2xl border-l-4 border-emerald-400 shadow-sm cursor-pointer hover:bg-emerald-50 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">
                      Savings
                    </div>
                    <div className="text-xs text-stone-300 group-hover:text-emerald-500">
                      ↗
                    </div>
                  </div>
                  <div className="text-xl font-bold text-emerald-600">
                    ${budget.savingsTarget.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-400 bg-emerald-50 inline-block px-2 py-0.5 rounded-full mt-1">
                    🔒 點擊管理投資
                  </div>
                </div>
                <div
                  onClick={() => setViewMode("risk")}
                  className="bg-white p-4 rounded-2xl border-l-4 border-blue-400 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">
                      Risk Fund
                    </div>
                    <div className="text-xs text-stone-300 group-hover:text-blue-500">
                      ↗
                    </div>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    ${budget.riskTarget.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-400 bg-blue-50 inline-block px-2 py-0.5 rounded-full mt-1">
                    🛡️ 點擊管理保險
                  </div>
                </div>
              </div>

              {/* 生活帳戶 (圓餅圖 - 米白配色) */}
              <div className="bg-[#FFF9F5] text-stone-700 p-6 rounded-3xl shadow-xl shadow-stone-200/50 relative overflow-hidden border border-stone-100">
                <div className="relative z-10 flex items-center justify-between gap-6">
                  <div
                    className="relative w-32 h-32 flex-shrink-0 rounded-full shadow-lg"
                    style={pieChartStyle}
                  >
                    <div className="absolute inset-3 bg-[#FFF9F5] rounded-full flex flex-col items-center justify-center border-4 border-white shadow-inner">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                        Daily
                      </span>
                      <span
                        className={`text-2xl font-serif font-bold ${
                          dailyBudget < 300 ? "text-red-500" : "text-stone-800"
                        }`}
                      >
                        ${dailyBudget}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
                      Living Account
                    </h2>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-serif font-bold text-stone-800">
                        ${livingRemaining.toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-500">剩餘</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        儲蓄 {((vSavings / total) * 100).toFixed(0)}%
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        風險 {((vRisk / total) * 100).toFixed(0)}%
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-stone-500"></span>
                        固定 {((vFixed / total) * 100).toFixed(0)}%
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        已花 {((vSpent / total) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-200 flex justify-between text-xs text-stone-400">
                  <span>總收入 ${budget.totalSalary.toLocaleString()}</span>
                  <span>距離發薪 {daysLeft} 天</span>
                </div>
              </div>
            </section>

            <section className="relative z-10 grid grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => handleSpend(100, "🍱 食物")}
                className="group relative bg-white p-4 rounded-2xl border-2 border-stone-100 hover:border-orange-200 transition-all active:top-[2px] active:shadow-none shadow-[0_4px_0_#E7E5E4]"
              >
                <div className="text-center">
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">
                    🍱
                  </span>
                  <span className="text-stone-600 font-bold text-xs tracking-wide">
                    Lunch
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleSpend(60, "🥤 飲料")}
                className="group relative bg-white p-4 rounded-2xl border-2 border-stone-100 hover:border-blue-200 transition-all active:top-[2px] active:shadow-none shadow-[0_4px_0_#E7E5E4]"
              >
                <div className="text-center">
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">
                    🥤
                  </span>
                  <span className="text-stone-600 font-bold text-xs tracking-wide">
                    Drink
                  </span>
                </div>
              </button>
              <button
                onClick={() => {
                  setIsAdding(true);
                  setSelectedIcon(CATEGORIES[0].icon);
                  setCustomName("");
                  setCustomAmount("");
                  setEditId(null);
                }}
                className="group relative bg-stone-200 p-4 rounded-2xl border-2 border-stone-200 hover:bg-stone-300 transition-all active:top-[2px] active:shadow-none shadow-[0_4px_0_#A8A29E]"
              >
                <div className="text-center text-stone-600">
                  <span className="text-2xl block mb-1 group-hover:rotate-90 transition-transform">
                    ➕
                  </span>
                  <span className="font-bold text-xs tracking-wide">
                    Custom
                  </span>
                </div>
              </button>
            </section>

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
                    let icon = "";
                    let text = "";
                    if (nameStr.includes(" ")) {
                      const parts = nameStr.split(" ");
                      icon = parts[0];
                      text = parts.slice(1).join(" ");
                    } else {
                      text = nameStr;
                      if (
                        text.includes("食") ||
                        text.includes("餐") ||
                        text.includes("便當")
                      )
                        icon = "🍱";
                      else if (text.includes("飲") || text.includes("茶"))
                        icon = "🥤";
                      else if (text.includes("車") || text.includes("油"))
                        icon = "🚗";
                      else icon = text[0];
                    }
                    return (
                      <div
                        key={item.id}
                        className="group flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-100 shadow-sm animate-in slide-in-from-top-2 duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-xl shadow-inner border border-stone-100 shrink-0">
                            {icon}
                          </div>
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
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-stone-800">
                            -${item.amount}
                          </span>
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-2 text-stone-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
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

        {/* 1. 記帳 Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsAdding(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              <button
                onClick={() => setIsAdding(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-bold text-stone-800">
                  {editId ? "✏️ 修改支出" : "✨ 新增支出"}
                </h3>
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-2xl border border-stone-200">
                  {selectedIcon}
                </div>
              </div>
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
                    <span className="text-[10px] font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 text-center"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCustomSubmit}
                  className="w-full py-4 bg-stone-800 text-white rounded-xl font-bold text-lg hover:bg-black mt-2 shadow-xl"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. 買股票 Modal */}
        {isBuyingStock && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsBuyingStock(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-t-4 border-emerald-500">
              <button
                onClick={() => setIsBuyingStock(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">
                {editingStockId ? "✏️ 修改持股" : "🐂 買入股票"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    股票代號
                  </label>
                  <input
                    type="text"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      股數
                    </label>
                    <input
                      type="number"
                      value={stockShares}
                      onChange={(e) => setStockShares(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      成交價
                    </label>
                    <input
                      type="number"
                      value={stockPrice}
                      onChange={(e) => setStockPrice(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                    />
                  </div>
                </div>
                <button
                  onClick={handleBuyStock}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 mt-2 shadow-xl shadow-emerald-200"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. 新增風險 Modal */}
        {isAddingRisk && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-blue-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsAddingRisk(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-t-4 border-blue-500">
              <button
                onClick={() => setIsAddingRisk(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">
                {editingRiskId ? "✏️ 修改項目" : "🛡️ 新增保險/預備金"}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
                  <button
                    onClick={() => setRiskType("insurance")}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      riskType === "insurance"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-stone-400"
                    }`}
                  >
                    保險單
                  </button>
                  <button
                    onClick={() => setRiskType("cash")}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      riskType === "cash"
                        ? "bg-white text-green-600 shadow-sm"
                        : "text-stone-400"
                    }`}
                  >
                    緊急預備金
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    項目名稱
                  </label>
                  <input
                    type="text"
                    value={riskName}
                    onChange={(e) => setRiskName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    金額
                  </label>
                  <input
                    type="number"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <button
                  onClick={handleAddRiskItem}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 mt-2 shadow-xl shadow-blue-200"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}
        {/* === 彈出視窗區塊 (Modals) === */}

        {/* 1. 記帳 Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsAdding(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              {/* 關閉按鈕 */}
              <button
                onClick={() => setIsAdding(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-bold text-stone-800">
                  {editId ? "✏️ 修改支出" : "✨ 新增支出"}
                </h3>
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-2xl border border-stone-200">
                  {selectedIcon}
                </div>
              </div>

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
                    <span className="text-[10px] font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>

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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 text-center"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCustomSubmit}
                  className="w-full py-4 bg-stone-800 text-white rounded-xl font-bold text-lg hover:bg-black mt-2 shadow-xl"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. 買股票 Modal */}
        {isBuyingStock && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsBuyingStock(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-t-4 border-emerald-500">
              {/* 關閉按鈕 */}
              <button
                onClick={() => setIsBuyingStock(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">
                {editingStockId ? "✏️ 修改持股" : "🐂 買入股票"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    股票代號 (Symbol)
                  </label>
                  <input
                    type="text"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      股數 (Shares)
                    </label>
                    <input
                      type="number"
                      value={stockShares}
                      onChange={(e) => setStockShares(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      成交價 (Price)
                    </label>
                    <input
                      type="number"
                      value={stockPrice}
                      onChange={(e) => setStockPrice(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                    />
                  </div>
                </div>
                <button
                  onClick={handleBuyStock}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 mt-2 shadow-xl shadow-emerald-200"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. 新增風險 Modal */}
        {isAddingRisk && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-blue-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsAddingRisk(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-t-4 border-blue-500">
              {/* 關閉按鈕 */}
              <button
                onClick={() => setIsAddingRisk(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">
                {editingRiskId ? "✏️ 修改項目" : "🛡️ 新增保險/預備金"}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
                  <button
                    onClick={() => setRiskType("insurance")}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      riskType === "insurance"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-stone-400"
                    }`}
                  >
                    保險單
                  </button>
                  <button
                    onClick={() => setRiskType("cash")}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      riskType === "cash"
                        ? "bg-white text-green-600 shadow-sm"
                        : "text-stone-400"
                    }`}
                  >
                    緊急預備金
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    項目名稱
                  </label>
                  <input
                    type="text"
                    value={riskName}
                    onChange={(e) => setRiskName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    金額
                  </label>
                  <input
                    type="number"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <button
                  onClick={handleAddRiskItem}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 mt-2 shadow-xl shadow-blue-200"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
