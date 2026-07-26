/**
 * VocabMastery · Dashboard Renderer
 * 8 大维度仪表盘渲染 + 纯 SVG 图表(柱状/折线/雷达/热力/进度环)
 * 依赖:window.Storage, window.Stats
 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var THEME = {
    primary: '#6c5ce7',
    secondary: '#00b894',
    accent: '#fdcb6e',
    danger: '#ff7675',
    warn: '#ffa502',
    muted: 'rgba(255,255,255,0.45)',
    text: '#f1f2f6',
    textMuted: '#a4b0be',
    gridLine: 'rgba(255,255,255,0.08)',
    gradStops: [
      { offset: '0%', color: '#6c5ce7' },
      { offset: '100%', color: '#00b894' }
    ]
  };

  // ---------- DOM helpers ----------
  function el(tag, opts, children) {
    var node = document.createElement(tag);
    if (opts) {
      if (opts.className) node.className = opts.className;
      if (opts.id) node.id = opts.id;
      if (opts.text != null) node.textContent = opts.text;
      if (opts.html != null) node.innerHTML = opts.html;
      if (opts.attrs) {
        Object.keys(opts.attrs).forEach(function (k) { node.setAttribute(k, opts.attrs[k]); });
      }
      if (opts.on) {
        Object.keys(opts.on).forEach(function (evt) { node.addEventListener(evt, opts.on[evt]); });
      }
    }
    if (children && children.length) {
      children.forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function empty(title) {
    return el('div', { className: 'view-placeholder' }, [
      el('div', { className: 'emoji', text: '📊' }),
      el('h2', { text: title || '暂无数据' }),
      el('p', { text: '开始学习后,这里将显示详细统计。' })
    ]);
  }

  // ============================================================
  // 图表基础:statCard / progressBar / progressRing
  // ============================================================
  function statCard(opts) {
    return el('div', { className: 'stat-card glass' }, [
      el('div', { className: 'label', text: opts.label }),
      el('div', { className: 'value', text: String(opts.value) }),
      opts.suffix ? el('span', { className: 'card-suffix', text: opts.suffix }) : null,
      opts.sub ? el('div', { className: 'delta', text: opts.sub }) : null
    ]);
  }

  function progressBar(percent, opts) {
    opts = opts || {};
    var wrap = el('div', { className: 'progress-bar' + (opts.tiny ? ' tiny' : '') });
    var fill = el('div', { className: 'progress-fill' });
    fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    wrap.appendChild(fill);
    return wrap;
  }

  function progressRing(percent, opts) {
    opts = opts || {};
    var size = opts.size || 140;
    var stroke = opts.stroke || 10;
    var r = (size - stroke) / 2;
    var cx = size / 2, cy = size / 2;
    var c = 2 * Math.PI * r;
    var off = c - (percent / 100) * c;
    var uid = 'ring-' + Math.random().toString(36).slice(2, 8);
    var svg = svgEl('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size });
    var defs = svgEl('defs');
    var grad = svgEl('linearGradient', { id: uid, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    THEME.gradStops.forEach(function (s) {
      grad.appendChild(svgEl('stop', { offset: s.offset, 'stop-color': s.color }));
    });
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('circle', {
      cx: cx, cy: cy, r: r, 'stroke-width': stroke, fill: 'none', class: 'ring-bg'
    }));
    var fg = svgEl('circle', {
      cx: cx, cy: cy, r: r, 'stroke-width': stroke, fill: 'none',
      'stroke-dasharray': c, 'stroke-dashoffset': off,
      'stroke-linecap': 'round', class: 'ring-fg'
    });
    fg.setAttribute('stroke', 'url(#' + uid + ')');
    svg.appendChild(fg);
    return svg;
  }

  // ============================================================
  // 柱状图
  // ============================================================
  function barChart(data, opts) {
    opts = opts || {};
    var labels = opts.labels || data.map(function (d, i) { return d.label || (i + 1); });
    var values = data.map(function (d) { return d.value || 0; });
    var maxV = Math.max.apply(null, values.concat([1]));
    if (opts.max) maxV = opts.max;
    var w = opts.width || 360, h = opts.height || 160;
    var padL = 30, padR = 12, padT = 12, padB = 28;
    var iw = w - padL - padR;
    var ih = h - padT - padB;
    var bw = iw / values.length * 0.7;
    var gap = iw / values.length * 0.3;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });
    // 渐变定义
    var defs = svgEl('defs');
    var grad = svgEl('linearGradient', { id: 'dashBarGrad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#6c5ce7' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#00b894' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    // y 轴线
    for (var g = 0; g <= 4; g++) {
      var y = padT + ih * (g / 4);
      svg.appendChild(svgEl('line', {
        x1: padL, y1: y, x2: w - padR, y2: y, stroke: THEME.gridLine, 'stroke-width': 1
      }));
      svg.appendChild(svgEl('text', {
        x: padL - 4, y: y + 3, fill: THEME.textMuted, 'font-size': 10, 'text-anchor': 'end'
      })).textContent = Math.round(maxV * (1 - g / 4));
    }
    // 柱
    values.forEach(function (v, i) {
      var x = padL + i * (bw + gap) + gap / 2;
      var bh = (v / maxV) * ih;
      var y = padT + ih - bh;
      var rect = svgEl('rect', {
        x: x, y: y, width: bw, height: bh, rx: 4, class: 'bar-fg'
      });
      svg.appendChild(rect);
      if (labels[i] != null) {
        var t = svgEl('text', {
          x: x + bw / 2, y: h - 10, fill: THEME.textMuted, 'font-size': 10, 'text-anchor': 'middle'
        });
        t.textContent = labels[i];
        svg.appendChild(t);
      }
      if (v > 0) {
        var vt = svgEl('text', {
          x: x + bw / 2, y: y - 3, fill: THEME.text, 'font-size': 10, 'text-anchor': 'middle'
        });
        vt.textContent = v;
        svg.appendChild(vt);
      }
    });
    return svg;
  }

  // ============================================================
  // 折线图
  // ============================================================
  function lineChart(data, opts) {
    opts = opts || {};
    var labels = opts.labels || data.map(function (d, i) { return d.label || (i + 1); });
    var values = data.map(function (d) { return d.value || 0; });
    var maxV = Math.max.apply(null, values.concat([100]));
    if (opts.max != null) maxV = opts.max;
    var minV = opts.min != null ? opts.min : 0;
    var w = opts.width || 360, h = opts.height || 160;
    var padL = 30, padR = 12, padT = 12, padB = 28;
    var iw = w - padL - padR;
    var ih = h - padT - padB;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });
    // y 网格
    for (var g = 0; g <= 4; g++) {
      var y = padT + ih * (g / 4);
      svg.appendChild(svgEl('line', {
        x1: padL, y1: y, x2: w - padR, y2: y, stroke: THEME.gridLine, 'stroke-width': 1
      }));
      var val = minV + (maxV - minV) * (1 - g / 4);
      var t = svgEl('text', {
        x: padL - 4, y: y + 3, fill: THEME.textMuted, 'font-size': 10, 'text-anchor': 'end'
      });
      t.textContent = Math.round(val);
      svg.appendChild(t);
    }
    // 计算点
    var pts = values.map(function (v, i) {
      var x = padL + (values.length === 1 ? iw / 2 : i * (iw / (values.length - 1)));
      var y = padT + ih - ((v - minV) / (maxV - minV || 1)) * ih;
      return { x: x, y: y, v: v };
    });
    // 填充区域
    if (pts.length > 1) {
      var areaD = 'M ' + padL + ' ' + (padT + ih) + ' L ';
      areaD += pts.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
      areaD += ' L ' + (padL + iw) + ' ' + (padT + ih) + ' Z';
      svg.appendChild(svgEl('path', { d: areaD, class: 'line-area' }));
    }
    // 折线
    if (pts.length > 1) {
      var lineD = 'M ' + pts.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
      svg.appendChild(svgEl('path', { d: lineD, class: 'line-fg' }));
    }
    // 点
    pts.forEach(function (p, i) {
      svg.appendChild(svgEl('circle', {
        cx: p.x, cy: p.y, r: 3.5, class: 'line-dot'
      }));
      if (labels[i] != null && (i % Math.ceil(labels.length / 6) === 0 || i === labels.length - 1)) {
        var lt = svgEl('text', {
          x: p.x, y: h - 10, fill: THEME.textMuted, 'font-size': 10, 'text-anchor': 'middle'
        });
        lt.textContent = labels[i];
        svg.appendChild(lt);
      }
    });
    return svg;
  }

  // ============================================================
  // 雷达图
  // ============================================================
  function radarChart(data, opts) {
    opts = opts || {};
    var labels = data.map(function (d) { return d.label; });
    var values = data.map(function (d) { return d.value; });
    var maxV = opts.max || 100;
    var size = opts.size || 240;
    var cx = size / 2, cy = size / 2;
    var R = size / 2 - 30;
    var n = labels.length;
    var svg = svgEl('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, class: 'chart-svg' });
    // 同心多边形
    for (var layer = 1; layer <= 4; layer++) {
      var rr = (R * layer) / 4;
      var pts = [];
      for (var i = 0; i < n; i++) {
        var angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        pts.push(cx + Math.cos(angle) * rr + ',' + (cy + Math.sin(angle) * rr));
      }
      svg.appendChild(svgEl('polygon', {
        points: pts.join(' '), class: 'radar-grid'
      }));
    }
    // 轴线
    for (var j = 0; j < n; j++) {
      var a = (Math.PI * 2 * j) / n - Math.PI / 2;
      svg.appendChild(svgEl('line', {
        x1: cx, y1: cy, x2: cx + Math.cos(a) * R, y2: cy + Math.sin(a) * R,
        class: 'radar-axis'
      }));
    }
    // 数据多边形
    var dataPts = values.map(function (v, i) {
      var a = (Math.PI * 2 * i) / n - Math.PI / 2;
      var r = (v / maxV) * R;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
    if (dataPts.length > 0) {
      svg.appendChild(svgEl('polygon', {
        points: dataPts.map(function (p) { return p.x + ',' + p.y; }).join(' '),
        class: 'radar-shape'
      }));
      dataPts.forEach(function (p) {
        svg.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 3, class: 'radar-dot' }));
      });
    }
    // 标签
    labels.forEach(function (lab, i) {
      var a = (Math.PI * 2 * i) / n - Math.PI / 2;
      var lr = R + 14;
      var x = cx + Math.cos(a) * lr;
      var y = cy + Math.sin(a) * lr;
      var t = svgEl('text', {
        x: x, y: y, fill: THEME.text, 'font-size': 11, 'text-anchor': 'middle',
        'dominant-baseline': 'middle'
      });
      t.textContent = lab;
      svg.appendChild(t);
    });
    return svg;
  }

  // ============================================================
  // 热力图(GitHub 贡献图风格,365 天)
  // ============================================================
  function heatmap(heatData, opts) {
    opts = opts || {};
    var cell = opts.cell || 12;
    var gap = opts.gap || 2;
    var w = 53 * (cell + gap);
    var h = 7 * (cell + gap) + 20;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'heatmap-svg' });
    // 按 ISO 周对齐:取每个日期对应 (weekIndex, dayOfWeek)
    var maxV = 0;
    heatData.forEach(function (d) { if (d.total > maxV) maxV = d.total; });
    if (maxV === 0) maxV = 1;

    function intensity(v) {
      if (v === 0) return 0;
      var r = v / maxV;
      if (r < 0.25) return 1;
      if (r < 0.5) return 2;
      if (r < 0.75) return 3;
      return 4;
    }

    var palette = ['#1e1b3a', '#3a2f70', '#5a48b0', '#7a5cf0', '#00b894'];
    var startDate = new Date(heatData[0].date + 'T00:00:00');
    var startDay = (startDate.getDay() + 6) % 7; // 周一=0
    heatData.forEach(function (d, i) {
      var date = new Date(d.date + 'T00:00:00');
      var dayOfWeek = (date.getDay() + 6) % 7;
      var weekIndex = Math.floor((i + startDay) / 7);
      var x = weekIndex * (cell + gap);
      var y = dayOfWeek * (cell + gap);
      var lvl = intensity(d.total);
      svg.appendChild(svgEl('rect', {
        x: x, y: y, width: cell, height: cell, rx: 2,
        fill: palette[lvl]
      }));
      var t = svgEl('title');
      t.textContent = d.date + ' · ' + d.total + ' 次';
      svg.appendChild(t);
    });
    // 月份标签
    var lastMonth = -1;
    heatData.forEach(function (d, i) {
      var date = new Date(d.date + 'T00:00:00');
      if (date.getDate() <= 7 && date.getMonth() !== lastMonth) {
        var weekIndex = Math.floor((i + startDay) / 7);
        var x = weekIndex * (cell + gap);
        var lt = svgEl('text', {
          x: x, y: 7 * (cell + gap) + 14, fill: THEME.textMuted, 'font-size': 10
        });
        lt.textContent = (date.getMonth() + 1) + '月';
        svg.appendChild(lt);
        lastMonth = date.getMonth();
      }
    });
    return svg;
  }

  // ============================================================
  // 键盘 QWERTY 热力图
  // ============================================================
  function keyboardHeatmap(data) {
    var w = 460, h = 130;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });
    var cell = 36;
    var startX = 20, startY = 10;
    var maxV = 0;
    data.heat.forEach(function (row) { row.forEach(function (v) { if (v > maxV) maxV = v; }); });
    if (maxV === 0) maxV = 1;
    data.rows.forEach(function (row, r) {
      var indent = r === 1 ? cell * 0.5 : (r === 2 ? cell * 1 : 0);
      row.forEach(function (k, c) {
        var x = startX + indent + c * cell;
        var y = startY + r * cell;
        var v = data.heat[r][c];
        var ratio = v / maxV;
        var color;
        if (v === 0) color = 'rgba(255,255,255,0.06)';
        else if (ratio < 0.33) color = 'rgba(255,118,117,0.35)';
        else if (ratio < 0.66) color = 'rgba(255,118,117,0.65)';
        else color = 'rgba(255,118,117,1)';
        svg.appendChild(svgEl('rect', {
          x: x, y: y, width: cell - 4, height: cell - 4, rx: 6, fill: color
        }));
        var t = svgEl('text', {
          x: x + (cell - 4) / 2, y: y + (cell - 4) / 2 + 5,
          fill: '#fff', 'font-size': 14, 'text-anchor': 'middle', 'font-weight': 700
        });
        t.textContent = k;
        svg.appendChild(t);
        if (v > 0) {
          var vt = svgEl('text', {
            x: x + (cell - 4) / 2, y: y + cell + 4,
            fill: THEME.textMuted, 'font-size': 9, 'text-anchor': 'middle'
          });
          vt.textContent = v;
          svg.appendChild(vt);
        }
      });
    });
    return svg;
  }

  // ============================================================
  // 仪表盘容器
  // ============================================================
  function dashboardCard(title, body) {
    return el('div', { className: 'dash-card glass' }, [
      el('div', { className: 'dash-card-title', text: title }),
      body
    ]);
  }

  function emptyMsg(text) {
    return el('div', { className: 'empty-msg', text: text || '暂无数据,开始学习后将显示统计' });
  }

  // ============================================================
  // 8 大维度渲染
  // ============================================================
  function renderDimension1(stage) {
    var total = Stats.getVocabTotal(stage);
    var learned = Stats.getVocabLearned(stage);
    var mastered = Stats.getVocabMastered(stage);
    var due = Stats.getDueCount(stage);
    var unlearned = Stats.getVocabUnlearned(stage);
    var allProgress = Stats.getAllStagesProgress();

    var grid = el('div', { className: 'dim-grid' }, [
      statCard({ label: '1.1 总词数', value: total, suffix: '词' }),
      statCard({ label: '1.2 累计已学', value: learned, suffix: '词' }),
      statCard({ label: '1.3 已掌握 (≥35d)', value: mastered, suffix: '词' }),
      statCard({ label: '1.4 待复习', value: due, suffix: '词' }),
      statCard({ label: '1.5 未学习', value: unlearned, suffix: '词' })
    ]);

    // 1.6 四阶段进度
    var progressList = el('div', { className: 'stage-progress-list' });
    allProgress.forEach(function (p) {
      var item = el('div', { className: 'stage-progress-item' }, [
        el('div', { className: 'stage-progress-label' }, [
          el('span', { text: Storage.STAGE_NAMES[p.stage] || p.stage }),
          el('span', { className: 'text-muted', text: p.learned + ' / ' + p.total + ' (' + p.percent + '%)' })
        ]),
        progressBar(p.percent)
      ]);
      progressList.appendChild(item);
    });

    return el('div', { className: 'dimension dim-1' }, [
      dashboardCard('维度 1 · 词汇量统计', grid),
      dashboardCard('1.6 各阶段进度', progressList)
    ]);
  }

  function renderDimension2(stage, range) {
    var overall = Stats.getOverallCorrectRate(stage, range);
    var grades = Stats.getStageGrades(stage);
    var gradeResults = grades.map(function (g) {
      return { label: g.label, value: Stats.getGradeCorrectRate(stage, g.value, range).rate };
    });
    var topics = Stats.getTopicCorrectRate(stage, range).slice(0, 8);
    var topicData = topics.map(function (t) { return { label: t.topic, value: t.rate }; });
    if (topicData.length === 0) topicData = [{ label: '暂无', value: 0 }];

    // 题型正确率
    var modes = ['study', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L10', 'T2', 'T3'];
    var modeData = modes.map(function (m) {
      return { label: m, value: Stats.getTypeCorrectRate(stage, m, range).rate };
    });

    var gradeChart = gradeResults.length > 1
      ? barChart(gradeResults, { labels: gradeResults.map(function (g) { return g.label; }), max: 100 })
      : emptyMsg('仅当前阶段数据');

    var topicChart = topicData.length > 0
      ? barChart(topicData, { labels: topicData.map(function (t) { return t.label; }), max: 100 })
      : emptyMsg('暂无主题数据');

    var modeChart = modeData.length > 0
      ? radarChart(modeData, { max: 100, size: 260 })
      : emptyMsg('暂无题型数据');

    return el('div', { className: 'dimension dim-2' }, [
      dashboardCard('维度 2 · 正确率细分', el('div', { className: 'dim-grid' }, [
        statCard({ label: '2.1 整体正确率', value: overall.rate, suffix: '%' }),
        statCard({ label: '2.2 当前阶段正确率', value: overall.rate, suffix: '%' }),
        statCard({ label: '答题总数', value: overall.total, suffix: '次' })
      ])),
      dashboardCard('2.3 各年级正确率', gradeChart),
      dashboardCard('2.5 题型正确率雷达', modeChart),
      dashboardCard('2.6 主题正确率', topicChart)
    ]);
  }

  function renderDimension3(stage, range) {
    var cb = Stats.getComprehensionBreakdown(stage, range);
    return el('div', { className: 'dimension dim-3' }, [
      dashboardCard('维度 3 · 理解率(语义层面)', el('div', { className: 'dim-grid' }, [
        statCard({ label: '3.1 释义准确率', value: cb.meaning.rate, suffix: '%' }),
        statCard({ label: '3.2 语境理解率', value: cb.context.rate, suffix: '%' }),
        statCard({ label: '3.3 词族理解率', value: cb.family.rate, suffix: '%' }),
        statCard({ label: '3.4 搭配掌握率', value: cb.collocation.rate, suffix: '%' })
      ]))
    ]);
  }

  function renderDimension4(stage, range) {
    var p = Stats.getPronunciationStats(stage, range);
    var vocab = Storage.getVocab(stage);
    var byId = {};
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) { byId[w.id] = w; });
    }
    var topList = el('div', { className: 'mistake-list' });
    if (p.topMistakes.length === 0) {
      topList.appendChild(emptyMsg('暂无发音评测数据'));
    } else {
      p.topMistakes.forEach(function (m) {
        var w = byId[m.wordId];
        topList.appendChild(el('div', { className: 'mistake-item' }, [
          el('span', { className: 'mistake-word', text: w ? w.word : ('#' + m.wordId) }),
          el('span', { className: 'mistake-score', text: m.avgScore + ' / 100' })
        ]));
      });
    }
    return el('div', { className: 'dimension dim-4' }, [
      dashboardCard('维度 4 · 发音正确率', el('div', { className: 'dim-grid' }, [
        statCard({ label: '4.1 发音平均分', value: p.avgScore, suffix: '/100' }),
        statCard({ label: '4.2 音节切分正确率', value: p.syllable.rate, suffix: '%' }),
        statCard({ label: '4.3 重音位置正确率', value: p.stress.rate, suffix: '%' }),
        statCard({ label: '样本数', value: p.sampleCount, suffix: '条' })
      ])),
      dashboardCard('4.4 易错发音 Top 10', topList)
    ]);
  }

  function renderDimension5(stage) {
    var pers = Stats.getMemoryPersistence(stage);
    var forget = Stats.getPredictedForget(stage, 7);
    var curve = Stats.getMemoryCurve(stage);
    var curveData = curve.map(function (b) { return { label: b.label, value: b.rate }; });

    var curveChart = curve.some(function (b) { return b.t > 0; })
      ? lineChart(curveData, { labels: curveData.map(function (d) { return d.label; }), max: 100 })
      : emptyMsg('暂无回忆数据');

    return el('div', { className: 'dimension dim-5' }, [
      dashboardCard('维度 5 · 记忆持久度', el('div', { className: 'dim-grid' }, [
        statCard({ label: '5.1 EF 系数均值', value: pers.avgEF, suffix: '' }),
        statCard({ label: '5.2 预测 7 天遗忘词数', value: forget.predictedForgetCount, suffix: '词' }),
        statCard({ label: '已学词数', value: pers.totalCards, suffix: '词' })
      ])),
      dashboardCard('5.3 记忆曲线(各时间区间回忆率)', curveChart)
    ]);
  }

  function renderDimension6(stage, range) {
    var days = parseInt(range, 10) || 30;
    var dailyNew = Stats.getDailyAverage(stage, days);
    var dailyReview = Stats.getReviewAverage(stage, days);
    var rt = Stats.getAvgResponseTime(stage, range);
    var streak = Stats.getStreak(stage);
    var heat = Stats.getHeatmapData(stage, 365);
    var heatSvg = heatmap(heat);

    return el('div', { className: 'dimension dim-6' }, [
      dashboardCard('维度 6 · 效率指标', el('div', { className: 'dim-grid' }, [
        statCard({ label: '6.1 日均学习量', value: dailyNew, suffix: '词' }),
        statCard({ label: '6.2 日均复习量', value: dailyReview, suffix: '词' }),
        statCard({ label: '6.3 平均反应时间', value: rt.avgSec, suffix: '秒' }),
        statCard({ label: '6.5 连续打卡', value: streak, suffix: '天' })
      ])),
      dashboardCard('6.4 学习热力图(近 365 天)', el('div', { className: 'heatmap-wrap' }, [heatSvg]))
    ]);
  }

  function renderDimension7(stage) {
    var total = Stats.getWrongTotal(stage);
    var most = Stats.getMostWrong(stage, 20);
    var confusions = Stats.getConfusionPairs(stage, 10);
    var keyboard = Stats.getKeyboardHeatmap(stage);
    var vocab = Storage.getVocab(stage);
    var byId = {};
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) { byId[w.id] = w; });
    }

    var mostList = el('div', { className: 'most-wrong-list' });
    if (most.length === 0) {
      mostList.appendChild(emptyMsg('暂无错题'));
    } else {
      most.forEach(function (m, i) {
        var w = byId[m.wordId];
        mostList.appendChild(el('div', { className: 'most-wrong-item' }, [
          el('span', { className: 'rank', text: '#' + (i + 1) }),
          el('span', { className: 'word', text: w ? w.word : ('#' + m.wordId) }),
          el('span', { className: 'count tag danger', text: m.wrongCount + ' 次' })
        ]));
      });
    }

    var confList = el('div', { className: 'confusion-list' });
    if (confusions.length === 0) {
      confList.appendChild(emptyMsg('暂无易混淆词对'));
    } else {
      confusions.forEach(function (p) {
        var wa = byId[p.a];
        var wb = byId[p.b];
        confList.appendChild(el('div', { className: 'confusion-item' }, [
          el('span', { className: 'word-a', text: wa ? wa.word : ('#' + p.a) }),
          el('span', { className: 'arrow', text: '⇄' }),
          el('span', { className: 'word-b', text: wb ? wb.word : ('#' + p.b) }),
          el('span', { className: 'count', text: p.count + ' 次' })
        ]));
      });
    }

    return el('div', { className: 'dimension dim-7' }, [
      dashboardCard('维度 7 · 错题分析', el('div', { className: 'dim-grid' }, [
        statCard({ label: '7.1 错题总量', value: total, suffix: '次' })
      ])),
      dashboardCard('7.2 易错词 Top 20', mostList),
      dashboardCard('7.3 易混淆词对', confList),
      dashboardCard('7.4 QWERTY 拼写错误热力', keyboardHeatmap(keyboard))
    ]);
  }

  function renderDimension8(stage, range) {
    // 8.1 四阶段进度条
    var allProgress = Stats.getAllStagesProgress();
    var stageBars = el('div', { className: 'stage-bars' });
    allProgress.forEach(function (p) {
      var item = el('div', { className: 'stage-bar' }, [
        el('div', { className: 'stage-bar-head' }, [
          el('span', { text: Storage.STAGE_NAMES[p.stage] || p.stage }),
          el('span', { className: 'text-muted', text: p.percent + '%' })
        ]),
        progressBar(p.percent)
      ]);
      stageBars.appendChild(item);
    });

    // 8.2 最近 30 天学习曲线
    var log = Storage.getAttemptsLog(range);
    var filtered = log.filter(function (a) { return !a.stage || a.stage === stage; });
    var dayMap = {};
    filtered.forEach(function (a) {
      var day = new Date(a.timestamp).toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { n: 0, r: 0 };
      if (a.correct) dayMap[day].r++;
      else dayMap[day].n++;
    });
    var days = parseInt(range, 10) || 30;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var lineData = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var ds = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      lineData.push({ label: String(d.getDate()), value: (dayMap[ds] ? (dayMap[ds].r + dayMap[ds].n) : 0) });
    }

    var lineSvg = lineData.some(function (d) { return d.value > 0; })
      ? lineChart(lineData, { labels: lineData.map(function (d) { return d.label; }) })
      : emptyMsg('暂无学习记录');

    // 8.3 雷达(题型)
    var modes = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L10'];
    var radarData = modes.map(function (m) {
      return { label: m, value: Stats.getTypeCorrectRate(stage, m, range).rate };
    });
    var radarSvg = radarData.some(function (d) { return d.value > 0; })
      ? radarChart(radarData, { max: 100, size: 280 })
      : emptyMsg('暂无题型数据');

    // 8.4 遗忘曲线模拟
    var forget = Stats.getPredictedForget(stage, 7);
    var forgetText = '基于艾宾浩斯曲线 R=e^(-t/S),S≈ef×interval,预测未来 7 天中' +
      ' P(遗忘)>0.3 的卡片共 ' + forget.predictedForgetCount + ' 张,占总已学 ' +
      (forget.totalCards > 0 ? Math.round(forget.predictedForgetCount / forget.totalCards * 100) : 0) + '%';

    return el('div', { className: 'dimension dim-8' }, [
      dashboardCard('8.1 四阶段进度', stageBars),
      dashboardCard('8.2 最近 ' + days + ' 天学习曲线', lineSvg),
      dashboardCard('8.3 题型掌握度雷达', radarSvg),
      dashboardCard('8.4 遗忘曲线预测', el('div', { className: 'forget-desc' }, [
        el('p', { text: forgetText })
      ]))
    ]);
  }

  // ============================================================
// 维度 9:学习清单总览
// ============================================================
  function renderDimension9(stage) {
    var lists = (window.Stats && Stats.getAllLists) ? Stats.getAllLists(stage) : [];
    var sessionStats = (window.Stats && Stats.getSessionListStats) ? Stats.getSessionListStats(stage, 'all') : { totalSessions: 0 };
    var container = el('div', { className: 'dimension dim-9' });

    var grid = el('div', { className: 'dim-grid' }, [
      statCard({ label: '9.1 清单总数', value: lists.length, suffix: '个' }),
      statCard({ label: '9.2 会话总数', value: sessionStats.totalSessions, suffix: '次' }),
      statCard({ label: '9.3 学习会话', value: sessionStats.studyCount, suffix: '次' }),
      statCard({ label: '9.4 考试会话', value: sessionStats.testCount, suffix: '次' }),
      statCard({ label: '9.5 平均得分', value: sessionStats.avgScore, suffix: '分' })
    ]);
    container.appendChild(dashboardCard('维度 9 · 学习清单总览', grid));

    var listBlock = el('div', { className: 'lists-dashboard-list' });
    if (lists.length === 0) {
      listBlock.appendChild(el('div', { className: 'empty-msg', text: '暂无学习清单,去词汇列表创建你的第一个清单吧。' }));
    } else {
      lists.slice(0, 12).forEach(function (l) {
        var trend = (window.Stats && Stats.getListTrend) ? Stats.getListTrend(l.id, 'test') : [];
        var updatedLabel = l.updatedAt ? new Date(l.updatedAt).toLocaleDateString('zh-CN') : '—';
        listBlock.appendChild(el('div', {
          className: 'list-overview-card glass mini',
          on: { click: function () { if (window.App) App.navigate('list/' + l.id); } }
        }, [
          el('div', { className: 'list-overview-head' }, [
            el('div', { className: 'list-overview-name', text: l.name }),
            el('div', { className: 'list-overview-grade', text: l.wordCount + ' 词 · ' + updatedLabel })
          ]),
          el('div', { className: 'list-overview-stats' }, [
            el('div', { className: 'list-overview-stat' }, [
              el('div', { className: 'list-overview-stat-label', text: '学习均分' }),
              el('div', { className: 'list-overview-stat-value', text: l.avgStudyScore || '-' })
            ]),
            el('div', { className: 'list-overview-stat' }, [
              el('div', { className: 'list-overview-stat-label', text: '考试均分' }),
              el('div', { className: 'list-overview-stat-value', text: l.avgTestScore || '-' })
            ]),
            el('div', { className: 'list-overview-stat' }, [
              el('div', { className: 'list-overview-stat-label', text: '考试最高' }),
              el('div', { className: 'list-overview-stat-value', text: l.bestTestScore || '-' })
            ])
          ]),
          el('div', { className: 'list-overview-trend' }, [trendSvgMini(trend)])
        ]));
      });
    }
    container.appendChild(dashboardCard('9.6 各清单表现(点入看详情)', listBlock));
    return container;
  }

  function trendSvgMini(points) {
    var w = 220, h = 40;
    var padL = 4, padR = 4, padT = 4, padB = 4;
    var iw = w - padL - padR;
    var ih = h - padT - padB;
    if (points.length === 0) {
      var empty = el('div', { className: 'text-muted small', text: '暂无数据' });
      return empty;
    }
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });
    if (points.length === 1) {
      var cx = padL + iw / 2;
      var cy = padT + ih / 2;
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 4, fill: '#6c5ce7' }));
      return svg;
    }
    var pts = points.map(function (p, i) {
      var x = padL + (iw * i) / (points.length - 1);
      var y = padT + ih - ((p.score || 0) / 100) * ih;
      return { x: x, y: y };
    });
    var d = 'M ' + pts.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
    svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: '#6c5ce7', 'stroke-width': 2 }));
    pts.forEach(function (pt) {
      svg.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: 2.5, fill: '#6c5ce7' }));
    });
    return svg;
  }

  // ============================================================
  // 维度 10:能力维度趋势(5 大能力并列小图)
  // ============================================================
  function renderDimension10(stage, range) {
    var days = parseInt(range, 10) || 30;
    var overview = (window.Stats && Stats.getAbilityOverview) ? Stats.getAbilityOverview(stage, days) : [];
    var grid = el('div', { className: 'ability-grid' });
    if (overview.length === 0 || overview.every(function (a) { return a.activeDays === 0; })) {
      grid.appendChild(el('div', { className: 'empty-msg', text: '暂无能力维度数据,完成对应模式的学习后将自动填充。' }));
    } else {
      overview.forEach(function (a) {
        var chartData = a.trend.map(function (p) { return { label: p.date.slice(5), value: p.value }; });
        var hasData = chartData.some(function (d) { return d.value > 0 || true; });
        var chartEl = a.activeDays > 0
          ? lineChart(chartData, { labels: [], min: 0, max: 100, width: 320, height: 90 })
          : el('div', { className: 'empty-msg small', text: '暂未开始此能力维度练习' });
        grid.appendChild(el('div', { className: 'ability-card glass' }, [
          el('div', { className: 'ability-card-head' }, [
            el('div', { className: 'ability-card-label', text: a.label }),
            el('div', { className: 'ability-card-rate', text: a.avgRate + '%' })
          ]),
          el('div', { className: 'ability-card-meta text-muted', text:
            a.activeDays + ' 天有数据 · 近 ' + days + ' 天' }),
          el('div', { className: 'ability-card-chart' }, [chartEl])
        ]));
      });
    }
    return el('div', { className: 'dimension dim-10' }, [
      dashboardCard('维度 10 · 5 大能力维度趋势(拼写 / 中文 / 发音 / 造句 / 填空)', grid)
    ]);
  }

  // ============================================================
  // 维度 11:错题清空率 — 对应 standards.md E 维度
  // ============================================================
  function renderDimension11(stage) {
    var info = (window.Stats && Stats.getClearRate) ? Stats.getClearRate(stage) : {
      rate: 0, threshold: 90, passed: false, currentCount: 0, clearedCount: 0,
      totalEncountered: 0, segmentLabel: '初中', gap: 90
    };
    var ring = progressRing(Math.min(100, Math.max(0, info.rate)), { size: 160, stroke: 12 });
    var rateClass = info.passed ? 'high' : (info.rate >= info.threshold - 10 ? 'mid' : 'low');
    var rateColor = info.passed ? '#2ed573' : (rateClass === 'mid' ? '#ffa502' : '#ff4757');

    var headline = el('div', { className: 'clear-rate-headline' }, [
      el('div', { className: 'clear-rate-ring', html: ring.outerHTML || '' }),
      el('div', { className: 'clear-rate-text' }, [
        el('div', { className: 'clear-rate-num', text: info.rate + '%', style: 'color:' + rateColor }),
        el('div', { className: 'clear-rate-label', text: '错题清空率' }),
        el('div', { className: 'clear-rate-segment', text: '段位:' + info.segmentLabel + ' · 门槛 ' + info.threshold + '%' }),
        el('div', { className: 'clear-rate-verdict ' + (info.passed ? 'pass' : 'fail'), text:
          info.passed
            ? '✓ 已达 ' + info.segmentLabel + '阶段清空标准'
            : (info.totalEncountered === 0
                ? '尚无错题记录'
                : '差 ' + info.gap + '% 达到 ' + info.segmentLabel + '阶段门槛') })
      ])
    ]);

    var summary = el('div', { className: 'clear-rate-summary' }, [
      statCard({ label: '当前错题本', value: info.currentCount, suffix: '词' }),
      statCard({ label: '累计已清空', value: info.clearedCount, suffix: '词' }),
      statCard({ label: '累计遇到', value: info.totalEncountered, suffix: '词' }),
      statCard({ label: '门槛缺口', value: info.passed ? 0 : info.gap, suffix: '%' })
    ]);

    var thresholdBar = el('div', { className: 'clear-rate-threshold-bar' }, [
      el('div', { className: 'clear-rate-bar-title', text: 'vs 段位门槛' }),
      el('div', { className: 'clear-rate-bar-track' }, [
        el('div', { className: 'clear-rate-bar-threshold', style: 'left:' + info.threshold + '%' }),
        el('div', { className: 'clear-rate-bar-fill ' + (info.passed ? 'pass' : 'fail'),
          style: 'width:' + Math.min(100, info.rate) + '%' }),
        el('div', { className: 'clear-rate-bar-marker', text: info.rate + '%',
          style: 'left:' + Math.min(100, info.rate) + '%' })
      ])
    ]);

    var body = el('div', { className: 'clear-rate-body' }, [
      headline,
      summary,
      thresholdBar
    ]);

    return el('div', { className: 'dimension dim-11' }, [
      dashboardCard('维度 11 · 错题清空率(对应 standards.md E 维度 · 季末清空率必须 ≥ 段位门槛)', body)
    ]);
  }

  // ============================================================
  // 维度 12:Feynman 复述挑战 — 对应 standards.md D 维度
  // ============================================================
  function renderDimension12(stage) {
    var info = (window.Stats && Stats.getFeynmanStats) ? Stats.getFeynmanStats(stage) : {
      totalCount: 0, threshold: 12, gap: 12, passed: false,
      weeklyTarget: 1, segmentLabel: '初中', wordRange: { min: 5, max: 8 },
      totalWordsTried: 0, totalWordsUsed: 0, coverageRate: 0,
      avgScore: 0, scoreEvaluated: 0, recentTrend: []
    };

    var countRing = progressRing(info.threshold === 0 ? 0
      : Math.min(100, Math.round(info.totalCount / info.threshold * 100)),
      { size: 140, stroke: 10 });
    var countColor = info.passed ? '#2ed573' : (info.totalCount >= info.threshold * 0.7 ? '#ffa502' : '#ff4757');

    var headline = el('div', { className: 'feynman-headline' }, [
      el('div', { className: 'feynman-ring', html: countRing.outerHTML || '' }),
      el('div', { className: 'feynman-numbers' }, [
        el('div', { className: 'feynman-count-row' }, [
          el('span', { className: 'feynman-count', text: info.totalCount, style: 'color:' + countColor }),
          el('span', { className: 'feynman-count-divider', text: '/' }),
          el('span', { className: 'feynman-threshold', text: info.threshold + ' 次' })
        ]),
        el('div', { className: 'feynman-label', text: 'Feynman 复述次数(季度)' }),
        el('div', { className: 'feynman-segment', text:
          '段位:' + info.segmentLabel + ' · 每周 ≥ ' + info.weeklyTarget + ' 次' }),
        el('div', { className: 'feynman-verdict ' + (info.passed ? 'pass' : 'fail'), text:
          info.passed
            ? '✓ 已达 ' + info.segmentLabel + '阶段复述门槛'
            : '还差 ' + info.gap + ' 次到 ' + info.segmentLabel + '阶段门槛' })
      ])
    ]);

    var summary = el('div', { className: 'feynman-summary' }, [
      statCard({ label: '挑战词数', value: info.totalWordsTried, suffix: '词' }),
      statCard({ label: '已用词数', value: info.totalWordsUsed, suffix: '词' }),
      statCard({ label: '覆盖率', value: info.coverageRate, suffix: '%' }),
      statCard({ label: '平均得分', value: info.avgScore, suffix: '分' })
    ]);

    var wordRangeNote = el('div', { className: 'feynman-range', text:
      '�� 段位建议:每次复述 ' + info.wordRange.min + '-' + info.wordRange.max + ' 个新词' });

    var trendBox = el('div', { className: 'feynman-trend' });
    if (info.recentTrend && info.recentTrend.length > 0) {
      var trend = info.recentTrend.slice();
      trend.reverse();
      var chartData = trend.map(function (p) {
        var d = new Date(p.timestamp);
        var ds = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return { label: ds, value: p.score };
      });
      var chartEl = lineChart(chartData, {
        labels: [], min: 0, max: 100, width: 360, height: 100
      });
      trendBox.appendChild(el('div', { className: 'feynman-trend-title', text: '近 ' + chartData.length + ' 次得分趋势' }));
      trendBox.appendChild(chartEl);
    } else {
      trendBox.appendChild(el('div', { className: 'empty-msg', text: '暂无复述数据,完成一次 Feynman 复述后将自动填充。' }));
    }

    var thresholdBar = el('div', { className: 'feynman-threshold-bar' }, [
      el('div', { className: 'feynman-bar-title', text: '进度 vs 阶段门槛' }),
      el('div', { className: 'feynman-bar-track' }, [
        el('div', { className: 'feynman-bar-fill ' + (info.passed ? 'pass' : 'fail'),
          style: 'width:' + Math.min(100, info.threshold === 0 ? 0 : info.totalCount / info.threshold * 100) + '%' }),
        el('div', { className: 'feynman-bar-marker', text: info.totalCount + '次',
          style: 'left:' + Math.min(100, info.threshold === 0 ? 0 : info.totalCount / info.threshold * 100) + '%' }),
        el('div', { className: 'feynman-bar-target', text: '目标 ' + info.threshold + '次' })
      ])
    ]);

    var body = el('div', { className: 'feynman-body' }, [
      headline,
      summary,
      wordRangeNote,
      trendBox,
      thresholdBar
    ]);

    return el('div', { className: 'dimension dim-12' }, [
      dashboardCard('维度 12 · Feynman 复述挑战(对应 standards.md D 维度 · 季度复述次数必须 ≥ 段位门槛)', body)
    ]);
  }

  // ============================================================
// 主入口
// ============================================================
  function render(stage, options) {
    options = options || {};
    var range = options.range || '30';
    var root = el('div', { className: 'dashboard-root' });
    root.appendChild(renderDimension1(stage));
    root.appendChild(renderDimension2(stage, range));
    root.appendChild(renderDimension3(stage, range));
    root.appendChild(renderDimension4(stage, range));
    root.appendChild(renderDimension5(stage));
    root.appendChild(renderDimension6(stage, range));
    root.appendChild(renderDimension7(stage));
    root.appendChild(renderDimension8(stage, range));
    root.appendChild(renderDimension9(stage));
    root.appendChild(renderDimension10(stage, range));
    root.appendChild(renderDimension11(stage));
    root.appendChild(renderDimension12(stage));
    return root;
  }

  function renderCharts(data) {
    // 兼容入口:根据 data.type 选图表
    var type = data.type;
    if (type === 'bar') return barChart(data.values, data.options);
    if (type === 'line') return lineChart(data.values, data.options);
    if (type === 'radar') return radarChart(data.values, data.options);
    if (type === 'heatmap') return heatmap(data.values, data.options);
    if (type === 'ring') return progressRing(data.value, data.options);
    return empty('未知图表类型');
  }

  // ---------- 公开 API ----------
  global.Dashboard = {
    render: render,
    renderDimension1: renderDimension1,
    renderDimension2: renderDimension2,
    renderDimension3: renderDimension3,
    renderDimension4: renderDimension4,
    renderDimension5: renderDimension5,
    renderDimension6: renderDimension6,
    renderDimension7: renderDimension7,
    renderDimension8: renderDimension8,
    renderDimension9: renderDimension9,
    renderDimension10: renderDimension10,
    renderDimension11: renderDimension11,
    renderDimension12: renderDimension12,
    renderCharts: renderCharts,
    // 暴露图表组件
    barChart: barChart,
    lineChart: lineChart,
    radarChart: radarChart,
    heatmap: heatmap,
    progressRing: progressRing,
    statCard: statCard,
    progressBar: progressBar
  };
})(window);
