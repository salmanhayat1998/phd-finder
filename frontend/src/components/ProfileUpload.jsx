import React, { useRef, useState } from "react";
import { User, Upload, Trash2, FileText, Key, Save, Check } from "lucide-react";

function CVFileCard({ file, index, onRemove }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
      <FileText className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {file.text?.length || 0} chars · Added {new Date(file.addedAt).toLocaleDateString("en-GB")}
        </p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{file.text?.slice(0, 200)}…</p>
      </div>
      <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ProfileUpload({ profile, onUpdate, onAddCV, onRemoveCV }) {
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [bio, setBio] = useState(profile.bio || "");
  const [apiKey, setApiKey] = useState(profile.apiKey || "");
  const [uploading, setUploading] = useState(false);

  const handleSave = () => {
    onUpdate({ bio, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setUploading(true);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onAddCV(file.name, ev.target.result || "");
      };
      reader.readAsText(file);
    });
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-500" />
          Your Profile
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-500 text-xs uppercase font-medium block mb-1">Name</label>
            <p className="font-medium text-gray-800">{profile.name}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs uppercase font-medium block mb-1">Email</label>
            <p className="font-medium text-gray-800">{profile.email}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs uppercase font-medium block mb-1">Degree</label>
            <p className="text-gray-700">MSc Computer Games, Essex (2024)</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs uppercase font-medium block mb-1">Visa Status</label>
            <p className="text-gray-700">UK Graduate Visa · exp. Feb 2027</p>
          </div>
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase font-medium block mb-1">
            Bio / Research Statement
            <span className="normal-case text-gray-400 ml-1">(used in PS generation)</span>
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none outline-blue-400"
            rows={4}
            placeholder="Describe your research interests, key achievements, and what you're looking for in a PhD…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
      </div>

      {/* CV Files */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            CV Files
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload CV(s)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        <p className="text-xs text-gray-400">
          Upload .txt or .md CV files for best results. PDF/DOC text extraction is limited in-browser — paste as .txt for most accurate PS generation.
        </p>

        {(profile.cvFiles || []).length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Drop CV files here or click to browse</p>
            <p className="text-xs text-gray-300 mt-1">.txt · .md · .pdf · .doc · .docx</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(profile.cvFiles || []).map((file, i) => (
              <CVFileCard key={i} file={file} index={i} onRemove={onRemoveCV} />
            ))}
          </div>
        )}
      </div>

      {/* Claude API Key */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-500" />
          Claude API Key
          <span className="text-xs font-normal text-gray-400">(for AI-generated PS)</span>
        </h2>
        <p className="text-xs text-gray-500">
          Stored locally in your browser only — never sent to any server except Anthropic when you click "Generate PS".
          Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.anthropic.com</a>.
        </p>
        <input
          type="password"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-blue-400"
          placeholder="sk-ant-…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Profile</>}
      </button>
    </div>
  );
}
