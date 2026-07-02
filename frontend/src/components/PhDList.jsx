import React, { useState, useMemo } from "react";
import { ExternalLink, Mail, Star, GraduationCap } from "lucide-react";

const STATUS_OPTIONS = ["found", "emailed", "replied", "applied", "interview", "offer", "rejected", "withdrawn"];
const STATUS_COLORS = {
  found: "bg-gray-100 text-gray-600",
  emailed: "bg-blue-100 text-blue-700",
  replied: "bg-cyan-100 text-cyan-700",
  applied: "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  withdrawn: "bg-gray-100 text-gray-400",
};

function Badge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.found}`}>
      {status}
    </span>
  );
}

function ScoreChip({ score }) {
  const color = score >= 60 ? "bg-green-500" : score >= 35 ? "bg-yellow-500" : "bg-blue-400";
  return (
    <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${color}`}>
      {Math.round(score)}
    </span>
  );
}

export default function PhDList({ phds, applications, getStatus, onSelect, onStatusChange }) {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [onlyFunded, setOnlyFunded] = useState(false);
  const [onlyEmailed, setOnlyEmailed] = useState(false);
  const [sortBy, setSortBy] = useState("score");

  const filtered = useMemo(() => {
    let list = phds.filter((p) => {
      const q = search.toLowerCase();
      const matches =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.institution?.toLowerCase().includes(q) ||
        p.supervisor?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      return (
        matches &&
        p.score >= minScore &&
        (!onlyFunded || p.is_funded) &&
        (!onlyEmailed || p.email_sent)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "title") return a.title?.localeCompare(b.title || "") || 0;
      if (sortBy === "institution") return a.institution?.localeCompare(b.institution || "") || 0;
      return 0;
    });

    return list;
  }, [phds, search, minScore, onlyFunded, onlyEmailed, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search title, institution, supervisor…"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48 outline-blue-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" className="rounded" checked={onlyFunded} onChange={(e) => setOnlyFunded(e.target.checked)} />
          Funded only
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" className="rounded" checked={onlyEmailed} onChange={(e) => setOnlyEmailed(e.target.checked)} />
          Emailed
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Min score:
          <input
            type="number"
            className="border border-gray-200 rounded px-2 py-1 w-16 text-sm ml-1"
            value={minScore}
            min={0}
            max={100}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </label>
        <select
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="score">Sort: Score</option>
          <option value="title">Sort: Title</option>
          <option value="institution">Sort: Institution</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
      </div>

      {/* PhD Cards */}
      <div className="space-y-3">
        {filtered.map((phd) => {
          const appStatus = getStatus(phd.id);
          const displayStatus = appStatus?.status || (phd.email_sent ? "emailed" : phd.application_status || "found");
          const hits = phd.score_breakdown?.keyword_hits;
          const topHits = [...(hits?.high || []), ...(hits?.medium || [])].slice(0, 4);

          return (
            <div key={phd.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <ScoreChip score={phd.score} />
                    <Badge status={displayStatus} />
                    {phd.is_funded && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Funded</span>
                    )}
                    {phd.is_non_eu_eligible && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Non-EU</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base leading-snug">{phd.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {phd.institution}
                    {phd.supervisor && ` · ${phd.supervisor}`}
                  </p>
                  {phd.deadline && (
                    <p className="text-xs text-orange-600 mt-0.5">Deadline: {phd.deadline}</p>
                  )}
                  {phd.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{phd.description}</p>
                  )}
                  {topHits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {topHits.map((kw) => (
                        <span key={kw} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <select
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    value={displayStatus}
                    onChange={(e) => onStatusChange(phd.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onSelect(phd)}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> Write PS
                  </button>
                  {phd.url && (
                    <a
                      href={phd.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View →
                    </a>
                  )}
                  {phd.supervisor_email && (
                    <a
                      href={`mailto:${phd.supervisor_email}`}
                      className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No PhDs match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
