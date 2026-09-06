import type { Metadata } from "next";
import { cookies } from "next/headers";
import ThemeProvider from "@/components/ThemeProvider";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "StudyCircle | Study together at Cal Poly";
const description = "Find your Cal Poly class space for chat, meetups, shared notes and voice memos, sourced Circle AI answers, and copy/paste Quizlet export.";
// Use existing deployment configuration rather than guessing a public domain.
const metadataBase = new URL(process.env.APP_URL || "http://localhost:3000");
const socialImage = { url: "/brand/studycircle-original.png", width: 1650, height: 1614, alt: "StudyCircle logo" };

export const metadata: Metadata = {
  metadataBase,
  title,
  applicationName: "StudyCircle",
  // Icon links are generated from icon.png, apple-icon.png, and favicon.ico.
  description,
  openGraph: { type: "website", siteName: "StudyCircle", title, description, images: [socialImage] },
  twitter: { card: "summary", title, description, images: [socialImage] },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("studycircle-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ThemeProvider initialTheme={theme}>{children}</ThemeProvider></body>
    </html>
  );
}
