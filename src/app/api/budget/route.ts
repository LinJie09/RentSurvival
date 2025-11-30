import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst({ where: { id: 1 } });

    if (!settings) {
      return NextResponse.json({
        totalSalary: 32000,
        rent: 8500,
        savingsTarget: 6200,
        riskTarget: 3200, // 預設值
        fixedCost: 3000,
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedSettings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        totalSalary: body.totalSalary,
        rent: body.rent,
        savingsTarget: body.savingsTarget,
        riskTarget: body.riskTarget, // ✨ 寫入新欄位
        fixedCost: body.fixedCost,
      },
      create: {
        id: 1,
        totalSalary: body.totalSalary,
        rent: body.rent,
        savingsTarget: body.savingsTarget,
        riskTarget: body.riskTarget,
        fixedCost: body.fixedCost,
      },
    });
    return NextResponse.json(updatedSettings);
  } catch (error) {
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 });
  }
}