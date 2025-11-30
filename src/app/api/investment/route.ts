import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// 🟢 GET: 取得投資組合
export async function GET() {
  try {
    const portfolio = await prisma.portfolio.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(portfolio);
  } catch (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}

// 🟠 POST: 新增庫存 (買入股票)
export async function POST(request: Request) {
  try {
    const body = await request.json(); // { symbol, shares, avgCost, currentPrice }
    
    const newStock = await prisma.portfolio.create({
      data: {
        symbol: body.symbol,
        shares: Number(body.shares),
        avgCost: Number(body.avgCost),
        currentPrice: Number(body.currentPrice), // 暫時先用手動輸入的市價
      },
    });

    return NextResponse.json(newStock);
  } catch (error) {
    return NextResponse.json({ error: '交易失敗' }, { status: 500 });
  }
}

// 🔴 DELETE: 賣出/刪除股票
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await prisma.portfolio.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}

// 🟡 PUT: 修改庫存
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updated = await prisma.portfolio.update({
      where: { id: body.id },
      data: {
        symbol: body.symbol,
        shares: Number(body.shares),
        avgCost: Number(body.avgCost),
        currentPrice: Number(body.currentPrice),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}