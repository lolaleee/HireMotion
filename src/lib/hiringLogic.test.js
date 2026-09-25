import test from "node:test";
import assert from "node:assert/strict";

import { buildTalentReuseRecommendations } from "./hiringLogic.js";

test("recommends rejected high-fit candidates for a reposted role", () => {
  const job = {
    title: "Sales Executive",
    description: "Lead generation and client relationships for industrial sales.",
    requirements: "B2B sales negotiation communication and customer relationships.",
  };

  const candidates = [
    { id: "c1", candidate_name: "Emeka Nwosu", fit_score: 82, fit_summary: "Strong sales and relationship experience" },
    { id: "c2", candidate_name: "Jane Doe", fit_score: 64, fit_summary: "Weak communication fit" },
  ];

  const matches = [
    { id: "m1", candidate: "Emeka Nwosu", matchedRole: "Sales Executive", rejectedFrom: "Retail Coordinator", score: 88 },
    { id: "m2", candidate: "Nina Lee", matchedRole: "Sales Executive", rejectedFrom: "HR Coordinator", score: 58 },
  ];

  const results = buildTalentReuseRecommendations({ job, candidates, talentPoolMatches: matches, threshold: 75 });

  assert.equal(results.length >= 1, true);
  assert.equal(results[0].candidate, "Emeka Nwosu");
  assert.ok(results[0].score >= 75);
});

test("filters out weak matches below the reuse threshold", () => {
  const job = {
    title: "HR Coordinator",
    description: "Support recruitment and documentation.",
    requirements: "Documentation communication and onboarding experience.",
  };

  const matches = [
    { id: "m1", candidate: "Aisha", matchedRole: "HR Coordinator", rejectedFrom: "Sales Executive", score: 70 },
    { id: "m2", candidate: "Tunde", matchedRole: "HR Coordinator", rejectedFrom: "Operations", score: 86 },
  ];

  const results = buildTalentReuseRecommendations({ job, talentPoolMatches: matches, threshold: 75 });

  assert.equal(results.some((item) => item.candidate === "Aisha"), false);
  assert.equal(results.some((item) => item.candidate === "Tunde"), true);
});
