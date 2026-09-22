import { SKILLS } from "@cft/core";
import { SkillLesson } from "@/components/learn/SkillLesson";

/** Every lesson route is pre-rendered for the static export. */
export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skillId: skill.id }));
}

export const dynamicParams = false;

export default function LearnSkillPage({ params }: { params: { skillId: string } }) {
  return <SkillLesson skillId={params.skillId} />;
}
