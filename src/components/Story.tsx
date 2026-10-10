import { useEffect, useRef } from 'react';
import { HOTSPOT_DEFS, whirlSeries } from '../data/demo';
import { DemoBadge } from './Panels';
import { SoundingSvg, TimelineChart, haptic } from './Viz';

export interface StoryStep { title: string; camera: { center: [number, number]; zoom: number; pitch: number; bearing: number }; fhr: number; select?: string }
export const STORY_STEPS: StoryStep[] = [
  { title: 'Global overview', camera: { center: [-98, 40], zoom: 1.7, pitch: 0, bearing: 0 }, fhr: 57 },
  { title: 'Continental hotspots', camera: { center: [-93, 37.5], zoom: 3.5, pitch: 0, bearing: 0 }, fhr: 57 },
  { title: 'Regional corridors', camera: { center: [-91.3, 39], zoom: 5.4, pitch: 35, bearing: -10 }, fhr: 57 },
  { title: 'Storm environments', camera: { center: [-93.5, 37.2], zoom: 6.8, pitch: 58, bearing: -25 }, fhr: 57, select: 'hs-ozark' },
  { title: 'Forecast Center', camera: { center: [-95.5, 38.5], zoom: 3.6, pitch: 0, bearing: 0 }, fhr: 57 },
];

export default function Story({ step, onStep, onEnter, onPlayground, stats }: {
  step: number; onStep: (i: number) => void; onEnter: () => void; onPlayground: () => void; stats: { spc: string; nws: string; hs: number };
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const secs = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-step]'));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); onStep(Number((e.target as HTMLElement).dataset.step)); } });
    }, { root: root.current, threshold: 0.55 });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [onStep]);
  const go = (i: number) => { haptic(); root.current?.querySelector(`[data-step="${i}"]`)?.scrollIntoView({ behavior: 'smooth' }); };
  const il = HOTSPOT_DEFS.find((h) => h.id === 'hs-ilwf')!, oz = HOTSPOT_DEFS.find((h) => h.id === 'hs-ozark')!;
  const regions = ['Plains', 'Midwest', 'Illinois', 'Dixie'] as const;
  return (
    <div className="story" ref={root} data-testid="story">
      <section data-step={0} className="s-hero">
        <div className="reveal glass">
          <div className="eyebrow">Witter–Hart Integrated Rotational Likelihood</div>
          <h1>STORM<b>CHASE</b></h1>
          <p>A North American severe-weather Forecast Center focused on the United States. Live SPC outlooks and NWS warnings, plus experimental WHIRL environments in clearly labeled demo mode.</p>
          <div className="hero-stats">
            <div><small>SPC Day 1</small><b>{stats.spc}</b></div><div><small>NWS severe alerts</small><b>{stats.nws}</b></div><div><small>Demo corridors</small><b>{stats.hs} <DemoBadge small /></b></div>
          </div>
          <div className="hero-actions"><button className="cta" onClick={onEnter}>Enter Forecast Center →</button><button className="ghost" onClick={() => go(1)}>Take the tour ↓</button></div>
        </div>
        <div className="scroll-hint" aria-hidden>scroll<span /></div>
      </section>
      <section data-step={1}>
        <div className="reveal glass">
          <div className="eyebrow">02 · Continental hotspots <DemoBadge small /></div>
          <h2>Seven corridors, one fictional spring system</h2>
          <p>Over three days the demo system marches from the Plains dryline to the Midwest warm front and into Dixie. Shown here at each corridor's peak hour. Each glowing shape is an <b>environmental favorability region</b> — never a tornado path.</p>
          <div className="region-chips">{regions.map((r) => <span key={r}>{r} · {HOTSPOT_DEFS.filter((h) => h.region === r).length}</span>)}</div>
        </div>
      </section>
      <section data-step={2}>
        <div className="reveal glass">
          <div className="eyebrow">03 · Regional corridors <DemoBadge small /></div>
          <h2>Illinois & Missouri, Day 1</h2>
          <p>WHIRL rises and falls with the forecast hour. Here's the central Illinois warm-front corridor through the demo run:</p>
          <TimelineChart series={whirlSeries(il, 'HRRR', 2)} fhr={57} />
        </div>
      </section>
      <section data-step={3}>
        <div className="reveal glass">
          <div className="eyebrow">04 · Storm environments <DemoBadge small /></div>
          <h2>Inside the Ozark hotspot</h2>
          <p>Low cloud bases, strong near-ground helicity and an active warm front. The synthetic sounding and hodograph show why WHIRL likes it:</p>
          <SoundingSvg env={oz.env} compact />
        </div>
      </section>
      <section data-step={4}>
        <div className="reveal glass center">
          <div className="eyebrow">05 · Your turn</div>
          <h2>Explore the Forecast Center</h2>
          <p>Tap hotspots, scrub the Day 3 → Day 0 timeline, compare against live SPC, or build your own setup in the Playground.</p>
          <div className="hero-actions"><button className="cta" onClick={onEnter}>Enter Forecast Center →</button><button className="ghost" onClick={onPlayground}>Open WHIRL Playground</button></div>
        </div>
      </section>
      <nav className="story-dots" aria-label="Story progress">{STORY_STEPS.map((s, i) => <button key={s.title} className={i === step ? 'on' : ''} onClick={() => go(i)} aria-label={s.title} title={s.title} />)}</nav>
    </div>
  );
}
