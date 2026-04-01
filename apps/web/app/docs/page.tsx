import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  Terminal,
  Package,
  Upload,
  Search,
  Download,
  ShieldCheck,
  Cpu,
  Layers,
  FolderTree,
  Zap,
  Globe,
  Bot,
  Code2,
  BookOpen,
  Coins,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation — Skillcoin",
  description:
    "Complete documentation for Skillcoin — the decentralized AI skills marketplace. Learn how to publish, discover, install, and verify AI agent skills stored on Filecoin/IPFS.",
};

const quickstartSteps = [
  {
    step: "01",
    title: "Install the CLI",
    code: "npm install -g skillcoin",
    description: "Install the Skillcoin CLI globally from npm.",
  },
  {
    step: "02",
    title: "Connect to the marketplace",
    code: "skillcoin config --api-base https://skillcoin-api.vercel.app",
    description: "Point the CLI at the production API server.",
  },
  {
    step: "03",
    title: "Browse skills",
    code: "skillcoin search",
    description: "See what's available on the marketplace.",
  },
  {
    step: "04",
    title: "Install a skill",
    code: "skillcoin install seo-blog-writer",
    description:
      "Download and install a skill to ~/.skillcoin/skills/",
  },
];

const commands = [
  {
    name: "search",
    alias: "s",
    icon: Search,
    color: "brand-cyan",
    usage: "skillcoin search [query]",
    description:
      "Browse the marketplace or filter by keyword. Lists name, version, category, price, and download count.",
  },
  {
    name: "install",
    alias: "i",
    icon: Download,
    color: "brand-purple",
    usage: "skillcoin install <name> [-f] [--no-payment]",
    description:
      "Download and install any skill. Free skills download instantly. Paid skills open a MetaMask browser page for on-chain payment (USDC or TFIL), then resume automatically.",
  },
  {
    name: "publish",
    alias: null,
    icon: Upload,
    color: "brand-pink",
    usage: "skillcoin publish <file> [options]",
    description:
      "Upload a .md, .txt, or .zip skill file to Filecoin and register it on the marketplace. Supports custom name, description, category, tags, price, and currency.",
  },
  {
    name: "list",
    alias: "ls",
    icon: Package,
    color: "brand-cyan",
    usage: "skillcoin list",
    description:
      "See all locally installed skills with version, category, and install date. Skills are stored in ~/.skillcoin/skills/",
  },
  {
    name: "chat",
    alias: null,
    icon: Bot,
    color: "brand-purple",
    usage: "skillcoin chat [--provider] [--model]",
    description:
      "Interactive AI chat REPL. Use /generate to create skills, /save to save them, /publish to push them, /list to browse. Supports Gemini, OpenAI, and Groq.",
  },
  {
    name: "project",
    alias: null,
    icon: FolderTree,
    color: "brand-pink",
    usage: "skillcoin project init [--prompt] [--ide] [--mode]",
    description:
      "Generate IDE-native project context bundles. Ask clarifying questions, compile answers into a spec, and emit Cursor rules, CLAUDE.md, project plans, and more.",
  },
  {
    name: "agent",
    alias: null,
    icon: Cpu,
    color: "brand-cyan",
    usage: "skillcoin agent create | list | run | delete",
    description:
      "Create custom AI agents with skill context, system prompts, and a specific provider/model. Run them in an interactive chat session.",
  },
  {
    name: "config",
    alias: null,
    icon: Layers,
    color: "brand-purple",
    usage: "skillcoin config [options]",
    description:
      "View or update CLI settings: API URL, private key, wallet, AI provider, AI key, IPFS gateway, network, IDE defaults, and more.",
  },
  {
    name: "register-agent",
    alias: null,
    icon: ShieldCheck,
    color: "brand-pink",
    usage: "skillcoin register-agent",
    description:
      "Register Skillcoin as an ERC-8004 verifiable AI agent on Base Sepolia. Uploads an agent card to Filecoin and mints a token on the on-chain identity registry.",
  },
];

const publishOptions = [
  { flag: "-n, --name <name>", desc: "Skill slug (default: filename)" },
  { flag: "-d, --desc <text>", desc: "Description" },
  { flag: "-c, --category <cat>", desc: "Category: coding, marketing, research…" },
  { flag: "-t, --tags <tags>", desc: "Comma-separated tags" },
  { flag: "-p, --price <amount>", desc: "Price (e.g. 0.5)" },
  { flag: "--currency <cur>", desc: "USDC | TFIL | FREE" },
  { flag: "-v, --version <ver>", desc: "Semver (default: 1.0.0)" },
  { flag: "-s, --storage <m>", desc: "api (default) | filecoin-pin" },
];

const contracts = [
  {
    name: "SkillRegistry",
    address: "0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690",
    network: "Filecoin FVM Calibration",
    chainId: 314159,
    explorer: "https://calibration.filfox.info/en/address/0x30AcdeB5C03F5E02b0E7e9f22B20cBC4dF182690",
  },
  {
    name: "SkillLicenseNFT",
    address: "0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9",
    network: "Filecoin FVM Calibration",
    chainId: 314159,
    explorer: "https://calibration.filfox.info/en/address/0x7cFaf07016514f5261768Ce991D9E373cBC8d6e9",
  },
  {
    name: "ERC-8004 Registry",
    address: "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb",
    network: "Base Sepolia",
    chainId: 84532,
    explorer: "https://sepolia.basescan.org/address/0x8004AA63c570c570eBF15376c0dB199918BFe9Fb",
  },
];

const futureFeatures = [
  {
    icon: Zap,
    title: "Skill Ratings & Reviews",
    desc: "Community quality signals — star ratings and written reviews per install.",
    timeline: "Near-term",
  },
  {
    icon: Globe,
    title: "Filecoin Mainnet",
    desc: "Move from Calibration testnet to production Filecoin for real assets.",
    timeline: "Near-term",
  },
  {
    icon: Layers,
    title: "Skill Dependencies",
    desc: "Declare requires: [researcher, summarizer] in your skill manifest.",
    timeline: "Medium-term",
  },
  {
    icon: Bot,
    title: "Agent-to-Agent Purchases",
    desc: "Autonomous agents buy skills via delegated wallets without human approval.",
    timeline: "Medium-term",
  },
  {
    icon: Code2,
    title: "React SDK",
    desc: "Embed the marketplace in any Next.js app with a <SkillMarketplace /> component.",
    timeline: "Medium-term",
  },
  {
    icon: Coins,
    title: "SkillCoin DAO",
    desc: "Community governance over featured skills, categories, and treasury allocation.",
    timeline: "Long-term",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.24em] text-brand-cyan mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Documentation
            </p>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              Everything you need to build with{" "}
              <span className="text-brand-cyan">Skillcoin</span>
            </h1>
            <p className="text-lg text-text-secondary leading-8 mb-8 max-w-3xl">
              Skillcoin is a decentralized marketplace for AI agent skills — reusable instruction files and workflows stored permanently on Filecoin. Publish a skill, get paid in crypto, let anyone install it in one command.
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
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Quickstart</h2>
            <p className="text-text-secondary max-w-2xl">
              From zero to your first installed skill in under 60 seconds.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickstartSteps.map((step) => (
              <div key={step.step} className="glass rounded-2xl p-6 flex flex-col gap-4">
                <span className="text-4xl font-black text-white/10">{step.step}</span>
                <div>
                  <p className="font-semibold mb-1">{step.title}</p>
                  <p className="text-sm text-text-muted mb-3">{step.description}</p>
                  <div className="bg-black/40 rounded-lg px-3 py-2 font-mono text-xs text-brand-cyan break-all">
                    {step.code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLI Commands */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              CLI Reference
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">All Commands</h2>
            <p className="text-text-secondary max-w-2xl">
              Every command in the <code className="text-brand-cyan font-mono text-sm">skillcoin</code> CLI, from search to on-chain agent registration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {commands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <div key={cmd.name} className="glass rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-${cmd.color}/15 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 text-${cmd.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono text-sm">{cmd.name}</span>
                        {cmd.alias && (
                          <span className="text-xs text-text-muted font-mono">/ {cmd.alias}</span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-xs text-brand-cyan break-all leading-5">
                        {cmd.usage}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-6">{cmd.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Publishing guide */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brand-pink mb-3">
                Publishing
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Publish your first skill
              </h2>
              <p className="text-text-secondary leading-8 mb-6">
                Any <code className="text-brand-cyan font-mono text-sm">.md</code>,{" "}
                <code className="text-brand-cyan font-mono text-sm">.txt</code>, or{" "}
                <code className="text-brand-cyan font-mono text-sm">.zip</code> file
                can be published. Your skill is uploaded to Filecoin via the
                Synapse SDK and assigned a permanent content-addressed CID.
                Users can verify your skill exists using any IPFS gateway.
              </p>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold mb-2 text-text-secondary">Minimal publish:</p>
                  <div className="bg-black/50 rounded-xl p-4 font-mono text-sm text-brand-cyan">
                    skillcoin publish my-skill.md
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2 text-text-secondary">Full publish with metadata:</p>
                  <div className="bg-black/50 rounded-xl p-4 font-mono text-xs leading-6 text-brand-cyan">
                    skillcoin publish my-skill.md \<br />
                    &nbsp;&nbsp;--name my-skill \<br />
                    &nbsp;&nbsp;--desc "Writes SEO blog posts" \<br />
                    &nbsp;&nbsp;--category marketing \<br />
                    &nbsp;&nbsp;--tags "seo,blog,writing" \<br />
                    &nbsp;&nbsp;--price 0.5 \<br />
                    &nbsp;&nbsp;--currency USDC
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <p className="font-semibold mb-5 flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-pink" />
                Publish options
              </p>
              <div className="space-y-3">
                {publishOptions.map((opt) => (
                  <div key={opt.flag} className="flex gap-3 text-sm">
                    <code className="text-brand-cyan font-mono whitespace-nowrap flex-shrink-0 pt-0.5 text-xs">
                      {opt.flag}
                    </code>
                    <span className="text-text-secondary">{opt.desc}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-sm font-semibold mb-3">Payment currencies</p>
                <div className="flex gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-brand-cyan/15 text-brand-cyan text-xs font-mono">USDC</span>
                  <span className="px-3 py-1 rounded-full bg-brand-purple/15 text-brand-purple-light text-xs font-mono">TFIL</span>
                  <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-mono">FREE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Install flow */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-purple-light mb-3">
              Installation
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How installation works</h2>
            <p className="text-text-secondary max-w-2xl">
              Whether a skill is free or paid, the install flow is the same command. Payment is handled in the browser, then the CLI resumes automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "1", title: "Fetch metadata", body: "CLI calls the API to get skill version, price, storage type, and CID." },
              { n: "2", title: "Payment (if paid)", body: "CLI opens localhost:7402. Connect MetaMask and approve — USDC on Base Sepolia or TFIL on Filecoin." },
              { n: "3", title: "Download", body: "CLI fetches the file from Filecoin/IPFS, trying ipfs.io → w3s.link → cloudflare-ipfs.com." },
              { n: "4", title: "Install", body: "File is saved to ~/.skillcoin/skills/<name>/ with a manifest.json tracking the CID and version." },
            ].map((s) => (
              <div key={s.n} className="glass rounded-2xl p-6">
                <div className="w-9 h-9 rounded-xl bg-brand-purple/15 flex items-center justify-center mb-4">
                  <span className="text-brand-purple-light font-bold text-sm">{s.n}</span>
                </div>
                <p className="font-semibold mb-2">{s.title}</p>
                <p className="text-sm text-text-secondary leading-6">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 glass rounded-2xl p-6">
            <p className="text-sm font-semibold mb-3 text-text-secondary">Installed skill structure:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-sm">
              {[
                "~/.skillcoin/config.json",
                "~/.skillcoin/skills/<name>/<name>.md",
                "~/.skillcoin/skills/<name>/manifest.json",
              ].map((f) => (
                <div key={f} className="bg-black/40 rounded-xl px-4 py-3 text-brand-cyan text-xs break-all">
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan mb-3">
                Verification
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Every skill is verifiable on-chain
              </h2>
              <p className="text-text-secondary leading-8 mb-4">
                Skills stored on Filecoin include daily <strong className="text-white">PDP (Provable Data Possession)</strong> proofs — cryptographic evidence that your file still exists exactly as published, not just a promise.
              </p>
              <p className="text-text-secondary leading-8 mb-6">
                The <code className="text-brand-cyan font-mono text-sm">SkillRegistry</code> smart contract on Filecoin FVM records every skill&apos;s name, CID, creator address, and price. Anyone can query it directly — no API needed.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">Filecoin PDP proofs updated daily per dataset</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">IPFS CIDs are content-addressed — tamper-evident by design</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">On-chain purchase records via SkillLicenseNFT (ERC-721)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {contracts.map((c) => (
                <div key={c.name} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-white/5">
                      chainId: {c.chainId}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">{c.network}</p>
                  <div className="bg-black/40 rounded-lg px-3 py-2 font-mono text-xs text-brand-cyan break-all mb-3">
                    {c.address}
                  </div>
                  <a
                    href={c.explorer}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-brand-cyan/70 hover:text-brand-cyan transition-colors"
                  >
                    View on explorer →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Project bundles */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-pink mb-3">
              Project Bundles
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              IDE-native context generation
            </h2>
            <p className="text-text-secondary max-w-3xl">
              <code className="text-brand-cyan font-mono text-sm">skillcoin project init</code> takes a project brief or PRD, asks clarifying questions, and generates a full context bundle ready for Cursor, Claude Code, Windsurf, or VS Code.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <div className="space-y-4">
              {[
                { step: "1", label: "Provide a brief", desc: 'Use --prompt "Build a SaaS dashboard" or pass a PRD markdown file.' },
                { step: "2", label: "Answer clarifications", desc: "Skillcoin asks up to 3 focused questions (configurable). Press Enter to accept defaults." },
                { step: "3", label: "Get your bundle", desc: "A full spec, plan, context notes, and IDE-specific rule files are generated in seconds." },
                { step: "4", label: "Open in your IDE", desc: "Cursor reads .cursor/rules/project.mdc. Claude Code reads CLAUDE.md. Start coding immediately." },
              ].map((s) => (
                <div key={s.step} className="glass rounded-2xl p-5 flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-pink/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-pink font-bold text-xs">{s.step}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">{s.label}</p>
                    <p className="text-sm text-text-secondary leading-6">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass rounded-3xl p-6">
              <p className="font-semibold mb-4 flex items-center gap-2 text-sm">
                <FolderTree className="w-4 h-4 text-brand-pink" />
                Generated files (standard mode)
              </p>
              <div className="space-y-2.5 font-mono text-xs">
                {[
                  { file: ".skillcoin/project-spec.json", note: "Structured spec" },
                  { file: ".skillcoin/context.md", note: "Architecture notes" },
                  { file: ".skillcoin/project-plan.md", note: "Implementation plan" },
                  { file: ".cursor/rules/project.mdc", note: "Cursor rules" },
                  { file: ".claude/commands/*.md", note: "Claude commands" },
                  { file: "CLAUDE.md", note: "Claude Code entry point" },
                ].map((f) => (
                  <div key={f.file} className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2.5">
                    <span className="text-brand-cyan">{f.file}</span>
                    <span className="text-text-muted text-xs ml-2 whitespace-nowrap">{f.note}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-white/5">
                <p className="text-sm font-semibold mb-3">Supported IDEs</p>
                <div className="flex flex-wrap gap-2">
                  {["cursor", "claude-code", "windsurf", "vscode"].map((ide) => (
                    <span key={ide} className="px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-xs font-mono">
                      {ide}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Scope */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan mb-3">
              Roadmap
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What&apos;s coming</h2>
            <p className="text-text-secondary max-w-2xl">
              Skillcoin is early, but the foundation is solid. Here is what is being built next.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {futureFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-brand-cyan" />
                    </div>
                    <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-white/5">
                      {f.timeline}
                    </span>
                  </div>
                  <p className="font-semibold mb-2">{f.title}</p>
                  <p className="text-sm text-text-secondary leading-6">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to publish your first skill?</h2>
            <p className="text-text-secondary max-w-xl mx-auto mb-8">
              Install the CLI, write a SKILL.md, and share it with every AI developer on the planet — stored permanently with cryptographic proof.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                Publish a Skill
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/explore" className="btn-secondary inline-flex items-center gap-2">
                Browse Marketplace
              </Link>
            </div>
            <div className="mt-8 bg-black/40 rounded-xl px-6 py-4 inline-block font-mono text-sm text-brand-cyan">
              npm install -g skillcoin
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
