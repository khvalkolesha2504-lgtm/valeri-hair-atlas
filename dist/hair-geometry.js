import * as T from "./vendor/three.module.js";
// All positions are diagrammatic. The model represents a shaft, not a follicle.
export function mergeGeometry(list) {
  let len = 0;
  for (const g of list) len += g.index ? g.index.count : g.attributes.position.count;
  const p = new Float32Array(len * 3),
    n = new Float32Array(len * 3),
    uv = new Float32Array(len * 2),
    c = new Float32Array(len * 3).fill(1);
  let offset = 0;
  for (const source of list) {
    const g = source.index ? source.toNonIndexed() : source;
    p.set(g.attributes.position.array, offset * 3);
    n.set(g.attributes.normal.array, offset * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, offset * 2);
    if (g.attributes.color) c.set(g.attributes.color.array, offset * 3);
    offset += g.attributes.position.count;
    if (g !== source) g.dispose();
    source.dispose();
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(p, 3));
  g.setAttribute("normal", new T.BufferAttribute(n, 3));
  g.setAttribute("uv", new T.BufferAttribute(uv, 2));
  g.setAttribute("color", new T.BufferAttribute(c, 3));
  g.computeBoundingSphere();
  return g;
}
// Slight tone variation per tile / cell, so neighbouring parts do not read as one plastic surface.
function paint(g, shade) {
  const c = new Float32Array(g.attributes.position.count * 3).fill(shade);
  g.setAttribute("color", new T.BufferAttribute(c, 3));
  return g;
}
const noise = (a, b = 0) => (Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
function tile(angle, y, r, raised, seed) {
  const p = [],
    uv = [],
    ix = [],
    nx = 14,
    ny = 6;
  for (let side = 0; side < 2; side++)
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++) {
        const u = i / nx,
          v = j / ny,
          t = angle + (u - 0.5) * 0.43;
        const scallop = Math.sin(Math.PI * u);
        const radius = r + side * 0.016 + Math.sin(v * Math.PI) * 0.013 + raised * Math.pow(v, 3);
        const yy = y + v * 0.38 + scallop * 0.085 * v + 0.009 * noise(seed + i, j) * v;
        const rr = radius + Math.sin(t * 22 + y * 35) * 0.0015;
        p.push(Math.sin(t) * rr, yy, Math.cos(t) * rr);
        uv.push(u, v);
      }
  const stride = nx + 1,
    count = (nx + 1) * (ny + 1);
  for (let side = 0; side < 2; side++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = side * count + j * stride + i;
        if (side) ix.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
        else ix.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
      }
  for (let i = 0; i < nx; i++) {
    let a = i,
      b = a + 1;
    ix.push(a, b, a + count, b, b + count, a + count);
    a = ny * stride + i;
    b = a + 1;
    ix.push(a, a + count, b, b, a + count, b + count);
  }
  for (let j = 0; j < ny; j++)
    for (const k of [0, nx]) {
      const a = j * stride + k,
        b = (j + 1) * stride + k;
      ix.push(a, a + count, b, b, a + count, b + count);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}
export function shell(inner, outer, height, start = 0, arc = Math.PI * 2) {
  const p = [],
    uv = [],
    ix = [],
    segments = 96;
  for (let surface = 0; surface < 4; surface++) {
    const base = p.length / 3;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i <= segments; i++) {
        const a = start + (i / segments) * arc;
        let r, y;
        if (surface < 2) {
          r = surface ? inner : outer;
          y = (j - 0.5) * height;
        } else {
          r = j ? inner : outer;
          y = (surface === 2 ? 0.5 : -0.5) * height;
        }
        p.push(Math.sin(a) * r, y, Math.cos(a) * r);
        uv.push(i / segments, j);
      }
    for (let i = 0; i < segments; i++) {
      const a = base + i,
        b = a + segments + 1;
      if (surface === 0 || surface === 3) ix.push(a, b, a + 1, a + 1, b, b + 1);
      else ix.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  if (arc < Math.PI * 2 - 0.01)
    for (let side = 0; side < 2; side++) {
      const a = start + side * arc,
        base = p.length / 3;
      for (const [r, y] of [
        [inner, -height / 2],
        [outer, -height / 2],
        [inner, height / 2],
        [outer, height / 2],
      ]) {
        p.push(Math.sin(a) * r, y, Math.cos(a) * r);
        uv.push(0, 0);
      }
      ix.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}
// Keratin fibrils twist gently along the cell instead of running as straight rods.
class Fibril extends T.Curve {
  constructor(x, z, r, phase, y0, h) {
    super();
    Object.assign(this, { x, z, r, phase, y0, h });
  }
  getPoint(t, target = new T.Vector3()) {
    const a = this.phase + t * this.h * 1.6;
    return target.set(
      this.x + Math.sin(a) * this.r,
      this.y0 + t * this.h,
      this.z + Math.cos(a) * this.r,
    );
  }
}
export function createShaft({ mode = "cut", damage = 0, type = "chemical", short = false } = {}) {
  const buckets = {
    cuticle: [],
    cortex: [],
    fibers: [],
    medulla: [],
    pigment: [],
    lipids: [],
    film: [],
  };
  const cross = mode === "cross",
    whole = mode === "whole",
    height = cross ? 0.8 : short ? 4.7 : 5.5,
    bottom = -height / 2,
    rows = cross ? 2 : Math.ceil(height / 0.27),
    front = (a) => Math.cos(a) > 0.25;
  const rand = (a, b) => Math.abs(noise(a, b));
  // Thin lipid film over intact cuticle; it is lost first when the surface is damaged.
  const healthy = damage < 0.15;
  if (cross) {
    const shells = damage > 0.5 ? 3 : 6;
    for (let i = 0; i < shells; i++) {
      const g = shell(0.84 + i * 0.022, 0.86 + i * 0.022, height, 0, Math.PI * 2);
      buckets[i % 2 ? "lipids" : "cuticle"].push(g);
    }
  } else {
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < 16; col++) {
        const a = (col / 16) * Math.PI * 2 + (row % 2) * 0.195,
          y = bottom + row * 0.27;
        const opening = !whole && front(a) && y > -0.8;
        if (opening) continue;
        const n = rand(row + 2, col + 5);
        if (damage > 0.5 && n > 1 - (damage - 0.5) * 0.65) continue;
        const raise = damage * (0.04 + n * 0.28) * (type === "friction" ? 1.4 : 1);
        buckets.cuticle.push(
          paint(
            tile(a, y, 0.97, raise, row * 16 + col),
            Math.min(1.15, 0.88 + rand(col + 9, row) * 0.18 + raise * 0.5),
          ),
        );
      }
    for (let i = 0; i < 5; i++) {
      const g = shell(0.84 + i * 0.022, 0.858 + i * 0.022, height, 0.92, Math.PI * 2 - 1.84);
      if (whole) {
        g.dispose();
        continue;
      }
      buckets[i % 2 ? "lipids" : "cuticle"].push(g);
    }
    if (healthy) {
      if (whole) buckets.film.push(shell(1.03, 1.04, height));
      else {
        const lowH = -0.8 - bottom,
          upH = height - lowH;
        const low = shell(1.03, 1.04, lowH);
        low.translate(0, bottom + lowH / 2, 0);
        const up = shell(1.03, 1.04, upH, 1.32, Math.PI * 2 - 2.64);
        up.translate(0, -0.8 + upH / 2, 0);
        buckets.film.push(low, up);
      }
    }
  }
  // A cellular matrix, visible beneath cuticle; open sector permits inspection.
  let matrix = shell(
    0.2,
    0.835,
    height - 0.025,
    whole ? 0 : 0.95,
    whole ? Math.PI * 2 : Math.PI * 2 - 1.9,
  );
  buckets.cortex.push(matrix);
  for (let ring = 1; ring <= 4; ring++) {
    const count = ring * 10,
      radius = ring * 0.177;
    for (let j = 0; j < count; j++) {
      if (damage > 0.3 && rand(ring * 13 + j, 7) < (damage - 0.3) * 0.6) continue;
      const a = (j / count) * Math.PI * 2 + 0.05 * ring,
        x = Math.sin(a) * radius,
        z = Math.cos(a) * radius;
      let h = height;
      if (!whole && !cross && front(a))
        h =
          height -
          [0.35, 1.05, 1.8, 2.5][ring - 1] * (0.82 + 0.18 * Math.cos(a)) -
          rand(j, ring * 3) * 0.28;
      const yy = bottom + h / 2;
      const split = damage > 0.55 && type === "friction";
      const move = split ? (damage - 0.55) * 0.35 : 0;
      let cell = new T.CylinderGeometry(0.054, 0.054, h, 16, 1);
      cell.translate(x + Math.sign(x) * move, yy, z);
      buckets.cortex.push(paint(cell, 0.86 + rand(j, ring + 9) * 0.2));
      for (let k = 0; k < 4; k++) {
        const f = new T.TubeGeometry(
          new Fibril(x + Math.sign(x) * move, z, 0.048, (k * Math.PI) / 2 + j, bottom, h + 0.008),
          Math.max(2, Math.ceil(h * 2.5)),
          0.012,
          4,
          false,
        );
        buckets.fibers.push(f);
      }
      if ((ring + j) % 3 === 0) {
        for (let k = 0; k < (cross ? 1 : 3); k++) {
          const py = bottom + 0.12 + rand(j + k, ring) * Math.max(0.05, h - 0.2);
          const g = new T.SphereGeometry(0.022 + rand(k, j) * 0.013, 10, 7);
          g.scale(0.8, 1.6, 0.8);
          g.translate(x + 0.047, py, z + 0.047);
          buckets.pigment.push(g);
        }
      }
    }
  }
  // Medulla: an uneven core with darker air-filled pockets rather than a smooth rod.
  const coreH = cross ? height : height + 0.25,
    steps = Math.max(4, Math.round(coreH * 14)),
    profile = [new T.Vector2(0, 0)];
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * coreH;
    profile.push(new T.Vector2(0.148 + 0.016 * Math.sin(y * 11 + 1) + 0.012 * rand(i, 3), y));
  }
  profile.push(new T.Vector2(0, coreH));
  const core = new T.LatheGeometry(profile, 36);
  core.translate(0, bottom, 0);
  buckets.medulla.push(core);
  const pockets = cross ? 4 : 40;
  for (let i = 0; i < pockets; i++) {
    const a = rand(i, 11) * Math.PI * 2,
      r = 0.07 + rand(i, 12) * 0.06;
    const g = new T.SphereGeometry(0.04 + rand(i, 13) * 0.035, 10, 7);
    g.scale(1, 0.6, 1);
    g.translate(Math.sin(a) * r, bottom + 0.06 + rand(i, 14) * (coreH - 0.12), Math.cos(a) * r);
    buckets.medulla.push(paint(g, 0.62));
  }
  return Object.fromEntries(
    Object.entries(buckets)
      .filter(([k, v]) => v.length)
      .map(([k, v]) => [k, mergeGeometry(v)]),
  );
}
