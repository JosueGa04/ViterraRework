import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";
import { ChevronsDown } from "lucide-react";
import {
  viterraHeroTopClusterClass,
  viterraHeroKickerClass,
  viterraHeroDividerClass,
  viterraHeroChevronRowClass,
} from "../config/heroLayout";
import { cn } from "./ui/utils";

type ViterraHeroTopClusterAnimatedProps = {
  kicker: ReactNode;
  itemVariants: Variants;
  reduceMotion: boolean;
};

/**
 * Kicker + línea + chevrones con entrada escalonada (solo páginas interiores; no usar en Inicio).
 */
export function ViterraHeroTopClusterAnimated({
  kicker,
  itemVariants,
  reduceMotion,
}: ViterraHeroTopClusterAnimatedProps) {
  return (
    <>
      <motion.p variants={itemVariants} className={cn(viterraHeroTopClusterClass, viterraHeroKickerClass)}>
        {kicker}
      </motion.p>
      <motion.span variants={itemVariants} className={viterraHeroDividerClass} aria-hidden />
      <motion.div variants={itemVariants} className={viterraHeroChevronRowClass} aria-hidden>
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{
            duration: 1.85,
            repeat: reduceMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <ChevronsDown className="h-8 w-8" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </>
  );
}
