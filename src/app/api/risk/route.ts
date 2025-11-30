import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// 🟢 GET: 取得風險項目列表
export async function GET() {
  try {
    const items = await prisma.riskItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}

// 🟠 POST: 新增項目
export async function POST(request: Request) {
  try {
    const body = await request.json(); // { name, amount, type }
    const newItem = await prisma.riskItem.create({
      data: {
        name: body.name,
        amount: Number(body.amount),
        type: body.type,
      },
    });
    return NextResponse.json(newItem);
  } catch (error) {
    return NextResponse.json({ error: '新增失敗' }, { status: 500 });
  }
}

// 🔴 DELETE: 刪除項目
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await prisma.riskItem.delete({ where: { id: body.id } });
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