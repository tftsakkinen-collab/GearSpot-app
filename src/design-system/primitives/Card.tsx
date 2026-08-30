import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  variant?: "default" | "glass" | "surface";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hoverable = true,
  variant = "default",
}) => {
  const bgClass = variant === "glass" ? "glass" : "bg-[var(--surface)]";
  return (
    <div
      className={`${bgClass} text-[var(--text)] border border-[var(--border)] rounded-[var(--radius)] p-6 transition-all duration-200 ${
        hoverable ? "hover:border-[var(--primary)] hover:shadow-lg hover:-translate-y-0.5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
