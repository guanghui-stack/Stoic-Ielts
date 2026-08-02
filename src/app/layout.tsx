import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "STOIC-IELTS — Luyện IELTS Reading bằng kỷ luật",
    template: "%s | STOIC-IELTS",
  },
  description:
    "STOIC-IELTS — kho đề IELTS Reading Academic và General tách biệt, quy đổi band ngay khi nộp, hệ danh hiệu dành cho người kiên trì và cuộc thi Nguyệt Thí hằng tháng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${playfair.variable} ${sourceSerif.variable} ${beVietnam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
