import Link from "next/link";
import { Box } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">
                Skill<span className="gradient-text">coin</span>
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              npm for AI Agent Skills. Decentralized, paid, and permanent on Filecoin.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/explore" className="text-sm text-text-muted hover:text-white transition-colors">Explore Skills</Link></li>
              <li><Link href="/create" className="text-sm text-text-muted hover:text-white transition-colors">Publish a Skill</Link></li>
              <li><a href="#" className="text-sm text-text-muted hover:text-white transition-colors">CLI Docs</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><a href="https://github.com" target="_blank" className="text-sm text-text-muted hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#" className="text-sm text-text-muted hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="text-sm text-text-muted hover:text-white transition-colors">Architecture</a></li>
            </ul>
          </div>

          {/* Built With */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-4">Built With</h4>
            <ul className="space-y-3">
              <li><a href="https://filecoin.io" target="_blank" className="text-sm text-text-muted hover:text-white transition-colors">Filecoin</a></li>
              <li><a href="https://x402.org" target="_blank" className="text-sm text-text-muted hover:text-white transition-colors">x402 Protocol</a></li>
              <li><a href="https://lighthouse.storage" target="_blank" className="text-sm text-text-muted hover:text-white transition-colors">Lighthouse</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © 2026 Skillcoin. Built for the Filecoin + Flow Hackathon.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted">Stored on Filecoin</span>
            <span className="text-xs text-text-muted">•</span>
            <span className="text-xs text-text-muted">Paid via x402</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
