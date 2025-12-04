import type { Metadata } from "next";
// ✨ 1. 改用 Google Fonts，不用本地檔案，避免找不到檔案的錯誤
import { Inter } from "next/font/google"; 
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'

// ✨ 2. 設定字體
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rent Survival",
  description: "租屋族理財生存日",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        {/* ✨ 3. 套用字體 className */}
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 這一行最重要：讓內容延伸到瀏海區域，避免白邊
  viewportFit: 'cover',
};