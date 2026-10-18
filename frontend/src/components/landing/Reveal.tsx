import { motion } from "motion/react";
import type { ReactNode } from "react";

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function SectionHead({ eyebrow, title, sub }: { eyebrow?: string; title: ReactNode; sub?: string }) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-4 text-3xl font-bold leading-[1.3] tracking-tight sm:text-5xl">{title}</h2>
      {sub && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{sub}</p>}
    </Reveal>
  );
}
