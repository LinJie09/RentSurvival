import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// 🟢 GET: 取得目前的財務設定
export async function GET() {
  try {
    // 嘗試找第一筆設定 (因為是單機版，我們假定只有一組設定，ID 固定為 1)
    let settings = await prisma.settings.findFirst({
      where: { id: 1 }
    });

    // 如果資料庫是空的 (第一次用)，就回傳預設值
    if (!settings) {
      return NextResponse.json({
        totalSalary: 32000,
        rent: 8500,
        savingsTarget: 6200,
        fixedCost: 3000,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '讀取設定失敗' }, { status: 500 });
  }
}

// 🟠 POST: 更新財務設定
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 使用 upsert (有就更新，沒有就新增)，確保永遠只有一筆 ID=1 的資料
    const updatedSettings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        totalSalary: body.totalSalary,
        rent: body.rent,
        savingsTarget: body.savingsTarget,
        fixedCost: body.fixedCost,
      },
      create: {
        id: 1,
        totalSalary: body.totalSalary,
        rent: body.rent,
        savingsTarget: body.savingsTarget,
        fixedCost: body.fixedCost,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    return NextResponse.json({ error: '儲存設定失敗' }, { status: 500 });
  }
}