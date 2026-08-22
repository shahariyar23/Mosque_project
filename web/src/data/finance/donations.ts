import type { Donation } from "@/lib/finance/types";

/**
 * Mock donation register. Swap for `GET /api/finance/donations`.
 *
 * The three states follow spec 0005 and the invariants below are the point of the data, not
 * decoration — every screen that reads this module relies on them:
 *
 *   1. `receiptNo` exists if and only if the donation has been verified. A recorded donation has no
 *      receipt, because the mosque has not confirmed the money yet.
 *   2. `verifiedBy` is never `recordedBy`. Separation of duties is the whole reason verification is a
 *      separate step (AC-12).
 *   3. A voided row keeps everything it had — amount, receipt, who verified it — and adds a reason.
 *      Nothing is deleted or edited in place (AC-13).
 *
 * Anonymous donations still carry a `donorName` for the internal record; the UI is responsible for
 * showing "Anonymous" publicly. Storing "Anonymous" as the name instead would lose the mosque's own
 * knowledge of who gave, which is not what anonymity means here.
 */
export const donations: Donation[] = [
  {
    id: "DON-2026-00218",
    donorName: "Abdullah Rahman",
    donorPhone: "+880 1711 220 145",
    anonymous: false,
    memberId: "MEM-001",
    amount: 1000,
    kind: "General",
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Cash",
    date: "2026-08-22",
    status: "Recorded",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-22",
    notes: "Dropped at the office after Asr.",
  },
  {
    id: "DON-2026-00217",
    donorName: "Nusrat Jahan",
    donorPhone: "+880 1811 907 332",
    anonymous: false,
    memberId: "MEM-019",
    amount: 5000,
    kind: "Sadaqah",
    fundId: "FND-003",
    fundName: "Maintenance Fund",
    paymentMethod: "Mobile Banking",
    date: "2026-08-22",
    status: "Recorded",
    recordedBy: "Shahed Alam",
    recordedAt: "2026-08-22",
  },
  {
    id: "DON-2026-00216",
    donorName: "Mahbub Alam",
    anonymous: true,
    amount: 30000,
    kind: "Zakat",
    fundId: "FND-005",
    fundName: "Zakat Fund",
    paymentMethod: "Bank Transfer",
    date: "2026-08-21",
    receiptNo: "REC-2026-00124",
    status: "Verified",
    transactionId: "TXN-2026-00124",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-21",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-21",
    notes: "Donor asked not to be named in the annual report.",
  },
  {
    id: "DON-2026-00215",
    donorName: "Kamal Uddin",
    donorPhone: "+880 1611 445 208",
    anonymous: false,
    memberId: "MEM-006",
    amount: 2500,
    kind: "General",
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Cash",
    date: "2026-08-20",
    receiptNo: "REC-2026-00123",
    status: "Verified",
    transactionId: "TXN-2026-00122",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-20",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-20",
  },
  {
    id: "DON-2026-00214",
    donorName: "Farhana Akter",
    donorPhone: "+880 1911 336 771",
    anonymous: false,
    amount: 12000,
    kind: "Sponsorship",
    fundId: "FND-004",
    fundName: "Education Fund",
    paymentMethod: "Online Payment",
    date: "2026-08-19",
    receiptNo: "REC-2026-00121",
    status: "Verified",
    transactionId: "TXN-2026-00119",
    recordedBy: "Shahed Alam",
    recordedAt: "2026-08-19",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-19",
    notes: "Sponsors two maktab students for the year.",
  },
  {
    id: "DON-2026-00213",
    donorName: "Ibrahim Khalil",
    donorPhone: "+880 1521 668 904",
    anonymous: false,
    memberId: "MEM-011",
    amount: 7500,
    kind: "Sadaqah",
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Mobile Banking",
    date: "2026-08-18",
    receiptNo: "REC-2026-00118",
    status: "Verified",
    transactionId: "TXN-2026-00116",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-18",
    verifiedBy: "Hafiz Mizanur Rahman",
    verifiedAt: "2026-08-19",
  },
  {
    id: "DON-2026-00212",
    donorName: "Rezaul Karim",
    donorPhone: "+880 1712 004 559",
    anonymous: false,
    amount: 3500,
    kind: "General",
    fundId: "FND-006",
    fundName: "Construction Fund",
    paymentMethod: "Cash",
    date: "2026-08-17",
    receiptNo: "REC-2026-00115",
    status: "Voided",
    transactionId: "TXN-2026-00113",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-17",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-17",
    voidedBy: "Rafiqul Islam",
    voidedAt: "2026-08-18",
    // Kept as the worked example of AC-13: the fix is a void plus a new record, so the receipt this
    // donor was handed can still be traced. Editing 3,500 down to 350 in place would erase that.
    voidReason: "Amount entered as 3,500 instead of 350. Re-recorded as DON-2026-00219.",
  },
  {
    id: "DON-2026-00211",
    donorName: "Saidul Hoque",
    anonymous: true,
    amount: 20000,
    kind: "Zakat",
    fundId: "FND-005",
    fundName: "Zakat Fund",
    paymentMethod: "Bank Transfer",
    date: "2026-08-15",
    receiptNo: "REC-2026-00112",
    status: "Verified",
    transactionId: "TXN-2026-00110",
    recordedBy: "Rafiqul Islam",
    recordedAt: "2026-08-15",
    verifiedBy: "Hafiz Mizanur Rahman",
    verifiedAt: "2026-08-16",
  },
  {
    id: "DON-2026-00210",
    donorName: "Tahmina Begum",
    donorPhone: "+880 1817 552 630",
    anonymous: false,
    memberId: "MEM-027",
    amount: 1500,
    kind: "Fitrah",
    fundId: "FND-005",
    fundName: "Zakat Fund",
    paymentMethod: "Cash",
    date: "2026-08-14",
    receiptNo: "REC-2026-00109",
    status: "Verified",
    transactionId: "TXN-2026-00107",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-14",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-14",
  },
  {
    id: "DON-2026-00209",
    donorName: "Anwar Hossain",
    donorPhone: "+880 1913 771 224",
    anonymous: false,
    amount: 9000,
    kind: "Qurbani",
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Card",
    date: "2026-08-12",
    receiptNo: "REC-2026-00106",
    status: "Verified",
    transactionId: "TXN-2026-00104",
    recordedBy: "Shahed Alam",
    recordedAt: "2026-08-12",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-13",
  },
  {
    id: "DON-2026-00208",
    donorName: "Golam Mostafa",
    donorPhone: "+880 1611 289 037",
    anonymous: false,
    memberId: "MEM-034",
    amount: 4000,
    kind: "General",
    fundId: "FND-003",
    fundName: "Maintenance Fund",
    paymentMethod: "Mobile Banking",
    date: "2026-08-10",
    receiptNo: "REC-2026-00103",
    status: "Verified",
    transactionId: "TXN-2026-00102",
    recordedBy: "Jamil Hossain",
    recordedAt: "2026-08-10",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-11",
  },
  {
    id: "DON-2026-00207",
    donorName: "Shahnaz Parvin",
    donorPhone: "+880 1521 990 618",
    anonymous: false,
    amount: 6000,
    kind: "Sponsorship",
    fundId: "FND-004",
    fundName: "Education Fund",
    paymentMethod: "Other",
    date: "2026-08-08",
    receiptNo: "REC-2026-00100",
    status: "Verified",
    transactionId: "TXN-2026-00099",
    recordedBy: "Shahed Alam",
    recordedAt: "2026-08-08",
    verifiedBy: "Rafiqul Islam",
    verifiedAt: "2026-08-09",
    notes: "Paid in kind — books for the maktab, valued at cost.",
  },
];

/** Newest first, which is the order every donation surface wants. */
export const recentDonations = [...donations].sort((a, b) => b.date.localeCompare(a.date));

/** The queue on the donations page: recorded, not yet confirmed by a second person. */
export const donationsAwaitingVerification = donations.filter((donation) => donation.status === "Recorded");

export function getDonation(id: string): Donation | undefined {
  return donations.find((donation) => donation.id === id);
}

/**
 * Month-to-date donation headline. `voided` is reported rather than quietly dropped — a month with
 * four voids is a fact about the month, and hiding it is how a register stops being trustworthy.
 *
 * These are totals for the whole book, like every other summary in this module; do not derive them
 * from the array above, which is a recent slice.
 */
export const donationSummary = {
  monthTotal: 40000,
  donorCount: 22,
  verified: 34500,
  awaitingVerification: 6000,
  voided: 3500,
  largestSingle: 30000,
  zakatShare: 51500,
};

export const donationKindFilterOptions = [
  { value: "all", label: "All types" },
  { value: "General", label: "General" },
  { value: "Zakat", label: "Zakat" },
  { value: "Sadaqah", label: "Sadaqah" },
  { value: "Fitrah", label: "Fitrah" },
  { value: "Qurbani", label: "Qurbani" },
  { value: "Sponsorship", label: "Sponsorship" },
];

export const donationStatusFilterOptions = [
  { value: "all", label: "All states" },
  { value: "Recorded", label: "Recorded" },
  { value: "Verified", label: "Verified" },
  { value: "Voided", label: "Voided" },
];
