"use client";

import { useMemo, useState, useTransition } from "react";
import { Mail, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import type { AppUser, Project, ProjectMember } from "@/types";
import {
  inviteProjectMemberAction,
  revokeProjectMemberAction,
} from "@/lib/actions/project-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function ProjectAccessManager({
  project,
  currentUser,
  members,
  onUpdated,
}: {
  project: Project;
  currentUser: AppUser;
  members: ProjectMember[];
  onUpdated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUser.id === project.userId;
  const owner = useMemo(
    () => members.find((member) => member.role === "owner") ?? null,
    [members],
  );

  function initials(value: string) {
    const normalized = value.includes("@") ? value.split("@")[0] : value;
    const segments = normalized.split(/[.\s_-]+/).filter(Boolean);
    return segments
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("") || "?";
  }

  function memberName(member: ProjectMember) {
    return member.displayName?.trim() || member.email;
  }

  function handleInvite() {
    setError(null);
    startTransition(async () => {
      try {
        await inviteProjectMemberAction({
          projectId: project.id,
          email,
        });
        setEmail("");
        onUpdated();
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "Failed to grant project access.",
        );
      }
    });
  }

  function handleRevoke(member: ProjectMember) {
    setError(null);
    startTransition(async () => {
      try {
        await revokeProjectMemberAction({
          projectId: project.id,
          userId: member.userId,
        });
        onUpdated();
      } catch (revokeError) {
        setError(
          revokeError instanceof Error
            ? revokeError.message
            : "Failed to revoke access.",
        );
      }
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <Users className="size-4 text-[var(--accent)]" />
          People with access
        </div>
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-[1.4rem] bg-white/85 px-4 py-3 ring-1 ring-black/6"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                    {initials(memberName(member))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {memberName(member)}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {member.email}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      {member.userId === currentUser.id ? "You" : "Member"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{member.role}</Badge>
                  {isOwner && member.role !== "owner" ? (
                    <Button
                      variant="ghost"
                      className="h-9 px-3 py-0 text-xs"
                      onClick={() => handleRevoke(member)}
                      disabled={isPending}
                    >
                      <UserMinus className="mr-1.5 size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <ShieldCheck className="size-4 text-[var(--accent)]" />
          Access controls
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Everyone listed here can open the project, create chapters, add tasks,
          and work from the same backlog.
        </p>

        {owner ? (
          <div className="mt-4 rounded-[1.4rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
            Project owner: <span className="font-semibold text-[var(--ink)]">{memberName(owner)}</span>
          </div>
        ) : null}

        {isOwner ? (
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-[var(--ink)]">
              Invite by email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="coworker@company.com"
            />
            <Button
              onClick={handleInvite}
              disabled={isPending || email.trim().length === 0}
            >
              <UserPlus className="mr-2 size-4" />
              {isPending ? "Granting access..." : "Grant access"}
            </Button>
            <p className="text-xs leading-5 text-[var(--muted)]">
              The user must already have a Shelf account. This is a direct share, not an email invite flow.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.4rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
            Only the project owner can grant new access.
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

export function ProjectAccessModal({
  open,
  onClose,
  project,
  currentUser,
  members,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  currentUser: AppUser;
  members: ProjectMember[];
  onUpdated: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Project access for ${project.name}`}
      description="Share this project with another authenticated Shelf user by email."
      className="max-w-3xl"
    >
      <ProjectAccessManager
        project={project}
        currentUser={currentUser}
        members={members}
        onUpdated={onUpdated}
      />
      <div className="sticky bottom-0 mt-6 flex justify-center border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
        <Button variant="secondary" onClick={onClose}>
          <Mail className="mr-2 size-4" />
          Close
        </Button>
      </div>
    </Modal>
  );
}
