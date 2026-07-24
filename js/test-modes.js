/**
 * VocabMastery · 10 Test Modes (T1-T10)
 * 检验模式:综合测评,自动判分,错词入错题本
 *
 * 每个模式:
 *   { name, description, run(container, stage, words, callbacks) }
 *   callbacks = { onAnswer, onComplete(report), mode, scope }
 *   report = { totalScore, correctCount, totalCount, correctRate, timeSpent,
 *              byQuestion: [...], wrongWords: [...] }
 */
(function (global) {
  'use strict';

  // ---------- Shared helpers ----------
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

  function speak(word, opts) {
    try {
      if (!('speechSynthesis' in global)) return;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(word || ''));
      u.lang = (opts && opts.lang) || 'en-US';
      u.rate = (opts && opts.rate) || 0.9;
      global.speechSynthesis.speak(u);
    } catch (err) {}
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickN(arr, n) {
    return shuffle(arr).slice(0, Math.min(n, arr.length));
  }

  function pickDistractors(correctWord, pool, n) {
    var cand = pool.filter(function (w) { return w && w.id !== correctWord.id; });
    return pickN(cand, n);
  }

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function compareSpelling(userInput, target) {
    var u = normalize(userInput);
    var t = normalize(target);
    if (u === t) return { ok: true, wrongPositions: [] };
    var len = Math.max(u.length, t.length);
    var wrong = [];
    for (var i = 0; i < len; i++) {
      if (u.charAt(i) !== t.charAt(i)) wrong.push(i);
    }
    return { ok: false, wrongPositions: wrong };
  }

  function showLetterDiff(userInput, target) {
    var u = String(userInput || '');
    var t = String(target || '');
    var len = Math.max(u.length, t.length);
    var wrap = el('div', { className: 'spell-diff' });
    for (var i = 0; i < len; i++) {
      var uc = u.charAt(i) || ' ';
      var tc = t.charAt(i) || ' ';
      var ok = (uc === tc) && uc !== ' ';
      wrap.appendChild(el('span', {
        className: 'spell-letter ' + (ok ? 'ok' : 'bad'),
        text: tc
      }));
    }
    return wrap;
  }

  function animateFeedback(target, ok) {
    if (!target) return;
    target.classList.remove('feedback-correct', 'feedback-wrong', 'pulse', 'shake');
    void target.offsetWidth;
    target.classList.add(ok ? 'pulse' : 'shake', ok ? 'feedback-correct' : 'feedback-wrong');
  }

  function markOption(grid, idx, ok) {
    var btns = grid.querySelectorAll('.quiz-option');
    btns.forEach(function (b, i) {
      b.classList.add('disabled');
      if (i === idx) b.classList.add(ok ? 'correct' : 'wrong');
    });
  }

  function syllablesOf(word) {
    if (!word) return 1;
    var w = String(word).toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 1;
    if (w.length <= 3) return 1;
    var count = 0;
    var prevVowel = false;
    for (var i = 0; i < w.length; i++) {
      var c = w.charAt(i);
      var isVowel = (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u' || c === 'y');
      if (isVowel && !prevVowel) count++;
      prevVowel = isVowel;
    }
    if (w.length > 4 && /[^aeiou]e$/.test(w)) count = Math.max(1, count - 1);
    return Math.max(1, count);
  }

  function buildHeader(stageName, modeName, idx, total) {
    return el('div', { className: 'quiz-header' }, [
      el('div', { className: 'quiz-header-row' }, [
        el('div', { className: 'quiz-mode-tag', text: modeName }),
        el('div', { className: 'quiz-progress-text', text: (idx + 1) + ' / ' + total })
      ]),
      el('div', { className: 'progress-bar' }, [
        el('div', {
          className: 'progress-bar quiz-progress-fill',
          style: 'width:' + (total === 0 ? 0 : Math.round((idx + 1) / total * 100)) + '%'
        })
      ])
    ]);
  }

  function buildOptionsPanel(options) {
    var grid = el('div', { className: 'quiz-options' });
    options.forEach(function (opt, i) {
      var btn = el('button', {
        className: 'quiz-option',
        attrs: { 'data-value': String(opt.value) }
      }, [
        el('span', { className: 'quiz-option-key', text: String.fromCharCode(65 + i) }),
        el('span', { className: 'quiz-option-text', text: opt.label })
      ]);
      opt.__btn = btn;
      opt.__idx = i;
      grid.appendChild(btn);
    });
    return grid;
  }

  // ---------- Test runner base ----------
  function TestRunner(container, stage, words, mode, callbacks) {
    this.container = container;
    this.stage = stage;
    this.words = words;
    this.mode = mode;
    this.callbacks = callbacks;
    this.idx = 0;
    this.total = words.length;
    this.results = [];
    this.startTime = Date.now();
  }

  TestRunner.prototype.mount = function (modeName) {
    var self = this;
    this.container.innerHTML = '';
    var wrapper = el('div', { className: 'test-runner' });
    this.body = el('div', { className: 'quiz-body' });
    this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[this.stage] || this.stage), modeName, 0, this.total));
    wrapper.appendChild(this.body);
    this.container.appendChild(wrapper);
    this.wrapper = wrapper;
  };

  TestRunner.prototype.record = function (entry) {
    this.results.push(entry);
    if (this.callbacks.onAnswer) this.callbacks.onAnswer(entry);
    if (!entry.correct && entry.wordId != null) {
      try { WrongBook.add(this.stage, entry.wordId); } catch (e) {}
    }
  };

  TestRunner.prototype.finish = function () {
    var correctCount = this.results.filter(function (r) { return r.correct; }).length;
    var totalCount = this.results.length;
    var wrongWords = [];
    var seen = {};
    this.results.forEach(function (r) {
      if (!r.correct && r.wordId != null && !seen[r.wordId]) {
        seen[r.wordId] = true;
        var w = self_word(r.wordId);
        wrongWords.push({
          wordId: r.wordId,
          word: w ? w.word : ('#' + r.wordId),
          translation: w ? (w.translation || '') : '',
          userAnswer: r.userAnswer
        });
      }
    });
    function self_word(id) {
      if (!self.words) return null;
      return self.words.find(function (w) { return w.id === id; }) || null;
    }
    var timeSpent = Date.now() - this.startTime;
    var report = {
      mode: this.mode,
      totalScore: Math.round((correctCount / Math.max(1, totalCount)) * 100),
      correctCount: correctCount,
      totalCount: totalCount,
      correctRate: correctCount / Math.max(1, totalCount),
      timeSpent: timeSpent,
      byQuestion: this.results,
      wrongWords: wrongWords
    };
    if (this.callbacks.onComplete) this.callbacks.onComplete(report);
  };

  TestRunner.prototype.goNext = function (delay) {
    var self = this;
    setTimeout(function () {
      self.idx++;
      if (self.idx >= self.total) {
        self.body.innerHTML = '<div class="quiz-complete">⏳ 正在生成成绩报告...</div>';
        setTimeout(function () { self.finish(); }, 200);
        return;
      }
      self.render();
    }, delay || 700);
  };

  // ---------- 10 Test Modes ----------

  var modes = {};

  // T1: 单元测验 — mixed题型 (50% T2 + 30% T3 + 20% T5)
  modes.T1_quiz = {
    name: 'T1 · 单元测验',
    description: '混合题型综合测验',
    run: function (container, stage, words, callbacks) {
      var total = Math.min(words.length, 50);
      var sample = pickN(words, total);
      var runner = new TestRunner(container, stage, sample, 'T1', callbacks);
      runner.mount('T1 单元测验');

      // Question plan
      runner.plan = sample.map(function (w, i) {
        var r = i % 10;
        if (r < 5) return { kind: 'en2zh', word: w };
        if (r < 8) return { kind: 'zh2en', word: w };
        return { kind: 'spelling', word: w };
      });

      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T1 单元测验', this.idx, this.total));
        var q = this.plan[this.idx];
        var w = q.word;
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card' });

        if (q.kind === 'en2zh') {
          card.appendChild(el('div', { className: 't-quiz-word', text: w.word }));
          card.appendChild(el('div', { className: 't-quiz-meta', text: (w.pos || '') + ' · ' + (w.phonetic || '') }));
          var opts = shuffle([w].concat(pickDistractors(w, sample, 3)))
            .map(function (x) { return { value: x.id, label: x.translation || x.word }; });
        } else if (q.kind === 'zh2en') {
          card.appendChild(el('div', { className: 't-quiz-zh', text: w.translation || w.word }));
          card.appendChild(el('div', { className: 't-quiz-meta', text: '选出对应英文' }));
          var opts = shuffle([w].concat(pickDistractors(w, sample, 3)))
            .map(function (x) { return { value: x.id, label: x.word }; });
        } else {
          // spelling
          card.appendChild(el('div', { className: 't-quiz-zh', text: w.translation || w.word }));
          card.appendChild(el('div', { className: 't-quiz-meta', text: '听音 + 拼写(模拟,请键入)' }));
          var input = el('input', {
            className: 'form-input spell-input',
            attrs: { type: 'text', placeholder: '请输入英文...', autocomplete: 'off' }
          });
          setTimeout(function () { speak(w.word, { rate: 0.9 }); }, 200);
        }
        this.body.appendChild(card);

        if (q.kind !== 'spelling') {
          var grid = buildOptionsPanel(opts);
          this.body.appendChild(grid);
          var self = this;
          grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
            b.onclick = function () {
              var correct = opts[i].value === w.id;
              markOption(grid, i, correct);
              animateFeedback(card, correct);
              var timeMs = Date.now() - startTime;
              self.record({
                wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: opts[i].label, kind: q.kind
              });
              self.goNext(correct ? 600 : 1200);
            };
          });
        } else {
          this.body.appendChild(input);
          var feedback = el('div', { className: 'spell-feedback' });
          this.body.appendChild(feedback);
          var actions = el('div', { className: 'recite-actions' }, [
            el('button', { className: 'btn btn-primary', text: '提交',
              on: { click: function () { submit(); } } })
          ]);
          this.body.appendChild(actions);
          var self = this;
          function submit() {
            var userAns = input.value || '';
            var cmp = compareSpelling(userAns, w.word);
            var correct = cmp.ok;
            animateFeedback(card, correct);
            feedback.innerHTML = '';
            if (correct) {
              feedback.appendChild(el('div', { className: 'spell-feedback-ok', text: '✓ ' + w.word }));
            } else {
              feedback.appendChild(el('div', { className: 'spell-feedback-bad', text: '正确:' + w.word }));
              feedback.appendChild(showLetterDiff(userAns, w.word));
            }
            input.disabled = true;
            var timeMs = Date.now() - startTime;
            setTimeout(function () {
              self.record({
                wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: userAns, kind: 'spelling'
              });
              self.goNext(correct ? 700 : 1500);
            }, correct ? 600 : 1300);
          }
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
          setTimeout(function () { input.focus(); }, 100);
        }
      };
      runner.render();
    }
  };

  // T2: 看英选义
  modes.T2_enToZh = {
    name: 'T2 · 看英选义',
    description: '看英文单词,4 选 1 中文释义',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T2', callbacks);
      runner.mount('T2 看英选义');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T2 看英选义', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card' }, [
          el('div', { className: 't-quiz-word', text: w.word }),
          el('div', { className: 't-quiz-meta', text: (w.pos || '') + ' · ' + (w.phonetic || '') })
        ]);
        var opts = shuffle([w].concat(pickDistractors(w, this.words, 3)))
          .map(function (x) { return { value: x.id, label: x.translation || x.word }; });
        var grid = buildOptionsPanel(opts);
        this.body.appendChild(card);
        this.body.appendChild(grid);
        var self = this;
        grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: opts[i].label
            });
            if (!correct) {
              card.appendChild(el('div', { className: 't-quiz-explain', text:
                '✓ ' + w.word + ' — ' + (w.translation || '') }));
            }
            self.goNext(correct ? 600 : 1500);
          };
        });
      };
      runner.render();
    }
  };

  // T3: 看义选英
  modes.T3_zhToEn = {
    name: 'T3 · 看义选英',
    description: '看中文释义,4 选 1 英文单词',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T3', callbacks);
      runner.mount('T3 看义选英');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T3 看义选英', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card' }, [
          el('div', { className: 't-quiz-zh', text: w.translation || '' }),
          el('div', { className: 't-quiz-meta', text: '选出对应英文' })
        ]);
        var opts = shuffle([w].concat(pickDistractors(w, this.words, 3)))
          .map(function (x) { return { value: x.id, label: x.word }; });
        var grid = buildOptionsPanel(opts);
        this.body.appendChild(card);
        this.body.appendChild(grid);
        var self = this;
        grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: opts[i].label
            });
            if (correct && w.examples && w.examples[0]) {
              card.appendChild(el('div', { className: 't-quiz-explain', text: '例:' + w.examples[0] }));
            }
            self.goNext(correct ? 600 : 1500);
          };
        });
      };
      runner.render();
    }
  };

  // T4: 听音辨义
  modes.T4_listenChoose = {
    name: 'T4 · 听音辨义',
    description: '听单词发音,4 选 1 中文释义',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T4', callbacks);
      runner.mount('T4 听音辨义');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T4 听音辨义', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card listen-card' }, [
          el('button', {
            className: 'big-speak-btn', text: '🔊 慢速',
            on: { click: function () { speak(w.word, { rate: 0.7 }); } }
          }),
          el('button', {
            className: 'big-speak-btn small', text: '🔊 常速',
            on: { click: function () { speak(w.word, { rate: 1.0 }); } }
          })
        ]);
        var opts = shuffle([w].concat(pickDistractors(w, this.words, 3)))
          .map(function (x) { return { value: x.id, label: x.translation || x.word }; });
        var grid = buildOptionsPanel(opts);
        this.body.appendChild(card);
        this.body.appendChild(grid);
        var self = this;
        grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: opts[i].label
            });
            if (!correct) {
              card.appendChild(el('div', { className: 't-quiz-explain', text:
                '✓ ' + w.word + ' ' + (w.phonetic || '') + ' — ' + (w.translation || '') }));
              speak(w.word, { rate: 0.7 });
            }
            self.goNext(correct ? 600 : 1700);
          };
        });
        setTimeout(function () { speak(w.word, { rate: 0.9 }); }, 250);
      };
      runner.render();
    }
  };

  // T5: 听写测试
  modes.T5_dictation = {
    name: 'T5 · 听写测试',
    description: '听单词发音,键入完整拼写',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T5', callbacks);
      runner.mount('T5 听写测试');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T5 听写测试', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card listen-card' }, [
          el('button', {
            className: 'big-speak-btn', text: '🔊 听发音',
            on: { click: function () { speak(w.word, { rate: 1.0 }); } }
          })
        ]);
        var input = el('input', {
          className: 'form-input spell-input',
          attrs: { type: 'text', placeholder: '请输入拼写...', autocomplete: 'off' }
        });
        var feedback = el('div', { className: 'spell-feedback' });
        this.body.appendChild(card);
        this.body.appendChild(input);
        this.body.appendChild(feedback);
        var actions = el('div', { className: 'recite-actions' }, [
          el('button', { className: 'btn btn-primary', text: '提交',
            on: { click: function () { submit(); } } })
        ]);
        this.body.appendChild(actions);
        var self = this;
        function submit() {
          var userAns = input.value || '';
          var cmp = compareSpelling(userAns, w.word);
          var correct = cmp.ok;
          animateFeedback(card, correct);
          feedback.innerHTML = '';
          if (correct) {
            feedback.appendChild(el('div', { className: 'spell-feedback-ok',
              text: '✓ ' + w.word + ' — ' + (w.translation || '') }));
          } else {
            feedback.appendChild(el('div', { className: 'spell-feedback-bad', text: '正确:' + w.word }));
            feedback.appendChild(showLetterDiff(userAns, w.word));
            feedback.appendChild(el('div', { className: 'spell-feedback-meta', text: w.phonetic || '' }));
          }
          input.disabled = true;
          var timeMs = Date.now() - startTime;
          setTimeout(function () {
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: userAns
            });
            self.goNext(correct ? 700 : 1800);
          }, correct ? 600 : 1500);
        }
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
        setTimeout(function () {
          speak(w.word, { rate: 1.0 });
          input.focus();
        }, 200);
      };
      runner.render();
    }
  };

  // T6: 释义连线 — drag-and-drop
  modes.T6_match = {
    name: 'T6 · 释义连线',
    description: '8-10 对词通过拖拽完成英文↔中文匹配',
    run: function (container, stage, words, callbacks) {
      var total = Math.min(words.length, 10);
      var sample = pickN(words, total);
      var runner = new TestRunner(container, stage, sample, 'T6', callbacks);
      runner.mount('T6 释义连线');

      // For matching, the runner has only 1 "question" but multiple sub-items
      // We'll treat each pair as a sub-question
      var pairs = sample.map(function (w) { return { word: w, matched: false }; });
      var shuffledEn = shuffle(pairs.slice());
      var shuffledZh = shuffle(pairs.slice()).map(function (p) {
        return { word: p.word, label: p.word.translation || p.word.word };
      });
      var enButtons = [];
      var zhButtons = [];
      var selectedEn = null;

      function render() {
        runner.body.innerHTML = '';
        runner.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T6 释义连线', runner.idx, runner.total));
        var board = el('div', { className: 'match-board' });
        var enCol = el('div', { className: 'match-col' }, [el('div', { className: 'match-col-title', text: '英文' })]);
        var zhCol = el('div', { className: 'match-col' }, [el('div', { className: 'match-col-title', text: '中文' })]);
        shuffledEn.forEach(function (p) {
          var btn = el('div', {
            className: 'match-tile en',
            attrs: { 'data-id': String(p.word.id), draggable: 'true' },
            text: p.word.word
          });
          attachDnD(btn, p);
          enButtons.push(btn);
          enCol.appendChild(btn);
        });
        shuffledZh.forEach(function (p) {
          var btn = el('div', {
            className: 'match-tile zh',
            attrs: { 'data-id': String(p.word.id) },
            text: p.label
          });
          attachDrop(btn, p);
          zhButtons.push(btn);
          zhCol.appendChild(btn);
        });
        board.appendChild(enCol);
        board.appendChild(zhCol);
        runner.body.appendChild(board);
        runner.body.appendChild(el('div', { className: 'text-muted', text: '点击或拖拽英文→中文完成连线' }));
      }

      function attachDnD(btn, p) {
        btn.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', String(p.word.id));
          btn.classList.add('dragging');
        });
        btn.addEventListener('dragend', function () { btn.classList.remove('dragging'); });
        btn.addEventListener('click', function () {
          enButtons.forEach(function (b) { b.classList.remove('selected'); });
          selectedEn = p;
          btn.classList.add('selected');
        });
      }
      function attachDrop(btn, p) {
        btn.addEventListener('dragover', function (e) { e.preventDefault(); btn.classList.add('hover'); });
        btn.addEventListener('dragleave', function () { btn.classList.remove('hover'); });
        btn.addEventListener('drop', function (e) {
          e.preventDefault();
          btn.classList.remove('hover');
          var draggedId = Number(e.dataTransfer.getData('text/plain'));
          tryMatch(draggedId, p);
        });
        btn.addEventListener('click', function () {
          if (selectedEn) {
            tryMatch(selectedEn.word.id, p);
            selectedEn = null;
            enButtons.forEach(function (b) { b.classList.remove('selected'); });
          }
        });
      }

      function tryMatch(enId, zhPair) {
        var enPair = pairs.find(function (p) { return p.word.id === enId; });
        if (!enPair) return;
        var correct = (enId === zhPair.word.id);
        var enBtn = enButtons.find(function (b) { return b.getAttribute('data-id') === String(enId); });
        var zhBtn = zhButtons.find(function (b) { return b.getAttribute('data-id') === String(zhPair.word.id); });
        runner.record({
          wordId: zhPair.word.id,
          correct: correct,
          timeMs: 0,
          userAnswer: enPair.word.word + '↔' + zhPair.label
        });
        if (correct) {
          enBtn.classList.add('matched');
          zhBtn.classList.add('matched');
          enBtn.setAttribute('draggable', 'false');
          zhBtn.setAttribute('draggable', 'false');
          enPair.matched = true;
        } else {
          enBtn.classList.add('wrong');
          zhBtn.classList.add('wrong');
          setTimeout(function () {
            enBtn.classList.remove('wrong');
            zhBtn.classList.remove('wrong');
          }, 800);
        }
        // Check if all matched
        var allMatched = pairs.every(function (p) { return p.matched; });
        if (allMatched) {
          setTimeout(function () { runner.finish(); }, 600);
        }
      }

      render();
    }
  };

  // T7: 完形填空
  modes.T7_cloze = {
    name: 'T7 · 完形填空',
    description: '在短文挖空中选出最恰当的单词',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T7', callbacks);
      runner.mount('T7 完形填空');

      function makeCloze(w) {
        var ex = (w.examples && w.examples[0]) || (w.definition ? w.definition : w.word);
        var re = new RegExp(w.word, 'gi');
        if (re.test(ex)) return ex.replace(re, '_______');
        return (w.translation || w.word) + ' is the concept of "_______" in daily use.';
      }

      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T7 完形填空', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card cloze-card' }, [
          el('div', { className: 'cloze-sentence', text: makeCloze(w) }),
          el('div', { className: 'cloze-hint', text: '提示:' + (w.translation || '').slice(0, 12) })
        ]);
        var opts = shuffle([w].concat(pickDistractors(w, this.words, 3)))
          .map(function (x) { return { value: x.id, label: x.word }; });
        var grid = buildOptionsPanel(opts);
        this.body.appendChild(card);
        this.body.appendChild(grid);
        var self = this;
        grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: opts[i].label
            });
            if (!correct) {
              card.appendChild(el('div', { className: 't-quiz-explain', text:
                '✓ ' + w.word + ' — ' + (w.definition || w.translation) }));
            }
            self.goNext(correct ? 700 : 1600);
          };
        });
      };
      runner.render();
    }
  };

  // T8: 词族测试
  modes.T8_familyTest = {
    name: 'T8 · 词族测试',
    description: '选出正确的派生词',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T8', callbacks);
      runner.mount('T8 词族测试');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T8 词族测试', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var family = (w.family || []).slice();
        if (family.indexOf(w.word) === -1) family.unshift(w.word);
        // Show root + 3 options
        var correctFamily = family.filter(function (f) { return w.word.indexOf(f) >= 0 || f.indexOf(w.word) >= 0 || f === w.word; });
        if (correctFamily.length === 0) correctFamily = [w.word];

        var card = el('div', { className: 'quiz-card family-card' }, [
          el('div', { className: 'family-root', text: '词根/主词:' + w.word }),
          el('div', { className: 'family-translation', text: w.translation || '' }),
          el('div', { className: 'family-hint', text: '以下哪个属于本词的派生词族?' })
        ]);
        var correctChoice = correctFamily[0];
        var distractors = pickDistractors(w, this.words, 3).map(function (x) { return x.word; });
        var opts = shuffle([correctChoice].concat(distractors))
          .map(function (label) { return { value: label, label: label }; });
        var grid = buildOptionsPanel(opts);
        this.body.appendChild(card);
        this.body.appendChild(grid);
        var self = this;
        grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === correctChoice;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: opts[i].label
            });
            if (!correct) {
              card.appendChild(el('div', { className: 't-quiz-explain', text:
                '✓ 词族成员:' + family.slice(0, 6).join('、') }));
            }
            self.goNext(correct ? 600 : 1600);
          };
        });
      };
      runner.render();
    }
  };

  // T9: 发音测评 — microphone + simple scoring
  modes.T9_pronunciation = {
    name: 'T9 · 发音测评',
    description: '跟读单词并基于录音时长/音节数估算分数',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T9', callbacks);
      runner.mount('T9 发音测评');

      var recorder = null;
      var stream = null;
      var recordStart = 0;
      var recordTimer = null;

      function cleanup() {
        if (stream) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          stream = null;
        }
        if (recordTimer) { clearTimeout(recordTimer); recordTimer = null; }
      }

      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T9 发音测评', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();

        var status = el('div', { className: 'pron-status', text: '点击"开始录音"后大声朗读单词' });
        var card = el('div', { className: 'quiz-card pron-card' }, [
          el('div', { className: 'pron-word', text: w.word }),
          el('div', { className: 'pron-phonetic', text: w.phonetic || '' }),
          el('div', { className: 'pron-translation', text: w.translation || '' }),
          status
        ]);

        var recordBtn = el('button', {
          className: 'btn btn-primary',
          text: '🎤 开始录音',
          on: { click: function () { startRecord(); } }
        });
        var stopBtn = el('button', {
          className: 'btn btn-secondary', text: '⏹ 停止并评分',
          on: { click: function () { stopRecord(); } },
          attrs: { disabled: 'true' }
        });
        var skipBtn = el('button', {
          className: 'btn btn-ghost', text: '跳过 →',
          on: { click: function () {
            cleanup();
            runner.record({
              wordId: w.id, correct: false, timeMs: Date.now() - startTime,
              userAnswer: '(skipped)', score: 0
            });
            runner.goNext(400);
          } }
        });

        var actions = el('div', { className: 'recite-actions' }, [recordBtn, stopBtn, skipBtn]);
        this.body.appendChild(card);
        this.body.appendChild(actions);

        // Play TTS first
        setTimeout(function () { speak(w.word, { rate: 0.85 }); }, 200);

        function startRecord() {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            status.textContent = '❌ 当前浏览器不支持录音(getUserMedia)';
            return;
          }
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (s) {
              stream = s;
              recordStart = Date.now();
              status.textContent = '🔴 录音中...大声朗读 "' + w.word + '"';
              recordBtn.setAttribute('disabled', 'true');
              stopBtn.removeAttribute('disabled');
              // Auto stop after 5s
              recordTimer = setTimeout(function () { stopRecord(); }, 5000);
            })
            .catch(function (err) {
              status.textContent = '❌ 麦克风权限被拒:' + err.message;
            });
        }

        function stopRecord() {
          if (!stream) {
            // No mic — fallback to manual rate
            return manualRate();
          }
          cleanup();
          var duration = Date.now() - recordStart;
          // Simple scoring: target duration ≈ syllables * 350ms
          var syllables = syllablesOf(w.word);
          var targetMs = syllables * 380;
          var diff = Math.abs(duration - targetMs);
          var baseScore = 100;
          var score = Math.max(40, Math.round(baseScore - diff / 30));
          var correct = score >= 70;
          animateFeedback(card, correct);
          status.innerHTML = '<div class="pron-result">本次得分 <b>' + score + '</b> / 100 · 用时 ' +
            Math.round(duration / 100) / 10 + 's · 目标 ' + Math.round(targetMs / 100) / 10 + 's</div>';
          recordBtn.setAttribute('disabled', 'true');
          stopBtn.setAttribute('disabled', 'true');
          var timeMs = Date.now() - startTime;
          setTimeout(function () {
            runner.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: '(voice)', score: score
            });
            runner.goNext(900);
          }, 700);
        }

        function manualRate() {
          status.textContent = '⚠ 无麦克风访问,使用自评(Good/Easy/Again)';
          recordBtn.setAttribute('disabled', 'true');
          stopBtn.setAttribute('disabled', 'true');
          var rateRow = el('div', { className: 'recite-rate-row' });
          ['again', 'hard', 'good', 'easy'].forEach(function (r) {
            var labels = { again: 'Again 40', hard: 'Hard 60', good: 'Good 80', easy: 'Easy 95' };
            var colors = { again: 'again', hard: 'hard', good: 'good', easy: 'easy' };
            rateRow.appendChild(el('button', {
              className: 'rating-btn ' + colors[r], text: labels[r],
              on: { click: function () {
                var score = r === 'again' ? 40 : r === 'hard' ? 60 : r === 'good' ? 80 : 95;
                var correct = score >= 70;
                animateFeedback(card, correct);
                runner.record({
                  wordId: w.id, correct: correct, timeMs: Date.now() - startTime,
                  userAnswer: '(self-rate:' + r + ')', score: score
                });
                runner.goNext(700);
              } }
            }));
          });
          actions.appendChild(rateRow);
        }
      };
      runner.render();
    }
  };

  // T10: 综合模拟考 — 70题,45分钟倒计时,混合题型
  modes.T10_ieltsMock = {
    name: 'T10 · 综合模拟考',
    description: '雅思综合模拟 70 题 / 45 分钟倒计时',
    run: function (container, stage, words, callbacks) {
      var total = Math.min(words.length, 70);
      var sample = pickN(words, total);
      var runner = new TestRunner(container, stage, sample, 'T10', callbacks);
      runner.mount('T10 综合模拟考');

      // Question plan: distribute types
      runner.plan = sample.map(function (w, i) {
        var r = i % 7;
        if (r === 0) return { kind: 'en2zh', word: w };
        if (r === 1) return { kind: 'zh2en', word: w };
        if (r === 2) return { kind: 'spelling', word: w };
        if (r === 3) return { kind: 'listen', word: w };
        if (r === 4) return { kind: 'cloze', word: w };
        if (r === 5) return { kind: 'en2zh', word: w };
        return { kind: 'zh2en', word: w };
      });

      // Timer
      var totalSeconds = 45 * 60;
      var remaining = totalSeconds;
      var timerId = null;

      function tick() {
        if (remaining <= 0) {
          stop();
          runner.body.innerHTML = '<div class="quiz-complete">⏰ 时间到!正在生成成绩报告...</div>';
          setTimeout(function () { runner.finish(); }, 400);
          return;
        }
        var m = Math.floor(remaining / 60);
        var s = remaining % 60;
        var elTimer = runner.body.querySelector('.quiz-timer');
        if (elTimer) elTimer.textContent = '⏱ ' + m + ':' + String(s).padStart(2, '0');
        remaining--;
      }

      function startTimer() {
        if (timerId) return;
        timerId = setInterval(tick, 1000);
      }
      function stop() {
        if (timerId) { clearInterval(timerId); timerId = null; }
      }

      function makeCloze(w) {
        var ex = (w.examples && w.examples[0]) || w.definition || w.word;
        var re = new RegExp(w.word, 'gi');
        if (re.test(ex)) return ex.replace(re, '_______');
        return (w.translation || w.word) + ' is used as "_______".';
      }

      runner.render = function () {
        this.body.innerHTML = '';
        // Custom header with timer
        var header = el('div', { className: 'quiz-header' }, [
          el('div', { className: 'quiz-header-row' }, [
            el('div', { className: 'quiz-mode-tag', text: 'T10 综合模拟考' }),
            el('div', { className: 'quiz-timer', text: '⏱ 45:00' }),
            el('div', { className: 'quiz-progress-text', text: (this.idx + 1) + ' / ' + this.total })
          ]),
          el('div', { className: 'progress-bar' }, [
            el('div', { className: 'progress-bar quiz-progress-fill',
              style: 'width:' + Math.round((this.idx + 1) / this.total * 100) + '%' })
          ])
        ]);
        this.body.appendChild(header);
        if (!timerId) startTimer();

        var q = this.plan[this.idx];
        var w = q.word;
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card' });

        if (q.kind === 'en2zh') {
          card.appendChild(el('div', { className: 't-quiz-word', text: w.word }));
          card.appendChild(el('div', { className: 't-quiz-meta', text: (w.pos || '') + ' · ' + (w.phonetic || '') }));
        } else if (q.kind === 'zh2en') {
          card.appendChild(el('div', { className: 't-quiz-zh', text: w.translation || w.word }));
        } else if (q.kind === 'listen') {
          card.appendChild(el('div', { className: 't-quiz-zh', text: '听音辨义' }));
          card.appendChild(el('button', {
            className: 'big-speak-btn', text: '🔊 播放',
            on: { click: function () { speak(w.word, { rate: 0.9 }); } }
          }));
        } else if (q.kind === 'cloze') {
          card.appendChild(el('div', { className: 'cloze-sentence', text: makeCloze(w) }));
          card.appendChild(el('div', { className: 'cloze-hint', text: '选词填入空格' }));
        } else {
          card.appendChild(el('div', { className: 't-quiz-zh', text: '拼写测试:' + (w.translation || '') }));
          card.appendChild(el('button', {
            className: 'big-speak-btn small', text: '🔊 听音',
            on: { click: function () { speak(w.word, { rate: 0.9 }); } }
          }));
        }
        this.body.appendChild(card);

        if (q.kind === 'spelling') {
          var input = el('input', {
            className: 'form-input spell-input',
            attrs: { type: 'text', placeholder: '请输入拼写...', autocomplete: 'off' }
          });
          var feedback = el('div', { className: 'spell-feedback' });
          this.body.appendChild(input);
          this.body.appendChild(feedback);
          var self = this;
          function submit() {
            var userAns = input.value || '';
            var cmp = compareSpelling(userAns, w.word);
            var correct = cmp.ok;
            animateFeedback(card, correct);
            feedback.innerHTML = '';
            if (correct) {
              feedback.appendChild(el('div', { className: 'spell-feedback-ok', text: '✓ ' + w.word }));
            } else {
              feedback.appendChild(el('div', { className: 'spell-feedback-bad', text: '正确:' + w.word }));
              feedback.appendChild(showLetterDiff(userAns, w.word));
            }
            input.disabled = true;
            var timeMs = Date.now() - startTime;
            setTimeout(function () {
              self.record({ wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: userAns, kind: 'spelling' });
              self.goNext(correct ? 600 : 1400);
            }, correct ? 600 : 1300);
          }
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
          this.body.appendChild(el('div', { className: 'recite-actions' }, [
            el('button', { className: 'btn btn-primary', text: '提交', on: { click: function () { submit(); } } })
          ]));
          setTimeout(function () { input.focus(); }, 100);
        } else {
          var labels;
          if (q.kind === 'zh2en') {
            labels = sample;
            var opts = shuffle([w].concat(pickDistractors(w, sample, 3)))
              .map(function (x) { return { value: x.id, label: x.word }; });
          } else if (q.kind === 'cloze') {
            labels = sample;
            var opts = shuffle([w].concat(pickDistractors(w, sample, 3)))
              .map(function (x) { return { value: x.id, label: x.word }; });
          } else {
            // en2zh, listen
            var opts = shuffle([w].concat(pickDistractors(w, sample, 3)))
              .map(function (x) { return { value: x.id, label: x.translation || x.word }; });
          }
          var grid = buildOptionsPanel(opts);
          this.body.appendChild(grid);
          var self = this;
          grid.querySelectorAll('.quiz-option').forEach(function (b, i) {
            b.onclick = function () {
              var correct = opts[i].value === w.id;
              markOption(grid, i, correct);
              animateFeedback(card, correct);
              var timeMs = Date.now() - startTime;
              self.record({ wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: opts[i].label, kind: q.kind });
              self.goNext(correct ? 500 : 1100);
            };
          });
        }
      };

      // Override finish to clear timer
      var origFinish = runner.finish.bind(runner);
      runner.finish = function () {
        stop();
        origFinish();
      };
      runner.render();
    }
  };

  // Public API
  global.TestModes = modes;
})(window);
