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
    function shade(hex, amount) {
        const value = parseInt(hex.slice(1), 16), target = amount < 0 ? 0 : 255, mix = Math.abs(amount);
        return '#' + [16,8,0].map(shift => Math.round(((value >> shift) & 255) * (1-mix) + target * mix).toString(16).padStart(2,'0')).join('');
    }
    let palette = [], paletteKey = '';
    const motes = Array.from({length:46}, () => ({x:random()*1920,y:random()*1080,r:1+random()*2.5,speed:4+random()*13,phase:random()*6.28}));
    function paintSchools() {
        const style = getComputedStyle(document.body);
        const read = (key, fallback) => { const color = style.getPropertyValue(key).trim(); return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback; };
        const colors = [read('--p1-primary','#203cff'),read('--p1-secondary','#ffffff'),read('--p2-primary','#ff3126'),read('--p2-secondary','#ffffff')];
        if (colors.join() === paletteKey) return;
        paletteKey = colors.join(); palette = colors; seed = 1946;
        ink.clearRect(0,0,1920,1080);
        for (let side = 0; side < 2; side++) {
            const primary = colors[side*2], secondary = colors[side*2+1];
            ink.save(); ink.beginPath(); ink.rect(side*960,0,960,1080); ink.clip();
            if (!side) {
                brush(-170,210,1120,245,-.3,shade(primary,-.3));
                brush(-120,390,1030,170,-.28,shade(primary,.16));
                brush(-120,750,1140,155,-.25,primary);
                ink.globalAlpha=.4; splatter(180,650,210,shade(primary,-.16));
                // Secondary stays confined to a few fine paint streaks.
                brush(-20,340,580,7,-.28,secondary);
                brush(80,790,390,5,-.25,secondary);
            } else {
                brush(1030,190,1100,230,.26,shade(primary,-.3));
                brush(1060,390,1050,160,.24,shade(primary,.16));
                brush(980,720,1150,160,.22,primary);
                ink.globalAlpha=.4; splatter(1720,630,220,shade(primary,-.16));
                brush(1370,230,580,7,.24,secondary);
                brush(1480,760,390,5,.22,secondary);
            }
            ink.restore();
        }
        ink.globalAlpha=.07;
        for (let i=0;i<3200;i++) {
            ink.fillStyle=random()>.6?'#ffffff':'#000000';
            ink.fillRect(random()*1920,random()*1080,1+random()*2,1+random()*2);
        }
        ink.globalAlpha=1;
        draw();
    }
    function draw(time = 0) {
        ctx.clearRect(0, 0, 1920, 1080); ctx.drawImage(base, 0, 0);
        for (const mote of motes) {
            const y = (mote.y - time * mote.speed / 1000 + 2160) % 1080;
            ctx.globalAlpha = .25 + .25 * Math.sin(time/2000 + mote.phase);
            ctx.fillStyle = shade(palette[mote.x < 960 ? 0 : 2] || '#203cff', .35); ctx.beginPath();
            ctx.arc(mote.x + Math.sin(time/3500 + mote.phase)*14, y, mote.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    paintSchools();
    document.addEventListener('school-colors-updated', paintSchools);
    // Independent spotlights choose a fresh path, duration and pause on every pass.
    const lights = document.querySelector('.light-sweep');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (lights && !motion.matches) {
        for (let i = 0; i < 6; i++) {
            const beam = document.createElement('i'); beam.className = 'random-beam';
            const side = i < 3 ? 'p1' : 'p2';
            const soft = i % 3 === 1;
            beam.style.setProperty('--beam-color', 'var(--' + side + '-primary)');
            lights.append(beam);
            const pass = () => {
                if (motion.matches) { beam.style.opacity = '0'; return; }
                const home = side === 'p1';
                const start = (home ? -160 : 1100) + Math.random() * 650;
                const end = (home ? -50 : 980) + Math.random() * 750;
                const angle = -38 + Math.random() * 76;
                const peak = soft ? .04 + Math.random() * .05 : .08 + Math.random() * .12;
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
