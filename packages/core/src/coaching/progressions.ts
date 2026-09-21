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
  "knee-push-ups": [
    { id: "incline_pushups", name: "Incline Push-Ups", description: "Hands on a bench, full range", sets: 3, reps: 10 },
    { id: "knee_negatives", name: "Knee Push-Up Negatives", description: "4 s lowering from the knees", sets: 3, reps: 6 },
  ],
  "diamond-push-ups": [
    { id: "close_pushups", name: "Close-Grip Push-Ups", description: "Hands shoulder-width, elbows tucked", sets: 3, reps: 8 },
    { id: "eccentrics", name: "Diamond Negatives", description: "Slow lowering with hands together", sets: 3, reps: 5 },
  ],
  "archer-push-ups": [
    { id: "wide_pushups", name: "Wide Push-Ups", description: "Build the wide-hand base", sets: 3, reps: 10 },
    { id: "typewriter", name: "Typewriter Push-Ups", description: "Shift side to side at the bottom", sets: 3, reps: 6 },
  ],
  "pike-push-ups": [
    { id: "pike_hold", name: "Pike Hold", description: "Hips high, arms straight", targetHoldSec: 30, sets: 3 },
    { id: "pike_negatives", name: "Pike Negatives", description: "Slow lowering of the head", sets: 3, reps: 6 },
  ],
  "support-hold": [
    { id: "bench_support", name: "Bench Support", description: "Straight-arm support on a bench", targetHoldSec: 20, sets: 3 },
    { id: "scap_pushups", name: "Scapular Push-Ups", description: "Protract and depress in support", sets: 3, reps: 10 },
  ],
  "negative-pull-ups": [
    { id: "dead_hang", name: "Dead Hang", description: "Grip and shoulder base", targetHoldSec: 30, sets: 3 },
    { id: "band_assisted", name: "Band-Assisted Pull-Ups", description: "Full range with help", sets: 3, reps: 6 },
  ],
  "l-sit-pull-ups": [
    { id: "hanging_l", name: "Hanging L Hold", description: "Legs level from the bar", targetHoldSec: 15, sets: 3 },
    { id: "negatives", name: "Pull-Up Negatives", description: "Slow lowering", sets: 3, reps: 5 },
  ],
  "archer-pull-ups": [
    { id: "wide_pullups", name: "Wide Pull-Ups", description: "Build the wide base", sets: 3, reps: 6 },
    { id: "typewriter_pullups", name: "Typewriter Pull-Ups", description: "Shift across the bar at the top", sets: 3, reps: 4 },
  ],
  "one-arm-pull-ups": [
    { id: "archer", name: "Archer Pull-Ups", description: "Deep, slow, each side", sets: 4, reps: 4 },
    { id: "assisted_oap", name: "Assisted One-Arm", description: "Towel or band assist", sets: 4, reps: 3 },
    { id: "oap_negatives", name: "One-Arm Negatives", description: "8 s lowering", sets: 4, reps: 2 },
  ],
  "human-flag": [
    { id: "vertical_flag", name: "Vertical Flag", description: "Kick up to a vertical hold", targetHoldSec: 10, sets: 4 },
    { id: "tuck_flag", name: "Tuck Flag", description: "Knees tucked, hips level", targetHoldSec: 8, sets: 4 },
    { id: "flag_negatives", name: "Flag Negatives", description: "Lower slowly from vertical", sets: 4, reps: 3 },
  ],
  "tuck-front-lever": [
    { id: "hanging_knee", name: "Hanging Knee Raises", description: "Compression from the bar", sets: 3, reps: 10 },
    { id: "tuck_fl_negatives", name: "Tuck FL Negatives", description: "Lower slowly from inverted", sets: 4, reps: 4 },
  ],
  "advanced-tuck-front-lever": [
    { id: "tuck_fl", name: "Tuck Front Lever", description: "Solid 30 s tuck first", targetHoldSec: 30, sets: 4 },
    { id: "fl_rows", name: "Tuck FL Rows", description: "Row while holding the tuck", sets: 3, reps: 6 },
  ],
  "one-leg-front-lever": [
    { id: "adv_tuck", name: "Advanced Tuck", description: "Flat back, hips open", targetHoldSec: 20, sets: 4 },
    { id: "one_leg_negatives", name: "One-Leg Negatives", description: "Lower slowly with one leg out", sets: 4, reps: 3 },
  ],
  "straddle-front-lever": [
    { id: "one_leg_fl", name: "One-Leg Front Lever", description: "Both sides", targetHoldSec: 15, sets: 4 },
    { id: "straddle_fl_negatives", name: "Straddle Negatives", description: "Lower slowly in straddle", sets: 4, reps: 3 },
  ],
  "german-hang": [
    { id: "shoulder_ext", name: "Shoulder Extension Stretch", description: "Hands behind on a bench", targetHoldSec: 30, sets: 3 },
    { id: "assisted_german", name: "Assisted German Hang", description: "Feet lightly on the floor", targetHoldSec: 15, sets: 3 },
  ],
  "tuck-back-lever": [
    { id: "german", name: "German Hang", description: "Comfortable 15 s hang", targetHoldSec: 15, sets: 3 },
    { id: "skin_cat", name: "Skin the Cat", description: "Slow rotations", sets: 3, reps: 3 },
  ],
  "advanced-tuck-back-lever": [
    { id: "tuck_bl", name: "Tuck Back Lever", description: "Level tuck holds", targetHoldSec: 20, sets: 4 },
    { id: "adv_bl_drill", name: "Hip Extension Drills", description: "Open the hips slowly", sets: 4, reps: 5 },
  ],
  "straddle-back-lever": [
    { id: "adv_tuck_bl", name: "Advanced Tuck Back Lever", description: "Flat back holds", targetHoldSec: 15, sets: 4 },
    { id: "straddle_bl_negatives", name: "Straddle Negatives", description: "Lower slowly", sets: 4, reps: 3 },
  ],
  "back-lever": [
    { id: "straddle_bl", name: "Straddle Back Lever", description: "Solid straddle first", targetHoldSec: 10, sets: 4 },
    { id: "one_leg_bl", name: "One-Leg Back Lever", description: "One leg at a time", targetHoldSec: 8, sets: 4 },
  ],
  "hollow-body-hold": [
    { id: "dead_bug", name: "Dead Bug", description: "Lower back pressed down", sets: 3, reps: 10 },
    { id: "tuck_hollow", name: "Tuck Hollow", description: "Knees bent, shoulders up", targetHoldSec: 20, sets: 3 },
  ],
  "tuck-sit": [
    { id: "foot_support", name: "Foot-Supported Tuck", description: "One foot down at a time", targetHoldSec: 15, sets: 4 },
    { id: "support_hold_drill", name: "Support Hold", description: "Straight arms, feet down", targetHoldSec: 20, sets: 3 },
  ],
  "one-leg-l-sit": [
    { id: "tuck", name: "Tuck Sit", description: "Solid 30 s tuck", targetHoldSec: 30, sets: 4 },
    { id: "leg_extensions", name: "Seated Leg Lifts", description: "Straight-leg lifts from the floor", sets: 3, reps: 8 },
  ],
  "v-sit": [
    { id: "l_sit", name: "L-Sit", description: "Solid 30 s L first", targetHoldSec: 30, sets: 4 },
    { id: "compression", name: "Pike Compression", description: "Lift straight legs from a pike", sets: 3, reps: 10 },
  ],
  "hanging-knee-raises": [
    { id: "dead_hang", name: "Dead Hang", description: "Grip base", targetHoldSec: 30, sets: 3 },
    { id: "lying_knee", name: "Lying Knee Tucks", description: "Compression on the floor", sets: 3, reps: 12 },
  ],
  "hanging-leg-raises": [
    { id: "hanging_knee", name: "Hanging Knee Raises", description: "Knees past hips", sets: 3, reps: 10 },
    { id: "compression", name: "Pike Compression", description: "Straight-leg lifts", sets: 3, reps: 10 },
  ],
  "dragon-flag": [
    { id: "hollow", name: "Hollow Body Hold", description: "The shape of the flag", targetHoldSec: 30, sets: 3 },
    { id: "tuck_flag_drill", name: "Tuck Dragon Flag", description: "Knees bent, lower slowly", sets: 3, reps: 5 },
    { id: "flag_negatives", name: "Dragon Flag Negatives", description: "Straight body, slow lowering", sets: 3, reps: 4 },
  ],
  bridge: [
    { id: "glute_bridge", name: "Glute Bridge", description: "Hip extension base", targetHoldSec: 30, sets: 3 },
    { id: "wall_walks", name: "Wall Walks", description: "Walk the hands down the wall", sets: 3, reps: 4 },
  ],
  "glute-bridge": [
    { id: "hip_thrust", name: "Bodyweight Hip Thrusts", description: "Shoulders on a bench", sets: 3, reps: 12 },
  ],
  squats: [
    { id: "assisted_squat", name: "Assisted Squat", description: "Hold a post for balance", sets: 3, reps: 10 },
    { id: "deep_squat_hold", name: "Deep Squat Hold", description: "Heels down, chest up", targetHoldSec: 30, sets: 3 },
  ],
  "wall-sit": [
    { id: "partial_wall_sit", name: "Partial Wall Sit", description: "Above parallel", targetHoldSec: 30, sets: 3 },
  ],
  "bulgarian-split-squats": [
    { id: "split_squat", name: "Split Squat", description: "Both feet on the floor", sets: 3, reps: 10 },
  ],
  "single-leg-glute-bridge": [
    { id: "glute_bridge", name: "Glute Bridge", description: "Two-leg base", targetHoldSec: 30, sets: 3 },
  ],
  "elevated-pike-push-ups": [
    { id: "pike_pushups", name: "Pike Push-Ups", description: "Feet on the floor first", sets: 3, reps: 8 },
    { id: "wall_walks", name: "Wall Walks", description: "Walk up to a vertical line", sets: 3, reps: 4 },
  ],
  "deficit-handstand-push-ups": [
    { id: "hspu_wall", name: "Wall HSPU", description: "Full range on the flat floor first", sets: 4, reps: 5 },
    { id: "deficit_negatives", name: "Deficit Negatives", description: "5 s lowering past the hands", sets: 4, reps: 3 },
  ],
  "one-arm-push-ups": [
    { id: "archer", name: "Archer Push-Ups", description: "Deep, slow, each side", sets: 4, reps: 5 },
    { id: "oa_incline", name: "One-Arm Incline Push-Ups", description: "Hands on a bench", sets: 3, reps: 5 },
    { id: "oa_negatives", name: "One-Arm Negatives", description: "6 s lowering", sets: 3, reps: 3 },
  ],
  "l-dips": [
    { id: "l_sit", name: "L-Sit", description: "Legs level for 20 s", targetHoldSec: 20, sets: 3 },
    { id: "dip_negatives", name: "Dip Negatives", description: "Slow lowering", sets: 3, reps: 5 },
  ],
  "korean-dips": [
    { id: "german", name: "German Hang", description: "Shoulder extension mobility", targetHoldSec: 15, sets: 3 },
    { id: "korean_negatives", name: "Korean Dip Negatives", description: "Slow lowering with a band", sets: 3, reps: 4 },
  ],
  "elbow-lever": [
    { id: "elbow_lever_knees", name: "Knee Elbow Lever", description: "Knees on the floor, lean forward", targetHoldSec: 15, sets: 4 },
    { id: "elbow_lever_straddle", name: "Straddle Elbow Lever", description: "Lighter lever with legs wide", targetHoldSec: 10, sets: 4 },
  ],
  maltese: [
    { id: "band_maltese", name: "Band-Assisted Maltese", description: "Bands at the hips", targetHoldSec: 5, sets: 4 },
    { id: "wall_maltese", name: "Wall Maltese", description: "Feet on the wall, arms wide", targetHoldSec: 8, sets: 4 },
  ],
  "iron-cross": [
    { id: "cross_pulls", name: "Cross Pulls", description: "Band-assisted lowering into the cross", sets: 4, reps: 4 },
    { id: "cross_negatives", name: "Cross Negatives", description: "Slow lowering from support", sets: 4, reps: 3 },
  ],
  "tuck-flag": [
    { id: "vertical_flag", name: "Vertical Flag", description: "Kick up to vertical", targetHoldSec: 10, sets: 4 },
    { id: "flag_negatives", name: "Flag Negatives", description: "Lower slowly", sets: 4, reps: 3 },
  ],
  "straddle-flag": [
    { id: "tuck_flag_drill", name: "Tuck Flag", description: "Solid 10 s tuck", targetHoldSec: 10, sets: 4 },
    { id: "one_leg_flag", name: "One-Leg Flag", description: "Extend one leg at a time", targetHoldSec: 6, sets: 4 },
  ],
  "straddle-press": [
    { id: "straddle_l", name: "Straddle L-Sit", description: "Compression base", targetHoldSec: 20, sets: 3 },
    { id: "wall_press_ecc", name: "Wall Press Eccentrics", description: "Lower slowly from a wall handstand into a straddle", sets: 4, reps: 3 },
    { id: "elevated_press", name: "Elevated Straddle Press", description: "Hands on blocks", sets: 4, reps: 3 },
  ],
  "pike-press": [
    { id: "pike_compression", name: "Pike Compression", description: "Lift straight legs from a pike", sets: 3, reps: 10 },
    { id: "straddle_press_drill", name: "Straddle Presses", description: "Full straddle presses", sets: 4, reps: 3 },
    { id: "pike_negatives", name: "Pike Press Negatives", description: "Lower slowly with legs together", sets: 4, reps: 3 },
  ],
  "bent-arm-press": [
    { id: "headstand_tuck", name: "Tuck Headstand", description: "Hips over shoulders, feet off", targetHoldSec: 15, sets: 3 },
    { id: "pike_pushups", name: "Pike Push-Ups", description: "Shoulder pressing strength", sets: 3, reps: 8 },
    { id: "ba_press_negatives", name: "Bent-Arm Press Negatives", description: "Lower from a handstand into the tuck", sets: 4, reps: 3 },
  ],
  "tuck-planche-push-ups": [
    { id: "tuck_hold", name: "Tuck Planche", description: "Solid 20 s tuck first", targetHoldSec: 20, sets: 4 },
    { id: "pseudo_planche", name: "Pseudo Planche Push-Ups", description: "Deep lean", sets: 4, reps: 6 },
  ],
  "straddle-planche-push-ups": [
    { id: "straddle_open", name: "Straddle Planche", description: "Solid 10 s straddle", targetHoldSec: 10, sets: 4 },
    { id: "adv_tuck_pu", name: "Advanced Tuck Planche Push-Ups", description: "Full range", sets: 4, reps: 4 },
  ],
  "planche-push-ups": [
    { id: "full_planche", name: "Full Planche", description: "5 s clean holds", targetHoldSec: 5, sets: 5 },
    { id: "straddle_pu", name: "Straddle Planche Push-Ups", description: "Full range", sets: 4, reps: 3 },
  ],
  manna: [
    { id: "v_sit", name: "V-Sit", description: "150°+ V-sit", targetHoldSec: 10, sets: 4 },
    { id: "manna_rocks", name: "Manna Rocks", description: "Rock the hips up from a V-sit", sets: 4, reps: 5 },
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
  stacked: "wall_chest",
  hip_angle: "compression",
  knees_locked: "compression",
  elbow_bend: "scap_pulls",
  top_position: "negatives",
  transition: "transition",
  control: "high_pull",
  knee_stack: "knee_balance",
  stack: "knee_perch",
  arms: "crow_hold",
  single_leg: "split_squat",
  lowering: "eccentric_nordic",
  hips: "iso_hold",
  line: "shoulder_stack",
  position: "negatives",
  hands: "wide_pushups",
  pike: "pike_hold",
  hollow_body: "dead_bug",
  arch: "glute_bridge",
};
