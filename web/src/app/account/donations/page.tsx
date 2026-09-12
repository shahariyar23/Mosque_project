"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Receipt, RefreshCw } from "lucide-react";
import { fetchDonations, type Donation } from "@/services/donationsService";

function money(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency }).format(Number(amount));
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { setDonations((await fetchDonations({ page: 1, limit: 50 })).rows); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your donations."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const request = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(request);
  }, []);
  const total = useMemo(() => donations.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0), [donations]);
  return <div className="flex flex-col gap-8"><header><h1 className="text-2xl font-semibold text-[#17211d]">My Donations</h1><p className="mt-1 text-sm text-[#69726d]">Your giving history for this mosque.</p></header><section className="rounded-xl border border-[#e5e2d8] bg-white p-5 shadow-sm"><p className="text-sm font-medium text-[#69726d]">Completed donations</p><p className="mt-2 text-2xl font-bold text-[#17211d]">{money(String(total), "BDT")}</p></section>{loading ? <p className="rounded-xl border border-[#e5e2d8] bg-white p-8 text-sm text-[#69726d]">Loading your donations…</p> : null}{error ? <section className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-[#a13b32]" role="alert"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#073a2d] px-4 py-2 font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></section> : null}{!loading && !error && donations.length === 0 ? <p className="rounded-xl border border-dashed border-[#e5e2d8] bg-white p-10 text-center text-sm text-[#69726d]">No donations have been recorded for your account.</p> : null}{!loading && !error && donations.length > 0 ? <section className="overflow-hidden rounded-xl border border-[#e5e2d8] bg-white shadow-sm"><ul className="divide-y divide-[#e5e2d8]">{donations.map((donation) => <li key={donation.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold text-[#17211d]">{money(donation.amount, donation.currency)}</p><p className="mt-1 text-sm text-[#69726d]">{donation.fund.name} · {new Date(donation.donatedAt).toLocaleDateString()}</p></div><Link href={`/account/donations/${donation.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e2d8] px-3 py-2 text-sm font-semibold text-[#0d4d3b]"><Receipt className="h-4 w-4" />View</Link></li>)}</ul></section> : null}</div>;
}
