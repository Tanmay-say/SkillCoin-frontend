import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  CheckCircle2,
  Files,
  FolderTree,
  Layers3,
  TerminalSquare,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Skillcoin Docs",
  description:
    "Documentation for Skillcoin, the project-context compiler for agentic coding workflows.",
};

const principles = [
  "Skillcoin should generate an IDE-native context filesystem, not just a single SKILL.md.",
  "That is exactly why it reduces token usage and error rate. The IDE or coding agent does not need the full PRD every turn; it reads the right file at the right time.",
  "Clarification should happen before code generation, not repeatedly in later chats.",
  "Only project-relevant skills, rules, commands, and prompts should be loaded into the generated bundle.",
];

const currentStatus = [
  "The CLI already supports project intake, clarification questions, project specs, and Cursor-first bundle generation.",
  "Current output is still Cursor-only and too small compared with a full agentic context operating model.",
  "The next step is to generalize the bundle generator into IDE adapters for Cursor, Claude Code, and other coding CLIs.",
];

const bundleFiles = [
  ".skillcoin/project-spec.json",
  ".skillcoin/context.md",
  ".skillcoin/project-plan.md",
  ".skillcoin/answers.json",
  ".cursor/rules/*.mdc",
  ".cursor/prompts/*.md",
  "CLAUDE.md",
  ".claude/commands/*.md",
  ".claude/rules/*.md",
  ".claude/skills/*/SKILL.md",
];

const roadmap = [
  "Expand the CLI from Cursor-only output to IDE adapters.",
  "Add richer project memory: decisions, tasks, selected skills, and modular rules.",
  "Project only the required skills into each generated filesystem.",
  "Expose project-context generation directly in the website so users can understand and adopt the workflow.",
];

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.24em] text-brand-cyan mb-4">Docs.Skillcoin</p>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              Documentation for the project-context compiler behind Skillcoin
            </h1>
            <p className="text-lg text-text-secondary leading-8 mb-8">
              Skillcoin is moving from a simple skill marketplace toward infrastructure for agentic coding. The goal is to compile a PRD, decisions, and selected workflows into files your IDE can read directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                Publish a Skill
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/Tanmay-say/skillcoin-frontend"
                target="_blank"
                rel="noopener"
                className="btn-secondary inline-flex items-center gap-2"
              >
                View GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {principles.map((item, index) => (
              <div key={index} className="glass rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/15 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-brand-purple-light" />
                </div>
                <p className="text-sm text-text-secondary leading-7">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Current Status</h2>
            <p className="text-text-secondary max-w-3xl">
              The existing CLI already contains the early shape of the workflow. The product direction is to turn that into a real context operating system for coding agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentStatus.map((item, index) => (
              <div key={index} className="glass rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-cyan/15 flex items-center justify-center mb-4">
                  <Layers3 className="w-5 h-5 text-brand-cyan" />
                </div>
                <p className="text-sm text-text-secondary leading-7">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Generated Filesystem</h2>
              <p className="text-text-secondary leading-8">
                The long-term output is not one prompt. It is a project-specific filesystem containing the context, rules, prompts, commands, and skills needed by the target IDE.
              </p>
            </div>

            <div className="glass rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-brand-pink/15 flex items-center justify-center">
                  <FolderTree className="w-5 h-5 text-brand-pink" />
                </div>
                <div>
                  <p className="font-semibold">Example bundle</p>
                  <p className="text-sm text-text-muted">Project-specific, IDE-native, low-noise context</p>
                </div>
              </div>
              <div className="space-y-3 font-mono text-sm text-text-secondary">
                {bundleFiles.map((item) => (
                  <div key={item} className="glass rounded-xl px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">CLI Direction</h2>
            <p className="text-text-secondary max-w-3xl">
              The CLI should become the intake and compilation layer for agentic coding, not only the installer for published skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-purple/15 flex items-center justify-center mb-4">
                <TerminalSquare className="w-5 h-5 text-brand-purple-light" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Desired flow</h3>
              <div className="space-y-3 text-sm text-text-secondary leading-7">
                <p>1. User gives a PRD or project brief.</p>
                <p>2. Skillcoin asks missing implementation questions.</p>
                <p>3. It compiles the answers into a durable project spec.</p>
                <p>4. It selects only relevant skills and templates.</p>
                <p>5. It emits the target IDE structure for implementation.</p>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-cyan/15 flex items-center justify-center mb-4">
                <Files className="w-5 h-5 text-brand-cyan" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Roadmap</h3>
              <div className="space-y-3 text-sm text-text-secondary leading-7">
                {roadmap.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
