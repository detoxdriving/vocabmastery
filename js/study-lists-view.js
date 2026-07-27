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
      el('h2', { text: '📋 学习清单 · ' + (Storage.STAGE_NAMES[stage] || stage) }),
      el('button', {
        className: 'btn btn-primary btn-sm', text: '+ 新建清单',
        on: { click: function () { showCreateListModal(stage); } }
      })
    ]));

    if (lists.length === 0) {
      wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '📋' }),
        el('h2', { text: '还没有学习清单' }),
        el('p', { text: '先去词汇列表,把要学的词加入清单,再来这里开始学习吧!' }),
        el('button', {
          className: 'btn btn-primary',
          text: '📚 去词汇列表',
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

  function showCreateListModal(stage, presetGrade) {
    var grades = WordBrowser.getStageGrades(stage);
    var overlay = el('div', {
      className: 'modal-overlay',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var modal = el('div', { className: 'card' });
    modal.appendChild(el('div', { className: 'card-title', text: '➕ 新建学习清单' }));
    var nameInput = el('input', {
      className: 'form-input',
      attrs: { type: 'text', placeholder: '清单名称(例:高一上 L1-L50)' }
    });
    modal.appendChild(nameInput);
    var gradeSel = el('select', { className: 'stage-select' });
    grades.forEach(function (g) {
      var opt = el('option', { text: g.label });
      opt.value = g.value;
      if (g.value === (presetGrade || 'all')) opt.selected = true;
      gradeSel.appendChild(opt);
    });
    modal.appendChild(el('div', { className: 'mt-2' }, [
      el('label', { text: '学期:' }),
      gradeSel
    ]));
    modal.appendChild(el('div', { className: 'text-muted mt-2', text: '创建后到词汇列表里挑选单词加入。' }));
    modal.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
      el('button', {
        className: 'btn btn-primary', text: '创建',
        on: { click: function () {
          var name = (nameInput.value || '').trim();
          if (!name) {
            if (window.App && App.toast) App.toast('请输入清单名称', 'error');
            return;
          }
          var list = StudyLists.createList({
            name: name,
            stage: stage,
            grade: gradeSel.value
          });
          document.body.removeChild(overlay);
          if (window.App) App.navigate('list/' + list.id);
        } }
      }),
      el('button', { className: 'btn btn-ghost', text: '取消',
        on: { click: function () { document.body.removeChild(overlay); } } })
    ]));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(function () { nameInput.focus(); }, 50);
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
    var failedIds = StudyLists.getFailedWordIds(listId);
    var passedIds = StudyLists.getPassedWordIds(listId);
    failedIds.forEach(function (id) { failedSet[id] = true; });
    passedIds.forEach(function (id) { passedSet[id] = true; });
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

    var actionRow = el('div', { className: 'list-summary-actions' });
    actionRow.appendChild(el('button', {
      className: 'btn btn-primary btn-lg',
      text: '📝 开始考试 (' + listWords.length + ' 词)',
      on: { click: function () { startListTest(list); } }
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
      var row = el('div', { className: 'list-word-row' + (isFailed ? ' failed' : '') + (isPassed ? ' passed' : '') }, [
        el('div', { className: 'list-word-idx', text: String(idx + 1) }),
        el('div', { className: 'list-word-main' }, [
          el('div', { className: 'list-word-line1' }, [
            el('span', { className: 'list-word-text', text: enriched.word }),
            el('span', { className: 'list-word-pos', text: enriched.pos || '' }),
            isFailed ? el('span', { className: 'list-word-badge bad', text: '❌ 上次不合格' }) : null,
            isPassed ? el('span', { className: 'list-word-badge good', text: '✓ 上次已通过' }) : null
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
          el('button', {
            className: 'btn btn-primary btn-sm', text: '学习',
            on: { click: function (e) { e.stopPropagation(); startWordStudy(list, w); } }
          })
        ])
      ]);
      // 整行也可点击 → 学习
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

  // 单个词学习模式:走应用自带的 L1 看英回忆(带释义/例句/自评)
  function startWordStudy(list, word) {
    if (!window.ReciteModes || !ReciteModes.L1_viewEn) {
      if (window.App && App.toast) App.toast('背诵模块未加载', 'error');
      return;
    }
    var container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '';

    var wrap = el('div', { className: 'recite-runner-wrap' });
    wrap.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost', text: '← 清单',
        on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
      }),
      el('h2', { text: '📖 学习 · ' + (word.word || '') })
    ]));
    var stage = el('div', { className: 'recite-stage' });
    wrap.appendChild(stage);
    container.appendChild(wrap);

    var stats = { correct: 0, total: 0, wrongIds: [], rightIds: [], startTime: Date.now() };
    ReciteModes.L1_viewEn.run(stage, list.stage, [word], {
      onAnswer: function (entry) {
        stats.total++;
        if (entry.correct) { stats.correct++; stats.rightIds.push(entry.wordId); }
        else { stats.wrongIds.push(entry.wordId); }
      },
      onComplete: function () {
        var elapsed = Date.now() - stats.startTime;
        var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
        StudyLists.recordSession({
          listId: list.id,
          stage: list.stage,
          type: 'study',
          mode: 'L1',
          wordCount: stats.total,
          correctCount: stats.correct,
          totalTime: elapsed,
          score: score,
          wrongWordIds: stats.wrongIds
        });
        if (window.App && App.toast) App.toast('已学习「' + word.word + '」', 'success');
        setTimeout(function () { if (window.App) App.navigate('list/' + list.id); }, 600);
      }
    });
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

  function startListStudy(list) {
    var vocab = Storage.getVocab(list.stage);
    var words = (vocab && vocab.words) || [];
    var listWords = (list.wordIds || []).map(function (id) {
      return words.find(function (w) { return w.id === id; });
    }).filter(function (w) { return !!w; });
    if (listWords.length === 0) {
      if (window.App && App.toast) App.toast('清单为空,先去添加单词', 'error');
      return;
    }
    if (!window.ReciteModes || !ReciteModes.L1_viewEn) {
      if (window.App && App.toast) App.toast('背诵模块未加载', 'error');
      return;
    }
    var session = StudyLists.recordSession({
      listId: list.id,
      stage: list.stage,
      type: 'study',
      mode: 'L1',
      wordCount: listWords.length,
      correctCount: 0,
      totalTime: 0,
      score: 0,
      wrongWordIds: []
    });
    var container = document.getElementById('view-container');
    container.innerHTML = '';
    var wrapper = el('div', { className: 'recite-runner-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← 清单',
        on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
      }),
      el('h2', { text: '📖 学习 · ' + list.name + ' · L1 看英回忆' })
    ]));
    var stage = el('div', { className: 'recite-stage' });
    wrapper.appendChild(stage);
    container.appendChild(wrapper);

    var stats = { correct: 0, total: listWords.length, wrongIds: [], startTime: Date.now() };
    ReciteModes.L1_viewEn.run(stage, list.stage, listWords, {
      onAnswer: function (entry) {
        if (entry.correct) stats.correct++;
        else stats.wrongIds.push(entry.wordId);
      },
      onComplete: function () {
        var elapsed = Date.now() - stats.startTime;
        var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
        StudyLists.recordSession({
          listId: list.id,
          stage: list.stage,
          type: 'study',
          mode: 'L1',
          wordCount: stats.total,
          correctCount: stats.correct,
          totalTime: elapsed,
          score: score,
          wrongWordIds: stats.wrongIds
        });
        if (window.App && App.toast) App.toast('学习完成 · 得分 ' + score + '%', 'success');
        setTimeout(function () { if (window.App) App.navigate('list/' + list.id); }, 800);
      }
    });
  }

  function startListTest(list) {
    var vocab = Storage.getVocab(list.stage);
    var words = (vocab && vocab.words) || [];
    var listWords = (list.wordIds || []).map(function (id) {
      return words.find(function (w) { return w.id === id; });
    }).filter(function (w) { return !!w; });
    if (listWords.length === 0) {
      if (window.App && App.toast) App.toast('清单为空,先去添加单词', 'error');
      return;
    }
    if (!window.TestModes || !TestModes.T2_enToZh) {
      if (window.App && App.toast) App.toast('检验模块未加载', 'error');
      return;
    }

    // 准备多个维度的考核:把清单词按维度分组(轮流测不同的题型)
    // 维度1 (T2 看英选义)  维度2 (T3 看义写英)  维度3 (T5 听写)
    // 如果清单够长(>= 6)且有 T5,使用三维考核;否则用 T2/T3 二维
    var plan = [];
    var hasT5 = !!(window.TestModes && TestModes.T5_dictation);
    var hasT3 = !!(window.TestModes && TestModes.T3_zhToEn);
    // 第一维度:T2 全部
    plan.push({ mode: 'T2', testMode: 'T2_enToZh', words: listWords.slice(), label: '看英选义' });
    // 第二维度:T3 全部
    if (hasT3) {
      plan.push({ mode: 'T3', testMode: 'T3_zhToEn', words: listWords.slice(), label: '看义写英' });
    }
    // 第三维度:T5 听写(>=6 词才加,否则太碎)
    if (hasT5 && listWords.length >= 6) {
      plan.push({ mode: 'T5', testMode: 'T5_dictation', words: listWords.slice(), label: '听写' });
    }

    var stats = { correct: 0, total: 0, wrongIds: [], rightIds: [], startTime: Date.now() };
    stats.modeBreakdown = [];

    var container = document.getElementById('view-container');
    container.innerHTML = '';
    var wrapper = el('div', { className: 'test-runner-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← 清单',
        on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
      }),
      el('h2', { text: '✅ 考试 · ' + list.name + ' · ' + plan.length + ' 维度' })
    ]));
    var stage = el('div', { className: 'test-stage' });
    wrapper.appendChild(stage);
    container.appendChild(wrapper);

    function runNext(i) {
      if (i >= plan.length) {
        var elapsed = Date.now() - stats.startTime;
        var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
        var session = StudyLists.recordSession({
          listId: list.id,
          stage: list.stage,
          type: 'test',
          mode: plan.map(function (p) { return p.mode; }).join('+'),
          wordCount: stats.total,
          correctCount: stats.correct,
          totalTime: elapsed,
          score: score,
          wrongWordIds: stats.wrongIds
        });
        renderTestResult(list, stats, elapsed, session);
        return;
      }
      var p = plan[i];
      TestModes[p.testMode].run(stage, list.stage, p.words, {
        mode: p.mode,
        onAnswer: function (entry) {
          stats.total++;
          if (entry.correct) { stats.correct++; stats.rightIds.push(entry.wordId); }
          else { stats.wrongIds.push(entry.wordId); }
        },
        onComplete: function () {
          stats.modeBreakdown.push({ mode: p.mode, label: p.label,
            correct: stats.correct - stats._prevCorrect, total: stats.total - stats._prevTotal });
          stats._prevCorrect = stats.correct;
          stats._prevTotal = stats.total;
          runNext(i + 1);
        }
      });
    }
    stats._prevCorrect = 0;
    stats._prevTotal = 0;
    runNext(0);
  }

  // 考试结果页:展示对/错列表,自动回写到清单详情
  function renderTestResult(list, stats, elapsed, session) {
    var container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '';

    var vocab = Storage.getVocab(list.stage);
    var words = (vocab && vocab.words) || [];
    var listWords = (list.wordIds || []).map(function (id) {
      return words.find(function (w) { return w.id === id; });
    }).filter(function (w) { return !!w; });

    var wrongSet = {}; stats.wrongIds.forEach(function (id) { wrongSet[id] = true; });
    var rightSet = {}; stats.rightIds.forEach(function (id) { rightSet[id] = true; });

    var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;

    var wrapper = el('div', { className: 'test-result-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost', text: '← 清单',
        on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
      }),
      el('h2', { text: '✅ 考试结果 · ' + list.name })
    ]));

    // 分数大卡片
    wrapper.appendChild(el('div', { className: 'test-result-score glass' }, [
      el('div', { className: 'test-result-num' + (score >= 80 ? ' good' : score >= 60 ? ' mid' : ' bad'),
        text: score + '%' }),
      el('div', { className: 'test-result-cap', text: '答对 ' + stats.correct + ' / ' + stats.total + ' 词 · 用时 ' + Math.round(elapsed / 1000) + ' 秒' })
    ]));

    // 分维度得分
    if (stats.modeBreakdown && stats.modeBreakdown.length > 1) {
      var bd = el('div', { className: 'test-result-breakdown' });
      stats.modeBreakdown.forEach(function (m) {
        var mp = m.total > 0 ? Math.round(m.correct / m.total * 100) : 0;
        bd.appendChild(el('div', { className: 'test-result-mode' }, [
          el('span', { className: 'test-result-mode-label', text: m.label }),
          el('span', { className: 'test-result-mode-score', text: m.correct + '/' + m.total + ' · ' + mp + '%' })
        ]));
      });
      wrapper.appendChild(bd);
    }

    // 错的词(下次复习用)
    if (stats.wrongIds.length > 0) {
      var wrongSec = el('div', { className: 'test-result-section' });
      wrongSec.appendChild(el('div', { className: 'test-result-section-title', text: '✗ 错的词 (' + stats.wrongIds.length + ')' }));
      stats.wrongIds.forEach(function (wid) {
        var w = listWords.find(function (x) { return x.id === wid; });
        if (!w) return;
        var enriched = WordDetailData.enrichWord(w);
        wrongSec.appendChild(el('div', { className: 'test-result-row bad' }, [
          el('div', { className: 'test-result-text', text: enriched.word }),
          el('div', { className: 'test-result-trans', text: enriched.translation || '' })
        ]));
      });
      wrongSec.appendChild(el('button', {
        className: 'btn btn-warning mt-2',
        text: '↻ 把错的词挑出来创建新清单',
        on: { click: function () { redoFailedWords(list, stats.wrongIds); } }
      }));
      wrapper.appendChild(wrongSec);
    }

    // 对的词(进入复习库)
    if (stats.rightIds.length > 0) {
      var rightSec = el('div', { className: 'test-result-section' });
      rightSec.appendChild(el('div', { className: 'test-result-section-title', text: '✓ 对的词 (' + stats.rightIds.length + ') · 已记入复习库' }));
      stats.rightIds.forEach(function (wid) {
        var w = listWords.find(function (x) { return x.id === wid; });
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
      text: '返回清单',
      on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
    }));
    bottomNav.appendChild(el('button', {
      className: 'btn btn-ghost',
      text: '再考一次',
      on: { click: function () { startListTest(list); } }
    }));
    wrapper.appendChild(bottomNav);

    container.appendChild(wrapper);
  }

  global.StudyListsView = {
    renderListsOverview: renderListsOverview,
    renderListDetail: renderListDetail,
    renderSessionDetail: renderSessionDetail,
    showCreateListModal: showCreateListModal,
    startListStudy: startListStudy,
    startListTest: startListTest
  };
})(window);