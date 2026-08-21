"use client";
import { useEffect, useRef, useState } from "react";

export function ImpactCounters({
  stats = [
    { label: "Years of Service", value: 20 },
    { label: "Community Members", value: 5000 },
  ],
}: {
  stats?: { label: string; value: number }[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="impact-grid mt-4 grid grid-cols-2 gap-6 text-center"
    >
      {stats.map((s, idx) => (
        <div key={idx} className="impact-card rounded bg-white p-4">
          <div className="counter-number text-2xl font-semibold text-[#0d4d3b]">
            {visible ? <Counter target={s.value} /> : "0"}
          </div>
          <div className="text-sm text-[#69726d] mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Counter({ target }: { target: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number | null = null;
    const start = performance.now();
    const duration = 900;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const val = Math.floor(t * target);
      setN(val);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);
  return (
    <>
      {n}
      {target >= 1000 ? "+" : ""}
    </>
  );
}

export default ImpactCounters;
