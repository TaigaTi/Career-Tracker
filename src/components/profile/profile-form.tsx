"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Check } from "lucide-react";
import type { Profile } from "@/lib/types";
import { updateProfile } from "@/lib/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const BIO_MAX = 2000;

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const [fullName, setFullName] = React.useState(profile.full_name ?? "");
  const [headline, setHeadline] = React.useState(profile.headline ?? "");
  const [role, setRole] = React.useState(profile.role ?? "");
  const [company, setCompany] = React.useState(profile.company ?? "");
  const [location, setLocation] = React.useState(profile.location ?? "");
  const [bio, setBio] = React.useState(profile.bio ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("full_name", fullName);
    formData.set("headline", headline);
    formData.set("role", role);
    formData.set("company", company);
    formData.set("location", location);
    formData.set("bio", bio);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {saved && !error && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-success"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Profile saved.</span>
        </div>
      )}

      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
          maxLength={120}
        />
      </div>

      <div>
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          name="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Senior Frontend Engineer building delightful tools"
          maxLength={140}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          A one-line summary that sits under your name.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="role">Role / title</Label>
          <Input
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer"
            autoComplete="organization-title"
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            autoComplete="organization"
            maxLength={120}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Bridgetown, Barbados"
          autoComplete="address-level2"
          maxLength={120}
        />
      </div>

      <div>
        <Label htmlFor="bio">About</Label>
        <Textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          placeholder="What you focus on, what you're proud of, where you're headed next."
          rows={5}
        />
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
