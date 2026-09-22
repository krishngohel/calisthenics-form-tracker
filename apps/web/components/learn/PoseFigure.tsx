import { SKELETON_CONNECTIONS, getTargetPose } from "@cft/core";

/** The target shape for a skill, drawn from its reference pose. Side-view poses show one side only. */
export function PoseFigure({ skillId, className = "" }: { skillId: string; className?: string }) {
  const pose = getTargetPose(skillId);
  if (!pose) return null;
  const pts = Object.entries(pose).filter(([, p]) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 4) return null;
  const xs = pts.map(([, p]) => p.x);
  const ys = pts.map(([, p]) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 0.2);
  const pad = span * 0.18;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const box = span + pad * 2;
  const vb = `${cx - box / 2} ${cy - box / 2} ${box} ${box}`;
  const stroke = box * 0.028;
  const head = pose.nose;
  return (
    <svg viewBox={vb} className={className} role="img" aria-label="Target position" preserveAspectRatio="xMidYMid meet">
      <g stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {SKELETON_CONNECTIONS.map(([a, b]) => {
          const pa = pose[a], pb = pose[b];
          if (!pa || !pb || a.startsWith("nose") || b === "nose") return null;
          return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
        })}
      </g>
      {head && <circle cx={head.x} cy={head.y} r={box * 0.05} fill="currentColor" />}
      <g fill="currentColor">
        {pts.filter(([k]) => k !== "nose").map(([k, p]) => <circle key={k} cx={p.x} cy={p.y} r={stroke * 0.9} />)}
      </g>
    </svg>
  );
}
