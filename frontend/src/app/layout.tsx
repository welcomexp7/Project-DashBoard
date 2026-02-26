import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Board",
  description: "로컬 프로젝트 관리 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        {/* 상단 네비게이션 바 — Glassmorphism */}
        <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-slate-950/60 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-6">
            <a href="/" className="flex items-center gap-2.5 font-semibold">
              <img
                src="/logo.png"
                alt="Project Board"
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Project Board
              </span>
            </a>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <a
                href="/"
                className="transition-colors hover:text-foreground"
              >
                대시보드
              </a>
            </nav>
          </div>
        </header>
        {/* 메인 콘텐츠 */}
        <main className="mx-auto max-w-screen-2xl">{children}</main>
      </body>
    </html>
  );
}
