import type { ReportDefinition } from "@/lib/mosque/types";

/**
 * The reporting hub's data — the catalogue of reports the mosque produces, plus the headline figures
 * those reports summarise.
 *
 * This sits above the ledger-level statements in Finance → Financial reports. Here is the whole shelf
 * across every area (community, finance, operations, governance) and the year's figures at a glance;
 * there is the accountant's detail. Nothing is really computed or downloaded — a run only stamps the
 * report as generated in this preview. The chart series are exported as plain `{ label, value }`
 * arrays so this file stays free of any component import; the view builds the chart segments from
 * them. Shaped to sit behind a future `GET /reports`.
 */

/* -------------------------------------------------------------------------- *
 * Headline figures — what the reports draw on
 * -------------------------------------------------------------------------- */

/** Total received each month, year to date (৳). Sums to the year-to-date figure below. */
export const receivedByMonth: Array<{ label: string; value: number }> = [
  { label: "Jan", value: 382_000 },
  { label: "Feb", value: 468_000 },
  { label: "Mar", value: 842_000 },
  { label: "Apr", value: 660_000 },
  { label: "May", value: 486_000 },
  { label: "Jun", value: 805_000 },
  { label: "Jul", value: 464_000 },
  { label: "Aug", value: 718_000 },
];

/** Income split by fund (৳). Sums to the same year-to-date total as the monthly series. */
export const incomeByFund: Array<{ label: string; value: number }> = [
  { label: "General Sadaqah", value: 1_685_000 },
  { label: "Zakat", value: 1_240_000 },
  { label: "Roof Fund", value: 960_000 },
  { label: "Membership", value: 520_000 },
  { label: "Other", value: 420_000 },
];

/** Members by tier. Sums to the member headcount. */
export const membersByTier: Array<{ label: string; value: number }> = [
  { label: "General", value: 812 },
  { label: "Student", value: 236 },
  { label: "Lifetime", value: 152 },
  { label: "Founding", value: 84 },
];

/** Members by age band. Sums to the same headcount as the tier split. */
export const membersByAge: Array<{ label: string; value: number }> = [
  { label: "Under 18", value: 214 },
  { label: "18–29", value: 342 },
  { label: "30–44", value: 388 },
  { label: "45–59", value: 236 },
  { label: "60+", value: 104 },
];

/** The year's headline numbers, used in captions and the donut centre. */
export const reportHeadline = {
  members: membersByTier.reduce((sum, row) => sum + row.value, 0), // 1,284
  receivedYtd: incomeByFund.reduce((sum, row) => sum + row.value, 0), // ৳4,825,000
  eventsHeld: 62,
  volunteerHours: 3_940,
};

/* -------------------------------------------------------------------------- *
 * Report catalogue
 * -------------------------------------------------------------------------- */

export const reportCatalogue: ReportDefinition[] = [
  /* Community ------------------------------------------------------------- */
  {
    id: "RPT-001",
    name: "Membership Report",
    description: "Who is on the roll this month — joins, leavers and the split by tier and age.",
    category: "Community",
    format: "PDF",
    frequency: "Monthly",
    owner: "Membership Office",
    includes: [
      "Active, pending and lapsed members",
      "New joins and leavers in the period",
      "Breakdown by tier and age band",
      "Outstanding membership fees",
    ],
    lastGeneratedAt: "2026-08-03",
    scheduled: true,
  },
  {
    id: "RPT-002",
    name: "New Members Summary",
    description: "A working list of everyone who joined in the period, ready for the welcome team.",
    category: "Community",
    format: "CSV",
    frequency: "Monthly",
    owner: "Membership Office",
    includes: [
      "Every member who joined in the period",
      "Contact details and chosen tier",
      "How they first heard about the mosque",
      "Welcome pack status",
    ],
    lastGeneratedAt: "2026-08-03",
    scheduled: true,
  },
  {
    id: "RPT-003",
    name: "Volunteer Hours",
    description: "Hours given by the volunteers, by person and by team, for the quarter.",
    category: "Community",
    format: "Excel",
    frequency: "Quarterly",
    owner: "Volunteer Coordinator",
    includes: [
      "Hours logged per volunteer",
      "Hours by team and activity",
      "Active against inactive volunteers",
      "Recognition thresholds reached",
    ],
    lastGeneratedAt: "2026-07-05",
    scheduled: true,
  },
  {
    id: "RPT-004",
    name: "Event Attendance",
    description: "Registrations against who actually came, for any event you choose.",
    category: "Community",
    format: "PDF",
    frequency: "On demand",
    owner: "Events Team",
    includes: [
      "Registrations against attendance per event",
      "No-show and walk-in counts",
      "Capacity used at each venue",
      "Feedback scores where collected",
    ],
    lastGeneratedAt: "2026-08-10",
    scheduled: false,
  },
  /* Finance --------------------------------------------------------------- */
  {
    id: "RPT-005",
    name: "Monthly Financial Summary",
    description: "The one-page income and expenditure the committee reads at the monthly meeting.",
    category: "Finance",
    format: "PDF",
    frequency: "Monthly",
    owner: "Finance Team",
    includes: [
      "Income and expenditure for the month",
      "Balance held across every fund",
      "Comparison against the same month last year",
      "Notes on the restricted funds",
    ],
    lastGeneratedAt: "2026-08-05",
    scheduled: true,
  },
  {
    id: "RPT-006",
    name: "Donations by Fund",
    description: "Every donation in the period, sorted by the fund and campaign it was given to.",
    category: "Finance",
    format: "CSV",
    frequency: "Monthly",
    owner: "Finance Team",
    includes: [
      "Every donation received in the period",
      "Fund and campaign each was given to",
      "One-off against recurring gifts",
      "Anonymous gifts kept separate",
    ],
    lastGeneratedAt: "2026-08-05",
    scheduled: true,
  },
  {
    id: "RPT-007",
    name: "Zakat & Sadaqah Report",
    description: "Zakat and sadaqah collected and distributed over the year, by eligible category.",
    category: "Finance",
    format: "PDF",
    frequency: "Annual",
    owner: "Finance Team",
    includes: [
      "Zakat collected and distributed",
      "Sadaqah and lillah received",
      "Distribution across the eligible categories",
      "Amount carried into the next year",
    ],
    lastGeneratedAt: "2026-04-15",
    scheduled: false,
  },
  {
    id: "RPT-008",
    name: "Donation Receipts Export",
    description: "The quarter's issued receipts, and a list of gifts still awaiting one.",
    category: "Finance",
    format: "CSV",
    frequency: "Quarterly",
    owner: "Finance Team",
    includes: [
      "Receipts issued in the quarter",
      "Donor name, amount and fund",
      "Receipt number and date",
      "Donations still needing a receipt",
    ],
    lastGeneratedAt: "2026-07-06",
    scheduled: true,
  },
  /* Operations ------------------------------------------------------------ */
  {
    id: "RPT-009",
    name: "Prayer Attendance Trends",
    description: "Congregation counts for the daily prayers and Jumu'ah across the month.",
    category: "Operations",
    format: "PDF",
    frequency: "Monthly",
    owner: "Operations",
    includes: [
      "Counts for the five daily congregations",
      "Jumu'ah attendance across every session",
      "Weekday against weekend patterns",
      "Capacity used in each hall",
    ],
    lastGeneratedAt: "2026-08-02",
    scheduled: true,
  },
  {
    id: "RPT-010",
    name: "Facility Bookings",
    description: "Every room booking in the period — confirmed, pending and declined.",
    category: "Operations",
    format: "CSV",
    frequency: "Monthly",
    owner: "Facilities Team",
    includes: [
      "Every booking in the period",
      "Room, purpose and organiser",
      "Confirmed, pending and declined",
      "Fees charged and fees waived",
    ],
    lastGeneratedAt: "2026-08-04",
    scheduled: true,
  },
  {
    id: "RPT-011",
    name: "Class Enrolment",
    description: "Places filled against capacity for every class, with the waiting lists.",
    category: "Operations",
    format: "Excel",
    frequency: "Quarterly",
    owner: "Education Team",
    includes: [
      "Enrolment per class and level",
      "Places filled against capacity",
      "Waiting lists",
      "Attendance and completion rates",
    ],
    lastGeneratedAt: "2026-07-08",
    scheduled: false,
  },
  /* Governance ------------------------------------------------------------ */
  {
    id: "RPT-012",
    name: "Annual Report",
    description: "The year in review across every area, for the members and the wider community.",
    category: "Governance",
    format: "PDF",
    frequency: "Annual",
    owner: "Trustees",
    includes: [
      "The year in review across every area",
      "Financial summary and reserves",
      "Membership and volunteer growth",
      "Plans and priorities for the coming year",
    ],
    lastGeneratedAt: "2026-01-20",
    scheduled: false,
  },
  {
    id: "RPT-013",
    name: "AGM Pack",
    description: "Everything the members need before the annual general meeting, in one document.",
    category: "Governance",
    format: "PDF",
    frequency: "Annual",
    owner: "Secretary",
    includes: [
      "Agenda and the previous minutes",
      "Trustees' and treasurer's reports",
      "The audited accounts",
      "Resolutions to be put to the members",
    ],
    lastGeneratedAt: "",
    scheduled: false,
  },
  {
    id: "RPT-014",
    name: "Trustees' Report",
    description: "Decisions, risks and progress against the plan since the last trustees' meeting.",
    category: "Governance",
    format: "PDF",
    frequency: "Quarterly",
    owner: "Trustees",
    includes: [
      "Decisions taken since the last meeting",
      "Risk register and safeguarding update",
      "Progress against the strategic plan",
      "Matters for the trustees' attention",
    ],
    lastGeneratedAt: "2026-07-01",
    scheduled: true,
  },
];

export function reportById(id: string): ReportDefinition | undefined {
  return reportCatalogue.find((report) => report.id === id);
}

export const reportStats = {
  total: reportCatalogue.length,
  scheduled: reportCatalogue.filter((report) => report.scheduled).length,
  runThisMonth: reportCatalogue.filter((report) => report.lastGeneratedAt.startsWith("2026-08")).length,
  categories: new Set(reportCatalogue.map((report) => report.category)).size,
};
