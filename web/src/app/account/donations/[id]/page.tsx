import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockDonationHistory } from "@/data/mock-user-data";
import { ArrowLeft, Download, Printer, CheckCircle2 } from "lucide-react";

export default async function DonationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = getSession();

  if (!session) {
    redirect("/signin");
  }

  const resolvedParams = await params;
  const donation = mockDonationHistory.find((d) => d.id === resolvedParams.id) || mockDonationHistory[0];

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <Link
        href="/account/donations"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#69726d] hover:text-[#17211d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Donations
      </Link>

      <div className="overflow-hidden rounded-2xl border border-[#e5e2d8] bg-white shadow-sm">
        {/* Receipt Header */}
        <div className="bg-[#0d4d3b] p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-medium text-white/90">Donation Successful</h1>
          <p className="mt-2 text-4xl font-bold">৳{donation.amount.toLocaleString()}</p>
          <p className="mt-2 text-white/80">{donation.fund}</p>
        </div>

        {/* Receipt Body */}
        <div className="p-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8d948f] mb-4">
            Transaction Details
          </h2>
          
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-[#69726d]">Donation ID</dt>
              <dd className="font-medium text-[#17211d] mt-1">{donation.id}</dd>
            </div>
            <div>
              <dt className="text-[#69726d]">Date</dt>
              <dd className="font-medium text-[#17211d] mt-1">{donation.date}</dd>
            </div>
            <div>
              <dt className="text-[#69726d]">Payment Method</dt>
              <dd className="font-medium text-[#17211d] mt-1">{donation.method}</dd>
            </div>
            <div>
              <dt className="text-[#69726d]">Status</dt>
              <dd className="font-medium text-[#17211d] mt-1">
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  {donation.status}
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[#69726d]">Donor Name</dt>
              <dd className="font-medium text-[#17211d] mt-1">{session.user.name}</dd>
            </div>
          </dl>

          <div className="mt-8 border-t border-[#e5e2d8] pt-6 flex flex-col sm:flex-row gap-3">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0d4d3b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#073a2d]">
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[#e5e2d8] px-4 py-2.5 text-sm font-semibold text-[#17211d] hover:bg-[#faf9f4]">
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
