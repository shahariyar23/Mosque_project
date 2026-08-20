import { notFound } from "next/navigation";
import { InnerPage } from "@/components/inner-page";
import { EventDetail } from "@/components/events/event-detail";
import { getEvent } from "@/components/events/event-data";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  return <InnerPage eyebrow="EVENT DETAILS" title={event.title}><EventDetail event={event} /></InnerPage>;
}
