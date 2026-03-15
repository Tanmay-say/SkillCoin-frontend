"use client";

import CopyButton from "./CopyButton";
import { Terminal } from "lucide-react";

interface InstallCommandProps {
  name: string;
  className?: string;
}

export default function InstallCommand({ name, className = "" }: InstallCommandProps) {
  const command = `npx skillcoin install ${name}`;

  return (
    <div className={`code-block p-4 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <Terminal className="w-4 h-4 text-brand-cyan flex-shrink-0" />
        <code className="text-sm text-text-secondary">
          <span className="text-text-muted">$</span>{" "}
          <span className="text-brand-cyan">npx</span>{" "}
          <span className="text-white">skillcoin install</span>{" "}
          <span className="text-brand-purple-light">{name}</span>
        </code>
      </div>
      <CopyButton
        text={command}
        label=""
        className="text-text-muted hover:text-white ml-3 flex-shrink-0"
      />
    </div>
  );
}
