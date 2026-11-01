import { motion } from 'framer-motion';

// Route change: 180ms fade + 6px rise — under the 250ms budget, and flattened by MotionConfig for reduced-motion users.
export function PageTransition({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
