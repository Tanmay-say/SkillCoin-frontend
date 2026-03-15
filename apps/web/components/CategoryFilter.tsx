"use client";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "coding", label: "Coding" },
  { value: "marketing", label: "Marketing" },
  { value: "research", label: "Research" },
  { value: "devops", label: "DevOps" },
  { value: "writing", label: "Writing" },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            selected === cat.value
              ? "bg-brand-purple text-white shadow-glow"
              : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
