/**
 * VocabMastery · History View
 * 显示测试/背诵会话历史列表 + 单次会话详情(得分、用时、错词)
 * 数据来源:vm_history_log (本地) + Storage.getAttemptsLog (兼容历史)
 */
(function (global) {
  'use strict';

  var KEY = 'history_log';

  function load() {
    try {
      var raw = localStorage.getItem('vm_' + KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      if (list.length > 1000) list = list.slice(list.length - 1000);
      localStorage.setItem('vm_' + KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function recordSession(entry) {
    entry = entry || {};
    var item = {
      id: uid(),
      type: entry.type || 'test',
      mode: entry.mode || '',
      modeName: entry.modeName || entry.mode || '',
      stage: entry.stage || '',
      wordCount: entry.wordCount || 0,
      correctCount: entry.correctCount || 0,
      totalTime: entry.totalTime || 0,
      score: entry.score || 0,
      wrongWordIds: entry.wrongWordIds || [],
      wrongWords: entry.wrongWords || [],
      startedAt: entry.startedAt || Date.now(),
      finishedAt: entry.finishedAt || Date.now(),
      scope: entry.scope || null
    };
    var list = load();
    list.push(item);
    save(list);
    return item;
  }

  function getAll() {
    return load().sort(function (a, b) { return b.finishedAt - a.finishedAt; });
  }

  function getByStage(stage) {
    return getAll().filter(function (x) { return !stage || x.stage === stage; });
  }

  function getByType(type) {
    return getAll().filter(function (x) { return !type || x.type === type; });
  }

  function getById(id) {
    var list = load();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function clear(type) {
    var list = load();
    if (!type) { save([]); return; }
    save(list.filter(function (x) { return x.type !== type; }));
  }

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    if (opts) {
      if (opts.className) node.className = opts.className;
      if (opts.id) node.id = opts.id;
      if (opts.text != null) node.textContent = opts.text;
      if (opts.html != null) node.innerHTML = opts.html;
      if (opts.attrs) {
        Object.keys(opts.attrs).forEach(function (k) {
          node.setAttribute(k, opts.attrs[k]);
        });
      }
      if (opts.on) {
        Object.keys(opts.on).forEach(function (evt) {
          node.addEventListener(evt, opts.on[evt]);
        });
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

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtTime(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDur(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' 秒';
    var m = Math.floor(s / 60);
    var rs = s % 60;
    return m + ' 分 ' + rs + ' 秒';
  }
  function stageName(stage) {
    return (global.Storage && Storage.STAGE_NAMES && Storage.STAGE_NAMES[stage]) || stage || '-';
  }
  function getWordMap(stage) {
    var vocab = global.Storage && Storage.getVocab ? Storage.getVocab(stage) : null;
    var map = {};
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) { map[w.id] = w; });
    }
    return map;
  }

  function buildHistoryRow(item, navigate) {
    var pct = item.wordCount > 0 ? Math.round(item.correctCount / item.wordCount * 100) : 0;
    var tone = pct >= 80 ? 'success' : pct >= 60 ? 'warn' : 'danger';
    var tagEmoji = item.type === 'recite' ? '📚' : (item.type === 'test' ? '✅' : '📝');
    return el('div', {
      className: 'history-row',
      on: { click: function () {
        if (typeof navigate === 'function') navigate('history', [item.id]);
      } }
    }, [
      el('div', { className: 'history-row-icon', text: tagEmoji }),
      el('div', { className: 'history-row-main' }, [
        el('div', { className: 'history-row-title', text: item.modeName || item.mode || (item.type === 'recite' ? '背诵' : '测验') }),
        el('div', { className: 'text-muted history-row-meta', text:
          fmtTime(item.finishedAt) + ' · ' + stageName(item.stage) + ' · ' +
          fmtDur(item.totalTime) })
      ]),
      el('div', { className: 'history-row-score' }, [
        el('div', { className: 'history-row-score-num ' + tone, text: pct + '%' }),
        el('div', { className: 'text-muted', text: item.correctCount + ' / ' + item.wordCount })
      ])
    ]);
  }

  function renderHistoryList(container, opts) {
    opts = opts || {};
    var stage = opts.stage || (global.App && App.state ? App.state.currentStage : '');
    var type = opts.type || '';
    var navigate = opts.navigate || (global.App && App.navigate ? App.navigate : null);

    var items = getAll();
    if (stage) items = items.filter(function (x) { return !x.stage || x.stage === stage; });
    if (type) items = items.filter(function (x) { return x.type === type; });

    container.innerHTML = '';

    var header = el('div', { className: 'history-header' });
    var tabs = el('div', { className: 'range-tabs' });
    var types = [
      { v: '', label: '全部' },
      { v: 'test', label: '测验' },
      { v: 'recite', label: '背诵' },
      { v: 'study', label: '学习' }
    ];
    types.forEach(function (t) {
      tabs.appendChild(el('button', {
        className: 'range-tab' + (type === t.v ? ' active' : ''),
        text: t.label,
        on: { click: function () {
          renderHistoryList(container, { stage: stage, type: t.v, navigate: navigate });
        } }
      }));
    });
    header.appendChild(tabs);
    if (items.length > 0) {
      header.appendChild(el('button', {
        className: 'btn btn-ghost btn-sm',
        text: '🗑 清空' + (type ? ('「' + (type === 'test' ? '测验' : type === 'recite' ? '背诵' : '学习') + '」') : '全部'),
        on: { click: function () {
          if (!confirm('确认清空历史?该操作不可撤销。')) return;
          clear(type || '');
          if (global.App && App.toast) App.toast('已清空', 'success');
          renderHistoryList(container, { stage: stage, type: type, navigate: navigate });
        } }
      }));
    }
    container.appendChild(header);

    if (items.length === 0) {
      container.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '📜' }),
        el('h2', { text: '还没有历史记录' }),
        el('p', { text: '完成一次背诵或测验后会自动记录在这里。' })
      ]));
      return;
    }

    var list = el('div', { className: 'history-list' });
    items.forEach(function (it) { list.appendChild(buildHistoryRow(it, navigate)); });
    container.appendChild(list);

    var stats = aggregate(items);
    var statBox = el('div', { className: 'history-stats mt-4' }, [
      el('div', { className: 'stat-grid' }, [
        el('div', { className: 'stat-card' }, [
          el('div', { className: 'label', text: '总次数' }),
          el('div', { className: 'value', text: String(stats.total) }),
          el('span', { className: 'text-muted', text: ' 次' })
        ]),
        el('div', { className: 'stat-card' }, [
          el('div', { className: 'label', text: '平均分' }),
          el('div', { className: 'value', text: String(stats.avgScore) }),
          el('span', { className: 'text-muted', text: ' / 100' })
        ]),
        el('div', { className: 'stat-card' }, [
          el('div', { className: 'label', text: '最高分' }),
          el('div', { className: 'value', text: String(stats.bestScore) }),
          el('span', { className: 'text-muted', text: ' / 100' })
        ]),
        el('div', { className: 'stat-card' }, [
          el('div', { className: 'label', text: '累计耗时' }),
          el('div', { className: 'value', text: fmtDur(stats.totalTime) }),
          el('span', { className: 'text-muted', text: '' })
        ])
      ])
    ]);
    container.appendChild(statBox);
  }

  function aggregate(items) {
    if (!items.length) return { total: 0, avgScore: 0, bestScore: 0, totalTime: 0 };
    var sum = 0, best = 0, tt = 0;
    items.forEach(function (it) {
      sum += it.score || 0;
      if ((it.score || 0) > best) best = it.score || 0;
      tt += it.totalTime || 0;
    });
    return { total: items.length, avgScore: Math.round(sum / items.length), bestScore: best, totalTime: tt };
  }

  function renderHistoryDetail(container, itemId, navigate) {
    var item = getById(itemId);
    container.innerHTML = '';
    if (!item) {
      container.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '🔍' }),
        el('h2', { text: '记录不存在或已删除' }),
        el('button', { className: 'btn btn-primary mt-3', text: '返回历史',
          on: { click: function () { if (navigate) navigate('history'); } } })
      ]));
      return;
    }
    var pct = item.wordCount > 0 ? Math.round(item.correctCount / item.wordCount * 100) : 0;
    var tone = pct >= 80 ? 'success' : pct >= 60 ? 'warn' : 'danger';

    var wrap = el('div', { className: 'history-detail' });
    wrap.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 返回历史',
        on: { click: function () { if (navigate) navigate('history'); } } }),
      el('h2', { text: (item.type === 'test' ? '✅ ' : (item.type === 'recite' ? '📚 ' : '📝 ')) +
        (item.modeName || item.mode || '会话详情') }),
      el('span', { className: 'small text-muted', text: fmtTime(item.finishedAt) })
    ]));

    var cards = el('div', { className: 'stat-grid mt-3' }, [
      el('div', { className: 'stat-card' }, [
        el('div', { className: 'label', text: '得分' }),
        el('div', { className: 'value ' + tone, text: String(item.score || pct) }),
        el('span', { className: 'text-muted', text: ' / 100' })
      ]),
      el('div', { className: 'stat-card' }, [
        el('div', { className: 'label', text: '正确' }),
        el('div', { className: 'value', text: item.correctCount + ' / ' + item.wordCount }),
        el('span', { className: 'text-muted', text: ' ' + pct + '%' })
      ]),
      el('div', { className: 'stat-card' }, [
        el('div', { className: 'label', text: '用时' }),
        el('div', { className: 'value', text: fmtDur(item.totalTime) }),
        el('span', { className: 'text-muted', text: item.wordCount > 0 ?
          Math.round(item.totalTime / Math.max(1, item.wordCount) / 100) / 10 + ' s/题' : '' })
      ]),
      el('div', { className: 'stat-card' }, [
        el('div', { className: 'label', text: '词库' }),
        el('div', { className: 'value', text: stageName(item.stage) }),
        el('span', { className: 'text-muted', text: item.scope ? ('范围 ' + item.scope.from + '-' + item.scope.to) : '' })
      ])
    ]);
    wrap.appendChild(cards);

    if (item.wrongWords && item.wrongWords.length) {
      var wordMap = getWordMap(item.stage);
      var wrongBox = el('div', { className: 'card mt-4' }, [
        el('div', { className: 'card-title', text: '✗ 错题 (' + item.wrongWords.length + ')' })
      ]);
      var ul = el('div', { className: 'wrong-list mt-2' });
      item.wrongWords.forEach(function (w) {
        var wordInfo = (wordMap[w.wordId]) || (wordMap[w.id]) || null;
        var wordStr = (w.word || (wordInfo && wordInfo.word) || ('#' + (w.wordId || w.id)));
        var trans = (w.translation || (wordInfo && wordInfo.translation) || '');
        ul.appendChild(el('div', { className: 'wrong-item' }, [
          el('div', { className: 'wrong-item-main' }, [
            el('div', { className: 'wrong-item-word' }, [
              el('span', { text: wordStr }),
              el('span', { className: 'wrong-item-freq', text: '✗' })
            ]),
            el('div', { className: 'wrong-item-trans', text: trans })
          ]),
          el('div', { className: 'wrong-item-actions' }, [
            el('span', { className: 'text-muted', text: '你答:' + (w.userAnswer || '(空)') })
          ])
        ]));
      });
      wrongBox.appendChild(ul);
      wrap.appendChild(wrongBox);
    } else {
      wrap.appendChild(el('div', { className: 'text-center text-muted mt-4', text: '🎯 这次没有错题,完美作答!' }));
    }

    container.appendChild(wrap);
  }

  function renderSummaryBox(opts) {
    opts = opts || {};
    var stage = opts.stage || (global.App && App.state ? App.state.currentStage : '');
    var type = opts.type || '';
    var items = getAll();
    if (stage) items = items.filter(function (x) { return !x.stage || x.stage === stage; });
    if (type) items = items.filter(function (x) { return !type || x.type === type; });
    var stats = aggregate(items);
    var root = el('div', { className: 'card history-mini' }, [
      el('div', { className: 'card-title', text: '📜 最近历史' })
    ]);
    if (!items.length) {
      root.appendChild(el('p', { className: 'text-muted', text: '暂无记录。完成一次背诵或测验即可在这里查看。' }));
      return root;
    }
    items.slice(0, 5).forEach(function (it) {
      var pct = it.wordCount > 0 ? Math.round(it.correctCount / it.wordCount * 100) : 0;
      root.appendChild(el('div', { className: 'history-mini-row', on: { click: function () {
        if (global.App && App.navigate) App.navigate('history', [it.id]);
      } } }, [
        el('span', { className: 'history-mini-title', text: it.modeName || it.mode || (it.type === 'test' ? '测验' : '背诵') }),
        el('span', { className: 'text-muted', text: fmtTime(it.finishedAt) }),
        el('span', { className: 'history-mini-score', text: pct + '%' })
      ]));
    });
    if (global.App && App.navigate) {
      root.appendChild(el('div', { className: 'mt-2' }, [
        el('button', { className: 'btn btn-ghost btn-sm', text: '查看全部 →', on: { click: function () {
          App.navigate('history');
        } } })
      ]));
    }
    return root;
  }

  global.HistoryView = {
    recordSession: recordSession,
    getAll: getAll,
    getByStage: getByStage,
    getByType: getByType,
    getById: getById,
    clear: clear,
    renderHistoryList: renderHistoryList,
    renderHistoryDetail: renderHistoryDetail,
    renderSummaryBox: renderSummaryBox
  };
})(window);