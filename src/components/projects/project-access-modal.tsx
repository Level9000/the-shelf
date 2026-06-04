"use client";

import { useMemo, useState, useTransition } from "react";
import { ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import type { AppUser, Project, ProjectMember } from "@/types";
import {
  inviteProjectMemberAction,
  revokeProjectMemberAction,
} from "@/lib/actions/project-actions";
import { Badge } from "@/components/ui/badge";
import { TapeButton } from "@/components/ui/tape-button";
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
  const [role, setRole] = useState<"author" | "contributor">("author");
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
          role,
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
                      {member.userId === currentUser.id ? "You" : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{member.role}</Badge>
                  {isOwner && member.role !== "owner" ? (
                    <TapeButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(member)}
                      disabled={isPending}
                    >
                      <UserMinus className="size-3.5" />
                      Remove
                    </TapeButton>
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
          <span className="font-semibold text-[var(--ink)]">Authors</span> can run chapter kickoffs, recaps, and story planning.{" "}
          <span className="font-semibold text-[var(--ink)]">Contributors</span> can create, move, and delete tasks only.
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
            <div className="flex gap-2">
              {(["author", "contributor"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-[1rem] px-3 py-2 text-sm font-medium ring-1 transition ${
                    role === r
                      ? "bg-[var(--accent-soft)] ring-[var(--accent)]/40 text-[var(--accent)]"
                      : "bg-white/60 ring-black/10 text-[var(--muted)] hover:bg-white"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs leading-5 text-[var(--muted)]">
              {role === "author"
                ? "Authors can run kickoffs, recaps, and chapter planning — full story authorship."
                : "Contributors can manage tasks (create, move, delete) but cannot run authorship sessions."}
            </p>
            <TapeButton
              variant="primary"
              size="sm"
              onClick={handleInvite}
              disabled={isPending || email.trim().length === 0}
            >
              <UserPlus className="size-4" />
              {isPending ? "Granting access..." : `Grant ${role} access`}
            </TapeButton>
            <p className="text-xs leading-5 text-[var(--muted)]">
              The user must already have an Authored By account.
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
        <TapeButton variant="secondary" size="sm" onClick={onClose}>
          Close
        </TapeButton>
      </div>
    </Modal>
  );
}
