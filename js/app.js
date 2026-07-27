/**
 * VocabMastery · Main Controller
 * - Initializes vocabulary (async, with fallback sample data)
 * - Manages hash routing (#/home, #/study, #/review, ...)
 * - Renders the home dashboard
 * - Handles stage switching from the topbar
 * - Wires the flashcard study flow
 */
(function (global) {
  'use strict';

  var APP_VERSION = '2.2.0';
  var ROUTES = ['home', 'pick', 'study', 'test', 'stats', 'history', 'lists', 'list', 'browse', 'word', 'session', 'review', 'palace', 'reading', 'feynman', 'collocations', 'recite', 'wrongbook'];
  // 主导航 tab (topbar 显示的精简入口)
  var PRIMARY_TABS = [
    { route: 'home',   title: '主页' },
    { route: 'pick',   title: '挑词' },
    { route: 'test',   title: '测试' },
    { route: 'stats',  title: '统计' }
  ];
  var ROUTE_TITLES = {
    home: '主页',
    pick: '挑词学习',
    lists: '词汇列表',
    list: '学习清单',
    browse: '浏览词表',
    word: '单词详情',
    session: '会话记录',
    study: '学习',
    review: '复习',
    palace: '记忆宫殿',
    reading: 'i+1 阅读',
    feynman: 'Feynman 复述',
    collocations: '搭配练习',
    recite: '背诵模式',
    test: '测试',
    wrongbook: '错题本',
    stats: '统计',
    history: '历史记录'
  };

  // Mode metadata for recite + test landing pages
  var RECITE_MODE_LIST = [
    { id: 'L1_viewEn',       name: 'L1 看英回忆',    desc: '看到英文,在脑中回忆中文释义' },
    { id: 'L2_viewZh',       name: 'L2 看义回忆',    desc: '看到中文,键入英文拼写' },
    { id: 'L3_listenChoose', name: 'L3 听音辨义',    desc: '听发音,4 选 1 中文释义' },
    { id: 'L4_listenType',   name: 'L4 听音写词',    desc: '听发音,键入完整拼写' },
    { id: 'L5_spelling',     name: 'L5 拼写强化',    desc: '看释义,逐字母跟读强化' },
    { id: 'L6_cloze',        name: 'L6 例句填空',    desc: '在例句挖空中选出最恰当词' },
    { id: 'L7_family',       name: 'L7 词族派生',    desc: '同根词批量背诵' },
    { id: 'L8_image',        name: 'L8 配图记忆',    desc: '图像+单词双重编码' },
    { id: 'L9_keyword',      name: 'L9 关键词联想',  desc: '助记词+思维导图固化' },
    { id: 'L10_shadow',      name: 'L10 跟读训练',   desc: '听 TTS 后跟读' },
    { id: 'L11_sceneExample', name: 'L11 场景例句',   desc: '在场景例句挖空中选词' },
    { id: 'L12_synonym',     name: 'L12 近义词辨识', desc: '从候选词中选近义词' }
  ];
  var TEST_MODE_LIST = [
    { id: 'T1_quiz',           name: 'T1 单元测验',     desc: '混合题型综合测验' },
    { id: 'T2_enToZh',         name: 'T2 看英选义',     desc: '英文 → 中文 4 选 1' },
    { id: 'T3_zhToEn',         name: 'T3 看义选英',     desc: '中文 → 英文 4 选 1' },
    { id: 'T4_listenChoose',   name: 'T4 听音辨义',     desc: '听发音 → 中文' },
    { id: 'T5_dictation',      name: 'T5 听写测试',     desc: '听发音输入拼写' },
    { id: 'T6_match',          name: 'T6 释义连线',     desc: '拖拽完成英文↔中文匹配' },
    { id: 'T7_cloze',          name: 'T7 完形填空',     desc: '短文挖空选词' },
    { id: 'T8_familyTest',     name: 'T8 词族测试',     desc: '派生词识别' },
    { id: 'T9_pronunciation',  name: 'T9 发音测评',     desc: '麦克风录音评分' },
    { id: 'T10_ieltsMock',     name: 'T10 综合模拟考',  desc: '70 题 / 45 分钟倒计时' }
  ];

  // Per-test mode default count
  var TEST_DEFAULT_COUNT = {
    T1_quiz: 20, T2_enToZh: 20, T3_zhToEn: 20, T4_listenChoose: 20,
    T5_dictation: 20, T6_match: 10, T7_cloze: 15, T8_familyTest: 15,
    T9_pronunciation: 10, T10_ieltsMock: 70
  };

  // ---------- Sample fallback data ----------
  var SAMPLE_DATA = [
    { id: 1, word: "apple", phonetic: "/ˈæpl/", pos: "n.", translation: "苹果",
      definition: "a round fruit with red, green, or yellow skin",
      examples: ["I eat an apple every day."],
      topic: "food", grade: "chuyi-shang", frequency: 5000, difficulty: 1 },
    { id: 2, word: "banana", phonetic: "/bəˈnænə/", pos: "n.", translation: "香蕉",
      definition: "a long curved fruit",
      examples: ["Monkeys love bananas."],
      topic: "food", grade: "chuyi-shang", frequency: 4500, difficulty: 1 },
    { id: 3, word: "orange", phonetic: "/ˈɒrɪndʒ/", pos: "n.", translation: "橙子",
      definition: "a round orange citrus fruit",
      examples: ["Orange juice is refreshing."],
      topic: "food", grade: "chuyi-shang", frequency: 4200, difficulty: 1 },
    { id: 4, word: "grape", phonetic: "/ɡreɪp/", pos: "n.", translation: "葡萄",
      definition: "a small green or purple fruit",
      examples: ["Wine is made from grapes."],
      topic: "food", grade: "chuyi-shang", frequency: 3800, difficulty: 1 },
    { id: 5, word: "study", phonetic: "/ˈstʌdi/", pos: "v./n.", translation: "学习;研究",
      definition: "to learn about something by reading, memorizing facts",
      examples: ["She studies English every evening."],
      topic: "education", grade: "chuyi-shang", frequency: 7000, difficulty: 1 }
  ];

  var state = {
    currentStage: 'gaoyi-shang',
    currentRoute: 'home',
    loading: false,
    studyQueue: [],
    studyIndex: 0,
    studyFlipped: false,
    studyStartTime: 0,
    statsRange: '30',
    statsGrade: 'all',
    browserGrade: 'all',
    browserRange: { from: 1, to: 100 },
    browserQuery: ''
  };

  // ---------- Vocabulary loading ----------
  function buildSampleVocab(stage) {
    return {
      stage: stage,
      name: Storage.STAGE_NAMES[stage] || stage,
      words: SAMPLE_DATA.map(function (w) { return Object.assign({}, w); }),
      isSample: true,
      loadedAt: new Date().toISOString()
    };
  }

  async function loadStage(stage) {
    state.loading = true;
    try {
      // Try cached vocab first
      var cached = Storage.getVocab(stage);
      if (cached && cached.words && cached.words.length > 0) {
        return cached;
      }
      // Try fetching from data/<stage>.json
      var response = await fetch('data/' + stage + '.json');
      if (response.ok) {
        var data = await response.json();
        if (data && data.words && data.words.length > 0) {
          var vocab = {
            stage: stage,
            name: data.name || Storage.STAGE_NAMES[stage],
            words: data.words,
            loadedAt: new Date().toISOString()
          };
          Storage.saveVocab(stage, vocab);
          return vocab;
        }
      }
      // Fallback to sample
      console.info('[App] Using sample fallback data for stage:', stage);
      var sample = buildSampleVocab(stage);
      Storage.saveVocab(stage, sample);
      return sample;
    } catch (err) {
      console.warn('[App] Fetch failed for stage', stage, err);
      var fallback = buildSampleVocab(stage);
      Storage.saveVocab(stage, fallback);
      return fallback;
    } finally {
      state.loading = false;
    }
  }

  async function switchStage(stage) {
    if (!Storage.STAGES.includes(stage)) return;
    state.currentStage = stage;
    Storage.setCurrentStage(stage);
    await loadStage(stage);
    renderTopbar();
    renderCurrentView();
  }

  // ---------- Routing ----------
  function parseRoute() {
    var hash = window.location.hash || '#/home';
    var raw = hash.replace(/^#\//, '').split('/')[0] || 'home';
    return ROUTES.includes(raw) ? raw : 'home';
  }

  function parseRouteParams() {
    var hash = window.location.hash || '#/home';
    var parts = hash.replace(/^#\//, '').split('/');
    return { route: parts[0] || 'home', params: parts.slice(1) };
  }

  function navigate(route, params) {
    var hash = '#/' + route;
    if (params && params.length) hash += '/' + params.join('/');
    if (window.location.hash === hash) {
      // hash 没变,不会触发 hashchange,手动重渲染当前视图
      onHashChange();
      return;
    }
    window.location.hash = hash;
  }

  function onHashChange() {
    state.currentRoute = parseRoute();
    renderTopbar();
    renderCurrentView();
  }

  // ---------- Rendering ----------
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

  function renderTopbar() {
    var tabsEl = document.getElementById('tabs');
    var stageSel = document.getElementById('stage-select');
    if (!tabsEl || !stageSel) return;

    // Rebuild tabs (only main 4)
    tabsEl.innerHTML = '';
    PRIMARY_TABS.forEach(function (tab) {
      var r = tab.route;
      var t = el('button', {
        className: 'tab' + (state.currentRoute === r ? ' active' : ''),
        text: tab.title,
        on: { click: function () { navigate(r); } }
      });
      tabsEl.appendChild(t);
    });

    // 退出按钮 + 状态显示
    var old = document.getElementById('topbar-logout');
    if (old) old.remove();
    var topbarEl = document.querySelector('.topbar');
    if (topbarEl) {
      var userBtn = el('button', {
        id: 'topbar-logout',
        className: 'btn btn-ghost btn-sm topbar-logout',
        title: '退出登录(清除本地保存的密码)',
        text: '🚪 退出',
        on: { click: function () {
          if (!confirm('确认退出登录?(本设备的「记住密码」也会被清除)')) return;
          doLogout();
        } }
      });
      topbarEl.appendChild(userBtn);
    }

    // Rebuild stage select
    stageSel.innerHTML = '';
    Storage.STAGES.forEach(function (s) {
      var opt = el('option', { text: Storage.STAGE_NAMES[s] });
      opt.value = s;
      if (s === state.currentStage) opt.selected = true;
      stageSel.appendChild(opt);
    });
  }

  function doLogout() {
    Auth.logout().then(function () {
      state.pickSelected = [];
      window.location.hash = '#/login';
      window.location.reload();
    });
  }

  function renderCurrentView() {
    var container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '';
    var route = state.currentRoute;
    function safeRender(name, fn) {
      try {
        container.appendChild(fn());
      } catch (err) {
        console.error('[App] render failed for', name, err);
        container.appendChild(renderPlaceholder(
          '加载失败', '⚠️', '视图 ' + name + ' 尚未实现或发生错误。'));
      }
    }
    if (route === 'home') {
      safeRender('home', renderHome);
    } else if (route === 'study') {
      safeRender('study', renderStudyHub);
    } else if (route === 'test') {
      safeRender('test', renderTestHub);
    } else if (route === 'history') {
      var p = parseRouteParams();
      if (p.params[0]) {
        safeRender('history-detail', function () {
          return renderHistoryDetail(p.params[0]);
        });
      } else {
        safeRender('history', renderHistory);
      }
    } else if (route === 'pick') {
      safeRender('pick', renderPick);
    } else if (route === 'lists') {
      safeRender('lists', renderLists);
    } else if (route === 'list') {
      safeRender('list', renderListDetail);
    } else if (route === 'browse') {
      safeRender('browse', function () {
        return window.WordBrowser && window.WordBrowser.renderListView
          ? window.WordBrowser.renderListView(state.currentStage)
          : renderPlaceholder('词汇浏览', '📚', '词汇模块加载中…');
      });
    } else if (route === 'word') {
      safeRender('word', renderWordDetail);
    } else if (route === 'session') {
      safeRender('session', renderSessionDetail);
    } else if (route === 'review') {
      safeRender('review', renderReview);
    } else if (route === 'palace') {
      safeRender('palace', typeof renderPalace === 'function' ? renderPalace :
        function () { return renderPlaceholder('记忆宫殿', '🏛️', '即将上线,敬请期待。'); });
    } else if (route === 'reading') {
      safeRender('reading', typeof renderReading === 'function' ? renderReading :
        function () { return renderPlaceholder('i+1 阅读', '📖', '即将上线,敬请期待。'); });
    } else if (route === 'feynman') {
      safeRender('feynman', typeof renderFeynman === 'function' ? renderFeynman :
        function () { return renderPlaceholder('Feynman 复述', '🎤', '即将上线,敬请期待。'); });
    } else if (route === 'collocations') {
      safeRender('collocations', typeof renderCollocations === 'function' ? renderCollocations :
        function () { return renderPlaceholder('搭配练习', '🧩', '即将上线,敬请期待。'); });
    } else if (route === 'recite') {
      safeRender('recite', renderReciteLanding);
    } else if (route === 'wrongbook') {
      safeRender('wrongbook', renderWrongBook);
    } else if (route === 'stats') {
      safeRender('stats', renderStats);
    } else {
      container.appendChild(renderPlaceholder('未找到', '🧭', '页面不存在。'));
    }
  }

  // ---------- Home view ----------
  function renderHome() {
    var stage = state.currentStage;
    var stats = Storage.getStats(stage, '30');
    var vocab = Storage.getVocab(stage);
    var totalWords = vocab && vocab.words ? vocab.words.length : 0;
    var isSample = vocab && vocab.isSample;
    var progressPct = totalWords > 0 ? Math.round(stats.learnedCount / totalWords * 100) : 0;

    var wrapper = el('div', { className: 'home-view' });

    // HERO
    var hero = el('div', { className: 'hero' });
    var heroMain = el('div', { className: 'hero-main' }, [
      el('div', { className: 'hero-greeting', text: '欢迎回来 👋' }),
      el('h1', { className: 'hero-title', html:
        '今天,<span class="grad">' + (stats.dueCount > 0 ? stats.dueCount : 0) +
        ' 个单词</span> 在等你复习。' }),
      el('p', { className: 'hero-sub', text:
        '当前词库:' + Storage.STAGE_NAMES[stage] + ' · 总词数 ' + totalWords +
        (isSample ? ' (示例数据)' : '') }),
      el('div', { className: 'hero-actions' }, [
        el('button', {
          className: 'btn btn-primary btn-lg',
          text: '📚 挑词 → 创建清单',
          on: { click: function () { navigate('pick'); } }
        }),
        el('button', {
          className: 'btn btn-secondary btn-lg',
          text: '🔁 快速复习 (' + stats.dueCount + ')',
          on: { click: function () { startStudy(true); } }
        }),
        el('div', { className: 'hero-actions-sub' }, [
          el('button', {
            className: 'btn btn-ghost btn-sm',
            text: '✅ 测试中枢',
            on: { click: function () { navigate('test'); } }
          }),
          el('button', {
            className: 'btn btn-ghost btn-sm',
            text: '🏛️ 学习中枢',
            on: { click: function () { navigate('study'); } }
          })
        ])
      ])
    ]);
    var ringCard = el('div', { className: 'card ring-card' }, [
      el('div', { className: 'card-title', text: '总体进度' }),
      buildProgressRing(progressPct)
    ]);
    hero.appendChild(heroMain);
    hero.appendChild(ringCard);
    wrapper.appendChild(hero);

    // STAT GRID
    var grid = el('div', { className: 'stat-grid' }, [
      buildStatCard('今日待复习', stats.dueCount, '词'),
      buildStatCard('今日新学', stats.newCount > 20 ? 20 : stats.newCount, '词'),
      buildStatCard('连续打卡', stats.streak, '天'),
      buildStatCard('已学单词', stats.learnedCount, '/' + totalWords),
      buildStatCard('已掌握', stats.masteredCount, '词'),
      buildStatCard('整体正确率', Math.round(stats.accuracy * 100), '%')
    ]);
    wrapper.appendChild(grid);

    // QUICK ACTIONS
    var section = el('div', { className: 'section' }, [
      el('div', { className: 'section-title', html: '快速操作 <small>一键直达</small>' }),
      el('div', { className: 'stat-grid' }, [
        buildActionCard('📋', '我的学习清单', '查看 / 进入 / 复习自定义词集', function () { navigate('lists'); }),
        buildActionCard('🏛️', '学习中枢', '高级模块 · 记忆宫殿 / 阅读 / 复述', function () { navigate('study'); }),
        buildActionCard('📜', '历史记录', '查看所有测验/背诵记录', function () { navigate('history'); }),
        buildActionCard('📕', '错题本', '查错/清空/重练', function () { navigate('wrongbook'); }),
        buildActionCard('🔄', '重置词库缓存', '看到旧的 5 词?点此清空', function () {
          if (!confirm('确认清空所有词库缓存?将重新从服务器加载。')) return;
          var keys = Object.keys(localStorage);
          var removed = 0;
          keys.forEach(function (k) {
            if (k.indexOf('vm_vocab_') === 0 || k === 'vm_currentStage' || k === 'vm_stage') {
              localStorage.removeItem(k);
              removed++;
            }
          });
          toast('已清空 ' + removed + ' 项词库缓存,刷新中...', 'success');
          setTimeout(function () { window.location.reload(); }, 800);
        }),
        buildActionCard('⚙️', '数据管理', '导入 / 导出 / 备份', function () { openDataModal(); })
      ])
    ]);
    wrapper.appendChild(section);

    // 历史摘要
    if (window.HistoryView) {
      var summary = HistoryView.renderSummaryBox({ stage: state.currentStage });
      if (summary) wrapper.appendChild(summary);
    }

    return wrapper;
  }

  function buildStatCard(label, value, suffix) {
    return el('div', { className: 'stat-card' }, [
      el('div', { className: 'label', text: label }),
      el('div', { className: 'value', text: String(value) }),
      suffix ? el('span', { className: 'text-muted', text: ' ' + suffix }) : null
    ]);
  }

  function buildActionCard(emoji, title, desc, onClick) {
    var card = el('div', {
      className: 'stat-card',
      style: 'cursor: pointer;',
      on: { click: onClick }
    }, [
      el('div', { style: 'font-size: 28px; margin-bottom: 8px;', text: emoji }),
      el('div', { style: 'font-weight: 700; font-size: 16px;', text: title }),
      el('div', { className: 'text-muted', style: 'font-size: 13px; margin-top: 4px;', text: desc })
    ]);
    return card;
  }

  function buildProgressRing(percent) {
    var radius = 70;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (percent / 100) * circumference;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '180');
    svg.setAttribute('height', '180');
    svg.setAttribute('viewBox', '0 0 180 180');
    var defs = document.createElementNS(svgNS, 'defs');
    var grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'ringGrad');
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '100%');
    var s1 = document.createElementNS(svgNS, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', '#6c5ce7');
    var s2 = document.createElementNS(svgNS, 'stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', '#00b894');
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    var bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('cx', '90'); bg.setAttribute('cy', '90');
    bg.setAttribute('r', String(radius));
    bg.setAttribute('class', 'ring-bg');
    bg.setAttribute('stroke-width', '12');
    bg.setAttribute('fill', 'none');
    svg.appendChild(bg);

    var fg = document.createElementNS(svgNS, 'circle');
    fg.setAttribute('cx', '90'); fg.setAttribute('cy', '90');
    fg.setAttribute('r', String(radius));
    fg.setAttribute('class', 'ring-fg');
    fg.setAttribute('stroke-width', '12');
    fg.setAttribute('fill', 'none');
    fg.setAttribute('stroke-dasharray', String(circumference));
    fg.setAttribute('stroke-dashoffset', String(offset));
    fg.setAttribute('stroke-linecap', 'round');
    svg.appendChild(fg);

    var wrap = el('div', { className: 'ring-wrap' }, [
      svg,
      el('div', { className: 'ring-label' }, [
        el('div', { className: 'ring-percent', text: percent + '%' }),
        el('div', { className: 'ring-cap', text: '已学 / 总词数' })
      ])
    ]);
    return wrap;
  }

  // ---------- Study view ----------
  function renderStudy() {
    var wrapper = el('div', { className: 'study-view' });
    if (state.studyQueue.length === 0) {
      wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '🌱' }),
        el('h2', { text: '今天没有需要学习的单词' }),
        el('p', { text: '切换词库或回到主页开始一轮新的学习吧。' }),
        el('button', {
          className: 'btn btn-primary',
          text: '回到主页',
          on: { click: function () { navigate('home'); } }
        })
      ]));
      return wrapper;
    }
    return renderFlashcard(wrapper);
  }

  function renderReview() {
    var wrapper = el('div', { className: 'review-view' });
    wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
      el('div', { className: 'emoji', text: '🔁' }),
      el('h2', { text: '复习模块' }),
      el('p', { text: '基于 SM-2 算法,按 dueDate 自动调度到期卡片。点击下方按钮开始复习。' }),
      el('button', {
        className: 'btn btn-primary btn-lg',
        text: '开始复习',
        on: { click: function () { startStudy(true); } }
      })
    ]));
    return wrapper;
  }

  function renderFlashcard(wrapper) {
    var word = state.studyQueue[state.studyIndex];
    if (!word) {
      wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '🎉' }),
        el('h2', { text: '已完成本轮!' }),
        el('p', { text: '干得漂亮,所有单词都已更新 SRS 状态。' }),
        el('button', {
          className: 'btn btn-primary',
          text: '回到主页',
          on: { click: function () {
            state.studyQueue = [];
            state.studyIndex = 0;
            navigate('home');
          } }
        })
      ]));
      return wrapper;
    }

    var existing = Storage.getCard(state.currentStage, word.id);
    var previewAgain = SRS.previewNext(existing, 'again');
    var previewHard = SRS.previewNext(existing, 'hard');
    var previewGood = SRS.previewNext(existing, 'good');
    var previewEasy = SRS.previewNext(existing, 'easy');

    var flash = el('div', { className: 'flash-stage' }, [
      el('div', { className: 'text-muted', text:
        '进度 ' + (state.studyIndex + 1) + ' / ' + state.studyQueue.length +
        ' · 当前词库:' + Storage.STAGE_NAMES[state.currentStage] })
    ]);

    var flashCard = el('div', {
      className: 'flash-card' + (state.studyFlipped ? ' flipped' : ''),
      on: { click: function () {
        state.studyFlipped = !state.studyFlipped;
        renderCurrentView();
      } }
    });
    var inner = el('div', { className: 'flash-inner' }, [
      el('div', { className: 'flash-face front' }, [
        el('div', { className: 'flash-word', text: word.word }),
        el('div', { className: 'flash-phonetic', text: word.phonetic || '' }),
        el('div', { className: 'flash-meta', text: word.pos || '' }),
        el('div', { className: 'flash-meta', text: '👆 点击卡片查看释义' })
      ]),
      el('div', { className: 'flash-face back' }, [
        el('div', { className: 'flash-translation', text: word.translation || '' }),
        el('div', { className: 'flash-meta', text: word.definition || '' }),
        el('div', { className: 'flash-meta', text: word.examples && word.examples[0] ? '例:' + word.examples[0] : '' })
      ])
    ]);
    flashCard.appendChild(inner);
    flash.appendChild(flashCard);

    if (state.studyFlipped) {
      var rating = el('div', { className: 'rating-row' }, [
        buildRatingBtn('again', 'Again', previewAgain.interval + 'd', false),
        buildRatingBtn('hard', 'Hard', previewHard.interval + 'd', false),
        buildRatingBtn('good', 'Good', previewGood.interval + 'd', true),
        buildRatingBtn('easy', 'Easy', previewEasy.interval + 'd', true)
      ]);
      flash.appendChild(rating);
    }

    wrapper.appendChild(flash);
    return wrapper;
  }

  function buildRatingBtn(rating, label, preview, enabled) {
    return el('button', {
      className: 'rating-btn ' + rating + (enabled ? '' : ' disabled'),
      on: { click: function (e) {
        e.stopPropagation();
        if (!state.studyFlipped) return;
        answerCard(rating);
      } }
    }, [
      el('span', { text: label }),
      el('span', { className: 'preview', text: preview })
    ]);
  }

  function answerCard(rating) {
    var word = state.studyQueue[state.studyIndex];
    if (!word) return;
    var existing = Storage.getCard(state.currentStage, word.id);
    var timeMs = state.studyStartTime ? Date.now() - state.studyStartTime : 0;
    var next = SRS.review(existing, rating, { timeMs: timeMs });
    Storage.updateCard(state.currentStage, word.id, next);

    if (rating === 'again') {
      Storage.addWrong(state.currentStage, word.id);
    }

    Storage.logAttempt({
      stage: state.currentStage,
      wordId: word.id,
      mode: 'study',
      rating: rating,
      correct: rating !== 'again',
      timeMs: timeMs,
      timestamp: Date.now()
    });

    Storage.bumpStreak(state.currentStage);

    state.studyIndex += 1;
    state.studyFlipped = false;
    state.studyStartTime = Date.now();
    renderCurrentView();
  }

  function startStudy(reviewOnly) {
    var stage = state.currentStage;
    var vocab = Storage.getVocab(stage);
    if (!vocab || !vocab.words || vocab.words.length === 0) {
      toast('当前词库暂无单词', 'error');
      return;
    }
    if (reviewOnly) {
      var dueIds = Storage.getDueCards(stage);
      var dueWords = vocab.words.filter(function (w) { return dueIds.indexOf(w.id) >= 0; });
      if (dueWords.length === 0) {
        toast('今日没有需要复习的单词', 'info');
        return;
      }
      state.studyQueue = dueWords.slice(0, 20);
    } else {
      var newWords = Storage.getNewCards(stage).slice(0, 10);
      var dueIds2 = Storage.getDueCards(stage);
      var dueWords2 = vocab.words.filter(function (w) { return dueIds2.indexOf(w.id) >= 0; }).slice(0, 10);
      state.studyQueue = newWords.concat(dueWords2);
      if (state.studyQueue.length === 0) {
        toast('本词库已学完所有单词', 'success');
        return;
      }
    }
    state.studyIndex = 0;
    state.studyFlipped = false;
    state.studyStartTime = Date.now();
    navigate('study');
  }

  // ---------- Placeholder / stats ----------
  function renderPlaceholder(title, emoji, desc) {
    return el('div', { className: 'view-placeholder' }, [
      el('div', { className: 'emoji', text: emoji }),
      el('h2', { text: title }),
      el('p', { text: desc })
    ]);
  }

  // ---------- New routes: lists / list / word / session ----------
  function renderLists() {
    if (!window.StudyListsView) return renderPlaceholder('清单模块加载中', '⏳', '');
    return StudyListsView.renderListsOverview();
  }

  function renderListDetail() {
    var p = parseRouteParams();
    var listId = p.params[0];
    if (!window.StudyListsView) return renderPlaceholder('清单模块加载中', '⏳', '');
    return StudyListsView.renderListDetail(listId);
  }

  function renderWordDetail() {
    var p = parseRouteParams();
    var stage = p.params[0] || state.currentStage;
    var wid = parseInt(p.params[1], 10);
    if (!window.WordBrowser) return renderPlaceholder('词汇模块加载中', '⏳', '');
    return WordBrowser.renderDetailView(stage, wid);
  }

  function renderSessionDetail() {
    var p = parseRouteParams();
    var sid = p.params[0];
    if (!window.StudyListsView) return renderPlaceholder('记录模块加载中', '⏳', '');
    return StudyListsView.renderSessionDetail(sid);
  }

  // ---------- Recite + Test landing + execution ----------
  function getStageWords() {
    var vocab = Storage.getVocab(state.currentStage);
    return (vocab && vocab.words) ? vocab.words : [];
  }

  function pickWordsByRange(allWords, fromIdx, toIdx) {
    var s = Math.max(0, (fromIdx || 1) - 1);
    var e = Math.min(allWords.length, toIdx || allWords.length);
    return allWords.slice(s, e);
  }

  function renderReciteLanding() {
    var all = getStageWords();
    var wrapper = el('div', { className: 'recite-view' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 学习中枢',
        on: { click: function () { navigate('study'); } } }),
      el('h2', { text: '📚 背诵模式 · L1–L10' }),
      el('span', { className: 'small', text: '当前词库:' + (Storage.STAGE_NAMES[state.currentStage] || '') +
        ' · ' + all.length + ' 词' })
    ]));

    // Range bar
    var range = state.reciteRange || { from: 1, to: Math.min(20, all.length || 20), count: Math.min(20, all.length || 20) };
    var rangeBar = buildRangeBar(all.length, range, function (r) {
      state.reciteRange = r;
      renderCurrentView();
    });
    wrapper.appendChild(rangeBar);

    // Mode grid
    var grid = el('div', { className: 'mode-grid' });
    RECITE_MODE_LIST.forEach(function (m) {
      var mode = (window.ReciteModes || {})[m.id];
      grid.appendChild(el('div', {
        className: 'mode-card',
        on: { click: function () { startReciteMode(m.id); } }
      }, [
        el('div', { className: 'mode-id', text: m.id.split('_')[0] }),
        el('div', { className: 'mode-title', text: m.name }),
        el('div', { className: 'mode-desc', text: m.desc }),
        el('div', { className: 'mode-action', text: mode ? '进入模式 →' : '未实现' })
      ]));
    });
    wrapper.appendChild(grid);
    return wrapper;
  }

  // ============================================================
  // ============== 挑词学习 (Pick to Learn) ====================
  // ============================================================
  // 直接呈现词表,支持多选 + 已选计数 + 一键开始学习/加入清单。
  function renderPick() {
    var stage = state.currentStage;
    state.pickGrade = state.pickGrade || 'all';
    state.pickSelected = state.pickSelected || [];

    var grades = (window.WordBrowser && WordBrowser.getStageGrades)
      ? WordBrowser.getStageGrades(stage)
      : [{ value: 'all', label: '全部' }];
    var allWords = getStageWords();
    var gradeWords = state.pickGrade === 'all' ? allWords : allWords.filter(function (w) { return w.grade === state.pickGrade; });
    var selectedSet = new Set(state.pickSelected);

    var wrapper = el('div', { className: 'pick-view' });

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { state.pickSelected = []; navigate('home'); } } }),
      el('h2', { text: '📚 挑词' }),
      el('span', { className: 'small text-muted',
        text: gradeWords.length + ' 词' })
    ]));

    var filterRow = el('div', { className: 'pick-filter-row' });
    var gradeSel = el('select', {
      className: 'form-input',
      on: { change: function (e) {
        state.pickGrade = e.target.value;
        state.pickSelected = [];
        rerender();
      } }
    });
    grades.forEach(function (g) {
      var opt = el('option', { text: g.label });
      opt.value = g.value;
      if (g.value === state.pickGrade) opt.selected = true;
      gradeSel.appendChild(opt);
    });
    filterRow.appendChild(gradeSel);
    filterRow.appendChild(el('button', {
      className: 'btn btn-ghost btn-sm', text: '清空选择',
      on: { click: function () {
        state.pickSelected = [];
        selectedSet.clear();
        updateBar();
        renderList();
      } }
    }));
    wrapper.appendChild(filterRow);

    var listContainer = el('div', { className: 'pick-list-container' });
    wrapper.appendChild(listContainer);

    function renderList() {
      listContainer.innerHTML = '';
      if (gradeWords.length === 0) {
        listContainer.appendChild(el('div', { className: 'view-placeholder' }, [
          el('div', { className: 'emoji', text: '📭' }),
          el('h2', { text: '该学期没有单词' }),
          el('p', { text: '试试切换学期' })
        ]));
        return;
      }
      gradeWords.forEach(function (w, idx) {
        var checked = selectedSet.has(w.id);
        var row = el('label', { className: 'pick-row' + (checked ? ' selected' : '') }, [
          el('input', {
            attrs: { type: 'checkbox' },
            on: {
              change: function (e) {
                if (e.target.checked) {
                  if (!selectedSet.has(w.id)) state.pickSelected.push(w.id);
                  selectedSet.add(w.id);
                } else {
                  state.pickSelected = state.pickSelected.filter(function (x) { return x !== w.id; });
                  selectedSet.delete(w.id);
                }
                row.classList.toggle('selected', selectedSet.has(w.id));
                updateBar();
              }
            }
          }),
          el('div', { className: 'pick-row-main' }, [
            el('div', { className: 'pick-row-word' }, [
              el('span', { className: 'pick-row-idx', text: String(idx + 1) }),
              el('span', { text: w.word || '' }),
              w.pos ? el('span', { className: 'pick-row-pos', text: w.pos }) : null
            ]),
            el('div', { className: 'pick-row-trans', text: w.translation || '' })
          ]),
          el('div', { className: 'pick-row-check' }, [
            checked ? el('span', { className: 'pick-check-icon', text: '✓' }) : null
          ])
        ]);
        if (checked) row.querySelector('input[type=checkbox]').checked = true;
        listContainer.appendChild(row);
      });
    }
    renderList();

    var stepBar = el('div', { className: 'pick-action-bar' });
    wrapper.appendChild(stepBar);

    function updateBar() {
      stepBar.innerHTML = '';
      var n = state.pickSelected.length;
      if (n === 0) {
        stepBar.appendChild(el('div', { className: 'pick-empty-hint' }, [
          el('div', { className: 'pick-empty-icon', text: '👆' }),
          el('p', { text: '勾选你想学的单词,创建学习清单' })
        ]));
        return;
      }
      stepBar.appendChild(el('div', { className: 'pick-action-row' }, [
        el('button', {
          className: 'btn btn-primary btn-lg',
          text: '📋 创建学习清单 (' + n + '词)',
          on: { click: function () { createListFromPick(); } }
        })
      ]));
    }

    function rerender() {
      var container = wrapper.parentNode;
      if (!container) return;
      container.innerHTML = '';
      container.appendChild(renderPick());
    }

    updateBar();
    return wrapper;
  }

  // 自动生成清单名: 学期名 + 年月日 + 时间,如 "高一上学期 2026-07-27 14:30"
  function buildAutoListName(stage) {
    var stageName = (Storage.STAGE_NAMES && Storage.STAGE_NAMES[stage]) || stage || '默认';
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var stamp =
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    return stageName + ' ' + stamp;
  }

  // 已选词 → 一键按格式建清单 → 进清单详情页 (学习/考试/单词/趋势 都在那里)
  function createListFromPick() {
    var ids = (state.pickSelected || []).slice();
    if (ids.length === 0) {
      toast('请先勾选单词', 'error');
      return;
    }
    var name = buildAutoListName(state.currentStage);
    var list = StudyLists.createList({
      name: name, stage: state.currentStage, wordIds: ids
    });
    state.pickSelected = [];
    navigate('list/' + list.id);
    toast('已创建「' + list.name + '」', 'success');
  }

  // ============================================================
  // ============== 学习中枢 (Study Hub) ========================
  // ============================================================
  function renderStudyHub() {
    var stage = state.currentStage;
    var all = getStageWords();
    var stats = Storage.getStats(stage, '30');
    var lists = (window.StudyLists) ? StudyLists.getAllLists().filter(function (l) { return l.stage === stage; }) : [];

    var wrapper = el('div', { className: 'study-hub-view' });

    // HERO
    var dueCount = stats.dueCount || 0;
    var newCount = (stats.newCount > 20 ? 20 : stats.newCount) || 0;
    var heroMsg = dueCount > 0
      ? '今天还有 <span class="grad">' + dueCount + '</span> 个单词待复习'
      : (newCount > 0
        ? '准备好开始 <span class="grad">' + newCount + '</span> 个新单词了吗?'
        : '当前词库已学完所有新单词,坚持复习吧 ✨');

    var hero = el('div', { className: 'hero' });
    var heroMain = el('div', { className: 'hero-main' }, [
      el('div', { className: 'hero-greeting', text: '📚 学习中枢' }),
      el('h1', { className: 'hero-title', html: heroMsg }),
      el('p', { className: 'hero-sub', text:
        '当前词库:' + Storage.STAGE_NAMES[stage] + ' · 总词数 ' + all.length })
    ]);
    var ringCard = el('div', { className: 'card ring-card' }, [
      el('div', { className: 'card-title', text: '今日学习' }),
      el('div', { className: 'study-quick-grid' }, [
        buildStatCard('待复习', dueCount, '词'),
        buildStatCard('今日新学', newCount, '词'),
        buildStatCard('连续打卡', stats.streak, '天')
      ])
    ]);
    hero.appendChild(heroMain);
    hero.appendChild(ringCard);
    wrapper.appendChild(hero);

    // 快速开始
    var quick = el('div', { className: 'section' }, [
      el('div', { className: 'section-title', html: '快速开始 <small>SM-2 自动调度</small>' }),
      el('div', { className: 'stat-grid' }, [
        buildActionCard('🔁', '开始复习', '基于到期卡片 · ' + dueCount + ' 词', function () { startStudy(true); }),
        buildActionCard('🌱', '学习新词', '新词 + 待复习 · ' + newCount + '+ 词', function () { startStudy(false); }),
        buildActionCard('📚', '浏览词表', '查看/筛选/加入清单', function () { navigate('browse'); }),
        buildActionCard('📥', '背诵模式 L1–L10', '主动回忆 · 多模式', function () { navigate('recite'); })
      ])
    ]);
    wrapper.appendChild(quick);

    // 学习清单
    var listsSec = el('div', { className: 'section' }, [
      el('div', { className: 'section-title' }, [
        document.createTextNode('我的学习清单 '),
        el('small', { className: 'text-muted', text: '共 ' + lists.length + ' 个' }),
        el('span', { className: 'ml-auto' }, [
          el('button', { className: 'btn btn-secondary btn-sm', text: '查看全部 →',
            on: { click: function () { navigate('lists'); } } })
        ])
      ])
    ]);
    if (lists.length === 0) {
      listsSec.appendChild(el('div', { className: 'card', style: 'text-align:center;padding:32px;' }, [
        el('div', { className: 'emoji', text: '📋' }),
        el('p', { className: 'text-muted mt-2', text: '暂无清单,去词表挑选单词加入吧。' }),
        el('button', { className: 'btn btn-primary', text: '浏览词表',
          on: { click: function () { navigate('browse'); } } })
      ]));
    } else {
      var listsGrid = el('div', { className: 'stat-grid' });
      lists.slice(0, 4).forEach(function (l) {
        listsGrid.appendChild(el('div', {
          className: 'stat-card',
          style: 'cursor:pointer;',
          on: { click: function () { navigate('list', [l.id]); } }
        }, [
          el('div', { style: 'font-size:28px;margin-bottom:8px;', text: '📋' }),
          el('div', { style: 'font-weight:700;font-size:16px;', text: l.name }),
          el('div', { className: 'text-muted', style: 'font-size:13px;margin-top:4px;',
            text: l.wordIds.length + ' 词 · 更新 ' + new Date(l.updatedAt).toLocaleDateString('zh-CN') })
        ]));
      });
      listsSec.appendChild(listsGrid);
    }
    wrapper.appendChild(listsSec);

    // 高级学习模块
    var advanced = el('div', { className: 'section' }, [
      el('div', { className: 'section-title', html: '高级学习模块 <small>生成式 R4-R6</small>' }),
      el('div', { className: 'stat-grid' }, [
        buildActionCard('🏛️', '记忆宫殿 R4', '场景化安放单词', function () { navigate('palace'); }),
        buildActionCard('📖', 'i+1 阅读 R5', '短文语境学习', function () { navigate('reading'); }),
        buildActionCard('🎤', 'Feynman 复述 R6', '生成式写作挑战', function () { navigate('feynman'); }),
        buildActionCard('🧩', '搭配练习', '词块 collocations', function () { navigate('collocations'); })
      ])
    ]);
    wrapper.appendChild(advanced);

    return wrapper;
  }

  // ============================================================
  // ============== 测试中枢 (Test Hub) =========================
  // ============================================================
  // 4 维考核入口(范围选择 → 4D 考核)
  // 范围:本清单(去清单页点开始考试)/复习库(跨清单聚合已通过)/错题库(跨清单聚合未通过)
  function renderTestHub() {
    var stage = state.currentStage;
    var all = getStageWords();
    var grades = (window.WordBrowser && WordBrowser.getStageGrades)
      ? WordBrowser.getStageGrades(stage)
      : [{ value: 'all', label: '全部' }];
    var stageLabel = Storage.STAGE_NAMES[stage] || stage;
    var lists = (window.StudyLists)
      ? StudyLists.getAllLists().filter(function (l) { return l.stage === stage; })
      : [];

    // 各范围单词数预览
    var reviewCount = 0;
    var errorCount = 0;
    if (window.StudyLists) {
      reviewCount = StudyLists.getAllPassedWordIds(stage, 'all').length;
      errorCount = StudyLists.getAllFailedWordIds(stage, 'all').length;
    }

    var wrapper = el('div', { className: 'test-hub-view' });

    // HERO
    var hero = el('div', { className: 'hero' });
    var heroMain = el('div', { className: 'hero-main' }, [
      el('div', { className: 'hero-greeting', text: '✅ 4 维考核' }),
      el('h1', { className: 'hero-title', html:
        '<span class="grad">' + (reviewCount + errorCount) + '</span> 词可考核 · ' +
        '<span class="grad">' + lists.length + '</span> 个清单' }),
      el('p', { className: 'hero-sub', text:
        '当前词库:' + stageLabel + ' · 维度:发音 / 中译英 / 英译中 / 例句' })
    ]);
    var quickCard = el('div', { className: 'card ring-card' }, [
      el('div', { className: 'card-title', text: '📊 当前可用范围' }),
      el('div', { className: 'study-quick-grid' }, [
        buildStatCard('已通过(复习库)', reviewCount, '词'),
        buildStatCard('未通过(错题库)', errorCount, '词'),
        buildStatCard('清单数', lists.length, '个')
      ])
    ]);
    hero.appendChild(heroMain);
    hero.appendChild(quickCard);
    wrapper.appendChild(hero);

    // 4 维说明
    wrapper.appendChild(el('div', { className: 'test-4d-explainer glass' }, [
      el('div', { className: 'test-4d-title', text: '🎯 4 维考核是什么?' }),
      el('div', { className: 'test-4d-dims' }, [
        el('div', { className: 'test-4d-dim' }, [
          el('div', { className: 'test-4d-dim-icon', text: '🎤' }),
          el('div', { className: 'test-4d-dim-name', text: '发音' }),
          el('div', { className: 'test-4d-dim-desc', text: '看英文,大声读出' })
        ]),
        el('div', { className: 'test-4d-dim' }, [
          el('div', { className: 'test-4d-dim-icon', text: '🔤' }),
          el('div', { className: 'test-4d-dim-name', text: '英译中' }),
          el('div', { className: 'test-4d-dim-desc', text: '看英文选中文' })
        ]),
        el('div', { className: 'test-4d-dim' }, [
          el('div', { className: 'test-4d-dim-icon', text: '✍️' }),
          el('div', { className: 'test-4d-dim-name', text: '中译英' }),
          el('div', { className: 'test-4d-dim-desc', text: '看中文键入拼写' })
        ]),
        el('div', { className: 'test-4d-dim' }, [
          el('div', { className: 'test-4d-dim-icon', text: '📝' }),
          el('div', { className: 'test-4d-dim-name', text: '例句' }),
          el('div', { className: 'test-4d-dim-desc', text: '写含目标词的整句' })
        ])
      ]),
      el('div', { className: 'test-4d-rule', text:
        '📌 规则:每词 4 维中任一维答错 → 该词记为不合格 → 留在原清单/错题库待重练。' })
    ]));

    // 范围选择卡片
    var scopeSec = el('div', { className: 'section' }, [
      el('div', { className: 'section-title', html: '选择考核范围 <small>每个范围都会进入 4 维考核</small>' })
    ]);
    var scopeGrid = el('div', { className: 'test-scope-grid' });

    // 复习库
    var reviewCard = buildTestScopeCard({
      icon: '🔁',
      title: '复习库',
      sub: '所有清单中上次考试已通过的词',
      count: reviewCount,
      countLabel: '已通过',
      disabledHint: reviewCount === 0 ? '还没有已通过的词' : '',
      grades: grades,
      actionText: '开始 4 维考核',
      onStart: function (grade) {
        if (reviewCount === 0) {
          toast('复习库为空,先去某个清单通过考核', 'info');
          return;
        }
        if (window.StudyListsView && StudyListsView.startListTest) {
          StudyListsView.startListTest(null, { scope: 'review', stage: stage, grade: grade });
        }
      }
    });
    scopeGrid.appendChild(reviewCard);

    // 错题库
    var errorCard = buildTestScopeCard({
      icon: '❌',
      title: '错题库',
      sub: '所有清单中上次考试未通过的词',
      count: errorCount,
      countLabel: '待重练',
      disabledHint: errorCount === 0 ? '没有不合格的词,继续保持 ✨' : '',
      grades: grades,
      actionText: '开始 4 维考核',
      onStart: function (grade) {
        if (errorCount === 0) {
          toast('错题库为空', 'info');
          return;
        }
        if (window.StudyListsView && StudyListsView.startListTest) {
          StudyListsView.startListTest(null, { scope: 'error', stage: stage, grade: grade });
        }
      }
    });
    scopeGrid.appendChild(errorCard);

    scopeSec.appendChild(scopeGrid);
    wrapper.appendChild(scopeSec);

    // 本清单考核提示
    var listHint = el('div', { className: 'section' }, [
      el('div', { className: 'section-title', html: '本清单考核 <small>在清单页发起</small>' }),
      el('div', { className: 'card test-list-hint' }, [
        el('div', { className: 'emoji', text: '📋', style: 'font-size:32px;margin-bottom:8px;' }),
        el('p', { text: '想对某个具体清单考核,进入该清单详情页 → 点击「开始考试」即可。' }),
        el('p', { className: 'text-muted small',
          text: '本清单考核 4 维全过(每个词都考发音/英译中/中译英/例句),可重复考核覆盖之前结果。' }),
        el('div', { className: 'mt-2' }, [
          el('button', {
            className: 'btn btn-primary', text: '📋 前往清单列表',
            on: { click: function () { navigate('lists'); } }
          })
        ])
      ])
    ]);
    wrapper.appendChild(listHint);

    return wrapper;
  }

  function buildTestScopeCard(opts) {
    var card = el('div', { className: 'test-scope-card glass' + (opts.count === 0 ? ' disabled' : '') });
    card.appendChild(el('div', { className: 'test-scope-icon', text: opts.icon }));
    card.appendChild(el('div', { className: 'test-scope-title', text: opts.title }));
    card.appendChild(el('div', { className: 'test-scope-sub text-muted', text: opts.sub }));

    var countBox = el('div', { className: 'test-scope-count' }, [
      el('div', { className: 'test-scope-count-num', text: String(opts.count) }),
      el('div', { className: 'test-scope-count-label', text: opts.countLabel })
    ]);
    card.appendChild(countBox);

    if (opts.disabledHint) {
      card.appendChild(el('div', { className: 'test-scope-empty', text: opts.disabledHint }));
      return card;
    }

    // 学期筛选
    if (opts.grades && opts.grades.length > 1) {
      var sel = el('select', { className: 'form-input test-scope-grade' });
      opts.grades.forEach(function (g) {
        var o = el('option', { text: g.label });
        o.value = g.value;
        sel.appendChild(o);
      });
      sel.value = 'all';
      card.appendChild(el('label', { className: 'test-scope-grade-label', text: '学期范围' }));
      card.appendChild(sel);
      card.appendChild(el('button', {
        className: 'btn btn-primary test-scope-start',
        text: opts.actionText || '开始',
        on: { click: function () { opts.onStart(sel.value); } }
      }));
    } else {
      card.appendChild(el('button', {
        className: 'btn btn-primary test-scope-start',
        text: opts.actionText || '开始',
        on: { click: function () { opts.onStart('all'); } }
      }));
    }
    return card;
  }

  // ============================================================
  // ============== 历史视图 (History Hub) ======================
  // ============================================================
  function renderHistory() {
    var wrapper = el('div', { className: 'history-view' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 测试中枢',
        on: { click: function () { navigate('test'); } } }),
      el('h2', { text: '📜 历史记录' }),
      el('span', { className: 'small text-muted', text:
        Storage.STAGE_NAMES[state.currentStage] || state.currentStage })
    ]));
    var listBox = el('div', { id: 'history-list-box', className: 'history-list-wrap' });
    wrapper.appendChild(listBox);
    if (window.HistoryView) {
      HistoryView.renderHistoryList(listBox, { stage: state.currentStage, type: '', navigate: navigate });
    }
    return wrapper;
  }

  function renderHistoryDetail(itemId) {
    var wrapper = el('div', { className: 'history-detail-wrap' });
    if (window.HistoryView) {
      HistoryView.renderHistoryDetail(wrapper, itemId, navigate);
    }
    return wrapper;
  }

  function startReciteMode(modeId) {
    var mode = (window.ReciteModes || {})[modeId];
    if (!mode) {
      toast('模式未实现:' + modeId, 'error');
      return;
    }
    var all = getStageWords();
    var range = state.reciteRange || { from: 1, to: all.length, count: 20 };
    var words = pickWordsByRange(all, range.from, range.to);
    if (words.length === 0) {
      toast('当前范围没有单词', 'error');
      return;
    }
    // Optional: cap to 30 for recite to keep it short
    if (words.length > 30) {
      words = words.slice(0, 30);
    }
    var container = document.getElementById('view-container');
    container.innerHTML = '';
    var wrapper = el('div', { className: 'recite-runner-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 返回模式选择',
        on: { click: function () { navigate('recite'); } } }),
      el('h2', { text: mode.name }),
      el('span', { className: 'small', text: words.length + ' 词' })
    ]));
    var stage = el('div', { className: 'recite-stage' });
    wrapper.appendChild(stage);
    container.appendChild(wrapper);
    mode.run(stage, state.currentStage, words, {
      onAnswer: function (entry) {
        // Only log attempts; do NOT touch SRS queue
        Storage.logAttempt({
          stage: state.currentStage,
          wordId: entry.wordId,
          mode: entry.mode || modeId,
          correct: !!entry.correct,
          timeMs: entry.timeMs || 0,
          userAnswer: entry.userAnswer || '',
          rating: entry.correct ? 'good' : 'again',
          timestamp: Date.now()
        });
      },
      onComplete: function (report) {
        setTimeout(function () { navigate('recite'); }, 800);
        var score = report && typeof report.correctRate === 'number'
          ? Math.round(report.correctRate * 100) : 0;
        var correctCount = report && report.correctCount || 0;
        var totalTime = report && report.timeSpent || 0;
        if (window.HistoryView) {
          HistoryView.recordSession({
            type: 'recite',
            mode: modeId,
            modeName: mode.name,
            stage: state.currentStage,
            wordCount: words.length,
            correctCount: correctCount,
            totalTime: totalTime,
            score: score,
            wrongWords: (report && report.wrongWords) || []
          });
        }
        if (global.BackendSync) {
          BackendSync.Quizzes.record({
            stage: state.currentStage,
            mode: modeId,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            score: score,
            wordCount: words.length,
            correctCount: correctCount,
            rounds: []
          });
        }
      }
    });
  }

  function renderTestLanding() {
    var all = getStageWords();
    var wrapper = el('div', { className: 'test-view' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 测试中枢',
        on: { click: function () { navigate('test'); } } }),
      el('h2', { text: '✅ 检验模式 · T1–T10' }),
      el('span', { className: 'small', text: '当前词库:' + (Storage.STAGE_NAMES[state.currentStage] || '') +
        ' · ' + all.length + ' 词' })
    ]));

    var range = state.testRange || {
      from: 1, to: Math.min(50, all.length || 50), count: Math.min(50, all.length || 50)
    };
    wrapper.appendChild(buildRangeBar(all.length, range, function (r) {
      state.testRange = r;
      renderCurrentView();
    }));

    var grid = el('div', { className: 'mode-grid' });
    TEST_MODE_LIST.forEach(function (m) {
      var mode = (window.TestModes || {})[m.id];
      grid.appendChild(el('div', {
        className: 'mode-card',
        on: { click: function () { startTestMode(m.id); } }
      }, [
        el('div', { className: 'mode-id', text: m.id.split('_')[0] }),
        el('div', { className: 'mode-title', text: m.name }),
        el('div', { className: 'mode-desc', text: m.desc }),
        el('div', { className: 'mode-action', text: mode ? '开始测评 →' : '未实现' })
      ]));
    });
    wrapper.appendChild(grid);
    return wrapper;
  }

  function startTestMode(modeId) {
    var mode = (window.TestModes || {})[modeId];
    if (!mode) {
      toast('模式未实现:' + modeId, 'error');
      return;
    }
    var all = getStageWords();
    var range = state.testRange || { from: 1, to: all.length, count: TEST_DEFAULT_COUNT[modeId] || 20 };
    var words = pickWordsByRange(all, range.from, range.to);
    var want = TEST_DEFAULT_COUNT[modeId] || 20;
    if (words.length > want) {
      // Random sample to the target size
      var arr = words.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      words = arr.slice(0, want);
    }
    if (words.length === 0) {
      toast('当前范围没有单词', 'error');
      return;
    }
    var container = document.getElementById('view-container');
    container.innerHTML = '';
    var wrapper = el('div', { className: 'test-runner-wrap' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 返回模式选择',
        on: { click: function () { navigate('test'); } } }),
      el('h2', { text: mode.name }),
      el('span', { className: 'small', text: words.length + ' 题' })
    ]));
    var stage = el('div', { className: 'test-stage' });
    wrapper.appendChild(stage);
    container.appendChild(wrapper);
    mode.run(stage, state.currentStage, words, {
      mode: modeId,
      scope: { from: range.from, to: range.to },
      onAnswer: function (entry) {
        Storage.logAttempt({
          stage: state.currentStage,
          wordId: entry.wordId,
          mode: modeId,
          correct: !!entry.correct,
          timeMs: entry.timeMs || 0,
          userAnswer: entry.userAnswer || '',
          rating: entry.correct ? 'good' : 'again',
          timestamp: Date.now()
        });
      },
      onComplete: function (report) {
        if (window.HistoryView) {
          var scoreVal = report && typeof report.correctRate === 'number'
            ? Math.round(report.correctRate * 100) : 0;
          HistoryView.recordSession({
            type: 'test',
            mode: modeId,
            modeName: mode.name,
            stage: state.currentStage,
            wordCount: words.length,
            correctCount: (report && report.correctCount) || 0,
            totalTime: (report && report.timeSpent) || 0,
            score: scoreVal,
            wrongWordIds: ((report && report.wrongWords) || []).map(function (x) { return x.wordId || x.id; }).filter(Boolean),
            wrongWords: (report && report.wrongWords) || [],
            scope: { from: range.from, to: range.to }
          });
        }
        showTestReport(report, mode, words);
      }
    });
  }

  function buildRangeBar(total, current, onChange) {
    var fromInput, toInput, countInput;
    var bar = el('div', { className: 'range-bar' });
    bar.appendChild(el('label', { text: '词库范围' }));
    fromInput = el('input', {
      attrs: { type: 'number', min: '1', max: String(Math.max(1, total)) },
      text: String(current.from || 1)
    });
    toInput = el('input', {
      attrs: { type: 'number', min: '1', max: String(Math.max(1, total)) },
      text: String(current.to || Math.min(50, total))
    });
    countInput = el('input', {
      attrs: { type: 'number', min: '1', max: '200' },
      text: String(current.count || 20)
    });
    bar.appendChild(el('label', { text: '起' }));
    bar.appendChild(fromInput);
    bar.appendChild(el('label', { text: '止' }));
    bar.appendChild(toInput);
    bar.appendChild(el('label', { text: '抽取' }));
    bar.appendChild(countInput);
    var applyBtn = el('button', {
      className: 'btn btn-primary btn-sm', text: '应用',
      on: { click: function () {
        var from = Math.max(1, parseInt(fromInput.value, 10) || 1);
        var to = Math.min(total, parseInt(toInput.value, 10) || total);
        var count = Math.max(1, parseInt(countInput.value, 10) || 20);
        onChange({ from: from, to: to, count: count });
      } }
    });
    bar.appendChild(applyBtn);
    bar.appendChild(el('span', { className: 'text-muted', text: '(总词数 ' + total + ')' }));
    return bar;
  }

  function showTestReport(report, mode, words) {
    var overlay = el('div', {
      className: 'report-overlay',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var card = el('div', { className: 'report-card' });
    card.appendChild(el('div', { className: 'report-title', text: '🎉 ' + mode.name + ' 完成' }));
    var rate = Math.round(report.correctRate * 100);
    var rateColor = rate >= 80 ? 'var(--c-success)' : rate >= 60 ? 'var(--c-warn)' : 'var(--c-danger)';
    var score = el('div', { className: 'report-score', text: rate + ' / 100' });
    score.style.color = rateColor;
    card.appendChild(score);
    card.appendChild(el('div', { className: 'report-score-cap', text: '综合得分' }));

    var stats = el('div', { className: 'report-stats' });
    [
      ['正确题数', report.correctCount + ' / ' + report.totalCount],
      ['总耗时', Math.round(report.timeSpent / 1000) + ' 秒'],
      ['平均耗时', Math.round((report.timeSpent / Math.max(1, report.totalCount)) / 1000 * 10) / 10 + ' 秒/题']
    ].forEach(function (s) {
      stats.appendChild(el('div', { className: 'report-stat' }, [
        el('div', { className: 'report-stat-label', text: s[0] }),
        el('div', { className: 'report-stat-value', text: s[1] })
      ]));
    });
    card.appendChild(stats);

    if (report.wrongWords && report.wrongWords.length) {
      var w = el('div', { className: 'report-wrong' });
      w.appendChild(el('h4', { text: '✗ 错题(' + report.wrongWords.length + ')· 已加入错题本' }));
      var ul = el('ul');
      report.wrongWords.slice(0, 30).forEach(function (x) {
        ul.appendChild(el('li', null, [
          el('span', { text: x.word + ' — ' + (x.translation || '') }),
          el('span', { className: 'text-muted', text: x.userAnswer || '' })
        ]));
      });
      w.appendChild(ul);
      card.appendChild(w);
    } else {
      card.appendChild(el('div', { className: 'text-center text-muted mb-4', text: '🎯 全部正确!完美作答。' }));
    }

    var actions = el('div', { className: 'report-actions' });
    actions.appendChild(el('button', {
      className: 'btn btn-primary', text: '再来一次',
      on: { click: function () { document.body.removeChild(overlay); navigate('test'); } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-secondary', text: '查看错题本',
      on: { click: function () { document.body.removeChild(overlay); navigate('wrongbook'); } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-secondary', text: '📜 查看历史',
      on: { click: function () { document.body.removeChild(overlay); navigate('history'); } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-ghost', text: '回到主页',
      on: { click: function () { document.body.removeChild(overlay); navigate('home'); } }
    }));
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function renderWrongBook() {
    var stage = state.currentStage;
    var wrapper = el('div', { className: 'wrong-book-view' });
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { navigate('home'); } } }),
      el('h2', { text: '错题本 · ' + (Storage.STAGE_NAMES[stage] || stage) }),
      el('span', { className: 'small', text: '错词自动入本,1 天后再复习' })
    ]));
    wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
      el('div', { className: 'emoji', text: '⏳' }),
      el('p', { text: '正在从云端同步错题…' })
    ]));
    if (window.WrongBook && WrongBook.getAllFresh) {
      WrongBook.getAllFresh(stage).then(function (items) {
        renderWrongBookContent(wrapper, stage, items);
      });
    } else {
      var items0 = (window.WrongBook) ? WrongBook.getAll(stage) : [];
      renderWrongBookContent(wrapper, stage, items0);
    }
    return wrapper;
  }

  function renderWrongBookContent(wrapper, stage, items) {
    var stats = (window.WrongBook) ? WrongBook.getStats(stage) : { total: 0, totalErrors: 0, topFrequent: [] };
    wrapper.innerHTML = '';

    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { navigate('home'); } } }),
      el('h2', { text: '📕 错题本 · ' + (Storage.STAGE_NAMES[stage] || stage) }),
      el('span', { className: 'small', text: '错词自动入本,1 天后再复习' })
    ]));

    var statsRow = el('div', { className: 'wrong-stats-row' });
    [
      ['错题总数', stats.total, '词'],
      ['累计错次', stats.totalErrors, '次'],
      ['最高错次', stats.topFrequent && stats.topFrequent[0] ? stats.topFrequent[0].frequency : 0, '次'],
      ['可练习', stats.total, '词']
    ].forEach(function (s) {
      statsRow.appendChild(el('div', { className: 'stat-card' }, [
        el('div', { className: 'label', text: s[0] }),
        el('div', { className: 'value', text: String(s[1]) }),
        el('span', { className: 'text-muted', text: ' ' + s[2] })
      ]));
    });
    wrapper.appendChild(statsRow);

    if (items.length === 0) {
      wrapper.appendChild(el('div', { className: 'wrong-empty' }, [
        el('div', { className: 'emoji', text: '🎉' }),
        el('h2', { text: '当前词库没有错题' }),
        el('p', { text: '继续努力!所有单词都答对,继续保持。' })
      ]));
      return;
    }

    if (stats.total > 0) {
      wrapper.appendChild(el('div', { className: 'recite-actions' }, [
        el('button', {
          className: 'btn btn-primary', text: '🚀 用错题本进入检验模式(T2)',
          on: { click: function () {
            state.testRange = { from: 1, to: 9999, count: Math.min(items.length, 30) };
            // Generate a pseudo-vocab of just the wrong words so test mode can use them
            navigate('test');
          } }
        }),
        el('button', {
          className: 'btn btn-danger', text: '清空错题本',
          on: { click: function () {
            if (confirm('确认清空当前词库(' + Storage.STAGE_NAMES[stage] + ')的错题?')) {
              if (window.WrongBook) WrongBook.clear(stage);
              renderCurrentView();
              toast('已清空', 'success');
            }
          } }
        })
      ]));
    }

    var list = el('div', { className: 'wrong-list' });
    items.sort(function (a, b) { return b.frequency - a.frequency; });
    items.forEach(function (it) {
      list.appendChild(el('div', { className: 'wrong-item' }, [
        el('div', { className: 'wrong-item-main' }, [
          el('div', { className: 'wrong-item-word' }, [
            el('span', { text: it.word }),
            el('span', { className: 'wrong-item-freq', text: '×' + it.frequency })
          ]),
          el('div', { className: 'wrong-item-trans', text: it.translation || it.phonetic || '' })
        ]),
        el('div', { className: 'wrong-item-actions' }, [
          el('button', {
            className: 'btn btn-secondary btn-sm', text: '🔊',
            on: { click: function () { speak(it.word); } }
          }),
          el('button', {
            className: 'btn btn-danger btn-sm', text: '移出',
            on: { click: function () {
              if (window.WrongBook) WrongBook.remove(stage, it.wordId);
              renderWrongBook();
            } }
          })
        ])
      ]));
    });
    wrapper.appendChild(list);
    return wrapper;
  }

  // ---------- Stats view (8-dimension dashboard) ----------
  function renderStats() {
    var stage = state.currentStage;
    var range = state.statsRange;
    var grade = state.statsGrade;
    var grades = (window.Stats && Stats.getStageGrades)
      ? Stats.getStageGrades(stage)
      : [{ value: 'all', label: '全部' }];

    var wrapper = el('div', { className: 'stats-view' });

    // Header: stage select + range tabs + grade drill-down
    var header = el('div', { className: 'stats-header' });

    var stageSel = el('select', {
      className: 'stage-select',
      on: { change: function (e) {
        state.statsGrade = 'all';
        switchStage(e.target.value);
      } }
    });
    Storage.STAGES.forEach(function (s) {
      var opt = el('option', { text: Storage.STAGE_NAMES[s] });
      opt.value = s;
      if (s === stage) opt.selected = true;
      stageSel.appendChild(opt);
    });
    header.appendChild(stageSel);

    var rangeTabs = el('div', { className: 'range-tabs' });
    ['7', '30', '90', 'all'].forEach(function (r) {
      var label = r === 'all' ? '全部' : (r + '天');
      rangeTabs.appendChild(el('button', {
        className: 'range-tab' + (range === r ? ' active' : ''),
        text: label,
        on: { click: function () {
          state.statsRange = r;
          renderCurrentView();
        } }
      }));
    });
    header.appendChild(rangeTabs);

    if (grades.length > 1) {
      var gradeSel = el('select', {
        className: 'stage-select',
        on: { change: function (e) { state.statsGrade = e.target.value; renderCurrentView(); } }
      });
      grades.forEach(function (g) {
        var opt = el('option', { text: g.label });
        opt.value = g.value;
        if (g.value === grade) opt.selected = true;
        gradeSel.appendChild(opt);
      });
      header.appendChild(gradeSel);
    }

    wrapper.appendChild(header);
    wrapper.appendChild(el('div', { className: 'section-title' }, [
      document.createTextNode('统计仪表盘 · ' + Storage.STAGE_NAMES[stage] + ' · ' +
        (range === 'all' ? '全部时间' : ('近 ' + range + ' 天')))
    ]));

    // Dashboard
    var dash = el('div', { id: 'stats-dashboard', className: 'stats-dashboard' });
    if (window.CloudDashboard && window.BackendSync && BackendSync.Stats) {
      dash.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '☁️' }),
        el('p', { text: '正在从云端拉取统计…' })
      ]));
      CloudDashboard.loadAndRender(stage, { range: range, grade: grade }, dash).then(function (data) {
        if (!data) {
          dash.innerHTML = '';
          if (window.Dashboard) dash.appendChild(Dashboard.render(stage, { range: range, grade: grade }));
          else dash.appendChild(renderPlaceholder('统计模块加载中', '⏳', '正在初始化统计仪表盘...'));
        }
      }).catch(function (e) {
        console.warn('CloudDashboard failed, fallback to local', e);
        dash.innerHTML = '';
        if (window.Dashboard) dash.appendChild(Dashboard.render(stage, { range: range, grade: grade }));
      });
    } else if (window.Dashboard) {
      dash.appendChild(Dashboard.render(stage, { range: range, grade: grade }));
    } else {
      dash.appendChild(renderPlaceholder('统计模块加载中', '⏳', '正在初始化统计仪表盘...'));
    }
    wrapper.appendChild(dash);

    return wrapper;
  }

  function buildAttemptsTable(attempts) {
    var vocab = Storage.getVocab(state.currentStage);
    var wrap = el('div', { className: 'table-wrap' });
    var table = el('table');
    var thead = el('thead', null, [
      el('tr', null, [
        el('th', { text: '时间' }),
        el('th', { text: '单词' }),
        el('th', { text: '评分' }),
        el('th', { text: '正确' }),
        el('th', { text: '耗时' })
      ])
    ]);
    table.appendChild(thead);
    var tbody = el('tbody');
    attempts.forEach(function (a) {
      var word = vocab && vocab.words ? vocab.words.find(function (w) { return w.id === a.wordId; }) : null;
      var time = a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : '-';
      tbody.appendChild(el('tr', null, [
        el('td', { text: time }),
        el('td', { text: word ? word.word : ('#' + a.wordId) }),
        el('td', { html: '<span class="tag ' +
          (a.rating === 'again' ? 'danger' :
           a.rating === 'hard'  ? 'warn'   :
           a.rating === 'good'  ? 'success': '') + '">' + (a.rating || '-') + '</span>' }),
        el('td', { html: a.correct ? '✓' : '✗' }),
        el('td', { text: a.timeMs ? Math.round(a.timeMs / 100) / 10 + 's' : '-' })
      ]));
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  // ---------- Data modal ----------
  function openDataModal() {
    var dump = Storage.exportAll();
    var json = JSON.stringify(dump, null, 2);
    var overlay = el('div', {
      className: 'modal-overlay',
      style: 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;' +
             'display:flex;align-items:center;justify-content:center;padding:20px;',
      on: { click: function (e) {
        if (e.target === overlay) document.body.removeChild(overlay);
      } }
    });
    var importMode = 'merge';
    var modeText = el('span', { className: 'text-muted', text: ' · 模式:跳过本地已有' });

    var modal = el('div', {
      className: 'card',
      style: 'max-width:640px;width:100%;max-height:85vh;overflow:auto;'
    }, [
      el('div', { className: 'card-title', text: '⚙️ 数据管理 / 同步' }),
      el('div', { className: 'data-modal-callout' }, [
        el('div', { className: 'data-modal-callout-title', text: '📱 电脑 ↔ 手机 数据不一致?' }),
        el('div', { className: 'data-modal-callout-text',
          text: '数据保存在本机浏览器,默认不互通。同步方法:' }),
        el('ol', { className: 'data-modal-callout-list' }, [
          el('li', { text: '在「有数据的设备」点击 [📤 导出],得到一个 JSON 文件' }),
          el('li', { text: '把 JSON 发到「另一台设备」(微信文件传输 / 邮箱 / U盘)' }),
          el('li', { text: '在「另一台设备」打开本应用 → [⚙️ 数据管理] → [📥 从文件恢复]' })
        ])
      ]),
      el('div', { className: 'data-modal-summary',
        text: '本地数据摘要:' + Storage.summarizeExport(dump) }),
      el('textarea', {
        className: 'form-textarea',
        attrs: { rows: '6' },
        text: json
      }),
      el('div', { className: 'flex gap-2 mt-3 flex-wrap' }, [
        el('button', {
          className: 'btn btn-primary',
          text: '📤 导出(下载 JSON)',
          on: { click: function () {
            try {
              var blob = new Blob([json], { type: 'application/json' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = 'vocabmastery-' + Storage.todayStr() + '.json';
              a.click();
              URL.revokeObjectURL(url);
              toast('已导出 ' + Object.keys(dump.keys).length + ' 项数据,可发送到另一台设备', 'success');
            } catch (e) {
              toast('导出失败:' + e.message, 'error');
            }
          } }
        }),
        el('button', {
          className: 'btn btn-secondary',
          text: '📋 复制 JSON',
          on: { click: function () {
            try {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(json).then(function () {
                  toast('JSON 已复制,可在另一台设备粘贴导入', 'success');
                });
              } else {
                var ta = modal.querySelector('textarea');
                ta.select();
                document.execCommand('copy');
                toast('已复制(旧版浏览器)', 'success');
              }
            } catch (e) {
              toast('复制失败:' + e.message, 'error');
            }
          } }
        }),
        el('button', {
          className: 'btn btn-secondary',
          text: '📥 导入(选择文件)',
          on: { click: function () {
            var fileInput = document.getElementById('restore-file-input');
            if (!fileInput) {
              fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.id = 'restore-file-input';
              fileInput.accept = 'application/json,.json';
              fileInput.style.display = 'none';
              document.body.appendChild(fileInput);
              fileInput.addEventListener('change', function (ev) {
                var f = ev.target.files && ev.target.files[0];
                if (!f) return;
                Storage.uploadBackup(f).then(function (r) {
                  if (r && r.ok) {
                    toast('已恢复备份', 'success');
                    setTimeout(function () { window.location.reload(); }, 600);
                  } else {
                    toast('恢复失败:' + (r && r.error || '未知错误'), 'error');
                  }
                });
              });
            }
            fileInput.value = '';
            fileInput.click();
          } }
        })
      ]),
      el('div', { className: 'flex gap-2 mt-2 flex-wrap' }, [
        el('button', {
          className: 'btn btn-secondary',
          text: '📥 粘贴 JSON 导入',
          on: { click: function () {
            var ta = modal.querySelector('textarea');
            try {
              var obj = JSON.parse(ta.value);
              var r = Storage.importAll(obj, importMode);
              if (r.ok) {
                toast(r.msg, 'success');
                setTimeout(function () { window.location.reload(); }, 700);
              } else {
                toast(r.msg, 'error');
              }
            } catch (err) {
              toast('JSON 格式错误:' + err.message, 'error');
            }
          } }
        }),
        el('button', {
          className: 'btn btn-ghost btn-sm',
          text: '🔀 切换导入模式', style: 'align-self:center;',
          on: { click: function () {
            if (importMode === 'merge') {
              importMode = 'replace';
              modeText.textContent = ' · 模式:全部覆盖(慎用)';
            } else {
              importMode = 'merge';
              modeText.textContent = ' · 模式:跳过本地已有';
            }
          } }
        }),
        modeText
      ]),
      el('div', { className: 'flex gap-2 mt-2 flex-wrap' }, [
        el('button', {
          className: 'btn btn-ghost btn-sm',
          text: '🗑 清空词库缓存',
          style: 'color:#ff4757;border-color:#ff4757;',
          on: { click: function () {
            if (!confirm('确认清空所有词库缓存?将重新从服务器加载。')) return;
            var keys = Object.keys(localStorage);
            var removed = 0;
            keys.forEach(function (k) {
              if (k.indexOf('vm_vocab_') === 0 || k === 'vm_currentStage' || k === 'vm_stage') {
                localStorage.removeItem(k);
                removed++;
              }
            });
            toast('已清空 ' + removed + ' 项词库缓存,刷新中...', 'success');
            setTimeout(function () { window.location.reload(); }, 800);
          } }
        }),
        el('button', {
          className: 'btn btn-ghost',
          text: '关闭',
          on: { click: function () { document.body.removeChild(overlay); } }
        })
      ])
    ]);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ---------- Toast ----------
  function toast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = el('div', { id: 'toast-container', className: 'toast-container' });
      document.body.appendChild(container);
    }
    var t = el('div', {
      className: 'toast ' + (type || 'info'),
      text: message
    });
    container.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 3000);
  }

  function speak(word) {
    try {
      if (!('speechSynthesis' in global)) return;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(word || ''));
      u.lang = 'en-US';
      u.rate = 0.9;
      global.speechSynthesis.speak(u);
    } catch (err) {}
  }

  // ============================================================
  // ============== R4: 记忆宫殿 (Memory Palace) =================
  // ============================================================
  function renderPalace() {
    var wrapper = el('div', { className: 'palace-view' });
    var palaces = MemoryPalace.list();

    wrapper.appendChild(el('div', { className: 'section-title' }, [
      document.createTextNode('记忆宫殿 · 场景化记忆 '),
      el('small', { className: 'text-muted', text: '共 ' + palaces.length + ' 个场景' })
    ]));

    var createSection = el('div', { className: 'card mb-4' }, [
      el('div', { className: 'card-title', text: '➕ 新建场景' }),
      el('p', { className: 'text-muted', text: '选择内置场景快速开始,或自定义一个空间。' }),
      renderPresetGrid()
    ]);
    wrapper.appendChild(createSection);

    if (palaces.length === 0) {
      wrapper.appendChild(el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '🏛️' }),
        el('h2', { text: '还没有记忆宫殿' }),
        el('p', { text: '从上方选一个内置场景或自定义一个空间,开始把单词安放进去。' })
      ]));
    } else {
      var list = el('div', { className: 'palace-list' });
      palaces.forEach(function (p) { list.appendChild(renderPalaceCard(p)); });
      wrapper.appendChild(list);
    }

    return wrapper;
  }

  function renderPresetGrid() {
    var grid = el('div', { className: 'palace-preset-grid' });
    MemoryPalace.PRESET_SCENES.forEach(function (preset) {
      var card = el('div', {
        className: 'palace-preset-card',
        on: { click: function () { createPalaceFromPreset(preset); } }
      }, [
        el('div', { className: 'preset-icon', text: preset.icon }),
        el('div', { className: 'preset-name', text: preset.name }),
        el('div', { className: 'text-muted preset-scene', text: preset.scene })
      ]);
      grid.appendChild(card);
    });
    return grid;
  }

  function createPalaceFromPreset(preset) {
    var palace = MemoryPalace.create({
      name: preset.name, scene: preset.scene,
      description: preset.description, preset: preset.id,
      positions: preset.positions.slice()
    });
    toast('已创建 ' + palace.name, 'success');
    renderCurrentView();
    setTimeout(function () { openPalaceDetail(palace.id); }, 80);
  }

  function renderPalaceCard(p) {
    var words = p.words || [];
    var reviewInfo = p.lastReviewed
      ? '上次复习:' + new Date(p.lastReviewed).toLocaleString('zh-CN')
      : '尚未复习';
    return el('div', { className: 'card palace-card' }, [
      el('div', { className: 'palace-card-head' }, [
        el('div', { className: 'palace-card-title', text: p.name }),
        el('div', { className: 'palace-card-meta text-muted', text: p.scene })
      ]),
      el('p', { className: 'text-muted palace-desc', text: p.description || '(无描述)' }),
      el('div', { className: 'palace-card-stats' }, [
        el('span', { className: 'tag', text: '已安放 ' + words.length + ' 词' }),
        el('span', { className: 'tag warn', text: reviewInfo })
      ]),
      el('div', { className: 'flex gap-2 mt-3' }, [
        el('button', {
          className: 'btn btn-primary btn-sm',
          text: words.length > 0 ? '打开 / 复现' : '添加单词',
          on: { click: function () { openPalaceDetail(p.id); } }
        }),
        el('button', {
          className: 'btn btn-danger btn-sm', text: '删除',
          on: { click: function () {
            if (confirm('确认删除记忆宫 "' + p.name + '"?')) {
              MemoryPalace.delete(p.id); renderCurrentView(); toast('已删除', 'success');
            }
          } }
        })
      ])
    ]);
  }

  function openPalaceDetail(palaceId) {
    var palace = MemoryPalace.get(palaceId);
    if (!palace) { toast('场景不存在', 'error'); return; }
    var vocab = Storage.getVocab(state.currentStage);
    var words = (vocab && vocab.words) || [];

    var overlay = el('div', {
      className: 'modal-overlay',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var modal = el('div', { className: 'card palace-modal' });

    function refresh() {
      modal.innerHTML = '';
      modal.appendChild(el('div', { className: 'card-title', text: '🏛️ ' + palace.name }));
      modal.appendChild(el('p', { className: 'text-muted', text: '场景:' + palace.scene }));

      var wordList = palace.words || [];
      if (wordList.length > 0) {
        var list = el('div', { className: 'palace-word-list' });
        wordList.forEach(function (w) {
          var v = MemoryPalace.lookupWord(w.wordId);
          list.appendChild(el('div', { className: 'palace-word-item' }, [
            el('div', { className: 'pw-position', text: '#' + w.position }),
            el('div', { className: 'pw-word' }, [
              el('strong', { text: v.word || ('#' + w.wordId) }),
              el('span', { className: 'text-muted', text: '  ' + (v.translation || '') })
            ]),
            el('div', { className: 'pw-anchor text-muted', text: '🎨 ' + w.anchor })
          ]));
        });
        modal.appendChild(list);
      } else {
        modal.appendChild(el('p', { className: 'text-muted', text: '尚未安放单词。' }));
      }

      var addRow = el('div', { className: 'palace-add-row mt-3' }, [
        el('input', {
          className: 'form-input',
          attrs: { type: 'text', placeholder: '输入单词英文(从当前词库),回车添加' },
          on: { keydown: function (e) {
            if (e.key !== 'Enter') return;
            var val = e.target.value.trim().toLowerCase();
            if (!val) return;
            var found = words.find(function (w) { return w.word && w.word.toLowerCase() === val; });
            if (!found) { toast('当前词库中没有此单词', 'error'); return; }
            MemoryPalace.addWord(palaceId, found.id, (palace.words || []).length + 1);
            e.target.value = '';
            palace = MemoryPalace.get(palaceId);
            refresh();
            toast('已安放 ' + found.word, 'success');
          } }
        })
      ]);
      modal.appendChild(addRow);

      modal.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
        el('button', {
          className: 'btn btn-primary',
          text: '开始复现测试',
          attrs: { disabled: wordList.length === 0 ? 'disabled' : '' },
          on: { click: function () { document.body.removeChild(overlay); startPalaceRecall(palaceId); } }
        }),
        el('button', {
          className: 'btn btn-secondary', text: '关闭',
          on: { click: function () { document.body.removeChild(overlay); } }
        })
      ]));
    }

    refresh();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function startPalaceRecall(palaceId) {
    var palace = MemoryPalace.get(palaceId);
    if (!palace || !palace.words || palace.words.length === 0) { toast('场景无单词', 'error'); return; }
    var overlay = el('div', { className: 'modal-overlay' });
    var modal = el('div', { className: 'card palace-recall-modal' });
    var controller = null;

    function showScene(item, idx, total) {
      modal.innerHTML = '';
      modal.appendChild(el('div', { className: 'text-muted', text: '复现测试 ' + (idx + 1) + ' / ' + total }));
      modal.appendChild(el('div', { className: 'card-title', text: '🖼️ 想象这个画面' }));
      modal.appendChild(el('div', { className: 'recall-anchor', text: item.anchor }));
      modal.appendChild(el('div', { className: 'recall-position text-muted', text: '位置:' + (palace.positions[idx] || ('第 ' + (idx + 1) + ' 站')) }));
      var input = el('input', {
        className: 'form-input mt-3',
        attrs: { type: 'text', placeholder: '请回忆对应的英文单词…' },
        on: { keydown: function (e) { if (e.key === 'Enter') controller.submit(input.value); } }
      });
      var submitBtn = el('button', {
        className: 'btn btn-primary mt-3', text: '提交',
        on: { click: function () { controller.submit(input.value); } }
      });
      var revealBtn = el('button', {
        className: 'btn btn-secondary mt-3', text: '我不会 / 显示答案',
        on: { click: function () {
          modal.appendChild(el('div', { className: 'recall-answer', text: '答案:' + item.word + ' — ' + (item.translation || '') }));
          submitBtn.textContent = '下一个 →';
        } }
      });
      modal.appendChild(input);
      modal.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [submitBtn, revealBtn]));
    }

    function onAnswer(item, word, answer, correct) {
      modal.appendChild(el('div', {
        className: 'recall-feedback ' + (correct ? 'good' : 'bad'),
        text: correct ? '✓ 答对啦!' : ('✗ 正确:' + word.word + ' — ' + (word.translation || ''))
      }));
    }

    function onComplete(result) {
      modal.innerHTML = '';
      modal.appendChild(el('div', { className: 'card-title', text: '🎉 复现完成' }));
      var correctPct = result.total > 0 ? Math.round(result.correct / result.total * 100) : 0;
      modal.appendChild(el('div', { className: 'recall-score', text: correctPct + ' 分' }));
      modal.appendChild(el('p', { className: 'text-muted', text: '答对 ' + result.correct + ' / ' + result.total + ' 词' }));
      var resultList = el('div', { className: 'recall-result-list mt-3' });
      result.results.forEach(function (r) {
        resultList.appendChild(el('div', { className: 'recall-result-item' }, [
          el('span', { className: r.correct ? 'tag success' : 'tag danger', text: r.correct ? '✓' : '✗' }),
          el('span', { className: 'ml-2', text: r.answer ? r.answer : '(未答)' }),
          el('span', { className: 'text-muted', text: ' → ' + r.word })
        ]));
      });
      modal.appendChild(resultList);
      modal.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
        el('button', { className: 'btn btn-primary', text: '再来一次', on: { click: function () { document.body.removeChild(overlay); startPalaceRecall(palaceId); } } }),
        el('button', { className: 'btn btn-secondary', text: '关闭', on: { click: function () { document.body.removeChild(overlay); } } })
      ]));
    }

    controller = MemoryPalace.startRecall(palaceId, {
      onShowScene: showScene, onAnswer: onAnswer, onComplete: onComplete
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ============================================================
  // ============== R5: i+1 阅读 (Reading) ======================
  // ============================================================
  var _readingState = { currentArticleId: null, session: null };

  function renderReading() {
    var wrapper = el('div', { className: 'reading-view' });
    wrapper.appendChild(el('div', { className: 'section-title' }, [
      document.createTextNode('i+1 阅读 · 短文语境 '),
      el('small', { className: 'text-muted', text: '点击单词可查义,自动加入查词日志' })
    ]));
    if (_readingState.currentArticleId) {
      wrapper.appendChild(renderReadingDetail(_readingState.currentArticleId));
    } else {
      wrapper.appendChild(renderReadingList());
    }
    return wrapper;
  }

  function renderReadingList() {
    var stage = state.currentStage;
    var wrap = el('div', {});
    var articles = Reading.getByStage(stage);
    if (articles.length === 0) articles = Reading.list();
    if (articles.length === 0) {
      return el('div', { className: 'view-placeholder' }, [
        el('div', { className: 'emoji', text: '📖' }),
        el('h2', { text: '暂无可读短文' }),
        el('p', { text: '正在加载文章库...' })
      ]);
    }
    var grid = el('div', { className: 'reading-grid' });
    articles.forEach(function (a) {
      grid.appendChild(el('div', { className: 'card reading-card' }, [
        el('div', { className: 'reading-card-topic tag', text: a.topic || 'general' }),
        el('div', { className: 'reading-card-title', text: a.title }),
        el('div', { className: 'reading-card-meta text-muted', text:
          '难度 ' + a.difficulty + ' · ' + a.targetWords.length + ' 个目标词 · ' +
          (a.text ? a.text.split(/\s+/).length : 0) + ' 词' }),
        el('div', { className: 'flex gap-2 mt-3' }, [
          el('button', {
            className: 'btn btn-primary btn-sm', text: '开始阅读',
            on: { click: function () { _readingState.currentArticleId = a.id; renderCurrentView(); } }
          })
        ])
      ]));
    });
    wrap.appendChild(grid);

    var log = Reading.getLookupLog();
    if (log.length > 0) {
      var recent = log.slice(-10).reverse();
      wrap.appendChild(el('div', { className: 'mt-4' }, [
        el('div', { className: 'card-title', text: '🆕 最近查词' }),
        el('div', { className: 'lookup-log' },
          recent.map(function (e) {
            return el('div', { className: 'lookup-item' }, [
              el('span', { className: 'tag', text: e.word }),
              el('span', { className: 'text-muted', text: new Date(e.lookedAt).toLocaleTimeString('zh-CN') })
            ]);
          })
        )
      ]));
    }
    return wrap;
  }

  function renderReadingDetail(articleId) {
    var wrap = el('div', {});
    var article = Reading.get(articleId);
    if (!article) { _readingState.currentArticleId = null; return el('p', { className: 'text-muted', text: '文章不存在' }); }
    wrap.appendChild(el('div', { className: 'flex gap-2 mb-3' }, [
      el('button', {
        className: 'btn btn-secondary btn-sm', text: '← 返回短文列表',
        on: { click: function () { _readingState.currentArticleId = null; renderCurrentView(); } }
      })
    ]));
    wrap.appendChild(el('h2', { className: 'reading-title', text: article.title }));
    wrap.appendChild(el('div', { className: 'text-muted mb-3', text:
      '主题:' + (article.topic || 'general') + ' · 难度 ' + article.difficulty +
      ' · 目标词 ' + article.targetWords.length + ' 个' }));

    var highlighted = Reading.highlightWords(article.text, article.targetWords);
    var articleBox = el('div', { className: 'reading-article' });
    articleBox.innerHTML = highlighted.html;
    Array.prototype.forEach.call(articleBox.querySelectorAll('[data-word]'), function (node) {
      node.addEventListener('click', function () {
        var w = node.getAttribute('data-word');
        var wordData = Reading.lookupWord(w);
        showWordPopover(node, wordData);
        if (!_readingState.session) _readingState.session = Reading.startReading(articleId, {});
        _readingState.session.recordClick(w);
      });
    });
    wrap.appendChild(articleBox);

    wrap.appendChild(el('div', { className: 'reading-legend mt-3 text-muted' }, [
      document.createTextNode('图例:'),
      el('span', { className: 'reading-target', text: '目标词' }),
      document.createTextNode(' '),
      el('span', { className: 'reading-known', text: '已学词' }),
      document.createTextNode(' '),
      el('span', { className: 'reading-unknown', text: '其他' })
    ]));

    wrap.appendChild(el('div', { className: 'flex gap-2 mt-4' }, [
      el('button', {
        className: 'btn btn-primary', text: '标记为读完 ✓',
        on: { click: function () {
          if (!_readingState.session) _readingState.session = Reading.startReading(articleId, {});
          var stats = _readingState.session.complete();
          toast('阅读完成!查词 ' + stats.uniqueClicks + ' 个', 'success');
          _readingState.currentArticleId = null; _readingState.session = null;
          renderCurrentView();
        } }
      })
    ]));
    return wrap;
  }

  function showWordPopover(anchor, wordData) {
    var existing = document.getElementById('word-popover');
    if (existing) existing.parentNode.removeChild(existing);
    var pop = el('div', { id: 'word-popover', className: 'word-popover' });
    pop.appendChild(el('div', { className: 'wp-word', text: wordData.word }));
    if (wordData.phonetic) pop.appendChild(el('div', { className: 'wp-phonetic', text: wordData.phonetic }));
    if (wordData.pos) pop.appendChild(el('div', { className: 'wp-pos text-muted', text: wordData.pos }));
    pop.appendChild(el('div', { className: 'wp-trans', text: wordData.translation || '(无释义)' }));
    if (wordData.definition) pop.appendChild(el('div', { className: 'wp-def text-muted', text: wordData.definition }));
    if (wordData.examples && wordData.examples[0]) {
      pop.appendChild(el('div', { className: 'wp-ex', text: '例:' + wordData.examples[0] }));
    }
    pop.appendChild(el('div', { className: 'text-muted mt-2', text: '已加入查词日志' }));
    document.body.appendChild(pop);
    var r = anchor.getBoundingClientRect();
    pop.style.position = 'absolute';
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = (window.scrollX + r.left) + 'px';
    setTimeout(function () {
      document.addEventListener('click', function dismiss(e) {
        if (pop && !pop.contains(e.target)) {
          pop.parentNode && pop.parentNode.removeChild(pop);
          document.removeEventListener('click', dismiss);
        }
      });
    }, 50);
  }

  // ============================================================
  // ============== R6: Feynman 复述 (Feynman) ===================
  // ============================================================
  var _feynmanState = { challenge: null, result: null };

  function renderFeynman() {
    var wrapper = el('div', { className: 'feynman-view' });
    wrapper.appendChild(el('div', { className: 'section-title' }, [
      document.createTextNode('Feynman 复述挑战 · '),
      el('small', { className: 'text-muted', text: '用 20 个词写一个小短文,系统自动评估' })
    ]));
    if (!_feynmanState.challenge) wrapper.appendChild(renderFeynmanIntro());
    else if (_feynmanState.result) wrapper.appendChild(renderFeynmanResult(_feynmanState.result));
    else wrapper.appendChild(renderFeynmanCompose(_feynmanState.challenge));
    return wrapper;
  }

  function renderFeynmanIntro() {
    return el('div', { className: 'card feynman-intro' }, [
      el('div', { className: 'card-title', text: '🎤 Feynman 复述法' }),
      el('p', { className: 'text-muted', text:
        '系统会从你当前词库随机抽取 20 个词。请用这些词(尽量多用)写一篇 60-300 词的英文短文,' +
        '然后系统会从词覆盖率、语法正确性、创意性三个维度给出 0-100 分的评估。' }),
      el('div', { className: 'flex gap-2 mt-3' }, [
        el('button', {
          className: 'btn btn-primary btn-lg', text: '🚀 开始新挑战',
          on: { click: function () {
            _feynmanState.challenge = Feynman.generateChallenge(state.currentStage, 20);
            _feynmanState.result = null;
            if (!_feynmanState.challenge || _feynmanState.challenge.length === 0) {
              toast('当前词库无单词', 'error');
              _feynmanState.challenge = null;
              return;
            }
            renderCurrentView();
          } }
        }),
        el('button', { className: 'btn btn-secondary', text: '查看历史', on: { click: function () { showFeynmanHistory(); } } })
      ])
    ]);
  }

  function renderFeynmanCompose(words) {
    var wrap = el('div', {});
    wrap.appendChild(el('div', { className: 'card-title', text: '✍️ 请使用以下 20 个挑战词写作' }));
    var chipBox = el('div', { className: 'feynman-words' });
    words.forEach(function (w) { chipBox.appendChild(el('span', { className: 'feynman-chip', text: w.word })); });
    wrap.appendChild(chipBox);

    var counter = el('div', { className: 'feynman-counter text-muted', text: '字数:0 / 建议 60-300' });
    var ta = el('textarea', {
      className: 'form-textarea feynman-textarea',
      attrs: { rows: '10', placeholder: 'Start writing your story here…' },
      on: { input: function (e) { counter.textContent = '字数:' + e.target.value.length + ' / 建议 60-300'; } }
    });
    wrap.appendChild(ta);
    wrap.appendChild(counter);

    wrap.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
      el('button', {
        className: 'btn btn-primary', text: '提交评估',
        on: { click: function () {
          var text = ta.value;
          if (!text.trim()) { toast('请先写点内容', 'error'); return; }
          _feynmanState.result = Feynman.submitComposition(state.currentStage, words, text);
          renderCurrentView();
        } }
      }),
      el('button', {
        className: 'btn btn-secondary', text: '换一组词',
        on: { click: function () {
          _feynmanState.challenge = Feynman.generateChallenge(state.currentStage, 20);
          _feynmanState.result = null; renderCurrentView();
        } }
      }),
      el('button', {
        className: 'btn btn-ghost', text: '放弃',
        on: { click: function () { _feynmanState.challenge = null; _feynmanState.result = null; renderCurrentView(); } }
      })
    ]));
    return wrap;
  }

  function renderFeynmanResult(result) {
    var wrap = el('div', {});
    wrap.appendChild(el('div', { className: 'feynman-score', text: result.score + ' 分' }));
    var grid = el('div', { className: 'stat-grid' });
    grid.appendChild(buildStatCard('词覆盖率', result.coverage.percent + '%', ''));
    grid.appendChild(buildStatCard('语法正确性', result.correctness.score, ''));
    grid.appendChild(buildStatCard('创意性', result.creativity.score, ''));
    grid.appendChild(buildStatCard('总字数', result.creativity.length, ''));
    wrap.appendChild(grid);

    if (result.coverage.missingWords && result.coverage.missingWords.length > 0) {
      wrap.appendChild(el('div', { className: 'mt-3' }, [
        el('div', { className: 'text-muted', text: '未使用的挑战词:' }),
        el('div', { className: 'feynman-words mt-2' },
          result.coverage.missingWords.map(function (w) {
            return el('span', { className: 'feynman-chip missed', text: w });
          })
        )
      ]));
    }
    if (result.coverage.usedWords && result.coverage.usedWords.length > 0) {
      wrap.appendChild(el('div', { className: 'mt-3' }, [
        el('div', { className: 'text-muted', text: '已使用的挑战词:' }),
        el('div', { className: 'feynman-words mt-2' },
          result.coverage.usedWords.map(function (w) {
            return el('span', { className: 'feynman-chip used', text: w });
          })
        )
      ]));
    }

    var fb = el('div', { className: 'feynman-feedback mt-3' });
    result.feedback.forEach(function (line) {
      fb.appendChild(el('div', { className: 'feynman-feedback-line', text: line }));
    });
    wrap.appendChild(fb);

    wrap.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
      el('button', {
        className: 'btn btn-primary', text: '再来一组',
        on: { click: function () {
          _feynmanState.challenge = Feynman.generateChallenge(state.currentStage, 20);
          _feynmanState.result = null; renderCurrentView();
        } }
      }),
      el('button', {
        className: 'btn btn-secondary', text: '返回首页',
        on: { click: function () { _feynmanState.challenge = null; _feynmanState.result = null; renderCurrentView(); } }
      })
    ]));
    return wrap;
  }

  function showFeynmanHistory() {
    var history = Feynman.getHistory();
    var overlay = el('div', {
      className: 'modal-overlay',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var modal = el('div', { className: 'card' }, [
      el('div', { className: 'card-title', text: '📜 Feynman 历史记录' })
    ]);
    if (history.length === 0) {
      modal.appendChild(el('p', { className: 'text-muted', text: '还没有提交记录' }));
    } else {
      history.slice().reverse().forEach(function (h) {
        modal.appendChild(el('div', { className: 'feynman-history-item' }, [
          el('div', null, [
            el('strong', { text: h.score + ' 分' }),
            el('span', { className: 'text-muted ml-2', text: new Date(h.timestamp).toLocaleString('zh-CN') })
          ]),
          el('div', { className: 'text-muted', text: '用了 ' + (h.usedWords ? h.usedWords.length : 0) + ' / ' + h.wordCount + ' 词' }),
          el('div', { className: 'text-muted feynman-history-text', text: h.text.slice(0, 100) + (h.text.length > 100 ? '…' : '') })
        ]));
      });
    }
    modal.appendChild(el('div', { className: 'mt-3' }, [
      el('button', { className: 'btn btn-secondary', text: '关闭', on: { click: function () { document.body.removeChild(overlay); } } })
    ]));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ============================================================
  // ============ Collocations 搭配练习 =========================
  // ============================================================
  var _collState = { quiz: null, idx: 0, answers: [], finished: false };

  function renderCollocations() {
    var wrapper = el('div', { className: 'collocations-view' });
    wrapper.appendChild(el('div', { className: 'section-title' }, [
      document.createTextNode('搭配练习 · 词块库 '),
      el('small', { className: 'text-muted', text: '共 ' + Collocations.size() + ' 条' })
    ]));
    if (!_collState.quiz) wrapper.appendChild(renderCollIntro());
    else if (_collState.finished) wrapper.appendChild(renderCollResult(_collState.quiz, _collState.answers));
    else wrapper.appendChild(renderCollQuestion(_collState.quiz, _collState.idx, _collState.answers));
    return wrapper;
  }

  function renderCollIntro() {
    var stage = state.currentStage;
    var pool = Collocations.getByStage(stage);
    return el('div', { className: 'card' }, [
      el('div', { className: 'card-title', text: '🧩 搭配训练' }),
      el('p', { className: 'text-muted', text:
        '本词库 (' + Storage.STAGE_NAMES[stage] + ') 有 ' + pool.length + ' 条搭配。' +
        '每题 4 选 1,完成后给出成绩单。' }),
      el('div', { className: 'flex gap-2 mt-3' }, [
        el('button', { className: 'btn btn-primary', text: '英 → 中(看短语选释义)',
          on: { click: function () { startCollQuiz('en2zh', 10); } } }),
        el('button', { className: 'btn btn-secondary', text: '中 → 英(看释义选短语)',
          on: { click: function () { startCollQuiz('zh2en', 10); } } })
      ]),
      el('div', { className: 'mt-4' }, [
        el('div', { className: 'card-title', text: '📋 常用搭配速查' }),
        el('div', { className: 'coll-list' },
          pool.slice(0, 20).map(function (c) {
            return el('div', { className: 'coll-item' }, [
              el('div', { className: 'coll-phrase', text: c.phrase }),
              el('div', { className: 'coll-trans text-muted', text: c.translation }),
              el('div', { className: 'coll-ex text-muted', text: '例:' + c.example })
            ]);
          })
        )
      ])
    ]);
  }

  function startCollQuiz(mode, n) {
    _collState.quiz = Collocations.getRandomQuiz(n, { stage: state.currentStage, mode: mode });
    _collState.idx = 0; _collState.answers = []; _collState.finished = false;
    if (_collState.quiz.length === 0) { toast('该词库暂无搭配题', 'info'); _collState.quiz = null; return; }
    renderCurrentView();
  }

  function renderCollQuestion(quiz, idx, answers) {
    var q = quiz[idx];
    var wrap = el('div', {});
    wrap.appendChild(el('div', { className: 'text-muted', text: '第 ' + (idx + 1) + ' / ' + quiz.length + ' 题' }));
    wrap.appendChild(el('div', { className: 'coll-question', text: q.question }));
    var opts = el('div', { className: 'coll-options mt-3' });
    q.options.forEach(function (opt, i) {
      opts.appendChild(el('button', {
        className: 'coll-option', text: opt,
        on: { click: function () {
          var correct = i === q.correctIndex;
          answers[idx] = { picked: i, correct: correct };
          if (idx + 1 >= quiz.length) _collState.finished = true;
          else _collState.idx = idx + 1;
          renderCurrentView();
        } }
      }));
    });
    wrap.appendChild(opts);
    return wrap;
  }

  function renderCollResult(quiz, answers) {
    var correct = answers.filter(function (a) { return a && a.correct; }).length;
    var pct = Math.round(correct / quiz.length * 100);
    var wrap = el('div', {});
    wrap.appendChild(el('div', { className: 'coll-score', text: pct + ' 分' }));
    wrap.appendChild(el('p', { className: 'text-muted', text: '答对 ' + correct + ' / ' + quiz.length + ' 题' }));
    var list = el('div', { className: 'coll-result-list mt-3' });
    quiz.forEach(function (q, i) {
      var a = answers[i];
      list.appendChild(el('div', { className: 'coll-result-item' }, [
        el('div', null, [
          el('span', { className: a && a.correct ? 'tag success' : 'tag danger', text: a && a.correct ? '✓' : '✗' }),
          el('span', { className: 'ml-2', text: q.phrase }),
          el('span', { className: 'text-muted', text: ' = ' + q.translation })
        ]),
        el('div', { className: 'text-muted mt-1', text: q.explanation })
      ]));
    });
    wrap.appendChild(list);
    wrap.appendChild(el('div', { className: 'flex gap-2 mt-3' }, [
      el('button', { className: 'btn btn-primary', text: '再来一组',
        on: { click: function () { startCollQuiz(quiz[0].mode, 10); } } }),
      el('button', { className: 'btn btn-secondary', text: '返回',
        on: { click: function () { _collState.quiz = null; renderCurrentView(); } } })
    ]));
    return wrap;
  }

  // ---------- Init ----------
  async function init() {
    await Auth.init();

    if (!Auth.isLoggedIn()) {
      // 没会话但有保存密码 → 静默重登
      if (Auth.hasSavedPassword()) {
        try {
          await Auth.silentLogin();
          if (Auth.isLoggedIn()) {
            await bootApp();
            return;
          }
        } catch (e) {
          // 静默登录失败(密码改过等),落到登录页
          Auth.clearSavedPassword();
        }
      }
      showLogin();
      Auth.onChange(function (user) {
        if (user) {
          hideLogin();
          bootApp();
        }
      });
      return;
    }

    await bootApp();
  }

  async function bootApp() {
    state.currentStage = Storage.getCurrentStage();
    await loadStage(state.currentStage);

    if (window.StudyLists && StudyLists.pullFromBackend) {
      try { await StudyLists.pullFromBackend(); } catch (e) { console.warn('pullFromBackend failed', e); }
    }

    renderTopbar();

    // Status bar
    var statusBar = document.getElementById('status-bar');
    if (statusBar) {
      statusBar.innerHTML = '<span><span class="dot"></span>当前词库:' +
        Storage.STAGE_NAMES[state.currentStage] + '</span><span>v' + APP_VERSION + '</span>';
    }

    // Stage select handler
    var stageSel = document.getElementById('stage-select');
    if (stageSel) {
      stageSel.addEventListener('change', function (e) {
        switchStage(e.target.value);
      });
    }

    // Hash routing
    window.removeEventListener('hashchange', onHashChange);
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.location.hash = '#/home';
    state.currentRoute = parseRoute();

    renderCurrentView();
    toast('词库加载完成', 'success');
  }

  function showLogin() {
    var topbar = document.querySelector('.topbar');
    var main = document.getElementById('view-container');
    var status = document.getElementById('status-bar');
    var loginBox = document.getElementById('login-container');
    if (topbar) topbar.style.display = 'none';
    if (main) main.style.display = 'none';
    if (status) status.style.display = 'none';
    if (loginBox) {
      loginBox.hidden = false;
      LoginView.render(loginBox);
    }
    document.body.classList.add('logged-out');
  }

  function hideLogin() {
    var topbar = document.querySelector('.topbar');
    var main = document.getElementById('view-container');
    var status = document.getElementById('status-bar');
    var loginBox = document.getElementById('login-container');
    if (topbar) topbar.style.display = '';
    if (main) main.style.display = '';
    if (status) status.style.display = '';
    if (loginBox) {
      loginBox.hidden = true;
      loginBox.innerHTML = '';
    }
    document.body.classList.remove('logged-out');
  }

  global.App = {
    init: init,
    state: state,
    navigate: navigate,
    switchStage: switchStage,
    startStudy: startStudy,
    startReciteMode: startReciteMode,
    startTestMode: startTestMode,
    speak: speak,
    toast: toast,
    renderCurrentView: renderCurrentView,
    logout: async function () {
      try { await Auth.logout(); } catch (e) {}
      showLogin();
      window.location.hash = '#/login';
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);