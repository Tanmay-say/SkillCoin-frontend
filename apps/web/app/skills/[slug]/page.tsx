"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallCommand from "@/components/InstallCommand";
import CopyButton from "@/components/CopyButton";
import { fetchSkill, type Skill } from "@/lib/api";
import { ExternalLink, Download, User, Calendar, Shield, Database, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SkillDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchSkill(slug)
      .then((data) => setSkill(data))
      .catch((err) => {
        console.error("Failed to fetch skill:", err);
        setError(err?.response?.data?.error || "Skill not found");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const truncateAddress = (addr: string) =>
    `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  const categoryColors: Record<string, string> = {
    coding: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    marketing: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    research: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    devops: "bg-green-500/15 text-green-400 border-green-500/20",
    writing: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      </main>
    );
  }

  if (error || !skill) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Skill Not Found</h2>
          <p className="text-text-secondary mb-6">{error || "This skill doesn't exist."}</p>
          <Link href="/explore" className="btn-primary">
            Browse Marketplace
          </Link>
        </div>
      </main>
    );
  }

  const badgeClass = categoryColors[skill.category || ""] || "bg-brand-purple/15 text-brand-purple-light border-brand-purple/20";
  const hasPublicCid = !!skill.zipCid && skill.zipCid !== skill.pieceCid;

  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-muted mb-8">
            <Link href="/explore" className="hover:text-white transition-colors">
              Explore
            </Link>
            <span>/</span>
            <span className="text-white">{skill.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ─── Main Content ─────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="glass rounded-2xl p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl sm:text-3xl font-bold">{skill.name}</h1>
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-white/5 text-text-muted">
                        v{skill.version}
                      </span>
                    </div>
                    {skill.category && (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                        {skill.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-brand-cyan">
                      {Number(skill.priceAmount) === 0 ? "FREE" : `${skill.priceAmount} ${skill.priceCurrency}`}
                    </div>
                    <span className="text-xs text-text-muted">per install</span>
                  </div>
                </div>

                <p className="text-text-secondary leading-relaxed mb-6">
                  {skill.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {skill.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Install Command */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-text-secondary mb-3">
                  Install via CLI
                </h3>
                <InstallCommand name={skill.slug} />
              </div>

              {/* About */}
              <div className="glass rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-4">About This Skill</h3>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-text-secondary leading-relaxed">
                    {skill.description}
                  </p>
                  <p className="text-text-secondary leading-relaxed mt-4">
                    This skill is packaged as a standard Skillcoin bundle with a <code>SKILL.md</code> instruction file
                    and a <code>manifest.json</code> metadata file. It is compatible with Claude, Cursor, Copilot,
                    Codex, and other AI agents that support skill files.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Sidebar ─────────────────────────── */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-text-secondary">Details</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-muted">
                      <Download className="w-4 h-4" /> Downloads
                    </span>
                    <span className="text-sm font-medium">{skill.downloads.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-muted">
                      <User className="w-4 h-4" /> Creator
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono">{truncateAddress(skill.creatorAddress)}</span>
                      <CopyButton text={skill.creatorAddress} label="" className="text-text-muted hover:text-white" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-muted">
                      <Calendar className="w-4 h-4" /> Published
                    </span>
                    <span className="text-sm">
                      {new Date(skill.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filecoin Info */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-secondary">Storage</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    skill.storageType === "filecoin"
                      ? "bg-green-500/15 text-green-400 border border-green-500/20"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  }`}>
                    {skill.storageType === "filecoin" ? "Filecoin" : "Local"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="flex items-center gap-2 text-xs text-text-muted mb-1">
                      <Database className="w-3 h-3" />
                      {hasPublicCid ? "Content CID" : "Protected content"}
                    </span>
                    {skill.zipCid ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-brand-cyan font-mono break-all">
                          {skill.zipCid.substring(0, 20)}...
                        </code>
                        <CopyButton text={skill.zipCid} label="" className="text-text-muted hover:text-white flex-shrink-0" />
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        Paid skill content stays behind the payment gate. Install through the CLI to retrieve it.
                      </p>
                    )}
                    {hasPublicCid && (
                      <div className="mt-2 space-y-1">
                        {[
                          { label: "IPFS", url: `https://ipfs.io/ipfs/${skill.zipCid}` },
                          { label: "W3S", url: `https://w3s.link/ipfs/${skill.zipCid}` },
                          { label: "Cloudflare", url: `https://cloudflare-ipfs.com/ipfs/${skill.zipCid}` },
                        ].map((gw) => (
                          <a
                            key={gw.label}
                            href={gw.url}
                            target="_blank"
                            rel="noopener"
                            className="text-xs text-text-muted hover:text-brand-cyan transition-colors flex items-center gap-1"
                          >
                            {gw.label} Gateway <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {skill.filecoinDealId && (
                    <div>
                      <span className="flex items-center gap-2 text-xs text-text-muted mb-1">
                        <Shield className="w-3 h-3" /> Filecoin Deal
                      </span>
                      <code className="text-xs text-text-secondary font-mono break-all">
                        {skill.filecoinDealId}
                      </code>
                      {skill.filecoinDealId.startsWith("dataset-") && (
                        <a
                          href={`https://pdp.vxb.ai/calibration/dataset/${skill.filecoinDealId.replace("dataset-", "")}`}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-text-muted hover:text-brand-cyan transition-colors flex items-center gap-1 mt-1"
                        >
                          View PDP Proof <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="glass rounded-2xl p-6">
                <button className="w-full btn-primary text-center flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Install via CLI
                </button>
                <p className="text-xs text-text-muted text-center mt-3">
                  Requires the <code className="text-brand-cyan">skillcoin</code> CLI
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
