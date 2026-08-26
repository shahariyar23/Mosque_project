import type { ReportDefinition } from "@/lib/mosque/types";

/**
 * The reporting hub's data — the catalogue of official report definitions the mosque produces.
 *
 * All figures, headcounts, summaries, and chart data are populated live from the backend API
 * (/api/v1/reports/*). No mock generation dates or mock scheduled runs are retained.
 */

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
      "Breakdown by role and active status",
      "Outstanding membership fees",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Contact details and role",
      "Registration date",
      "Account status",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Active against inactive volunteers",
      "Volunteer roster by state",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Capacity used at each venue",
      "Feedback scores where collected",
    ],
    lastGeneratedAt: "",
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
      "Verified donations received in the month",
      "Paid expenses and staff salaries",
      "Net financial balance (Surplus / Deficit)",
      "Active budget allocations and remaining headroom",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Fund and payment method each was given to",
      "Breakdown by status",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Zakat and sadaqah collected",
      "Eligible fund distributions",
      "Amount carried forward",
    ],
    lastGeneratedAt: "",
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
      "Verified donation receipts",
      "Donor name, amount and fund",
      "Payment method and verified date",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Five daily congregation counts",
      "Jumu'ah attendance across sessions",
      "Capacity used in each prayer hall",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Confirmed and pending statuses",
    ],
    lastGeneratedAt: "",
    scheduled: false,
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
      "Completion rates",
    ],
    lastGeneratedAt: "",
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
      "Year in review across community and finance",
      "Financial summary and reserves",
      "Membership and volunteer roster",
    ],
    lastGeneratedAt: "",
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
      "The verified accounts",
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
      "Safeguarding and governance review",
      "Progress against strategic objectives",
    ],
    lastGeneratedAt: "",
    scheduled: false,
  },
];

export function reportById(id: string): ReportDefinition | undefined {
  return reportCatalogue.find((report) => report.id === id);
}

export const reportStats = {
  total: reportCatalogue.length,
  scheduled: 0,
  runThisMonth: 0,
  categories: new Set(reportCatalogue.map((report) => report.category)).size,
};
