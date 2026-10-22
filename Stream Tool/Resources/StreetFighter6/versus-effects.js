(() => {
    const canvas = document.getElementById('paintCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const base = document.createElement('canvas');
    base.width = 1920; base.height = 1080;
    const ink = base.getContext('2d');
    let seed = 1946;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    function brush(x, y, width, height, rotation, color) {
        ink.save(); ink.translate(x, y); ink.rotate(rotation); ink.fillStyle = color;
        for (let i = 0; i < 42; i++) {
            const start = random() * width * .16;
            const end = width * (.65 + random() * .35);
            const top = random() * height;
            const thickness = 2 + random() * height * .12;
            ink.globalAlpha = .15 + random() * .58;
            ink.beginPath(); ink.moveTo(start, top);
            ink.lineTo(end, top - random() * 10);
            ink.lineTo(end - 35 - random() * 90, top + thickness);
            ink.lineTo(start + random() * 60, top + thickness * .65);
            ink.closePath(); ink.fill();
        }
        ink.restore();
    }
    function splatter(x, y, radius, color) {
        ink.save(); ink.translate(x, y); ink.fillStyle = color;
        ink.beginPath();
        for (let i = 0; i < 70; i++) {
            const angle = i / 70 * Math.PI * 2;
            const length = radius * (.35 + random() * .65);
            ink.lineTo(Math.cos(angle) * length, Math.sin(angle) * length * .48);
        }
        ink.closePath(); ink.fill();
        for (let i = 0; i < 160; i++) {
            const angle = random() * Math.PI * 2, spread = radius * (.5 + random() * 1.4);
            ink.globalAlpha = .15 + random() * .65;
            ink.beginPath(); ink.ellipse(Math.cos(angle) * spread, Math.sin(angle) * spread * .55, 1 + random() * 7, 1 + random() * 4, angle, 0, Math.PI * 2); ink.fill();
        }
        ink.restore();
    }
    brush(-170, 210, 980, 245, -.3, '#3a1cb3');
    brush(-120, 390, 930, 170, -.28, '#02c7de');
    brush(-120, 750, 1100, 155, -.25, '#b20cd6');
    brush(1100, 190, 1100, 230, .26, '#bc137b');
    brush(1180, 390, 1050, 160, .24, '#ff5c0a');
    brush(950, 720, 1150, 160, .22, '#9c20e3');
    ink.globalAlpha = .7;
    splatter(180, 650, 275, '#03b7d2');
    splatter(1720, 630, 290, '#d4198c');
    splatter(1030, 180, 230, '#7b14be');
    // Paint grain and dust stay behind the characters and player names.
    ink.globalAlpha = .12;
    for (let i = 0; i < 4500; i++) {
        ink.fillStyle = random() > .6 ? '#ffffff' : '#09030f';
        ink.fillRect(random() * 1920, random() * 1080, 1 + random() * 3, 1 + random() * 3);
    }
    const motes = Array.from({length:46}, () => ({x:random()*1920,y:random()*1080,r:1+random()*2.5,speed:4+random()*13,phase:random()*6.28,color:['#c65dff','#fc75c9','#63e7ef','#ffc074'][Math.floor(random()*4)]}));
    function draw(time = 0) {
        ctx.clearRect(0, 0, 1920, 1080); ctx.drawImage(base, 0, 0);
        for (const mote of motes) {
            const y = (mote.y - time * mote.speed / 1000 + 2160) % 1080;
            ctx.globalAlpha = .25 + .25 * Math.sin(time/2000 + mote.phase);
            ctx.fillStyle = mote.color; ctx.beginPath();
            ctx.arc(mote.x + Math.sin(time/3500 + mote.phase)*14, y, mote.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    draw();
    // Independent spotlights choose a fresh path, duration and pause on every pass.
    const lights = document.querySelector('.light-sweep');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (lights && !motion.matches) {
        for (let i = 0; i < 6; i++) {
            const beam = document.createElement('i'); beam.className = 'random-beam';
            const side = i < 3 ? 'p1' : 'p2';
            const isSecondary = i % 3 === 1;
            beam.style.setProperty('--beam-color', 'var(--' + side + (isSecondary ? '-secondary)' : '-primary)'));
            lights.append(beam);
            const pass = () => {
                if (motion.matches) { beam.style.opacity = '0'; return; }
                const home = side === 'p1';
                const start = (home ? -160 : 1100) + Math.random() * 650;
                const end = (home ? -50 : 980) + Math.random() * 750;
                const angle = -38 + Math.random() * 76;
                const peak = isSecondary ? .04 + Math.random() * .055 : .08 + Math.random() * .14;
                const duration = 4800 + Math.random() * 7800;
                const pause = 200 + Math.random() * 3800;
                const animation = beam.animate([
                    {transform:'translateX(' + start + 'px) rotate(' + angle + 'deg)', opacity:0},
                    {transform:'translateX(' + (start*.65+end*.35) + 'px) rotate(' + (angle+8) + 'deg)', opacity:peak,offset:.23+Math.random()*.18},
                    {transform:'translateX(' + end + 'px) rotate(' + (angle-14+Math.random()*28) + 'deg)', opacity:0}
                ], {duration, delay:pause, easing:'cubic-bezier(.35,0,.65,1)', fill:'forwards'});
                animation.onfinish = () => { animation.cancel(); pass(); };
            };
            pass();
        }
    }
    let last = 0;
    function tick(time) {
        if (!motion.matches && !document.hidden && !document.body.hidden && time-last > 33) { draw(time); last = time; }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();
