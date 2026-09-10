import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Positions a fixed-position popover at (x, y) — typically a click point —
 * then nudges it back on-screen if its actual rendered size would push it
 * past the right or bottom edge of the viewport (e.g. a click near a
 * screen's edge, or a panel whose content grows after it opens).
 */
export function usePopoverPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    setPos({ left: x, top: y });
  }, [x, y]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clamp = () => {
      const margin = 8;
      const rect = el.getBoundingClientRect();
      setPos((prev) => {
        let left = prev.left;
        let top = prev.top;
        const overflowRight = rect.right - (window.innerWidth - margin);
        const overflowBottom = rect.bottom - (window.innerHeight - margin);
        if (overflowRight > 0) left -= overflowRight;
        if (overflowBottom > 0) top -= overflowBottom;
        left = Math.max(margin, left);
        top = Math.max(margin, top);
        if (left === prev.left && top === prev.top) return prev;
        return { left, top };
      });
    };

    // ResizeObserver fires once immediately with the element's current size,
    // so this also covers the initial placement — and keeps clamping if the
    // panel's own content later grows (e.g. a date-range control expanding).
    const observer = new ResizeObserver(clamp);
    observer.observe(el);
    return () => observer.disconnect();
  }, [x, y]);

  return { ref, style: { left: pos.left, top: pos.top } };
}
