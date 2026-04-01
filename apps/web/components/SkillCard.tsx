"use client";

import Link from "next/link";
import { Download, Copy, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Skill } from "@/lib/api";
import FilecoinProofBadge from "@/components/FilecoinProofBadge";

export default function SkillCard({ skill }: { skill: Skill }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`npx skillcoin install ${skill.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryColors: Record<string, string> = {
    coding: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    marketing: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    research: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    devops: "bg-green-500/15 text-green-400 border-green-500/20",
    writing: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  };

  const badgeClass =
    categoryColors[skill.category || ""] || "bg-brand-purple/15 text-brand-purple-light border-brand-purple/20";

  return (
    <Link href={`/skills/${skill.slug}`}>
      <div className="glass glass-hover rounded-2xl p-6 h-full flex flex-col transition-all duration-300 group cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white group-hover:text-brand-cyan transition-colors">
              {skill.name}
            </h3>
            <span className="text-xs text-text-muted font-mono">v{skill.version}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {skill.category && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                {skill.category}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1 line-clamp-3">
          {skill.description}
        </p>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skill.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          {/* Filecoin proof badge */}
          <FilecoinProofBadge
            dataSetId={(skill as any).filecoinDatasetId}
            pieceCid={(skill as any).pieceCid}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-brand-cyan">
                {Number(skill.priceAmount) === 0 ? "FREE" : `${skill.priceAmount} ${skill.priceCurrency}`}
              </span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Download className="w-3 h-3" />
                {skill.downloads.toLocaleString()}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-all"
              title="Copy install command"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Install
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
