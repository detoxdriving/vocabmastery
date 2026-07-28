(function (global) {
  'use strict';

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

  function svgEl(name, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtRel(ts) {
    if (!ts) return '从未';
    var diff = Date.now() - ts;
    var min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return min + ' 分钟前';
    var h = Math.floor(min / 60);
    if (h < 24) return h + ' 小时前';
    var d = Math.floor(h / 24);
    if (d < 30) return d + ' 天前';
    return fmtDate(ts).slice(0, 10);
  }

  function trendSvg(points, opts) {
    opts = opts || {};
    var w = opts.width || 360;
    var h = opts.height || 80;
    var padL = 6, padR = 6, padT = 6, padB = 6;
    var iw = w - padL - padR;
    var ih = h - padT - padB;
    if (points.length === 0) {
      var empty = el('div', { className: 'text-muted small', text: '暂无趋势数据' });
      return empty;
    }
    var minV = 0, maxV = 100;
    var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'chart-svg' });
    if (points.length === 1) {
      var cx = padL + iw / 2;
      var cy = padT + ih / 2;
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 5, fill: '#6c5ce7' }));
      svg.appendChild(svgEl('text', {
        x: cx, y: cy - 10, fill: '#a4b0be', 'font-size': 10, 'text-anchor': 'middle'
      })).textContent = points[0].score + '分';
      return svg;
    }
    var pts = points.map(function (p, i) {
      var x = padL + (iw * i) / (points.length - 1);
      var y = padT + ih - ((p.score - minV) / (maxV - minV || 1)) * ih;
      return { x: x, y: y, p: p };
    });
    var d = 'M ' + pts.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
    svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: '#6c5ce7', 'stroke-width': 2 }));
    svg.appendChild(svgEl('path', {
      d: d + ' L ' + pts[pts.length - 1].x + ' ' + (padT + ih) + ' L ' + pts[0].x + ' ' + (padT + ih) + ' Z',
      fill: 'rgba(108,92,231,0.18)', stroke: 'none'
    }));
    pts.forEach(function (pt) {
      svg.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: 3, fill: '#6c5ce7' }));
    });
    return svg;
  }

  function renderListsOverview() {
    var stage = Storage.getCurrentStage();
    var allLists = StudyLists.getAllLists();
    var lists = allLists.filter(function (l) { return l.stage === stage; });

    var wrapper = el('div', { className: 'study-lists-view' });

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { if (window.App) App.navigate('home'); } }
      }),
      el('h2', { text: '📋 学习清单 · ' + (Storage.STAGE_NAMES[stage] || stage) })
    ]));

    if (lists.length === 0) {
      wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '📋' }),
        el('h2', { text: '还没有学习清单' }),
        el('p', { text: '去词汇列表勾选要学的词,选完自动按格式建清单。' }),
        el('button', {
          className: 'btn btn-primary',
          text: '📚 去词汇列表挑词',
          on: { click: function () { if (window.App) App.navigate('lists'); } }
        })
      ]));
      return wrapper;
    }

    var grid = el('div', { className: 'list-overview-grid' });
    lists.forEach(function (l) {
      var stats = StudyLists.getListStats(l.id);
      var trend = StudyLists.getListTrend(l.id, 'test');
      var card = el('div', {
        className: 'list-overview-card glass',
        on: { click: function () { if (window.App) App.navigate('list/' + l.id); } }
      }, [
        el('div', { className: 'list-overview-head' }, [
          el('div', { className: 'list-overview-name', text: l.name }),
          el('div', { className: 'list-overview-grade', text: gradeLabel(l.stage, l.grade) })
        ]),
        el('div', { className: 'list-overview-meta', text:
          '共 ' + stats.wordCount + ' 词 · ' +
          stats.study.count + ' 次学习 · ' +
          stats.test.count + ' 次考试 · 更新于 ' + fmtRel(l.updatedAt) }),
        el('div', { className: 'list-overview-stats' }, [
          el('div', { className: 'list-overview-stat' }, [
            el('div', { className: 'list-overview-stat-label', text: '学习平均分' }),
            el('div', { className: 'list-overview-stat-value', text: stats.study.avgScore || '-', suffix: '' })
          ]),
          el('div', { className: 'list-overview-stat' }, [
            el('div', { className: 'list-overview-stat-label', text: '考试平均分' }),
            el('div', { className: 'list-overview-stat-value', text: stats.test.avgScore || '-', suffix: '' })
          ]),
          el('div', { className: 'list-overview-stat' }, [
            el('div', { className: 'list-overview-stat-label', text: '考试最高分' }),
            el('div', { className: 'list-overview-stat-value', text: stats.test.bestScore || '-', suffix: '' })
          ])
        ]),
        el('div', { className: 'list-overview-trend', text: '📈 考试得分趋势' }),
        trendSvg(trend)
      ]);
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);
    return wrapper;
  }

  function gradeLabel(stage, grade) {
    if (!grade || grade === 'all') return Storage.STAGE_NAMES[stage] || stage;
    var grades = WordBrowser.getStageGrades(stage);
    for (var i = 0; i < grades.length; i++) {
      if (grades[i].value === grade) return grades[i].label;
    }
    return grade;
  }

  function renderListDetail(listId) {
    var list = StudyLists.getList(listId);
    if (!list) {
      return el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '⚠️' }),
        el('h2', { text: '清单不存在' }),
        el('button', {
          className: 'btn btn-primary',
          text: '返回',
          on: { click: function () { if (window.App) App.navigate('lists'); } }
        })
      ]);
    }
    var vocab = Storage.getVocab(list.stage);
    var words = (vocab && vocab.words) || [];
    var listWords = (list.wordIds || []).map(function (id) {
      return words.find(function (w) { return w.id === id; });
    }).filter(function (w) { return !!w; });

    var failedSet = {};
    var passedSet = {};
    var studiedSet = {};
    var failedIds = StudyLists.getFailedWordIds(listId);
    var passedIds = StudyLists.getPassedWordIds(listId);
    var studiedIds = StudyLists.getStudiedWordIds(listId);
    failedIds.forEach(function (id) { failedSet[id] = true; });
    passedIds.forEach(function (id) { passedSet[id] = true; });
    studiedIds.forEach(function (id) { studiedSet[id] = true; });
    var lastTest = StudyLists.getLastTestSession(listId);

    var wrapper = el('div', { className: 'list-detail-view simple' });

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost', text: '← 清单列表',
        on: { click: function () { if (window.App) App.navigate('lists'); } }
      }),
      el('h2', { text: list.name }),
      el('button', {
        className: 'btn btn-danger btn-sm', text: '🗑 删除',
        on: { click: function () {
          if (confirm('确认删除清单「' + list.name + '」?')) {
            StudyLists.deleteList(listId);
            if (window.App) App.navigate('lists');
          }
        } }
      })
    ]));

    // 摘要 + 主操作
    var summary = el('div', { className: 'list-summary-card' });
    summary.appendChild(el('div', { className: 'list-summary-numbers', text:
      listWords.length + ' 个单词' +
      (failedIds.length > 0 ? ' · ' + failedIds.length + ' 个上次考试不合格' : '') +
      (lastTest ? ' · 上次得分 ' + Math.round(lastTest.correctCount / lastTest.wordCount * 100) + '%' : '')
    }));

    var allLearned = listWords.length > 0 && listWords.every(function (w) { return !!studiedSet[w.id]; });
    var learnedCount = listWords.filter(function (w) { return !!studiedSet[w.id]; }).length;

    var actionRow = el('div', { className: 'list-summary-actions' });
    var testBtnText = allLearned
      ? '📝 开始考试 (' + listWords.length + ' 词)'
      : '📝 先学完所有单词 (' + learnedCount + '/' + listWords.length + ')';
    var testBtnClass = allLearned
      ? 'btn btn-primary btn-lg'
      : 'btn btn-disabled btn-lg';
    actionRow.appendChild(el('button', {
      className: testBtnClass,
      text: testBtnText,
      attrs: allLearned ? {} : { title: '请先学完本清单所有单词' },
      on: { click: function () {
        if (!allLearned) {
          var left = listWords.filter(function (w) { return !studiedSet[w.id]; }).length;
          if (window.App && App.toast) {
            App.toast('还有 ' + left + ' 个单词未学,无法开始考试', 'warn');
          }
          return;
        }
        startListTest(list);
      } }
    }));
    if (failedIds.length > 0) {
      actionRow.appendChild(el('button', {
        className: 'btn btn-warning',
        text: '↻ 重做错词 (' + failedIds.length + ' 词)',
        on: { click: function () { redoFailedWords(list, failedIds); } }
      }));
    }
    summary.appendChild(actionRow);

    if (lastTest) {
      summary.appendChild(el('div', { className: 'list-summary-hint text-muted',
        text: '上次考试:' + fmtRel(lastTest.createdAt) + ' · 对 ' +
          lastTest.correctCount + ' / ' + lastTest.wordCount + ' 词'
      }));
    }
    wrapper.appendChild(summary);

    // 单词列表(每个可点 → 学习这一个词)
    if (listWords.length === 0) {
      wrapper.appendChild(el('div', { className: 'empty-msg', text: '清单内暂无单词,先去词汇列表选词加入。' }));
      return wrapper;
    }

    var wordList = el('div', { className: 'list-word-list' });
    listWords.forEach(function (w, idx) {
      var enriched = WordDetailData.enrichWord(w);
      var isFailed = !!failedSet[w.id];
      var isPassed = !!passedSet[w.id];
      var isStudied = !!studiedSet[w.id];

      // 4 状态:未通过(failed) > 已通过(passed) > 已学(studied) > 未学(default)
      var statusClass = isFailed ? 'failed'
        : isPassed ? 'passed'
        : isStudied ? 'studied'
        : 'unlearned';
      var row = el('div', {
        className: 'list-word-row clickable status-' + statusClass
      }, [
        el('div', { className: 'list-word-idx', text: String(idx + 1) }),
        el('div', { className: 'list-word-main' }, [
          el('div', { className: 'list-word-line1' }, [
            el('span', { className: 'list-word-text', text: enriched.word }),
            el('span', { className: 'list-word-pos', text: enriched.pos || '' }),
            isFailed
              ? el('span', { className: 'list-word-badge bad', text: '❌ 未通过' })
              : isPassed
                ? el('span', { className: 'list-word-badge good', text: '✅ 已通过' })
                : isStudied
                  ? el('span', { className: 'list-word-badge mid', text: '📖 已学' })
                  : el('span', { className: 'list-word-badge', text: '🔍 未学' })
          ]),
          el('div', { className: 'list-word-line2' }, [
            el('span', { className: 'list-word-phonetic', text: enriched.phonetic || '' }),
            el('span', { className: 'list-word-trans', text: enriched.translation || '' })
          ])
        ]),
        el('div', { className: 'list-word-actions' }, [
          el('button', {
            className: 'btn btn-ghost btn-sm', text: '🔊',
            title: '发音',
            on: { click: function (e) { e.stopPropagation(); WordBrowser.speak(enriched.word); } }
          }),
          el('span', { className: 'list-word-chevron', text: '›' })
        ])
      ]);
      row.addEventListener('click', function () { startWordStudy(list, w); });
      wordList.appendChild(row);
    });
    wrapper.appendChild(wordList);

    return wrapper;
  }

  // 把上次考试的错词提取出来,新建一个清单
  function redoFailedWords(list, failedIds) {
    var stage = list.stage;
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var name = (Storage.STAGE_NAMES[stage] || stage) + ' 错词 ' +
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes());
    var newList = StudyLists.createList({
      name: name,
      stage: stage,
      wordIds: failedIds.slice()
    });
    if (window.App && App.toast) App.toast('已创建「' + name + '」', 'success');
    if (window.App) App.navigate('list/' + newList.id);
  }

  // 单个词学习模式:复用单词详情视图(6 个 tab:释义/笔记/搭配/近义/英英/场景例句)
  // 底部只有一个"学完了"按钮,点击后记录 study session 并标记为已学
  function startWordStudy(list, word) {
    if (!window.WordBrowser || !WordBrowser.renderDetailView) {
      if (window.App && App.toast) App.toast('单词详情模块未加载', 'error');
      return;
    }
    var container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '';

    var wrap = el('div', { className: 'word-study-wrap' });
    wrap.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost', text: '← 清单',
        on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
      }),
      el('h2', { text: '📖 学习 · ' + (word.word || '') })
    ]));

    var detailView = WordBrowser.renderDetailView(list.stage, word.id, {
      backRoute: 'list/' + list.id,
      backLabel: '← 清单',
      titleText: '📖 学习 · ' + (word.word || ''),
      showAddBtn: false
    });
    if (detailView) {
      var innerBackBar = detailView.querySelector('.back-bar');
      if (innerBackBar) innerBackBar.parentNode.removeChild(innerBackBar);
      wrap.appendChild(detailView);
    }

    var stats = { startTime: Date.now() };
    var finishPanel = el('div', { className: 'word-study-finish glass' });
    finishPanel.appendChild(el('div', { className: 'word-study-finish-title', text: '✅ 学习完成了吗?' }));
    finishPanel.appendChild(el('div', { className: 'word-study-finish-hint text-muted',
      text: '看完上面的释义/笔记/搭配/近义词/英英释义/场景例句后,点击"学完了"标记为已学。' }));
    var doneBtn = el('button', {
      className: 'btn btn-primary btn-lg word-study-finish-btn',
      text: '✓ 学完了',
      on: { click: function () {
        var elapsed = Date.now() - stats.startTime;
        StudyLists.recordSession({
          listId: list.id,
          stage: list.stage,
          type: 'study',
          mode: 'L1',
          wordCount: 1,
          correctCount: 1,
          totalTime: elapsed,
          score: 100,
          wrongWordIds: [],
          wordId: word.id
        });
        if (window.App && App.toast) App.toast('「' + word.word + '」已学完', 'success');
        if (window.App) App.navigate('list/' + list.id);
      } }
    });
    finishPanel.appendChild(doneBtn);
    var skipBtn = el('button', {
      className: 'btn btn-ghost word-study-finish-skip',
      text: '先不学,返回',
      on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
    });
    finishPanel.appendChild(skipBtn);
    wrap.appendChild(finishPanel);

    container.appendChild(wrap);
  }

  function renderSessionsPanel(sessions, label) {
    var panel = el('div');
    if (sessions.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '暂无' + label + '记录,点击上方「补充' + label + '」开始你的第一次' + label + '!' }));
      return panel;
    }
    var list = el('div', { className: 'session-list' });
    sessions.slice().reverse().forEach(function (s) {
      var correctPct = s.wordCount > 0 ? Math.round(s.correctCount / s.wordCount * 100) : 0;
      list.appendChild(el('div', {
        className: 'session-item glass',
        on: { click: function () { if (window.App) App.navigate('session/' + s.id); } }
      }, [
        el('div', { className: 'session-item-head' }, [
          el('div', { className: 'session-item-title' }, [
            el('span', { text: (s.mode || label) + ' · ' + s.wordCount + ' 词' }),
            el('span', { className: 'session-item-date', text: fmtRel(s.createdAt) })
          ]),
          el('div', {
            className: 'session-item-score ' + (correctPct >= 80 ? 'good' : correctPct >= 60 ? 'mid' : 'bad'),
            text: correctPct + '%'
          })
        ]),
        el('div', { className: 'session-item-meta' }, [
          el('span', { text: '答对 ' + s.correctCount + ' / ' + s.wordCount }),
          el('span', { text: '用时 ' + Math.round((s.totalTime || 0) / 1000) + ' 秒' }),
          el('span', { text: '得分 ' + (s.score || correctPct) })
        ])
      ]));
    });
    panel.appendChild(list);
    return panel;
  }

  function renderWordsPanel(list, words) {
    var panel = el('div');
    var listWords = (list.wordIds || []).map(function (id) {
      return words.find(function (w) { return w.id === id; });
    }).filter(function (w) { return !!w; });
    if (listWords.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '清单内暂无单词,先去词汇列表选词加入。' }));
      return panel;
    }
    var grid = el('div', { className: 'word-browser-list mt-2' });
    listWords.forEach(function (w, idx) {
      var enriched = WordDetailData.enrichWord(w);
      grid.appendChild(el('div', {
        className: 'word-browser-row',
        on: { click: function (e) {
          if (e.target.closest('.word-browser-row-actions')) return;
          if (window.App) App.navigate('word/' + list.stage + '/' + w.id);
        } }
      }, [
        el('div', { className: 'word-browser-idx', text: String(idx + 1) }),
        el('div', { className: 'word-browser-main' }, [
          el('div', { className: 'word-browser-word-row' }, [
            el('span', { className: 'word-browser-word', text: enriched.word }),
            el('button', {
              className: 'word-browser-speak', text: '🔊',
              on: { click: function (e) { e.stopPropagation(); WordBrowser.speak(enriched.word); } }
            }),
            el('span', { className: 'word-browser-pos', text: enriched.pos || '' })
          ]),
          el('div', { className: 'word-browser-phonetic', text: enriched.phonetic || '' }),
          el('div', { className: 'word-browser-trans', text: enriched.translation || '' })
        ]),
        el('div', { className: 'word-browser-row-actions' }, [
          el('button', {
            className: 'btn btn-danger btn-sm', text: '移除',
            on: { click: function (e) {
              e.stopPropagation();
              if (confirm('从清单移除「' + enriched.word + '」?')) {
                var rmResult = StudyLists.removeWordFromList(list.id, w.id);
                if (window.App) App.renderCurrentView && App.renderCurrentView();
                if (rmResult && rmResult.ok) {
                  if (window.App && App.toast) App.toast('已移除', 'success');
                } else {
                  if (window.App && App.toast) App.toast('移除失败', 'error');
                }
              }
            } }
          })
        ])
      ]));
    });
    panel.appendChild(grid);
    return panel;
  }

  function renderTrendPanel(listId) {
    var panel = el('div');
    var studyTrend = StudyLists.getListTrend(listId, 'study');
    var testTrend = StudyLists.getListTrend(listId, 'test');
    panel.appendChild(el('div', { className: 'word-detail-sub-title', text: '📖 学习得分趋势' }));
    panel.appendChild(trendSvg(studyTrend));
    panel.appendChild(el('div', { className: 'word-detail-sub-title mt-3', text: '✅ 考试得分趋势' }));
    panel.appendChild(trendSvg(testTrend));
    if (studyTrend.length === 0 && testTrend.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '完成至少一次学习/考试即可看到趋势线。' }));
    }
    return panel;
  }

  function renderSessionDetail(sessionId) {
    var session = StudyLists.getSession(sessionId);
    if (!session) {
      return el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '⚠️' }),
        el('h2', { text: '记录不存在' })
      ]);
    }
    var list = StudyLists.getList(session.listId);
    var vocab = Storage.getVocab(session.stage);
    var words = (vocab && vocab.words) || [];
    var correctPct = session.wordCount > 0 ? Math.round(session.correctCount / session.wordCount * 100) : 0;

    var wrapper = el('div', { className: 'session-detail-view' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← ' + (list ? ('清单「' + list.name + '」') : '清单'),
        on: { click: function () {
          if (list && window.App) App.navigate('list/' + list.id);
          else if (window.App) App.navigate('lists');
        } }
      }),
      el('h2', { text: (session.type === 'test' ? '✅ 考试' : '📖 学习') + ' · ' + fmtDate(session.createdAt) })
    ]));

    var scoreCard = el('div', { className: 'session-score-card glass' }, [
      el('div', { className: 'session-score-num', text: correctPct + '%' }),
      el('div', { className: 'session-score-cap', text: '本次得分' }),
      el('div', { className: 'session-score-stats' }, [
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '总题数' }),
          el('div', { className: 'value', text: String(session.wordCount) })
        ]),
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '答对' }),
          el('div', { className: 'value', text: String(session.correctCount) })
        ]),
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '用时' }),
          el('div', { className: 'value', text: Math.round((session.totalTime || 0) / 1000) + ' 秒' })
        ]),
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '题型' }),
          el('div', { className: 'value small', text: session.mode || '-' })
        ])
      ])
    ]);
    wrapper.appendChild(scoreCard);

    if (session.wrongWordIds && session.wrongWordIds.length > 0) {
      var wrongList = el('div', { className: 'session-wrong-list' });
      wrongList.appendChild(el('div', { className: 'word-detail-sub-title', text: '✗ 错题单词(' + session.wrongWordIds.length + ')' }));
      session.wrongWordIds.forEach(function (wid) {
        var w = words.find(function (x) { return x.id === wid; });
        if (!w) return;
        var enriched = WordDetailData.enrichWord(w);
        wrongList.appendChild(el('div', {
          className: 'word-browser-row',
          on: { click: function () { if (window.App) App.navigate('word/' + session.stage + '/' + w.id); } }
        }, [
          el('div', { className: 'word-browser-main' }, [
            el('div', { className: 'word-browser-word-row' }, [
              el('span', { className: 'word-browser-word', text: enriched.word }),
              el('button', {
                className: 'word-browser-speak', text: '🔊',
                on: { click: function (e) { e.stopPropagation(); WordBrowser.speak(enriched.word); } }
              })
            ]),
            el('div', { className: 'word-browser-trans', text: enriched.translation || '' })
          ])
        ]));
      });
      wrapper.appendChild(wrongList);
    }

    return wrapper;
  }

  // 4 维考核:对本清单(范围)内的每个词依次考 4 个维度
  // 维度:发音(T11) → 中译英(T12) → 英译中(T2) → 例句(T13)
  // 规则:每个词在 4 维中任一维答错 → 该词记为不合格(wrong)
  function startListTest(list, opts) {
    opts = opts || {};
    var scope = opts.scope || 'list'; // list | review | error | grade-list
    var sourceList = list;
    var sourceListId = list ? list.id : null;

    var vocab = Storage.getVocab(list ? list.stage : Storage.getCurrentStage());
    var words = (vocab && vocab.words) || [];

    // 根据 scope 决定考核的词
    var stage = list ? list.stage : Storage.getCurrentStage();
    var targetWords = [];
    var scopeLabel = '';

    if (scope === 'list') {
      if (!list) { if (window.App && App.toast) App.toast('清单不存在', 'error'); return; }
      targetWords = (list.wordIds || []).map(function (id) {
        return words.find(function (w) { return w.id === id; });
      }).filter(function (w) { return !!w; });
      scopeLabel = '本清单 · ' + list.name;
    } else if (scope === 'review') {
      var reviewGrade = (opts.grade && opts.grade !== 'all') ? opts.grade : 'all';
      var passedIds = StudyLists.getAllPassedWordIds(stage, reviewGrade);
      targetWords = passedIds.map(function (id) {
        return words.find(function (w) { return w.id === Number(id) || w.id === id; });
      }).filter(function (w) { return !!w; });
      var gradeLabelText = reviewGrade === 'all' ? '全部学期' :
        ((window.WordBrowser && WordBrowser.getGradeLabel) ? WordBrowser.getGradeLabel(stage, reviewGrade) : reviewGrade);
      scopeLabel = '复习库 · ' + gradeLabelText + ' · 已通过 ' + targetWords.length + ' 词';
    } else if (scope === 'error') {
      var errorGrade = (opts.grade && opts.grade !== 'all') ? opts.grade : 'all';
      var failedIds2 = StudyLists.getAllFailedWordIds(stage, errorGrade);
      targetWords = failedIds2.map(function (id) {
        return words.find(function (w) { return w.id === Number(id) || w.id === id; });
      }).filter(function (w) { return !!w; });
      var gradeLabelText2 = errorGrade === 'all' ? '全部学期' :
        ((window.WordBrowser && WordBrowser.getGradeLabel) ? WordBrowser.getGradeLabel(stage, errorGrade) : errorGrade);
      scopeLabel = '错题库 · ' + gradeLabelText2 + ' · 待重练 ' + targetWords.length + ' 词';
    }

    if (targetWords.length === 0) {
      if (window.App && App.toast) App.toast('没有可考核的词', 'error');
      return;
    }
    if (!window.TestModes || !TestModes.T11_pronunciation) {
      if (window.App && App.toast) App.toast('检验模块未加载', 'error');
      return;
    }

    // 4 维度计划,每个词都按下面顺序过 4 维
    // 顺序:中译英 -> 发音 -> 英译中 -> 例句
    var dims = [
      { mode: 'T12', testMode: 'T12_zhToEnType',   label: '中译英', step: 1, desc: '看中文,键入英文拼写' },
      { mode: 'T11', testMode: 'T11_pronunciation', label: '发音',  step: 2, desc: '按住麦克风朗读该词' },
      { mode: 'T2',  testMode: 'T2_enToZh',        label: '英译中', step: 3, desc: '看英文,选中文释义' },
      { mode: 'T13', testMode: 'T13_example',      label: '例句',   step: 4, desc: '看中文,写含目标词的英文整句' }
    ];

    var stats = {
      total: 0,
      correct: 0,
      wrongIds: [],
      rightIds: [],
      startTime: Date.now(),
      dimStats: {}
    };
    dims.forEach(function (d) { stats.dimStats[d.mode] = { total: 0, correct: 0 }; });

    // 词 × 维度 二维展开
    var queue = [];
    targetWords.forEach(function (w) {
      dims.forEach(function (d) { queue.push({ word: w, dim: d }); });
    });

    var container = document.getElementById('view-container');
    container.innerHTML = '';
    var wrapper = el('div', { className: 'test-runner-wrap' });
    var backLabel = scope === 'error' ? '错题本'
                  : scope === 'review' ? '复习'
                  : (list ? '清单' : '测试');
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← ' + backLabel,
        on: { click: function () {
          if (scope === 'error' && window.App) App.navigate('wrongbook');
          else if (scope === 'review' && window.App) App.navigate('review');
          else if (list && window.App) App.navigate('list/' + list.id);
          else if (window.App) App.navigate('test');
        } }
      }),
      el('h2', { text: '✅ 4 维考核 · ' + scopeLabel + ' · ' + targetWords.length + ' 词' })
    ]));
    var stage_el = el('div', { className: 'test-stage' });
    var progressBar = el('div', { className: 'test-progress' });
    var stepDots = el('div', { className: 'test-step-dots' });
    dims.forEach(function (d) {
      stepDots.appendChild(el('div', {
        className: 'test-step-dot' + (d.step === 1 ? ' active' : ''),
        attrs: { 'data-step': String(d.step), title: d.label }
      }, [
        el('span', { className: 'test-step-num', text: String(d.step) }),
        el('span', { className: 'test-step-label', text: d.label })
      ]));
    });
    progressBar.appendChild(stepDots);
    var progressMeta = el('div', { className: 'test-progress-meta' });
    var progressBarFill = el('div', { className: 'progress-bar' }, [
      el('div', { className: 'progress-bar quiz-progress-fill' })
    ]);
    progressBar.appendChild(progressMeta);
    progressBar.appendChild(progressBarFill);
    wrapper.appendChild(progressBar);
    wrapper.appendChild(stage_el);
    container.appendChild(wrapper);

    // 跟踪当前答到第几维,以及每维对错
    var currentWordDimStatus = {}; // { wordId: { step: { correct: bool } } }

    function updateProgress() {
      var done = stats.total;
      var todo = queue.length;
      var currentItem = queue[0];
      var currentStep = currentItem ? currentItem.dim.step : 5; // 5 表示全完
      var currentWordId = currentItem ? currentItem.word.id : null;

      // 更新 4 个 step dot
      var dots = stepDots.querySelectorAll('.test-step-dot');
      for (var i = 0; i < dots.length; i++) {
        var stepNum = parseInt(dots[i].getAttribute('data-step'), 10);
        dots[i].classList.remove('active', 'done', 'passed', 'failed', 'locked');
        var sNum = String(stepNum);
        var wordStatus = currentWordId ? (currentWordDimStatus[currentWordId] || {}) : null;
        if (currentWordId == null) {
          // 全部完,所有 dot 标记 done
          dots[i].classList.add('done');
        } else if (stepNum < currentStep) {
          // 已经答完
          var status = currentWordDimStatus[currentWordId] && currentWordDimStatus[currentWordId][sNum];
          dots[i].classList.add(status && status.correct ? 'passed' : 'failed');
          dots[i].classList.add('done');
        } else if (stepNum === currentStep) {
          dots[i].classList.add('active');
        } else {
          dots[i].classList.add('locked');
        }
      }

      var meta = currentItem
        ? (dims[currentStep - 1].label + ' · 共 ' + targetWords.length + ' 词 · 已答 ' + done + ' 题')
        : '已完成 · 得分 ' + (stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0) + '%';
      progressMeta.textContent = meta;

      var pct = queue.length === 0 ? 100 : Math.round(done / (done + queue.length) * 100);
      progressBarFill.querySelector('.quiz-progress-fill').style.width = pct + '%';
    }

    function runNext() {
      if (queue.length === 0) {
        var elapsed = Date.now() - stats.startTime;
        var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
        // 决定 session 归属(本清单的考核归属当前 list,复习库/错题库归属 null)
        var recordListId = (scope === 'list' && list) ? list.id : null;
        var session = StudyLists.recordSession({
          listId: recordListId,
          stage: stage,
          type: 'test',
          mode: '4D',
          wordCount: stats.total,
          correctCount: stats.correct,
          totalTime: elapsed,
          score: score,
          wrongWordIds: stats.wrongIds.slice()
        });
        renderTestResult({
          list: list,
          listId: recordListId,
          scope: scope,
          scopeLabel: scopeLabel,
          targetWords: targetWords,
          stats: stats,
          elapsed: elapsed,
          session: session
        });
        return;
      }
      var item = queue.shift();
      var w = item.word;
      var d = item.dim;
      TestModes[d.testMode].run(stage_el, stage, [w], {
        mode: d.mode,
        onAnswer: function (entry) {
          stats.total++;
          stats.dimStats[d.mode].total++;
          if (entry.correct) {
            stats.correct++;
            stats.dimStats[d.mode].correct++;
            if (stats.rightIds.indexOf(w.id) < 0) stats.rightIds.push(w.id);
          } else {
            if (stats.wrongIds.indexOf(w.id) < 0) stats.wrongIds.push(w.id);
          }
          if (!currentWordDimStatus[w.id]) currentWordDimStatus[w.id] = {};
          currentWordDimStatus[w.id][d.step] = { correct: !!entry.correct };
        },
        onComplete: function () {
          updateProgress();
          runNext();
        }
      });
    }
    updateProgress();
    runNext();
  }

  // 考试结果页:展示对/错列表 + 4 维得分
  function renderTestResult(opts) {
    var list = opts.list;
    var listId = opts.listId;
    var scope = opts.scope;
    var scopeLabel = opts.scopeLabel;
    var targetWords = opts.targetWords;
    var stats = opts.stats;
    var elapsed = opts.elapsed;
    var session = opts.session;

    var container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '';

    var vocab = Storage.getVocab(list ? list.stage : Storage.getCurrentStage());
    var words = (vocab && vocab.words) || [];

    var wrongSet = {}; stats.wrongIds.forEach(function (id) { wrongSet[id] = true; });
    var rightSet = {}; stats.rightIds.forEach(function (id) { rightSet[id] = true; });

    var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;

    var wrapper = el('div', { className: 'test-result-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← ' + (list ? '清单' : '测试'),
        on: { click: function () {
          if (list && window.App) App.navigate('list/' + list.id);
          else if (window.App) App.navigate('test');
        } }
      }),
      el('h2', { text: '✅ 考试结果 · ' + scopeLabel })
    ]));

    // 分数大卡片
    wrapper.appendChild(el('div', { className: 'test-result-score glass' }, [
      el('div', { className: 'test-result-num' + (score >= 80 ? ' good' : score >= 60 ? ' mid' : ' bad'),
        text: score + '%' }),
      el('div', { className: 'test-result-cap', text:
        '答对 ' + stats.correct + ' / ' + stats.total + ' 题 · 用时 ' + Math.round(elapsed / 1000) + ' 秒' })
    ]));

    // 4 维得分
    var dimOrder = [
      { key: 'T11', label: '🎤 发音' },
      { key: 'T2',  label: '🔤 英译中' },
      { key: 'T12', label: '✍️ 中译英' },
      { key: 'T13', label: '📝 例句' }
    ];
    var bd = el('div', { className: 'test-result-breakdown' });
    dimOrder.forEach(function (d) {
      var s = stats.dimStats[d.key];
      if (!s || s.total === 0) return;
      var p = Math.round(s.correct / s.total * 100);
      bd.appendChild(el('div', { className: 'test-result-mode' }, [
        el('span', { className: 'test-result-mode-label', text: d.label }),
        el('span', { className: 'test-result-mode-score', text: s.correct + '/' + s.total + ' · ' + p + '%' })
      ]));
    });
    if (bd.children.length > 0) wrapper.appendChild(bd);

    // 错的词
    if (stats.wrongIds.length > 0) {
      var wrongSec = el('div', { className: 'test-result-section' });
      wrongSec.appendChild(el('div', { className: 'test-result-section-title', text: '✗ 错的词 (' + stats.wrongIds.length + ')' }));
      stats.wrongIds.forEach(function (wid) {
        var w = targetWords.find(function (x) { return x.id === wid; });
        if (!w) return;
        var enriched = WordDetailData.enrichWord(w);
        wrongSec.appendChild(el('div', { className: 'test-result-row bad' }, [
          el('div', { className: 'test-result-text', text: enriched.word }),
          el('div', { className: 'test-result-trans', text: enriched.translation || '' })
        ]));
      });
      // 本清单场景下:把错的词打包成新清单
      if (scope === 'list' && list) {
        wrongSec.appendChild(el('button', {
          className: 'btn btn-warning mt-2',
          text: '↻ 把错的词挑出来创建新清单',
          on: { click: function () { redoFailedWords(list, stats.wrongIds); } }
        }));
      }
      wrapper.appendChild(wrongSec);
    }

    // 对的词(进入复习库)
    if (stats.rightIds.length > 0) {
      var rightSec = el('div', { className: 'test-result-section' });
      rightSec.appendChild(el('div', { className: 'test-result-section-title', text: '✓ 对的词 (' + stats.rightIds.length + ') · 已记入复习库' }));
      stats.rightIds.forEach(function (wid) {
        var w = targetWords.find(function (x) { return x.id === wid; });
        if (!w) return;
        var enriched = WordDetailData.enrichWord(w);
        rightSec.appendChild(el('div', { className: 'test-result-row good' }, [
          el('div', { className: 'test-result-text', text: enriched.word }),
          el('div', { className: 'test-result-trans', text: enriched.translation || '' })
        ]));
      });
      wrapper.appendChild(rightSec);
    }

    // 底部动作
    var bottomNav = el('div', { className: 'test-result-nav' });
    bottomNav.appendChild(el('button', {
      className: 'btn btn-primary',
      text: list ? '返回清单' : '返回测试',
      on: { click: function () {
        if (list && window.App) App.navigate('list/' + list.id);
        else if (window.App) App.navigate('test');
      } }
    }));
    if (list && scope === 'list') {
      bottomNav.appendChild(el('button', {
        className: 'btn btn-ghost',
        text: '再考一次',
        on: { click: function () { startListTest(list, { scope: 'list' }); } }
      }));
    }
    wrapper.appendChild(bottomNav);

    container.appendChild(wrapper);
  }

  global.StudyListsView = {
    renderListsOverview: renderListsOverview,
    renderListDetail: renderListDetail,
    renderSessionDetail: renderSessionDetail,
    startListTest: startListTest
  };
})(window);