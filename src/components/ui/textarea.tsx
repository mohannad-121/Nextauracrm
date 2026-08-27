import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <span className={cn("crm-uiverse-field", className)}>
        <span className="crm-uiverse-field__layer crm-uiverse-field__glow" aria-hidden="true" />
        <span
          className="crm-uiverse-field__layer crm-uiverse-field__dark-border"
          aria-hidden="true"
        />
        <span className="crm-uiverse-field__layer crm-uiverse-field__white" aria-hidden="true" />
        <span className="crm-uiverse-field__layer crm-uiverse-field__border" aria-hidden="true" />
        <textarea
          className={cn(
            "crm-uiverse-field__control flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          {...props}
        />
      </span>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
