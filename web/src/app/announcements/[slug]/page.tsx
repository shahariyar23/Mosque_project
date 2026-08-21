import { InnerPage } from "@/components/inner-page";
export default async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <InnerPage eyebrow="ANNOUNCEMENT" title={slug.replaceAll("-", " ")}>
      <p className="max-w-3xl leading-8 text-[#69726d]">
        Further details for this community announcement will be made available
        here.
      </p>
    </InnerPage>
  );
}
