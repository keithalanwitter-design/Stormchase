/**
 * Guided DEMO chase-day walkthrough (synthetic). Pure data so it can be unit-tested.
 * Fictional case day = demo "Day 1" (fhr 48–66) centred on Missouri / Illinois.
 */
import type { LayerId } from './layers';

export interface TourStep {
  id: string; kicker: string; title: string; body: string[];
  camera: { center: [number, number]; zoom: number; pitch: number; bearing: number };
  fhr: number; select?: string; tab?: 'Ingredients' | 'Sounding' | 'Timeline' | 'Models' | 'SPC' | 'Analogs' | 'Chase plan';
  layers?: Partial<Record<LayerId, boolean>>; play?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'day2', kicker: 'Step 1 · Night before (Day 2)', title: 'A big day is showing up', fhr: 30,
    camera: { center: [-94, 38], zoom: 3.9, pitch: 0, bearing: 0 }, layers: { whirl: true, radar: false, spcCat: false, spcTorn: false, nws: false },
    body: ['Two days out, the synthetic model run shows strong low-level wind fields reaching the Plains and Midwest.', 'WHIRL-E corridors light up where 0–500 m helicity, shear, moisture and low cloud bases overlap. Today it favors the Plains dryline.', 'Next we move to the morning of the Midwest day.'] },
  { id: 'morning', kicker: 'Step 2 · Morning of (Day 1)', title: 'Narrow the target box', fhr: 50, select: 'hs-ilwf', tab: 'Timeline',
    camera: { center: [-91, 39], zoom: 5.2, pitch: 25, bearing: -8 }, layers: { whirl: true },
    body: ['Morning runs focus two corridors: the Ozark warm front and central Illinois.', 'The Timeline tab shows WHIRL ramping toward a late-afternoon peak. Faint lines are the other models, so you can see how much they disagree.', 'Checklist: check mesoanalysis SRH and LCL trends, find the warm front and outflow boundaries, and compare the radar VAD wind profile with the models.'] },
  { id: 'firing', kicker: 'Step 3 · Storms firing', title: 'WHIRL peaks over the Ozarks', fhr: 57, select: 'hs-ozark', tab: 'Ingredients', play: false,
    camera: { center: [-93.4, 37.3], zoom: 6.3, pitch: 52, bearing: -18 }, layers: { whirl: true },
    body: ['By 4 PM the Ozark corridor reaches high-end WHIRL: strong 0–500 m SRH, low LCLs and an active warm front (×1.2).', 'The gauges show each ingredient, and the narrative explains what limits the score.', 'On a real day, radar takes over now: favor the tail-end or most isolated cell, measure its actual motion, and watch rotation trends.'] },
  { id: 'decision', kicker: 'Step 4 · Chase decision', title: 'Pick a target, with an escape route', fhr: 58, select: 'hs-ilwf', tab: 'Chase plan',
    camera: { center: [-89.4, 40.15], zoom: 6.6, pitch: 45, bearing: -10 }, layers: { whirl: true },
    body: ['Illinois wins for visibility and road grid. The plan lists the target town, departure time, route and safety notes.', 'Safety comes first: never core-punch, keep an escape route east, and follow official NWS warnings. WHIRL is not a warning.'] },
  { id: 'wrap', kicker: 'Done', title: 'That was a demo chase day', fhr: 57,
    camera: { center: [-95.5, 38.5], zoom: 3.6, pitch: 0, bearing: 0 }, layers: { whirl: true },
    body: ['Everything in this walkthrough was synthetic. Head back to live data, or build your own setup in the WHIRL Playground.'] },
];
