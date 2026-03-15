"use client";

import Link from "next/link";
import { ExternalLink, CheckCircle2 } from "lucide-react";

interface FilecoinProofBadgeProps {
  dataSetId?: number | null;
  pieceCid?: string | null;
  className?: string;
}

/**
 * Shows a "Filecoin Verified" badge that links to the PDP proof dashboard.
 * Displays a live green dot indicating active storage proofs.
 */
export default function FilecoinProofBadge({
  dataSetId,
  pieceCid,
  className = "",
}: FilecoinProofBadgeProps) {
  if (!dataSetId) {
    // Fallback for old skills stored on Lighthouse (no dataSetId)
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-text-muted border border-white/8 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        IPFS Stored
      </span>
    );
  }

  return (
    <Link
      href={`https://pdp.vxb.ai/calibration/dataset/${dataSetId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors ${className}`}
      title={`Filecoin Verified — Dataset ID: ${dataSetId}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      Filecoin Verified
      <ExternalLink className="w-2.5 h-2.5" />
    </Link>
  );
}
