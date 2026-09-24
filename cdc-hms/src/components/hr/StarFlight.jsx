import starGreen from '../../assets/hr/star-green.png';
import starGold from '../../assets/hr/star-gold.png';
import starRed from '../../assets/hr/star-red.png';
import './hr.css';

/**
 * StarFlight — the tap-page animation (HR Suite, B21), ported from the
 * signed-off mockup (claude/hr-suite-mockup.html v10, "flystar").
 *
 * The clinic's glossy star PNG on a white glass disc grows over the result
 * mark, spins and drops into today's cell in the calendar, then the flat ★
 * appears there with a landing pulse. Three characters:
 *   green — one calm spin, 1.4 s, subtle glitter
 *   gold  — bigger, three spins, 1.9 s, heavy glitter, confetti + sparkles, bounce
 *   red   — slower quarter turns, gravity drop, 1.3 s, plain, then the cell shakes
 * prefers-reduced-motion → the star is placed at once.
 *
 * Feedback, never a gate: call this AFTER the result text has rendered.
 *
 * @param {object} p
 * @param {HTMLElement} p.root      positioned container the pieces are appended to
 * @param {HTMLElement} p.fromEl    the result mark (start point)
 * @param {HTMLElement} p.toEl      today's target star in the calendar
 * @param {'green'|'gold'|'red'} p.colour
 * @param {() => void} p.onLand     flip the calendar star (StarCalendar.landStar)
 * @returns {() => void}            cancel function (unmount)
 */
const STAR = { green: starGreen, gold: starGold, red: starRed };

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const centre = (el, root) => {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
};

const glitter = (fly, colour, ms, timers) => {
  const gap = colour === 'gold' ? 110 : 190;
  const end = Date.now() + ms;
  const tick = () => {
    if (Date.now() > end || !fly.isConnected) return;
    const t = document.createElement('span');
    t.className = 'hr-twinkle';
    t.textContent = '✦';
    t.style.left = `${18 + Math.random() * 64}%`;
    t.style.top = `${14 + Math.random() * 64}%`;
    fly.appendChild(t);
    t.animate([
      { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(45deg)', opacity: 1, offset: 0.5 },
      { transform: 'translate(-50%,-50%) scale(0) rotate(90deg)', opacity: 0 },
    ], { duration: 420, easing: 'ease-out' }).onfinish = () => t.remove();
    timers.push(setTimeout(tick, gap * (0.6 + Math.random() * 0.8)));
  };
  tick();
};

const confetti = (root) => {
  const cols = ['#D4A017', '#FFD54F', '#0066CC', '#15803D', '#EC4899', '#F97316', '#8B5CF6', '#22D3EE'];
  const W = root.clientWidth;
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('span');
    c.className = 'hr-confetti';
    c.style.left = `${Math.random() * W}px`;
    c.style.background = cols[i % cols.length];
    if (i % 3 === 0) { c.style.borderRadius = '50%'; c.style.width = '7px'; c.style.height = '7px'; }
    root.appendChild(c);
    const drift = (Math.random() - 0.5) * 90;
    const dur = 1500 + Math.random() * 900;
    const delay = Math.random() * 350;
    const rot = 360 + Math.random() * 720;
    c.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${drift}px, ${root.clientHeight + 20}px) rotate(${rot}deg)`, opacity: 0.9 },
    ], { duration: dur, delay, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'forwards' }).onfinish = () => c.remove();
  }
};

const sparkle = (root, x, y) => {
  for (let i = 0; i < 8; i++) {
    const sp = document.createElement('span');
    sp.className = 'hr-spark';
    sp.textContent = '✦';
    sp.style.left = `${x}px`;
    sp.style.top = `${y}px`;
    root.appendChild(sp);
    const ang = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
    const dist = 34 + Math.random() * 22;
    sp.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1.1)`, opacity: 0 },
    ], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = () => sp.remove();
  }
};

export const playStarFlight = ({ root, fromEl, toEl, colour, onLand }) => {
  if (!root || !fromEl || !toEl || !STAR[colour]) { onLand?.(); return () => {}; }
  if (reducedMotion() || typeof fromEl.animate !== 'function') { onLand?.(); return () => {}; }

  const timers = [];
  const from = centre(fromEl, root);
  const to = centre(toEl, root);
  const fly = document.createElement('span');
  fly.className = `hr-flystar ${colour}`;
  fly.innerHTML = `<img src="${STAR[colour]}" alt=""><span class="hr-sheen"></span>`;
  fly.style.left = `${from.x}px`;
  fly.style.top = `${from.y}px`;
  root.appendChild(fly);
  if (colour !== 'red') glitter(fly, colour, colour === 'gold' ? 1700 : 1150, timers);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let kf, opt;
  if (colour === 'green') {
    kf = [
      { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(3) rotate(180deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-50%) scale(3) rotate(360deg)', offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(540deg)`, opacity: 1 },
    ];
    opt = { duration: 1400, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
  } else if (colour === 'gold') {
    kf = [
      { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(3.8) rotate(360deg)', opacity: 1, offset: 0.35 },
      { transform: 'translate(-50%,-50%) scale(3.8) rotate(720deg)', offset: 0.6 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.4) rotate(1080deg)`, offset: 0.9 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(1080deg)` },
    ];
    opt = { duration: 1900, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' };
    timers.push(setTimeout(() => { sparkle(root, from.x, from.y); confetti(root); }, 650));
    timers.push(setTimeout(() => sparkle(root, to.x, to.y), 1750));
  } else {
    kf = [
      { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(2.8) rotate(-40deg)', opacity: 1, offset: 0.35 },
      { transform: 'translate(-50%,-50%) scale(2.8) rotate(-90deg)', offset: 0.6 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - 6}px)) scale(1) rotate(-180deg)`, offset: 0.92 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(-180deg)` },
    ];
    opt = { duration: 1300, easing: 'cubic-bezier(.55,0,.9,.3)', fill: 'forwards' };
  }

  const an = fly.animate(kf, opt);
  let done = false;
  an.onfinish = () => { if (done) return; done = true; fly.remove(); onLand?.(); };

  return () => {
    done = true;
    timers.forEach(clearTimeout);
    try { an.cancel(); } catch { /* already finished */ }
    fly.remove();
  };
};

/** Delay before the mood line pops in after landing (mockup: gold waits longer). */
export const cheerDelayFor = (colour) => (colour === 'gold' ? 350 : 120);

export default playStarFlight;
