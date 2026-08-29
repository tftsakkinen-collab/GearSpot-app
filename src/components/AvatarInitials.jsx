import React from 'react'

export function getInitials(name) {
  if (!name) return 'V'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AvatarInitials({ name, size = 28, className = '' }) {
  const initials = getInitials(name)
  
  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold shrink-0 select-none border border-[var(--border)] ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: 'var(--accent-quiet)',
        color: 'var(--on-accent-quiet)',
        fontSize: `${Math.round(size * 0.42)}px`,
        lineHeight: 1
      }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  )
}
