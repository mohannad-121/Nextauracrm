import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Plus, Sparkles, Users, BriefcaseBusiness } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewRequest: () => void;
  onOpenAssistant: () => void;
};

export function CommandMenu({ open, onOpenChange, onNewRequest, onOpenAssistant }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  function go(to: "/dashboard" | "/requests" | "/careers") {
    onOpenChange(false);
    navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search actions and pages…" />
      <CommandList>
        <CommandEmpty>No matching action.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/requests")}>
            <Users />
            Client requests
          </CommandItem>
          <CommandItem onSelect={() => go("/careers")}>
            <BriefcaseBusiness />
            Career portal
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Create & assist">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onNewRequest();
            }}
          >
            <Plus />
            New request<CommandShortcut>Shift A R</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onOpenAssistant();
            }}
          >
            <Sparkles />
            Ask AI assistant
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
