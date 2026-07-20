import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CareerProfile = Database["public"]["Tables"]["career_profiles"]["Row"];

type CareerProfileDialogProps = {
  open: boolean;
  profile: CareerProfile | null;
  onOpenChange: (open: boolean) => void;
};

type CareerProfileForm = {
  fullName: string;
  phone: string;
  identityNumber: string;
  field: string;
  links: string;
};

const EMPTY_FORM: CareerProfileForm = {
  fullName: "",
  phone: "",
  identityNumber: "",
  field: "",
  links: "",
};

function normalizeLinks(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((link) => link.trim())
        .filter(Boolean)
        .map((link) => (/^https?:\/\//i.test(link) ? link : `https://${link}`)),
    ),
  );
}

function linksAreValid(links: string[]): boolean {
  return links.every((link) => {
    try {
      const url = new URL(link);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

export function CareerProfileDialog({ open, profile, onOpenChange }: CareerProfileDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CareerProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(
      profile
        ? {
            fullName: profile.full_name,
            phone: profile.phone,
            identityNumber: profile.identity_number,
            field: profile.field,
            links: profile.links.join("\n"),
          }
        : EMPTY_FORM,
    );
  }, [open, profile]);

  function updateField(field: keyof CareerProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const links = normalizeLinks(form.links);
    if (!linksAreValid(links)) {
      toast.error("Enter one valid link per line.");
      return;
    }

    setSaving(true);
    const payload = {
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      identity_number: form.identityNumber.trim(),
      field: form.field.trim(),
      links,
    };

    let error;
    if (profile) {
      ({ error } = await supabase.from("career_profiles").update(payload).eq("id", profile.id));
    } else {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setSaving(false);
        toast.error("Your session expired. Please sign in again.");
        return;
      }

      ({ error } = await supabase
        .from("career_profiles")
        .insert({ ...payload, created_by: authData.user.id }));
    }

    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "A profile with this ID already exists." : error.message,
      );
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["career-profiles"] });
    toast.success(profile ? "Career profile updated." : "Career profile added.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{profile ? "Edit career profile" : "Add career profile"}</DialogTitle>
          <DialogDescription>
            Internal talent record. Nothing entered here is published as a job application.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="career-name">Name</Label>
              <Input
                id="career-name"
                required
                autoFocus
                autoComplete="off"
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="career-phone">Phone</Label>
              <Input
                id="career-phone"
                required
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="career-id">ID</Label>
              <Input
                id="career-id"
                required
                autoComplete="off"
                value={form.identityNumber}
                onChange={(event) => updateField("identityNumber", event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="career-field">Field</Label>
              <Input
                id="career-field"
                required
                placeholder="For example: UI/UX Design"
                value={form.field}
                onChange={(event) => updateField("field", event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="career-links">Links</Label>
              <Textarea
                id="career-links"
                rows={4}
                placeholder={"One link per line\nlinkedin.com/in/example\ngithub.com/example"}
                value={form.links}
                onChange={(event) => updateField("links", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Add LinkedIn, portfolio, GitHub, or any other useful profile links.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : profile ? "Save changes" : "Add profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
