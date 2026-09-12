"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Magnetic from "./Magnetic";
import { motion } from "framer-motion";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  magnetic?: boolean;
}

export default function Button({
  className,
  variant = "primary",
  size = "md",
  magnetic = true,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-full font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary: "bg-turquoise text-white hover:bg-[#0e8a9c] shadow-[0_0_15px_rgba(17,158,177,0.2)] hover:shadow-[0_0_25px_rgba(17,158,177,0.4)]",
    secondary: "bg-orange text-white hover:bg-[#d67b32] shadow-[0_0_15px_rgba(242,140,58,0.2)] hover:shadow-[0_0_25px_rgba(242,140,58,0.4)]",
    outline: "border-2 border-navy text-navy hover:bg-navy hover:text-white",
    ghost: "text-navy hover:bg-navy/5",
  };

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-8 text-base",
    lg: "h-14 px-10 text-lg",
  };

  const ButtonContent = (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );

  if (magnetic) {
    return <Magnetic strength={0.2}>{ButtonContent}</Magnetic>;
  }

  return ButtonContent;
}
