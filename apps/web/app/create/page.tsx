"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { uploadSkill } from "@/lib/api";
import { Upload, CheckCircle, Loader2, AlertCircle, FileText, X, ExternalLink } from "lucide-react";

type Step = "form" | "uploading" | "success" | "error";

export default function CreatePage() {
  const [step, setStep] = useState<Step>("form");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "coding",
    tags: "",
    price: "0.5",
    currency: "USDC",
    version: "1.0.0",
    creatorAddress: "",
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStep("uploading");
    setUploadProgress("Uploading skill to IPFS via Lighthouse...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "metadata",
        JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          price: parseFloat(form.price) || 0.5,
          currency: form.currency,
          version: form.version,
          creatorAddress: form.creatorAddress,
        })
      );

      setUploadProgress("Storing permanently on Filecoin...");

      const data = await uploadSkill(formData);

      setUploadProgress("Published to marketplace!");
      setResult({
        skillId: data.skillId,
        cid: data.cid,
        dealId: data.dealId,
        gatewayUrl: data.gatewayUrl,
        explorerUrl: data.explorerUrl,
        marketplaceUrl: data.marketplaceUrl,
        name: form.name,
      });
      setStep("success");
    } catch (error: any) {
      const respData = error?.response?.data;
      let msg = "";

      if (respData?.details?.fieldErrors) {
        const fieldErrors = respData.details.fieldErrors;
        const lines = Object.entries(fieldErrors)
          .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
          .join("\n");
        msg = lines || respData.error || "Validation failed";
      } else if (respData?.details?.formErrors?.length) {
        msg = respData.details.formErrors.join(", ");
      } else if (respData?.error) {
        msg = respData.error;
      } else {
        msg = error?.message || "Upload failed. Check the API is running on localhost:3001.";
      }

      setErrorMsg(msg);
      setStep("error");
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Publish a Skill
            </h1>
            <p className="text-text-secondary text-lg">
              Upload your AI skill instructions as a <strong>.md</strong> file.
              It will be stored permanently on Filecoin via Lighthouse.
            </p>
          </div>

          {/* ─── Form State ─────────────────────────── */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="glass rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-semibold text-text-secondary">Skill Information</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Skill Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. seo-writer"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 transition-colors"
                    required
                  />
                  <p className="text-xs text-text-muted mt-1">Lowercase, hyphens only (e.g. my-awesome-skill)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What does this skill do?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 transition-colors resize-none"
                    required
                    minLength={10}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 appearance-none cursor-pointer"
                    >
                      <option value="coding">Coding</option>
                      <option value="marketing">Marketing</option>
                      <option value="research">Research</option>
                      <option value="devops">DevOps</option>
                      <option value="writing">Writing</option>
                      <option value="analytics">Analytics</option>
                      <option value="design">Design</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="seo, content, blog"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Price (USDC)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Version</label>
                    <input
                      type="text"
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                      placeholder="1.0.0"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Creator Wallet</label>
                    <input
                      type="text"
                      value={form.creatorAddress}
                      onChange={(e) => setForm({ ...form, creatorAddress: e.target.value })}
                      placeholder="0x..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/6 text-sm focus:outline-none focus:border-brand-purple/50 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-text-secondary mb-4">Skill File (.md)</h3>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer ${
                    dragActive
                      ? "border-brand-purple bg-brand-purple/5"
                      : file
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-green-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-green-400">{file.name}</p>
                        <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="ml-4 text-text-muted hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
                      <p className="text-sm text-text-secondary mb-1">
                        Drop your <strong>.md</strong> file here or click to browse
                      </p>
                      <p className="text-xs text-text-muted">
                        Markdown file with your AI skill instructions (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!file || !form.name || !form.description || !form.creatorAddress}
                className="w-full btn-primary py-4 text-center disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Publish to Skillcoin (Filecoin)
              </button>
            </form>
          )}

          {/* ─── Uploading State ────────────────────── */}
          {step === "uploading" && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="w-12 h-12 text-brand-purple mx-auto mb-6 animate-spin" />
              <h3 className="text-xl font-semibold mb-2">Publishing Your Skill</h3>
              <p className="text-sm text-text-secondary mb-6">{uploadProgress}</p>
              <div className="w-48 h-1.5 bg-white/5 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-xs text-text-muted mt-4">
                Uploading to IPFS via Lighthouse — usually takes 2-5 seconds...
              </p>
            </div>
          )}

          {/* ─── Success State ──────────────────────── */}
          {step === "success" && result && (
            <div className="glass rounded-2xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-2">Skill Published on Filecoin! 🎉</h3>
              <p className="text-text-secondary mb-8">
                Your skill is now live on the Skillcoin marketplace and stored permanently on IPFS/Filecoin.
              </p>

              <div className="glass rounded-xl p-6 text-left max-w-md mx-auto space-y-3 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">IPFS CID:</span>
                  <code className="text-brand-cyan font-mono text-xs">{result.cid?.substring(0, 24)}...</code>
                </div>
                {result.dealId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Filecoin Deal:</span>
                    <code className="text-text-secondary font-mono text-xs">{result.dealId?.substring(0, 24)}...</code>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Install:</span>
                  <code className="text-brand-cyan font-mono text-xs">skillcoin install {result.name}</code>
                </div>
                {result.gatewayUrl && (
                  <div className="pt-2 border-t border-white/5">
                    <a
                      href={result.gatewayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-cyan hover:text-brand-cyan-light flex items-center gap-1"
                    >
                      View on IPFS Gateway <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => { setStep("form"); setFile(null); setResult(null); }}
                  className="btn-secondary"
                >
                  Publish Another
                </button>
                <a href="/explore" className="btn-primary">
                  View on Marketplace
                </a>
              </div>
            </div>
          )}

          {/* ─── Error State ────────────────────────── */}
          {step === "error" && (
            <div className="glass rounded-2xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">Upload Failed</h3>
              <div className="glass rounded-xl p-4 text-left max-w-md mx-auto mb-6">
                <pre className="text-sm text-red-400 whitespace-pre-wrap font-mono">{errorMsg}</pre>
              </div>
              <p className="text-xs text-text-muted mb-6">
                Make sure the API server is running on localhost:3001
              </p>
              <button
                onClick={() => setStep("form")}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
