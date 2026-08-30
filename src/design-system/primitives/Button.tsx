import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary:
      "bg-[var(--primary)] text-[var(--primary-ink)] hover:brightness-110 shadow-[0_0_20px_oklch(72%_0.13_230_/_0.3)]",
    secondary:
      "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface)]/80",
    outline:
      "bg-transparent text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary)]/10",
    ghost:
      "bg-transparent text-[var(--text)] hover:bg-[var(--surface)]/50",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 shadow-md",
  };

  const sizes = {
    sm: "min-h-[44px] px-4 py-2 text-xs rounded-lg gap-1.5",
    md: "min-h-[48px] px-6 py-3 text-sm rounded-xl gap-2",
    lg: "min-h-[52px] px-8 py-4 text-base rounded-2xl gap-2.5",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
