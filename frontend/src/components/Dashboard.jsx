import React from "react";
import { GraduationCap, Mail, ClipboardList, TrendingUp, Star, CheckCircle } from "lucide-react";

function Stat({ label, value, sub, Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ScoreBar({ score }) {
  const pct = Math.min(100, (score / 100) * 100);
  const color = score >= 60 ? "bg-green-500" : score >= 35 ? "bg-yellow-400" : "bg-blue-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

export default function Dashboard({ phds, applications, onNavigate }) {
  const total = phds.length;
  const emailed = phds.filter((p) => p.email_sent).length;
  const highScore = phds.filter((p) => p.score >= 50).length;
  const appStatuses = Object.values(applications);
  const applied = appStatuses.filter((a) => ["applied", "interview", "offer"].includes(a.status)).length;

  const top10 = [...phds].sort((a, b) => b.score - a.score).slice(0, 10);
  const recentEmails = phds.filter((p) => p.email_sent).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="PhDs Found" value={total} sub="all sources" Icon={GraduationCap} color="bg-blue-500" />
        <Stat label="High Match" value={highScore} sub="score ≥ 50" Icon={Star} color="bg-yellow-500" />
        <Stat label="Emails Sent" value={emailed} sub="supervisor outreach" Icon={Mail} color="bg-green-500" />
        <Stat label="Active Apps" value={applied} sub="applied / interview" Icon={ClipboardList} color="bg-purple-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top matches */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Top Matches
            </h2>
            <button
              onClick={() => onNavigate("phds")}
              className="text-xs text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {top10.map((phd) => (
              <div key={phd.id}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{phd.title}</p>
                    <p className="text-xs text-gray-400 truncate">{phd.institution}</p>
                  </div>
                  {phd.email_sent && (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">Emailed</span>
                  )}
                </div>
                <ScoreBar score={phd.score} />
              </div>
            ))}
            {top10.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">
                Run the GitHub Actions workflow to find PhDs.
              </p>
            )}
          </div>
        </div>

        {/* Recent emails */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-500" />
              Recent Outreach
            </h2>
            <button
              onClick={() => onNavigate("emails")}
              className="text-xs text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {recentEmails.map((phd) => (
              <div key={phd.id} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{phd.title}</p>
                  <p className="text-xs text-gray-400">
                    {phd.supervisor_email || "No email recorded"} ·{" "}
                    {phd.email_sent_at
                      ? new Date(phd.email_sent_at).toLocaleDateString("en-GB")
                      : ""}
                  </p>
                </div>
              </div>
            ))}
            {recentEmails.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">No emails sent yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Funding note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>Filtering:</strong> All listings are from FindAPhD non-EU funded searches. Scores weight AI / NPC / games keywords most heavily. Supervisor emails are required before outreach is triggered.
      </div>
    </div>
  );
}
