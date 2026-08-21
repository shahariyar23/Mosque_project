import { InnerPage } from "@/components/inner-page";
const photos = [
  "1564769625392-651b5f5f0b53",
  "1542816417-0983c9c9ad53",
  "1564121211835-e88c852648ab",
  "1519817650390-64a93db511aa",
  "1533158369042-2b1b1e0c72d8",
  "1473177104440-ffee2f376098",
];
export default function Gallery() {
  return (
    <InnerPage eyebrow="OUR COMMUNITY" title="Moments at Noor.">
      <div className="mb-8 flex flex-wrap gap-2">
        {[
          "All",
          "Mosque",
          "Events",
          "Community",
          "Education",
          "Ramadan",
          "Eid",
        ].map((x) => (
          <button className="border border-[#deded5] px-4 py-2 text-sm" key={x}>
            {x}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((p, i) => (
          <button
            className={`relative min-h-48 bg-cover bg-center text-left ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
            style={{
              backgroundImage: `linear-gradient(#073a2d33,#073a2d33),url(https://images.unsplash.com/photo-${p}?auto=format&fit=crop&w=900&q=75)`,
            }}
            key={p}
            aria-label="Open community gallery image"
          >
            <span className="absolute bottom-3 left-3 text-xs font-semibold text-white">
              Community
            </span>
          </button>
        ))}
      </div>
    </InnerPage>
  );
}
