// ----------------------------------------------------
// Waypoint Path Calculation Across the BAR
// ----------------------------------------------------
function getPointCenterCoords(index) {
  let container = canvas.parentElement;
  let w = container ? container.clientWidth : canvas.clientWidth;
  let h = container ? container.clientHeight : canvas.clientHeight;
  let frameBorder = 14;
  let rightTrayW = 54;
  let barW = 48, halfW = (w - barW - rightTrayW) / 2, ptW = (halfW - frameBorder) / 6;

  if (index === 24) return { x: halfW + barW / 2, y: 45 };
  if (index === -1) return { x: halfW + barW / 2, y: h - 45 };

  let left = 0, isTop = index >= 12;
  if (index <= 5) left = halfW + barW + (5 - index) * ptW;
  else if (index <= 11) left = frameBorder + (11 - index) * ptW;
  else if (index <= 17) left = frameBorder + (index - 12) * ptW;
  else left = halfW + barW + (index - 18) * ptW;

  let pt = state.points[index];
  let count = pt ? pt.count : 0;
  let r = Math.min(ptW * 0.44, 17);
  let cy = isTop ? (frameBorder + 18 + r + count * r * 1.7) : (h - frameBorder - 18 - r - count * r * 1.7);

  return { x: left + ptW / 2, y: cy };
}

function getPointCenter(idx) {
  let container = canvas.parentElement;
  let w = container ? container.clientWidth : canvas.clientWidth;
  let h = container ? container.clientHeight : canvas.clientHeight;
  let frameBorder = 14;
  let rightTrayW = 54;
  let barW = 48, halfW = (w - barW - rightTrayW) / 2, ptW = (halfW - frameBorder) / 6;

  // BAR indices
  if (idx === 24 && state.turn === 'white') return { x: halfW + barW / 2, y: 45 };
  if (idx === -1 && state.turn === 'black') return { x: halfW + barW / 2, y: h - 45 };

  // Bear-Off targets (Trays)
  if (idx === -1 && state.turn === 'white') return { x: w - rightTrayW / 2, y: h - 45 };
  if (idx === 24 && state.turn === 'black') return { x: w - rightTrayW / 2, y: 45 };

  let isTop = idx >= 12;
  let left = frameBorder;
  if (idx >= 0 && idx <= 5) left = halfW + barW + (5 - idx) * ptW;
  else if (idx >= 6 && idx <= 11) left = frameBorder + (11 - idx) * ptW;
  else if (idx >= 12 && idx <= 17) left = frameBorder + (idx - 12) * ptW;
  else if (idx >= 18 && idx <= 23) left = halfW + barW + (idx - 18) * ptW;

  let x = left + ptW / 2;
  let y = isTop ? frameBorder + 45 : h - frameBorder - 45;
  return { x, y };
}

function buildWaypointPath(from, to) {
  let container = canvas.parentElement;
  let w = container ? container.clientWidth : canvas.clientWidth;
  let h = container ? container.clientHeight : canvas.clientHeight;
  let rightTrayW = 54;
  let barLeft = (w - 48 - rightTrayW) / 2;
  let barRight = barLeft + 48;
  let barCenter = barLeft + 24;

  let start = getPointCenterCoords(from);
  let dest = getPointCenterCoords(to);

  let startOnLeft = (start.x < barLeft);
  let destOnRight = (dest.x > barRight);
  let startOnRight = (start.x > barRight);
  let destOnLeft = (dest.x < barLeft);

  let crossesBar = (startOnLeft && destOnRight) || (startOnRight && destOnLeft) || from === 24 || from === -1 || to === 24 || to === -1;

  if (!crossesBar) {
    let p1 = getPointCenter(from);
    let p2 = getPointCenter(to);
    let midX = (p1.x + p2.x) / 2;
    let midY = (p1.y + p2.y) / 2 - 40;
    return [p1, { x: midX, y: midY }, p2];
  }

  let barNearX = startOnLeft ? barLeft - 10 : barRight + 10;
  let barFarX = startOnLeft ? barRight + 10 : barLeft - 10;

  return [
    start,
    { x: start.x, y: start.y + (start.y < h/2 ? 35 : -35) },
    { x: barNearX, y: h / 2 + (start.y < h/2 ? -20 : 20) },
    { x: barCenter, y: h / 2 - 50 }, // Apex Jump OVER the BAR!
    { x: barFarX, y: h / 2 + (dest.y < h/2 ? -20 : 20) },
    { x: dest.x, y: dest.y + (dest.y < h/2 ? 35 : -35) },
    dest
  ];
}

function interpolateWaypoints(waypoints, ratio) {
  if (!waypoints || waypoints.length === 0) return { x: 0, y: 0 };
  if (waypoints.length === 1 || ratio <= 0) return { x: waypoints[0].x, y: waypoints[0].y };
  if (ratio >= 1.0) return { x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y };

  let n = waypoints.length - 1;
  let scaled = ratio * n;
  let idx = Math.floor(scaled);
  if (idx >= n) idx = n - 1;
  let subRatio = scaled - idx;

  let pA = waypoints[idx] || waypoints[0];
  let pB = waypoints[idx + 1] || pA;

  let x = pA.x + (pB.x - pA.x) * subRatio;
  let y = pA.y + (pB.y - pA.y) * subRatio;

  if (isNaN(x) || isNaN(y)) {
    return { x: waypoints[0].x, y: waypoints[0].y };
  }
  return { x, y };
}

// ----------------------------------------------------
// True 3D Software Renderer for 6-Faced Physical Cubes
// ----------------------------------------------------
class Vector3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  rotate(rx, ry, rz) {
    let cx = Math.cos(rx), sx = Math.sin(rx);
    let y1 = this.y * cx - this.z * sx, z1 = this.y * sx + this.z * cx;

    let cy = Math.cos(ry), sy = Math.sin(ry);
    let x2 = this.x * cy + z1 * sy, z2 = -this.x * sy + z1 * cy;

    let cz = Math.cos(rz), sz = Math.sin(rz);
    let x3 = x2 * cz - y1 * sz, y3 = x2 * sz + y1 * cz;

    return new Vector3(x3, y3, z2);
  }
}

function renderTrue3DCube(cx, cy, cubeSize, rotX, rotY, rotZ, zHeight, opacity) {
  let s = cubeSize / 2.2;
  let vertices = [
    new Vector3(-s, -s, -s), new Vector3( s, -s, -s),
    new Vector3( s,  s, -s), new Vector3(-s,  s, -s),
    new Vector3(-s, -s,  s), new Vector3( s, -s,  s),
    new Vector3( s,  s,  s), new Vector3(-s,  s,  s)
  ];

  let rotated = vertices.map(v => v.rotate(rotX, rotY, rotZ));

  const faces = [
    { idx: [4, 5, 6, 7], norm: new Vector3(0, 0, 1), val: 1 },  // Front (+Z)
    { idx: [1, 0, 3, 2], norm: new Vector3(0, 0, -1), val: 6 }, // Back (-Z)
    { idx: [0, 1, 5, 4], norm: new Vector3(0, -1, 0), val: 2 }, // Top (-Y)
    { idx: [7, 6, 2, 3], norm: new Vector3(0, 1, 0), val: 5 },  // Bottom (+Y)
    { idx: [5, 1, 2, 6], norm: new Vector3(1, 0, 0), val: 3 },  // Right (+X)
    { idx: [0, 4, 7, 3], norm: new Vector3(-1, 0, 0), val: 4 }  // Left (-X)
  ];

  let lightDir = new Vector3(-0.4, -0.6, 0.7);

  let renderable = [];
  faces.forEach(f => {
    let rNorm = f.norm.rotate(rotX, rotY, rotZ);
    if (rNorm.z > 0.05) {
      let avgZ = (rotated[f.idx[0]].z + rotated[f.idx[1]].z + rotated[f.idx[2]].z + rotated[f.idx[3]].z) / 4;
      let lightInt = Math.max(0.40, Math.min(1.0, 0.55 + (rNorm.x * lightDir.x + rNorm.y * lightDir.y + rNorm.z * lightDir.z) * 0.45));
      renderable.push({ face: f, avgZ, lightInt });
    }
  });

  renderable.sort((a, b) => a.avgZ - b.avgZ);

  let focal = 160.0;
  function project(v) {
    let scale = focal / (focal + v.z + 100.0);
    return {
      x: cx + v.x * scale,
      y: cy - zHeight + v.y * scale
    };
  }

  let isGrounded = zHeight < 0.5;
  let shadowScale = isGrounded ? 1.0 : Math.max(0.4, Math.min(1.2, 1.0 - zHeight / 140.0));
  let shadowOpacity = isGrounded ? 0.75 : Math.max(0.15, Math.min(0.75, 0.75 - zHeight / 160.0)) * opacity;
  let shadowOffsetY = isGrounded ? 14 : (14 + zHeight * 0.35);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + zHeight * 0.1, cy + shadowOffsetY, cubeSize * 0.48 * shadowScale, cubeSize * 0.18 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = opacity;

  renderable.forEach(r => {
    let pts = r.face.idx.map(i => project(rotated[i]));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();

    let dTheme = diceThemes[currentDiceTheme] || diceThemes.ivory;
    ctx.fillStyle = dTheme.bg;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = dTheme.border;
    ctx.stroke();

    draw3DPips(pts, r.face.val, r.lightInt, dTheme.dot);
  });

  ctx.restore();
}

function draw3DPips(quad, val, light, dotColor) {
  let center = {
    x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
    y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4
  };

  let uVec = { x: (quad[1].x - quad[0].x) * 0.5, y: (quad[1].y - quad[0].y) * 0.5 };
  let vVec = { x: (quad[3].x - quad[0].x) * 0.5, y: (quad[3].y - quad[0].y) * 0.5 };

  const pipOffsets = {
    1: [[0, 0]],
    2: [[-0.55, -0.55], [0.55, 0.55]],
    3: [[-0.55, -0.55], [0, 0], [0.55, 0.55]],
    4: [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]],
    5: [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]],
    6: [[-0.55, -0.65], [0.55, -0.65], [-0.55, 0], [0.55, 0], [-0.55, 0.65], [0.55, 0.65]]
  };

  let offsets = pipOffsets[val] || [[0, 0]];
  ctx.fillStyle = dotColor || '#000000';

  let quadWidth = Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y);
  let r = Math.max(2.0, Math.min(4.5, quadWidth * 0.08));

  offsets.forEach(off => {
    let px = center.x + uVec.x * off[0] + vVec.x * off[1];
    let py = center.y + uVec.y * off[0] + vVec.y * off[1];
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  });
}
