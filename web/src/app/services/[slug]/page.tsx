import { notFound } from "next/navigation";
import { InnerPage } from "@/components/inner-page";
import { getService } from "@/components/services/service-data";
import { ServiceDetail } from "@/components/services/service-detail";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  return (
    <InnerPage eyebrow={service.category.toUpperCase()} title={service.title}>
      <ServiceDetail service={service} />
    </InnerPage>
  );
}
