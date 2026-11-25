// The photographic chamber supplies the architecture. This second, low-resolution
// 2D surface supplies moving vapour, furnace light, reflections and airborne coal.
const TAU = Math.PI * 2;
const fract = value => value - Math.floor(value);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const a = fract(x), b = fract(y);
  const u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b);
  const upper = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
  const lower = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return upper * (1 - v) + lower * v;
}

function smokeVolume(seed) {
  const sprite = document.createElement('canvas');
  const side = 112;
  sprite.width = sprite.height = side;
  const ctx = sprite.getContext('2d');
  const density = new Float32Array(side * side);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const u = (x + .5) / side, v = (y + .5) / side;
      const envelope = Math.max(0, 1 - Math.hypot((u - .5) * 2, (v - .5) * 2));
      const turbulence = noise(u * 4 + seed, v * 4) * .55 +
        noise(u * 10, v * 10 + seed) * .3 + noise(u * 23 + seed, v * 23) * .15;
      density[y * side + x] = Math.min(1, Math.max(0, turbulence - .24) * 2.6 * envelope);
    }
  }
  const pixels = ctx.createImageData(side, side);
  for (let i = side; i < density.length; i++) {
    const light = Math.min(1, Math.max(0, .42 + (density[i] - density[i - side]) * 6));
    pixels.data.set([109 + 95 * light, 78 + 86 * light, 72 + 77 * light, density[i] * 156], i * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  return sprite;
}

export function createAtmosphere(canvas) {
  const ctx = canvas.getContext('2d', {alpha: true});
  if (!ctx) return {resize() {}, compose() {}, setActive() {}};
  let width = 1, height = 1, clock = 0, timer = 0, raf = 0, last = 0;
  let active = false, sprites, pose;
  const particles = Array.from({length: 92}, (_, i) => ({
    phase: hash(i, 3), drift: hash(i, 7), depth: hash(i, 11),
    source: hash(i, 15), speed: hash(i, 21), offset: hash(i, 29),
  }));

  const cinders = Array.from({length: 30}, (_, i) => ({
    phase: hash(i, 71), drift: hash(i, 83), speed: hash(i, 93), bank: i % 3,
  }));

  // These three outlets sit behind the lower and left shoulders of the actual
  // housing. The upper photographic layer occludes the particles as they rise.
  function paintMachineSparks(t) {
    if (!pose.hero) return;
    const w = width * pose.housingWidth, h = height * pose.housingHeight;
    for (const c of cinders) {
      const age = fract(t * (.30 + .18 * c.speed) + c.phase);
      const left = c.bank === 0;
      const ventX=pose.machineX*width+w*(left?-.42:-.21+.26*(c.bank-1));
      const ventY=pose.machineY*height+h*(left?.22:.49);
      const gust=.76+.24*Math.sin(t*.83+c.bank*2);
      // Hot fragments peel away in arcs; the metal shoulder hides the
      // beginning of the trajectory. Its outlet moves with the bearing.
      const dx=-(.04+c.drift*.17)*age*gust;
      const dy=-(.27+.18*c.speed)*age+.17*age*age;
      const x=ventX+w*dx,y=ventY+h*dy;
      if(x<-8||x>width+8||y<-8||y>height+8)continue;
      const light=Math.sin(age*Math.PI)*pose.hero*(.68+.32*gust);
      const r=Math.max(.56,height*(.00063+c.drift*.0014))*(1+.32*pose.heat);
      ctx.fillStyle = `rgba(255,67,9,${light * .38})`;
      ctx.beginPath();ctx.arc(x, y, r * 2.2, 0, TAU);ctx.fill();
      ctx.strokeStyle = `rgba(255,${Math.round(137 + c.speed * 87)},91,${light})`;
      ctx.lineWidth = r;ctx.beginPath();ctx.moveTo(x, y);
      ctx.lineTo(x+r*(1.1+c.drift*2),y+r*(1.8+c.speed*1.8-age*2.7));ctx.stroke();
    }
  }

  function glow(x, y, radiusX, radiusY, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(radiusX, radiusY);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(100,12,4,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  function paint() {
    if (!pose) return;
    if (!sprites) sprites = [smokeVolume(4), smokeVolume(9)];
    const t = clock, floor = pose.floor, heat=pose.heat||0;
    const furnaceX = width * pose.ventX, furnaceY = height * floor;
    const sun = .51 + .2 * Math.sin(t * 1.7) + .16 * Math.sin(t * 2.9 + .9) + .10 * Math.sin(t * 7.2);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    if (pose.hero > 0) {
      glow(width * (pose.coreX - .048), height * (pose.coreY + .19), height * (.33+heat*.22), height * (.19+heat*.14),
        'rgba(215,22,20,' + (.08 + sun * .19 + heat*.57) * pose.hero + ')');
    }
    glow(furnaceX, furnaceY, width * .24, height * .21, 'rgba(246,67,17,' + (.13 + sun * .24) + ')');
    // A pocket of reflected furnace light follows the aperture into the room.
    // It broadens and cools on the metal floor as the near bearing recedes.
    if(heat>.005){
      const poolX=width*(pose.coreX*.68+pose.ventX*.32);
      glow(poolX,height*(floor+.18),width*(.09+.14*heat),height*(.012+.022*heat),
        'rgba(232,71,32,'+((.13+sun*.09)*heat)+')');
    }
    glow(width * .32, height * (.90 - pose.travel * .08), width * .37, height * .12,
      'rgba(209,34,10,' + (.11 + sun * .12) + ')');
    // The floor receives stretched, softer moving highlights from the furnace.
    for (let i = 0; i < 4; i++) {
      const ripple = Math.sin(t * (.51 + i * .12) + i * 2);
      glow(furnaceX + ripple * width * .014, furnaceY + height * (.07 + .049 * i),
        width * (.018 + .012 * i), height * .012, 'rgba(252,87,31,' + (.13 + sun * .10) + ')');
    }
    // A broad reflection travels over the foreground metal, beyond the vent's ripples.
    const sweep=.72*Math.sin(t*.36+pose.travel*7)+.28*Math.sin(t*.17);
    glow(width*(.64+.17*sweep-pose.travel*.12),height*(.83+.025*Math.cos(t*.46)),
      width*.14,height*.023,'rgba(203,159,139,'+(.085+sun*.11+heat*.12)+')');
    // Backlit smoke rises in separate depth planes: far vent, floor and core.
    for (let i = 0; i < 24; i++) {
      const bank = i % 3;
      const life = fract(t * (.065 + .013 * bank) + hash(i, 41));
      const startX = bank === 0 ? pose.ventX : bank === 1 ? .26 : pose.coreX;
      const startY = bank === 0 ? floor : bank === 1 ? .99 : pose.coreY + .15;
      const current=Math.sin(.21*t+i*.92)*(.010+bank*.014);
      const drift = current + (.09 + .10 * life) * Math.sin(i * 3.2 + life * 2.8);
      const x = (startX + drift - life * .12 + pose.travel * (bank === 0 ? .008 : -.025)) * width;
      const y = (startY - life * (.31 + bank * .034) + heat*bank*.018) * height;
      const size = (.10 + life * .22 + bank * .018) * Math.min(width * 1.2, height * 1.8);
      // Keep backlit haze in the vent and along the lower shoulder. A veil at
      // the mouth thins as the lens travels through it.
      const alpha=Math.sin(Math.PI*life)*(bank===2?pose.hero*(.28+heat*.16):bank===1?.33:.49);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(i*6.25+t*(.045+.035*bank))*.39);
      ctx.drawImage(sprites[i % 2], -size * .69, -size * .5, size * (1.38+.11*Math.sin(life*4+i)), size);
      ctx.restore();
    }

    // The same hot particle moves farther and falls out of focus nearer the lens.
    for (const p of particles) {
      const age = fract(t * (.105 + .078 * p.speed) + p.phase);
      const core = p.offset > .58 && pose.hero > .1;
      const sourceX = core ? pose.coreX + (p.source - .5) * .125 :
        p.source < .54 ? .06 + p.source * .64 : pose.ventX + (p.source - .75) * .29;
      const sourceY = core ? pose.coreY + .12 : p.source < .54 ? .98 : floor + .06;
      const dx = .035 * Math.sin(age * 5 + p.drift * TAU) + (.03 + p.drift * .09) * age;
      const x = (sourceX + dx - pose.travel * .022 * p.depth) * width;
      const y = (sourceY - age * (.16 + .32 * p.depth)) * height;
      const alpha = Math.sin(Math.PI * age) * (.45 + .53 * p.depth) * (core ? pose.hero : 1);
      const r = Math.max(.35, (.0007 + p.depth * p.depth * .002) * height);
      ctx.fillStyle = 'rgba(255,83,16,' + alpha * .32 + ')';
      ctx.beginPath();ctx.arc(x, y, r * 2.2, 0, TAU);ctx.fill();
      ctx.strokeStyle = 'rgba(255,' + Math.round(107 + p.depth * 99) + ',103,' + alpha + ')';
      ctx.lineWidth = Math.max(.63, r);
      ctx.beginPath();ctx.moveTo(x, y);ctx.lineTo(x - r * .62, y + r * (1.3 + p.depth));ctx.stroke();
    }
    paintMachineSparks(t);
    ctx.globalCompositeOperation = 'source-over';
    canvas.dataset.frames = String(Number(canvas.dataset.frames || 0) + 1);
  }

  function tick(now) {
    raf = 0;
    if (!active || document.hidden) return;
    if (last) clock += Math.min((now - last) / 1000, .15);
    last = now;
    paint();
    // No full-resolution continuous WebGL pass is needed to move the atmosphere.
    timer = setTimeout(() => { if (active) raf = requestAnimationFrame(tick); }, 45);
  }
  return {
    resize(w, h) {
      const scale = Math.min(.78, 900 / w, 640 / h);
      width = canvas.width = Math.max(1, Math.round(w * scale));
      height = canvas.height = Math.max(1, Math.round(h * scale));
    },
    compose(next) { pose = next; },
    setActive(next) {
      if (active === next) return;
      active = next;
      clearTimeout(timer);cancelAnimationFrame(raf);last = 0;
      if (active) raf = requestAnimationFrame(tick);
    },
  };
}
