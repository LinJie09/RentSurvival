"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";

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

  const [customDate, setCustomDate] = useState("");
  const [recordType, setRecordType] = useState("EXPENSE");

  // 在 Dashboard 組件內
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 }); // ✨ 新增這行

  const [lastMonthData, setLastMonthData] = useState({ spent: 0, balance: 0 });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 補 0
    return `${year}-${month}`;
  });

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
  // 財務設定
  const [budget, setBudget] = useState({
    totalSalary: 32000,
    payDay: 5, // ✨ 新增
    rent: 0,
    savingsTarget: 0,
    riskTarget: 0,
    fixedCost: 0,
    currentMonthSpent: 0,
  });
  const [tempBudget, setTempBudget] = useState(budget);

  // 初始化資料
  // 1. 確保瀏覽器已準備好 (解決 Hydration Error)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. 讀取資料 (當 mounted 完成 或 切換月份 時執行)
  // 初始化資料 (當 mounted 或 selectedMonth 改變時執行)
  useEffect(() => {
    if (!mounted) return;

    const initData = async () => {
      try {
        const [budgetRes, spendRes, investRes, riskRes] = await Promise.all([
          fetch("/api/budget"),
          fetch(`/api/spend?month=${selectedMonth}`),
          fetch("/api/investment"),
          fetch("/api/risk"),
        ]);

        const budgetData = await budgetRes.json();
        const spendData = await spendRes.json();
        const investData = await investRes.json();
        const riskData = await riskRes.json();

        // 1. 更新預算設定 (這裡主要讀取房租、儲蓄等固定值)
        setBudget((prev) => ({
          ...prev,
          totalSalary: budgetData.totalSalary ?? 32000, // 雖然有讀，但計算時會改用實際收入
          rent: budgetData.rent ?? 0,
          payDay: budgetData.payDay ?? 5,
          savingsTarget: budgetData.savingsTarget ?? 0,
          riskTarget: budgetData.riskTarget ?? 0,
          fixedCost: budgetData.fixedCost ?? 0,
          currentMonthSpent: 0, // 這裡歸 0 沒關係，因為我們會用 monthlyStats.expense
        }));

        // 2. ✨ 更新本月收支統計 (這是新加的，用來算餘額)
        setMonthlyStats({
          income: Number(spendData.totalIncome) || 0,
          expense: Number(spendData.totalExpense) || 0,
        });

        // 3. 更新列表
        setTransactions(spendData.history || []);
        setPortfolio(Array.isArray(investData) ? investData : []);
        setRiskItems(Array.isArray(riskData) ? riskData : []);

        // 4. ✨ 計算上月結餘 (實報實銷版)
        // 邏輯：上月實際收入 - 固定支出(設定值) - 上月實際花費
        const fixedCosts =
          (budgetData.rent ?? 8500) +
          (budgetData.fixedCost ?? 3000) +
          (budgetData.savingsTarget ?? 6200) +
          (budgetData.riskTarget ?? 3200);

        const lastMonthIncome = spendData.lastMonthIncome || 0;
        const lastMonthExpense = Number(spendData.lastMonthSpent) || 0; // 注意：API回傳欄位可能是 lastMonthExpense 或 lastMonthSpent，請依 API 為準(這裡用您的 spendData)

        // 如果上個月完全沒收入也沒支出，就顯示 0
        const lastMonthBalance =
          lastMonthIncome === 0 && lastMonthExpense === 0
            ? 0
            : lastMonthIncome - fixedCosts - lastMonthExpense;

        setLastMonthData({
          spent: lastMonthExpense,
          balance: lastMonthBalance,
        });
      } catch (error) {
        console.error("讀取失敗:", error);
      }
    };

    initData();
  }, [mounted, selectedMonth]);

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

  const safePortfolio = Array.isArray(portfolio) ? portfolio : [];

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
  const safeRiskItems = Array.isArray(riskItems) ? riskItems : [];

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
  // --- 3. 記帳核心計算邏輯 (實報實銷版) ---

  // (1) 計算固定扣除額 (儲蓄 + 風險 + 房租 + 帳單)
  // 這些錢是「一拿到薪水就要先扣掉」的，不能拿來花
  const totalFixedCosts =
    (budget.savingsTarget ?? 0) +
    (budget.riskTarget ?? 0) +
    (budget.rent ?? 0) +
    (budget.fixedCost ?? 0);

  // (2) 計算生活帳戶餘額 (Living Remaining)
  // 公式：本月實際總收入 - 固定扣除額 - 本月實際總支出
  const livingRemaining =
    monthlyStats.income - totalFixedCosts - monthlyStats.expense;

  // (3) 計算距離發薪日天數 (維持原樣)
  const today = new Date();
  const nextPayDay = new Date();
  const userPayDay = budget.payDay || 5;
  // 假設每月 5 號發薪
  nextPayDay.setDate(userPayDay);
  if (today.getDate() >= userPayDay) {
    nextPayDay.setMonth(nextPayDay.getMonth() + 1);
  }
  const daysLeft = Math.ceil(
    (nextPayDay.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );

  // (4) 計算每日預算 (Daily Budget)
  // 如果餘額是負的，每日預算就顯示負的，提醒使用者透支了
  const safeDaysLeft = daysLeft > 0 ? daysLeft : 1;
  const dailyBudget = Math.floor(livingRemaining / safeDaysLeft);

  // --- 圓餅圖計算 (Pie Chart Logic) ---

  /// 如果本月還沒收入，暫時用「預設月薪」當分母來畫圖，這樣圓餅圖才不會壞掉
  const total =
    monthlyStats.income > 0 ? monthlyStats.income : budget.totalSalary || 1;

  // 判斷有無資料 (用來決定是否顯示灰色空狀態)
  const hasData = transactions.length > 0;

  // 定義各區塊數值
  const vSavings = hasData ? budget.savingsTarget ?? 0 : 0;
  const vRisk = hasData ? budget.riskTarget ?? 0 : 0;
  const vFixed = hasData ? (budget.rent ?? 0) + (budget.fixedCost ?? 0) : 0;
  const vSpent = hasData ? monthlyStats.expense : 0; // 改用實際支出

  // 計算百分比
  const p1 = (vSavings / total) * 100;
  const p2 = p1 + (vRisk / total) * 100;
  const p3 = p2 + (vFixed / total) * 100;
  const p4 = p3 + (vSpent / total) * 100;

  const pieChartStyle = {
    background: hasData
      ? `conic-gradient(
      #10B981 0% ${p1}%,  
      #3B82F6 ${p1}% ${p2}%, 
      #78716C ${p2}% ${p3}%, 
      #EF4444 ${p3}% ${p4}%, 
      #F59E0B ${p4}% 100%
    )`
      : "#E7E5E4", // 沒資料顯示全灰
  };

  // 定義顯示用的變數 (UI 直接用這兩個)
  const displayLiving = hasData ? livingRemaining : 0;
  const displayDaily = hasData ? dailyBudget : 0;

  // ✨ 補上這兩行，上方的小卡片才抓得到變數
  const displaySavings = hasData ? budget.savingsTarget ?? 0 : 0;
  const displayRisk = hasData ? budget.riskTarget ?? 0 : 0;

  const handleEditClick = (item: any) => {
    setEditId(item.id);
    setCustomAmount(item.amount.toString());
    setRecordType(item.type || "EXPENSE");
    // 處理日期格式 (YYYY-MM-DD)
    setCustomDate(new Date(item.createdAt).toISOString().split("T")[0]);

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

  // 1. 快速記帳按鈕邏輯 (修正日期問題)
  const handleSpend = async (amount: number, itemName: string) => {
    try {
      // ✨ 智慧日期判斷：
      // 如果「選取的月份」跟「真實世界的這個月」不同，代表在補記帳 -> 用選取月份的 1 號
      // 如果一樣，代表是記當下 -> 用今天
      const now = new Date();
      const currentMonthIso = now.toISOString().slice(0, 7); // 例如 "2025-12"

      let targetDate = now; // 預設今天
      if (selectedMonth !== currentMonthIso) {
        // 如果在看歷史月份，預設記在該月 1 號
        targetDate = new Date(`${selectedMonth}-01`);
      }

      const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          name: itemName,
          date: targetDate, // ✨ 這裡把算好的日期傳給後端
        }),
      });

      if (res.ok) {
        const refreshRes = await fetch(`/api/spend?month=${selectedMonth}`);
        const refreshData = await refreshRes.json();

        setTransactions(refreshData.history || []);
        setMonthlyStats({
          income: Number(refreshData.totalIncome) || 0,
          expense: Number(refreshData.totalExpense) || 0,
        });
        setBudget((prev) => ({
          ...prev,
          currentMonthSpent: Number(refreshData.totalExpense) || 0,
        }));

        const budgetFixed =
          (budget.rent ?? 0) +
          (budget.fixedCost ?? 0) +
          (budget.savingsTarget ?? 0) +
          (budget.riskTarget ?? 0);
        const lastMonthBalance =
          (refreshData.lastMonthIncome || 0) -
          budgetFixed -
          (refreshData.lastMonthExpense || 0);

        setLastMonthData({
          spent: Number(refreshData.lastMonthExpense) || 0,
          balance: lastMonthBalance,
        });
      } else {
        alert("記帳失敗");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. 自訂/修改記帳邏輯
  const handleCustomSubmit = async () => {
    if (!customName || !customAmount) return;
    const finalName = `${selectedIcon} ${customName}`;
    const amountNum = Number(customAmount);

    // 準備傳送的資料
    const payload = {
      amount: amountNum,
      name: finalName,
      type: recordType,
      date: customDate || new Date(),
    };

    try {
      if (editId) {
        await fetch("/api/spend", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editId }),
        });
      } else {
        await fetch("/api/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      // 重抓「選定月份」的資料
      const refreshRes = await fetch(`/api/spend?month=${selectedMonth}`);
      const refreshData = await refreshRes.json();

      // (1) 更新列表
      setTransactions(refreshData.history || []);

      // (2) 更新本月收支
      setMonthlyStats({
        income: Number(refreshData.totalIncome) || 0,
        expense: Number(refreshData.totalExpense) || 0,
      });

      // (3) 更新 Budget
      setBudget((prev) => ({
        ...prev,
        currentMonthSpent: Number(refreshData.totalExpense) || 0,
      }));

      // (4) 更新上月結餘
      const budgetFixed =
        (budget.rent ?? 0) +
        (budget.fixedCost ?? 0) +
        (budget.savingsTarget ?? 0) +
        (budget.riskTarget ?? 0);
      const lastMonthBalance =
        (refreshData.lastMonthIncome || 0) -
        budgetFixed -
        (refreshData.lastMonthExpense || 0);

      setLastMonthData({
        spent: Number(refreshData.lastMonthExpense) || 0,
        balance: lastMonthBalance,
      });

      // 重置表單與關閉視窗
      setCustomName("");
      setCustomAmount("");
      setEditId(null);
      setRecordType("EXPENSE");
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    // 1. 增加防呆，避免誤觸
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;

    try {
      // 2. 呼叫刪除 API
      const res = await fetch("/api/spend", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        // 3. ✨ 關鍵修正：重新抓取資料時，一定要帶上 ?month=${selectedMonth}
        // 這樣才會抓到「該月份」的最新狀態，而不是跳回本月
        const refreshRes = await fetch(`/api/spend?month=${selectedMonth}`);
        const refreshData = await refreshRes.json();

        // 4. ✨ 同步更新所有數據
        // 更新列表
        setTransactions(refreshData.history || []);

        // 更新收支統計 (這樣圓餅圖和剩餘金額才會變！)
        setMonthlyStats({
          income: Number(refreshData.totalIncome) || 0,
          expense: Number(refreshData.totalExpense) || 0,
        });

        // 更新本月花費狀態
        setBudget((prev) => ({
          ...prev,
          currentMonthSpent: Number(refreshData.totalExpense) || 0,
        }));

        // 更新上月結餘 (如果剛好刪的是上個月的資料)
        const budgetFixed =
          (budget.rent ?? 8500) +
          (budget.fixedCost ?? 3000) +
          (budget.savingsTarget ?? 6200) +
          (budget.riskTarget ?? 3200);
        const lastMonthBalance =
          (refreshData.lastMonthIncome || 0) -
          budgetFixed -
          (refreshData.lastMonthExpense || 0);
        setLastMonthData({
          spent: Number(refreshData.lastMonthExpense) || 0,
          balance: lastMonthBalance,
        });
      } else {
        alert("刪除失敗");
      }
    } catch (error) {
      console.error("連線錯誤:", error);
    }
  };

  // ✨ 新增：結餘轉存功能
  const handleRollover = async () => {
    const amount = lastMonthData.balance;
    if (amount <= 0) return;

    if (
      !confirm(
        `確定要將結餘 $${amount.toLocaleString()} 轉存入「緊急預備金」嗎？`
      )
    )
      return;

    try {
      // 1. 呼叫 Risk API 新增一筆存款
      await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "上月結餘轉存",
          amount: amount,
          type: "cash", // 存成現金
        }),
      });

      // 2. 重抓 Risk 資料以更新畫面
      const refreshRes = await fetch("/api/risk");
      setRiskItems(await refreshRes.json());

      alert("🎉 轉存成功！您的緊急預備金增加囉！");
    } catch (e) {
      console.error(e);
      alert("轉存失敗");
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-stone-400">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-bold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-700 p-6 flex justify-center font-sans selection:bg-orange-100">
      <div className="max-w-md w-full space-y-6 relative">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-stone-200 rounded-full blur-3xl opacity-50 z-0"></div>

        {/* Header (已加入 UserButton) */}
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

          <div className="flex items-center gap-3">
            {/* 1. 設定/返回按鈕 */}
            <button
              onClick={() => {
                if (viewMode !== "dashboard") setViewMode("dashboard");
                else {
                  setTempBudget(budget);
                  setIsEditing(true);
                }
              }}
              className="p-2 bg-white border border-stone-200 rounded-full shadow-sm hover:bg-stone-50 active:scale-95 transition-all text-stone-400 w-10 h-10 flex items-center justify-center"
            >
              {viewMode !== "dashboard" ? "↩️" : "⚙️"}
            </button>

            {/* 2. ✨ Clerk 使用者頭像 (登出功能都在這) */}
            <UserButton afterSignOutUrl="/" />
          </div>
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
              {/* 第一列：月薪 + 發薪日 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
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
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-lg text-stone-700"
                  />
                </div>

                {/* ✨ 新增：發薪日輸入框 */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    發薪日
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={tempBudget.payDay || 5}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setTempBudget({
                          ...tempBudget,
                          payDay: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-lg text-stone-700 text-center"
                    />
                    <span className="absolute right-5 top-5 text-stone-400 text-xs font-bold">
                      號
                    </span>
                  </div>
                </div>
              </div>

              {/* ... (下面的儲蓄、風險、房租等維持不變) ... */}
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
              {/* <div className="mt-8 pt-6 border-t border-stone-100 text-center">
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
            </div> */}
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
              {/* 1. 上面的儲蓄與風險卡片 */}
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

                  {/* ✨ 修改變數：budget.savingsTarget -> displaySavings */}
                  <div
                    className={`text-xl font-bold ${
                      displaySavings > 0 ? "text-emerald-600" : "text-stone-300"
                    }`}
                  >
                    ${displaySavings.toLocaleString()}
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

                  {/* ✨ 修改變數：budget.riskTarget -> displayRisk */}
                  <div
                    className={`text-xl font-bold ${
                      displayRisk > 0 ? "text-blue-600" : "text-stone-300"
                    }`}
                  >
                    ${displayRisk.toLocaleString()}
                  </div>

                  <div className="text-[10px] text-blue-400 bg-blue-50 inline-block px-2 py-0.5 rounded-full mt-1">
                    🛡️ 點擊管理保險
                  </div>
                </div>
              </div>

              {/* ✨ 新增：月份選擇條 (Dashboard 模式才顯示) */}
              {/* ✨ 新增：年份與月份獨立選擇器 (Dashboard 模式才顯示) */}
            {viewMode === 'dashboard' && (
              <div className="relative z-10 mt-4 mb-2">
                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-stone-200 shadow-sm">
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-stone-100 p-1.5 rounded-lg text-lg">🗓️</span>
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Time Travel</div>
                        <div className="text-xs text-stone-500 font-medium">切換檢視日期</div>
                      </div>
                    </div>
                  </div>

                  {/* 年月選擇區 (拆分為兩個 Select) */}
                  <div className="flex gap-2">
                    {/* 1. 年份選擇 (前後 5 年) */}
                    <div className="relative flex-1">
                      <select
                        value={selectedMonth.split('-')[0]} // 抓取 "2025-12" 的 "2025"
                        onChange={(e) => {
                          const newYear = e.target.value;
                          const currentMonth = selectedMonth.split('-')[1];
                          setSelectedMonth(`${newYear}-${currentMonth}`);
                        }}
                        className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-700 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-stone-200 cursor-pointer"
                      >
                        {Array.from({ length: 11 }, (_, i) => {
                          const y = new Date().getFullYear() - 5 + i; // 範圍：前5年 ~ 後5年
                          return <option key={y} value={y}>{y} 年</option>;
                        })}
                      </select>
                      {/* 自訂箭頭 */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 text-xs">▼</div>
                    </div>

                    {/* 2. 月份選擇 (1-12月) */}
                    <div className="relative flex-1">
                      <select
                        value={selectedMonth.split('-')[1]} // 抓取 "2025-12" 的 "12"
                        onChange={(e) => {
                          const currentYear = selectedMonth.split('-')[0];
                          const newMonth = e.target.value;
                          setSelectedMonth(`${currentYear}-${newMonth}`);
                        }}
                        className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-700 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-stone-200 cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = String(i + 1).padStart(2, '0');
                          return <option key={m} value={m}>{i + 1} 月</option>;
                        })}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 text-xs">▼</div>
                    </div>
                  </div>

                </div>
              </div>
            )}

              {/* === ✨ 滑動卡片區 (Slider Section) === */}
              <div className="relative">
                {/* 滾動容器 */}
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar">
                  {/* 👉 卡片 1：本月圓餅圖 (Living Account) */}
                  <div className="min-w-full snap-center">
                    <div className="bg-[#FFF9F5] text-stone-700 p-6 rounded-3xl shadow-xl shadow-stone-200/50 relative overflow-hidden border border-stone-100 h-full">
                      <div className="relative z-10 flex items-center justify-between gap-6">
                        <div
                          className="relative w-32 h-32 flex-shrink-0 rounded-full shadow-lg"
                          style={pieChartStyle}
                        >
                          <div
                            className="relative w-32 h-32 flex-shrink-0 rounded-full shadow-lg"
                            style={pieChartStyle}
                          >
                            <div className="absolute inset-3 bg-[#FFF9F5] rounded-full flex flex-col items-center justify-center border-4 border-white shadow-inner">
                              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                                Daily
                              </span>

                              {/* ✨ 修改變數： dailyBudget -> displayDaily */}
                              <span
                                className={`text-2xl font-serif font-bold ${
                                  displayDaily < 300 && hasData
                                    ? "text-red-500"
                                    : "text-stone-800"
                                }`}
                              >
                                ${displayDaily}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
                            Living Account
                          </h2>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-serif font-bold text-stone-800">
                              ${displayLiving.toLocaleString()}
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
                              {vSpent > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  已花 {((vSpent / total) * 100).toFixed(0)}%
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  淨收{" "}
                                  {Math.abs((vSpent / total) * 100).toFixed(0)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-stone-200 flex justify-between text-xs text-stone-400">
                        <span
                          className={
                            monthlyStats.income > 0
                              ? "text-emerald-600 font-bold"
                              : "text-stone-400"
                          }
                        >
                          本月實收 ${monthlyStats.income.toLocaleString()}
                        </span>
                        <span>距離發薪 {daysLeft} 天</span>
                      </div>
                    </div>
                  </div>

                  {/* 👉 卡片 2：上月結餘 (Last Month) - 往左滑就會看到這個 */}
                  <div className="min-w-full snap-center">
                    <div className="bg-white text-stone-700 p-6 rounded-3xl shadow-xl shadow-stone-200/50 relative overflow-hidden border border-stone-100 h-full flex flex-col justify-between">
                      {/* 裝飾背景 */}
                      <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl grayscale">
                        🗓️
                      </div>

                      <div className="relative z-10">
                        <h2 className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-2">
                          Last Month Recap
                        </h2>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-5xl font-serif font-bold ${
                              lastMonthData.balance >= 0
                                ? "text-emerald-600"
                                : "text-red-500"
                            }`}
                          >
                            {lastMonthData.balance >= 0 ? "+" : ""}
                            {lastMonthData.balance.toLocaleString()}
                          </span>
                          <span className="text-sm text-stone-500">結餘</span>
                        </div>
                        <p className="text-sm text-stone-400 mt-2">
                          {lastMonthData.balance >= 0
                            ? "太棒了！上個月成功守住荷包 🎉"
                            : "哎呀！上個月稍微超支囉 💸"}
                        </p>
                      </div>

                      {/* 卡片底部：轉存區塊 */}
                      <div className="relative z-10 mt-6 pt-4 border-t border-dashed border-stone-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-stone-400">
                              上月總花費
                            </div>
                            <div className="font-bold text-stone-600 text-lg">
                              ${lastMonthData.spent.toLocaleString()}
                            </div>
                          </div>

                          {/* ✨ 如果有結餘，顯示轉存按鈕；沒有則顯示 0 */}
                          <div className="text-right">
                            {lastMonthData.balance > 0 ? (
                              <button
                                onClick={handleRollover}
                                className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                              >
                                <span>💰 轉存</span>
                              </button>
                            ) : (
                              <div>
                                <div className="text-xs text-stone-400">
                                  建議儲蓄
                                </div>
                                <div className="font-bold text-stone-300 text-lg">
                                  $0
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 滑動指示點 (Dots) */}
                <div className="flex justify-center gap-1.5 -mt-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-200"></div>
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
              {/* 3. Custom 自訂按鈕 (修正日期預設值) */}
              <button
                onClick={() => {
                  setIsAdding(true);
                  setSelectedIcon(CATEGORIES[0].icon);
                  setCustomName("");
                  setCustomAmount("");
                  setEditId(null);
                  setRecordType("EXPENSE");

                  // ✨ 智慧日期判斷：
                  const now = new Date();
                  const currentMonthIso = now.toISOString().slice(0, 7);

                  if (selectedMonth !== currentMonthIso) {
                    // 如果在看過去月份，預設日期選該月 1 號
                    setCustomDate(`${selectedMonth}-01`);
                  } else {
                    // 如果是本月，預設日期選今天
                    setCustomDate(now.toISOString().split("T")[0]);
                  }
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
                          <span
                            className={`font-bold ${
                              item.type === "INCOME"
                                ? "text-emerald-600"
                                : "text-stone-800"
                            }`}
                          >
                            {item.type === "INCOME" ? "+" : "-"}$
                            {item.amount.toLocaleString()}
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
        {/* === 彈出視窗區塊 (Modals) === */}

        {/* 1. 記帳 Modal (UI 優化：手機版置中靠上、按鈕不重疊) */}
        {isAdding && (
          // ✨ 修改 1：
          // 原本是 items-end (靠底)，改成 items-start (靠上) 並加上 pt-20 (上方留白)
          // sm:items-center 代表電腦版還是維持置中
          <div className="fixed inset-0 z-50 flex items-start pt-20 sm:items-center sm:pt-0 justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsAdding(false)}
            ></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              {/* 關閉按鈕 (維持在右上角) */}
              <button
                onClick={() => setIsAdding(false)}
                className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full p-1 transition-all z-10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex bg-stone-100 p-1 rounded-xl">
                  <button
                    onClick={() => setRecordType("EXPENSE")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      recordType === "EXPENSE"
                        ? "bg-white text-stone-800 shadow-sm"
                        : "text-stone-400"
                    }`}
                  >
                    支出
                  </button>
                  <button
                    onClick={() => setRecordType("INCOME")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      recordType === "INCOME"
                        ? "bg-white text-emerald-600 shadow-sm"
                        : "text-stone-400"
                    }`}
                  >
                    收入
                  </button>
                </div>

                {/* ✨ 修改 2：加上 mr-10 (右邊距)，把圖示往左推，避開叉叉 */}
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-2xl border border-stone-200 mr-10">
                  {selectedIcon}
                </div>
              </div>

              {/* 下面內容維持不變 */}
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

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    日期 (Date)
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      名稱
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="例如: 薪水, 獎金"
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
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg mt-2 shadow-xl transition-colors ${
                    recordType === "INCOME"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                      : "bg-stone-800 hover:bg-black"
                  }`}
                >
                  {editId
                    ? "確認修改"
                    : recordType === "INCOME"
                    ? "確認收入 (+)"
                    : "確認支出 (-)"}
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
