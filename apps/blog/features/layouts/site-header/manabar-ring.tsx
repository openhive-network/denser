'use client';

interface ManabarRingProps {
  percentage: number;
  color: string;
  size: number;
  thickness: number;
  className?: string;
}

/**
 * CSS-based circular progress ring using conic-gradient.
 * Replaces recharts PieChart for better performance (~100KB savings).
 */
export function ManabarRing({ percentage, color, size, thickness, className = '' }: ManabarRingProps) {
  const angle = (percentage / 100) * 360;
  const innerSize = size - thickness * 2;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        border: '1px solid hsl(var(--border))',
        borderRadius: '50%',
        background: `conic-gradient(from 0deg, ${color} 0deg, ${color} ${angle}deg, transparent ${angle}deg, transparent 360deg)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          backgroundColor: 'var(--background)',
        }}
      />
    </div>
  );
}
