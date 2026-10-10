'use client';

interface CircleSpinnerProps {
  loading?: boolean;
  size?: number;
  color?: string;
  sizeUnit?: string;
}

const BORDER_TO_SIZE_RATIO = 5;
const SPIN_DURATION = '0.75s';

// Same ring as react-spinners-kit's CircleSpinner, rendered directly: the kit's
// styled-components v6 wrapper forwards `sizeUnit` onto its <div>, which React
// reports as an unknown DOM prop.
export const CircleSpinner = ({
  loading = true,
  size = 30,
  color = '#fff',
  sizeUnit = 'px'
}: CircleSpinnerProps) => {
  if (!loading) return null;

  return (
    <div
      className="flex animate-spin items-center justify-center rounded-full border-solid"
      style={{
        width: `${size}${sizeUnit}`,
        height: `${size}${sizeUnit}`,
        borderWidth: `${size / BORDER_TO_SIZE_RATIO}${sizeUnit}`,
        borderColor: color,
        borderRightColor: 'transparent',
        animationDuration: SPIN_DURATION
      }}
    />
  );
};
