import { IslamicTexture } from "@/components/islamic-texture";
import { SignupForm } from "./signup-form";
import { SignupVisualPanel } from "./signup-visual-panel";

/**
 * Sign up screen. Static apart from the form subtree, which is the only
 * client component on the page.
 */
export function SignupPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#073a2d] px-5 pb-14 pt-32 text-white sm:pt-36 lg:px-8">
        <IslamicTexture
          variant="hero"
          position="right"
          opacity={0.08}
          className="-right-28 -top-16 h-100 w-100 bg-contain"
        />
        <div className="relative z-10 mx-auto max-w-7xl">
          <p className="text-[11px] font-bold tracking-[.2em] text-[#e0be79] sm:text-xs">
            NOOR COMMUNITY MOSQUE · MEMBERSHIP
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Become a member.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-[15px]">
            Create your free account to stay close to prayer times, events,
            Islamic programs and community activities.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:items-start lg:gap-12">
          <SignupVisualPanel />

          <div>
            <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-[0_18px_50px_rgba(7,58,45,.09)] sm:p-7 lg:p-8">
              <SignupForm />
            </div>
            <p className="mt-5 text-center text-[11.5px] leading-5 text-[#9aa19c]">
              Your details stay with the mosque and are never sold or shared
              with third parties.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
