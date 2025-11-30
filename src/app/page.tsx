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
  // 模式控制 (新增 'risk' 模式)
  const [isEditing, setIsEditing] = useState(false);
  // 必須明確告訴 TypeScript 這三個都是合法的狀態
  const [viewMode, setViewMode] = useState<"dashboard" | "investment" | "risk">(
    "dashboard"
  );

  // 資料狀態
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]); // 投資
  const [riskItems, setRiskItems] = useState<any[]>([]); // ✨ 風險項目

  // Modal 狀態
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingStock, setIsBuyingStock] = useState(false);
  const [isAddingRisk, setIsAddingRisk] = useState(false); // ✨ 新增風險項目 Modal

  // 表單狀態
  const [selectedIcon, setSelectedIcon] = useState(CATEGORIES[0].icon);
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const [stockSymbol, setStockSymbol] = useState("");
  const [stockShares, setStockShares] = useState("");
  const [stockPrice, setStockPrice] = useState("");

  const [riskName, setRiskName] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [riskType, setRiskType] = useState("insurance"); // insurance 或 cash

  const [editId, setEditId] = useState<number | null>(null); // ✨ 新增：記錄正在編輯的 ID

  // ✨ 新增：記錄正在編輯的投資 ID 與 風險 ID
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editingRiskId, setEditingRiskId] = useState<number | null>(null);

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

  // 初始化資料 (多抓一個 risk API)
  useEffect(() => {
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
          totalSalary: budgetData.totalSalary || 32000,
          rent: budgetData.rent || 8500,
          savingsTarget: budgetData.savingsTarget || 6200,
          riskTarget: budgetData.riskTarget || 3200,
          fixedCost: budgetData.fixedCost || 3000,
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

  // --- 1. 股票邏輯 (升級版) ---
  const handleEditStockClick = (stock: any) => {
    setStockSymbol(stock.symbol);
    setStockShares(stock.shares.toString());
    setStockPrice(stock.avgCost.toString());
    setEditingStockId(stock.id); // 設定編輯 ID
    setIsBuyingStock(true); // 打開視窗
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
        // 修改 (PUT)
        await fetch("/api/investment", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingStockId }),
        });
      } else {
        // 新增 (POST)
        await fetch("/api/investment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const refreshRes = await fetch("/api/investment");
      setPortfolio(await refreshRes.json());

      // 重置與關閉
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
  // 計算總資產 (股票 + 現金)
  const totalStockValue = portfolio.reduce(
    (acc, stock) => acc + stock.shares * stock.avgCost,
    0
  );

  // 👇 記得確認有加上這三行 👇
  const cashAvailable = budget.savingsTarget;
  const totalWealth = totalStockValue + cashAvailable;
  const stockRatio =
    totalWealth > 0 ? (totalStockValue / totalWealth) * 100 : 0;

  // --- 2. 風險邏輯 (升級版) ---
  const handleEditRiskClick = (item: any) => {
    setRiskName(item.name);
    setRiskAmount(item.amount.toString());
    setRiskType(item.type);
    setEditingRiskId(item.id); // 設定編輯 ID
    setIsAddingRisk(true); // 打開視窗
  };

  // 新增或修改 Risk 項目
  const handleAddRiskItem = async () => {
    // 簡單防呆
    if (!riskName || !riskAmount) return;

    try {
      const payload = { name: riskName, amount: riskAmount, type: riskType };

      // 1. 判斷是修改還是新增
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

      // 2. ✨ 關鍵：操作完畢後，馬上重抓最新資料 (Refetch)
      const refreshRes = await fetch("/api/risk");
      const newData = await refreshRes.json();
      setRiskItems(newData);

      // 3. 重置表單
      setIsAddingRisk(false);
      setEditingRiskId(null);
      setRiskName("");
      setRiskAmount("");
    } catch (e) {
      console.error(e);
    }
  };

  // 刪除 Risk 項目
  const handleDeleteRiskItem = async (id: number) => {
    if (!confirm("確定刪除這個項目嗎？")) return;

    try {
      await fetch("/api/risk", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });

      // ✨ 關鍵：刪除後也要重抓，數字才會變
      const refreshRes = await fetch("/api/risk");
      setRiskItems(await refreshRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  // --- 2. 風險邏輯 (升級版：加入預算計算) ---

  // (a) 計算列表內的總額
  const totalRiskListValue = riskItems.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );

  // (b) 計算列表內的分類
  const totalInsurance = riskItems
    .filter((item) => item.type === "insurance")
    .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const totalCashItems = riskItems
    .filter((item) => item.type === "cash")
    .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // (c) ✨ 關鍵新增：把「每月風險預算」算進來當作現金
  const riskBudgetAvailable = budget.riskTarget;

  // (d) 真正的總資產 = 列表總額 + 預算現金
  const totalProtectionWealth = totalRiskListValue + riskBudgetAvailable;

  // (e) 計算總現金部位 (列表裡的存款 + 預算現金)
  const totalRealCash = totalCashItems + riskBudgetAvailable;

  // (f) 計算保險佔比 (用於進度條)
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

  // --- ✨ 新增：圓餅圖計算 (Pie Chart Logic) ---
  const total = budget.totalSalary || 1; // 避免除以 0

  // 各區塊的金額
  const vSavings = budget.savingsTarget;
  const vRisk = budget.riskTarget;
  const vFixed = budget.rent + budget.fixedCost;
  const vSpent = budget.currentMonthSpent;
  // 剩餘生活費 (不能小於 0)
  const vRemaining = Math.max(0, total - vSavings - vRisk - vFixed - vSpent);

  // 轉換成百分比 (Cumulative Percentages)
  const p1 = (vSavings / total) * 100; // 儲蓄結束點
  const p2 = p1 + (vRisk / total) * 100; // 風險結束點
  const p3 = p2 + (vFixed / total) * 100; // 固定支出結束點
  const p4 = p3 + (vSpent / total) * 100; // 花費結束點
  // p4 到 100% 就是剩餘生活費

  const pieChartStyle = {
    background: `conic-gradient(
      #10B981 0% ${p1}%,  
      #3B82F6 ${p1}% ${p2}%, 
      #78716C ${p2}% ${p3}%, 
      #EF4444 ${p3}% ${p4}%, 
      #F59E0B ${p4}% 100%
    )`,
  };

  const handleSpend = async (amount: number, itemName: string) => {
    const res = await fetch("/api/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, name: itemName }),
    });
    if (res.ok) {
      const refreshRes = await fetch("/api/spend");
      const refreshData = await refreshRes.json();
      setBudget((prev) => ({
        ...prev,
        currentMonthSpent: Number(refreshData.totalSpent) || 0,
      }));
      setTransactions(refreshData.history || []);
    }
  };
  // ✨ 新增：準備編輯 (把資料填回表單)
  const handleEditClick = (item: any) => {
    setEditId(item.id); // 設定現在要修這筆
    setCustomAmount(item.amount.toString());

    // 解析名字與圖示 (例如 "🍔 麥當勞" -> icon="🍔", name="麥當勞")
    const nameStr = String(item.name || "");
    if (nameStr.includes(" ")) {
      const parts = nameStr.split(" ");
      setSelectedIcon(parts[0]);
      setCustomName(parts.slice(1).join(" "));
    } else {
      // 舊資料或是純文字
      setSelectedIcon(CATEGORIES[0].icon);
      setCustomName(nameStr);
    }

    setIsAdding(true); // 打開視窗
  };

  // ✨ 修改後的送出邏輯 (支援新增與修改)
  const handleCustomSubmit = async () => {
    if (!customName || !customAmount) return;
    const finalName = `${selectedIcon} ${customName}`;
    const amountNum = Number(customAmount);

    try {
      if (editId) {
        // === 🟡 修改模式 (PUT) ===
        const res = await fetch("/api/spend", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            amount: amountNum,
            name: finalName,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        // === 🟢 新增模式 (POST) - 原本的邏輯 ===
        const res = await fetch("/api/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountNum, name: finalName }),
        });
        if (!res.ok) throw new Error("Create failed");
      }

      // 無論新增或修改，都要重抓資料
      const refreshRes = await fetch("/api/spend");
      const refreshData = await refreshRes.json();
      const safeTotalSpent = Number(refreshData.totalSpent) || 0;

      setBudget((prev) => ({ ...prev, currentMonthSpent: safeTotalSpent }));
      setTransactions(refreshData.history || []);

      // 清空與關閉
      setCustomName("");
      setCustomAmount("");
      setSelectedIcon(CATEGORIES[0].icon);
      setEditId(null); // ✨ 記得清空編輯 ID
      setIsAdding(false);
    } catch (error) {
      console.error(error);
      alert("操作失敗");
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
      setBudget((prev) => ({
        ...prev,
        currentMonthSpent: Number(refreshData.totalSpent) || 0,
      }));
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

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-700 p-6 flex justify-center font-sans selection:bg-orange-100">
      <div className="max-w-md w-full space-y-6 relative">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-stone-200 rounded-full blur-3xl opacity-50 z-0"></div>

        {/* Header (根據模式改變標題) */}
        <header className="relative z-10 flex justify-between items-end pt-6 pb-2 border-b-2 border-dashed border-stone-200">
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-800 tracking-wide">
              {viewMode === "dashboard"
                ? "Rent Survival"
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
            className="p-2  border-stone-200 rounded-full  hover:bg-stone-50 active:scale-95 transition-all text-stone-400"
          >
            {viewMode !== "dashboard" ? "↩️" : "⚙️"}
          </button>
        </header>

        {isEditing ? (
          // === 📝 設定表單 ===
          <section className="relative z-10 bg-white rounded-3xl p-8 shadow-lg border border-stone-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
              ✏️ 分配您的薪水
            </h2>

            {/* 即時預算試算 (保持不變) */}
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
              {/* 1. 薪水 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  月薪
                </label>
                <input
                  type="number"
                  // ✨ 修改重點：直接綁定變數，不加 || ''，這樣 0 就會顯示出來
                  value={tempBudget.totalSalary}
                  // ✨ 自動全選：點擊時選取數字，方便直接輸入
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempBudget({
                      ...tempBudget,
                      totalSalary: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-lg text-stone-700"
                />
              </div>

              {/* 2. 儲蓄與風險 */}
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

              {/* 3. 固定支出 */}
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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
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
          </section>
        ) : viewMode === "investment" ? (
          // === 📈 投資儀表板 (Investment Mode) ===
          <section className="relative z-10 space-y-4 animate-in slide-in-from-right-4 duration-300">
            {/* ✨ 修改點：總資產卡片 (升級版：顯示股票 + 現金) */}
            <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-8xl opacity-10">
                🐂
              </div>
              <div className="relative z-10">
                <div className="text-xs text-emerald-300 font-bold uppercase tracking-widest mb-1">
                  Total Investment Assets
                </div>

                {/* 大數字：顯示總資產 (股票+現金) */}
                <div className="text-4xl font-serif font-bold mb-4">
                  ${totalWealth.toLocaleString()}
                </div>

                {/* 進度條：顯示資金水位 */}
                <div className="flex h-3 w-full bg-emerald-950/50 rounded-full overflow-hidden mb-3 border border-emerald-800">
                  {/* 股票部位 (深綠) */}
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${stockRatio}%` }}
                  ></div>
                </div>

                {/* 兩個小區塊詳細數據 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 左邊：股票市值 */}
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

                  {/* 右邊：待投資現金 (來自 Savings) */}
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

            {/* 持股列表 (這裡維持您原本的樣子，加上買股視窗開關) */}
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
                      {/* === 左側：股票資訊 (代號、股數) === */}
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

                      {/* === 右側：市值 + 操作按鈕 (您原本貼的那段在這裡) === */}
                      <div className="text-right">
                        <div className="font-bold text-stone-800">
                          ${(stock.shares * stock.avgCost).toLocaleString()}
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          {/* ✨ 編輯按鈕 */}
                          <button
                            onClick={() => handleEditStockClick(stock)}
                            className="text-[10px] text-stone-300 hover:text-blue-500 underline mr-2"
                          >
                            修改
                          </button>

                          {/* 賣出按鈕 */}
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
          // === 🛡️ ✨ 新增：風險管理模式 (Risk Mode) ===
          <section className="relative z-10 space-y-4 animate-in slide-in-from-right-4 duration-300">
            {/* 風險總覽卡片 (升級版：保險 + 預備金) */}
            {/* 風險總覽卡片 (雙軌制升級版) */}
            <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-8xl opacity-10">
                🛡️
              </div>
              <div className="relative z-10">
                <div className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">
                  Total Protection
                </div>

                {/* 大數字：顯示 列表項目 + 預算現金 */}
                <div className="text-4xl font-serif font-bold mb-4">
                  ${totalProtectionWealth.toLocaleString()}
                </div>

                {/* 配置條：橘色(保險) vs 綠色(所有現金) */}
                <div className="flex h-3 w-full bg-green-900/30 rounded-full overflow-hidden mb-3 border border-blue-800">
                  <div
                    className="bg-orange-400 h-full transition-all duration-500"
                    style={{ width: `${insuranceRatio}%` }}
                  ></div>
                </div>

                {/* 詳細數據 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 左邊：保險總額 */}
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

                  {/* 右邊：總現金 (存款項目 + 本月預算) */}
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

            {/* 風險項目列表 */}
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
                    <div className="text-right">
                      <div className="font-bold text-stone-800">
                        ${item.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {/* ✨ 新增：風險項目編輯按鈕 */}
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

                {/* ✨ 讓風險卡片也可以點擊，進入 Risk 模式 */}
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

              {/* 2. 生活帳戶 (圓餅圖版 - 米白配色) */}
              <div className="bg-[#FFF9F5] text-stone-700 p-6 rounded-3xl shadow-xl shadow-stone-200/50 relative overflow-hidden border border-stone-100">
                <div className="relative z-10 flex items-center justify-between gap-6">
                  {/* 左邊：圓餅圖 */}
                  <div
                    className="relative w-32 h-32 flex-shrink-0 rounded-full shadow-lg"
                    style={pieChartStyle}
                  >
                    {/* ✨ 修改 2：中間挖空背景要跟著變米白，邊框改成白色增加層次 */}
                    <div className="absolute inset-3 bg-[#FFF9F5] rounded-full flex flex-col items-center justify-center border-4 border-white shadow-inner">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                        Daily
                      </span>
                      {/* ✨ 修改 3：金額文字改深色 */}
                      <span
                        className={`text-2xl font-serif font-bold ${
                          dailyBudget < 300 ? "text-red-500" : "text-stone-800"
                        }`}
                      >
                        ${dailyBudget}
                      </span>
                    </div>
                  </div>

                  {/* 右邊：資訊與圖例 */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
                      Living Account
                    </h2>

                    {/* 大標題：剩餘生活費 */}
                    <div className="flex items-baseline gap-2 mb-3">
                      {/* ✨ 修改 4：剩餘金額改深色 */}
                      <span className="text-3xl font-serif font-bold text-stone-800">
                        ${livingRemaining.toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-500">剩餘</span>
                    </div>

                    {/* 圖例 Legend (文字改深) */}
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

                {/* 底部資訊 (分隔線改淺) */}
                <div className="mt-4 pt-3 border-t border-stone-200 flex justify-between text-xs text-stone-400">
                  <span>總收入 ${budget.totalSalary.toLocaleString()}</span>
                  <span>距離發薪 {daysLeft} 天</span>
                </div>
              </div>
            </section>

            {/* 按鈕與列表 (省略) */}
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
                  setIsAdding(false);
                  setEditId(null);
                  setCustomName("");
                  setCustomAmount("");
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
                    // 解析圖示與文字
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
                        {/* 左側：圖示 + 文字 */}
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

                        {/* 右側：金額 + 操作按鈕區 */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-stone-800">
                            -${item.amount}
                          </span>

                          {/* ✨ 新增：編輯按鈕 (鉛筆圖示) */}
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-2 text-stone-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                            title="修改"
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

                          {/* 刪除按鈕 (垃圾桶) */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                            title="刪除"
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

        {/* Modal 區塊 (記帳、買股、新增風險) */}
        {/* 1. 記帳 (省略，維持) */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => {
                setIsAdding(false);
                setEditId(null);
                setCustomName("");
                setCustomAmount("");
              }}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-bold text-stone-800">
                  ✨ 新增支出
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
                  確認記帳
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. 買股票 Modal */}
        {isBuyingStock && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* 點擊背景關閉 */}
            <div
              className="absolute inset-0"
              onClick={() => setIsBuyingStock(false)}
            ></div>

            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-t-4 border-emerald-500">
              {/* ✨ 新增：右上角關閉小叉叉 */}
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
                    placeholder="例如: 0050, 2330"
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
                      placeholder="股"
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
                      placeholder="$"
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                    />
                  </div>
                </div>
                <button
                  onClick={handleBuyStock}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 mt-2 shadow-xl shadow-emerald-200"
                >
                  確認買入
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. ✨ 新增風險項目 Modal (已加入關閉按鈕) */}
        {isAddingRisk && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-blue-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* 點擊背景關閉 */}
            <div
              className="absolute inset-0"
              onClick={() => setIsAddingRisk(false)}
            ></div>

            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-t-4 border-blue-500">
              {/* ✨ 新增：右上角關閉小叉叉 */}
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
                {/* 類型選擇 */}
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
                    placeholder={
                      riskType === "insurance"
                        ? "例如: 國泰人壽意外險"
                        : "例如: 銀行定存"
                    }
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    {riskType === "insurance" ? "保費金額 (年/月)" : "存款金額"}
                  </label>
                  <input
                    type="number"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(e.target.value)}
                    placeholder="$"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700"
                  />
                </div>
                <button
                  onClick={handleAddRiskItem}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 mt-2 shadow-xl shadow-blue-200"
                >
                  確認新增
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
