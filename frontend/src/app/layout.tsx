import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenhouse - NutriVision AI",
  description: "AI Meal Scanner and Nutrition Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        {/* Nạp font chữ Inter và Plus Jakarta Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&subset=vietnamese&display=swap" rel="stylesheet" />

        {/* Nạp bộ Icon Material Symbols của Google */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f8faf9] text-[#191c1c] font-['Roboto',_'Inter',_sans-serif] antialiased">
        {children}
      </body>
    </html>
  );
}