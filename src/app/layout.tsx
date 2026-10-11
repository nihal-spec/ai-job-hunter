import type { Metadata } from "next";
import "./globals.css";

import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "AI Job Hunter",
  description: "A focused workspace for finding and managing better job opportunities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
