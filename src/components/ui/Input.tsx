"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[var(--radius-md)] border bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors",
        "placeholder:text-[var(--color-text-tertiary)]",
        error
          ? "border-[var(--color-error-500)] focus:border-[var(--color-error-500)]"
          : "border-[var(--color-border-default)] hover:border-[var(--color-gray-300)] focus:border-[var(--color-primary-600)]",
        "disabled:bg-[var(--color-gray-100)] disabled:text-[var(--color-text-tertiary)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
