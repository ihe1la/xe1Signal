"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Camera,
  Check,
  ImageIcon,
  Loader2,
  Mail,
  Settings,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { SignalCard } from "@/components/signals/signal-card";
import { StrengthBars } from "@/components/layout/right-sidebar";
import { type DemoFrequency, type DemoSignal, type DemoUser } from "@/lib/demo-data";
export function ProfileView({
  user,
  currentUsername,
}: {
  user: DemoUser;
  currentUsername?: string;
}) {
  const own = user.username === currentUsername;
  const router = useRouter();
  const { update } = useSession();
  const [following, setFollowing] = React.useState(Boolean(user.isFollowing));
  const [followerCount, setFollowerCount] = React.useState(user.followerCount || 0);
  const [followingBusy, setFollowingBusy] = React.useState(false);
  const [tab, setTab] = React.useState("Signals");
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatarUrl);
  const [bannerUrl, setBannerUrl] = React.useState(user.bannerUrl);
  const [uploading, setUploading] = React.useState<"avatar" | "banner" | null>(
    null,
  );
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const [signals, setSignals] = React.useState<DemoSignal[]>([]);
  const [frequencies, setFrequencies] = React.useState<DemoFrequency[]>([]);
  const [recentTrail, setRecentTrail] = React.useState<{ id: string; title: string; nodeCount: number } | null>(null);

  React.useEffect(() => {
    setAvatarUrl(user.avatarUrl);
    setBannerUrl(user.bannerUrl);
  }, [user.avatarUrl, user.bannerUrl]);

  React.useEffect(() => {
    setFollowing(Boolean(user.isFollowing));
    setFollowerCount(user.followerCount || 0);
  }, [user.isFollowing, user.followerCount]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/signals?limit=50&authorId=${encodeURIComponent(user.id)}`).then((response) => response.ok ? response.json() : null),
      fetch("/api/frequencies?limit=50").then((response) => response.ok ? response.json() : null),
      own ? fetch("/api/sidebar").then((response) => response.ok ? response.json() : null) : Promise.resolve(null),
    ]).then(([signalData, frequencyData, sidebarData]) => {
      if (!active) return;
      if (Array.isArray(signalData?.signals)) setSignals(signalData.signals.map((signal: Omit<DemoSignal, "tags"> & { tags?: string | string[] }) => ({ ...signal, tags: Array.isArray(signal.tags) ? signal.tags : (signal.tags || "").split(",").filter(Boolean) })));
      if (Array.isArray(frequencyData?.frequencies)) setFrequencies(frequencyData.frequencies.filter((frequency: { owner: { username: string } }) => frequency.owner.username === user.username).map((frequency: Omit<DemoFrequency, "tags"> & { tags?: string | string[] }, index: number) => ({ ...frequency, tags: Array.isArray(frequency.tags) ? frequency.tags : (frequency.tags || "").split(",").filter(Boolean), color: ["#8f7be9", "#779bd6", "#d8ad68", "#b77c86"][index % 4] })));
      if (sidebarData?.recentTrail) setRecentTrail(sidebarData.recentTrail);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [own, user.id, user.username]);

  async function toggleFollow() {
    if (followingBusy) return;
    setFollowingBusy(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.username)}/follow`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Follow could not be updated");
      setFollowing(result.following);
      setFollowerCount(result.followerCount);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Follow could not be updated");
    } finally {
      setFollowingBusy(false);
    }
  }

  async function uploadProfileImage(kind: "avatar" | "banner", file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image");
      return;
    }
    const max = kind === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) {
      toast.error(
        `${kind === "avatar" ? "Profile picture" : "Background"} must be under ${max / 1024 / 1024}MB`,
      );
      return;
    }

    setUploading(kind);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/user/profile-image", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.error || "The image could not be saved");

      if (kind === "avatar") {
        setAvatarUrl(result.url);
        await update({ avatarUrl: result.url });
      } else {
        setBannerUrl(result.url);
      }
      router.refresh();
      toast.success(
        kind === "avatar"
          ? "Profile picture updated"
          : "Profile background updated",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The image could not be saved",
      );
    } finally {
      setUploading(null);
    }
  }

  async function handleImageChange(
    kind: "avatar" | "banner",
    input: HTMLInputElement,
  ) {
    const file = input.files?.[0];
    if (file) await uploadProfileImage(kind, file);
    input.value = "";
  }

  return (
    <AppLayout>
      <section className="mb-7 overflow-hidden rounded-xl border border-white/[.07] bg-white/[.015]">
        <div
          className="relative h-36 bg-cover bg-center bg-[radial-gradient(circle_at_72%_15%,rgba(128,105,221,.16),transparent_30%),linear-gradient(135deg,#101118,#090a0e)]"
          style={
            bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined
          }
        >
          {own && (
            <>
              <input
                ref={bannerInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                aria-label="Change profile background"
                className="sr-only"
                onChange={(event) =>
                  void handleImageChange("banner", event.currentTarget)
                }
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={Boolean(uploading)}
                className={`absolute right-4 top-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[9px] text-zinc-200 backdrop-blur ${uploading ? "pointer-events-none opacity-60" : ""}`}
              >
                {uploading === "banner" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                Change background
              </button>
            </>
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="relative -mt-12 w-fit">
            <img
              src={avatarUrl}
              alt={`${user.username}'s profile picture`}
              className="h-24 w-24 rounded-full border-4 border-[#0b0c10] bg-zinc-900 object-cover"
            />
            {own && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(event) =>
                    void handleImageChange("avatar", event.currentTarget)
                  }
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={Boolean(uploading)}
                  aria-label="Change profile picture"
                  className={`absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-white/15 bg-zinc-900 text-zinc-200 shadow-lg ${uploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
              </>
            )}
          </div>
          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-mono text-2xl text-zinc-100">
                {user.name}
              </h1>
              <p className="mt-1 font-mono text-[10px] text-zinc-600">@{user.username}</p>
              <p className="mt-3 max-w-xl font-mono text-[11px] leading-5 text-zinc-500">
                {user.bio}
              </p>
              <div className="mt-4 flex items-center gap-3 font-mono text-[9px] text-zinc-600">
                <StrengthBars value={user.strength} />
                <span>{user.strength} strength</span>
                <span>·</span>
                <span>{followerCount} followers</span>
                <span>·</span>
                <span>{user.followingCount || 0} following</span>
              </div>
            </div>
            {own ? (
              <Link
                href="/settings"
                className="flex h-10 items-center gap-2 rounded-lg border border-white/[.08] px-4 font-mono text-[10px] text-zinc-400"
              >
                <Settings className="h-3.5 w-3.5" />
                Edit profile
              </Link>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => void toggleFollow()}
                  disabled={followingBusy}
                  className="flex h-10 items-center gap-2 rounded-lg bg-violet-400/[.12] px-4 font-mono text-[10px] text-violet-300"
                >
                  {following ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {followingBusy ? "Updating..." : following ? "Following" : "Follow"}
                </button>
                <Link
                  href={`/inbox/${user.username}`}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/[.08]"
                >
                  <Mail className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
      <div className="mb-6 flex gap-6 border-b border-white/[.06]">
        {["Signals", "Frequencies", "Trails", "About"].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`border-b py-3 font-mono text-[10px] ${tab === item ? "border-violet-400 text-zinc-200" : "border-transparent text-zinc-600"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Signals" && (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {signals.map((item) => (
            <SignalCard key={item.id} signal={item} />
          ))}
        </div>
      )}
      {tab === "Frequencies" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {frequencies.map((f) => (
              <Link
                key={f.id}
                href={`/frequencies/${f.id}`}
                className="rounded-xl border border-white/[.07] p-5 font-mono text-xs text-zinc-300"
              >
                {f.name}
                <small className="mt-2 block text-zinc-600">
                  {f.signalCount} signals
                </small>
              </Link>
            ))}
        </div>
      )}
      {tab === "Trails" && own && (
        <Link
          href={recentTrail ? `/trails/${recentTrail.id}/edit` : "/trails/new/edit"}
          className="block rounded-xl border border-white/[.07] p-6 font-mono text-xs"
        >
          {recentTrail?.title || "Create your first trail"}
          <small className="mt-2 block text-zinc-600">{recentTrail ? `${recentTrail.nodeCount} connected nodes` : "Start connecting signals"}</small>
        </Link>
      )}
      {tab === "Trails" && !own && (
        <p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center font-mono text-[10px] text-zinc-600">
          Private trails are visible only to their owner.
        </p>
      )}
      {tab === "About" && (
        <p className="rounded-xl border border-white/[.07] p-6 font-mono text-xs leading-6 text-zinc-400">
          {user.bio}
          <br />
          <br />
          Joined the archive in 2024
        </p>
      )}
    </AppLayout>
  );
}
