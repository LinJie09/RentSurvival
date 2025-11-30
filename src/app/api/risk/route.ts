import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const items = await prisma.riskItem.findMany({
      where: { userId: userId }, // ✨
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) { return NextResponse.json({ error: '讀取失敗' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const newItem = await prisma.riskItem.create({
      data: {
        userId: userId, // ✨
        name: body.name,
        amount: Number(body.amount),
        type: body.type,
      },
    });
    return NextResponse.json(newItem);
  } catch (error) { return NextResponse.json({ error: '新增失敗' }, { status: 500 }); }
}

export async function PUT(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const body = await request.json();
    await prisma.riskItem.updateMany({
        where: { id: body.id, userId: userId },
        data: { name: body.name, amount: Number(body.amount), type: body.type }
    });
    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const body = await request.json();
    await prisma.riskItem.deleteMany({ where: { id: body.id, userId: userId } });
    return NextResponse.json({ success: true });
}