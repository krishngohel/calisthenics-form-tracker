/**
 * Research-backed coaching cues for calisthenics skills.
 *
 * Applied at runtime via pose geometry (angles, landmark positions) —
 * no user training data, no custom ML models, no dataset collection.
 *
 * Sources: BULLBAR, SensAI, Calisthenics Corner, BERG Movement,
 * Calisthenics Association, Odin Fitness, GMB, Calisteniapp.
 */
export const CUES = {
  basics: {
    deadHang: "Hang with straight arms, shoulders away from ears",
    scapPull: "Depress shoulders without bending elbows",
    plank: "Straight line from head to heels",
  },
  pullUps: {
    chinHeight: "Chest to bar — don't crane your neck",
    elbowFlex: "Drive elbows down and slightly forward",
    scapInit: "Depress shoulders before bending elbows",
    hollow: "Ribs stacked over pelvis, hollow body",
    noKip: "Strict reps — no kip or swing",
    controlledDescent: "Lower with control — 2–3 second descent",
  },
  chinUps: {
    topHold: "Hold chin above bar with packed shoulders",
    noKip: "Control momentum — no kipping",
    scapInit: "Initiate with scapular depression, not a shrug",
  },
  dips: {
    position: "Elbows stacked over wrists",
    bottomDepth: "Reach ~90° at the bottom",
    topLockout: "Lock arms fully at the top",
  },
  pushUps: {
    position: "Straight plank line, elbows over wrists",
    bottomDepth: "Chest depth — ~90° elbow bend",
    topLockout: "Full lockout at the top",
  },
  muscleUp: {
    transition: "Hold controlled transition over the bar",
    noKip: "Avoid excessive kip through transition",
  },
  lSit: {
    hipHeight: "Press hips above wrists",
    legExtension: "Legs parallel to floor, knees locked",
    scapDepression: "Push the floor away — shoulders down",
    posteriorTilt: "Tuck tailbone, slight posterior pelvic tilt",
  },
  frogStand: {
    kneeStack: "Rest knees on upper arms",
    stability: "Spread fingers, minimize sway",
  },
  crowPose: {
    kneeStack: "Stack knees high on upper arms",
    arms: "Press through hands, gaze forward",
  },
  handstand: {
    inverted: "Push the floor away — stack over hands",
    bodyLine: "Ribs down, hollow line shoulder–hip–ankle",
    noBanana: "Squeeze glutes — no banana back",
    gaze: "Look between your thumbs",
  },
  oneArmHandstand: {
    inverted: "Hold inversion over support hand",
    handOff: "Lift free hand — stack over support arm",
    bodyLine: "Straight hollow line over support hand",
  },
  skinTheCat: {
    arc: "Hold through the rotation phase",
    control: "Move slowly through range",
  },
  frontLever: {
    horizontal: "Body parallel to ground",
    straight: "Depress scapulae, straight line toes to shoulders",
    glutes: "Squeeze glutes and quads — no pike or arch",
  },
  planche: {
    horizontal: "Keep body level — hollow line",
    lean: "Lean shoulders past wrists with protraction",
    elbows: "Lock elbows — push the floor away",
    noPike: "Don't pike hips — stay in one rigid line",
  },
  plancheLean: {
    lean: "Protract and lean shoulders past your wrists",
    elbows: "Lock elbows — push the floor away",
    line: "Keep a straight line from head to heels",
  },
  pseudoPlanche: {
    lean: "Maintain forward lean through the whole rep",
    bottomDepth: "Lower with lean — chest toward floor",
    topLockout: "Lock out at the top without losing lean",
    line: "Stay hollow — no sagging hips",
  },
  tuckPlanche: {
    horizontal: "Lift hips to horizontal with knees tucked",
    lean: "Shoulders well forward of wrists",
    tuck: "Pull knees tight to chest",
    elbows: "Fully lock the elbows",
  },
  advTuckPlanche: {
    horizontal: "Hips level — open the tuck slightly",
    lean: "Strong protraction and forward lean",
    tuck: "Extend hips while keeping knees bent",
    elbows: "Lock elbows and push the floor",
  },
  straddlePlanche: {
    horizontal: "Body parallel to floor in straddle",
    lean: "Shoulders forward — full protraction",
    straddle: "Spread legs wide for counterbalance",
    elbows: "Locked elbows, active shoulders",
  },
  hspu90: {
    inverted: "Stack hips over shoulders in the hold",
    elbow90: "Hold elbows at 90° — no collapsing",
    bodyLine: "Hollow line — ribs down, glutes tight",
  },
  hspu: {
    inverted: "Stay inverted through the ROM hold",
    bottomDepth: "Touch head lightly — control the bottom",
    topLockout: "Full lockout at the top",
    bodyLine: "Stack shoulder–hip–ankle in line",
  },
  pistolSquats: {
    depth: "Bottom of pistol — support heel down",
    upright: "Chest up, ribs stacked over pelvis",
  },
  nordicCurls: {
    lowering: "Controlled lowering — hips stay open",
    hips: "Keep hips extended, no break at the waist",
  },
  generic: {
    visibility: "Move so your full body stays in frame",
  },
} as const;
