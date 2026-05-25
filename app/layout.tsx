// app/layout.tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { TourProvider } from "@/context/TourContext";
import { GlobalTour } from "@/components/tour/GlobalTour";
import "@/app/globals.css";

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
    <html lang="pt-BR" className="dark">
      <body className="bg-[#131315] text-[#e5e1e4] antialiased">
        <SessionProvider>
          <TourProvider>
            {children}
            {/* O componente visual fica ouvindo o estado global da engine aqui */}
            <GlobalTour />
          </TourProvider>
        </SessionProvider>
      </body>
    </html>
  );
}