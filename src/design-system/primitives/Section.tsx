import React from "react";

interface SectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg" | "none";
}

export const Section: React.FC<SectionProps> = ({
  id,
  children,
  className = "",
  spacing,
}) => {
  const paddingClass = spacing === "sm" ? "py-8 md:py-12" : spacing === "none" ? "py-0" : "py-16 md:py-24";
  return (
    <section
      id={id}
      className={`${paddingClass} relative overflow-hidden bg-[var(--bg)] text-[var(--text)] border-b border-[var(--border)] ${className}`}
    >
      {children}
    </section>
  );
};

export default Section;
