import { leagueColor } from "./leagues";

// « Autocollants » pour les graphiques D3

let uid = 0;

export const initialsOf = (name = "?") =>
  name
    .replace(/^(FC|AC|AS|SC|RC|US|1\.)\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Ajoute un sticker dans chaque <g> de la sélection D3 `sel` (déjà positionné au centre voulu).
export function appendSticker(sel, get, r = 12) {
  const radius = typeof r === "function" ? r : () => r;
  sel.each(function draw(d) {
    const g = this.ownerSVGElement ? this : null;
    if (!g) return;
    const { href, label, league, kind = "crest", ring } = get(d);
    const R = radius(d);
    const svg = g.ownerSVGElement;
    // Un clipPath circulaire propre à ce sticker (rayon et position locales)
    let defs = svg.querySelector("defs.stickers");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.setAttribute("class", "stickers");
      svg.prepend(defs);
    }
    const id = `stk-${(uid += 1)}`;
    const clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clip.setAttribute("id", id);
    const cc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cc.setAttribute("r", R);
    clip.appendChild(cc);
    defs.appendChild(clip);

    const ns = "http://www.w3.org/2000/svg";
    const wrap = document.createElementNS(ns, "g");
    wrap.setAttribute("class", "sticker");
    wrap.style.filter = "drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.3))";
    const color = leagueColor(league);

    const base = document.createElementNS(ns, "circle");
    base.setAttribute("r", R + Math.max(1.5, R * 0.14));
    base.setAttribute("fill", ring || "#ffffff");
    wrap.appendChild(base);

    const bg = document.createElementNS(ns, "circle");
    bg.setAttribute("r", R);
    bg.setAttribute("fill", href ? (kind === "face" ? color : "#ffffff") : color);
    wrap.appendChild(bg);

    if (href) {
      const img = document.createElementNS(ns, "image");
      const pad = kind === "crest" ? R * 0.22 : 0;
      img.setAttribute("href", href);
      img.setAttribute("x", -R + pad);
      img.setAttribute("y", -R + pad);
      img.setAttribute("width", (R - pad) * 2);
      img.setAttribute("height", (R - pad) * 2);
      img.setAttribute("preserveAspectRatio", kind === "face" ? "xMidYMin slice" : "xMidYMid meet");
      img.setAttribute("clip-path", `url(#${id})`);
      wrap.appendChild(img);
    } else {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dy", "0.35em");
      t.setAttribute("fill", "#ffffff");
      t.setAttribute("font-weight", "800");
      t.setAttribute("font-size", Math.max(7, R * 0.72));
      t.textContent = initialsOf(label);
      wrap.appendChild(t);
    }
    const title = document.createElementNS(ns, "title");
    title.textContent = label;
    wrap.appendChild(title);
    g.appendChild(wrap);
  });
  return sel;
}
