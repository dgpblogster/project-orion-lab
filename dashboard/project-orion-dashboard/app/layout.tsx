/**
 * Root Layout
 *
 * Project Orion Dashboard - Root layout with the light theme and Geist font.
 * This layout wraps all pages and provides the global styling context.
 */

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Orion Dashboard",
  description: "Release Health Dashboard - Conference Demo Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-background text-text-primary min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
