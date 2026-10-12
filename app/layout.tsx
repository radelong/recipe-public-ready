import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExampleUser Kitchen • Your private cookbook",
  description: "Keep the recipes you love, cook any portion, and share with your people.",
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
