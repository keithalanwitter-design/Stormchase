import { CHASERS } from '../lib/chasers';
import { haptic } from './Viz';

export const FAQ: { q: string; a: string }[] = [
  { q: 'Is this an official forecast?', a: 'No. StormChase shows official products (SPC outlooks, NWS watches and warnings, NHC tropical data) exactly as published, plus a live radar mosaic. WHIRL is an experimental research index and is never shown in Live mode. Always follow the National Weather Service.' },
  { q: 'Can I use it for safety decisions?', a: 'No. For safety, use official NWS warnings: NOAA Weather Radio, Wireless Emergency Alerts, your local NWS office and local media. StormChase can lag, fail, or be wrong.' },
  { q: 'How often does the data update?', a: 'Radar: every 5 minutes (the loop is the last ~2 hours at 10-minute steps). NWS watches and warnings: every 2 minutes. SPC Day 1 outlook: checked every 10 minutes. Mesoscale discussions: every 5 minutes. Day 2/3 and NHC: every 30 minutes. The Chaser Feed updates when its cached file is refreshed.' },
  { q: 'Why are there no WHIRL hotspots right now?', a: 'WHIRL isn’t connected to live model data yet, and the site never invents live hotspots. Hotspots only appear in the clearly labeled demo chase day, which uses synthetic data.' },
  { q: 'What is demo mode?', a: 'A guided walkthrough of a fictional big severe-weather day (night before → morning of → storms firing → chase decision) that shows how WHIRL would be used. Every number in it is synthetic. A DEMO banner stays on screen the whole time.' },
  { q: 'Why does a 5% tornado area matter?', a: 'SPC tornado probabilities are the chance of a tornado within 25 miles of a point. 5% may sound small, but it is a meaningful threat level. A hatched area means SPC expects potential for stronger (EF2+) tornadoes.' },
  { q: 'What are STCI and STP?', a: 'STP (Significant Tornado Parameter) is SPC’s well-known composite. STCI is an experimental alternative composite whose weights are unverified hypotheses. The Playground compares both with WHIRL v0.1 for the same ingredients.' },
  { q: 'What do the colors mean?', a: 'SPC categories: light green TSTM, dark green MRGL, yellow SLGT, orange ENH, red MDT, magenta HIGH. Warnings: red Tornado Warning, yellow Tornado Watch, orange Severe T-storm Warning, pink Severe T-storm Watch, blue Tropical Storm, crimson Hurricane. Blue dashed shapes are SPC mesoscale discussions. White is the NHC cone.' },
  { q: 'How do I add a chaser to the Chaser Feed?', a: 'Add the account to CHASERS in src/lib/chasers.ts and to HANDLES in scripts/update-feed.mjs, then regenerate docs/feed/chasers.json. Posts are third-party content and never feed WHIRL.' },
  { q: 'Does the site use my location?', a: 'No. There is no geolocation, and place search uses a small built-in list.' },
];

export default function InfoPage({ onClose, onDemo, onPlayground, embedded }: { embedded?: boolean; onClose: () => void; onDemo: () => void; onPlayground: () => void }) {
  return (
    <div className={embedded ? 'info-page embedded' : 'info-page slide-up'} data-testid="info-page" role={embedded ? 'region' : 'dialog'} aria-label="How it works">
      <div className="info-inner">
        <div className="info-top"><h1>How StormChase works</h1><button className="icon" onClick={onClose} aria-label={embedded ? 'Back to map' : 'Close'}>{embedded ? '↑ Map' : '✕'}</button></div>
        <div className="cta-cards">
          <button className="cta-card" onClick={() => { haptic(12); onDemo(); }} data-testid="info-demo"><span className="demo-badge">DEMO</span><b>Try a demo chase day</b><small>Guided 5-step walkthrough of a synthetic outbreak</small></button>
          <button className="cta-card" onClick={() => { haptic(12); onPlayground(); }}><span className="third-badge">LAB</span><b>WHIRL Playground</b><small>Drag ingredients and compare WHIRL, STCI and STP</small></button>
        </div>

        <section><h2>Live layers</h2>
          <ul className="bul">
            <li><b>Radar</b>: RainViewer’s US composite reflectivity mosaic. Use ▶ / ❚❚ to loop the last ~2 hours, and drag the slider to pick a frame. Blue/green is light rain, yellow and red are heavy, magenta is extreme.</li>
            <li><b>SPC outlooks</b>: Day 1 categorical risk and tornado probability, plus hatching for conditional intensity. Day 2/3 outlines are in Layers.</li>
            <li><b>NWS watches & warnings</b>: tap a polygon to see the headline, the expiry time (CT) and the full text.</li>
            <li><b>Mesoscale discussions</b>: blue dashed areas SPC is watching closely, often ahead of a watch.</li>
            <li><b>NHC</b>: forecast cone and track for active tropical systems.</li>
            <li><b>Live now chip</b>: tornado warning and watch counts, SPC max tornado %, hatched flag and active MDs. Tap it for details.</li>
            <li><b>Chaser Feed</b>: recent public posts from storm chasers and NWS WPC, labeled third-party. Not WHIRL data.</li>
          </ul>
        </section>

        <section><h2>What WHIRL is</h2>
          <p><b>WHIRL (Witter–Hart Integrated Rotational Likelihood)</b> is an experimental tornado-targeting score. It is built mainly on near-ground (0–500 m) storm-relative helicity, the strongest single ingredient for separating tornado days from busts in matched-case research. It is then adjusted for deep shear, instability, cloud-base height, capping, storm mode and boundaries.</p>
          <p className="callout">WHIRL is <b>not a warning</b> and <b>not a tornado probability</b>. Its weights are starting guesses, to be tested this winter against a case library of tornado days and busts, using SPC tornado tracks, NCEI Storm Events, SPC mesoanalysis, HRRR/RAP and NEXRAD Level II. On a real chase day it helps pick a 50–100 mile target box, and radar takes over once storms fire.</p>
        </section>

        <section><h2>Using it on a chase day</h2>
          <div className="steps3">
            <div><h3>Night before</h3><ul className="bul"><li>Read the SPC Day 2 outlook and note any hatched tornado area</li><li>Score the region (WHIRL, once live model data is connected)</li><li>Pick a box where storms should stay discrete</li></ul></div>
            <div><h3>Morning of</h3><ul className="bul"><li>Check mesoanalysis 0–500 m SRH, STP, LCL and CIN trends</li><li>Find the warm front and outflow boundaries on surface obs and satellite</li><li>Compare the radar VAD wind profile to the models</li><li>Check whether morning storms have worked over the target, and read any MDs</li></ul></div>
            <div><h3>Storms firing</h3><ul className="bul"><li>Favor the tail-end or most isolated cell with clean inflow</li><li>Measure actual storm motion and re-check SRH</li><li>Watch rotation trends. Follow NWS warnings and keep an escape route</li></ul></div>
          </div>
        </section>

        <section><h2>FAQ</h2>
          <div className="faq" data-testid="faq">{FAQ.map((f) => <details key={f.q} onToggle={() => haptic(6)}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </section>

        <section><h2>Sources & credits</h2>
          <ul className="bul small">
            <li>NOAA/NWS <a href="https://www.spc.noaa.gov/" target="_blank" rel="noreferrer">Storm Prediction Center</a>: convective outlooks, mesoscale discussions</li>
            <li>NOAA/<a href="https://www.weather.gov/" target="_blank" rel="noreferrer">National Weather Service</a>: api.weather.gov alerts and mapservices.weather.noaa.gov watch/warning polygons</li>
            <li>NOAA <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noreferrer">National Hurricane Center</a>: tropical cone and track</li>
            <li><a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>: radar mosaic tiles</li>
            <li>Basemap: Esri World Dark Gray Canvas (Esri, HERE, Garmin, © OpenStreetMap contributors). Map engine: MapLibre GL JS</li>
            <li>Chaser Feed: public posts from X ({CHASERS.map((c) => '@' + c.xHandle).join(', ')}). Third-party content, not affiliated</li>
          </ul>
          <p className="muted">StormChase is a personal research project, not affiliated with NOAA or NWS.</p>
        </section>
      </div>
    </div>
  );
}
