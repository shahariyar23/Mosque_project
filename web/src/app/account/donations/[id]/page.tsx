"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { fetchDonation, type Donation } from "@/services/donationsService";

export default function DonationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let current = true; void fetchDonation(id).then((result) => current && setDonation(result)).catch(() => current && setError("This donation could not be found.")); return () => { current = false; }; }, [id]);
  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-[#a13b32]" role="alert">{error}</p>;
  if (!donation) return <p className="rounded-xl border border-[#e5e2d8] bg-white p-8 text-sm text-[#69726d]">Loading donation…</p>;
  const amount = new Intl.NumberFormat("en-BD", { style: "currency", currency: donation.currency }).format(Number(donation.amount));
  return <div className="mx-auto flex max-w-2xl flex-col gap-6"><Link href="/account/donations" className="inline-flex items-center gap-2 text-sm font-medium text-[#0d4d3b]"><ArrowLeft className="h-4 w-4" />Back to donations</Link><section className="rounded-2xl border border-[#e5e2d8] bg-white p-8 shadow-sm"><Receipt className="h-8 w-8 text-[#0d4d3b]" /><h1 className="mt-4 text-2xl font-semibold text-[#17211d]">Donation receipt</h1><p className="mt-2 text-3xl font-bold text-[#0d4d3b]">{amount}</p><dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#69726d]">Fund</dt><dd className="mt-1 font-medium text-[#17211d]">{donation.fund.name}</dd></div><div><dt className="text-[#69726d]">Date</dt><dd className="mt-1 font-medium text-[#17211d]">{new Date(donation.donatedAt).toLocaleDateString()}</dd></div><div><dt className="text-[#69726d]">Status</dt><dd className="mt-1 font-medium capitalize text-[#17211d]">{donation.status}</dd></div><div><dt className="text-[#69726d]">Method</dt><dd className="mt-1 font-medium capitalize text-[#17211d]">{donation.paymentMethod}</dd></div></dl></section></div>;
}
