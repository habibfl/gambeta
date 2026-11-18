import { useInView } from "./hooks";

// Fait apparaître son contenu en douceur quand il arrive à l'écran.
export default function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
