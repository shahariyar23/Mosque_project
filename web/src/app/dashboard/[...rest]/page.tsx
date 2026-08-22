import { PageHeader } from "@/components/dashboard/page-header";
import { crumbsFor, permissionForPath } from "@/lib/navigation";
import { Icon } from "@/components/finance/ui/icon";

/**
 * Catch-all for dashboard routes the menu lists but the modules have not shipped yet
 * (spec 0003, build step 10).
 *
 * The nav is complete from day one — every group and row the permission model describes is in
 * `lib/navigation.ts`. Without this page, clicking a row for an unbuilt module would drop out of the
 * shell into a bare 404, which reads like a broken app rather than an unfinished one. A panel inside
 * the chrome says the true thing: you have access, the screen is not built.
 *
 * More specific routes win over a catch-all in the App Router, so this only ever renders for paths
 * that no page file matches. It disappears on its own as the modules land.
 */
export default async function NotBuiltPage({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest = [] } = await params;
  const pathname = `/dashboard/${rest.join("/")}`;
  const crumbs = crumbsFor(pathname);
  const title = crumbs.at(-1)?.label ?? "Dashboard";
  const permission = permissionForPath(pathname);

  return (
    <div className="space-y-5">
      <PageHeader title={title} crumbs={crumbs} subtitle="This section is on the way." />

      <section className="rounded-xl border border-dashed border-[#d5d3c6] bg-white px-5 py-10 text-center sm:px-8 sm:py-14">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1f4ef] text-[#0d4d3b]"
        >
          <Icon name="sparkle" size={22} />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold text-[#17211d]">Not built yet</h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-6 text-[#69726d]">
          {title} is part of the plan and you have access to it — the screen itself is still being
          built. Nothing is broken.
        </p>
        {permission ? (
          <p className="mt-4 text-[11.5px] text-[#8b938d]">
            Opens with{" "}
            <code className="rounded bg-[#f4f6f2] px-1.5 py-0.5 font-mono text-[11px] text-[#3d453f]">
              {permission}
            </code>
          </p>
        ) : null}
      </section>
    </div>
  );
}
