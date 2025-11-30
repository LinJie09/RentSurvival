import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const now = new Date();
    // 預設抓這個月的資料
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 抓出所有紀錄
    const records = await prisma.expense.findMany({
      where: { 
        userId: userId,
        createdAt: { gte: firstDayOfMonth } 
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. 計算淨支出 (支出 - 收入)
    let totalSpent = 0;
    records.forEach(item => {
      // @ts-ignore (忽略暫時的型別檢查，因為資料庫剛更新)
      if (item.type === 'INCOME') {
        totalSpent -= item.amount; // 收入：讓花費變少 (錢包回血)
      } else {
        totalSpent += item.amount; // 支出：讓花費變多
      }
    });

    return NextResponse.json({ 
      totalSpent: totalSpent,
      history: records 
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
    
    const newExpense = await prisma.expense.create({
      data: {
        userId: userId,
        amount: Number(body.amount),
        name: body.name,
        type: body.type || 'EXPENSE', // 預設為支出
        createdAt: body.date ? new Date(body.date) : new Date(), // 自訂日期
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
    await prisma.expense.deleteMany({
      where: { id: body.id, userId: userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: '刪除失敗' }, { status: 500 }); }
}