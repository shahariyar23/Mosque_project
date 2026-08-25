import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockDonationSummary, mockDonationHistory } from "@/data/mock-user-data";
import { Receipt, Search, Filter } from "lucide-react";

export default async function DonationsPage() {
  const session = getSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#17211d]">My Donations</h1>
        <p className="mt-1 text-sm text-[#69726d]">
          View your donation history and manage your giving.
        </p>
      </div>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#69726d]">Total Donated</h3>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            ৳{mockDonationSummary.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#69726d]">This Year</h3>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            ৳{mockDonationSummary.thisYear.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#69726d]">This Month</h3>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            ৳{mockDonationSummary.thisMonth.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-[#69726d]">Recurring Donations</h3>
          <p className="mt-3 text-2xl font-bold text-[#17211d]">
            ৳{mockDonationSummary.recurring.toLocaleString()}/mo
          </p>
        </div>
      </section>

      {/* Donation History */}
      <section className="rounded-xl border border-[#e5e2d8] bg-white shadow-sm">
        <div className="flex flex-col border-b border-[#e5e2d8] p-4 sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="font-semibold text-[#17211d]">Donation History</h2>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d948f]" />
              <input
                type="text"
                placeholder="Search donations..."
                className="w-full rounded-md border border-[#e5e2d8] py-1.5 pl-9 pr-3 text-sm focus:border-[#0d4d3b] focus:outline-none focus:ring-1 focus:ring-[#0d4d3b] sm:w-[200px]"
              />
            </div>
            <button className="flex items-center gap-2 rounded-md border border-[#e5e2d8] px-3 py-1.5 text-sm font-medium text-[#69726d] hover:bg-[#faf9f4]">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf9f4] text-[#69726d]">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Fund</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Payment Method</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e2d8]">
              {mockDonationHistory.map((donation) => (
                <tr key={donation.id} className="transition-colors hover:bg-[#faf9f4]/50">
                  <td className="px-6 py-4 text-[#17211d]">{donation.date}</td>
                  <td className="px-6 py-4 text-[#17211d]">{donation.fund}</td>
                  <td className="px-6 py-4 font-medium text-[#17211d]">৳{donation.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#69726d]">{donation.method}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      {donation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/account/donations/${donation.id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#0d4d3b] hover:underline"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="flex flex-col divide-y divide-[#e5e2d8] lg:hidden">
          {mockDonationHistory.map((donation) => (
            <div key={donation.id} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#17211d]">৳{donation.amount.toLocaleString()}</p>
                  <p className="text-sm text-[#69726d]">{donation.fund}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  {donation.status}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-[#8d948f]">
                  <p>{donation.date}</p>
                  <p>{donation.method}</p>
                </div>
                <Link
                  href={`/account/donations/${donation.id}`}
                  className="rounded border border-[#e5e2d8] px-3 py-1 text-xs font-medium text-[#0d4d3b]"
                >
                  View Receipt
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination placeholder */}
        <div className="flex items-center justify-between border-t border-[#e5e2d8] px-6 py-4">
          <button className="rounded border border-[#e5e2d8] px-3 py-1.5 text-sm font-medium text-[#69726d] disabled:opacity-50">
            Previous
          </button>
          <p className="text-sm text-[#69726d]">Page 1 of 1</p>
          <button className="rounded border border-[#e5e2d8] px-3 py-1.5 text-sm font-medium text-[#69726d] disabled:opacity-50">
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
