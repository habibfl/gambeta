import { useState } from "react";
import { GLOSSARY } from "../lib/glossary";

// Mot souligné en pointillés qui affiche sa définition au survol
export default function Term({ id, children }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[id];
  if (!entry) return children;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="cursor-help border-b border-dotted border-current/50 font-inherit text-inherit"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        aria-describedby={`term-${id}`}
      >
        {children}
      </button>
      {open && (
        <span
          id={`term-${id}`}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 block w-64 -translate-x-1/2 rounded-lg border border-current/10 bg-[var(--gambeta-paper)] p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-[var(--gambeta-ink)] shadow-lg"
        >
          <span className="mb-1 block font-semibold">{entry.term}</span>
          {entry.short}
        </span>
      )}
    </span>
  );
}
