import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server'; // ✨ 引入 Clerk 驗證

export async function GET() {
  const { userId } = await auth(); // 1. 取得目前登入者的 ID
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    // 2. 改成用 userId 找設定
    let settings = await prisma.settings.findUnique({
      where: { userId: userId } 
    });

    // 如果是新用戶，回傳預設值 (但不寫入資料庫，等他按儲存才寫)
    if (!settings) {
      return NextResponse.json({
        totalSalary: 32000,
        rent: 8500,
        savingsTarget: 6200,
        riskTarget: 3200,
        fixedCost: 3000,
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    
    // 3. 使用 upsert: 根據 userId 更新或新增
    const updatedSettings = await prisma.settings.upsert({
      where: { userId: userId },
      update: {
        totalSalary: body.totalSalary,
        rent: body.rent,
        savingsTarget: body.savingsTarget,
        riskTarget: body.riskTarget,
        fixedCost: body.fixedCost,
      },
      create: {
        userId: userId, // ✨ 記得把 userId 寫進去
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