import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const queryMonth = searchParams.get('month');

    // 1. 設定日期範圍
    let targetDate = new Date();
    if (queryMonth) targetDate = new Date(`${queryMonth}-01`);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    // 上個月範圍 (計算上月結餘用)
    const lastMonthStart = new Date(year, month - 1, 1);
    const lastMonthEnd = new Date(year, month, 0, 23, 59, 59);

    // 2. 查詢「選定月份」的紀錄 (這就是我們要的列表！)
    const currentRecords = await prisma.expense.findMany({
      where: { 
        userId: userId,
        createdAt: { gte: startOfMonth, lte: endOfMonth } // ✨ 嚴格限制日期範圍
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. 查詢上個月紀錄
    const lastMonthRecords = await prisma.expense.findMany({
      where: {
        userId: userId,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
      }
    });

    // 4. 計算本月收支
    let totalIncome = 0;
    let totalExpense = 0;
    
    currentRecords.forEach(item => {
      if (item.type === 'INCOME') {
        totalIncome += item.amount;
      } else {
        totalExpense += item.amount;
      }
    });

    // 5. 計算上個月結餘
    let lastMonthIncome = 0;
    let lastMonthExpense = 0;
    lastMonthRecords.forEach(item => {
      if (item.type === 'INCOME') lastMonthIncome += item.amount;
      else lastMonthExpense += item.amount;
    });

    return NextResponse.json({ 
      totalIncome,
      totalExpense,
      lastMonthIncome,
      lastMonthExpense,
      // ✨ 關鍵修改：這裡直接回傳 currentRecords (已被日期過濾)，而不是另外抓的 historyRecords
      history: currentRecords 
    });

  } catch (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    
    // 使用 prisma.expense
    const newExpense = await prisma.expense.create({
      data: {
        userId: userId,
        amount: Number(body.amount),
        name: body.name,
        type: body.type || 'EXPENSE',
        createdAt: body.date ? new Date(body.date) : new Date(),
      },
    });
    return NextResponse.json(newExpense);
  } catch (error) {
    return NextResponse.json({ error: '寫入失敗' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const body = await request.json();
    // 使用 prisma.expense
    const updated = await prisma.expense.updateMany({
      where: { id: body.id, userId: userId },
      data: { 
        name: body.name, 
        amount: Number(body.amount),
        type: body.type,
        createdAt: body.date ? new Date(body.date) : undefined
      },
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: '更新失敗' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const body = await request.json();
    // 使用 prisma.expense
    await prisma.expense.deleteMany({
      where: { id: body.id, userId: userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: '刪除失敗' }, { status: 500 }); }
}