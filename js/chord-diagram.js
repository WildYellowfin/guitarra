// Draws a chord box as an SVG string. Strings run vertically, low E on the left.

const FRETS = 4;
const W = 120;
const H = 150;
const LEFT = 20;
const TOP = 34;
const STRING_GAP = (W - 2 * LEFT) / 5;
const FRET_GAP = (H - TOP - 12) / FRETS;

export function chordDiagram(name, { frets, fingers }) {
  const x = (i) => LEFT + i * STRING_GAP;
  const parts = [];

  parts.push(`<text x="${W / 2}" y="13" class="cd-name">${name}</text>`);
  // nut + fret lines
  parts.push(`<line x1="${LEFT}" y1="${TOP}" x2="${W - LEFT}" y2="${TOP}" class="cd-nut"/>`);
  for (let f = 1; f <= FRETS; f++) {
    const y = TOP + f * FRET_GAP;
    parts.push(`<line x1="${LEFT}" y1="${y}" x2="${W - LEFT}" y2="${y}" class="cd-line"/>`);
  }
  for (let s = 0; s < 6; s++) {
    parts.push(`<line x1="${x(s)}" y1="${TOP}" x2="${x(s)}" y2="${TOP + FRETS * FRET_GAP}" class="cd-line"/>`);
  }

  frets.forEach((fret, s) => {
    if (fret === null) {
      parts.push(`<text x="${x(s)}" y="${TOP - 6}" class="cd-mark">×</text>`);
    } else if (fret === 0) {
      parts.push(`<circle cx="${x(s)}" cy="${TOP - 10}" r="4" class="cd-open"/>`);
    } else {
      const y = TOP + (fret - 0.5) * FRET_GAP;
      parts.push(`<circle cx="${x(s)}" cy="${y}" r="8" class="cd-dot"/>`);
      if (fingers[s]) parts.push(`<text x="${x(s)}" y="${y + 4}" class="cd-finger">${fingers[s]}</text>`);
    }
  });

  return `<svg viewBox="0 0 ${W} ${H}" class="chord" role="img" aria-label="${name} chord">${parts.join("")}</svg>`;
}
