// Draws the play screen on a canvas: a note highway in perspective with one
// lane per string (low E on the left), and under it a fretboard whose strings
// line up with the lanes, showing where your fingers go for the current note.

import { CHORDS } from "../chords.js";
import { STRING_NAMES } from "../music.js";

export const STRING_COLORS = ["#ff4d6d", "#ffc63d", "#3fa7ff", "#ff8c42", "#3ddc97", "#b77dff"];
const LOOK = 5.5; // beats visible ahead of the line
const K = 2.4; // perspective strength
const BEHIND = 0.5; // beats drawn past the line

const RIGHT_HAND = { p: "thumb", i: "index", m: "middle", a: "ring" };

export class Highway {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.flashes = [];
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.assign(this, { W, H });
    this.horizonY = Math.max(92, H * 0.12);
    this.strikeY = H * 0.6;
    this.nearW = Math.min(W * 0.86, H * 0.95, 860);
    this.farW = this.nearW * 0.26;
    this.cx = W / 2;
    this.nutY = this.strikeY + Math.max(58, H * 0.085);
    this.fretH = Math.min((H - this.nutY - 22) / 4.2, this.nearW / 7);
  }

  // ---------- geometry ----------

  yAt(d) {
    const z = d / LOOK;
    const f = (1 - 1 / (1 + K * z)) / (1 - 1 / (1 + K));
    return this.strikeY - (this.strikeY - this.horizonY) * f;
  }

  widthAt(y) {
    return this.farW + ((this.nearW - this.farW) * (y - this.horizonY)) / (this.strikeY - this.horizonY);
  }

  edgeX(e, y) {
    const w = this.widthAt(y);
    return this.cx - w / 2 + (e * w) / 6;
  }

  laneX(s, y) {
    return this.edgeX(s + 0.5, y);
  }

  // ---------- effects ----------

  hit(note, clean, label) {
    const x = this.laneX(note.string, this.strikeY);
    const color = STRING_COLORS[note.string];
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const v = 160 + Math.random() * 360;
      this.particles.push({ x, y: this.strikeY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, age: 0, color, r: 2 + Math.random() * 3 });
    }
    this.rings.push({ x, y: this.strikeY, age: 0, life: 0.45, color });
    this.texts.push({ x, y: this.strikeY - 40, text: label ?? (clean ? "Nice" : "Got it"), color: clean ? "#fff" : color, age: 0, life: 0.8 });
  }

  wrong(string) {
    this.flashes.push({ string, age: 0, life: 0.35 });
  }

  banner(text) {
    this.texts.push({ x: this.cx, y: this.horizonY + 90, text, color: "#ffe28a", age: 0, life: 1.6, big: true });
  }

  step(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 700 * dt;
    }
    for (const list of [this.rings, this.texts, this.flashes]) for (const o of list) o.age += dt;
    const alive = (o) => o.age < o.life;
    this.particles = this.particles.filter(alive);
    this.rings = this.rings.filter(alive);
    this.texts = this.texts.filter(alive);
    this.flashes = this.flashes.filter(alive);
  }

  // ---------- drawing ----------

  // view: { pos, state, target, notes (upcoming, nearest first), beatsPerBar, chordAt(beat), t, dt, nextChord }
  draw(view) {
    const { g, W, H } = this;
    this.step(view.dt);
    const pulse = view.state === "playing" ? 0.25 : (Math.sin(view.t * 6) + 1) / 2;

    const bg = g.createRadialGradient(this.cx, this.strikeY, 50, this.cx, this.strikeY * 0.7, Math.max(W, H));
    bg.addColorStop(0, "#1b1f3a");
    bg.addColorStop(1, "#07080f");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    g.save();
    g.beginPath();
    g.rect(0, 0, W, this.strikeY + 30);
    g.clip();
    this.drawHighway(view, pulse);
    this.drawBeatLines(view);
    this.drawStrikeLine(view, pulse);
    this.drawNotes(view, pulse);
    g.restore();
    this.drawFretboard(view, pulse);
    this.drawEffects();
  }

  drawHighway(view, pulse) {
    const { g } = this;
    const top = this.horizonY;
    const bottom = this.strikeY + 26;
    for (let s = 0; s < 6; s++) {
      g.beginPath();
      g.moveTo(this.edgeX(s, top), top);
      g.lineTo(this.edgeX(s + 1, top), top);
      g.lineTo(this.edgeX(s + 1, bottom), bottom);
      g.lineTo(this.edgeX(s, bottom), bottom);
      g.closePath();
      const grad = g.createLinearGradient(0, top, 0, bottom);
      const isTarget = view.target && view.target.string === s;
      const flash = this.flashes.find((f) => f.string === s);
      const strength = flash ? 0.45 * (1 - flash.age / flash.life) : isTarget ? 0.1 + 0.12 * pulse : 0.035;
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, hexA(flash ? "#ff2d55" : STRING_COLORS[s], strength));
      g.fillStyle = "rgba(20,24,46,0.55)";
      g.fill();
      g.fillStyle = grad;
      g.fill();
    }
    g.lineWidth = 1;
    for (let e = 0; e <= 6; e++) {
      g.strokeStyle = e === 0 || e === 6 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)";
      g.beginPath();
      g.moveTo(this.edgeX(e, top), top);
      g.lineTo(this.edgeX(e, bottom), bottom);
      g.stroke();
    }
  }

  drawBeatLines(view) {
    const { g } = this;
    for (let b = Math.ceil(view.pos - BEHIND); b <= view.pos + LOOK; b++) {
      const d = b - view.pos;
      const y = this.yAt(d);
      const fade = Math.max(0, Math.min(1, (LOOK - d) / 1.2)) * (d < 0 ? 1 + d / BEHIND : 1);
      const bar = ((b % view.beatsPerBar) + view.beatsPerBar) % view.beatsPerBar === 0;
      g.strokeStyle = `rgba(255,255,255,${(bar ? 0.4 : 0.1) * fade})`;
      g.lineWidth = bar ? 2.5 : 1;
      g.beginPath();
      g.moveTo(this.edgeX(0, y), y);
      g.lineTo(this.edgeX(6, y), y);
      g.stroke();
      if (bar && d > -0.2) {
        const scale = this.widthAt(y) / this.nearW;
        g.font = `700 ${Math.round(16 + 30 * scale)}px system-ui, sans-serif`;
        g.textAlign = "right";
        g.textBaseline = "middle";
        g.fillStyle = `rgba(255,255,255,${0.85 * fade})`;
        g.fillText(view.chordAt(b), this.edgeX(0, y) - 12 - 10 * scale, y);
      }
    }
  }

  drawStrikeLine(view, pulse) {
    const { g } = this;
    const y = this.strikeY;
    const laneW = this.nearW / 6;
    g.save();
    g.shadowColor = "rgba(255,255,255,0.8)";
    g.shadowBlur = 18;
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(this.edgeX(0, y) - 6, y);
    g.lineTo(this.edgeX(6, y) + 6, y);
    g.stroke();
    g.restore();

    for (let s = 0; s < 6; s++) {
      const x = this.laneX(s, y);
      const isTarget = view.target?.string === s;
      const w = laneW * 0.78;
      const h = laneW * 0.34;
      g.save();
      roundRect(g, x - w / 2, y - h / 2, w, h, h / 2.5);
      g.fillStyle = "rgba(12,14,28,0.9)";
      g.fill();
      if (isTarget) {
        g.shadowColor = STRING_COLORS[s];
        g.shadowBlur = 18 + 22 * pulse;
        g.fillStyle = hexA(STRING_COLORS[s], 0.25 + 0.3 * pulse);
        g.fill();
      }
      g.lineWidth = isTarget ? 3 : 1.5;
      g.strokeStyle = hexA(STRING_COLORS[s], isTarget ? 1 : 0.45);
      g.stroke();
      g.restore();
      // string name in each pad; the target pad shows which right-hand finger plucks
      const label = isTarget && view.target.rightHand ? view.target.rightHand : STRING_NAMES[s];
      g.font = `700 ${Math.round(h * (isTarget ? 0.62 : 0.5))}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = isTarget ? "#fff" : hexA(STRING_COLORS[s], 0.8);
      g.fillText(label, x, y + 1);
    }
  }

  drawNotes(view, pulse) {
    const { g } = this;
    const notes = view.notes.filter((n) => n.beat - view.pos <= LOOK && n.beat - view.pos >= -BEHIND);
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const d = n.beat - view.pos;
      const y = this.yAt(d);
      const laneW = this.widthAt(y) / 6;
      const isTarget = n.index === view.target?.index;
      const grow = isTarget && view.state !== "playing" ? 1 + 0.1 * pulse : 1;
      const w = laneW * 0.74 * grow;
      const h = laneW * 0.4 * grow;
      const x = this.laneX(n.string, y);
      const alpha = Math.min(1, (LOOK - d) / 1.2);
      const color = STRING_COLORS[n.string];
      g.save();
      g.globalAlpha = alpha;
      g.shadowColor = color;
      g.shadowBlur = isTarget ? 24 : 10;
      roundRect(g, x - w / 2, y - h / 2, w, h, h / 3);
      const grad = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      grad.addColorStop(0, lighten(color, 0.35));
      grad.addColorStop(1, color);
      g.fillStyle = grad;
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = isTarget ? 2.5 : 1;
      g.strokeStyle = isTarget ? "#fff" : "rgba(255,255,255,0.5)";
      g.stroke();
      g.font = `800 ${Math.round(h * 0.7)}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineWidth = Math.max(2, h * 0.08);
      g.strokeStyle = "rgba(0,0,0,0.45)";
      g.strokeText(String(n.fret), x, y + 1);
      g.fillStyle = "#fff";
      g.fillText(String(n.fret), x, y + 1);
      g.restore();
    }
  }

  drawFretboard(view, pulse) {
    const { g } = this;
    const target = view.target;
    if (!target) return;
    const shape = CHORDS[target.chord];
    const y0 = this.nutY;
    const fh = this.fretH;
    const frets = 4;
    const xs = [0, 1, 2, 3, 4, 5].map((s) => this.laneX(s, this.strikeY));
    const laneW = this.nearW / 6;
    const left = xs[0] - laneW * 0.55;
    const right = xs[5] + laneW * 0.55;

    // neck
    g.save();
    const wood = g.createLinearGradient(0, y0, 0, y0 + frets * fh);
    wood.addColorStop(0, "#3b2a1e");
    wood.addColorStop(1, "#24180f");
    g.fillStyle = wood;
    roundRect(g, left, y0, right - left, frets * fh + 8, 8);
    g.fill();
    g.restore();

    // fret wires and numbers
    for (let f = 1; f <= frets; f++) {
      const y = y0 + f * fh;
      g.strokeStyle = "#b8b0a0";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(left, y);
      g.lineTo(right, y);
      g.stroke();
      g.font = "600 13px system-ui, sans-serif";
      g.textAlign = "right";
      g.textBaseline = "middle";
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.fillText(String(f), left - 10, y - fh / 2);
    }
    // inlay at the 3rd fret
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.beginPath();
    g.arc((left + right) / 2, y0 + 2.5 * fh, 6, 0, Math.PI * 2);
    g.fill();

    // nut
    g.fillStyle = "#efe6d2";
    g.fillRect(left, y0 - 5, right - left, 7);

    // strings
    xs.forEach((x, s) => {
      g.strokeStyle = hexA(STRING_COLORS[s], 0.75);
      g.lineWidth = 3.2 - s * 0.4;
      g.beginPath();
      g.moveTo(x, y0 - 2);
      g.lineTo(x, y0 + frets * fh + 8);
      g.stroke();
    });

    // the chord shape, with the note to play now lit up
    const r = Math.min(fh * 0.33, laneW * 0.3);
    shape.frets.forEach((fret, s) => {
      const x = xs[s];
      const isTarget = s === target.string;
      const color = STRING_COLORS[s];
      if (fret === null) {
        g.font = `700 ${Math.round(r * 1.1)}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = "rgba(255,255,255,0.4)";
        g.fillText("×", x, y0 - 22);
        return;
      }
      if (fret === 0) {
        g.save();
        g.lineWidth = isTarget ? 4 : 2;
        g.strokeStyle = isTarget ? color : "rgba(255,255,255,0.45)";
        if (isTarget) {
          g.shadowColor = color;
          g.shadowBlur = 16 + 18 * pulse;
        }
        g.beginPath();
        g.arc(x, y0 - 22, isTarget ? r * 0.75 : r * 0.5, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        return;
      }
      const y = y0 + (fret - 0.5) * fh;
      g.save();
      g.beginPath();
      g.arc(x, y, isTarget ? r * (1.08 + 0.08 * pulse) : r, 0, Math.PI * 2);
      if (isTarget) {
        g.shadowColor = color;
        g.shadowBlur = 20 + 20 * pulse;
        g.fillStyle = color;
      } else {
        g.fillStyle = "rgba(255,255,255,0.2)";
      }
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = 2;
      g.strokeStyle = isTarget ? "#fff" : "rgba(255,255,255,0.45)";
      g.stroke();
      g.restore();
      g.font = `800 ${Math.round(r * 1.05)}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = isTarget ? "#fff" : "rgba(255,255,255,0.85)";
      g.fillText(String(shape.fingers[s]), x, y + 1);
    });

    // chord name and what to do, left of the neck
    g.textAlign = "right";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#fff";
    g.font = `800 ${Math.round(fh * 0.9)}px system-ui, sans-serif`;
    g.fillText(target.chord, left - 34, y0 + fh * 1.1);
    g.font = "500 13px system-ui, sans-serif";
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillText("hold shape", left - 34, y0 + fh * 1.1 + 20);
    if (view.nextChord && view.nextChord !== target.chord) {
      g.fillStyle = "rgba(255,255,255,0.75)";
      g.font = "600 15px system-ui, sans-serif";
      g.fillText(`next: ${view.nextChord}`, left - 34, y0 + fh * 1.1 + 44);
    }

    // plain-words hint on the right
    g.textAlign = "left";
    g.font = "600 15px system-ui, sans-serif";
    g.fillStyle = STRING_COLORS[target.string];
    g.fillText(`${STRING_NAMES[target.string]} string`, right + 22, y0 + 18);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.font = "500 14px system-ui, sans-serif";
    const where = target.fret === 0 ? "open" : `fret ${target.fret}, finger ${target.finger}`;
    g.fillText(where, right + 22, y0 + 40);
    if (target.rightHand) g.fillText(`pluck with ${RIGHT_HAND[target.rightHand]}`, right + 22, y0 + 62);
  }

  drawEffects() {
    const { g } = this;
    for (const r of this.rings) {
      const k = r.age / r.life;
      g.strokeStyle = hexA(r.color, 1 - k);
      g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath();
      g.ellipse(r.x, r.y, 20 + 90 * k, 8 + 30 * k, 0, 0, Math.PI * 2);
      g.stroke();
    }
    for (const p of this.particles) {
      g.fillStyle = hexA(p.color, 1 - p.age / p.life);
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    for (const t of this.texts) {
      const k = t.age / t.life;
      g.font = `800 ${t.big ? 44 : 22}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = hexA(t.color, 1 - k * k);
      g.fillText(t.text, t.x, t.y - (t.big ? 20 : 60) * k);
    }
  }
}

// ---------- helpers ----------

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function hexA(hex, a) {
  if (hex.startsWith("rgb")) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * k);
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
