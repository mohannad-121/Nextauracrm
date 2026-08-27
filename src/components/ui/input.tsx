import * as React from "react";

import { cn } from "@/lib/utils";

const NATIVE_CONTROL_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "radio",
  "range",
  "reset",
  "submit",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const controlClassName = cn(
      "crm-uiverse-field__control flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className,
    );

    if (type && NATIVE_CONTROL_TYPES.has(type)) {
      return <input type={type} className={controlClassName} ref={ref} {...props} />;
    }

    return (
      <span className={cn("crm-uiverse-field", className)}>
        <span className="crm-uiverse-field__layer crm-uiverse-field__glow" aria-hidden="true" />
        <span
          className="crm-uiverse-field__layer crm-uiverse-field__dark-border"
          aria-hidden="true"
        />
        <span className="crm-uiverse-field__layer crm-uiverse-field__white" aria-hidden="true" />
        <span className="crm-uiverse-field__layer crm-uiverse-field__border" aria-hidden="true" />
        <input type={type} className={controlClassName} ref={ref} {...props} />
      </span>
    );
  },
);
Input.displayName = "Input";

export { Input };
