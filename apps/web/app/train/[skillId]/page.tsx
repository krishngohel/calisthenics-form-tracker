import { SKILLS } from "@cft/core";
import { SkillTrainer } from "@/components/train/SkillTrainer";

/** Every skill route is pre-rendered so the app works as a static export (Capacitor). */
export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skillId: skill.id }));
}

export const dynamicParams = false;

export default function TrainSkillPage({ params }: { params: { skillId: string } }) {
  return <SkillTrainer skillId={params.skillId} />;
}
