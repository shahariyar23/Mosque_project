import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { hindSiliguri, inter, notoSerif, notoSerifBengali } from "./fonts";

export const metadata: Metadata = {
  title: "Noor Community Mosque | Faith, Knowledge, Community",
  description: "A welcoming place for worship, learning and community.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVariables = [inter, hindSiliguri, notoSerif, notoSerifBengali].map((font) => font.variable).join(" ");

  return <html lang="en"><body className={fontVariables}><LanguageProvider>{children}</LanguageProvider></body></html>;
}
