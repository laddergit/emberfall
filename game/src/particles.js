// Particles, floating combat text and lightning arcs: the feedback layer
// that makes every hit, kill and coin feel alive on screen.

// One spark: position, velocity, life, size, color, gravity and fade.
export function makeParticles() {
  const list = [];
  const texts = [];
  const arcs = [];
  return {
    list, texts, arcs,

    burst(x, y, color, count, speed, life, size, gravity = 0) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.65);
        list.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25,
          life: life * (0.6 + Math.random() * 0.6), maxLife: life,
          size: size * (0.6 + Math.random() * 0.8), color, gravity,
        });
      }
    },

    // A jagged lightning line from (x1,y1) to (x2,y2), fading fast.
    lightning(x1, y1, x2, y2, color) {
      const points = [{ x: x1, y: y1 }];
      const segs = 6;
      for (let i = 1; i < segs; i += 1) {
        const t = i / segs;
        points.push({
          x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 26,
          y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 26,
        });
      }
      points.push({ x: x2, y: y2 });
      arcs.push({ points, life: 0.16, maxLife: 0.16, color });
    },

    // Rising text like "+6" gold or "WAVE CLEAR".
    floatText(x, y, text, color, size = 14) {
      texts.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
    },

    update(dt) {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.985;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
      for (let i = arcs.length - 1; i >= 0; i -= 1) {
        arcs[i].life -= dt;
        if (arcs[i].life <= 0) arcs.splice(i, 1);
      }
    },

    draw(ctx) {
      for (const p of list) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const arc of arcs) {
        const a = Math.max(0, arc.life / arc.maxLife);
        ctx.globalAlpha = a;
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(arc.points[0].x, arc.points[0].y);
        for (let i = 1; i < arc.points.length; i += 1) ctx.lineTo(arc.points[i].x, arc.points[i].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.textAlign = 'center';
      for (const t of texts) {
        const a = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = a;
        ctx.font = `bold ${t.size}px "Trebuchet MS", Verdana, sans-serif`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },

    clear() { list.length = 0; texts.length = 0; arcs.length = 0; },
  };
}
