import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeMind AI",
  description: "AI-ready market analysis dashboard for learning and indicators."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
