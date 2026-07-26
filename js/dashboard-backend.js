/**
 * VocabMastery · Cloud Dashboard Renderer
 * 渲染 /api/stats 后端聚合数据 — 跨设备同步
 * 当后端不可用时,app.js 会回退到本地 Dashboard
 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    if (opts) {
      if (opts.className) node.className = opts.className;
      if (opts.id) node.id = opts.id;
      if (opts.text != null) node.textContent = opts.text;
      if (opts.html != null) node.innerHTML = opts.html;
      if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) { node.setAttribute(k, opts.attrs[k]); });
      if (opts.on) Object.keys(opts.on).forEach(function (evt) { node.addEventListener(evt, opts.on[evt]); });
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

  function statCard(label, value, suffix, sub) {
    return el('div', { className: 'stat-card glass' }, [
      el('div', { className: 'label', text: label }),
      el('div', { className: 'value', text: String(value) }),
      suffix ? el('span', { className: 'card-suffix', text: suffix }) : null,
      sub ? el('div', { className: 'delta', text: sub }) : null
    ]);
  }

  function progressBar(percent) {
    var wrap = el('div', { className: 'progress-bar' });
    var fill = el('div', { className: 'progress-fill' });
    fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    wrap.appendChild(fill);
    return wrap;
  }

  function dashboardCard(title, body) {
    return el('div', { className: 'dash-card glass' }, [
      el('div', { className: 'dash-card-title', text: title }),
      body
    ]);
  }

  function emptyMsg(text) {
    return el('div', { className: 'empty-msg', text: text || '暂无数据' });
  }

  // ----- 折线图(用于 timeline) -----
  function lineChart(points, opts) {
    opts = opts || {};
    if (!points || points.length === 0) return emptyMsg('暂无时间轴数据');
    var w = opts.width || 720, h = opts.height || 200;
    var padL = 36, padR = 14, padT = 16, padB = 28;
    var iw = w - padL - padR;
    var ih = h - padT - padB;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });

    var maxV = 0;
    points.forEach(function (p) { if (p.value > maxV) maxV = p.value; });
    if (maxV === 0) maxV = 1;

    for (var g = 0; g <= 4; g++) {
      var y = padT + ih * (g / 4);
      svg.appendChild(svgEl('line', {
        x1: padL, y1: y, x2: w - padR, y2: y, stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 1
      }));
      var val = maxV * (1 - g / 4);
      var t = svgEl('text', {
        x: padL - 4, y: y + 3, fill: '#a4b0be', 'font-size': 10, 'text-anchor': 'end'
      });
      t.textContent = Math.round(val);
      svg.appendChild(t);
    }

    var pts = points.map(function (p, i) {
      var x = padL + (points.length === 1 ? iw / 2 : (i * iw / (points.length - 1)));
      var y = padT + ih - (p.value / maxV) * ih;
      return { x: x, y: y };
    });
    if (pts.length > 1) {
      var d = 'M ' + pts.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: '#6c5ce7', 'stroke-width': 2 }));
      pts.forEach(function (pt) {
        svg.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: 2.5, fill: '#6c5ce7' }));
      });
    }
    // x 轴标签(首尾)
    if (points.length > 0) {
      var first = svgEl('text', { x: padL, y: h - 8, fill: '#a4b0be', 'font-size': 10 });
      first.textContent = String(points[0].label || '');
      svg.appendChild(first);
      if (points.length > 1) {
        var last = svgEl('text', {
          x: padL + iw, y: h - 8, fill: '#a4b0be', 'font-size': 10, 'text-anchor': 'end'
        });
        last.textContent = String(points[points.length - 1].label || '');
        svg.appendChild(last);
      }
    }
    return svg;
  }

  function barChart(items, opts) {
    opts = opts || {};
    if (!items || items.length === 0) return emptyMsg('暂无数据');
    var w = opts.width || 360, h = opts.height || 180;
    var padL = 32, padR = 12, padT = 12, padB = 28;
    var iw = w - padL - padR, ih = h - padT - padB;
    var values = items.map(function (d) { return d.value; });
    var maxV = Math.max.apply(null, values.concat([1]));
    var bw = iw / items.length * 0.7;
    var gap = iw / items.length * 0.3;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });
    for (var g = 0; g <= 4; g++) {
      var y = padT + ih * (g / 4);
      svg.appendChild(svgEl('line', {
        x1: padL, y1: y, x2: w - padR, y2: y, stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 1
      }));
      var t = svgEl('text', {
        x: padL - 4, y: y + 3, fill: '#a4b0be', 'font-size': 10, 'text-anchor': 'end'
      });
      t.textContent = Math.round(maxV * (1 - g / 4));
      svg.appendChild(t);
    }
    items.forEach(function (it, i) {
      var x = padL + i * (bw + gap) + gap / 2;
      var bh = (it.value / maxV) * ih;
      var y = padT + ih - bh;
      svg.appendChild(svgEl('rect', {
        x: x, y: y, width: bw, height: bh, rx: 4, fill: '#6c5ce7'
      }));
      if (it.label != null) {
        var lt = svgEl('text', {
          x: x + bw / 2, y: h - 10, fill: '#a4b0be', 'font-size': 10, 'text-anchor': 'middle'
        });
        lt.textContent = String(it.label);
        svg.appendChild(lt);
      }
      if (it.value > 0) {
        var vt = svgEl('text', {
          x: x + bw / 2, y: y - 3, fill: '#fff', 'font-size': 10, 'text-anchor': 'middle'
        });
        vt.textContent = Math.round(it.value);
        svg.appendChild(vt);
      }
    });
    return svg;
  }

  // ----- 维度 1:总览 -----
  function renderOverview(summary, range) {
    var grid = el('div', { className: 'dim-grid' }, [
      statCard('总测验', summary.totalTests, '次'),
      statCard('总背诵', summary.totalQuizzes, '次'),
      statCard('总学习', summary.totalSessions, '次'),
      statCard('测验均分', summary.avgTestScore, '分'),
      statCard('答题正确率', summary.answerRate, '%'),
      statCard('错词去重', summary.wrongUnique, '词'),
      statCard('错词累计', summary.wrongTotal, '次'),
      statCard('学习清单', summary.totalLists, '个')
    ]);
    return el('div', { className: 'dimension dim-1' }, [
      dashboardCard('维度 1 · 后端聚合总览(' + rangeLabel(range) + ')', grid)
    ]);
  }

  function rangeLabel(range) {
    return range === 'all' ? '全部时间' : ('近 ' + range + ' 天');
  }

  // ----- 维度 2:时间轴 -----
  function renderTimeline(timeline, range) {
    if (!timeline) return el('div', { className: 'dimension' }, [
      dashboardCard('维度 2 · 时间轴', emptyMsg('暂无时间轴数据'))
    ]);
    var lineData = timeline.map(function (b) {
      return {
        label: b.date.slice(5),
        value: b.total
      };
    });
    var accData = timeline.map(function (b) {
      return {
        label: b.date.slice(5),
        value: Math.round(b.accuracy)
      };
    });
    var scoreData = timeline.map(function (b) {
      return {
        label: b.date.slice(5),
        value: b.avgScore
      };
    });
    var lineSvg = lineChart(lineData, { width: 720, height: 180 });
    var accSvg = lineChart(accData, { width: 720, height: 140, max: 100 });
    var scoreSvg = lineChart(scoreData, { width: 720, height: 140 });

    return el('div', { className: 'dimension' }, [
      dashboardCard('维度 2 · 时间轴 · 每日活动量(' + rangeLabel(range) + ')', lineSvg),
      dashboardCard('维度 2.2 · 每日答题正确率', accSvg),
      dashboardCard('维度 2.3 · 每日平均分', scoreSvg)
    ]);
  }

  // ----- 维度 3:按学期分布 -----
  function renderByStage(byStage) {
    var stageNames = (window.Storage && Storage.STAGE_NAMES) || {};
    var items = (byStage || []).map(function (s) {
      return {
        label: stageNames[s.stage] || s.stage,
        value: s.tests,
        meta: '均分 ' + s.avgScore + ' · 正确率 ' + s.accuracy + '%'
      };
    });
    var grid = el('div', { className: 'dim-grid' });
    (byStage || []).forEach(function (s) {
      grid.appendChild(statCard(
        stageNames[s.stage] || s.stage,
        s.tests + ' 次 · 均分 ' + s.avgScore,
        '',
        '正确率 ' + s.accuracy + '% · 共 ' + s.answers + ' 题'
      ));
    });
    return el('div', { className: 'dimension' }, [
      dashboardCard('维度 3 · 按学期分布', grid),
      dashboardCard('维度 3.1 · 各学期测验次数柱状图', barChart(items, { width: 720, height: 200 }))
    ]);
  }

  // ----- 维度 4:按题型 -----
  function renderByMode(byMode) {
    var grid = el('div', { className: 'dim-grid' });
    (byMode || []).forEach(function (m) {
      grid.appendChild(statCard(
        m.mode,
        m.tests + ' 次 · 均分 ' + m.avgScore,
        '',
        '正确率 ' + m.accuracy + '% · ' + m.answers + ' 题'
      ));
    });
    return el('div', { className: 'dimension' }, [
      dashboardCard('维度 4 · 按题型分布(T1-T10)', grid)
    ]);
  }

  // ----- 维度 5:错题热力 -----
  function renderWrongBook(wb) {
    var bySource = wb.bySource || {};
    var sourceGrid = el('div', { className: 'dim-grid' }, [
      statCard('当前错题', wb.total, '词'),
      statCard('累计错次', wb.occurrences, '次'),
      statCard('已解决', wb.resolvedCount, '词'),
      statCard('清空率', wb.clearRate, '%'),
      statCard('来源:测验', bySource.test || 0, '次'),
      statCard('来源:背诵', bySource.quiz || 0, '次')
    ]);

    var topList = el('div', { className: 'wrong-cloud-list' });
    if (!wb.topWords || wb.topWords.length === 0) {
      topList.appendChild(emptyMsg('暂无错题'));
    } else {
      var vocab = Storage.getVocab(Storage.getCurrentStage());
      var byId = {};
      if (vocab && vocab.words) vocab.words.forEach(function (w) { byId[w.id] = w; });
      wb.topWords.slice(0, 20).forEach(function (w, i) {
        var info = byId[w.word_id];
        var word = info ? info.word : ('#' + w.word_id);
        var trans = info ? (info.translation || '') : '';
        topList.appendChild(el('div', {
          className: 'wrong-cloud-item' + (w.isResolved ? ' resolved' : '')
        }, [
          el('span', { className: 'rank', text: '#' + (i + 1) }),
          el('span', { className: 'word', text: word }),
          el('span', { className: 'trans text-muted', text: trans }),
          el('span', { className: 'count tag danger', text: '×' + (w.wrong_count || 1) }),
          w.isResolved ? el('span', { className: 'tag success', text: '✓ 已解决' }) : null
        ]));
      });
    }

    return el('div', { className: 'dimension' }, [
      dashboardCard('维度 5 · 错题热力统计', sourceGrid),
      dashboardCard('维度 5.1 · 易错词 Top 20(云端聚合)', topList)
    ]);
  }

  // ----- 维度 6:学习清单概览 -----
  function renderLists(lists) {
    var grid = el('div', { className: 'dim-grid' });
    if (!lists || lists.length === 0) {
      grid.appendChild(emptyMsg('暂无学习清单'));
    } else {
      var stageNames = (window.Storage && Storage.STAGE_NAMES) || {};
      lists.slice(0, 12).forEach(function (l) {
        grid.appendChild(el('div', {
          className: 'list-overview-card glass mini',
          on: { click: function () { if (window.App) App.navigate('list/' + l.id); } }
        }, [
          el('div', { className: 'list-overview-name', text: l.name }),
          el('div', { className: 'text-muted small', text:
            (stageNames[l.stage] || l.stage) + ' · ' + l.wordCount + ' 词 · ' +
            (l.createdAt ? new Date(l.createdAt).toLocaleDateString('zh-CN') : '') })
        ]));
      });
    }
    return el('div', { className: 'dimension' }, [
      dashboardCard('维度 6 · 学习清单(后端同步)', grid)
    ]);
  }

  // ----- 主入口 -----
  function render(stage, options) {
    options = options || {};
    var range = options.range || '30';
    var root = el('div', { className: 'dashboard-root' });
    root.appendChild(el('div', { className: 'cloud-banner glass' }, [
      el('div', { className: 'cloud-banner-icon', text: '☁️' }),
      el('div', { className: 'cloud-banner-text' }, [
        el('div', { className: 'cloud-banner-title', text: '云端数据视图' }),
        el('div', { className: 'cloud-banner-sub', text:
          '数据来自 Supabase · 跨设备同步 · ' + new Date().toLocaleString('zh-CN') })
      ])
    ]));
    return root;
  }

  function renderInto(container, stage, options, data) {
    container.innerHTML = '';
    var root = render(stage, options);
    container.appendChild(root);
    var range = (options && options.range) || '30';
    root.appendChild(renderOverview(data.summary, range));
    root.appendChild(renderTimeline(data.timeline, range));
    root.appendChild(renderByStage(data.byStage));
    root.appendChild(renderByMode(data.byMode));
    root.appendChild(renderWrongBook(data.wrongBook));
    root.appendChild(renderLists(data.lists));
  }

  // 异步加载 + 渲染
  function loadAndRender(stage, options, targetContainer) {
    options = options || {};
    var range = options.range || '30';
    if (!global.BackendSync || !BackendSync.Stats) {
      return Promise.resolve(null);
    }
    return Promise.all([
      BackendSync.Stats.summary({ range: range }),
      BackendSync.Stats.timeline({ range: range })
    ]).then(function (results) {
      var summary = results[0];
      var timeline = results[1];
      if (!summary || !timeline) return null;
      var data = {
        summary: summary.summary || {},
        timeline: timeline.timeline || [],
        byStage: summary.byStage || [],
        byMode: summary.byMode || [],
        wrongBook: summary.wrongBook || {},
        lists: summary.lists || []
      };
      if (targetContainer) renderInto(targetContainer, stage, options, data);
      return data;
    });
  }

  global.CloudDashboard = {
    render: render,
    renderInto: renderInto,
    loadAndRender: loadAndRender
  };
})(window);