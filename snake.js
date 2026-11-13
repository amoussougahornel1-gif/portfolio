/* ─────────────────────────────────────────────
   Serpent "spatial" qui suit la souris
   - Une courte portion de serpent lumineux suit le curseur
   - Mouvement flottant, comme en apesanteur (inertie)
   - Quand la souris s'arrête, il tourne doucement autour
   - Il laisse derrière lui quelques poussières d'étoiles
   ───────────────────────────────────────────── */
(function () {
    // Pas de curseur sur mobile / tablette, et respect du réglage "moins d'animations"
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.className = "snake-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const SEGMENTS = 22;     // longueur du serpent
    const GAP = 9;           // distance entre deux anneaux
    const HEAD_R = 7;        // rayon de la tête

    let W = 0, H = 0, dpr = 1;
    const mouse = { x: -100, y: -100, seen: false, lastMove: 0 };
    const head = { x: -100, y: -100, vx: 0, vy: 0 };
    const body = Array.from({ length: SEGMENTS }, () => ({ x: -100, y: -100 }));
    const stars = [];
    let t = 0;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.lastMove = performance.now();
        if (!mouse.seen) {
            // Première apparition : le serpent naît à la position du curseur
            mouse.seen = true;
            head.x = mouse.x; head.y = mouse.y;
            body.forEach((s, i) => { s.x = mouse.x - (i + 1) * GAP; s.y = mouse.y; });
        }
    });
    document.addEventListener("mouseleave", () => { mouse.lastMove = 0; });

    function color(i, alpha) {
        // Dégradé bleu → violet → cyan le long du corps
        const k = i / (SEGMENTS - 1);
        const hue = 225 + k * 70;
        return `hsla(${hue}, 90%, ${62 - k * 10}%, ${alpha})`;
    }

    function update() {
        t += 0.016;
        const idle = performance.now() - mouse.lastMove > 900;

        // Cible : le curseur, ou une orbite lente autour de lui à l'arrêt
        let tx = mouse.x, ty = mouse.y;
        if (idle) {
            // Grande boucle lente en "8" : le serpent flotte sans s'enrouler sur lui-même
            tx += Math.sin(t * 0.8) * 110;
            ty += Math.sin(t * 1.6) * 45;
        }

        // Inertie "en apesanteur" : un ressort doux + frottement léger
        head.vx += (tx - head.x) * 0.018;
        head.vy += (ty - head.y) * 0.018;
        head.vx *= 0.9;
        head.vy *= 0.9;
        head.x += head.vx;
        head.y += head.vy;

        // Chaque anneau suit le précédent à distance fixe, avec une ondulation
        let px = head.x, py = head.y;
        for (let i = 0; i < SEGMENTS; i++) {
            const s = body[i];
            const dx = s.x - px, dy = s.y - py;
            const d = Math.hypot(dx, dy) || 1;
            const wave = Math.sin(t * 6 - i * 0.55) * 0.6;
            s.x = px + (dx / d) * GAP + (-dy / d) * wave;
            s.y = py + (dy / d) * GAP + (dx / d) * wave;
            px = s.x; py = s.y;
        }

        // Poussière d'étoiles derrière la queue quand il bouge
        const speed = Math.hypot(head.vx, head.vy);
        if (speed > 0.6 && Math.random() < Math.min(0.6, speed / 8)) {
            const tail = body[SEGMENTS - 1];
            stars.push({
                x: tail.x + (Math.random() - 0.5) * 10,
                y: tail.y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                life: 1,
                r: Math.random() * 1.6 + 0.6
            });
        }
        for (let i = stars.length - 1; i >= 0; i--) {
            const s = stars[i];
            s.x += s.vx; s.y += s.vy;
            s.life -= 0.02;
            if (s.life <= 0) stars.splice(i, 1);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        if (!mouse.seen) return;

        // Étoiles
        for (const s of stars) {
            ctx.fillStyle = `rgba(200, 220, 255, ${s.life * 0.9})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Corps continu et effilé : tracé lissé de la queue vers la tête
        const pts = [head, ...body];
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = pts.length - 2; i >= 0; i--) {
            const a = pts[i], b = pts[i + 1];
            const c = pts[i + 2] || b;
            const k = i / (pts.length - 1);
            ctx.lineWidth = (HEAD_R * 1.6) * Math.pow(1 - k, 0.85) + 1.5;
            ctx.strokeStyle = color(i, 1 - k * 0.55);
            ctx.shadowColor = color(i, 0.8);
            ctx.shadowBlur = 12;
            // Courbe passant par les milieux pour un corps bien lisse
            ctx.beginPath();
            ctx.moveTo((b.x + c.x) / 2, (b.y + c.y) / 2);
            ctx.quadraticCurveTo(b.x, b.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
            ctx.lineTo(a.x, a.y);
            ctx.stroke();
        }
        // Reflet clair sur le dos pour donner du volume
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length * 0.7; i++) {
            const m = pts[i - 1], n = pts[i];
            ctx.quadraticCurveTo(m.x, m.y, (m.x + n.x) / 2, (m.y + n.y) / 2);
        }
        ctx.stroke();

        // Tête orientée dans le sens du mouvement
        const angle = Math.atan2(head.y - body[0].y, head.x - body[0].x);
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(angle);
        ctx.shadowColor = "rgba(78, 158, 255, 0.95)";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#3a6cf4";
        ctx.beginPath();
        ctx.ellipse(1, 0, HEAD_R + 3, HEAD_R + 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Langue qui sort par moments
        if (Math.sin(t * 3) > 0.6) {
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(HEAD_R + 1, 0); ctx.lineTo(HEAD_R + 8, 0);
            ctx.lineTo(HEAD_R + 11, -3);
            ctx.moveTo(HEAD_R + 8, 0); ctx.lineTo(HEAD_R + 11, 3);
            ctx.stroke();
        }

        // Yeux
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(3, -3.6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, 3.6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000016";
        ctx.beginPath(); ctx.arc(3.7, -3.6, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3.7, 3.6, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function frame() {
        update();
        draw();
        requestAnimationFrame(frame);
    }

    resize();
    requestAnimationFrame(frame);
})();
