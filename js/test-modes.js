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

  // T11: 发音测评 — 按住麦克风录音,ASR 识别对比,智能判断对错 + 纠正建议
  modes.T11_pronunciation = {
    name: 'T11 · 发音',
    description: '按住麦克风朗读,自动判断发音',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T11', callbacks);
      runner.mount('T11 发音');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T11 发音', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card pron-card' }, [
          el('div', { className: 't-quiz-word', text: w.word }),
          el('div', { className: 't-quiz-meta', text: posDisplay(w.pos) + ' · ' + (w.phonetic || '') }),
          el('div', { className: 't-quiz-explain',
            text: '按住下方按钮朗读该词,系统会自动识别你的发音并给出建议。' })
        ]);
        var btnRow = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'btn btn-secondary',
            text: '🔊 听标准发音',
            on: { click: function () { speak(w.word, { rate: 0.85 }); } }
          })
        ]);

        // 录音状态
        var recState = { recording: false, recognized: '', status: '' };

        var holdBtn = el('button', {
          className: 'pron-hold-btn',
          attrs: { type: 'button' }
        }, [
          el('span', { className: 'pron-hold-icon', text: '🎤' }),
          el('span', { className: 'pron-hold-label', text: '点一下 / 按住 录音' }),
          el('span', { className: 'pron-hold-sub', text: '识别后自动判断对错' })
        ]);
        var recStatus = el('div', { className: 'pron-rec-status' });
        var resultBox = el('div', { className: 'pron-result-box' });

        var nativeSR = window.SpeechRecognition || window.webkitSpeechRecognition;
        var browserSupport = !!nativeSR;

        function normalizeText(s) {
          return String(s || '')
            .toLowerCase()
            .replace(/[^a-z\s']/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

        function similarity(a, b) {
          // Levenshtein 距离(小词适用)
          if (a === b) return 1;
          if (!a.length || !b.length) return 0;
          var dp = [];
          for (var i = 0; i <= a.length; i++) {
            dp[i] = [i];
            for (var j = 1; j <= b.length; j++) dp[i][j] = 0;
          }
          for (var j = 0; j <= b.length; j++) dp[0][j] = j;
          for (var i = 1; i <= a.length; i++) {
            for (var j = 1; j <= b.length; j++) {
              if (a.charAt(i - 1) === b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
              } else {
                dp[i][j] = Math.min(
                  dp[i - 1][j] + 1,
                  dp[i][j - 1] + 1,
                  dp[i - 1][j - 1] + 1
                );
              }
            }
          }
          var maxLen = Math.max(a.length, b.length);
          return 1 - dp[a.length][b.length] / maxLen;
        }

        function buildPronAdvice(recognized, target) {
          var rec = normalizeText(recognized);
          var tgt = normalizeText(target);
          var advice = [];
          if (!rec) {
            advice.push('🔇 未识别到任何发音,请按住按钮清晰朗读一次。');
            return advice.join(' ');
          }
          if (rec === tgt) {
            advice.push('🎉 完美!发音清晰准确。');
            return advice.join(' ');
          }
          var sim = similarity(rec, tgt);
          // 找首个字母差异点
          var diffIdx = -1;
          var minLen = Math.min(rec.length, tgt.length);
          for (var i = 0; i < minLen; i++) {
            if (rec.charAt(i) !== tgt.charAt(i)) { diffIdx = i; break; }
          }
          if (diffIdx === -1 && rec.length !== tgt.length) diffIdx = minLen;

          advice.push('🎧 你读的是:' + '「' + recognized + '」 · 目标:' + '「' + target + '」');
          if (sim >= 0.6) {
            advice.push('⚠️ 比较接近但不完全准确,可能是个别音节发音不准。');
          } else if (rec.length === tgt.length) {
            advice.push('❌ 发音差异较大,可能是元音/辅音读错。');
          } else if (rec.length < tgt.length) {
            advice.push('❌ 你读得比较短,可能漏读了某个音节。');
          } else {
            advice.push('❌ 你读得比较长,可能多读了某个音节或拖音。');
          }
          if (diffIdx >= 0 && diffIdx < tgt.length) {
            var w = w; // 当前单词对象
            if (tgt.charAt(diffIdx) !== rec.charAt(diffIdx || 0)) {
              var prefix = tgt.substring(0, diffIdx);
              var sameStart = 0;
              for (var k = 0; k < Math.min(rec.length, tgt.length); k++) {
                if (rec.charAt(k) === tgt.charAt(k)) sameStart = k + 1; else break;
              }
              advice.push('💡 注意字母「' + tgt.charAt(diffIdx) + '」(前缀"' + prefix + '")这个位置发的音。');
            }
          }
          if (w.phonetic) {
            advice.push('📖 标准音标:' + w.phonetic + '。可用 🔊 听标准发音 对照练习。');
          }
          return advice.join(' ');
        }

        function renderResult(ok, detail) {
          resultBox.innerHTML = '';
          if (ok === null) {
            resultBox.appendChild(el('div', { className: 'pron-result-none', text: detail || '' }));
            return;
          }
          var cls = ok ? 'pron-result-ok' : 'pron-result-bad';
          resultBox.appendChild(el('div', { className: 'pron-result-row ' + cls }, [
            el('div', { className: 'pron-result-mark', text: ok ? '✅' : '❌' }),
            el('div', { className: 'pron-result-text', text: detail })
          ]));
        }

        function doConfirm(ok, recognizedText) {
          animateFeedback(card, ok);
          var finalText = ok
            ? '✓ 读对了:' + w.word
            : buildPronAdvice(recognizedText, w.word);
          renderResult(ok, finalText);
          var timeMs = Date.now() - startTime;
          self.record({
            wordId: w.id, correct: ok, timeMs: timeMs,
            userAnswer: '[ASR] ' + (recognizedText || ''), kind: 'pronunciation'
          });
          if (confirmBtn) confirmBtn.classList.add('hidden');
          setTimeout(function () { self.goNext(ok ? 1200 : 2200); }, ok ? 1000 : 2000);
        }

        function startRecording() {
          if (!browserSupport) {
            recStatus.textContent = '❌ 浏览器不支持语音识别,请改用下方自评按钮。';
            return;
          }
          recState.recording = true;
          recState.recognized = '';
          recStatus.textContent = '🔴 正在录音... 松开结束';
          holdBtn.classList.add('recording');
          try {
            var rec = new nativeSR();
            rec.lang = 'en-US';
            rec.interimResults = false;
            rec.maxAlternatives = 3;
            rec.continuous = false;
            rec.onresult = function (ev) {
              var alts = [];
              for (var i = 0; i < ev.results.length; i++) {
                for (var j = 0; j < ev.results[i].length; j++) {
                  alts.push(ev.results[i][j].transcript);
                }
              }
              recState.recognized = alts[0] || '';
            };
            rec.onerror = function (ev) {
              recState.recording = false;
              holdBtn.classList.remove('recording');
              recStatus.textContent = '⚠️ 识别失败:' + (ev.error || '未知错误');
              if (ev.error === 'not-allowed') {
                recStatus.textContent = '⚠️ 未授权麦克风,请在浏览器设置中允许后刷新。';
              } else if (ev.error === 'no-speech') {
                recStatus.textContent = '⚠️ 没检测到声音,大声一点再试一次。';
              }
            };
            rec.onend = function () {
              if (recState.recording) {
                recState.recording = false;
                holdBtn.classList.remove('recording');
                var recTxt = recState.recognized;
                if (!recTxt) {
                  recStatus.textContent = '⚠️ 未能识别,请重试或使用下方自评按钮。';
                  return;
                }
                recStatus.textContent = '🎧 识别到:' + '「' + recTxt + '」';
                var recN = normalizeText(recTxt);
                var tgtN = normalizeText(w.word);
                var sim = similarity(recN, tgtN);
                var ok = recN === tgtN || sim >= 0.8;
                doConfirm(ok, recTxt);
              }
            };
            holdBtn._sr = rec;
            rec.start();
          } catch (err) {
            recState.recording = false;
            holdBtn.classList.remove('recording');
            recStatus.textContent = '❌ 启动录音失败:' + (err.message || err);
          }
        }

        function stopRecording() {
          var rec = holdBtn._sr;
          if (rec) {
            try { rec.stop(); } catch (e) {}
          }
        }

        if (browserSupport) {
          // 按住录(电脑)
          holdBtn.addEventListener('mousedown', function (e) { e.preventDefault(); if (!recState.recording) startRecording(); });
          holdBtn.addEventListener('mouseup', function () { stopRecording(); });
          holdBtn.addEventListener('mouseleave', function () { if (recState.recording) stopRecording(); });
          // 按住录(手机)
          holdBtn.addEventListener('touchstart', function (e) { e.preventDefault(); if (!recState.recording) startRecording(); }, { passive: false });
          holdBtn.addEventListener('touchend', function (e) { e.preventDefault(); stopRecording(); }, { passive: false });
          // 单击录(兜底,某些移动端不能触发长按)
          holdBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (recState.recording) stopRecording();
            else startRecording();
          });
        } else {
          // 不支持 Speech API 的浏览器:按钮变灰,但仍提示用户用自评
          holdBtn.classList.add('unsupported');
          holdBtn.disabled = true;
          recStatus.textContent = '⚠️ 当前浏览器不支持语音识别(微信/老 Safari),请用下方自评按钮。';
          holdBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.App && App.toast) {
              App.toast('当前浏览器不支持语音识别,请用下方自评按钮', 'warn');
            }
          });
        }

        var confirmBtn = null;

        this.body.appendChild(card);
        this.body.appendChild(btnRow);
        this.body.appendChild(el('div', { className: 'pron-hold-wrap' }, [holdBtn, recStatus]));
        this.body.appendChild(resultBox);

        // 自评兜底按钮(浏览器不支持时使用)
        var fallbackRow = el('div', { className: 'recite-rate-row' });
        [
          { r: 'bad',  label: '✗ 不会读', correct: false },
          { r: 'mid',  label: '≈ 模糊', correct: false },
          { r: 'good', label: '✓ 读对了', correct: true }
        ].forEach(function (it) {
          fallbackRow.appendChild(el('button', {
            className: 'rating-btn ' + it.r + (browserSupport ? ' fallback-btn' : ''),
            title: browserSupport ? '录不上/识别不准时手动评分' : '浏览器不支持麦克风,只能手动评分',
            on: { click: function () {
              doConfirm(it.correct, '(' + it.label + ')');
            } }
          }, [
            el('span', { className: 'rating-label', text: it.label })
          ]));
        });
        this.body.appendChild(el('div', { className: 'pron-fallback-hint',
          text: browserSupport ? '录音不灵时,可使用下方自评:' : '当前浏览器不支持麦克风识别,请手动评分:' }));
        this.body.appendChild(fallbackRow);

        var self = this;
        setTimeout(function () { speak(w.word, { rate: 0.9 }); }, 200);
      };
      runner.render();
    }
  };

  // T12: 看中写英 — 看着中文拼写英文
  modes.T12_zhToEnType = {
    name: 'T12 · 中译英',
    description: '看中文,键入英文拼写',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T12', callbacks);
      runner.mount('T12 中译英');
      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T12 中译英', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var card = el('div', { className: 'quiz-card' }, [
          el('div', { className: 't-quiz-zh', text: w.translation || '' }),
          el('div', { className: 't-quiz-meta', text: '请键入对应英文' })
        ]);
        var input = el('input', {
          className: 'form-input spell-input',
          attrs: { type: 'text', placeholder: '请输入英文...', autocomplete: 'off' }
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
            feedback.appendChild(el('div', { className: 'spell-feedback-ok', text: '✓ ' + w.word + ' — ' + (w.translation || '') }));
          } else {
            feedback.appendChild(el('div', { className: 'spell-feedback-bad', text: '正确:' + w.word }));
            feedback.appendChild(showLetterDiff(userAns, w.word));
          }
          input.disabled = true;
          var timeMs = Date.now() - startTime;
          setTimeout(function () {
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: userAns, kind: 'zhToEnType'
            });
            self.goNext(correct ? 600 : 1400);
          }, correct ? 600 : 1300);
        }
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
        setTimeout(function () { input.focus(); }, 100);
      };
      runner.render();
    }
  };

  // T13: 例句填空 — 给中文,要求写出英文整句
  modes.T13_example = {
    name: 'T13 · 例句填空',
    description: '看中文,写出含目标词的英文整句',
    run: function (container, stage, words, callbacks) {
      var runner = new TestRunner(container, stage, words, 'T13', callbacks);
      runner.mount('T13 例句填空');

      function getExample(w) {
        if (w.sceneExamples && w.sceneExamples[0]) {
          return { en: w.sceneExamples[0].en, zh: w.sceneExamples[0].zh };
        }
        if (w.examples && w.examples[0]) {
          return { en: w.examples[0], zh: w.translation || '' };
        }
        return { en: w.word, zh: w.translation || '' };
      }

      function makeCloze(w) {
        var ex = getExample(w);
        var re = new RegExp(w.word, 'gi');
        var masked = ex.en.replace(re, '_____');
        return { promptZh: ex.zh, masked: masked, full: ex.en };
      }

      runner.render = function () {
        this.body.innerHTML = '';
        this.body.appendChild(buildHeader('检验 · ' + (Storage.STAGE_NAMES[stage] || stage), 'T13 例句填空', this.idx, this.total));
        var w = this.words[this.idx];
        var startTime = Date.now();
        var cloze = makeCloze(w);
        var card = el('div', { className: 'quiz-card cloze-card' }, [
          el('div', { className: 'cloze-hint', text: '中文:' + (cloze.promptZh || w.translation || '') }),
          el('div', { className: 'cloze-sentence', text: cloze.masked }),
          el('div', { className: 't-quiz-meta', text: '目标词:' + w.word + ' (拼写正确即可)' })
        ]);
        var input = el('input', {
          className: 'form-input spell-input',
          attrs: { type: 'text', placeholder: '请输入完整英文句子...', autocomplete: 'off' }
        });
        var feedback = el('div', { className: 'spell-feedback' });
        this.body.appendChild(card);
        this.body.appendChild(input);
        this.body.appendChild(feedback);
        var actions = el('div', { className: 'recite-actions' }, [
          el('button', { className: 'btn btn-primary', text: '提交',
            on: { click: function () { submit(); } } }),
          el('button', { className: 'btn btn-ghost', text: '查看原句',
            on: { click: function () {
              feedback.innerHTML = '';
              feedback.appendChild(el('div', { className: 'spell-feedback-meta', text: cloze.full }));
            } } })
        ]);
        this.body.appendChild(actions);
        var self = this;
        function submit() {
          var userAns = (input.value || '').trim();
          // 判分:用户答案中包含正确拼写的目标词(简单规则,鼓励至少写出该词)
          var re = new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          var correct = re.test(userAns);
          animateFeedback(card, correct);
          feedback.innerHTML = '';
          feedback.appendChild(el('div', {
            className: correct ? 'spell-feedback-ok' : 'spell-feedback-bad',
            text: correct ? '✓ 包含目标词 ' + w.word : '✗ 答案需包含 ' + w.word
          }));
          feedback.appendChild(el('div', { className: 'spell-feedback-meta', text: '原句:' + cloze.full }));
          input.disabled = true;
          var timeMs = Date.now() - startTime;
          setTimeout(function () {
            self.record({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: userAns, kind: 'example'
            });
            self.goNext(correct ? 700 : 1600);
          }, correct ? 700 : 1500);
        }
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
        setTimeout(function () { input.focus(); }, 100);
      };
      runner.render();
    }
  };

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

      // Override finish to clear timer + add 分项成绩报告 + 段位达标提示
      var origFinish = runner.finish.bind(runner);
      runner.finish = function () {
        stop();

        var COHORT_TO_SEGMENT = {
          chuyi: 'junior', chuer: 'junior', chusan: 'junior', chuzhong: 'junior',
          gaoyi: 'senior', gaoer: 'senior', gaosan: 'senior',
          college: 'college', ielts: 'ielts'
        };
        var SEGMENT_THRESHOLD = {
          junior: 80,
          senior: 85,
          college: 88,
          ielts: 90
        };
        var SEGMENT_LABEL = {
          junior: '初中', senior: '高中', college: '大学', ielts: '雅思'
        };
        var KIND_LABEL = {
          en2zh: '看英选义',
          zh2en: '看义选英',
          spelling: '听写拼写',
          listen: '听音辨义',
          cloze: '完形填空'
        };

        var cohort = String(this.stage || '').split('-')[0];
        var segment = COHORT_TO_SEGMENT[cohort] || 'junior';

        var byKind = {};
        Object.keys(KIND_LABEL).forEach(function (k) {
          byKind[k] = { total: 0, correct: 0 };
        });
        this.results.forEach(function (r) {
          var k = r.kind || 'en2zh';
          if (!byKind[k]) byKind[k] = { total: 0, correct: 0 };
          byKind[k].total++;
          if (r.correct) byKind[k].correct++;
        });

        var totalCount = this.results.length;
        var correctCount = this.results.filter(function (r) { return r.correct; }).length;
        var totalRate = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
        var threshold = SEGMENT_THRESHOLD[segment];
        var passed = totalRate >= threshold;
        var timeSpent = Date.now() - this.startTime;
        var minutesSpent = Math.floor(timeSpent / 60000);
        var secondsSpent = Math.floor((timeSpent % 60000) / 1000);

        origFinish();

        var reportChildren = [];
        reportChildren.push(el('div', { className: 't10-report-head' }, [
          el('div', { className: 't10-report-title', text: '本次 T10 综合模拟考 · 成绩报告' }),
          el('div', { className: 't10-report-segment', text: '段位:' + SEGMENT_LABEL[segment] + ' (入门阈值 ' + threshold + '%)' })
        ]));

        var totalCard = el('div', { className: 't10-total-card ' + (passed ? 'pass' : 'fail') }, [
          el('div', { className: 't10-total-rate', text: totalRate + '%' }),
          el('div', { className: 't10-total-label', text: '综合正确率' }),
          el('div', { className: 't10-total-detail', text:
            correctCount + ' / ' + totalCount + ' 题  ·  用时 ' + minutesSpent + ' 分 ' + secondsSpent + ' 秒' }),
          el('div', { className: 't10-total-verdict', text:
            passed ? '✓ 达标——恭喜,' + SEGMENT_LABEL[segment] + '阶段通过'
                   : '✗ 未达标——距离 ' + SEGMENT_LABEL[segment] + '阶段门槛还差 ' + (threshold - totalRate) + '%' })
        ]);
        reportChildren.push(totalCard);

        var breakdownTitle = el('div', { className: 't10-breakdown-title', text: '分项正确率' });
        reportChildren.push(breakdownTitle);

        var breakdownGrid = el('div', { className: 't10-breakdown-grid' });
        Object.keys(byKind).forEach(function (k) {
          var info = byKind[k];
          if (info.total === 0) return;
          var rate = Math.round((info.correct / info.total) * 100);
          var barClass = rate >= 90 ? 'high' : (rate >= 70 ? 'mid' : 'low');
          breakdownGrid.appendChild(el('div', { className: 't10-breakdown-card glass' }, [
            el('div', { className: 't10-breakdown-label', text: KIND_LABEL[k] || k }),
            el('div', { className: 't10-breakdown-rate ' + barClass, text: rate + '%' }),
            el('div', { className: 't10-breakdown-meta', text: info.correct + ' / ' + info.total + ' 题' }),
            el('div', { className: 't10-breakdown-bar' }, [
              el('div', { className: 't10-breakdown-fill ' + barClass,
                style: 'width:' + rate + '%' })
            ])
          ]));
        });
        reportChildren.push(breakdownGrid);

        var weakList = [];
        Object.keys(byKind).forEach(function (k) {
          var info = byKind[k];
          if (info.total > 0) {
            var r = Math.round((info.correct / info.total) * 100);
            if (r < 80) weakList.push({ label: KIND_LABEL[k] || k, rate: r });
          }
        });
        weakList.sort(function (a, b) { return a.rate - b.rate; });
        if (weakList.length > 0) {
          var advice = el('div', { className: 't10-advice' }, [
            el('div', { className: 't10-advice-title', text: '⚠️ 弱项建议' }),
            el('div', { className: 't10-advice-text', text:
              '分项正确率低于 80% 的题型: ' + weakList.map(function (w) { return w.label + '(' + w.rate + '%)'; }).join('、 ') +
              '。建议回炉相应 L 系列 + T 系列专项训练,再做下一次 T10。' })
          ]);
          reportChildren.push(advice);
        }

        var exitBtn = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'btn btn-primary',
            text: '返回检验模式',
            on: { click: function () { if (window.App && App.navigate) App.navigate('test'); } }
          })
        ]);
        reportChildren.push(exitBtn);

        this.body.innerHTML = '';
        this.body.appendChild(el('div', { className: 't10-report' }, reportChildren));
      };
      runner.render();
    }
  };

  // Public API
  global.TestModes = modes;
})(window);
