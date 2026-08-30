import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
  size,
}) => {
  const sizeClass = size === "full" ? "w-full max-w-none px-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full";
  return (
    <div className={`${sizeClass} ${className}`}>
      {children}
    </div>
  );
};

export default Container;
