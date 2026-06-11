import { CSSProperties } from 'react';

export interface CircleSpinnerProps {
  /** Diameter in pixels */
  size?: number;
  /** Ring color (any CSS color) */
  color?: string;
  /** When false, renders nothing — mirrors react-spinners-kit behaviour */
  loading?: boolean;
  className?: string;
}

/**
 * Lightweight drop-in replacement for react-spinners-kit's CircleSpinner.
 * Pure CSS ring (Tailwind `animate-spin`) — avoids pulling the ~221 kB
 * styled-components-based spinner barrel into the client bundle.
 */
export const CircleSpinner = ({ size = 30, color = 'currentColor', loading = true, className }: CircleSpinnerProps) => {
  if (!loading) return null;

  const borderWidth = Math.max(2, Math.round(size / 8));
  const style: CSSProperties = {
    width: size,
    height: size,
    borderWidth,
    borderStyle: 'solid',
    borderColor: color,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    boxSizing: 'border-box',
    display: 'inline-block'
  };

  return (
    <span
      role="status"
      aria-label="loading"
      data-testid="circle-spinner"
      className={['circle-spinner', 'animate-spin', className].filter(Boolean).join(' ')}
      style={style}
    />
  );
};

export default CircleSpinner;
