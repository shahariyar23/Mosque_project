import { Hind_Siliguri, Inter, Noto_Serif, Noto_Serif_Bengali } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body-en",
  display: "swap",
});

export const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-bn",
  display: "swap",
});

export const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading-en",
  display: "swap",
});

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["600", "700"],
  variable: "--font-heading-bn",
  display: "swap",
});