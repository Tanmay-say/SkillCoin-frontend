"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SkillCard from "@/components/SkillCard";
import InstallCommand from "@/components/InstallCommand";
import { fetchSkills, type Skill } from "@/lib/api";
import {
  ArrowRight,
  BrainCircuit,
  Box,
  Files,
  FolderTree,
  Globe,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";

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

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-purple/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-text-secondary mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Project context compiler for coding agents
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            <span className="gradient-text">Context OS</span> for
            <br />
            Agentic Coding
          </h1>

          <p
            className="text-lg sm:text-xl text-text-secondary max-w-3xl mx-auto mb-6 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Skillcoin turns a PRD, implementation brief, and key decisions into an IDE-native context filesystem for Cursor, Claude Code, and coding agents.
            <br className="hidden sm:block" />
            Reusable skills stay portable and permanent on <span className="text-brand-cyan font-medium">Filecoin</span>.
          </p>

          <p
            className="text-sm sm:text-base text-white/80 max-w-4xl mx-auto mb-10 leading-7 animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            That is exactly why it reduces token usage and error rate. The IDE or coding agent does not need the full PRD every turn; it reads the right file at the right time. Skillcoin should generate an IDE-native context filesystem, not just a single <code className="text-brand-cyan text-sm">SKILL.md</code>. It is infrastructure for agentic coding.
          </p>

          <div className="max-w-md mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <InstallCommand name={skills.length > 0 ? skills[0].name : "your-skill"} />
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link href="/explore" className="btn-primary flex items-center gap-2">
              Explore Skills
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs" className="btn-secondary flex items-center gap-2">
              Read the Docs
            </Link>
            <Link href="/create" className="btn-secondary flex items-center gap-2">
              Publish a Skill
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Skillcoin Exists
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              A project should not re-send the full PRD to the coding agent every turn. Skillcoin compiles durable project memory into the files your IDE can actually use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-8 group hover:border-brand-purple/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/15 flex items-center justify-center mb-5 group-hover:glow-purple transition-all">
                <FolderTree className="w-6 h-6 text-brand-purple-light" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate Context Filesystems</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Convert a PRD into structured project memory like <code className="text-brand-cyan text-xs">.cursor/</code>, <code className="text-brand-cyan text-xs">.claude/</code>, and <code className="text-brand-cyan text-xs">.skillcoin/</code>.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 group hover:border-brand-cyan/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-cyan/15 flex items-center justify-center mb-5 group-hover:glow-cyan transition-all">
                <BrainCircuit className="w-6 h-6 text-brand-cyan" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ask Before Building</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                The CLI asks high-impact clarification questions before generating plans, rules, prompts, and implementation context.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 group hover:border-brand-pink/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-pink/15 flex items-center justify-center mb-5">
                <Files className="w-6 h-6 text-brand-pink" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Use Only Relevant Skills</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Instead of dumping everything into one prompt, Skillcoin projects include only the rules, workflows, and skills needed for the build.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-strong rounded-3xl p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-start">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-brand-cyan mb-4">Advantages</p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-5">
                  Lower token waste, fewer repeated mistakes, better project accuracy
                </h2>
                <p className="text-text-secondary leading-8 max-w-3xl">
                  Skillcoin moves project memory out of chat history and into files the agent can resolve on demand. That keeps planning durable, reduces re-explaining architecture, and helps the coding IDE retrieve only the context needed for the current task.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  "PRD becomes structured project memory instead of repeated chat context.",
                  "Clarification happens once, then decisions are stored for later implementation.",
                  "IDE-native files like .cursor and .claude keep workflows modular and reusable.",
                  "Selected project skills reduce noise versus loading a generic mega-prompt.",
                ].map((item) => (
                  <div key={item} className="glass rounded-2xl p-5 text-sm text-text-secondary leading-7">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              From project brief to IDE-native build context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Ingest the Brief",
                desc: "User provides a PRD, project idea, architecture goal, or implementation request through the CLI.",
                icon: <Zap className="w-5 h-5" />,
              },
              {
                step: "02",
                title: "Clarify and Plan",
                desc: "Skillcoin asks the missing questions, compiles decisions, and generates a compact project spec and context bundle.",
                icon: <Shield className="w-5 h-5" />,
              },
              {
                step: "03",
                title: "Emit IDE Files",
                desc: "The CLI writes .cursor, .claude, .skillcoin, rules, prompts, and selected skills so agents can implement with less context overhead.",
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

      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">
                {skills.length > 0 ? "Featured Skills" : "Marketplace"}
              </h2>
              <p className="text-text-secondary">
                {skills.length > 0
                  ? "Reusable skills that can be projected into project-specific agent bundles."
                  : "No skills published yet - be the first!"}
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

      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-brand-purple/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Build once, route context where the agent needs it
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto mb-8">
                Skillcoin should generate an IDE-native context filesystem, not just a single SKILL.md. Publish reusable skills, generate project memory, and let coding agents read the right file at the right time.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/docs" className="btn-primary flex items-center gap-2">
                  Explore Docs
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/create" className="btn-secondary">
                  Publish a Skill
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
