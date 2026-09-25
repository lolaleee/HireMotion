// Placeholder data shaped exactly like the Supabase tables, so swapping in
// real queries later (see each page's `// TODO: replace with supabase query`)
// doesn't require changing anything that reads this data.

export const jobPostings = [
  {
    id: "qc",
    title: "Quality Control Inspector",
    department: "Quality Control",
    location: "Lagos, NG",
    employment_type: "Full-time",
    deadline: "Closes 10 Oct 2026",
    description:
      "You'll inspect incoming raw materials and finished steel products against quality standards, document non-conformances, and work with production teams to resolve defects before they reach the customer.",
    requirements:
      "2+ years in quality control, ideally in steel, manufacturing, or a related industrial setting. Comfortable reading engineering drawings and specifications. HND or BSc in a science or engineering field.",
    is_open: true,
    application_count: 38,
  },
  {
    id: "hr",
    title: "HR Coordinator",
    department: "HR and Admin",
    location: "Lagos, NG",
    employment_type: "Full-time",
    deadline: "Closes 3 Oct 2026",
    description:
      "You'll support recruitment, onboarding, attendance tracking, and day-to-day HR administration for the Lagos site.",
    requirements:
      "2+ years in an HR or admin role. Familiarity with Nigerian labour practices. Strong documentation and communication skills.",
    is_open: true,
    application_count: 54,
  },
  {
    id: "weld",
    title: "Site Welding Supervisor",
    department: "Operations",
    location: "Lagos, NG",
    employment_type: "Contract",
    deadline: "Closes 15 Oct 2026",
    description:
      "You'll oversee welding crews on site, ensure work meets specification and safety standards, and coordinate with the QC team on inspections.",
    requirements:
      "5+ years welding experience, 2+ years in a supervisory role. Relevant welding certification. Comfortable reading engineering drawings.",
    is_open: true,
    application_count: 21,
  },
  {
    id: "sales",
    title: "Sales Executive",
    department: "Sales",
    location: "Lagos, NG",
    employment_type: "Full-time",
    deadline: "Closed 30 Sep 2026",
    description:
      "You'll manage client relationships, generate leads, and support the sales team in meeting quarterly targets across the Lagos region.",
    requirements:
      "2+ years in B2B sales, ideally industrial or construction materials. Strong communication and negotiation skills.",
    is_open: false,
    application_count: 29,
  },
];

export const applications = [
  {
    id: "ada",
    reference_code: "HM-8841-QC",
    candidate_name: "Ada Okonkwo",
    candidate_email: "ada.okonkwo@example.com",
    candidate_phone: "080X XXX XXXX",
    candidate_location: "Ikeja, Lagos",
    job_posting_id: "qc",
    job_title: "Quality Control Inspector",
    fit_score: 91,
    fit_summary: "Strong match against role requirements",
    fit_matches: [
      "4 years in quality control at a steel fabrication plant — exceeds the 2+ year requirement",
      "References experience reading engineering drawings and specifications directly in CV",
      "HND in Applied Chemistry — meets the science/engineering education requirement",
    ],
    fit_gaps: ["No mention of ISO or formal QC certification, though not explicitly required"],
    cover_note:
      "I've spent the last four years inspecting raw steel and finished products on the production floor, and I'm looking for a role where I can bring that hands-on QC experience into a larger operation like Dalal Steel.",
    cv_file_name: "CV.pdf",
    status: "screening",
    created_at: "2 days ago",
  },
  {
    id: "tunde",
    reference_code: "HM-2210-HC",
    candidate_name: "Tunde Bakare",
    candidate_email: "tunde.bakare@example.com",
    candidate_phone: "081X XXX XXXX",
    candidate_location: "Yaba, Lagos",
    job_posting_id: "hr",
    job_title: "HR Coordinator",
    fit_score: 76,
    status: "interview",
    created_at: "4 days ago",
  },
  {
    id: "chiamaka",
    reference_code: "HM-6634-SW",
    candidate_name: "Chiamaka Eze",
    candidate_email: "chiamaka.eze@example.com",
    candidate_phone: "070X XXX XXXX",
    candidate_location: "Ajah, Lagos",
    job_posting_id: "weld",
    job_title: "Site Welding Supervisor",
    fit_score: 58,
    status: "screening",
    created_at: "6 hours ago",
  },
  {
    id: "emeka",
    reference_code: "HM-1187-SE",
    candidate_name: "Emeka Nwosu",
    candidate_email: "emeka.nwosu@example.com",
    candidate_phone: "090X XXX XXXX",
    candidate_location: "Surulere, Lagos",
    job_posting_id: "sales",
    job_title: "Sales Executive",
    fit_score: 34,
    status: "rejected",
    created_at: "1 week ago",
  },
  {
    id: "funmi",
    reference_code: "HM-9902-QC",
    candidate_name: "Funmi Adebayo",
    candidate_email: "funmi.adebayo@example.com",
    candidate_phone: "080X XXX XXXX",
    candidate_location: "Lekki, Lagos",
    job_posting_id: "qc",
    job_title: "Quality Control Inspector",
    fit_score: 88,
    status: "submitted",
    created_at: "1 hour ago",
  },
];

export const interviews = [
  { day: "Today, 23 Sep", time: "10:00 AM", candidate: "Ada Okonkwo", role: "Quality Control Inspector", mode: "Video call" },
  { day: "Today, 23 Sep", time: "2:30 PM", candidate: "Tunde Bakare", role: "HR Coordinator", mode: "In person" },
  { day: "Tomorrow, 24 Sep", time: "11:15 AM", candidate: "Funmi Adebayo", role: "Quality Control Inspector", mode: "In person" },
  { day: "Fri, 26 Sep", time: "9:00 AM", candidate: "Chiamaka Eze", role: "Site Welding Supervisor", mode: "Video call" },
];

export const talentPoolMatches = [
  { candidate: "Emeka Nwosu", rejectedFrom: "Sales Executive", matchedRole: "HR Coordinator", score: 82 },
  { candidate: "Blessing Nnamdi", rejectedFrom: "HR Coordinator", matchedRole: "Quality Control Inspector", score: 71 },
];

export const scoreDistribution = [
  { department: "Quality Control", avg: 78 },
  { department: "HR and Admin", avg: 71 },
  { department: "Operations", avg: 64 },
  { department: "Sales", avg: 69 },
];
