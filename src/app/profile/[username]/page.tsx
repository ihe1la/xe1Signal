import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileView } from "@/components/profile-view";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [{ username }, session] = await Promise.all([params, auth()]);
  const user = await db.user.findUnique({ where: { username }, select: { id: true, username: true, name: true, bio: true, avatarUrl: true } });
  if (!user) notFound();
  return <ProfileView currentUsername={session?.user?.username} user={{ id: user.id, username: user.username, name: user.name || user.username, bio: user.bio || "", avatarUrl: user.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${user.username}&backgroundColor=111116`, strength: user.username === "hela" ? 76 : 58 }} />;
}
