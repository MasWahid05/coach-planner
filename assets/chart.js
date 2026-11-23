// Grafik volume–intensitas (SVG). Dipakai di editor dan diubah jadi PNG untuk Excel.
import { segStarts, phaseColor, peakIdx, monthSpans } from './engine.js';

export const COLORS = { vol: '#2563eb', int: '#e03131', peak: '#94a3b8' };

export function chartSVG(plan, o = {}) {
  const W = plan.weeks, cw = o.colW || 22, padL = 44, padR = 16, padT = 18, padB = 40;
  const w = padL + W * cw + padR, h = o.height || 260, ih = h - padT - padB;
  const ink = o.ink || '#334155', grid = o.grid || '#e2e8f0', bg = o.bg || 'transparent';
  const x = i => padL + i * cw + cw / 2, y = v => padT + ih - (v / 100) * ih;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="11">`;
  if (bg !== 'transparent') s += `<rect width="${w}" height="${h}" fill="${bg}"/>`;
  // pita fase
  const st = segStarts(plan.phases);
  plan.phases.forEach((p, i) => { s += `<rect x="${padL + st[i] * cw}" y="${padT}" width="${p.len * cw}" height="${ih}" fill="${phaseColor(p)}" opacity=".09"/>`; });
  for (let v = 0; v <= 100; v += 20) s += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" stroke="${grid}"/><text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" fill="${ink}" opacity=".7">${v}%</text>`;
  // label bulan
  monthSpans(plan).forEach(m => { s += `<line x1="${padL + m.start * cw}" x2="${padL + m.start * cw}" y1="${padT}" y2="${h - padB + 4}" stroke="${grid}"/>`; if (m.len * cw > 26) s += `<text x="${padL + (m.start + m.len / 2) * cw}" y="${h - padB + 16}" text-anchor="middle" fill="${ink}" opacity=".75">${m.name.slice(0, 3)}</text>`; });
  // puncak (batang)
  for (let i = 0; i < W; i++) { const pk = peakIdx(plan, i) * 20; s += `<rect x="${x(i) - cw * .28}" y="${y(pk)}" width="${cw * .56}" height="${ih - (y(pk) - padT)}" fill="${COLORS.peak}" opacity=".22" rx="2"/>`; }
  // lomba
  plan.events.forEach(e => { if (e.week < 0 || e.week >= W) return; s += `<line x1="${x(e.week)}" x2="${x(e.week)}" y1="${padT}" y2="${padT + ih}" stroke="${e.main ? '#e8590c' : '#f59f00'}" stroke-dasharray="3 3" stroke-width="${e.main ? 2 : 1.2}"/><text x="${x(e.week)}" y="${padT - 5}" text-anchor="middle" font-size="13">${e.main ? '★' : '●'}</text>`; });
  const line = (arr, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="${arr.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>` + arr.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${o.dots === false ? 0 : 3.2}" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('');
  s += line(plan.vol, COLORS.vol) + line(plan.int, COLORS.int);
  // legenda
  const ly = h - 12;
  s += `<g transform="translate(${padL},${ly})" fill="${ink}"><rect width="14" height="3" y="-4" fill="${COLORS.vol}"/><text x="20">Volume</text><rect x="86" width="14" height="3" y="-4" fill="${COLORS.int}"/><text x="106">Intensitas</text><rect x="186" width="10" height="10" y="-9" fill="${COLORS.peak}" opacity=".35"/><text x="202">Indeks puncak</text><text x="300">★ lomba utama  ● lomba lain</text></g>`;
  s += '</svg>';
  return { svg: s, w, h, padL, padT, ih, cw };
}

export async function chartPNG(plan, { scale = 2, colW = 22, height = 280 } = {}) {
  const c = chartSVG(plan, { bg: '#ffffff', colW, height });
  const img = new Image();
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(c.svg);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const cv = document.createElement('canvas'); cv.width = c.w * scale; cv.height = c.h * scale;
  const g = cv.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0);
  return { dataUrl: cv.toDataURL('image/png'), w: c.w, h: c.h };
}
