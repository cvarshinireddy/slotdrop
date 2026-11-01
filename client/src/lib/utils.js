import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn-style helper: merge conditional classes and resolve Tailwind conflicts (later wins).
export const cn = (...inputs) => twMerge(clsx(inputs));
