import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "surface" | "outline" | "lightBackground";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
}) => {
  const variants = {
    primary:
      "bg-[#014489]/40 border border-[#00AEEF]/50 text-[#67e8f9]",
    secondary:
      "bg-[var(--accent-quiet)] border border-[var(--border)] text-[var(--on-accent-quiet)]",
    accent:
      "bg-[var(--accent-quiet)] border border-[var(--border)] text-[var(--on-accent-quiet)]",
    surface:
      "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]",
    outline:
      "bg-transparent border border-[var(--border)] text-[var(--text)]",
    lightBackground:
      "bg-[#0284c7]/15 border border-[#0284c7]/40 text-[oklch(0.40_0.10_235)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
