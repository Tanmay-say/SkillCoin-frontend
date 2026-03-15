"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Box } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="glass rounded-2xl px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center group-hover:shadow-glow transition-all duration-300">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Skill<span className="gradient-text">coin</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="text-sm text-text-secondary hover:text-white transition-colors duration-200"
            >
              Explore
            </Link>
            <Link
              href="/create"
              className="text-sm text-text-secondary hover:text-white transition-colors duration-200"
            >
              Publish
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener"
              className="text-sm text-text-secondary hover:text-white transition-colors duration-200"
            >
              Docs
            </a>
            <Link href="/create" className="btn-primary text-sm !py-2 !px-4">
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-text-secondary hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-2 glass rounded-2xl p-4 animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link href="/explore" className="text-sm text-text-secondary hover:text-white py-2" onClick={() => setMobileOpen(false)}>
                Explore
              </Link>
              <Link href="/create" className="text-sm text-text-secondary hover:text-white py-2" onClick={() => setMobileOpen(false)}>
                Publish
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener" className="text-sm text-text-secondary hover:text-white py-2">
                Docs
              </a>
              <Link href="/create" className="btn-primary text-sm text-center !py-2" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
