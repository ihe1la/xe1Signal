import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PrivateProfilePage() {
  const session = await auth();
  if (!session?.user?.username) redirect("/login");
  redirect(`/profile/${session.user.username}`);
}
