import React, { useState } from "react";
import { GraduationCap, LayoutDashboard, Mail, ClipboardList, FileText, User } from "lucide-react";
import Dashboard from "./components/Dashboard.jsx";
import PhDList from "./components/PhDList.jsx";
import EmailTracker from "./components/EmailTracker.jsx";
import ApplicationTracker from "./components/ApplicationTracker.jsx";
import PSWriter from "./components/PSWriter.jsx";
import ProfileUpload from "./components/ProfileUpload.jsx";
import { usePhDs } from "./hooks/usePhDs.js";
import { useProfile } from "./hooks/useProfile.js";
import { useApplications } from "./hooks/useApplications.js";

const TABS = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "phds", label: "PhDs Found", Icon: GraduationCap },
  { id: "emails", label: "Emails", Icon: Mail },
  { id: "applications", label: "Applications", Icon: ClipboardList },
  { id: "ps", label: "PS Writer", Icon: FileText },
  { id: "profile", label: "My Profile", Icon: User },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedPhD, setSelectedPhD] = useState(null);
  const { data, loading, error } = usePhDs();
  const { profile, update: updateProfile, addCVFile, removeCVFile } = useProfile();
  const { applications, updateStatus, getStatus } = useApplications();

  const phds = data?.phds ?? [];
  const updatedAt = data?.updated_at;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <GraduationCap className="w-7 h-7" />
          <div>
            <h1 className="text-xl font-bold leading-tight">PhD Finder</h1>
            <p className="text-blue-200 text-xs">Salman Hayat · UK Graduate Visa · MSc Computer Games Essex 2024</p>
          </div>
          {updatedAt && (
            <span className="ml-auto text-xs text-blue-200">
              Last updated: {new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
            Loading PhD data…
          </div>
        )}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No data loaded yet</p>
            <p className="text-yellow-600 text-sm mt-1">
              Run the GitHub Actions workflow to scrape PhD listings. ({error})
            </p>
          </div>
        )}
        {!loading && !error && (
          <>
            {activeTab === "dashboard" && (
              <Dashboard phds={phds} applications={applications} onNavigate={setActiveTab} />
            )}
            {activeTab === "phds" && (
              <PhDList
                phds={phds}
                applications={applications}
                getStatus={getStatus}
                onSelect={(phd) => { setSelectedPhD(phd); setActiveTab("ps"); }}
                onStatusChange={updateStatus}
              />
            )}
            {activeTab === "emails" && <EmailTracker phds={phds} />}
            {activeTab === "applications" && (
              <ApplicationTracker phds={phds} applications={applications} updateStatus={updateStatus} />
            )}
            {activeTab === "ps" && (
              <PSWriter phd={selectedPhD} profile={profile} phds={phds} onSelectPhD={setSelectedPhD} />
            )}
            {activeTab === "profile" && (
              <ProfileUpload
                profile={profile}
                onUpdate={updateProfile}
                onAddCV={addCVFile}
                onRemoveCV={removeCVFile}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
