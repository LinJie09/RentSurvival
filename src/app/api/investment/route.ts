import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: userId }, // ✨ 只抓自己的股票
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(portfolio);
  } catch (error) { return NextResponse.json({ error: '讀取失敗' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const newStock = await prisma.portfolio.create({
      data: {
        userId: userId, // ✨
        symbol: body.symbol,
        shares: Number(body.shares),
        avgCost: Number(body.avgCost),
        currentPrice: Number(body.currentPrice),
      },
    });
    return NextResponse.json(newStock);
  } catch (error) { return NextResponse.json({ error: '交易失敗' }, { status: 500 }); }
}

// PUT, DELETE 也要加 userId 檢查 (這裡簡略，建議參照 spend 的 deleteMany 寫法)
export async function PUT(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const body = await request.json();
    await prisma.portfolio.updateMany({
        where: { id: body.id, userId: userId },
        data: { symbol: body.symbol, shares: Number(body.shares), avgCost: Number(body.avgCost), currentPrice: Number(body.currentPrice) }
    });
    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const body = await request.json();
    await prisma.portfolio.deleteMany({ where: { id: body.id, userId: userId } });
    return NextResponse.json({ success: true });
}