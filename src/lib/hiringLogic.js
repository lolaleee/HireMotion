export function buildTalentReuseRecommendations({ job, candidates = [], talentPoolMatches = [], threshold = 75 }) {
  const openJobTitle = (job?.title || "").toLowerCase();
  const jobKeywords = Array.from(new Set((`${job?.title || ""} ${job?.description || ""} ${job?.requirements || ""}`)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
  ));

  const scoredCandidates = candidates
    .filter((candidate) => Number(candidate.fit_score ?? 0) >= threshold || Number(candidate.score ?? 0) >= threshold)
    .map((candidate) => {
      const score = Number(candidate.fit_score ?? candidate.score ?? 0);
      const reason = candidate.fit_summary || candidate.match_summary || "Strong prior interview or screening result";
      const role = candidate.job_title || candidate.matchedRole || openJobTitle || "relevant role";
      return {
        id: candidate.id || candidate.reference_code || `${candidate.candidate || "candidate"}-${role}`,
        candidate: candidate.candidate_name || candidate.candidate || "Candidate",
        role,
        score,
        reason,
        source: candidate.matchedRole ? "talent_pool" : "prior_application",
      };
    });

  const poolCandidates = (talentPoolMatches || [])
    .filter((match) => Number(match.score ?? 0) >= threshold)
    .map((match) => ({
      id: match.id || `${match.candidate}-${match.matchedRole}`,
      candidate: match.candidate,
      role: match.matchedRole || "Related role",
      score: Number(match.score ?? 0),
      reason: `Strong match for ${match.matchedRole || "a related opening"} after rejection from ${match.rejectedFrom || "a previous posting"}`,
      source: "talent_pool",
    }));

  const merged = [...scoredCandidates, ...poolCandidates]
    .filter((item, index, items) => items.findIndex((entry) => entry.id === item.id) === index)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return merged.map((item) => ({
    ...item,
    consideredFor: job?.title || "job repost",
    keywordsMatched: jobKeywords.length ? Math.min(jobKeywords.length, Math.max(2, Math.round(item.score / 20))) : 0,
  }));
}
