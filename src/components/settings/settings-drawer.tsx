import type { UserProfile } from "@/types";
import { SettingsForm } from "@/components/settings/settings-form";
import { SideDrawer } from "@/components/ui/side-drawer";

export function SettingsDrawer({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
}) {
  return (
    <SideDrawer
      open={open}
      title="Settings"
      description="Manage your Shelf profile and membership."
      onClose={onClose}
      side="left"
    >
      <SettingsForm profile={profile} />
    </SideDrawer>
  );
}
