/**
 * VocabMastery · 10 Recite Modes (L1-L10)
 * 背诵模式:主动回忆训练,仅写 attempts_log,不污染 SRS 主队列
 *
 * 每个模式为对象,统一接口:
 *   { name, description, run(container, stage, words, callbacks) }
 *   callbacks = { onAnswer({wordId, correct, timeMs, userAnswer}),
 *                 onComplete() }
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
      u.pitch = (opts && opts.pitch) || 1.0;
      global.speechSynthesis.speak(u);
    } catch (err) {
      console.warn('[speak]', err);
    }
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

  function toast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = el('div', { id: 'toast-container', className: 'toast-container' });
      document.body.appendChild(container);
    }
    var t = el('div', { className: 'toast ' + (type || 'info'), text: message });
    container.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1800);
  }

  function feedbackClass(ok) { return ok ? 'feedback-correct' : 'feedback-wrong'; }

  function animateFeedback(target, ok) {
    if (!target) return;
    target.classList.remove('feedback-correct', 'feedback-wrong', 'pulse', 'shake');
    void target.offsetWidth;
    target.classList.add(ok ? 'pulse' : 'shake', feedbackClass(ok));
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

  function showProgress(container, idx, total) {
    var bar = container.querySelector('.quiz-progress-fill');
    var txt = container.querySelector('.quiz-progress-text');
    if (bar) bar.style.width = (total === 0 ? 0 : Math.round((idx + 1) / total * 100)) + '%';
    if (txt) txt.textContent = (idx + 1) + ' / ' + total;
  }

  function buildHeader(stage, modeName, idx, total) {
    return el('div', { className: 'quiz-header' }, [
      el('div', { className: 'quiz-header-row' }, [
        el('div', { className: 'quiz-mode-tag', text: modeName }),
        el('div', { className: 'quiz-progress-text', text: (idx + 1) + ' / ' + total })
      ]),
      el('div', { className: 'progress-bar' }, [
        el('div', { className: 'progress-bar quiz-progress-fill',
                    style: 'width:' + Math.round((idx + 1) / total * 100) + '%' })
      ])
    ]);
  }

  function buildOptionsPanel(options, onSelect, opts) {
    opts = opts || {};
    var grid = el('div', { className: 'quiz-options' });
    options.forEach(function (opt, i) {
      var btn = el('button', {
        className: 'quiz-option',
        attrs: { 'data-value': String(opt.value) },
        on: { click: function () { onSelect(opt, i, btn, grid); } }
      }, [
        el('span', { className: 'quiz-option-key', text: String.fromCharCode(65 + i) }),
        el('span', { className: 'quiz-option-text', text: opt.label })
      ]);
      grid.appendChild(btn);
    });
    return grid;
  }

  function markOption(grid, idx, ok) {
    var btns = grid.querySelectorAll('.quiz-option');
    btns.forEach(function (b, i) {
      b.classList.add('disabled');
      if (i === idx) b.classList.add(ok ? 'correct' : 'wrong');
    });
  }

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Spell-comparison: returns { ok, wrongPositions: [int] }
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

  function showLetterDiff(container, userInput, target) {
    var cmp = compareSpelling(userInput, target);
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

  // Build quiz body container with header
  function freshBody(stageName, modeName, total) {
    return el('div', { className: 'quiz-body' }, [
      buildHeader(stageName, modeName, 0, total)
    ]);
  }

  // ---------- 10 Recite Modes ----------

  var modes = {};

  // L1: 看英回忆 — show English, user thinks, click "show" then self-rate
  modes.L1_viewEn = {
    name: 'L1 · 看英回忆',
    description: '看到英文,在脑中回忆中文释义',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L1 看英回忆', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L1 看英回忆', idx, total));
        var w = words[idx];
        var card = el('div', { className: 'quiz-card recite-flash' });
        var front = el('div', { className: 'recite-flash-front' }, [
          el('div', { className: 'recite-flash-word', text: w.word }),
          el('div', { className: 'recite-flash-phonetic', text: w.phonetic || '' }),
          el('div', { className: 'recite-flash-hint', text: w.pos || '点击下方"显示答案"对照' })
        ]);
        var back = el('div', { className: 'recite-flash-back hidden' }, [
          el('div', { className: 'recite-flash-translation', text: w.translation || '' }),
          el('div', { className: 'recite-flash-def', text: w.definition || '' }),
          el('div', { className: 'recite-flash-ex', text:
            w.examples && w.examples[0] ? '例:' + w.examples[0] : '' })
        ]);
        card.appendChild(front);
        card.appendChild(back);

        var revealed = false;
        var startTime = Date.now();

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'btn btn-secondary',
            text: '🔊 朗读',
            on: { click: function () { speak(w.word); } }
          }),
          el('button', {
            className: 'btn btn-primary',
            text: '👁 显示答案',
            on: { click: function () {
              if (revealed) return;
              revealed = true;
              back.classList.remove('hidden');
              renderRating();
            } }
          })
        ]);

        function renderRating() {
          actions.innerHTML = '';
          actions.appendChild(el('div', { className: 'recite-rate-label', text: '自评回想准确度:' }));
          ['again', 'hard', 'good', 'easy'].forEach(function (r) {
            var labels = { again: 'Again 忘了', hard: 'Hard 模糊', good: 'Good 想起', easy: 'Easy 秒答' };
            var colors = { again: 'again', hard: 'hard', good: 'good', easy: 'easy' };
            actions.appendChild(el('button', {
              className: 'rating-btn ' + colors[r],
              text: labels[r],
              on: { click: function () {
                var timeMs = Date.now() - startTime;
                var correct = (r === 'good' || r === 'easy');
                animateFeedback(card, correct);
                callbacks.onAnswer({
                  wordId: w.id,
                  correct: correct,
                  timeMs: timeMs,
                  userAnswer: r,
                  mode: 'L1'
                });
                setTimeout(next, 380);
              } }
            }));
          });
        }

        body.appendChild(card);
        body.appendChild(actions);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L1 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L2: 看义回忆 — show Chinese, user types English
  modes.L2_viewZh = {
    name: 'L2 · 看义回忆',
    description: '看到中文释义,键入英文单词',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L2 看义回忆', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L2 看义回忆', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var card = el('div', { className: 'quiz-card recite-flash' }, [
          el('div', { className: 'recite-flash-translation', text: w.translation || '' }),
          el('div', { className: 'recite-flash-def', text: w.definition || '' }),
          el('div', { className: 'recite-flash-hint', text: w.pos || '' })
        ]);

        var input = el('input', {
          className: 'form-input spell-input',
          attrs: { type: 'text', placeholder: '请输入英文单词...', autocomplete: 'off' }
        });
        var feedback = el('div', { className: 'spell-feedback' });

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'btn btn-primary',
            text: '提交 ✉',
            on: { click: function () { submit(); } }
          }),
          el('button', {
            className: 'btn btn-secondary',
            text: '跳过 →',
            on: { click: function () {
              input.value = '';
              submit();
            } }
          })
        ]);

        function submit() {
          var userAns = input.value || '';
          var cmp = compareSpelling(userAns, w.word);
          var correct = cmp.ok;
          animateFeedback(card, correct);
          feedback.innerHTML = '';
          if (correct) {
            feedback.appendChild(el('div', {
              className: 'spell-feedback-ok',
              text: '✓ 正确! ' + w.word + (w.phonetic ? ' ' + w.phonetic : '')
            }));
          } else {
            feedback.appendChild(el('div', { className: 'spell-feedback-bad', text: '✗ 正确拼写:' }));
            feedback.appendChild(showLetterDiff(userAns, w.word));
            feedback.appendChild(el('div', { className: 'spell-feedback-meta', text:
              (w.examples && w.examples[0]) ? '例:' + w.examples[0] : '' }));
          }
          input.disabled = true;
          var timeMs = Date.now() - startTime;
          setTimeout(function () {
            callbacks.onAnswer({
              wordId: w.id,
              correct: correct,
              timeMs: timeMs,
              userAnswer: userAns,
              mode: 'L2'
            });
            next();
          }, correct ? 600 : 1500);
        }

        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') submit();
        });

        body.appendChild(card);
        body.appendChild(input);
        body.appendChild(feedback);
        body.appendChild(actions);
        setTimeout(function () { input.focus(); }, 50);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L2 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L3: 听音辨义 — 4 options (Chinese) after TTS
  modes.L3_listenChoose = {
    name: 'L3 · 听音辨义',
    description: '听单词发音,选出正确中文释义',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L3 听音辨义', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L3 听音辨义', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var card = el('div', { className: 'quiz-card listen-card' }, [
          el('button', {
            className: 'big-speak-btn',
            text: '🔊 播放发音',
            on: { click: function () { speak(w.word, { rate: 0.85 }); } }
          }),
          el('div', { className: 'listen-phonetic', text: w.phonetic || '' })
        ]);

        var distractors = pickDistractors(w, words, 3);
        var opts = shuffle([w].concat(distractors)).map(function (x) {
          return { value: x.id, label: x.translation || x.word };
        });

        var grid = buildOptionsPanel(opts, function (opt) {
          var correct = opt.value === w.id;
          markOption(grid, opt.__idx || 0, correct);
          animateFeedback(card, correct);
          var timeMs = Date.now() - startTime;
          if (correct) {
            speak(w.word, { rate: 0.9 });
          } else {
            // Show hint
            var hint = el('div', { className: 'listen-hint', text:
              '✓ 正确: ' + w.word + ' — ' + w.translation +
              (w.examples && w.examples[0] ? ' · 例:' + w.examples[0] : '') });
            card.appendChild(hint);
          }
          setTimeout(function () {
            callbacks.onAnswer({
              wordId: w.id,
              correct: correct,
              timeMs: timeMs,
              userAnswer: opt.label,
              mode: 'L3'
            });
            next();
          }, correct ? 600 : 1500);
        });
        // Tag indices
        opts.forEach(function (o, i) { o.__idx = i; });
        // Rewrite click handler with index
        var realBtns = grid.querySelectorAll('.quiz-option');
        realBtns.forEach(function (b, i) {
          b.onclick = function () {
            b.parentNode.dispatchEvent(new CustomEvent('pick', { detail: opts[i] }));
            // Directly invoke with index
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            if (correct) speak(w.word, { rate: 0.9 });
            else card.appendChild(el('div', { className: 'listen-hint', text:
              '✓ 正确: ' + w.word + ' — ' + w.translation +
              (w.examples && w.examples[0] ? ' · 例:' + w.examples[0] : '') }));
            setTimeout(function () {
              callbacks.onAnswer({
                wordId: w.id,
                correct: correct,
                timeMs: timeMs,
                userAnswer: opts[i].label,
                mode: 'L3'
              });
              next();
            }, correct ? 600 : 1500);
          };
        });

        body.appendChild(card);
        body.appendChild(grid);
        // Auto play
        setTimeout(function () { speak(w.word, { rate: 0.85 }); }, 200);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L3 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L4: 听音写词 — TTS then user types
  modes.L4_listenType = {
    name: 'L4 · 听音写词',
    description: '听单词发音,键入完整拼写',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L4 听音写词', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L4 听音写词', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var card = el('div', { className: 'quiz-card listen-card' }, [
          el('button', {
            className: 'big-speak-btn',
            text: '🔊 慢速播放',
            on: { click: function () { speak(w.word, { rate: 0.7 }); } }
          }),
          el('button', {
            className: 'big-speak-btn small',
            text: '🔊 常速',
            on: { click: function () { speak(w.word, { rate: 1.0 }); } }
          })
        ]);

        var input = el('input', {
          className: 'form-input spell-input',
          attrs: { type: 'text', placeholder: '请输入听到的单词...', autocomplete: 'off' }
        });
        var feedback = el('div', { className: 'spell-feedback' });

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'btn btn-primary', text: '提交 ✉',
            on: { click: function () { submit(); } }
          }),
          el('button', {
            className: 'btn btn-secondary', text: '听不清 🔁',
            on: { click: function () { speak(w.word, { rate: 0.85 }); } }
          })
        ]);

        function submit() {
          var userAns = input.value || '';
          var cmp = compareSpelling(userAns, w.word);
          var correct = cmp.ok;
          animateFeedback(card, correct);
          feedback.innerHTML = '';
          if (correct) {
            feedback.appendChild(el('div', { className: 'spell-feedback-ok', text:
              '✓ 拼写正确! ' + w.word + (w.translation ? ' — ' + w.translation : '') }));
          } else {
            feedback.appendChild(el('div', { className: 'spell-feedback-bad', text: '✗ 正确拼写:' }));
            feedback.appendChild(showLetterDiff(userAns, w.word));
            feedback.appendChild(el('div', { className: 'spell-feedback-meta', text:
              (w.definition || w.translation || '') }));
          }
          input.disabled = true;
          var timeMs = Date.now() - startTime;
          setTimeout(function () {
            callbacks.onAnswer({
              wordId: w.id, correct: correct, timeMs: timeMs,
              userAnswer: userAns, mode: 'L4'
            });
            next();
          }, correct ? 700 : 1700);
        }
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

        body.appendChild(card);
        body.appendChild(input);
        body.appendChild(feedback);
        body.appendChild(actions);
        setTimeout(function () {
          speak(w.word, { rate: 0.85 });
          input.focus();
        }, 200);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L4 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L5: 拼写强化 — show translation, letter-by-letter reveal
  modes.L5_spelling = {
    name: 'L5 · 拼写强化',
    description: '看中文口述拼写,逐字母闪烁跟读',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L5 拼写强化', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L5 拼写强化', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var card = el('div', { className: 'quiz-card recite-flash' }, [
          el('div', { className: 'recite-flash-translation', text: w.translation || '' }),
          el('div', { className: 'recite-flash-def', text: w.definition || '' }),
          el('div', { className: 'recite-flash-hint', text: '请在脑中默念每个字母,然后点"显示拼写"' })
        ]);

        var slots = el('div', { className: 'spell-slots' });
        var visible = false;
        function buildSlots() {
          slots.innerHTML = '';
          var letters = w.word.split('');
          letters.forEach(function (ch) {
            slots.appendChild(el('span', {
              className: 'spell-slot ' + (visible ? 'shown' : 'hidden-letter'),
              text: visible ? ch : '_'
            }));
          });
        }
        buildSlots();

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'btn btn-primary', text: '显示拼写 👁',
            on: { click: function () {
              visible = true;
              buildSlots();
              speak(w.word, { rate: 0.85 });
            } }
          }),
          el('button', {
            className: 'btn btn-secondary', text: '🔊 朗读',
            on: { click: function () { speak(w.word, { rate: 0.85 }); } }
          })
        ]);

        var rating = el('div', { className: 'recite-rate-row hidden' });
        ['again', 'hard', 'good', 'easy'].forEach(function (r) {
          var labels = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
          var colors = { again: 'again', hard: 'hard', good: 'good', easy: 'easy' };
          rating.appendChild(el('button', {
            className: 'rating-btn ' + colors[r],
            text: labels[r],
            on: { click: function () {
              var timeMs = Date.now() - startTime;
              var correct = (r === 'good' || r === 'easy');
              animateFeedback(card, correct);
              callbacks.onAnswer({
                wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: r, mode: 'L5'
              });
              setTimeout(next, 380);
            } }
          }));
        });
        // Show rating after reveal
        var origShow = actions.querySelector('.btn-primary');
        var origHandler = origShow.onclick;
        origShow.onclick = function (e) {
          origHandler(e);
          rating.classList.remove('hidden');
        };

        body.appendChild(card);
        body.appendChild(slots);
        body.appendChild(actions);
        body.appendChild(rating);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L5 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L6: 例句填空 — pick correct word for blank
  modes.L6_cloze = {
    name: 'L6 · 例句填空',
    description: '在例句空格中选出最恰当的单词',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L6 例句填空', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function makeCloze(w) {
        var ex = (w.examples && w.examples[0]) || (w.definition ? w.definition : w.word);
        var re = new RegExp(w.word, 'gi');
        if (re.test(ex)) return ex.replace(re, '_______');
        // Fallback: synthesize a sentence from translation
        return (w.translation || w.word) + ' is used as "_______" in context.';
      }

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L6 例句填空', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var cloze = makeCloze(w);
        var card = el('div', { className: 'quiz-card cloze-card' }, [
          el('div', { className: 'cloze-sentence', text: cloze }),
          el('div', { className: 'cloze-hint', text: '提示:' + (w.pos || '') + ' · ' + (w.translation || '').slice(0, 10) })
        ]);

        var distractors = pickDistractors(w, words, 3);
        var opts = shuffle([w].concat(distractors)).map(function (x) {
          return { value: x.id, label: x.word };
        });

        var grid = buildOptionsPanel(opts, function () {});
        var realBtns = grid.querySelectorAll('.quiz-option');
        realBtns.forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            speak(w.word, { rate: 0.9 });
            if (!correct) {
              card.appendChild(el('div', { className: 'cloze-explain', text:
                '✓ ' + w.word + ' — ' + (w.definition || w.translation) }));
            }
            setTimeout(function () {
              callbacks.onAnswer({
                wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: opts[i].label, mode: 'L6'
              });
              next();
            }, correct ? 700 : 1600);
          };
        });

        body.appendChild(card);
        body.appendChild(grid);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L6 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L7: 词族派生 — show root + family
  modes.L7_family = {
    name: 'L7 · 词族派生',
    description: '同一词根批量背诵派生词',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L7 词族派生', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L7 词族派生', idx, total));
        var w = words[idx];
        var startTime = Date.now();
        var family = (w.family || []).slice(0, 6);
        // Include the headword itself
        if (family.indexOf(w.word) === -1) family.unshift(w.word);

        var card = el('div', { className: 'quiz-card family-card' }, [
          el('div', { className: 'family-root', text: w.root || ('词根:' + w.word) }),
          el('div', { className: 'family-headword', text: w.word }),
          el('div', { className: 'family-translation', text: w.translation || '' }),
          el('div', { className: 'family-hint', text: '词族成员(点击展开):' }),
          el('div', { className: 'family-list' },
            family.map(function (f) {
              return el('div', { className: 'family-chip' }, [
                el('span', { className: 'family-chip-word', text: f }),
                el('button', {
                  className: 'family-chip-btn',
                  text: '🔊',
                  on: { click: function (e) { e.stopPropagation(); speak(f); } }
                })
              ]);
            })
          )
        ]);

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', { className: 'btn btn-primary', text: '下一个 →',
            on: { click: function () {
              var timeMs = Date.now() - startTime;
              callbacks.onAnswer({
                wordId: w.id, correct: true, timeMs: timeMs,
                userAnswer: 'viewed', mode: 'L7'
              });
              next();
            } } }),
          el('button', { className: 'btn btn-secondary', text: '🔊 朗读主词',
            on: { click: function () { speak(w.word); } } })
        ]);
        body.appendChild(card);
        body.appendChild(actions);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L7 全部 ' + total + ' 个词族</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L8: 配图记忆 — image + word
  modes.L8_image = {
    name: 'L8 · 配图记忆',
    description: '看图像回忆词义,形成双重编码',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L8 配图记忆', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L8 配图记忆', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var imageEmoji = w.image || '📘';
        var card = el('div', { className: 'quiz-card image-card' }, [
          el('div', { className: 'image-emoji', text: imageEmoji }),
          el('div', { className: 'image-hint', text: '根据图像,回忆对应单词' })
        ]);

        // Show 4 candidate words, user picks
        var distractors = pickDistractors(w, words, 3);
        var opts = shuffle([w].concat(distractors)).map(function (x) {
          return { value: x.id, label: x.word };
        });
        var grid = buildOptionsPanel(opts, function () {});
        var realBtns = grid.querySelectorAll('.quiz-option');
        realBtns.forEach(function (b, i) {
          b.onclick = function () {
            var correct = opts[i].value === w.id;
            markOption(grid, i, correct);
            animateFeedback(card, correct);
            var timeMs = Date.now() - startTime;
            if (correct) {
              card.appendChild(el('div', { className: 'image-explain', text:
                '✓ ' + w.word + ' — ' + (w.translation || '') }));
            }
            setTimeout(function () {
              callbacks.onAnswer({
                wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: opts[i].label, mode: 'L8'
              });
              next();
            }, correct ? 800 : 1500);
          };
        });

        body.appendChild(card);
        body.appendChild(grid);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L8 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L9: 关键词+联想图
  modes.L9_keyword = {
    name: 'L9 · 关键词+联想图',
    description: '通过关键词助记 + 思维导图固化难词',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L9 关键词联想', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L9 关键词联想', idx, total));
        var w = words[idx];
        var startTime = Date.now();

        var card = el('div', { className: 'quiz-card keyword-card' }, [
          el('div', { className: 'keyword-headword', text: w.word }),
          el('div', { className: 'keyword-phonetic', text: w.phonetic || '' }),
          el('div', { className: 'keyword-image', text: w.image || '🧠' }),
          el('div', { className: 'keyword-tip', text: '关键词助记' }),
          el('div', { className: 'keyword-tip-text', text: w.keyword || ('音近:' + w.word.slice(0, 3)) })
        ]);

        var net = el('div', { className: 'keyword-network' }, [
          el('div', { className: 'keyword-branch' }, [
            el('div', { className: 'keyword-branch-title', text: '🔵 词义' }),
            el('div', { className: 'keyword-branch-text', text: w.translation || '' })
          ]),
          el('div', { className: 'keyword-branch' }, [
            el('div', { className: 'keyword-branch-title', text: '🟢 同义' }),
            el('div', { className: 'keyword-branch-text',
              text: (w.synonyms && w.synonyms.length) ? w.synonyms.join('、') : '—' })
          ]),
          el('div', { className: 'keyword-branch' }, [
            el('div', { className: 'keyword-branch-title', text: '🔴 反义' }),
            el('div', { className: 'keyword-branch-text',
              text: (w.antonyms && w.antonyms.length) ? w.antonyms.join('、') : '—' })
          ]),
          el('div', { className: 'keyword-branch' }, [
            el('div', { className: 'keyword-branch-title', text: '🟡 例句' }),
            el('div', { className: 'keyword-branch-text',
              text: (w.examples && w.examples[0]) ? w.examples[0] : '—' })
          ])
        ]);

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', {
            className: 'rating-btn good', text: '✓ 已掌握',
            on: { click: function () { rate(true); } }
          }),
          el('button', {
            className: 'rating-btn again', text: '✗ 仍困难',
            on: { click: function () { rate(false); } }
          }),
          el('button', {
            className: 'btn btn-secondary', text: '🔊 朗读',
            on: { click: function () { speak(w.word); } }
          })
        ]);

        function rate(ok) {
          var timeMs = Date.now() - startTime;
          animateFeedback(card, ok);
          callbacks.onAnswer({
            wordId: w.id, correct: ok, timeMs: timeMs,
            userAnswer: ok ? 'mastered' : 'hard', mode: 'L9'
          });
          setTimeout(next, 380);
        }

        body.appendChild(card);
        body.appendChild(net);
        body.appendChild(actions);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L9 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L10: 跟读训练 — TTS then user shadow reads
  modes.L10_shadow = {
    name: 'L10 · 跟读训练',
    description: '听标准发音后跟读,反复模仿语调',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L10 跟读训练', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L10 跟读训练', idx, total));
        var w = words[idx];
        var startTime = Date.now();
        var phrase = (w.examples && w.examples[0]) || ('I will learn ' + w.word + '.');

        var card = el('div', { className: 'quiz-card shadow-card' }, [
          el('div', { className: 'shadow-headword', text: w.word }),
          el('div', { className: 'shadow-phonetic', text: w.phonetic || '' }),
          el('div', { className: 'shadow-phrase', text: '例句:' + phrase })
        ]);

        var actions = el('div', { className: 'recite-actions' }, [
          el('button', { className: 'btn btn-primary', text: '🔊 慢速',
            on: { click: function () { speak(phrase, { rate: 0.7 }); } } }),
          el('button', { className: 'btn btn-primary', text: '🔊 常速',
            on: { click: function () { speak(phrase, { rate: 1.0 }); } } }),
          el('button', { className: 'btn btn-secondary', text: '🎤 跟读(模拟)',
            on: { click: function () {
              toast('请大声朗读,模仿语调与节奏', 'info');
              speak(phrase, { rate: 0.95 });
            } } })
        ]);

        var rateRow = el('div', { className: 'recite-rate-row' }, [
          ['again', 'Again 不熟', 'again'],
          ['hard', 'Hard 跟得上', 'hard'],
          ['good', 'Good 流畅', 'good'],
          ['easy', 'Easy 完美', 'easy']
        ].map(function (r) {
          return el('button', {
            className: 'rating-btn ' + r[2], text: r[1],
            on: { click: function () {
              var timeMs = Date.now() - startTime;
              var correct = (r[0] === 'good' || r[0] === 'easy');
              animateFeedback(card, correct);
              callbacks.onAnswer({
                wordId: w.id, correct: correct, timeMs: timeMs,
                userAnswer: r[0], mode: 'L10'
              });
              setTimeout(next, 380);
            } }
          });
        }));

        body.appendChild(card);
        body.appendChild(actions);
        body.appendChild(rateRow);
        setTimeout(function () { speak(phrase, { rate: 0.85 }); }, 300);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L10 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L11: 场景例句 — 在场景中挖空选词
  modes.L11_sceneExample = {
    name: 'L11 · 场景例句',
    description: '在场景例句中识别正确的单词',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L11 场景例句', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function escapeReg(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      function pickScene(word, fallbackIdx) {
        var list = word.sceneExamples || [];
        if (list.length === 0) return null;
        return list[fallbackIdx % list.length] || list[0];
      }

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L11 场景例句', idx, total));
        var w = words[idx];
        var startTime = Date.now();
        var scene = pickScene(w, idx);

        var cardChildren = [];
        if (scene && scene.scene) {
          cardChildren.push(el('div', { className: 'scene-tag', text: '�� ' + scene.scene }));
        }
        if (scene && scene.en) {
          var masked = scene.en;
          if (w.word) {
            var re = new RegExp('\\b' + escapeReg(w.word) + '\\b', 'i');
            masked = scene.en.replace(re, '____');
            if (masked === scene.en && w.word.toLowerCase().length > 3) {
              masked = scene.en.replace(new RegExp(escapeReg(w.word), 'i'), '____');
            }
          }
          cardChildren.push(el('div', { className: 'scene-en', text: masked }));
        } else {
          cardChildren.push(el('div', { className: 'scene-en', text: '（暂无该词场景例句,继续下一题）' }));
        }
        if (scene && scene.zh) {
          cardChildren.push(el('div', { className: 'scene-zh', text: scene.zh }));
        }
        cardChildren.push(el('button', {
          className: 'btn btn-secondary scene-speak',
          text: '�� 朗读例句',
          on: { click: function () { if (scene && scene.en) speak(scene.en); } }
        }));

        var card = el('div', { className: 'quiz-card scene-card' }, cardChildren);

        var distractors = pickDistractors(w, words, 3);
        var opts = shuffle([w].concat(distractors)).map(function (x) {
          return { value: x.id, label: x.word };
        });
        opts.forEach(function (o, k) { o.__idx = k; });

        var grid = buildOptionsPanel(opts, function () {});
        var realBtns = grid.querySelectorAll('.quiz-option');
        realBtns.forEach(function (btn, i) {
          btn.onclick = function () {
            var ok = opts[i].value === w.id;
            markOption(grid, i, ok);
            animateFeedback(card, ok);
            var timeMs = Date.now() - startTime;
            if (ok) {
              speak(w.word, { rate: 0.9 });
            } else {
              card.appendChild(el('div', { className: 'listen-hint', text:
                '✓ 正确: ' + w.word + (w.phonetic ? ' ' + w.phonetic : '') +
                ' · ' + (w.translation || '') }));
            }
            setTimeout(function () {
              callbacks.onAnswer({
                wordId: w.id,
                correct: ok,
                timeMs: timeMs,
                userAnswer: opts[i].label,
                mode: 'L11'
              });
              next();
            }, ok ? 600 : 1500);
          };
        });

        body.appendChild(card);
        body.appendChild(grid);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">�� 已完成 L11 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // L12: 近义词辨识 — 看到单词,从候选词中选中意思最接近的
  modes.L12_synonym = {
    name: 'L12 · 近义词辨识',
    description: '看到单词,选出意思最接近的近义词',
    run: function (container, stage, words, callbacks) {
      container.innerHTML = '';
      var total = words.length;
      var idx = 0;
      var wrapper = el('div', { className: 'recite-runner' });
      var body = freshBody('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L12 近义词', total);
      wrapper.appendChild(body);
      container.appendChild(wrapper);

      function render() {
        body.innerHTML = '';
        body.appendChild(buildHeader('背诵 · ' + (Storage.STAGE_NAMES[stage] || stage), 'L12 近义词', idx, total));
        var w = words[idx];
        var startTime = Date.now();
        var syns = w.synonyms || [];

        if (syns.length === 0) {
          body.appendChild(el('div', { className: 'empty-msg', text:
            '「' + w.word + '」暂无近义词数据,跳过本题。' }));
          setTimeout(function () {
            callbacks.onAnswer({
              wordId: w.id,
              correct: false,
              timeMs: Date.now() - startTime,
              userAnswer: 'skip-empty',
              mode: 'L12'
            });
            next();
          }, 600);
          return;
        }

        var pick = syns[Math.floor(Math.random() * syns.length)];
        var distractors = pickDistractors(w, words, 3);
        var labels = shuffle([pick.word].concat(distractors.map(function (d) { return d.word; })));
        var opts = labels.map(function (lab) { return { value: lab, label: lab }; });
        opts.forEach(function (o, k) { o.__idx = k; });

        var card = el('div', { className: 'quiz-card synonym-card' }, [
          el('div', { className: 'syn-headword', text: w.word }),
          el('div', { className: 'syn-phonetic', text: w.phonetic || '' }),
          el('div', { className: 'syn-pos', text: w.pos || '' }),
          el('div', { className: 'syn-trans', text: w.translation || '' }),
          el('div', { className: 'syn-hint', text: '请选出意思最接近的近义词' })
        ]);

        var grid = buildOptionsPanel(opts, function () {});
        var realBtns = grid.querySelectorAll('.quiz-option');
        realBtns.forEach(function (btn, i) {
          btn.onclick = function () {
            var ok = opts[i].value === pick.word;
            markOption(grid, i, ok);
            animateFeedback(card, ok);
            var timeMs = Date.now() - startTime;
            if (ok) {
              speak(pick.word, { rate: 0.9 });
            } else {
              card.appendChild(el('div', { className: 'listen-hint', text:
                '✓ 近义: ' + pick.word + (pick.phonetic ? ' ' + pick.phonetic : '') +
                ' · ' + (pick.trans || '') }));
            }
            setTimeout(function () {
              callbacks.onAnswer({
                wordId: w.id,
                correct: ok,
                timeMs: timeMs,
                userAnswer: opts[i].label,
                mode: 'L12'
              });
              next();
            }, ok ? 600 : 1500);
          };
        });

        body.appendChild(card);


        body.appendChild(grid);
      }

      function next() {
        idx++;
        if (idx >= total) {
          body.innerHTML = '<div class="quiz-complete">🎉 已完成 L12 全部 ' + total + ' 个单词</div>';
          callbacks.onComplete();
          return;
        }
        render();
      }
      render();
    }
  };

  // Public API
  global.ReciteModes = modes;
})(window);
