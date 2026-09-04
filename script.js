// ============================================================
// Data — approximate values read off the original SI 649 Tableau
// workbook (line positions / bar heights measured against the
// chart's own axis scale). Not the raw dataset — a faithful
// reconstruction of the shapes and relative magnitudes.
// ============================================================
const MONTHS = ['Jan','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SUBS = ['Anxiety','depression','lonely','mentalhealth','SuicideWatch'];

const COLOR = {
  Anxiety: 'var(--c-anxiety)',
  depression: 'var(--c-depression)',
  lonely: 'var(--c-lonely)',
  mentalhealth: 'var(--c-mentalhealth)',
  SuicideWatch: 'var(--c-suicidewatch)'
};

// resolved hex (for canvas-free color math / heatmap scale)
const COLOR_HEX = {
  Anxiety: '#8FA8BD',
  depression: '#C9A24B',
  lonely: '#C17862',
  mentalhealth: '#8FB3A3',
  SuicideWatch: '#2E6B5A'
};

const SENTIMENT = {
  Anxiety:      [1.10, 2.14, 1.35, 1.00, 1.57, 1.28, 1.06, 1.05, 1.07, 1.10, 1.15],
  depression:   [1.15, 2.23, 1.38, 1.03, 1.98, 1.37, 1.13, 1.12, 1.10, 1.11, 1.17],
  lonely:       [1.20, 3.55, 1.40, 1.00, 1.98, 1.51, 1.12, 1.12, 1.05, 1.11, 1.19],
  mentalhealth: [1.05, 1.55, 1.09, 1.00, 1.29, 1.15, 1.03, 1.03, 1.04, 1.06, 1.06],
  SuicideWatch: [1.10, 2.50, 1.22, 1.02, 1.87, 1.33, 1.08, 1.08, 1.09, 1.14, 1.13]
};

// total monthly post volume across all five communities (approx, read from bar heights)
const VOLUME_TOTAL = [55000, 29000, 45000, 37000, 52000, 53000, 54000, 52000, 54000, 55000, 52000];

const AVG_SENTIMENT = MONTHS.map((_, i) => {
  const sum = SUBS.reduce((s, name) => s + SENTIMENT[name][i], 0);
  return sum / SUBS.length;
});

// ============================================================
// Tooltip
// ============================================================
const tooltip = document.createElement('div');
tooltip.className = 'chart-tooltip';
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(tooltip));

function bindTooltip(el, textFn) {
  el.addEventListener('mouseenter', (e) => {
    tooltip.textContent = textFn();
    tooltip.classList.add('visible');
  });
  el.addEventListener('mousemove', (e) => {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top = (e.clientY + 14) + 'px';
  });
  el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    tooltip.textContent = textFn();
    tooltip.style.left = (t.clientX + 14) + 'px';
    tooltip.style.top = (t.clientY + 14) + 'px';
    tooltip.classList.add('visible');
    clearTimeout(el._tt);
    el._tt = setTimeout(() => tooltip.classList.remove('visible'), 2000);
  }, {passive:true});
}

function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ============================================================
// 1. Heatmap — subreddit x month, colored by sentiment intensity
// ============================================================
function buildHeatmap(container) {
  const W = 900, H = 300;
  const marginLeft = 110, marginTop = 20, marginBottom = 10;
  const cols = MONTHS.length, rows = SUBS.length;
  const cellW = (W - marginLeft - 10) / cols;
  const cellH = (H - marginTop - marginBottom) / rows;

  const svg = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, role:'img',
    'aria-label':'Heatmap of monthly average sentiment score by subreddit, darker cells indicate heavier sentiment.'});

  const min = 1.0, max = 3.6;

  SUBS.forEach((sub, r) => {
    const label = svgEl('text', {x: marginLeft - 10, y: marginTop + r*cellH + cellH/2 + 4,
      'text-anchor':'end', 'font-size':'12', fill:'var(--ink-soft)'});
    label.textContent = sub;
    svg.appendChild(label);

    MONTHS.forEach((m, c) => {
      const val = SENTIMENT[sub][c];
      const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
      // interpolate paper -> accent teal
      const from = [220,232,231], to = [30,60,50];
      const rgb = from.map((f,i) => Math.round(f + (to[i]-f)*t));
      const fill = `rgb(${rgb.join(',')})`;

      const rect = svgEl('rect', {
        x: marginLeft + c*cellW + 1.5, y: marginTop + r*cellH + 1.5,
        width: cellW-3, height: cellH-3, rx: 2, fill,
        class:'hm-cell', 'data-tooltip':'1', opacity:0
      });
      bindTooltip(rect, () => `${sub} · ${m} 2021 — avg. sentiment ${val.toFixed(2)}`);
      svg.appendChild(rect);

      if (r === rows-1) {
        const mlabel = svgEl('text', {x: marginLeft + c*cellW + cellW/2, y: H - 2,
          'text-anchor':'middle', 'font-size':'10.5', fill:'var(--ink-faint)'});
        mlabel.textContent = m;
        svg.appendChild(mlabel);
      }
    });
  });

  container.appendChild(svg);
  return svg;
}

function animateHeatmap(svg) {
  const cells = svg.querySelectorAll('.hm-cell');
  cells.forEach((cell, i) => {
    setTimeout(() => { cell.style.opacity = 1; }, i * 12);
  });
}

// ============================================================
// 2. Line chart — sentiment trend per subreddit
// ============================================================
function buildLineChart(container) {
  const W = 900, H = 380;
  const marginLeft = 46, marginRight = 16, marginTop = 20, marginBottom = 30;
  const plotW = W - marginLeft - marginRight, plotH = H - marginTop - marginBottom;
  const minV = 1.0, maxV = 3.7;

  const svg = svgEl('svg', {viewBox:`0 0 ${W} ${H}`, role:'img',
    'aria-label':'Line chart of monthly average sentiment score across five subreddits through 2021.'});

  const x = i => marginLeft + (i/(MONTHS.length-1)) * plotW;
  const y = v => marginTop + (1 - (v-minV)/(maxV-minV)) * plotH;

  // gridlines
  [1.0,1.5,2.0,2.5,3.0,3.5].forEach(v => {
    svg.appendChild(svgEl('line', {x1:marginLeft, x2:W-marginRight, y1:y(v), y2:y(v), stroke:'#E4E6DF', 'stroke-width':1}));
    const t = svgEl('text', {x:marginLeft-8, y:y(v)+4, 'text-anchor':'end', 'font-size':10, fill:'var(--ink-faint)'});
    t.textContent = v.toFixed(1);
    svg.appendChild(t);
  });
  MONTHS.forEach((m,i) => {
    const t = svgEl('text', {x:x(i), y:H-8, 'text-anchor':'middle', 'font-size':10, fill:'var(--ink-faint)'});
    t.textContent = m;
    svg.appendChild(t);
  });

  SUBS.forEach(sub => {
    const pts = SENTIMENT[sub].map((v,i) => `${x(i)},${y(v)}`).join(' ');
    const path = svgEl('polyline', {
      points: pts, class:'line-path', stroke: COLOR[sub], 'data-sub': sub
    });
    svg.appendChild(path);

    SENTIMENT[sub].forEach((v,i) => {
      const dot = svgEl('circle', {
        cx:x(i), cy:y(v), r:3.2, fill: COLOR[sub], class:'line-dot', 'data-tooltip':'1',
        'data-sub': sub
      });
      bindTooltip(dot, () => `${sub} · ${MONTHS[i]} 2021 — avg. sentiment ${v.toFixed(2)}`);
      svg.appendChild(dot);
    });
  });

  container.appendChild(svg);
  return svg;
}

function animateLineChart(svg) {
  svg.querySelectorAll('.line-path').forEach((path, i) => {
    const len = path.getTotalLength ? estimatePolylineLength(path) : 800;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect(); // force reflow
    setTimeout(() => {
      path.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.2,.7,.3,1)';
      path.style.strokeDashoffset = 0;
    }, i * 140);
  });
  svg.querySelectorAll('.line-dot').forEach((dot,i) => {
    dot.style.opacity = 0;
    setTimeout(() => { dot.style.transition='opacity .4s ease'; dot.style.opacity = 1; }, 900 + i*8);
  });
}

function estimatePolylineLength(polyline) {
  const pts = polyline.getAttribute('points').trim().split(' ').map(p => p.split(',').map(Number));
  let len = 0;
  for (let i=1;i<pts.length;i++){
    const dx = pts[i][0]-pts[i-1][0], dy = pts[i][1]-pts[i-1][1];
    len += Math.sqrt(dx*dx+dy*dy);
  }
  return len;
}

// legend interactivity (click to isolate a series) — shared by line chart
function buildLegend(container, svg) {
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  SUBS.forEach(sub => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `<span class="swatch" style="background:${COLOR[sub]}"></span>${sub}`;
    item.addEventListener('click', () => {
      const isDimmed = item.classList.contains('dim');
      const anyDimmed = legend.querySelector('.item.dim');
      legend.querySelectorAll('.item').forEach(i => i.classList.remove('dim'));
      svg.querySelectorAll('[data-sub]').forEach(el => el.classList.remove('dim'));
      if (!isDimmed) {
        legend.querySelectorAll('.item').forEach(i => { if (i!==item) i.classList.add('dim'); });
        svg.querySelectorAll('[data-sub]').forEach(el => { if (el.getAttribute('data-sub')!==sub) el.classList.add('dim'); });
      }
    });
    legend.appendChild(item);
  });
  container.appendChild(legend);
}

// ============================================================
// 3. Combo chart — monthly volume (bars) + average sentiment (line)
// ============================================================
function buildComboChart(container) {
  const W = 900, H = 380;
  const marginLeft = 50, marginRight = 46, marginTop = 20, marginBottom = 30;
  const plotW = W - marginLeft - marginRight, plotH = H - marginTop - marginBottom;
  const maxVol = 60000;
  const minS = 1.0, maxS = 2.6;

  const svg = svgEl('svg', {viewBox:`0 0 ${W} ${H}`, role:'img',
    'aria-label':'Combination chart: monthly Reddit post volume as bars, and average sentiment score as an overlaid line, through 2021.'});

  const x = i => marginLeft + (i/(MONTHS.length-1)) * plotW;
  const barW = plotW / MONTHS.length * 0.55;
  const yVol = v => marginTop + (1 - v/maxVol) * plotH;
  const ySent = v => marginTop + (1 - (v-minS)/(maxS-minS)) * plotH;

  [0,15000,30000,45000,60000].forEach(v => {
    svg.appendChild(svgEl('line', {x1:marginLeft, x2:W-marginRight, y1:yVol(v), y2:yVol(v), stroke:'#E4E6DF', 'stroke-width':1}));
    const t = svgEl('text', {x:marginLeft-8, y:yVol(v)+4, 'text-anchor':'end', 'font-size':10, fill:'var(--ink-faint)'});
    t.textContent = v/1000 + 'K';
    svg.appendChild(t);
  });
  [1.0,1.5,2.0,2.5].forEach(v => {
    const t = svgEl('text', {x:W-marginRight+8, y:ySent(v)+4, 'text-anchor':'start', 'font-size':10, fill:'var(--gold)'});
    t.textContent = v.toFixed(1);
    svg.appendChild(t);
  });

  MONTHS.forEach((m,i) => {
    const cx = x(i);
    const bar = svgEl('rect', {
      x: cx - barW/2, y: yVol(0), width: barW, height: 0,
      fill:'var(--accent-soft)', stroke:'var(--accent)', 'stroke-width':1,
      class:'bar-seg', 'data-tooltip':'1', 'data-final-y': yVol(VOLUME_TOTAL[i]), 'data-final-h': yVol(0)-yVol(VOLUME_TOTAL[i])
    });
    bindTooltip(bar, () => `${m} 2021 — ${Math.round(VOLUME_TOTAL[i]/1000)}K posts · avg. sentiment ${AVG_SENTIMENT[i].toFixed(2)}`);
    svg.appendChild(bar);

    const t = svgEl('text', {x:cx, y:H-8, 'text-anchor':'middle', 'font-size':10, fill:'var(--ink-faint)'});
    t.textContent = m;
    svg.appendChild(t);
  });

  const pts = AVG_SENTIMENT.map((v,i) => `${x(i)},${ySent(v)}`).join(' ');
  const line = svgEl('polyline', {points:pts, class:'line-path', stroke:'var(--gold)', 'stroke-width':2.6});
  svg.appendChild(line);
  AVG_SENTIMENT.forEach((v,i) => {
    const dot = svgEl('circle', {cx:x(i), cy:ySent(v), r:3.4, fill:'var(--gold)', class:'line-dot', 'data-tooltip':'1'});
    bindTooltip(dot, () => `${MONTHS[i]} 2021 — avg. sentiment ${v.toFixed(2)}`);
    svg.appendChild(dot);
  });

  container.appendChild(svg);
  return svg;
}

function animateComboChart(svg) {
  svg.querySelectorAll('.bar-seg').forEach((bar,i) => {
    const finalY = parseFloat(bar.getAttribute('data-final-y'));
    const finalH = parseFloat(bar.getAttribute('data-final-h'));
    setTimeout(() => {
      bar.style.transition = 'y .6s cubic-bezier(.2,.7,.3,1), height .6s cubic-bezier(.2,.7,.3,1)';
      bar.setAttribute('y', finalY);
      bar.setAttribute('height', finalH);
    }, i*60);
  });
  const line = svg.querySelector('.line-path');
  const len = estimatePolylineLength(line);
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;
  line.getBoundingClientRect();
  setTimeout(() => {
    line.style.transition = 'stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)';
    line.style.strokeDashoffset = 0;
  }, 500);
  svg.querySelectorAll('.line-dot').forEach((dot,i) => {
    dot.style.opacity = 0;
    setTimeout(() => { dot.style.transition='opacity .4s ease'; dot.style.opacity = 1; }, 1400 + i*8);
  });
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const heatmapEl = document.getElementById('chart-heatmap');
  const lineEl = document.getElementById('chart-line');
  const comboEl = document.getElementById('chart-combo');

  const heatmapSvg = buildHeatmap(heatmapEl);
  const lineSvg = buildLineChart(lineEl);
  buildLegend(document.getElementById('chart-line-legend'), lineSvg);
  const comboSvg = buildComboChart(comboEl);

  const played = new WeakSet();

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        const children = entry.target.querySelectorAll('.reveal-child');
        children.forEach((child, i) => {
          setTimeout(() => child.classList.add('visible'), 150 + i * 140);
        });

        if (!played.has(entry.target)) {
          played.add(entry.target);
          if (entry.target.contains(heatmapEl)) setTimeout(() => animateHeatmap(heatmapSvg), 150 + 1*140);
          if (entry.target.contains(lineEl)) setTimeout(() => animateLineChart(lineSvg), 150 + 1*140);
          if (entry.target.contains(comboEl)) setTimeout(() => animateComboChart(comboSvg), 150 + 1*140);
        }
      }
    });
  }, {threshold:0.2});

  document.querySelectorAll('section.block').forEach(s => io.observe(s));

  // TOC active state
  const tocLinks = document.querySelectorAll('.toc a');
  const sections = [...document.querySelectorAll('section.block[id]')];
  const tocObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.toc a[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, {rootMargin:'-40% 0px -50% 0px'});
  sections.forEach(s => tocObserver.observe(s));
});
