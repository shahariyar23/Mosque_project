"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "bn";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: "en", setLanguage: () => {} });

export const bn: Record<string, string> = {
  "Home": "\u09b9\u09cb\u09ae",
  "About": "\u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u09b8\u09ae\u09cd\u09aa\u09b0\u09cd\u0995\u09c7",
  "Prayer Times": "\u09a8\u09be\u09ae\u09be\u099c\u09c7\u09b0 \u09b8\u09ae\u09af\u09bc",
  "Events": "\u0985\u09a8\u09c1\u09b7\u09cd\u09a0\u09be\u09a8",
  "Services": "\u09b8\u09c7\u09ac\u09be\u09b8\u09ae\u09c2\u09b8",
  "Quran": "\u0995\u09c1\u09b0\u0986\u09a8",
  "Donations": "\u09a6\u09be\u09a8",
  "Donate": "\u09a6\u09be\u09a8 \u0995\u09b0\u09c1\u09a8",
  "Donate Now": "\u098f\u0996\u09a8\u0987 \u09a6\u09be\u09a8 \u0995\u09b0\u09c1\u09a8",
  "Contact": "\u09af\u09cb\u0997\u09be\u09af\u09cb\u0997",
  "NOOR": "\u09a8\u09c2\u09b0",
  "COMMUNITY MOSQUE": "\u0995\u09ae\u09bf\u0989\u09a8\u09bf\u099f\u09bf \u09ae\u09b8\u099c\u09bf\u09a6",
  "WELCOME TO OUR MOSQUE": "\u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u09ae\u09b8\u099c\u09bf\u09a6\u09c7 \u09b8\u09cd\u09ac\u09be\u0997\u09a4\u09ae",
  "Faith.": "\u0988\u09ae\u09be\u09a8\u0964",
  "Knowledge.": "\u099c\u09cd\u099e\u09be\u09a8\u0964",
  "Community.": "\u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09a6\u09be\u09af\u09bc\u0964",
  "A place where worship, learning and community come together.": "\u0987\u09ac\u09be\u09a6\u09a4, \u09b6\u09bf\u0995\u09cd\u09b7\u09a4\u09b0\u09a6\u09a6\u09bc\u09c7\u09b0 \u09ae\u09bf\u09b2\u09a8\u09b8\u09cd\u09a5\u09b2\u0964",
  "View Prayer Times": "\u09a8\u09be\u09ae\u09be\u099c\u09c7\u09b0 \u09b8\u09ae\u09af\u09bc \u09a6\u09c7\u0996\u09c1\u09a8",
  "TODAY'S PRAYER TIMES": "\u0986\u099c\u0995\u09c7\u09b0 \u09a8\u09be\u09ae\u09be\u099c\u09c7\u09b0 \u09b8\u09ae\u09af\u09bc",
  "NEXT PRAYER": "\u09aa\u09b0\u09ab\u09b0\u09cd\u09a4\u09c0 \u09a8\u09be\u09ae\u09be\u099c",
  "Fajr": "\u09ab\u099c\u09b0",
  "Sunrise": "\u09b8\u09c2\u09b0\u09cd\u09af\u09cb\u09a6\u09af\u09bc",
  "Dhuhr": "\u09af\u09cb\u09b9\u09b0",
  "Asr": "\u0986\u09b8\u09b0",
  "Maghrib": "\u09ae\u09be\u0997\u09b0\u09bf\u09ac",
  "Isha": "\u098f\u09b6\u09be",
  "Passed": "\u09b8\u09ae\u09af\u09bc \u09b6\u09c7\u09b7",
  "Next": "\u09aa\u09b0\u09ab\u09b0\u09cd\u09a4\u09c0",
  "Custom": "\u0987\u099a\u09cd\u099b\u09be\u09ae\u09a4\u09cb",
  "ABOUT OUR MOSQUE": "\u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u09ae\u09b8\u099c\u09bf\u09a6 \u09b8\u09ae\u09cd\u09aa\u09b0\u09cd\u0995\u09c7",
  "A place of worship, learning and community.": "\u0987\u09ac\u09be\u09a6\u09a4, \u09b6\u09bf\u0995\u09cd\u09b7\u09be \u0993 \u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09a6\u09be\u09af\u09bc\u09c7\u09b0 \u098f\u0995\u099f\u09bf \u09b8\u09cd\u09a5\u09be\u09a8\u0964",
  "HOW WE SERVE": "\u0986\u09ae\u09b0\u09be \u09af\u09c7\u09ad\u09be\u09ac\u09c7 \u09b8\u09c7\u09ac\u09be \u0995\u09b0\u09bf",
  "At the heart of our community.": "\u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09a6\u09be\u09af\u09bc\u09c7\u09b0 \u09b9\u09c3\u09a6\u09af\u09bc\u09c7\u0964",
  "All services →": "\u09b8\u09ac \u09b8\u09c7\u09ac\u09be →",
  "JOIN US": "\u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u09b8\u09be\u09a5\u09c7 \u09af\u09cb\u0997 \u09a6\u09bf\u09a8",
  "Upcoming at Noor.": "\u09a8\u09c2\u09b0\u09c7 \u0986\u09b8\u09a8\u09cd\u09a8 \u0985\u09a8\u09c1\u09b7\u09cd\u09a0\u09be\u09a8\u0964",
  "GIVE WITH PURPOSE": "\u0989\u09a6\u09cd\u09a6\u09c7\u09b6\u09cd\u09af\u09aa\u09c2\u09b0\u09cd\u09a3 \u09a6\u09be\u09a8",
  "Support your mosque.": "\u0986\u09aa\u09a8\u09be\u09b0 \u09ae\u09b8\u099c\u09bf\u09a6\u0995\u09c7 \u09b8\u09b9\u09be\u09af\u09bc\u09a4\u09be \u0995\u09b0\u09c1\u09a8\u0964",
  "Choose a donation amount": "\u09a6\u09be\u09a8\u09c7\u09b0 \u09aa\u09b0\u09bf\u09ae\u09be\u09a3 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8",
  "Our Story": "\u09a6\u09c7\u09b6\u09cd\u09af\u09be\u09a8\u09c0",
  "History & Milestones": "\u09a4\u09bf\u09b0\u09c1\u09a8\u09c0\u09a4\u09c0 \u0993 \u09aa\u09cd\u09b0\u09be\u09b7\u09b0",
  "Our Mission": "\u09a6\u09cd\u09b6\u09cd\u09af\u09c7\u09a6\u09c0",
  "Our Vision": "\u09a6\u09cd\u09b0\u09b7\u09cd\u099f\u09bf",
  "What We Believe": "\u09a4\u09be\u09ae\u09be\u09a6\u09c0 \u09aa\u09be\u09b0\u09c7\u099c\u09a8",
  "Our Mosque & Facilities": "\u0995\u09be\u09b0\u09be\u09b0 \u0993 \u09b8\u09c7\u09ab\u09be\u09b0\u09a3",
  "Interactive 3D Mosque": "\u0986\u0987\u09a8\u0995\u09cd\u09b0\u09be\u09a4\u09bf\u09ac 3D \u09ae\u09b8\u099c\u09bf\u09a6",
  "Community Impact": "\u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09a6\u09a6\u09bc \u09aa\u09b0\u09bf\u09b2",
  "Islamic Education": "\u0987\u09b8\u09b2\u09be\u09ae\u09c0\u0995 \u09b6\u09bf\u0995\u09cd\u09b7\u09a4\u09b0",
  "Community Services": "\u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09a6\u09a6\u09bc \u09b8\u09c7\u09ac\u09be\u09b8\u09ae\u09c2\u09b8",
  "Imam & Leadership": "\u0987\u09ae\u09be\u09ae \u0993 \u09a8\u09c1\u09a8\u09cd\u09a6\u09c7\u09b8\u09a4\u09b0",
  "Volunteers": "\u09b8\u09a7\u09bf\u09af\u09a8\u09c7",
  "Life at Noor": "\u09a8\u09c2\u09b0\u09c7 \u099c\u09bf\u09b8\u09a4\u09b7\u09c7",
  "Testimonials": "\u09ac\u09be\u09b0\u09cd\u0995\u09be\u09a8",
  "Be Part of Our Community": "\u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09a6\u09a6\u09bc\u09c7\u09b0 \u09a8\u09bf\u09b8\u09cd\u09b8\u09b8\u09b8\u09c7",
  "Explore Our Programs": "\u09a6\u09b0\u09aa\u09be\u09a8\u09cd\u09a4 \u09b6\u09bf\u0995\u09cd\u09b7\u09a4\u09b7\u09c7 \u098f\u09b0\u09b0\u09c7\u0996\u09b0\u09a8",
  "Join our newsletter": "\u09a8\u09be\u09ae\u09be\u09a4\u09a7\u09c7 \u09b8\u09be\u09ae\u09b8\u09b8\u09b7\u09c7"
};

export const translations = { bn };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("noor-language") as Language | null;
    if (saved) {
      setLanguage(saved);
    } else {
      // First visit: show language selection prompt
      setShowPrompt(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "bn" ? "bn" : "en";
    document.documentElement.dataset.language = language;
    localStorage.setItem("noor-language", language);
  }, [language]);

  const choose = (lang: Language) => {
    setLanguage(lang);
    setShowPrompt(false);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[min(92%,420px)] rounded-lg bg-white p-6 text-center shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Choose your language</h3>
            <p className="mb-6 text-sm text-gray-600">Please select English or বাংলা to continue.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => choose("bn")} className="rounded-md bg-[#073a2d] px-4 py-2 text-white">বাংলা</button>
              <button onClick={() => choose("en")} className="rounded-md border border-gray-200 px-4 py-2">English</button>
            </div>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
