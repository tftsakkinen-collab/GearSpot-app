import React from "react";

interface StatProps {
  label?: string;
  value?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  sublabel,
  icon,
  title,
  description,
  className = "",
}) => {
  const displayTitle = title || label;
  const displaySub = description || sublabel;
  return (
    <div className={`p-4 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-left ${className}`}>
      {icon && <div className="text-[var(--primary)] mb-2">{icon}</div>}
      {value && (
        <div className="text-2xl sm:text-3xl font-extrabold text-[var(--primary)] font-mono">
          {value}
        </div>
      )}
      {displayTitle && <div className="text-sm font-bold text-[var(--text)] mt-1">{displayTitle}</div>}
      {displaySub && (
        <div className="text-xs text-[var(--muted)] mt-0.5">{displaySub}</div>
      )}
    </div>
  );
};

export default Stat;
