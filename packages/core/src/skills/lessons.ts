/**
 * Teaching content for every skill: what it is, how to set it up, what to
 * feel, and the faults coaches see most. Written from the same sources as the
 * learning paths (Overcoming Gravity, GMB, r/bodyweightfitness RR, Cali Move,
 * BERG, Antranik, Handstand Factory).
 */
export type Equipment = "floor" | "bar" | "parallettes" | "rings" | "pole" | "wall";

export interface LessonFault {
  mistake: string;
  fix: string;
}

export interface Lesson {
  /** One sentence: what the skill is and why it is on the path. */
  summary: string;
  equipment: Equipment[];
  /** Getting into the position. */
  setup: string[];
  /** What to feel and keep while holding or moving. */
  cues: string[];
  /** Common faults and the correction. */
  faults: LessonFault[];
}

function L(summary: string, equipment: Equipment[], setup: string[], cues: string[], faults: [string, string][]): Lesson {
  return { summary, equipment, setup, cues, faults: faults.map(([mistake, fix]) => ({ mistake, fix })) };
}

const HOLLOW = "Ribs down, glutes on, lower back flat: a hollow body.";
const SHOULDERS_DOWN = "Shoulders away from the ears.";

export const LESSONS: Record<string, Lesson> = {
  // ---------- Push-ups
  "plank-hold": L(
    "The base position for every push: a straight body line held by the core, glutes and shoulders.",
    ["floor"],
    ["Hands under the shoulders, fingers spread, arms locked.", "Feet together or hip width, on the toes.", "Squeeze the glutes and tuck the pelvis until the lower back is flat."],
    ["Push the floor away so the upper back rounds slightly.", HOLLOW, "Look at the floor a hand's width in front of the fingers."],
    [["Hips sag", "Squeeze the glutes and pull the ribs down; shorten the hold before form breaks."], ["Hips piked up", "Lower the hips until shoulders, hips and ankles line up."], ["Shoulders shrugged", "Push the floor away and lengthen the neck."]]
  ),
  "knee-push-ups": L(
    "A shorter lever version of the push-up that teaches the full range of motion before the full plank load.",
    ["floor"],
    ["Kneel, then walk the hands out until the hips are open and the body is straight from knees to head.", "Hands slightly wider than the shoulders."],
    ["Elbows travel back at about 45°, not flared to the sides.", "Chest touches the floor first, not the hips or chin.", "Keep the hips open throughout."],
    [["Hips bend at the bottom", "Keep the glutes tight; treat the body as one plank from the knees."], ["Half reps", "Chest to the floor every rep, even if it means fewer reps."]]
  ),
  "push-ups": L(
    "The fundamental horizontal push: chest, triceps and shoulders under a plank.",
    ["floor"],
    ["Plank position, hands slightly wider than shoulders, fingers forward.", "Screw the hands into the floor so the elbow pits face forward."],
    ["Lower in one piece until the chest is just off the floor.", "Elbows about 45° from the torso.", "Lock out at the top and push the floor away."],
    [["Elbows flare to 90°", "Tuck them toward the ribs; think of bending the bar."], ["Head drops first", "Keep the neck neutral; chest leads."], ["Lower back arches", HOLLOW]]
  ),
  "diamond-push-ups": L(
    "Hands together under the chest: more triceps, and the bent-arm strength dips and HSPU need.",
    ["floor"],
    ["Index fingers and thumbs touch to make a diamond under the sternum.", "Plank line as usual."],
    ["Elbows stay close to the body.", "Chest touches the backs of the hands.", "Full lockout at the top."],
    [["Wrists hurt", "Turn the fingers slightly outward and warm the wrists first."], ["Hips lift to shorten the range", "Keep the plank; drop to knee diamonds if needed."]]
  ),
  "archer-push-ups": L(
    "One arm does most of the work while the other stays straight: the bridge to the one-arm push-up.",
    ["floor"],
    ["Hands about twice shoulder width, fingers pointing out.", "Lower toward one hand while the other arm straightens to the side."],
    ["The working elbow bends to 90° or less.", "The straight arm stays locked and only guides.", "Hips and shoulders stay square to the floor."],
    [["The straight arm bends", "Move the hands wider and slow the rep down."], ["Hips rotate toward the straight arm", "Brace the core and keep both hips the same height."]]
  ),
  "pseudo-planche-push-ups": L(
    "Push-ups with the hands by the hips and the shoulders in front of them. The bent-arm strength that feeds the planche.",
    ["floor", "parallettes"],
    ["Hands turned out beside the hips, arms locked.", "Lean forward until the shoulders are ahead of the wrists."],
    ["Keep the lean the whole rep; do not slide back at the bottom.", "Elbows brush the ribs.", "Protract at the top: push the floor away."],
    [["Lean disappears at the bottom", "Reduce the lean slightly and keep it constant."], ["Hips pike", "Squeeze the glutes; the body is a plank."]]
  ),
  "one-arm-push-ups": L(
    "A full push-up on one arm. The rest of the body works as a stable base.",
    ["floor"],
    ["Feet wide, working hand under the chest, free hand behind the back.", "Screw the hand into the floor and brace."],
    ["Lower with control; the elbow tracks back along the ribs.", "Hips stay square; the free shoulder does not drop.", "Push through the whole hand to lock out."],
    [["Torso twists", "Feet wider, core harder, or go back to archers."], ["Shoulder shrugs up", "Keep the shoulder packed down and away from the ear."]]
  ),
  maltese: L(
    "Body horizontal with the arms out at hip height. An elite ring hold that needs planche and cross strength.",
    ["rings", "floor"],
    ["From support, lean and lower the body until it is horizontal with the arms wide.", "Hands turned out; elbows locked."],
    ["Push down hard through straight arms; the biceps stay tight.", "Body straight from shoulders to toes.", "Chest and hips at the same height as the hands."],
    [["Elbows bend", "Reduce the range with bands or a wall until the arms stay locked."], ["Hips drop", "Keep the glutes and lower back tight; the body is one line."]]
  ),

  "pike-push-ups": L(
    "Push-ups from a pike with the hips high. The first vertical push, leading toward the handstand push-up.",
    ["floor"],
    ["Downward-dog shape: hands shoulder width, hips as high as possible, feet close to the hands.", "Look between the hands."],
    ["Lower the head to the floor in front of the hands, not between them.", "Elbows point forward at about 45°.", "Press back up to locked arms with the hips still high."],
    [["Hips drop into a plank", "Walk the feet closer; keep the hips over the shoulders."], ["Head lands between the hands", "Move the head forward so the forearms stay vertical."]]
  ),
  "elevated-pike-push-ups": L(
    "Pike push-ups with the feet on a box, so more weight sits on the shoulders. The last step before the wall.",
    ["floor"],
    ["Feet on a box or bench at hip height, hands on the floor, hips stacked over the shoulders.", "Torso as vertical as possible."],
    ["Head to the floor in front of the hands.", "Forearms vertical, elbows forward.", "Full lockout at the top; push tall."],
    [["Hips drift back over the box", "Walk the hands closer so the torso stays vertical."], ["Shrugged shoulders at the top", "Push the floor away and lengthen the neck."]]
  ),

  // ---------- Dips
  "support-hold": L(
    "Straight-arm support on top of the bars. Teaches the locked, depressed shoulder that dips and L-sits depend on.",
    ["parallettes", "rings"],
    ["Jump to the top of the bars with arms locked.", "Push down until the shoulders sink away from the ears."],
    [SHOULDERS_DOWN, "Elbows locked and turned slightly forward.", "Legs together, toes pointed, body still."],
    [["Shoulders creep up", "Push the bars down; a shrug means the support is not active."], ["Elbows soften", "Lock them out and turn the elbow pits forward."]]
  ),
  dips: L(
    "The vertical push. Full depth builds the chest, triceps and shoulders that HSPU and muscle-ups need.",
    ["parallettes", "rings"],
    ["Start from a locked support with the shoulders down.", "Lean the chest slightly forward and bend the elbows."],
    ["Lower until the shoulder is below the elbow.", "Elbows point back, not out.", "Press to a full lockout with the shoulders down."],
    [["Half depth", "Use negatives or a band to own the full range."], ["Shoulders roll forward at the bottom", "Keep the chest up and stop at the depth you can control."]]
  ),
  "l-dips": L(
    "Dips with the legs held in an L. Adds compression and forces an upright torso.",
    ["parallettes"],
    ["Support hold, then lift straight legs to horizontal.", "Point the toes and press the knees straight."],
    ["Legs stay level for the whole rep.", "Lower under control; the torso stays upright.", "Lock out fully at the top."],
    [["Legs drop as you lower", "Shorten the range until the L holds, then extend it."], ["Knees bend", "Lock the knees; a tuck L is the regression."]]
  ),
  "korean-dips": L(
    "Dips on a single bar behind the body. Trains shoulder extension strength and the back of the shoulder.",
    ["bar"],
    ["Sit on a bar, hands beside the hips, then slide off so the bar is behind you.", "Lean the chest forward slightly."],
    ["Lower until the elbows pass 90°, keeping the bar close to the back.", "Chest up; the hips lead slightly forward.", "Press to lockout and depress the shoulders."],
    [["Shoulders pinch", "Warm up shoulder extension with German hangs and reduce the depth."], ["Bar drifts away", "Keep the hips close to the bar."]]
  ),

  // ---------- Pull-ups
  "dead-hang": L(
    "A relaxed hang from the bar. Grip endurance, shoulder mobility and the start of every pull.",
    ["bar", "rings"],
    ["Hands shoulder width, full grip with the thumb around the bar.", "Let the body hang straight with the feet off the floor."],
    ["Arms fully straight.", "Body still; no swing.", "Breathe normally."],
    [["Swinging", "Point the toes and squeeze the legs together."], ["Bent elbows", "Relax the arms; this is a passive hang."]]
  ),
  "scapular-pulls": L(
    "From a dead hang, pull the shoulder blades down without bending the arms. The first inch of the pull-up.",
    ["bar"],
    ["Dead hang, arms locked.", "Pull the shoulders down and back so the body rises slightly."],
    ["Arms stay straight throughout.", "Feel the lats and lower traps do the work.", "Slow up, slow down."],
    [["Elbows bend", "Think of pushing the bar away with straight arms."], ["Chin tilts up", "Keep the neck neutral; the shoulders move, not the head."]]
  ),
  "negative-pull-ups": L(
    "Lower from the top of the bar as slowly as possible. Builds the strength for the first pull-up.",
    ["bar"],
    ["Jump or step to the top with the chin over the bar.", "Lower over 5 seconds to a full dead hang."],
    ["Control every inch; the hardest part is the last third.", "Shoulders down and back.", "Arms fully straight at the bottom."],
    [["Dropping the last third", "Slow the start so you have control at the end."], ["Kicking to help", "Legs still; use a box to reset."]]
  ),
  "pull-ups": L(
    "The vertical pull. Overhand grip, chest to bar, straight legs.",
    ["bar"],
    ["Dead hang, hands just wider than the shoulders.", "Scapular pull first, then drive the elbows down."],
    ["Chest toward the bar; the chin passes it as a result.", "Body straight, no kip.", "Lower all the way to a dead hang."],
    [["Kipping", "Slow the reps and squeeze the legs together."], ["Chin reaches the bar with a shrugged neck", "Pull the elbows down and back; think chest to bar."]]
  ),
  "chin-ups": L(
    "The underhand pull. More biceps, and the grip used for the front lever and muscle-up transition.",
    ["bar"],
    ["Dead hang with palms facing you, hands shoulder width.", "Scapular pull first."],
    ["Elbows drive down toward the ribs.", "Chest up at the top.", "Full hang at the bottom."],
    [["Half reps", "Full extension at the bottom every rep."], ["Swinging", "Point the toes and brace the core."]]
  ),
  "l-sit-pull-ups": L(
    "Pull-ups with the legs held in an L. Adds compression and removes any kip.",
    ["bar"],
    ["Dead hang, lift straight legs to horizontal.", "Pull with the legs fixed."],
    ["Legs stay level the whole rep.", "Toes pointed, knees locked.", "Chest to bar."],
    [["Legs drop on the way up", "Lower the rep count; the L is the point."], ["Knees bend", "Use a tuck L until compression improves."]]
  ),
  "archer-pull-ups": L(
    "Pull toward one hand while the other arm straightens along the bar. The bridge to the one-arm pull-up.",
    ["bar"],
    ["Wide grip.", "Pull the chin to one hand as the other arm goes straight."],
    ["The straight arm stays locked.", "Shoulders square to the bar.", "Alternate sides each rep."],
    [["Assisting arm bends", "Widen the grip and slow the rep."], ["Torso rotates", "Keep the hips still and the chest facing the bar."]]
  ),
  "muscle-up": L(
    "A pull-up that keeps going into a dip. The transition over the bar is the skill.",
    ["bar", "rings"],
    ["False grip on rings, or a deep overhand grip on the bar.", "Pull the bar to the lower chest, then rotate the wrists over."],
    ["Pull high and fast; the transition happens at the top of the pull.", "Lean forward over the bar, then press out.", "No kip for a strict rep."],
    [["Stuck at the transition", "Practise high pull-ups to the sternum and slow transition negatives."], ["One arm goes over first", "Strengthen the pull; both hands turn over together."]]
  ),
  "one-arm-pull-ups": L(
    "A full pull-up on one arm. Years of pulling strength condensed into one rep.",
    ["bar"],
    ["Hang from one hand, other hand free or holding the wrist.", "Pack the shoulder before pulling."],
    ["Pull the elbow to the hip.", "Body stays vertical; minimal twist.", "Lower slowly to a straight arm."],
    [["Body swings around", "Hold the working wrist with the free hand until the rotation is controlled."], ["Shoulder rides up", "Start every rep from a packed shoulder."]]
  ),

  // ---------- Handstand
  "frog-stand": L(
    "Knees resting on the bent arms, feet off the floor. First balance and wrist loading.",
    ["floor"],
    ["Squat, hands flat, elbows bent, knees resting on the upper arms.", "Lean forward until the feet float."],
    ["Look forward at the floor, not at the feet.", "Fingers grip the floor to balance.", "Lean as far as the wrists allow."],
    [["Falling backward", "Lean more; the shoulders go past the fingers."], ["Wrists hurt", "Warm up and shorten the sets."]]
  ),
  "crow-pose": L(
    "Frog stand with straighter arms and the hips higher. Balance and straight-arm loading.",
    ["floor"],
    ["Hands shoulder width, knees on the backs of the upper arms.", "Round the upper back and lift the hips."],
    ["Push the floor away.", "Elbows as straight as balance allows.", "Gaze slightly ahead of the fingers."],
    [["Elbows sit at 90°", "Lift the hips higher; the straighter the arms, the closer to a planche."], ["Head drops", "Keep the neck long and the eyes forward."]]
  ),
  "elbow-lever": L(
    "Body horizontal, balanced on bent arms with the elbows in the hips. A fun balance that builds the planche shape.",
    ["floor", "parallettes"],
    ["Hands turned out, elbows bent and tucked into the hip bones.", "Lean forward and lift the feet."],
    ["Elbows into the pelvis, not the belly.", "Head up and eyes forward.", "Body straight from shoulders to toes."],
    [["Feet will not leave the floor", "Lean the head further forward."], ["Elbows slip", "Turn the hands out more and set the elbows before leaning."]]
  ),
  handstand: L(
    "A straight line balanced on the hands. The base for presses, HSPU and one-arm work.",
    ["floor", "wall"],
    ["Chest to wall first: walk the feet up until the body is vertical.", "Free: lunge, kick up, and catch with the fingers."],
    ["Push tall through the shoulders; the ears sit between the arms.", HOLLOW, "Balance with the fingers, not the shoulders."],
    [["Banana back", "Ribs down, glutes on; practise chest-to-wall holds."], ["Shoulders closed", "Reach the shoulders open to 180°; stretch the lats."], ["Bent arms", "Lock the elbows before kicking up."]]
  ),
  "handstand-push-ups-90": L(
    "A handstand held with the elbows at 90°. The bottom-of-HSPU strength, isolated.",
    ["floor", "wall"],
    ["Wall handstand, then lower until the elbows reach 90°.", "Hold with the head just above the floor."],
    ["Elbows point forward, not out.", "Ribs down, body straight.", "Hold, then press to lockout."],
    [["Elbows flare", "Turn the elbows forward so the forearms stay vertical."], ["Arch increases as you lower", "Squeeze the glutes; lower only as far as the line holds."]]
  ),
  "handstand-push-ups": L(
    "Press from head at the floor to a locked handstand. The vertical push at full bodyweight.",
    ["floor", "wall"],
    ["Wall handstand, hands shoulder width.", "Lower with control until the head touches, then press."],
    ["Forearms vertical; elbows forward.", "Keep the hollow line.", "Full lockout at the top with the shoulders tall."],
    [["Head hits the floor hard", "Slow the lowering; use a pad and negatives."], ["Kipping with the legs", "Legs still; regress to elevated pike push-ups."]]
  ),
  "deficit-handstand-push-ups": L(
    "HSPU with the hands on blocks so the head travels below the hands. Full range for the shoulders.",
    ["parallettes", "wall"],
    ["Parallettes or blocks, wall handstand.", "Lower until the shoulders touch the hands."],
    ["Elbows forward.", "Control the bottom position; it is the hardest inch.", "Press to lockout."],
    [["Losing the line at the bottom", "Reduce the deficit until the hollow holds."], ["Bouncing out of the bottom", "Pause for a second at the bottom."]]
  ),
  "one-arm-handstand": L(
    "A handstand balanced on one hand. Years of two-arm balance, then a slow shift.",
    ["floor", "wall"],
    ["Perfect two-arm handstand.", "Shift the weight over one hand and lift the other slowly."],
    ["Push tall on the supporting shoulder.", "Legs straddle for balance at first.", "Hips stay stacked over the hand."],
    [["Hips swing out", "Shift less; balance on two hands with most of the weight on one."], ["Supporting shoulder collapses", "Push harder and lift the free hand only a finger's width."]]
  ),
  "bent-arm-press": L(
    "From a tucked headstand-like position, press with bent arms into a handstand. Strength, not balance.",
    ["floor"],
    ["Hands flat, elbows bent, knees tucked, hips over the shoulders.", "Lean forward so the weight is on the hands."],
    ["Stack the hips first, then extend the legs.", "Elbows forward, ribs down.", "Press to a locked handstand."],
    [["Hips behind the shoulders", "Lean further forward before pressing."], ["Legs kick to help", "Lift the feet with the hips; tuck tighter."]]
  ),
  "straddle-press": L(
    "Straight-arm press from a straddle stand into a handstand. The foundational press.",
    ["floor"],
    ["Wide straddle, hands flat on the floor in front of you.", "Lean the shoulders past the fingertips until the feet float."],
    ["Arms locked; shoulders lead the movement.", "Compress: the hips ride up over the shoulders.", "Bring the legs together only at the top."],
    [["Feet will not lift", "Lean more, or raise the hands on blocks."], ["Bending the arms", "Return to the lean and float only the feet."]]
  ),
  "pike-press": L(
    "Press from a pike, legs together, into a handstand. Demands more compression than the straddle.",
    ["floor"],
    ["Feet together, hands flat, hips high.", "Lean the shoulders forward and lift the feet."],
    ["Legs straight and together.", "Hips travel up over the hands.", "Arms stay locked throughout."],
    [["Knees bend", "Build compression with V-sits and pike pulses."], ["Hips stall behind the hands", "More lean; drill negatives from the handstand."]]
  ),

  // ---------- Front lever
  "tuck-front-lever": L(
    "Hang with the back level and the knees tucked. First front lever shape.",
    ["bar", "rings"],
    ["Dead hang, overhand grip.", "Pull the shoulders down and lift the knees to the chest while pulling the hips up."],
    ["Back flat and parallel to the floor.", "Arms locked, shoulders depressed.", "Look toward the feet, not the ceiling."],
    [["Hips below the shoulders", "Pull harder with straight arms; the back must be level."], ["Elbows bend", "Reduce the hold and lock the arms."]]
  ),
  "advanced-tuck-front-lever": L(
    "Tuck lever with the hips opened to 90°, back flat. Harder lever, same rules.",
    ["bar", "rings"],
    ["Tuck front lever.", "Open the hips until the thighs are vertical, keep the back flat."],
    ["Back stays flat; do not round the lower back.", "Arms straight.", "Shoulders down."],
    [["Rounded back", "Close the tuck slightly and flatten the spine."], ["Hips drop", "Pull the hips up with the lats."]]
  ),
  "one-leg-front-lever": L(
    "One leg extended, the other tucked. Adds lever length on one side at a time.",
    ["bar", "rings"],
    ["Advanced tuck front lever.", "Extend one leg straight; keep the other tucked."],
    ["Extended leg level with the hips.", "Hips square, back flat.", "Switch legs each set."],
    [["Extended leg hangs low", "Squeeze the glute and point the toe."], ["Hips rotate", "Keep both hips level."]]
  ),
  "straddle-front-lever": L(
    "Full lever with the legs wide. Shorter effective lever than the full.",
    ["bar", "rings"],
    ["From advanced tuck, extend both legs into a wide straddle.", "Hips and back level."],
    ["Legs straight, wide and level.", "Shoulders down, arms locked.", "Squeeze the glutes."],
    [["Piking at the hips", "Open the hips fully; the body is one line."], ["Arms bend", "Lock the elbows; shorten the hold."]]
  ),
  "front-lever": L(
    "Body horizontal, face up, hanging on straight arms. The pull-up family's static goal.",
    ["bar", "rings"],
    ["From a straddle lever, bring the legs together.", "Or lower from an inverted hang with control."],
    ["Straight line from hands to toes.", "Shoulders depressed and retracted.", "Hips through; glutes tight."],
    [["Hips sag", "Squeeze the glutes; regress to straddle."], ["Bent arms", "Lock out and shorten the hold."]]
  ),

  // ---------- Back lever
  "german-hang": L(
    "Hanging below the bar with the arms behind the body. Shoulder extension mobility and the back lever grip.",
    ["bar", "rings"],
    ["Hang, tuck, and rotate backward through the arms until the body hangs below.", "Let the arms extend behind the body."],
    ["Arms straight, shoulders relaxed into the stretch.", "Breathe.", "Exit by rotating back the way you came."],
    [["Rushing into depth", "Increase the depth over weeks; the shoulders adapt slowly."], ["Bent arms", "Straighten slowly; use the feet on the floor at first."]]
  ),
  "skin-the-cat": L(
    "A slow rotation through the German hang and back. Shoulder mobility with control.",
    ["bar", "rings"],
    ["Hang, tuck the knees, rotate backward through the arms.", "Lower into the German hang, then reverse."],
    ["Slow both directions.", "Straight arms.", "Keep the tuck tight."],
    [["Dropping into the hang", "Control the last part of the rotation."], ["Momentum to return", "Pull with the lats and keep the tuck."]]
  ),
  "tuck-back-lever": L(
    "Face-down hang with the knees tucked, arms behind the body, back level.",
    ["bar", "rings"],
    ["German hang, tuck the knees, pull the hips up until the back is level.", "Look forward."],
    ["Arms straight.", "Back flat and level.", "Shoulders active, not hanging in the joint."],
    [["Hanging in the shoulders", "Pull the shoulders back and lift the hips."], ["Elbows bend", "Rotate the hands so the elbow pits face out."]]
  ),
  "advanced-tuck-back-lever": L(
    "Tuck back lever with the hips opened to 90°.",
    ["bar", "rings"],
    ["Tuck back lever.", "Open the hips until the thighs point down, back flat."],
    ["Back flat, glutes on.", "Arms locked.", "Chest and hips level."],
    [["Rounded back", "Close the tuck slightly and flatten."], ["Drifting low", "Pull the shoulders back harder."]]
  ),
  "straddle-back-lever": L(
    "Back lever with the legs wide.",
    ["bar", "rings"],
    ["Advanced tuck back lever, then extend the legs wide.", "Keep the hips level."],
    ["Glutes tight, hips open.", "Straight arms.", "Body level with the floor."],
    [["Hips pike", "Open the hips; squeeze the glutes."], ["Arch in the lower back", "Ribs down, hollow body."]]
  ),
  "back-lever": L(
    "Body horizontal, face down, arms straight behind the body.",
    ["bar", "rings"],
    ["Straddle back lever, bring the legs together.", "Or lower from an inverted hang."],
    ["Straight line from head to toes.", "Glutes tight; no arch.", "Shoulders pulled back."],
    [["Arching to hold the height", "Squeeze the glutes; a slight pike is safer than an arch."], ["Bent elbows", "Lock the arms and shorten the hold."]]
  ),

  // ---------- Planche
  "planche-lean": L(
    "Plank with the shoulders pushed forward past the wrists. The straight-arm foundation.",
    ["floor", "parallettes"],
    ["Plank, hands turned out.", "Lean the shoulders forward while the arms stay locked."],
    ["Protract: push the floor away and round the upper back.", "Lean as far as the wrists allow.", "Body straight; glutes on."],
    [["Hips sag", "Squeeze the glutes and hold a shorter lean."], ["Arms bend", "Lock the elbows; the lean comes from the shoulders."]]
  ),
  "tuck-planche": L(
    "Feet off the floor, knees tucked, arms straight. First planche hold.",
    ["floor", "parallettes"],
    ["Crouch, hands beside the knees, arms locked.", "Lean forward until the feet float."],
    ["Push the floor away; upper back rounded.", "Arms locked.", "Hips level with the shoulders."],
    [["Hips below the shoulders", "Lean more and protract harder."], ["Elbows bend", "Return to the lean; the arms stay straight."]]
  ),
  "advanced-tuck-planche": L(
    "Tuck planche with a flat back and the hips open to 90°.",
    ["floor", "parallettes"],
    ["Tuck planche.", "Open the hips and flatten the back."],
    ["Back flat, hips at shoulder height.", "Lean forward to balance the longer lever.", "Arms locked."],
    [["Back rounds", "Close the tuck slightly and flatten."], ["Losing the lean", "Shoulders further forward."]]
  ),
  "tuck-planche-push-ups": L(
    "Push-ups in the tuck planche, keeping the lean.",
    ["floor", "parallettes"],
    ["Solid tuck planche.", "Bend the elbows and lower without dropping the feet."],
    ["Lean stays the same at the bottom.", "Elbows brush the ribs.", "Press to a locked tuck planche."],
    [["Feet touch down", "Lean more, or reduce the depth."], ["Hips rise on the press", "Keep the hips level with the shoulders."]]
  ),
  "straddle-planche": L(
    "Planche with the legs wide and straight.",
    ["floor", "parallettes"],
    ["From advanced tuck, extend the legs into a wide straddle.", "Lean further to balance."],
    ["Body level.", "Legs straight and wide, toes pointed.", "Protracted shoulders, locked arms."],
    [["Hips sag", "Squeeze the glutes; regress to advanced tuck."], ["Arms bend", "Lock out; shorten the hold."]]
  ),
  "straddle-planche-push-ups": L(
    "Push-ups in the straddle planche.",
    ["floor", "parallettes"],
    ["Solid straddle planche.", "Lower with control; keep the body level."],
    ["Lean constant.", "Elbows in.", "Full lockout at the top."],
    [["Losing height at the bottom", "Reduce the depth."], ["Kicking the legs", "Legs still; the arms do the work."]]
  ),
  planche: L(
    "Body horizontal on straight arms, legs together. The pushing statics goal.",
    ["floor", "parallettes"],
    ["From the straddle, bring the legs together.", "Lean further to compensate."],
    ["One line from shoulders to toes.", "Arms locked, shoulders protracted.", "Glutes and quads tight."],
    [["Hips drop", "Regress to straddle and build time."], ["Bent arms", "Lock out; shorter sets."]]
  ),
  "planche-push-ups": L(
    "Push-ups in the full planche.",
    ["floor", "parallettes"],
    ["Solid full planche.", "Lower with control."],
    ["Body level throughout.", "Elbows in.", "Press to a locked planche."],
    [["Hips pike on the press", "Keep the glutes tight."], ["Depth collapses", "Reduce the range."]]
  ),

  // ---------- Rings
  "iron-cross": L(
    "Hanging on the rings with the arms straight out to the sides. Elite straight-arm strength.",
    ["rings"],
    ["Support hold on the rings.", "Lower with locked arms until they are level with the shoulders."],
    ["Arms straight and level.", "Rings turned slightly out.", "Body vertical, glutes tight."],
    [["Elbows bend", "Use bands or a cross trainer; never train it bent."], ["Shoulders shrug", "Push the rings down and keep the neck long."]]
  ),

  // ---------- Core
  "hollow-body-hold": L(
    "Lying on the back with the lower back pressed down, arms and legs off the floor. The core shape for everything.",
    ["floor"],
    ["Lie on the back, knees bent, press the lower back into the floor.", "Extend the legs and arms only as far as the back stays flat."],
    ["Lower back glued to the floor.", "Ribs down, chin tucked.", "Toes pointed, arms by the ears."],
    [["Lower back lifts", "Bring the arms and legs closer until it stays down."], ["Neck strains", "Look at the knees, not the ceiling."]]
  ),
  "tuck-sit": L(
    "Support on the hands with the knees tucked to the chest and the feet off the floor.",
    ["floor", "parallettes"],
    ["Sit, hands beside the hips, push down until the hips lift.", "Tuck the knees to the chest."],
    ["Push the floor away; shoulders down.", "Arms locked.", "Knees high."],
    [["Hips will not lift", "Use parallettes or push-up handles."], ["Shoulders shrug", "Depress the shoulders and push down."]]
  ),
  "one-leg-l-sit": L(
    "L-sit with one leg straight and the other tucked.",
    ["floor", "parallettes"],
    ["Tuck sit.", "Extend one leg straight and level."],
    ["Extended leg locked and level.", "Arms straight, shoulders down.", "Switch legs each set."],
    [["Leg hangs low", "Lift with the hip flexors; point the toe."], ["Leaning back", "Keep the chest over the hands."]]
  ),
  "l-sit": L(
    "Support with both legs straight and horizontal. Compression, hip flexors and triceps.",
    ["floor", "parallettes"],
    ["Sit, hands beside the hips, push the hips off the floor.", "Extend both legs to horizontal."],
    ["Knees locked, toes pointed.", "Push the floor away; shoulders down.", "Legs level with the hips."],
    [["Knees bend", "Stretch the hamstrings and build with one-leg L-sits."], ["Legs below horizontal", "Lean the chest forward slightly and compress."]]
  ),
  "hanging-knee-raises": L(
    "From a dead hang, raise the knees to the chest with control.",
    ["bar"],
    ["Dead hang, shoulders active.", "Raise the knees toward the chest; lower slowly."],
    ["No swing; pause at the top.", "Tilt the pelvis at the top.", "Lower to a straight leg every rep."],
    [["Swinging", "Slow the lowering; brace the core."], ["Half range", "Knees to chest height every rep."]]
  ),
  "hanging-leg-raises": L(
    "Straight-leg raise from a dead hang to horizontal or higher.",
    ["bar"],
    ["Dead hang, shoulders active.", "Raise straight legs to horizontal; lower slowly."],
    ["Knees locked.", "No swing.", "Tilt the pelvis at the top."],
    [["Knees bend", "Lower the range; build hamstring flexibility."], ["Momentum", "Pause at the top and bottom."]]
  ),
  "v-sit": L(
    "L-sit with the legs raised well above horizontal and the hips behind the hands.",
    ["floor", "parallettes"],
    ["L-sit.", "Lean back slightly and lift the legs higher while pressing the hips back."],
    ["Legs straight and together.", "Arms locked, shoulders down.", "Compress: chest toward the thighs."],
    [["Knees bend", "Hold a lower V and build compression."], ["Leaning back with the torso", "Push the hips back and up; the torso stays fairly upright."]]
  ),
  "dragon-flag": L(
    "Lying on a bench, the body lowers and rises as one straight line, resting on the upper back.",
    ["floor"],
    ["Lie back, hands gripping a bench or post behind the head.", "Lift the body to vertical on the shoulders, then lower straight."],
    ["Body straight from shoulders to toes.", "Lower only as far as the line holds.", "Squeeze the glutes."],
    [["Hips pike", "Reduce the range; squeeze the glutes."], ["Neck strain", "Keep the weight on the upper back, not the head."]]
  ),
  manna: L(
    "Support with the legs raised past vertical and the hips lifted above the hands. The elite compression skill.",
    ["floor", "parallettes"],
    ["V-sit.", "Lean back further and press the hips up until the legs point up and back."],
    ["Arms locked, shoulders in deep extension.", "Legs straight, toes pointed.", "Hips above the hands."],
    [["Bent arms", "Build shoulder extension with German hangs and push-backs."], ["Hips sink", "Practise manna rocks and higher V-sits."]]
  ),

  // ---------- Flag
  "tuck-flag": L(
    "Human flag with the knees tucked. The first hold on the pole.",
    ["pole"],
    ["Top hand overhand at head height, bottom hand underhand at hip height.", "Kick up to vertical, then lower with the knees tucked."],
    ["Push with the bottom arm, pull with the top.", "Bottom arm locked.", "Hips stacked over the bottom hand."],
    [["Hips sag toward the pole", "Push harder with the bottom arm."], ["Bottom elbow bends", "Lock it before lowering."]]
  ),
  "straddle-flag": L(
    "Flag with the legs wide.",
    ["pole"],
    ["Tuck flag.", "Extend the legs into a wide straddle."],
    ["Body level.", "Bottom arm locked.", "Squeeze the glutes."],
    [["Piking at the hips", "Open the hips; it is a straight line."], ["Drifting down", "Shorten the hold."]]
  ),
  "human-flag": L(
    "Body horizontal on a vertical pole, legs together.",
    ["pole"],
    ["Straddle flag, bring the legs together.", "Or lower from vertical."],
    ["One straight line.", "Push and pull with straight arms.", "Head neutral."],
    [["Hips sag", "Regress to straddle."], ["Bent bottom arm", "Lock out and shorten the hold."]]
  ),

  // ---------- Legs
  squats: L(
    "Deep squat with the heels down and the chest up. Hip, knee and ankle mobility with strength.",
    ["floor"],
    ["Feet shoulder width, toes slightly out.", "Sit between the heels until the hips are below the knees."],
    ["Heels down.", "Knees track over the toes.", "Chest up, spine long."],
    [["Heels lift", "Work ankle mobility; widen the stance slightly."], ["Knees cave", "Push the knees out over the toes."]]
  ),
  "wall-sit": L(
    "Seated against a wall with the thighs horizontal. Quad endurance and knee position.",
    ["wall"],
    ["Back flat on the wall, slide down until the thighs are level.", "Feet under the knees."],
    ["Thighs horizontal, knees at 90°.", "Weight in the heels.", "Back flat on the wall."],
    [["Sitting too high", "Lower until the thighs are level."], ["Hands on the thighs", "Arms crossed or by the sides."]]
  ),
  "bulgarian-split-squats": L(
    "Single-leg squat with the rear foot elevated.",
    ["floor"],
    ["Rear foot on a bench, front foot a long step forward.", "Lower straight down."],
    ["Front knee tracks over the toes.", "Torso upright.", "Drive through the front heel."],
    [["Front foot too close", "Step further forward."], ["Leaning forward", "Keep the chest up and the hips under."]]
  ),
  "shrimp-squats": L(
    "Single-leg squat holding the rear foot behind you.",
    ["floor"],
    ["Stand on one leg, hold the other foot behind with one hand.", "Lower until the rear knee touches."],
    ["Torso leans forward slightly.", "Front knee tracks over the toes.", "Soft touch, then drive up."],
    [["Dropping onto the knee", "Control the last inches."], ["Losing balance", "Hold the wall until the pattern is smooth."]]
  ),
  "pistol-squats": L(
    "Single-leg squat with the free leg held straight out in front.",
    ["floor"],
    ["Stand on one leg, extend the other forward.", "Sit down until the hamstring covers the calf."],
    ["Heel down.", "Chest forward for balance.", "Free leg straight and off the floor."],
    [["Heel lifts", "Work ankle mobility; hold a light counterweight."], ["Knee caves", "Push the knee out."]]
  ),
  "dragon-squats": L(
    "Single-leg squat with the free leg wrapped behind the standing leg.",
    ["floor"],
    ["Stand on one leg, wrap the other behind and around the standing leg.", "Lower with control."],
    ["Torso upright.", "Standing heel down.", "Slow lowering."],
    [["Rushing the bottom", "Pause at the bottom."], ["Balance lost", "Use a wall or pole for support."]]
  ),
  "sissy-squats": L(
    "Lean back and lower with the hips open, bending only the knees. Quad-focused.",
    ["floor"],
    ["Stand, heels lifted, hips open.", "Lean back and bend the knees, keeping the body straight from knee to shoulder."],
    ["Hips stay open.", "Knees travel forward.", "Control the descent."],
    [["Piking at the hips", "Keep the hips extended; reduce the depth."], ["Knee pain", "Warm up and reduce the range."]]
  ),
  "bosu-single-leg-squats": L(
    "Single-leg squat on an unstable surface. Balance and knee control.",
    ["floor"],
    ["Stand on one leg on the dome.", "Lower to a quarter or half squat."],
    ["Knee over the toes.", "Hips level.", "Slow and controlled."],
    [["Knee wobbles inward", "Push the knee out; reduce the depth."], ["Leaning to the side", "Keep the hips level."]]
  ),
  "nordic-curls": L(
    "Kneeling, lower the body forward using only the hamstrings.",
    ["floor"],
    ["Kneel with the feet anchored.", "Lower forward as slowly as possible."],
    ["Hips open throughout.", "Fight the descent with the hamstrings.", "Catch with the hands, press back up."],
    [["Piking at the hips", "Squeeze the glutes; treat the body as a plank."], ["Dropping fast", "Reduce the range with a band."]]
  ),
  "glute-bridge": L(
    "Lying on the back, drive the hips up until the body is straight from shoulders to knees.",
    ["floor"],
    ["Lie on the back, knees bent, feet flat.", "Drive the hips up."],
    ["Squeeze the glutes at the top.", "Ribs down; no arch.", "Knees over the ankles."],
    [["Arching the lower back", "Tuck the pelvis and squeeze the glutes."], ["Feet too far out", "Pull the heels closer."]]
  ),
  "single-leg-glute-bridge": L(
    "Glute bridge on one leg.",
    ["floor"],
    ["Glute bridge, extend one leg.", "Drive up with the planted heel."],
    ["Hips level.", "Glute squeezed at the top.", "Slow lowering."],
    [["Hips tilt", "Keep both hips the same height."], ["Hamstring cramps", "Move the foot closer to the hips."]]
  ),
  bridge: L(
    "A full arch on the hands and feet. Shoulder and spine extension.",
    ["floor"],
    ["Lie on the back, hands beside the ears, feet flat.", "Press up into an arch."],
    ["Push through the hands; try to straighten the arms.", "Shoulders over the hands.", "Knees pointing forward."],
    [["Arms bend", "Walk the feet closer and push the shoulders over the hands."], ["Knees splay", "Squeeze the knees toward each other."]]
  ),
};

export function getLesson(skillId: string): Lesson | undefined {
  return LESSONS[skillId];
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  floor: "Floor",
  bar: "Pull-up bar",
  parallettes: "Parallettes / dip bars",
  rings: "Rings",
  pole: "Pole",
  wall: "Wall",
};
