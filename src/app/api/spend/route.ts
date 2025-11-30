import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 只算「這個人」的總花費
    const aggregation = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { 
        userId: userId, // ✨ 關鍵過濾條件
        createdAt: { gte: firstDayOfMonth } 
      },
    });

    // 2. 只抓「這個人」的明細
    const history = await prisma.expense.findMany({
      where: { 
        userId: userId, // ✨ 關鍵過濾條件
        createdAt: { gte: firstDayOfMonth } 
      },
      orderBy: { createdAt: 'desc' },
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

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const newExpense = await prisma.expense.create({
      data: {
        userId: userId, // ✨ 寫入時標記是誰記的
        amount: body.amount,
        name: body.name,
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
    // 確保只能修改自己的資料 (where 加入 userId 雙重驗證)
    const updated = await prisma.expense.updateMany({
      where: { id: body.id, userId: userId },
      data: { name: body.name, amount: Number(body.amount) },
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: '更新失敗' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const body = await request.json();
    // 確保只能刪除自己的資料
    await prisma.expense.deleteMany({
      where: { id: body.id, userId: userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: '刪除失敗' }, { status: 500 }); }
}