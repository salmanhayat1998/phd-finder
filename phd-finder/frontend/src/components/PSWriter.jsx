import React, { useState, useRef } from "react";
import { FileText, Wand2, Copy, Check, ChevronDown } from "lucide-react";

const SECTIONS = [
  { id: "intro", label: "Opening / Why this PhD" },
  { id: "background", label: "Academic Background" },
  { id: "research", label: "Research Experience & Dissertation" },
  { id: "skills", label: "Technical Skills & Industry Experience" },
  { id: "fit", label: "Fit with Supervisor / Group" },
  { id: "goals", label: "Career Goals & Motivation" },
  { id: "visa", label: "Visa & Funding Eligibility Note" },
];

function buildPS(phd, profile, sections) {
  const supervisor = phd?.supervisor_name || phd?.supervisor || "the supervisor";
  const title = phd?.title || "this PhD project";
  const institution = phd?.institution || "your institution";
  const hits = phd?.score_breakdown?.keyword_hits;
  const topHits = [...(hits?.high || []), ...(hits?.medium || [])].slice(0, 4).join(", ");

  const lines = [];

  if (sections.intro) {
    lines.push(
      `I am applying for the PhD position "${title}" at ${institution}. ` +
      `This project appeals directly to my research background and career ambitions in ${topHits || "AI and game systems"}.`
    );
  }

  if (sections.background) {
    lines.push(
      `I hold an MSc in Computer Games from the University of Essex (2024), where I graduated with a strong focus on artificial intelligence and interactive systems. ` +
      (profile.bio ? profile.bio : "")
    );
  }

  if (sections.research) {
    lines.push(
      `My MSc dissertation, "AI-Native NPC Agents", investigated the design and implementation of game characters driven by large language models and autonomous agent architectures. ` +
      `I developed a prototype that integrated GPT-based reasoning with behaviour tree execution, enabling NPCs to hold contextually appropriate conversations and adapt their decision-making based on narrative state. ` +
      `This work gave me direct experience with prompt engineering, agent orchestration, and real-time AI integration in Unity.`
    );
  }

  if (sections.skills) {
    lines.push(
      `Beyond academia, I bring four years of industry experience as a Senior Unity Developer, where I have shipped multiple game titles and built AI-driven systems at production scale. ` +
      `My technical toolkit spans C#, Python, Unity, reinforcement learning frameworks, and LLM API integration.`
    );
  }

  if (sections.fit && supervisor && supervisor !== "the supervisor") {
    lines.push(
      `I have followed ${supervisor}'s work on ${topHits || "intelligent systems"} and am excited by the opportunity to contribute to ongoing projects in your group. ` +
      `I believe my combination of research depth and industry practice makes me a strong candidate to add both academic rigour and engineering pragmatism to the team.`
    );
  }

  if (sections.goals) {
    lines.push(
      `My long-term goal is to advance the state of AI in interactive media, bridging the gap between academic research and commercial game development. ` +
      `A PhD under your supervision would provide the theoretical grounding and research environment I need to achieve this.`
    );
  }

  if (sections.visa) {
    lines.push(
      `I am a Pakistani national currently on a UK Graduate Visa (valid until February 2027), fully eligible for non-EU funded PhD positions and able to begin immediately.`
    );
  }

  return lines.filter(Boolean).join("\n\n");
}

async function generateWithClaude(phd, profile, sections, apiKey) {
  const sectionNames = Object.entries(sections)
    .filter(([, v]) => v)
    .map(([k]) => SECTIONS.find((s) => s.id === k)?.label)
    .join(", ");

  const prompt = `Write a personalised PhD personal statement for Salman Hayat applying to: "${phd?.title || "this PhD"}" at ${phd?.institution || "this institution"}.

Profile:
- MSc Computer Games, University of Essex (2024)
- Dissertation: AI-Native NPC agents using LLMs and autonomous agent architectures
- Senior Unity Developer (4 years industry experience)
- Pakistani national on UK Graduate Visa (until Feb 2027)
- Key skills: Unity, C#, Python, RL, LLMs, NPC AI, game development
${profile.bio ? `- Additional bio: ${profile.bio}` : ""}
${profile.cvFiles?.length ? `- CV highlights: ${profile.cvFiles.map((f) => f.name).join(", ")}` : ""}

PhD match keywords: ${[...((phd?.score_breakdown?.keyword_hits?.high) || []), ...((phd?.score_breakdown?.keyword_hits?.medium) || [])].join(", ")}
Supervisor: ${phd?.supervisor_name || phd?.supervisor || "unknown"}

Write sections: ${sectionNames}

Style: academic but warm, first person, 500-700 words total. No bullet points.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-calls": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

export default function PSWriter({ phd, profile, phds, onSelectPhD }) {
  const [sections, setSections] = useState(
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );
  const [ps, setPS] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("template"); // "template" | "ai"
  const textRef = useRef(null);

  const toggleSection = (id) => setSections((s) => ({ ...s, [id]: !s[id] }));

  const generate = async () => {
    setError("");
    if (mode === "template") {
      setPS(buildPS(phd, profile, sections));
      return;
    }
    if (!profile.apiKey) {
      setError("Add your Claude API key in My Profile to use AI generation.");
      return;
    }
    setLoading(true);
    try {
      const text = await generateWithClaude(phd, profile, sections, profile.apiKey);
      setPS(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(ps);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-5">
        {/* Controls */}
        <div className="space-y-4">
          {/* PhD selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">PhD Project</h3>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={phd?.id || ""}
              onChange={(e) => {
                const found = phds.find((p) => p.id === e.target.value);
                onSelectPhD(found || null);
              }}
            >
              <option value="">— Select a PhD —</option>
              {[...phds].sort((a, b) => b.score - a.score).map((p) => (
                <option key={p.id} value={p.id}>
                  [{Math.round(p.score)}] {p.title.slice(0, 55)}
                </option>
              ))}
            </select>
            {phd && (
              <div className="text-xs text-gray-500 space-y-0.5">
                <p><strong>Institution:</strong> {phd.institution}</p>
                <p><strong>Supervisor:</strong> {phd.supervisor_name || phd.supervisor || "—"}</p>
                <p><strong>Deadline:</strong> {phd.deadline || "—"}</p>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">Sections</h3>
            {SECTIONS.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={sections[id]}
                  onChange={() => toggleSection(id)}
                />
                {label}
              </label>
            ))}
          </div>

          {/* Mode */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h3 className="font-semibold text-gray-800 text-sm">Generation mode</h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={mode === "template"} onChange={() => setMode("template")} />
              Template (instant, offline)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={mode === "ai"} onChange={() => setMode("ai")} />
              AI-generated (Claude API)
            </label>
            {mode === "ai" && !profile.apiKey && (
              <p className="text-xs text-orange-600">Add Claude API key in My Profile tab.</p>
            )}
          </div>

          <button
            onClick={generate}
            disabled={loading || (!phd && mode === "ai")}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generating…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate PS</>
            )}
          </button>

          {error && <p className="text-red-600 text-xs">{error}</p>}
        </div>

        {/* Editor */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Personal Statement
            </h3>
            {ps && (
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
              >
                {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            )}
          </div>
          <textarea
            ref={textRef}
            className="flex-1 min-h-[500px] resize-none border border-gray-200 rounded-lg p-4 text-sm text-gray-800 font-serif leading-relaxed outline-blue-400"
            placeholder="Select a PhD above and click Generate PS…"
            value={ps}
            onChange={(e) => setPS(e.target.value)}
          />
          {ps && (
            <p className="text-xs text-gray-400 text-right">
              ~{ps.split(/\s+/).length} words
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
