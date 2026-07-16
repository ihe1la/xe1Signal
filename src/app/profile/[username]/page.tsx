import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileView } from "@/components/profile-view";
import { calculateSignalStrength } from "@/lib/user-metrics";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [{ username }, session] = await Promise.all([params, auth()]);
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      followers: session?.user?.id ? { where: { followerId: session.user.id }, select: { id: true } } : false,
      _count: {
        select: {
          signals: { where: { isDeleted: false, isArchived: false } },
          frequencies: { where: { isArchived: false } },
          followers: true,
          following: true,
        },
      },
    },
  });
  if (!user) notFound();
  return <ProfileView currentUsername={session?.user?.username} user={{
    id: user.id,
    username: user.username,
    name: user.displayName || user.name || user.username,
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${user.username}&backgroundColor=111116`,
    bannerUrl: user.bannerUrl,
    strength: calculateSignalStrength(user._count.signals, user._count.frequencies),
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing: Array.isArray(user.followers) && user.followers.length > 0,
  }} />;
}
