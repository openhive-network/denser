'use client';

import type { ComponentProps } from 'react';
import { CircleSpinner as KitCircleSpinner } from 'react-spinners-kit';

type CircleSpinnerProps = ComponentProps<typeof KitCircleSpinner>;

// react-spinners-kit's spinners are function components that take their defaults from
// `defaultProps`, which React 19 ignores. Without `sizeUnit` the spinner's CSS sizes
// become e.g. `20undefined`, so it collapses to nothing and shifts the layout around it.
// These are the kit's own CircleSpinner defaults.
export const CircleSpinner = ({
  loading = true,
  size = 30,
  color = '#fff',
  sizeUnit = 'px'
}: CircleSpinnerProps) => (
  <KitCircleSpinner loading={loading} size={size} color={color} sizeUnit={sizeUnit} />
);
