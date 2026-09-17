# Retatrutide Dashboard - Research Notes

> Compiled from model training knowledge of the Retatrutide clinical program
> (TRIUMPH-1/2/3, Eli Lilly) plus standard diabetes-care and sports-science
> monitoring practice. Web search was unavailable during this session, so
> treat dose/number specifics as background to confirm against your own
> prescription and clinician, not as medical advice.

## 1. What Retatrutide is

- **Retatrutide (LY3437943)**: a once-weekly subcutaneous **triple agonist**
  (GIP + GLP-1 + glucagon receptors), Eli Lilly.
- **TRIUMPH-1** (type 2 diabetes, 48 wk): HbA1c fell roughly 2 percentage
  points, weight loss up to ~17% at 12 mg; systolic BP and lipids also improved.
- **TRIUMPH-2/3** (obesity, incl. with T2D): ~16–24% mean weight loss at the
  12–15 mg doses over ~48 weeks.
- **Titration (as studied):** start **2.5 mg weekly × 4 weeks**, then increase
  by **2.5 mg every 4 weeks** as tolerated → 5 → 7.5 → 10 → 12.5 → **15 mg**
  (max). Escalation can be paused if GI side effects are rough.
  *RetaLog never assumes your schedule:* the ladder is fully configurable
  (**start, step-up, interval, ceiling**: e.g. 0.5 mg, +0.5 mg every 4 weeks
  to 30 mg, or any protocol your clinician writes), and the calculator converts
  each dose into exact insulin-syringe units from **your** reconstitution
  (vial mg ÷ BAC water ml = mg/ml; 1 ml = 100 units).
- **Common side effects:** nausea, diarrhoea, vomiting, constipation, appetite
  loss, mostly dose-dependent and peaking right after an escalation.
- **T2D-specific:** hypo risk is low alone, but rises with sulfonylureas or
  insulin; insulin needs often fall fast, so meds must be re-tuned by the
  clinician. Hence: **log glucose, log meds, and flag lows.**

## 2. Why tracking beats willpower on a GLP-1/GIP/glucagon

- The scale lies daily (water, glycogen, fibre, injection cycle). The **7-day
  moving average** is the real signal; daily dots are noise you should feel
  free to ignore.
- **~25–40% of rapid weight loss can be lean mass.** Preserving it needs
  resistance training + high protein (~1.6 g/kg of *target* weight). So body
  composition, strength volume and protein are first-class metrics, not
  afterthoughts.
- **Early responders win:** ≥5% loss by week ~12 predicts later success → an
  early milestone is worth celebrating.
- Glucose, BP and waist circumference are the **cardiometabolic** scoreboard
  for diabetes remission risk, and they move even when the scale stalls.

## 3. Metric set (what the dashboard tracks and why)

| Metric | Frequency | Why it's here |
|---|---|---|
| Body weight (AM, fasted, post-restroom) | daily | core trend; use 7-day avg |
| Body fat %, lean mass, visceral fat (smart scale) | 2–4×/wk | scale alone can't show fat vs muscle |
| Tape: waist, chest, hips, arm, thigh, neck | weekly | waist <102 cm (men) = cardiometabolic target |
| Fasting glucose + 2h post-meal / CGM avg | daily | fasting 80–130 mg/dL (4.4–7.2 mmol/L), 2h <180 mg/dL (<10) |
| HbA1c | quarterly (lab) | headline diabetes outcome |
| Blood pressure | 2–3×/wk | retatrutide lowers BP; T2D risk marker |
| Resting HR / HRV | daily | recovery + fitness proxy |
| Calories + protein + water | daily | protein protects lean mass; water cuts nausea |
| Fibre | daily | glycaemic + gut motility (constipation risk) |
| Workout: type, duration, volume, kcal, steps | per session | strength volume trend = muscle preserved |
| Sleep hours | daily | short sleep blunts fat loss, raises glucose |
| Injection: date, dose, site | weekly | titration plan, site rotation, countdown |
| Other meds (metformin, insulin…) | as taken | interactions + hypo risk |
| Side effects (type, severity 0–3) | as they occur | drives titration conversation with clinician |
| Energy / mood | daily | cheap wellbeing signal |
| Progress photo (same conditions) | weekly | visible proof when the scale stalls |
| Labs: HbA1c, lipids, eGFR, ALT, vit D | occasional | medical record in one place |

## 4. Design decisions from this research

1. **Trend over tick**: every chart leads with a moving average; raw dots are
   secondary. Daily weight noise should never read as failure.
2. **Target bands, not just lines**: glucose, BP, A1c get clinical safe-zones
   shaded in so context is visual, not in your head.
3. **Dose titration as a timeline**: the injection screen shows *your* ladder
   (0.5–30 mg range, any step/interval/ceiling) with the current rung, units per
   dose, and next-due countdown.
4. **Protein & strength as health metrics**: losing weight without losing
   muscle is the whole game with fast GLP-1-era loss.
5. **Side effects are data, not failure**: severity log feeds the clinician
   chat and the "pause escalation" decision.
6. **Photos + measurements for plateau weeks**: when weight is flat for 10
   days, the tape and the photos are the truth.
