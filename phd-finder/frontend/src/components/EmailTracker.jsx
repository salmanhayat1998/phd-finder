import React, { useState } from "react";
import { Mail, CheckCircle, Clock, ExternalLink } from "lucide-react";

export default function EmailTracker({ phds }) {
  const [search, setSearch] = useState("");
  const emailed = phds.filter((p) => p.email_sent);
  const pending = phds.filter((p) => !p.email_sent && p.supervisor_email && p.score >= 20);

  const filterList = (list) =>
    list.filter((p) => {
      const q = search.toLowerCase();
      return (
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.supervisor_email?.toLowerCase().includes(q) ||
        p.institution?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      <input
        type="search"
        placeholder="Search emails…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-blue-400"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Sent */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <h2 className="font-semibold text-gray-800">Emails Sent ({emailed.length})</h2>
        </div>
        {filterList(emailed).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No emails sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-2 font-medium">PhD</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Supervisor Email</th>
                <th className="text-left px-3 py-2 font-medium">Sent</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Score</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filterList(emailed).map((phd) => (
                <tr key={phd.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800 line-clamp-1">{phd.title}</p>
                    <p className="text-xs text-gray-400">{phd.institution}</p>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-gray-600">{phd.supervisor_email}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {phd.email_sent_at
                      ? new Date(phd.email_sent_at).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="font-semibold text-blue-600">{Math.round(phd.score)}</span>
                  </td>
                  <td className="px-3 py-3">
                    {phd.url && (
                      <a href={phd.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          <h2 className="font-semibold text-gray-800">Pending Outreach ({pending.length})</h2>
          <span className="text-xs text-gray-400 ml-1">— score ≥ 20, email known, not yet sent</span>
        </div>
        {filterList(pending).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No pending outreach.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-2 font-medium">PhD</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Supervisor Email</th>
                <th className="text-left px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filterList(pending).map((phd) => (
                <tr key={phd.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800 line-clamp-1">{phd.title}</p>
                    <p className="text-xs text-gray-400">{phd.institution}</p>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-gray-600">{phd.supervisor_email}</td>
                  <td className="px-3 py-3 font-semibold text-blue-600">{Math.round(phd.score)}</td>
                  <td className="px-3 py-3">
                    {phd.supervisor_email && (
                      <a
                        href={`mailto:${phd.supervisor_email}?subject=${encodeURIComponent(`PhD Enquiry: ${phd.title}`)}`}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1 w-fit"
                      >
                        <Mail className="w-3 h-3" /> Email
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
