import React from "react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`glass text-[var(--text)] p-6 rounded-[var(--radius)] transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
