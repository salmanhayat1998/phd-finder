import { useState } from "react";

const STORAGE_KEY = "phd_finder_applications";

export function useApplications() {
  const [applications, setApplications] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const save = (next) => {
    setApplications(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const updateStatus = (phdId, status, notes = "") => {
    save({
      ...applications,
      [phdId]: {
        ...(applications[phdId] || {}),
        status,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const getStatus = (phdId) => applications[phdId] || null;

  return { applications, updateStatus, getStatus };
}
