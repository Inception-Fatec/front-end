// app/layout.tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { TourProvider } from "@/context/TourContext";
import { GlobalTour } from "@/components/tour/GlobalTour";
import "./globals.css";

export const metadata: Metadata = {
  title: "App",
  description: "App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className="bg-[#131315] text-[#e5e1e4] antialiased"
        suppressHydrationWarning
      >
        <SessionProvider>
          <TourProvider>
            {children}
            <GlobalTour />
          </TourProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
