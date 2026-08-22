import { InnerPage } from "@/components/inner-page";
export default function Contact() {
  return (
    <InnerPage
      eyebrow="VISIT · CALL · WRITE"
      title="We would love to welcome you."
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="min-h-96 bg-[#d9ddd6] p-7">
          <p className="text-xs font-bold tracking-widest text-[#0d4d3b]">
            MAP PLACEHOLDER
          </p>
          <div className="mt-16 border border-[#0d4d3b]/20 bg-white/50 p-6">
            <b>Noor Community Mosque</b>
            <p className="mt-2 text-sm text-[#69726d]">
              123 Peace Avenue, Dhaka, Bangladesh
              <br />
              +880 1712 345678
              <br />
              salam@noormosque.org
            </p>
            <p className="mt-4 text-sm">
              <b>Office hours</b>
              <br />
              Sun–Thu · 10 AM–5 PM
            </p>
          </div>
        </div>
        <form className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="border border-[#d4d4ca] p-3" placeholder="Name" />
            <input
              className="border border-[#d4d4ca] p-3"
              placeholder="Email"
            />
          </div>
          <input className="border border-[#d4d4ca] p-3" placeholder="Phone" />
          <input
            className="border border-[#d4d4ca] p-3"
            placeholder="Subject"
          />
          <textarea
            className="min-h-36 border border-[#d4d4ca] p-3"
            placeholder="Message"
          />
          <button
            type="button"
            className="bg-[#0d4d3b] p-3 font-semibold text-white"
          >
            Send message
          </button>
        </form>
      </div>
    </InnerPage>
  );
}
