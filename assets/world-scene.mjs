/* The installation's wire field. No autonomous loop or WebGL context. */
export function createScene(canvas) {
  const context = canvas.getContext('2d', {alpha: true});
  let width = 0, height = 0, frames = 0;
  if (!context) { canvas.dataset.sceneState = 'fallback'; return {resize(){}, draw(){}}; }
  canvas.dataset.sceneState = 'ready';
  canvas.dataset.renderer = 'Canvas2D / on demand';
  return {
    resize(w, h) {
      width = w; height = h;
      const ratio = Math.min(devicePixelRatio || 1, w < 600 ? 1.25 : 1.5);
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    },
    draw({core, nodes, energy, progress, rgb, near}) {
      context.clearRect(0, 0, width, height);
      const x = core.x * width, y = core.y * height;
      context.lineWidth = .8;
      for (const node of nodes) {
        if (node.opacity < .02) continue;
        const nx = node.x * width, ny = node.y * height;
        const light = near === node.index ? .75 : .13;
        const wireColor = near === node.index ? '237,130,148' : rgb;
        context.lineWidth = near === node.index ? 1.5 : .8;
        context.strokeStyle = `rgba(${wireColor},${(light * node.opacity * energy).toFixed(3)})`;
        context.beginPath(); context.moveTo(x,y);
        context.bezierCurveTo(x+(nx-x)*.45,y,nx-(nx-x)*.18,ny,nx,ny);context.stroke();
        // Data pulses follow scroll; leaving the page still never advances them.
        const t = (progress * .7 + node.index * .137) % 1;
        const px = (1-t)**3*x+3*(1-t)**2*t*(x+(nx-x)*.45)+3*(1-t)*t*t*(nx-(nx-x)*.18)+t**3*nx;
        const py = (1-t)**3*y+3*(1-t)**2*t*y+3*(1-t)*t*t*ny+t**3*ny;
        context.fillStyle = `rgba(${wireColor},${(.7*node.opacity*energy).toFixed(3)})`;
        context.beginPath();context.arc(px,py,near===node.index?2.3:1.4,0,Math.PI*2);context.fill();
      }
      context.lineWidth=.8;
      context.strokeStyle=`rgba(${rgb},${(.09*energy).toFixed(3)})`;
      context.beginPath();context.ellipse(x,y,width*.36,height*.27,0,0,Math.PI*2);context.stroke();
      canvas.dataset.frames = String(++frames);
      canvas.dataset.motion = 'settled';
    }
  };
}
