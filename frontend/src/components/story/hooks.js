import { useEffect, useRef, useState } from "react";

// Vrai dès que l'élément entre à l'écran
export function useInView(options = { threshold: 0.25 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return [ref, inView];
}

// Largeur (et hauteur) courantes d'un élément, mises à jour au redimensionnement.
export function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

// Format français : 6.4 -> "6,4" ; signe optionnel (+6,4 / −6,4).
export function fr(value, digits = 1, signed = false) {
  const s = Math.abs(value).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (!signed) return value < 0 ? `−${s}` : s;
  return value > 0 ? `+${s}` : value < 0 ? `−${s}` : s;
}
