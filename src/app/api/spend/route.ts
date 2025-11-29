import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// 🟢 GET: 取得本月總花費 + 最近 20 筆明細
export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 算總花費
    const aggregation = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: firstDayOfMonth } },
    });

    // 2. 撈出最近的消費紀錄 (只抓前 20 筆，避免畫面太長)
    const history = await prisma.expense.findMany({
      where: { createdAt: { gte: firstDayOfMonth } },
      orderBy: { createdAt: 'desc' }, // 最新的在最上面
      take: 20,
    });

    return NextResponse.json({ 
      totalSpent: aggregation._sum.amount || 0,
      history: history 
    });
  } catch (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}

// 🟠 POST: 新增一筆消費 (這部分沒變)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newExpense = await prisma.expense.create({
      data: {
        amount: body.amount,
        name: body.name,
      },
    });

    return NextResponse.json(newExpense);
  } catch (error) {
    return NextResponse.json({ error: '寫入失敗' }, { status: 500 });
  }
}


// 🔴 DELETE: 刪除一筆消費
export async function DELETE(request: Request) {
    try {
      const body = await request.json(); // 取得要刪除的 id
      
      // 從資料庫刪除
      const deletedExpense = await prisma.expense.delete({
        where: {
          id: body.id,
        },
      });
  
      // 回傳被刪除的那筆資料 (這樣前端才知道要扣掉多少錢)
      return NextResponse.json(deletedExpense);
    } catch (error) {
      return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
    }
  }

