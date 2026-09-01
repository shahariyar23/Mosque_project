import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { hindSiliguri, inter, montserrat, playfair, notoSerifBengali } from "./fonts";
import { AuthProvider } from "@/components/auth-provider";
import { NoorLoader } from "@/components/loading/NoorLoader";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Noor Community Mosque | Faith, Knowledge, Community",
  description: "A welcoming place for worship, learning and community.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const fontVariables = [inter, montserrat, playfair, hindSiliguri, notoSerifBengali]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={fontVariables}>
        {/*
          No session is seeded here. The signed-in state is whatever the API says it is — recovered from
          the refresh cookie on mount — because a session handed in from the server would make every
          visitor read as signed in, which is exactly what the guards exist to distinguish.
        */}
        <AuthProvider>
          <NoorLoader />
          <LanguageProvider>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
