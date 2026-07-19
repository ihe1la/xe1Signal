import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { ReflectionMapper } from "@/components/reflection-mapper";
import { canAccessReflectionMapper } from "@/lib/reflection-mapper";

export default async function ReflectionMapperPage() {
  const session = await auth();
  if (!canAccessReflectionMapper(process.env.ENABLE_TEST_LAB === "true", session?.user?.role)) notFound();
  return <ReflectionMapper />;
}
