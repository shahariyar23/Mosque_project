"use client";

import { Clock, Moon, CalendarDays, BookOpen, Heart, Phone } from "lucide-react";

const items = [
  { icon: Clock, label: "Prayer Times", labelBn: "নামাজের সময়", href: "/prayer-times" },
  { icon: Moon, label: "Jumu'ah", labelBn: "জুমু'আ", href: "/prayer-times#jumuah" },
  { icon: CalendarDays, label: "Events", labelBn: "অনুষ্ঠান", href: "/events" },
  { icon: BookOpen, label: "Quran", labelBn: "কুরআন", href: "/quran" },
  { icon: Heart, label: "Donate", labelBn: "দান", href: "/donations" },
  { icon: Phone, label: "Contact", labelBn: "যোগাযোগ", href: "#contact" },
];

export function QuickLinks() {
  return (
    <section className="bg-[#FAF8F5] px-4 py-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#e5e0d5] rounded-lg overflow-hidden">
          {items.map(({ icon: Icon, label, labelBn, href }) => (
            <a
              key={label}
              href={href}
              className="group flex flex-col items-center justify-center gap-2 bg-[#FAF8F5] p-4 sm:p-5 lg:p-6 text-center transition-colors duration-200 hover:bg-[#F5F2EB] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#c79a45]"
            >
              <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#0d4d3b]/5 text-[#0d4d3b] transition-colors group-hover:bg-[#0d4d3b] group-hover:text-white">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              </span>
              <span className="text-xs sm:text-sm font-medium text-[#1e2e28]">
                {label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
