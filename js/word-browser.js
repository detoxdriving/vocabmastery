(function (global) {
  'use strict';

  var STAGE_GRADE_LABELS = {
    'chuyi-shang': [{ value: 'all', label: '全部初一上' }],
    'chuyi-xia':   [{ value: 'all', label: '全部初一下' }],
    'chuer-shang': [{ value: 'all', label: '全部初二上' }],
    'chuer-xia':   [{ value: 'all', label: '全部初二下' }],
    'chusan-shang':[{ value: 'all', label: '全部初三上' }],
    'chusan-xia':  [{ value: 'all', label: '全部初三下' }],
    'chuzhong-supplement': [{ value: 'all', label: '全部初中补充' }],
    'gaoyi-shang': [{ value: 'all', label: '全部高一上' }],
    'gaoyi-xia':   [{ value: 'all', label: '全部高一下' }],
    'gaoer-shang': [{ value: 'all', label: '全部高二上' }],
    'gaoer-xia':   [{ value: 'all', label: '全部高二下' }],
    'gaosan-shang':[{ value: 'all', label: '全部高三上' }],
    'gaosan-xia':  [{ value: 'all', label: '全部高三下' }],
    college: [
      { value: 'all', label: '全部大学' },
      { value: 'cet4', label: 'CET-4' },
      { value: 'cet6', label: 'CET-6' }
    ],
    ielts: [{ value: 'all', label: '全部雅思' }]
  };

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

  function speak(word, opts) {
    try {
      if (!('speechSynthesis' in global)) return;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(word || ''));
      u.lang = (opts && opts.lang) || 'en-US';
      u.rate = (opts && opts.rate) || 0.9;
      global.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function getStageGrades(stage) {
    return STAGE_GRADE_LABELS[stage] || [{ value: 'all', label: '全部' }];
  }

  function getFilteredWords(stage, grade, range, query) {
    var vocab = Storage.getVocab(stage);
    if (!vocab || !vocab.words) return [];
    var words = vocab.words;
    if (grade && grade !== 'all') {
      words = words.filter(function (w) { return w.grade === grade; });
    }
    if (query) {
      var q = String(query).toLowerCase().trim();
      words = words.filter(function (w) {
        return String(w.word || '').toLowerCase().indexOf(q) >= 0 ||
          String(w.translation || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    if (range && range.from && range.to) {
      var s = Math.max(0, range.from - 1);
      var e = Math.min(words.length, range.to);
      words = words.slice(s, e);
    }
    return words.map(function (w) { return WordDetailData.enrichWord(w); });
  }

  function showAddToListModal(stage, wordId) {
    var lists = StudyLists.getAllLists().filter(function (l) { return l.stage === stage; });
    var overlay = el('div', {
      className: 'modal-overlay',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var modal = el('div', { className: 'card list-picker-modal' });
    modal.appendChild(el('div', { className: 'card-title', text: '➕ 选择加入清单' }));

    if (lists.length === 0) {
      modal.appendChild(el('p', { className: 'text-muted', text: '当前词库还没有清单,请先创建一个。' }));
    } else {
      lists.forEach(function (l) {
        modal.appendChild(el('div', {
          className: 'list-picker-item',
          on: { click: function () {
            var result = StudyLists.addWordToList(l.id, wordId);
            document.body.removeChild(overlay);
            if (result && result.ok) {
              if (result.duplicate) {
                if (window.App && App.toast) App.toast('「' + l.name + '」里已有这个词', 'info');
              } else {
                if (window.App && App.toast) App.toast('已加入「' + l.name + '」·共 ' + result.list.wordIds.length + ' 词', 'success');
              }
            } else {
              var reason = (result && result.reason) || 'unknown';
              console.warn('[WordBrowser] addWordToList failed:', reason);
              if (window.App && App.toast) App.toast('加入失败(' + reason + '),请重试', 'error');
            }
          } }
        }, [
          el('div', { className: 'list-picker-name', text: l.name }),
          el('div', { className: 'text-muted', text: l.wordIds.length + ' 词' })
        ]));
      });
    }

    modal.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
      el('button', {
        className: 'btn btn-primary',
        text: '+ 新建清单并加入',
        on: { click: function () {
          var nameInput = modal.querySelector('input.new-list-name');
          var name = nameInput && nameInput.value ? nameInput.value.trim() : '';
          if (!name) {
            if (window.App && App.toast) App.toast('请输入清单名称', 'error');
            return;
          }
          var list = StudyLists.createList({
            name: name,
            stage: stage,
            wordIds: [wordId]
          });
          document.body.removeChild(overlay);
          if (window.App && App.toast) App.toast('已创建 ' + list.name, 'success');
        } }
      }),
      el('input', {
        className: 'form-input new-list-name',
        attrs: { type: 'text', placeholder: '新清单名称' }
      })
    ]));

    modal.appendChild(el('div', { className: 'flex gap-2 mt-2' }, [
      el('button', { className: 'btn btn-ghost', text: '取消',
        on: { click: function () { document.body.removeChild(overlay); } } })
    ]));

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function renderListView(stage) {
    var state = window.App && App.state ? App.state : { browserGrade: 'all', browserRange: { from: 1, to: 100 }, browserQuery: '' };
    var grade = state.browserGrade || 'all';
    var range = state.browserRange || { from: 1, to: 100 };
    var query = state.browserQuery || '';
    var grades = getStageGrades(stage);
    var allWords = getFilteredWords(stage, 'all', null, '');
    var gradeWords = grade === 'all' ? allWords : allWords.filter(function (w) { return w.grade === grade; });
    var displayRange = { from: 1, to: Math.min(range.to, gradeWords.length) };
    var words = getFilteredWords(stage, grade, displayRange, query);

    var wrapper = el('div', { className: 'word-browser' });

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← 主页',
        on: { click: function () { if (window.App) App.navigate('home'); } }
      }),
      el('h2', { text: '📚 词汇列表 · ' + (Storage.STAGE_NAMES[stage] || stage) }),
      el('span', { className: 'small text-muted', text: '共 ' + gradeWords.length + ' 词' })
    ]));

    var filterRow = el('div', { className: 'word-browser-filter' });

    var gradeSel = el('select', {
      className: 'stage-select',
      on: { change: function (e) {
        state.browserGrade = e.target.value;
        state.browserRange = { from: 1, to: 100 };
        renderInto(wrapper, stage);
      } }
    });
    grades.forEach(function (g) {
      var opt = el('option', { text: g.label });
      opt.value = g.value;
      if (g.value === grade) opt.selected = true;
      gradeSel.appendChild(opt);
    });
    filterRow.appendChild(el('label', { text: '学期:' }));
    filterRow.appendChild(gradeSel);

    var fromInput = el('input', {
      className: 'form-input small',
      attrs: { type: 'number', min: '1', max: String(Math.max(1, gradeWords.length)) },
      text: String(displayRange.from)
    });
    var toInput = el('input', {
      className: 'form-input small',
      attrs: { type: 'number', min: '1', max: String(Math.max(1, gradeWords.length)) },
      text: String(displayRange.to)
    });
    var applyBtn = el('button', {
      className: 'btn btn-primary btn-sm',
      text: '应用范围',
      on: { click: function () {
        var from = Math.max(1, parseInt(fromInput.value, 10) || 1);
        var to = Math.min(gradeWords.length, parseInt(toInput.value, 10) || gradeWords.length);
        state.browserRange = { from: from, to: to };
        renderInto(wrapper, stage);
      } }
    });
    filterRow.appendChild(el('label', { text: '从' }));
    filterRow.appendChild(fromInput);
    filterRow.appendChild(el('label', { text: '到' }));
    filterRow.appendChild(toInput);
    filterRow.appendChild(applyBtn);

    var searchInput = el('input', {
      className: 'form-input',
      attrs: { type: 'text', placeholder: '🔍 搜索单词或释义...' },
      text: query
    });
    searchInput.addEventListener('input', function (e) {
      state.browserQuery = e.target.value;
      var newWords = getFilteredWords(stage, grade, displayRange, state.browserQuery);
      renderList(wrapper, stage, newWords, gradeWords.length);
    });
    filterRow.appendChild(searchInput);

    var bulkBtn = el('button', {
      className: 'btn btn-secondary btn-sm',
      text: '➕ 全部加入清单',
      on: { click: function () {
        if (words.length === 0) return;
        var name = prompt('输入新清单名称(将加入这 ' + words.length + ' 个词):');
        if (!name) return;
        StudyLists.createList({
          name: name,
          stage: stage,
          grade: grade,
          wordIds: words.map(function (w) { return w.id; })
        });
        if (window.App && App.toast) App.toast('已创建清单并加入 ' + words.length + ' 词', 'success');
      } }
    });
    filterRow.appendChild(bulkBtn);

    wrapper.appendChild(filterRow);
    renderList(wrapper, stage, words, gradeWords.length);

    function renderInto(w, st) {
      var container = w.parentNode || document.getElementById('view-container');
      var fresh = renderListView(st);
      container.innerHTML = '';
      container.appendChild(fresh);
    }

    return wrapper;
  }

  function renderList(wrapper, stage, words, totalCount) {
    var old = wrapper.querySelector('.word-browser-list');
    if (old) wrapper.removeChild(old);

    var list = el('div', { className: 'word-browser-list' });
    if (words.length === 0) {
      list.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '🔍' }),
        el('h2', { text: '没有匹配的单词' }),
        el('p', { text: '试试调整范围或搜索条件' })
      ]));
    } else {
      words.forEach(function (w, idx) {
        var row = el('div', {
          className: 'word-browser-row',
          on: { click: function (e) {
            if (e.target.closest('.word-browser-row-actions')) return;
            if (window.App) App.navigate('word/' + stage + '/' + w.id);
          } }
        }, [
          el('div', { className: 'word-browser-idx', text: String(idx + 1) }),
          el('div', { className: 'word-browser-main' }, [
            el('div', { className: 'word-browser-word-row' }, [
              el('span', { className: 'word-browser-word', text: w.word }),
              el('button', {
                className: 'word-browser-speak',
                text: '🔊',
                on: { click: function (e) {
                  e.stopPropagation();
                  speak(w.word);
                } }
              }),
              el('span', { className: 'word-browser-pos', text: w.pos || '' })
            ]),
            el('div', { className: 'word-browser-phonetic', text: w.phonetic || '' }),
            el('div', { className: 'word-browser-trans', text: w.translation || '' })
          ]),
          el('div', { className: 'word-browser-row-actions' }, [
            el('button', {
              className: 'btn btn-primary btn-sm',
              text: '+ 清单',
              on: { click: function (e) {
                e.stopPropagation();
                showAddToListModal(stage, w.id);
              } }
            })
          ])
        ]);
        list.appendChild(row);
      });
    }
    wrapper.appendChild(list);

    var meta = wrapper.querySelector('.word-browser-meta');
    if (meta) meta.textContent = '显示 ' + words.length + ' / ' + totalCount + ' 词';
  }

  function renderDetailView(stage, wordId) {
    var vocab = Storage.getVocab(stage);
    if (!vocab || !vocab.words) {
      return el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '⚠️' }),
        el('h2', { text: '词库未加载' }),
        el('p', { text: '请回到主页重新进入。' })
      ]);
    }
    var w = vocab.words.find(function (x) { return x.id === wordId; });
    if (!w) {
      return el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '⚠️' }),
        el('h2', { text: '找不到该单词' }),
        el('p', { text: '可能已被移除或词库变更。' })
      ]);
    }
    var word = WordDetailData.enrichWord(w);

    var wrapper = el('div', { className: 'word-detail' });

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', {
        className: 'btn btn-ghost',
        text: '← 词汇列表',
        on: { click: function () { if (window.App) App.navigate('lists'); } }
      }),
      el('h2', { text: '📖 单词学习' }),
      el('button', {
        className: 'btn btn-primary btn-sm',
        text: '+ 加入清单',
        on: { click: function () { showAddToListModal(stage, word.id); } }
      })
    ]));

    var card = el('div', { className: 'word-detail-card glass' }, [
      el('div', { className: 'word-detail-head' }, [
        el('div', { className: 'word-detail-word', text: word.word }),
        el('button', {
          className: 'word-detail-speak',
          text: '🔊',
          on: { click: function () { speak(word.word); } }
        })
      ]),
      el('div', { className: 'word-detail-syllables' },
        (word.syllables || []).map(function (s, i) {
          var cls = 'word-detail-syllable';
          if (i === 0) cls += ' stress';
          return el('button', {
            className: cls,
            attrs: { title: '点击朗读音节' },
            text: s,
            on: { click: function () {
              global.speechSynthesis.cancel();
              var u = new SpeechSynthesisUtterance(s);
              u.lang = 'en-US';
              u.rate = 0.6;
              global.speechSynthesis.speak(u);
            } }
          });
        })
      ),
      el('div', { className: 'word-detail-phonetics' }, [
        el('div', { className: 'word-detail-phonetic-item' }, [
          el('span', { className: 'word-detail-flag', text: '英' }),
          el('button', {
            className: 'word-detail-phonetic-text',
            text: word.phoneticEn || word.phonetic || '',
            on: { click: function () {
              var u = new SpeechSynthesisUtterance(word.word);
              u.lang = 'en-GB';
              u.rate = 0.85;
              global.speechSynthesis.cancel();
              global.speechSynthesis.speak(u);
            } }
          })
        ]),
        el('div', { className: 'word-detail-phonetic-item' }, [
          el('span', { className: 'word-detail-flag', text: '美' }),
          el('button', {
            className: 'word-detail-phonetic-text',
            text: word.phoneticUs || word.phonetic || '',
            on: { click: function () {
              var u = new SpeechSynthesisUtterance(word.word);
              u.lang = 'en-US';
              u.rate = 0.85;
              global.speechSynthesis.cancel();
              global.speechSynthesis.speak(u);
            } }
          })
        ])
      ]),
      el('div', { className: 'word-detail-pos-line' }, [
        el('span', { className: 'word-detail-pos', text: word.pos || '' }),
        el('span', { className: 'word-detail-trans', text: word.translation || '' })
      ])
    ]);
    wrapper.appendChild(card);

    var tabs = ['释义', '词汇笔记', '词组搭配', '近义词', '英英释义', '场景例句'];
    var tabBar = el('div', { className: 'word-detail-tabs' });
    var tabPanels = el('div', { className: 'word-detail-panels' });
    tabs.forEach(function (tab, i) {
      tabBar.appendChild(el('button', {
        className: 'word-detail-tab' + (i === 0 ? ' active' : ''),
        text: tab,
        on: { click: function () {
          Array.prototype.forEach.call(tabBar.children, function (b) { b.classList.remove('active'); });
          Array.prototype.forEach.call(tabPanels.children, function (p) { p.classList.remove('active'); });
          tabBar.children[i].classList.add('active');
          tabPanels.children[i].classList.add('active');
        } }
      }));
    });

    tabPanels.appendChild(renderPanelMeaning(word));
    tabPanels.appendChild(renderPanelNotes(word));
    tabPanels.appendChild(renderPanelCollocations(word));
    tabPanels.appendChild(renderPanelSynonyms(word));
    tabPanels.appendChild(renderPanelDefinitionEn(word));
    tabPanels.appendChild(renderPanelSceneExamples(word));
    Array.prototype.forEach.call(tabPanels.children, function (p, i) {
      if (i !== 0) p.classList.remove('active');
    });
    if (tabPanels.children[0]) tabPanels.children[0].classList.add('active');

    wrapper.appendChild(tabBar);
    wrapper.appendChild(tabPanels);

    return wrapper;
  }

  function renderPanelMeaning(word) {
    var panel = el('div', { className: 'word-detail-panel active' });
    var posEntries = WordDetailData.getPosEntries(word);
    var defEntries = WordDetailData.getDefinitionEntries(word);
    var max = Math.max(posEntries.length, defEntries.length);
    if (max === 0) {
      panel.appendChild(el('p', { className: 'text-muted', text: '暂无数据' }));
      return panel;
    }
    var grid = el('div', { className: 'word-detail-meaning-grid' });
    for (var i = 0; i < max; i++) {
      var card = el('div', { className: 'word-detail-meaning-card' });
      if (posEntries[i]) {
        card.appendChild(el('div', { className: 'word-detail-meaning-pos', text: posEntries[i] }));
      }
      if (defEntries[i]) {
        card.appendChild(el('div', { className: 'word-detail-meaning-def', text: defEntries[i] }));
      }
      grid.appendChild(card);
    }
    panel.appendChild(grid);

    if (word.wordForms && word.wordForms.length > 0) {
      panel.appendChild(el('div', { className: 'word-detail-sub-title', text: '📝 词形变化' }));
      var formsGrid = el('div', { className: 'word-detail-forms-grid' });
      word.wordForms.forEach(function (f) {
        formsGrid.appendChild(el('div', { className: 'word-detail-form-card' }, [
          el('div', { className: 'word-detail-form-label', text: f.label }),
          el('div', { className: 'word-detail-form-value', text: f.form })
        ]));
      });
      panel.appendChild(formsGrid);
    }
    return panel;
  }

  function renderPanelNotes(word) {
    var panel = el('div', { className: 'word-detail-panel' });
    if (!word.notes || word.notes.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '暂无词汇笔记(可由后续更新补充词根词缀等记忆线索)。' }));
      return panel;
    }
    word.notes.forEach(function (n) {
      panel.appendChild(el('div', { className: 'word-detail-note' }, [
        el('div', { className: 'word-detail-note-tag', text: n.label }),
        el('div', { className: 'word-detail-note-text', text: n.text })
      ]));
    });
    return panel;
  }

  function renderPanelCollocations(word) {
    var panel = el('div', { className: 'word-detail-panel' });
    if (!word.collocations || word.collocations.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '暂无词组搭配。' }));
      return panel;
    }
    var list = el('div', { className: 'word-detail-coll-list' });
    word.collocations.forEach(function (c) {
      list.appendChild(el('div', { className: 'word-detail-coll' }, [
        el('div', { className: 'word-detail-coll-phrase' }, [
          el('span', { className: 'word-detail-coll-text', text: c.phrase }),
          el('button', {
            className: 'word-detail-coll-speak',
            text: '🔊',
            on: { click: function () { speak(c.phrase); } }
          })
        ]),
        el('div', { className: 'word-detail-coll-trans', text: c.trans })
      ]));
    });
    panel.appendChild(list);
    return panel;
  }

  function renderPanelSynonyms(word) {
    var panel = el('div', { className: 'word-detail-panel' });
    if (!word.synonyms || word.synonyms.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '暂无近义词。' }));
      return panel;
    }
    var list = el('div', { className: 'word-detail-syn-list' });
    word.synonyms.forEach(function (s) {
      list.appendChild(el('div', {
        className: 'word-detail-syn',
        on: { click: function () {
          var vocab = Storage.getVocab(Storage.getCurrentStage());
          var target = vocab && vocab.words ? vocab.words.find(function (x) { return x.word && x.word.toLowerCase() === String(s.word).toLowerCase(); }) : null;
          if (target) {
            if (window.App) App.navigate('word/' + Storage.getCurrentStage() + '/' + target.id);
          } else {
            if (window.App && App.toast) App.toast('当前词库无此词:' + s.word, 'info');
          }
        } }
      }, [
        el('div', { className: 'word-detail-syn-word' }, [
          el('span', { className: 'word-detail-syn-text', text: s.word }),
          el('button', {
            className: 'word-detail-syn-speak',
            text: '🔊',
            on: { click: function (e) {
              e.stopPropagation();
              speak(s.word);
            } }
          }),
          el('span', { className: 'word-detail-syn-phonetic', text: s.phonetic || '' })
        ]),
        el('div', { className: 'word-detail-syn-trans', text: s.trans })
      ]));
    });
    panel.appendChild(list);

    if (word.antonyms && word.antonyms.length > 0) {
      panel.appendChild(el('div', { className: 'word-detail-sub-title', text: '🔁 反义词' }));
      var antList = el('div', { className: 'word-detail-syn-list' });
      word.antonyms.forEach(function (a) {
        antList.appendChild(el('div', { className: 'word-detail-syn' }, [
          el('div', { className: 'word-detail-syn-word' }, [
            el('span', { className: 'word-detail-syn-text', text: a.word }),
            el('button', {
              className: 'word-detail-syn-speak',
              text: '🔊',
              on: { click: function (e) { e.stopPropagation(); speak(a.word); } }
            }),
            el('span', { className: 'word-detail-syn-phonetic', text: a.phonetic || '' })
          ]),
          el('div', { className: 'word-detail-syn-trans', text: a.trans })
        ]));
      });
      panel.appendChild(antList);
    }
    return panel;
  }

  function renderPanelDefinitionEn(word) {
    var panel = el('div', { className: 'word-detail-panel' });
    if (!word.definitionEn) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '暂无英英释义(可由后续更新补充)。' }));
      return panel;
    }
    var posEntries = WordDetailData.getPosEntries(word);
    var pos = posEntries[0] || 'n.';
    panel.appendChild(el('div', { className: 'word-detail-en-pos', text: pos }));
    panel.appendChild(el('div', { className: 'word-detail-en-def', text: word.definitionEn }));
    return panel;
  }

  function renderPanelSceneExamples(word) {
    var panel = el('div', { className: 'word-detail-panel' });
    if (!word.sceneExamples || word.sceneExamples.length === 0) {
      panel.appendChild(el('div', { className: 'empty-msg', text: '暂无场景例句。' }));
      return panel;
    }
    var list = el('div', { className: 'word-detail-scene-list' });
    word.sceneExamples.forEach(function (s) {
      list.appendChild(el('div', { className: 'word-detail-scene' }, [
        el('div', { className: 'word-detail-scene-tag', text: '🎬 ' + (s.scene || '场景') }),
        el('div', { className: 'word-detail-scene-en' }, [
          el('span', { text: s.en }),
          el('button', {
            className: 'word-detail-scene-speak',
            text: '🔊',
            on: { click: function () { speak(s.en); } }
          })
        ]),
        el('div', { className: 'word-detail-scene-zh', text: s.zh })
      ]));
    });
    panel.appendChild(list);
    return panel;
  }

  global.WordBrowser = {
    renderListView: renderListView,
    renderDetailView: renderDetailView,
    getStageGrades: getStageGrades,
    showAddToListModal: showAddToListModal,
    speak: speak
  };
})(window);