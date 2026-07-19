import { notFound } from "next/navigation";
import { ScenarioLabHome } from "@/components/scenario-lab";
import { requireScenarioLab } from "@/lib/scenario-lab-server";
export default async function Page(){if(!await requireScenarioLab())notFound();return <ScenarioLabHome/>}
