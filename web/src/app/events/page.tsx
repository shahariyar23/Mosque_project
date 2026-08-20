import { EventsPage } from "@/components/events/events-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Events() {
  return <main><SiteHeader /><EventsPage /><SiteFooter /></main>;
}
