import { useState, useEffect } from "react";

const STORAGE_KEY = "phd_finder_profile";

const DEFAULT_PROFILE = {
  name: "Salman Hayat",
  email: "salmanhayat16@gmail.com",
  bio: "MSc Computer Games, University of Essex (2024). Dissertation on AI-Native NPC agents. Senior Unity Developer with 4 years industry experience. Pakistani national on UK Graduate Visa (valid until Feb 2027).",
  cvFiles: [], // array of { name, text } — stored as base64 text extracts
  apiKey: "",  // Claude API key for PS generation (stored locally only)
};

export function useProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const update = (updates) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addCVFile = (name, text) => {
    update({ cvFiles: [...(profile.cvFiles || []), { name, text, addedAt: new Date().toISOString() }] });
  };

  const removeCVFile = (index) => {
    const next = [...(profile.cvFiles || [])];
    next.splice(index, 1);
    update({ cvFiles: next });
  };

  return { profile, update, addCVFile, removeCVFile };
}
