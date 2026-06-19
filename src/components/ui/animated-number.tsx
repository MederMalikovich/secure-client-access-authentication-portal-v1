import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  /** Display string, e.g. "12 345" or "₸ 12 345,00" or "42". The first numeric run is animated. */
  value: string | number;
  duration?: number;
  className?: string;
  title?: string;
}

/**
 * Slot-machine style count-up. Parses the first numeric token in `value`
 * (supports spaces and commas as separators), animates it from 0 to target,
 * and reconstructs the original string preserving prefix/suffix/formatting.
 */
export function AnimatedNumber({ value, duration = 900, className, title }: AnimatedNumberProps) {
  const original = typeof value === 'number' ? String(value) : value;
  const [display, setDisplay] = useState(original);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Match first numeric run (incl. spaces/commas/dots between digits)
    const match = original.match(/-?[\d][\d\s.,]*/);
    if (!match) {
      setDisplay(original);
      return;
    }
    const numericStr = match[0];
    const start = match.index ?? 0;
    const end = start + numericStr.length;
    const prefix = original.slice(0, start);
    const suffix = original.slice(end);

    // Detect decimal separator: last '.' or ',' that is followed by 1-2 digits at end
    const decMatch = numericStr.match(/[.,](\d{1,2})$/);
    const decimals = decMatch ? decMatch[1].length : 0;
    const decimalSep = decMatch ? decMatch[0][0] : '';
    const thousandSep = numericStr.includes(' ') ? ' ' : '';

    // Plain numeric target
    const cleaned = decMatch
      ? numericStr.slice(0, -decMatch[0].length).replace(/[\s.,]/g, '') + '.' + decMatch[1]
      : numericStr.replace(/[\s.,]/g, '');
    const target = Number(cleaned);
    if (!isFinite(target)) {
      setDisplay(original);
      return;
    }

    const format = (n: number) => {
      const fixed = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
      const [intPart, decPart] = fixed.split('.');
      const grouped = thousandSep
        ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep)
        : intPart;
      return decPart ? `${grouped}${decimalSep}${decPart}` : grouped;
    };

    cancelAnimationFrame(rafRef.current ?? 0);
    startRef.current = null;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const current = target * eased;
      setDisplay(`${prefix}${format(current)}${suffix}`);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current ?? 0);
  }, [original, duration]);

  return (
    <span className={className} title={title ?? original}>
      {display}
    </span>
  );
}
