import { SiteHeader } from "@/components/site-header";
type Props = { eyebrow: string; title: string; children: React.ReactNode };
export function InnerPage({ eyebrow, title, children }: Props) {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#073a2d] px-5 pb-18 pt-36 text-white">
        <div className="mx-auto max-w-7xl lg:px-8">
          <p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold sm:text-6xl">
            {title}
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        {children}
      </section>
    </main>
  );
}
