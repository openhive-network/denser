'use client';

import { useLayoutEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidComponentProps {
  children: string;
}
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  suppressErrorRendering: true
});
let idCounter = 0;
function generateUniqueId() {
  // eslint-disable-next-line no-plusplus
  return `mermaid-react-${idCounter++}`;
}
export default function MermaidComponent({ children }: MermaidComponentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(generateUniqueId());

  useLayoutEffect(() => {
    let active = true;
    mermaid
      .render(idRef.current, children)
      .then(({ svg }) => {
        if (active && ref.current) {
          ref.current.className = 'flex justify-center';
          ref.current.innerHTML = svg;
        }
      })
      .catch((err) => {
        if (active && ref.current) {
          ref.current.innerHTML = `<div class="p-4 border border-red-300 bg-red-50 text-red-700 rounded text-wrap"><strong>Mermaid Error:</strong>\n${String(
            err
          )}<div>`;
          console.error('Mermaid render error:', err);
        }
      });
    return () => {
      active = false;
    };
  }, [children]);

  return <div ref={ref} />;
}
