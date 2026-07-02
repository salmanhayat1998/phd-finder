import React, { useState } from "react";
import { ClipboardList, ExternalLink, Edit2, Check } from "lucide-react";

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

function EditableNotes({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  return editing ? (
    <div className="flex items-start gap-1">
      <textarea
        className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 resize-none outline-none"
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button
        onClick={() => { onChange(draft); setEditing(false); }}
        className="text-green-600 hover:text-green-700 mt-1"
      >
        <Check className="w-4 h-4" />
      </button>
    </div>
  ) : (
    <button
      onClick={() => { setDraft(value || ""); setEditing(true); }}
      className="flex items-start gap-1 text-xs text-gray-400 hover:text-gray-700 text-left w-full group"
    >
      <Edit2 className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100" />
      <span>{value || "Add notes…"}</span>
    </button>
  );
}

export default function ApplicationTracker({ phds, applications, updateStatus }) {
  const [filter, setFilter] = useState("all");

  // Build tracked list: phds that have been emailed OR have non-default status
  const tracked = phds.filter((p) => {
    const app = applications[p.id];
    return p.email_sent || (app && app.status !== "found");
  });

  const withStatus = tracked.map((p) => ({
    ...p,
    appStatus: applications[p.id]?.status || (p.email_sent ? "emailed" : p.application_status || "found"),
    notes: applications[p.id]?.notes || "",
  }));

  const filtered = filter === "all" ? withStatus : withStatus.filter((p) => p.appStatus === filter);

  // Kanban-style counts
  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = withStatus.filter((p) => p.appStatus === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            filter === "all" ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          All ({withStatus.length})
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === s
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No applications tracked yet.</p>
            <p className="text-xs mt-1">Emailed PhDs will appear here automatically.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">PhD</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Deadline</th>
                <th className="text-left px-3 py-2.5 font-medium">Notes</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((phd) => (
                <tr key={phd.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800 line-clamp-1">{phd.title}</p>
                    <p className="text-xs text-gray-400">{phd.institution}</p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[phd.appStatus]}`}
                      value={phd.appStatus}
                      onChange={(e) => updateStatus(phd.id, e.target.value, phd.notes)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-gray-500 text-xs">
                    {phd.deadline || "—"}
                  </td>
                  <td className="px-3 py-3 min-w-40 max-w-xs">
                    <EditableNotes
                      value={phd.notes}
                      onChange={(notes) => updateStatus(phd.id, phd.appStatus, notes)}
                    />
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
    </div>
  );
}
