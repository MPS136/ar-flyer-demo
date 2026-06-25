import { writeFileSync } from "node:fs";

// Canvas 560x512. Hexagonal "C" ring (open on right) + gold trapezoid accent.
// The iAcademia isotipo is a hexagonal ring open on the right side with a
// separate gold trapezoidal accent to the right of the opening.
const cx = 256, cy = 256;
const R = 200;   // outer radius
const r = 132;   // inner radius (ring thickness = R - r)
const rot = Math.PI / 6; // flat-top hexagon orientation

// Generate hexagon vertices at given radius
const hexPts = (radius) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + i * (Math.PI / 3);
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return pts;
};

// Hexagon vertices (flat-top: vertex at right = index 0 with rot=PI/6)
// With rot=PI/6: index 0 is top-right, going clockwise:
// 0: top-right, 1: top, 2: top-left, 3: bottom-left, 4: bottom, 5: bottom-right
// The gap (open side) is on the RIGHT between vertices 0 and 5 (outer)
// and between vertices 0 and 5 (inner, reversed)

const outer = hexPts(R);
const inner = hexPts(r);

// Build "C" shape: outer ring goes from vertex 0 clockwise around to vertex 5
// skipping the right-side segment, then inner ring goes from vertex 5 back to vertex 0
// Outer: 0 -> 1 -> 2 -> 3 -> 4 -> 5 (skip 5->0 segment)
// Inner: 5 -> 4 -> 3 -> 2 -> 1 -> 0 (skip 0->5 segment, reversed)

// With rot=PI/6 (30 deg), vertex 0 is at angle 30 deg (upper right)
// and vertex 5 is at angle 30+300 = 330 deg (lower right)
// This creates a C-shape opening to the right

const fmt = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

// C-shape path: start at outer[0], go around outer[1..5], then cut inward,
// go around inner in reverse [5..0], close.
let cPath = `M ${fmt(outer[0])}`;
for (let i = 1; i <= 5; i++) cPath += ` L ${fmt(outer[i])}`;
// Connect to inner at vertex 5
cPath += ` L ${fmt(inner[5])}`;
// Traverse inner in reverse (5->4->3->2->1->0)
for (let i = 4; i >= 0; i--) cPath += ` L ${fmt(inner[i])}`;
// Close back to outer[0]
cPath += " Z";

// Gold trapezoid on the right side: fills the gap in the C opening.
// The C opening spans from Y~156 to Y~356 (200px height, half-height=100).
// Gold is taller at its left edge and tapers on the right, matching the reference.
const goldX1 = cx + R * 0.87;  // left edge, near the outer vertex X
const goldX2 = cx + R * 1.18;  // right edge, extends slightly beyond outer radius
const goldTopH = 100;           // half-height at left edge (full gap height)
const goldBotH = 74;            // half-height at right edge (tapers inward)

const gold =
  `M ${goldX1.toFixed(2)},${(cy - goldTopH).toFixed(2)} ` +
  `L ${goldX2.toFixed(2)},${(cy - goldBotH).toFixed(2)} ` +
  `L ${goldX2.toFixed(2)},${(cy + goldBotH).toFixed(2)} ` +
  `L ${goldX1.toFixed(2)},${(cy + goldTopH).toFixed(2)} Z`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 512">
  <path d="${cPath}" fill="#235a97"/>
  <path d="${gold}" fill="#efa320"/>
</svg>
`;

writeFileSync(new URL("../assets/iacademia-isotipo.svg", import.meta.url), svg);
console.log("wrote assets/iacademia-isotipo.svg");
