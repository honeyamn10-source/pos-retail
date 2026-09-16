import type { Metadata } from "next";
import "./globals.css";
import "./pos.css";

export const metadata: Metadata = {
  title: "Jawa POS · Retail & Restaurant",
  description: "Sales, inventory, kitchen orders and business reports in one connected workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
