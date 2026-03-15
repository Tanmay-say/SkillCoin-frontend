"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SkillCard from "@/components/SkillCard";
import InstallCommand from "@/components/InstallCommand";
import { fetchSkills, type Skill } from "@/lib/api";
import { Box, Database, Download, ArrowRight, Zap, Shield, Globe, Loader2 } from "lucide-react";

export default function HomePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills({ limit: 6, sort: "newest" })
      .then((res) => setSkills(res.skills))
      .catch((err) => console.error("Failed to fetch skills:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-purple/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-text-secondary mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Built for Filecoin + Flow Hackathon
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            <span className="gradient-text">npm</span> for AI
            <br />
            Agent Skills
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Publish, discover, and install reusable AI workflows.
            <br className="hidden sm:block" />
            Stored permanently on <span className="text-brand-cyan font-medium">Filecoin</span>.
            Paid via <span className="text-brand-purple-light font-medium">x402</span>.
          </p>

          {/* Terminal Command */}
          <div className="max-w-md mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <InstallCommand name={skills.length > 0 ? skills[0].name : "your-skill"} />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/explore" className="btn-primary flex items-center gap-2">
              Explore Skills
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/create" className="btn-secondary flex items-center gap-2">
              Publish a Skill
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              The Skills Infrastructure
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Everything you need to create, distribute, and monetize AI agent skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-8 group hover:border-brand-purple/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/15 flex items-center justify-center mb-5 group-hover:glow-purple transition-all">
                <Box className="w-6 h-6 text-brand-purple-light" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Skills</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Package AI workflows as portable <code className="text-brand-cyan text-xs">.md</code> files.
                Compatible with Claude, Cursor, Copilot, and every major AI agent.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 group hover:border-brand-cyan/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-cyan/15 flex items-center justify-center mb-5 group-hover:glow-cyan transition-all">
                <Database className="w-6 h-6 text-brand-cyan" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Store on Filecoin</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Every skill is permanently stored on Filecoin via Synapse SDK.
                Daily PDP proofs guarantee your skill exists — forever.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 group hover:border-brand-pink/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-pink/15 flex items-center justify-center mb-5">
                <Download className="w-6 h-6 text-brand-pink" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Install Anywhere</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                One command to install any skill. x402 micropayment handled automatically.
                As simple as <code className="text-brand-cyan text-xs">npm install</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Three steps from creation to installation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload",
                desc: "Creator packages AI skill as a ZIP with SKILL.md + manifest.json. Upload via website or CLI.",
                icon: <Zap className="w-5 h-5" />,
              },
              {
                step: "02",
                title: "Store & List",
                desc: "Skill is uploaded to Filecoin via Synapse SDK, anchored on Calibration testnet with PDP proofs, and listed on the marketplace.",
                icon: <Shield className="w-5 h-5" />,
              },
              {
                step: "03",
                title: "Install & Pay",
                desc: "Developer runs skillcoin install. x402 micropayment auto-completes. Skill files appear in their project.",
                icon: <Globe className="w-5 h-5" />,
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-6xl font-black text-white/[0.03] absolute -top-4 -left-2">
                  {item.step}
                </span>
                <div className="relative pt-8">
                  <div className="w-10 h-10 rounded-lg glass flex items-center justify-center mb-4 text-brand-cyan">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Skills Showcase ──────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">
                {skills.length > 0 ? "Featured Skills" : "Marketplace"}
              </h2>
              <p className="text-text-secondary">
                {skills.length > 0
                  ? "Real skills published on Filecoin."
                  : "No skills published yet — be the first!"}
              </p>
            </div>
            <Link
              href="/explore"
              className="hidden sm:flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-light transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                <Box className="w-8 h-8 text-brand-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
              <p className="text-sm text-text-secondary mb-6">
                The marketplace is empty. Publish the first skill!
              </p>
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                Publish a Skill <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link href="/explore" className="btn-secondary inline-flex items-center gap-2">
              View all skills <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-brand-purple/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Start publishing your skills today
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto mb-8">
                Join the decentralized skills economy. Create once, earn forever.
                Your skills live permanently on Filecoin.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/create" className="btn-primary flex items-center gap-2">
                  Publish a Skill
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/explore" className="btn-secondary">
                  Browse Marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
