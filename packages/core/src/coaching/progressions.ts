export interface ProgressionDrill {
  id: string;
  name: string;
  description: string;
  targetHoldSec?: number;
  sets?: number;
  reps?: number;
}

export const PROGRESSIONS: Record<string, ProgressionDrill[]> = {
  "dead-hang": [
    { id: "passive_hang", name: "Passive Hang", description: "Relax into the bar", targetHoldSec: 20, sets: 3 },
    { id: "grip_variation", name: "Grip Variations", description: "Overhand, mixed, wide", targetHoldSec: 15, sets: 3 },
  ],
  "scapular-pulls": [
    { id: "dead_hang", name: "Dead Hang", description: "Build hang endurance first", targetHoldSec: 30, sets: 3 },
    { id: "scap_eccentric", name: "Scap Eccentrics", description: "Slow shoulder depression", sets: 3, reps: 8 },
  ],
  "plank-hold": [
    { id: "incline_plank", name: "Incline Plank", description: "Hands elevated plank", targetHoldSec: 30, sets: 3 },
    { id: "knee_plank", name: "Knee Plank", description: "Short holds on knees", targetHoldSec: 20, sets: 4 },
  ],
  "pull-ups": [
    { id: "dead_hang", name: "Dead Hang", description: "Build grip and shoulder stability", targetHoldSec: 30, sets: 3 },
    { id: "scap_pulls", name: "Scapular Pulls", description: "Depress and retract before pulling", sets: 3, reps: 10 },
    { id: "negatives", name: "Slow Negatives", description: "5s lowering from top", sets: 3, reps: 5 },
    { id: "band_assisted", name: "Band-Assisted Pull-Ups", description: "Full ROM with assistance", sets: 4, reps: 6 },
  ],
  "chin-ups": [
    { id: "dead_hang", name: "Dead Hang", description: "Supinated grip hang", targetHoldSec: 25, sets: 3 },
    { id: "negatives", name: "Chin-Up Negatives", description: "Slow eccentric", sets: 3, reps: 5 },
    { id: "band_assisted", name: "Band Chin-Ups", description: "Assisted full ROM", sets: 4, reps: 6 },
  ],
  dips: [
    { id: "support_hold", name: "Support Hold", description: "Lockout hold on bars", targetHoldSec: 20, sets: 3 },
    { id: "bench_dips", name: "Bench Dips", description: "Build pushing strength", sets: 3, reps: 12 },
    { id: "negatives", name: "Dip Negatives", description: "Slow lowering", sets: 3, reps: 6 },
  ],
  "push-ups": [
    { id: "incline_pushups", name: "Incline Push-Ups", description: "Hands elevated, full ROM", sets: 3, reps: 10 },
    { id: "eccentrics", name: "Slow Eccentrics", description: "5s lowering each rep", sets: 3, reps: 6 },
    { id: "paused", name: "Paused Push-Ups", description: "Hold bottom 2s each rep", sets: 3, reps: 8 },
  ],
  "muscle-up": [
    { id: "high_pull", name: "High Pull Hold", description: "Hold chest-to-bar position", targetHoldSec: 5, sets: 5 },
    { id: "transition", name: "Transition Drills", description: "Band-assisted transition", sets: 4, reps: 4 },
    { id: "false_grip", name: "False Grip Hangs", description: "Build wrist strength", targetHoldSec: 15, sets: 3 },
  ],
  "l-sit": [
    { id: "foot_support", name: "Foot-Supported L-Sit", description: "Lift one foot at a time", targetHoldSec: 15, sets: 4 },
    { id: "tuck", name: "Tuck L-Sit", description: "Knees tucked, hips up", targetHoldSec: 20, sets: 4 },
    { id: "compression", name: "Compression Work", description: "Pike compression drills", sets: 3, reps: 10 },
  ],
  "frog-stand": [
    { id: "wrist_prep", name: "Wrist Prep", description: "Wrist circles and stretches", sets: 2, reps: 10 },
    { id: "knee_balance", name: "Knee-on-Arm Balance", description: "Rock back and forth", sets: 5, reps: 8 },
    { id: "frog_hold", name: "Frog Hold", description: "Short holds building to 15s", targetHoldSec: 15, sets: 5 },
  ],
  "crow-pose": [
    { id: "knee_perch", name: "Knee Perch", description: "Place knees on arms, feet down", sets: 5, reps: 8 },
    { id: "toe_lifts", name: "Toe Lifts", description: "Brief toe lift holds", targetHoldSec: 5, sets: 8 },
    { id: "crow_hold", name: "Crow Hold", description: "Build to 20s hold", targetHoldSec: 20, sets: 5 },
  ],
  handstand: [
    { id: "wall_chest", name: "Chest-to-Wall Hold", description: "Stack hips over shoulders", targetHoldSec: 45, sets: 4 },
    { id: "hollow", name: "Hollow Body Hold", description: "Ribs down, core tight", targetHoldSec: 30, sets: 3 },
    { id: "shoulder_shrugs", name: "Shoulder Shrugs", description: "Elevate and depress in HS", sets: 3, reps: 10 },
    { id: "heel_pull", name: "Heel Pulls Off Wall", description: "Balance away from wall", sets: 5, reps: 5 },
  ],
  "handstand-push-ups-90": [
    { id: "wall_hspu", name: "Wall HSPU Negatives", description: "Slow lowering to 90°", sets: 4, reps: 5 },
    { id: "box_hspu", name: "Elevated 90° Hold", description: "Feet on box, hold bottom", targetHoldSec: 10, sets: 5 },
    { id: "pike_pushup", name: "Pike Push-Ups", description: "Build overhead pressing angle", sets: 4, reps: 8 },
  ],
  "handstand-push-ups": [
    { id: "hspu_90", name: "90° HSPU Hold", description: "Master the bottom position first", targetHoldSec: 8, sets: 5 },
    { id: "partial_hspu", name: "Partial ROM HSPU", description: "3/4 range reps against wall", sets: 4, reps: 5 },
    { id: "hspu_negatives", name: "HSPU Negatives", description: "5s lowering, press up", sets: 4, reps: 4 },
  ],
  "one-arm-handstand": [
    { id: "straddle_assist", name: "Straddle Assist OAHS", description: "Wide straddle counterbalance", targetHoldSec: 10, sets: 5 },
    { id: "finger_lift", name: "Finger Lift Holds", description: "Reduce support hand contact", targetHoldSec: 8, sets: 6 },
    { id: "shoulder_stack", name: "Shoulder Stack Drills", description: "Align over support arm", sets: 4, reps: 8 },
  ],
  "skin-the-cat": [
    { id: "hang", name: "Dead Hang", description: "Shoulder engagement", targetHoldSec: 30, sets: 3 },
    { id: "partial_rotation", name: "Partial Rotations", description: "Small controlled arcs", sets: 4, reps: 4 },
    { id: "full_rotation", name: "Full Skin the Cat", description: "Slow full rotation", sets: 3, reps: 3 },
  ],
  "front-lever": [
    { id: "tuck_fl", name: "Tuck Front Lever", description: "Short tuck holds", targetHoldSec: 15, sets: 5 },
    { id: "adv_tuck", name: "Advanced Tuck", description: "Hips extended tuck", targetHoldSec: 12, sets: 5 },
    { id: "straddle_fl", name: "Straddle Front Lever", description: "Open straddle lever", targetHoldSec: 8, sets: 5 },
  ],
  "planche-lean": [
    { id: "plank", name: "Plank Hold", description: "Build straight-arm plank endurance", targetHoldSec: 45, sets: 3 },
    { id: "protraction", name: "Scapular Protraction", description: "Push shoulder blades apart in plank", sets: 3, reps: 12 },
    { id: "lean_drill", name: "Lean Drills", description: "Small forward leans, build to 20s", targetHoldSec: 20, sets: 5 },
  ],
  "pseudo-planche-push-ups": [
    { id: "planche_lean", name: "Planche Lean Hold", description: "Hold the lean before adding reps", targetHoldSec: 20, sets: 4 },
    { id: "pseudo_eccentric", name: "Pseudo Eccentrics", description: "Slow lowering with lean", sets: 4, reps: 6 },
    { id: "pseudo_paused", name: "Paused Pseudo Push-Ups", description: "Pause at bottom with lean", sets: 3, reps: 8 },
  ],
  "tuck-planche": [
    { id: "pseudo_planche", name: "Pseudo Planche Push-Ups", description: "Build lean pressing strength", sets: 4, reps: 8 },
    { id: "frog_stand", name: "Frog Stand", description: "Wrist and shoulder prep", targetHoldSec: 15, sets: 4 },
    { id: "tuck_hold", name: "Tuck Hold", description: "Short tuck planche holds", targetHoldSec: 8, sets: 6 },
  ],
  "advanced-tuck-planche": [
    { id: "tuck_planche", name: "Tuck Planche", description: "Solid tuck before opening hips", targetHoldSec: 10, sets: 5 },
    { id: "adv_tuck_drill", name: "Adv. Tuck Extensions", description: "Gradually open hip angle", sets: 5, reps: 5 },
  ],
  "straddle-planche": [
    { id: "adv_tuck_planche", name: "Advanced Tuck Planche", description: "Strong adv. tuck holds", targetHoldSec: 10, sets: 5 },
    { id: "straddle_open", name: "Straddle Open Drills", description: "Widen legs incrementally", targetHoldSec: 8, sets: 6 },
  ],
  planche: [
    { id: "straddle_planche", name: "Straddle Planche", description: "Hold straddle before closing legs", targetHoldSec: 8, sets: 5 },
    { id: "one_leg", name: "One-Leg Planche", description: "One leg extended at a time", targetHoldSec: 6, sets: 6 },
    { id: "full_planche", name: "Full Planche Holds", description: "Build to 10s full planche", targetHoldSec: 10, sets: 5 },
  ],
  "bosu-single-leg-squats": [
    { id: "split_squat", name: "Split Squat", description: "Build single-leg strength", sets: 3, reps: 10 },
    { id: "bosu_balance", name: "Bosu Balance Hold", description: "Single-leg stand on Bosu", targetHoldSec: 20, sets: 4 },
  ],
  "pistol-squats": [
    { id: "assisted_pistol", name: "Assisted Pistol", description: "Hold rail or band", sets: 3, reps: 6 },
    { id: "box_pistol", name: "Box Pistol", description: "Sit to box and stand", sets: 3, reps: 8 },
    { id: "negatives", name: "Pistol Negatives", description: "Slow lowering", sets: 3, reps: 5 },
  ],
  "shrimp-squats": [
    { id: "quad_stretch", name: "Quad Stretch Hold", description: "Rear foot grab hold", targetHoldSec: 30, sets: 3 },
    { id: "partial_shrimp", name: "Partial Shrimp", description: "Half range holds", sets: 4, reps: 6 },
  ],
  "dragon-squats": [
    { id: "crossed_lunge", name: "Crossed Rear Lunge", description: "Build hip mobility", sets: 3, reps: 8 },
    { id: "partial_dragon", name: "Partial Dragon", description: "Controlled partial depth", sets: 4, reps: 5 },
  ],
  "sissy-squats": [
    { id: "lean_hold", name: "Lean Hold", description: "Knees forward lean at wall", targetHoldSec: 20, sets: 4 },
    { id: "band_sissy", name: "Band-Assisted Sissy", description: "Assisted full range", sets: 3, reps: 8 },
  ],
  "nordic-curls": [
    { id: "eccentric_nordic", name: "Eccentric Nordics", description: "Slow lowering only", sets: 3, reps: 5 },
    { id: "band_assist", name: "Band-Assisted Nordics", description: "Full ROM with band", sets: 3, reps: 6 },
    { id: "iso_hold", name: "Isometric Hold", description: "Hold at mid-lowering", targetHoldSec: 10, sets: 5 },
  ],
};

export const METRIC_TO_DRILL: Record<string, string> = {
  chin_height: "negatives",
  hang_position: "dead_hang",
  active_scap: "scap_pulls",
  plank_line: "incline_plank",
  hollow: "hollow",
  scap_init: "scap_pulls",
  scap_depression: "scap_pulls",
  no_chicken_neck: "negatives",
  no_swing: "dead_hang",
  no_banana: "hollow",
  body_line: "hollow",
  hand_off: "finger_lift",
  inverted: "wall_chest",
  horizontal: "tuck_fl",
  hip_height: "tuck",
  depth: "negatives",
  stability: "frog_hold",
  balance: "bosu_balance",
  upright: "assisted_pistol",
  straight: "tuck_fl",
  lean: "planche_lean",
  elbows: "planche_lean",
  leg_extension: "straddle_open",
};
