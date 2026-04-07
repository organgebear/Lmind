"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary-600)] text-white border border-transparent hover:bg-[var(--color-primary-700)] shadow-[var(--shadow-xs)]",
        secondary:
          "bg-white text-[var(--color-gray-700)] border border-[rgba(16,24,40,0.14)] hover:bg-[var(--color-gray-50)] shadow-[var(--shadow-xs)]",
        ghost:
          "bg-transparent text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)]",
        destructive:
          "bg-[var(--color-error-500)] text-white border border-transparent hover:bg-[#d92d20]",
      },
      size: {
        sm: "h-7 px-2.5 text-xs rounded-[var(--radius-sm)]",
        md: "h-8 px-3 text-sm rounded-[var(--radius-md)]",
        lg: "h-9 px-4 text-sm rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
