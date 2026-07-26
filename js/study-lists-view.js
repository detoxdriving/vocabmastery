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
    var stats = StudyLists.getListStats(listId);
    var vocab = Storage.getVocab(list.stage);
    var words = (vocab && vocab.words) || [];
    var gradeLabelText = gradeLabel(list.stage, list.grade);

    var wrapper = el('div', { className: 'list-detail-view' });

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost', text: '← 清单列表',
        on: { click: function () { if (window.App) App.navigate('lists'); } }
      }),
      el('h2', { text: list.name }),
      el('button', {
        className: 'btn btn-danger btn-sm', text: '🗑 删除',
        on: { click: function () {
          if (confirm('确认删除清单「' + list.name + '」?相关历史记录也会被清除。')) {
            StudyLists.deleteList(listId);
            if (window.App) App.navigate('lists');
          }
        } }
      })
    ]));

    var infoCard = el('div', { className: 'card glass list-info-card' }, [
      el('div', { className: 'list-info-row' }, [
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '清单词数' }),
          el('div', { className: 'value', text: String(stats.wordCount) })
        ]),
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '所属学期' }),
          el('div', { className: 'value small', text: gradeLabelText })
        ]),
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '已学习次数' }),
          el('div', { className: 'value', text: String(stats.study.count) })
        ]),
        el('div', { className: 'list-info-item' }, [
          el('div', { className: 'label', text: '已考试次数' }),
          el('div', { className: 'value', text: String(stats.test.count) })
        ])
      ]),
      el('div', { className: 'flex gap-2 mt-3' }, [
        el('button', {
          className: 'btn btn-primary',
          text: '➕ 补充学习',
          on: { click: function () { startListStudy(list); } }
        }),
        el('button', {
          className: 'btn btn-secondary',
          text: '➕ 补充考试',
          on: { click: function () { startListTest(list); } }
        }),
        el('button', {
          className: 'btn btn-ghost',
          text: '📚 管理单词',
          on: { click: function () { if (window.App) App.navigate('lists'); } }
        })
      ])
    ]);
    wrapper.appendChild(infoCard);

    var tabsBar = el('div', { className: 'list-detail-tabs' });
    var panels = el('div', { className: 'list-detail-panels' });
    var tabDefs = [
      { id: 'study', label: '📖 学习', build: function () { return renderSessionsPanel(stats.allSessions.filter(function (s) { return s.type === 'study'; }), '学习'); } },
      { id: 'test', label: '✅ 考试', build: function () { return renderSessionsPanel(stats.allSessions.filter(function (s) { return s.type === 'test'; }), '考试'); } },
      { id: 'words', label: '📝 单词(' + stats.wordCount + ')', build: function () { return renderWordsPanel(list, words); } },
      { id: 'trend', label: '📈 趋势', build: function () { return renderTrendPanel(listId); } }
    ];
    tabDefs.forEach(function (t, i) {
      tabsBar.appendChild(el('button', {
        className: 'list-detail-tab' + (i === 0 ? ' active' : ''),
        text: t.label,
        on: { click: function () {
          Array.prototype.forEach.call(tabsBar.children, function (b) { b.classList.remove('active'); });
          Array.prototype.forEach.call(panels.children, function (p) { p.classList.remove('active'); });
          tabsBar.children[i].classList.add('active');
          panels.children[i].classList.add('active');
        } }
      }));
      panels.appendChild(el('div', { className: 'list-detail-panel' + (i === 0 ? ' active' : '') }, [t.build()]));
    });
    wrapper.appendChild(tabsBar);
    wrapper.appendChild(panels);

    return wrapper;
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
                StudyLists.removeWordFromList(list.id, w.id);
                if (window.App) App.renderCurrentView && App.renderCurrentView();
                if (window.App && App.toast) App.toast('已移除', 'success');
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
    var container = document.getElementById('view-container');
    container.innerHTML = '';
    var wrapper = el('div', { className: 'test-runner-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← 清单',
        on: { click: function () { if (window.App) App.navigate('list/' + list.id); } }
      }),
      el('h2', { text: '✅ 考试 · ' + list.name + ' · T2 看英选义' })
    ]));
    var stage = el('div', { className: 'test-stage' });
    wrapper.appendChild(stage);
    container.appendChild(wrapper);

    var stats = { correct: 0, total: 0, wrongIds: [], startTime: Date.now() };
    TestModes.T2_enToZh.run(stage, list.stage, listWords, {
      mode: 'T2',
      onAnswer: function (entry) {
        stats.total++;
        if (entry.correct) stats.correct++;
        else stats.wrongIds.push(entry.wordId);
      },
      onComplete: function () {
        var elapsed = Date.now() - stats.startTime;
        var score = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
        StudyLists.recordSession({
          listId: list.id,
          stage: list.stage,
          type: 'test',
          mode: 'T2',
          wordCount: stats.total,
          correctCount: stats.correct,
          totalTime: elapsed,
          score: score,
          wrongWordIds: stats.wrongIds
        });
        if (window.App && App.toast) App.toast('考试完成 · 得分 ' + score + '%', 'success');
        setTimeout(function () { if (window.App) App.navigate('list/' + list.id); }, 800);
      }
    });
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