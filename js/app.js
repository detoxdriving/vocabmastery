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

  var APP_VERSION = '2.4.0';
  var BUILD_TAG = '2025-11-07-cache-bust';
  var ROUTES = ['home', 'study', 'stats', 'history', 'lists', 'list', 'browse', 'word', 'session', 'review', 'palace', 'reading', 'feynman', 'collocations', 'recite', 'wrongbook', 'test'];
  // 主导航 tab (topbar 显示的精简入口)
  var PRIMARY_TABS = [
    { route: 'home',   title: '主页' },
    { route: 'study',  title: '学习' },
    { route: 'review', title: '复习' },
    { route: 'wrongbook', title: '错题本' }
  ];
  var ROUTE_TITLES = {
    home: '主页',
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
      safeRender('study', renderLearning);
    } else if (route === 'review') {
      safeRender('review', renderReviewHub);
    } else if (route === 'history') {
      var p = parseRouteParams();
      if (p.params[0]) {
        safeRender('history-detail', function () {
          return renderHistoryDetail(p.params[0]);
        });
      } else {
        safeRender('history', renderHistory);
      }
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
    } else if (route === 'test') {
      safeRender('test', renderTestLanding);
    } else if (route === 'stats') {
      safeRender('stats', renderStats);
    } else {
      container.appendChild(renderPlaceholder('未找到', '🧭', '页面不存在。'));
    }
  }

  // ---------- Home view ----------
  function renderHome() {
    var stage = state.currentStage;
    var vocab = Storage.getVocab(stage);
    var totalWords = vocab && vocab.words ? vocab.words.length : 0;
    var isSample = vocab && vocab.isSample;
    var stageLabel = Storage.STAGE_NAMES[stage] || stage;

    var wrapper = el('div', { className: 'home-view' });

    // 顶部精简:只剩学期标题 + 同步状态 + 统计卡
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('h2', { text: '🏠 主页 · ' + stageLabel }),
      el('span', { className: 'small text-muted',
        text: (isSample ? '示例数据 · ' : '') + '共 ' + totalWords + ' 词' })
    ]));

    // ---------- 同步状态条 ----------
    var isLoggedIn = window.Auth && Auth.isLoggedIn && Auth.isLoggedIn();
    var savedPwd = window.Auth && Auth.hasSavedPassword && Auth.hasSavedPassword();
    var hasBackend = !!window.BackendSync;
    var localListCount = (window.StudyLists && StudyLists.getAllLists) ? StudyLists.getAllLists().length : 0;
    var dirtyCount = 0;
    if (window.StudyLists && StudyLists.getAllLists) {
      StudyLists.getAllLists().forEach(function (l) { if (l._localDirty) dirtyCount++; });
    }
    var statusCls, statusTxt, statusDesc;
    if (!isLoggedIn) {
      statusCls = 'sync-status-bad';
      statusTxt = '🔒 未登录(数据仅本地,不同步)';
      statusDesc = '点击右上角 [退出/登录] 入口登录后,所有清单会自动同步到云端,电脑与手机通用。';
    } else if (!hasBackend) {
      statusCls = 'sync-status-warn';
      statusTxt = '⚠️ 已登录但后端未加载';
    } else {
      statusCls = 'sync-status-ok';
      statusTxt = '☁️ 已登录云端同步 · ' + localListCount + ' 清单' +
        (dirtyCount > 0 ? ' · ' + dirtyCount + ' 待上推' : '');
      statusDesc = '可点击下方手动同步按钮,立即把本地变更推到云端,并把云端最新数据拉回来。';
    }
    var syncRow = el('div', { className: 'sync-status-bar ' + statusCls }, [
      el('div', { className: 'sync-status-info' }, [
        el('div', { className: 'sync-status-title', text: statusTxt }),
        el('div', { className: 'sync-status-desc text-muted', text: statusDesc })
      ]),
      el('div', { className: 'sync-status-actions' }, [
        el('button', {
          className: 'btn btn-secondary btn-sm',
          text: '🔄 立即同步',
          disabled: !isLoggedIn,
          on: { click: function () { manualSync(); } }
        }),
        el('button', {
          className: 'btn btn-ghost btn-sm',
          text: '🛠 数据管理',
          on: { click: function () { openDataModal(); } }
        })
      ])
    ]);
    wrapper.appendChild(syncRow);

    // 本学期统计卡(直接显示,不再做智能推荐)
    var statsCard = renderHomeStats(stage);
    wrapper.appendChild(statsCard);

    // 最近清单(本学期前 5 个,作为简短的快速入口)
    var recentList = (window.StudyLists ? StudyLists.getAllLists().filter(function (l) { return l.stage === stage; }) : []).slice(0, 5);
    if (recentList.length > 0) {
      var listBox = el('div', { className: 'home-list-box glass' });
      listBox.appendChild(el('div', { className: 'section-title', text: '📋 本学期清单' }));
      recentList.forEach(function (l) {
        var learnedCount = 0;
        try { if (window.StudyLists && StudyLists.getStudiedWordIds) learnedCount = StudyLists.getStudiedWordIds(l.id).length; } catch (e) {}
        listBox.appendChild(el('div', { className: 'home-list-row' }, [
          el('div', { className: 'home-list-name', text: l.name || '(未命名)' }),
          el('div', { className: 'home-list-meta text-muted',
            text: (l.wordIds || []).length + ' 词 · 已学 ' + learnedCount }),
          el('button', {
            className: 'btn btn-secondary btn-sm',
            text: '📖 进入',
            on: { click: function () { navigate('list/' + l.id); } }
          })
        ]));
      });
      listBox.appendChild(el('div', { className: 'home-list-more' }, [
        el('button', { className: 'btn btn-ghost btn-sm', text: '查看全部 →',
          on: { click: function () { navigate('lists'); } } })
      ]));
      wrapper.appendChild(listBox);
    }

    return wrapper;
  }

  // 主页统计摘要卡 — 4-5 个数字直接呈现本学期情况
  function renderHomeStats(stage) {
    var vocab = Storage.getVocab(stage);
    var totalWords = vocab && vocab.words ? vocab.words.length : 0;

    // 复用 pick 的状态聚合逻辑
    var learnedSet = {}, testedSet = {}, passedSet = {}, failedSet = {}, wrongSet = {};
    if (window.StudyLists) {
      var stageLists = StudyLists.getAllLists().filter(function (l) { return l.stage === stage; });
      stageLists.forEach(function (l) {
        try { StudyLists.getStudiedWordIds(l.id).forEach(function (id) { learnedSet[id] = true; }); } catch (e) {}
        try {
          var last = StudyLists.getLastTestSession(l.id);
          if (last) {
            var wrongMap = {};
            (last.wrongWordIds || []).forEach(function (id) { wrongMap[id] = true; });
            (l.wordIds || []).forEach(function (id) {
              testedSet[id] = true;
              if (wrongMap[id]) { failedSet[id] = true; wrongSet[id] = true; }
              else passedSet[id] = true;
            });
          }
        } catch (e) {}
      });
    }
    if (window.WrongBook && WrongBook.getAll) {
      try {
        WrongBook.getAll(stage).forEach(function (it) {
          if (it && it.wordId != null) wrongSet[it.wordId] = true;
        });
      } catch (e) {}
    }

    var learned = 0, passed = 0, failed = 0, unlearned = 0;
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) {
        if (learnedSet[w.id]) {
          learned++;
          if (passedSet[w.id]) passed++;
          if (failedSet[w.id]) failed++;
        } else {
          unlearned++;
        }
      });
    }
    var wrongCount = Object.keys(wrongSet).length;
    var testedCount = passed + failed;

    function numCard(num, label, color) {
      return el('div', { className: 'home-stat-item ' + (color || '') }, [
        el('div', { className: 'home-stat-num', text: String(num) }),
        el('div', { className: 'home-stat-label', text: label })
      ]);
    }

    return el('div', { className: 'home-stats-card glass' }, [
      el('div', { className: 'home-stats-title',
        text: '📊 本学期统计 · ' + (Storage.STAGE_NAMES[stage] || stage) }),
      el('div', { className: 'home-stats-grid' }, [
        numCard(totalWords, '总词数'),
        numCard(unlearned, '未学', 'gray'),
        numCard(learned, '已学', 'blue'),
        numCard(passed + ' / ' + testedCount, '通过 / 已考', 'green'),
        numCard(wrongCount, '错题本', wrongCount > 0 ? 'red' : ''),
        numCard(stageLists.length, '清单数')
      ])
    ]);
  }

  function renderHomeListBox(stage) {
    var wrap = el('div', { className: 'home-list-box glass' });
    var allLists = window.StudyLists ? StudyLists.getAllLists() : [];
    var stageLists = allLists.filter(function (l) { return l.stage === stage; });
    if (stageLists.length === 0) {
      wrap.appendChild(el('div', { className: 'empty-msg', text: '本学期还没有清单。点上方「📚 挑词 → 创建清单」开始。' }));
      return wrap;
    }
    stageLists.slice(0, 6).forEach(function (l) {
      var learnedCount = 0;
      if (window.StudyLists) {
        var ids = StudyLists.getStudiedWordIds(l.id);
        learnedCount = ids.length;
      }
      var row = el('div', { className: 'home-list-row' }, [
        el('div', { className: 'home-list-name', text: l.name || '(未命名)' }),
        el('div', { className: 'home-list-meta text-muted',
          text: (l.wordIds || []).length + ' 词 · 已学 ' + learnedCount }),
        el('button', {
          className: 'btn btn-secondary btn-sm',
          text: '📖 进入',
          on: { click: function () { navigate('list/' + l.id); } }
        })
      ]);
      wrap.appendChild(row);
    });
    if (stageLists.length > 6) {
      wrap.appendChild(el('div', { className: 'home-list-more' }, [
        el('button', {
          className: 'btn btn-ghost btn-sm', text: '查看全部 ' + stageLists.length + ' 个清单 →',
          on: { click: function () { navigate('lists'); } }
        })
      ]));
    }
    return wrap;
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
  // 学习页:本学期学习清单 + 可挑选的未学单词 → 创建清单 / 直接考核
  function renderLearning() {
    var stage = state.currentStage;
    var stageLabel = Storage.STAGE_NAMES[stage] || stage;
    state.learnGrade = state.learnGrade || 'all';
    state.learnSelected = state.learnSelected || [];

    var grades = (window.WordBrowser && WordBrowser.getStageGrades)
      ? WordBrowser.getStageGrades(stage)
      : [{ value: 'all', label: '全部学期' }];
    var allWords = getStageWords();

    // 已学 word 集合 (跨清单聚合)
    var learnedSet = {};
    if (window.StudyLists) {
      var lists = StudyLists.getAllLists().filter(function (l) { return l.stage === stage; });
      lists.forEach(function (l) {
        try {
          if (StudyLists.getStudiedWordIds) {
            StudyLists.getStudiedWordIds(l.id).forEach(function (id) { learnedSet[id] = true; });
          }
        } catch (e) {}
      });
    }

    // 当前学期的所有清单(无论是否已考过)
    var stageLists = window.StudyLists ? StudyLists.getAllLists().filter(function (l) { return l.stage === stage; }) : [];

    // 学期级别的单词
    var gradeWords = state.learnGrade === 'all'
      ? allWords
      : allWords.filter(function (w) { return w.grade === state.learnGrade; });

    // 只显示未学
    var unlearnedWords = gradeWords.filter(function (w) { return !learnedSet[w.id]; });

    var wrapper = el('div', { className: 'learning-view' });

    // 顶部
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { state.learnSelected = []; navigate('home'); } } }),
      el('h2', { text: '📚 学习' }),
      el('span', { className: 'small text-muted',
        text: stageLabel + ' · 未学 ' + unlearnedWords.length + ' 词' })
    ]));

    // 第一块:本学期学习清单(无论是否已考过)
    wrapper.appendChild(el('div', { className: 'section' }, [
      el('div', { className: 'section-title',
        html: '本学期学习清单 <small>点进入可学 / 可考核</small>' }),
      renderLearningListsBox(stageLists, learnedSet)
    ]));

    // 第二块:可挑选的未学单词
    wrapper.appendChild(el('div', { className: 'section' }, [
      el('div', { className: 'section-title',
        html: '未学单词 <small>勾选后建清单或直接考核</small>' }),
      renderLearningUnlearnedBox(unlearnedWords, grades, stage)
    ]));

    return wrapper;
  }

  // 学习清单区
  function renderLearningListsBox(stageLists, learnedSet) {
    var wrap = el('div', { className: 'learning-list-box glass' });
    if (!stageLists || stageLists.length === 0) {
      wrap.appendChild(el('div', { className: 'empty-msg',
        text: '本学期还没有清单。在下面未学词里勾选 → 创建清单即可。' }));
      return wrap;
    }
    stageLists.forEach(function (l) {
      var learnedCount = 0;
      try {
        if (window.StudyLists) {
          (StudyLists.getStudiedWordIds ? StudyLists.getStudiedWordIds(l.id) : []).forEach(function () { learnedCount++; });
        }
      } catch (e) {}
      var last = window.StudyLists ? StudyLists.getLastTestSession(l.id) : null;
      var testStat = last
        ? '已考 · ' + Math.round((last.score || 0)) + '分'
        : '未考';
      var row = el('div', { className: 'learning-list-row' }, [
        el('div', { className: 'learning-list-main' }, [
          el('div', { className: 'learning-list-name', text: l.name || '(未命名)' }),
          el('div', { className: 'learning-list-meta text-muted',
            text: (l.wordIds || []).length + ' 词 · 已学 ' + learnedCount + ' · ' + testStat })
        ]),
        el('div', { className: 'learning-list-actions' }, [
          el('button', {
            className: 'btn btn-secondary btn-sm',
            text: '📖 学习',
            on: { click: function () { navigate('list/' + l.id); } }
          }),
          el('button', {
            className: 'btn btn-primary btn-sm',
            text: '📝 考核',
            on: { click: function () {
              if (window.StudyListsView && StudyListsView.startListTest) {
                StudyListsView.startListTest(l, { scope: 'list', stage: state.currentStage, grade: 'all' });
              } else {
                navigate('list/' + l.id);
              }
            } }
          })
        ])
      ]);
      wrap.appendChild(row);
    });
    return wrap;
  }

  // 未学单词挑选区
  function renderLearningUnlearnedBox(unlearnedWords, grades, stage) {
    var wrap = el('div', { className: 'learning-unlearned-wrap' });
    var selectedSet = new Set(state.learnSelected);
    var listContainer = el('div', { className: 'pick-list-container' });
    wrap.appendChild(listContainer);

    // 学期 selector + 清空
    var filterRow = el('div', { className: 'pick-filter-row' }, [
      (function () {
        var s = el('select', {
          className: 'form-input',
          on: { change: function (e) {
            state.learnGrade = e.target.value;
            rerender();
          } }
        });
        grades.forEach(function (g) {
          var opt = el('option', { text: g.label });
          opt.value = g.value;
          if (g.value === state.learnGrade) opt.selected = true;
          s.appendChild(opt);
        });
        return s;
      })(),
      el('span', { className: 'text-muted small',
        text: ' · 共 ' + unlearnedWords.length + ' 词' })
    ]);
    wrap.insertBefore(filterRow, listContainer);

    function renderList() {
      listContainer.innerHTML = '';
      if (unlearnedWords.length === 0) {
        listContainer.appendChild(el('div', { className: 'view-placeholder' }, [
          el('div', { className: 'emoji', text: '🎉' }),
          el('h2', { text: '当前学期没有未学词!' }),
          el('p', { text: '所有单词都已学过。' })
        ]));
        return;
      }
      // 默认顺序按 grade + id,只显示前 200 条避免一次渲染过慢
      var visible = unlearnedWords.slice(0, 200);
      visible.forEach(function (w, idx) {
        var checked = selectedSet.has(w.id);
        var row = el('label', { className: 'pick-row' + (checked ? ' selected' : '') }, [
          el('input', {
            attrs: { type: 'checkbox' },
            on: {
              change: function (e) {
                if (e.target.checked) {
                  if (!selectedSet.has(w.id)) state.learnSelected.push(w.id);
                  selectedSet.add(w.id);
                } else {
                  state.learnSelected = state.learnSelected.filter(function (x) { return x !== w.id; });
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
              el('span', { className: 'pick-row-text', text: w.word || '' }),
              w.pos ? el('span', { className: 'pick-row-pos', text: w.pos }) : null,
              el('span', { className: 'pick-badge pick-badge-unlearned', text: '未学' })
            ]),
            el('div', { className: 'pick-row-trans', text: w.translation || '' })
          ])
        ]);
        if (checked) {
          var cb = row.querySelector('input[type=checkbox]');
          if (cb) cb.checked = true;
        }
        listContainer.appendChild(row);
      });
      if (unlearnedWords.length > visible.length) {
        listContainer.appendChild(el('div', { className: 'text-muted small mt-2',
          text: '还有 ' + (unlearnedWords.length - visible.length) + ' 词未显示,请切换学期缩小范围。' }));
      }
    }
    renderList();

    // 底部 action bar
    var stepBar = el('div', { className: 'pick-action-bar' });
    wrap.appendChild(stepBar);

    function updateBar() {
      stepBar.innerHTML = '';
      var n = state.learnSelected.length;
      if (n === 0) {
        stepBar.appendChild(el('div', { className: 'pick-empty-hint' }, [
          el('div', { className: 'pick-empty-icon', text: '👆' }),
          el('p', { text: '勾选未学单词,然后建清单或直接考核' })
        ]));
        return;
      }
      stepBar.appendChild(el('div', { className: 'pick-action-row' }, [
        el('button', {
          className: 'btn btn-primary btn-lg',
          text: '📋 创建清单 (' + n + ')',
          on: { click: createLearningList }
        }),
        el('button', {
          className: 'btn btn-secondary btn-lg',
          text: '📝 直接考核 (' + n + ')',
          on: { click: startLearningTest }
        }),
        el('button', {
          className: 'btn btn-ghost btn-sm',
          text: '清空',
          on: { click: function () {
            state.learnSelected = [];
            selectedSet.clear();
            updateBar();
            renderList();
          } }
        })
      ]));
    }
    function rerender() {
      var container = wrap.parentNode;
      if (!container) return;
      container.innerHTML = '';
      container.appendChild(renderLearning());
    }
    updateBar();
    return wrap;
  }

  function createLearningList() {
    var ids = (state.learnSelected || []).slice();
    if (ids.length === 0) { toast('请先勾选单词', 'error'); return; }
    var name = buildAutoListName(state.currentStage);
    var list = StudyLists.createList({
      name: name, stage: state.currentStage, wordIds: ids
    });
    state.learnSelected = [];
    navigate('list/' + list.id);
    toast('已创建「' + name + '」', 'success');
  }

  function startLearningTest() {
    var ids = (state.learnSelected || []).slice();
    if (ids.length === 0) { toast('请先勾选单词', 'error'); return; }
    var name = '快速考核 ' + Storage.STAGE_NAMES[state.currentStage];
    var list = StudyLists.createList({
      name: name, stage: state.currentStage, wordIds: ids
    });
    state.learnSelected = [];
    if (window.StudyListsView && StudyListsView.startListTest) {
      StudyListsView.startListTest(list, { scope: 'list', stage: state.currentStage, grade: 'all' });
    } else {
      navigate('list/' + list.id);
    }
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

  // 已选词 → 创建临时清单 → 立即进入 4 维考核
  function startTestFromPick() {
    var ids = (state.pickSelected || []).slice();
    if (ids.length === 0) {
      toast('请先勾选单词', 'error');
      return;
    }
    var name = '快速考核 ' + Storage.STAGE_NAMES[state.currentStage] + ' ' + new Date().toLocaleString('zh-CN', { hour12: false });
    var list = StudyLists.createList({
      name: name, stage: state.currentStage, wordIds: ids
    });
    state.pickSelected = [];
    if (window.StudyListsView && StudyListsView.startListTest) {
      toast('已创建「' + name + '」,进入 4 维考核', 'success');
      StudyListsView.startListTest(list, { scope: 'list', stage: state.currentStage, grade: 'all' });
    } else {
      navigate('list/' + list.id);
    }
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
  // 复习考核入口
  // 两段式:复习清单 + 可挑选单词
  function renderReviewHub() {
    var stage = state.currentStage;
    var stageLabel = Storage.STAGE_NAMES[stage] || stage;
    state.reviewGrade = state.reviewGrade || 'all';
    state.reviewSelected = state.reviewSelected || [];

    var allWords = getStageWords();

    // 当前学期所有清单 + 各自的"已通过词"
    var allLists = window.StudyLists ? StudyLists.getAllLists() : [];
    var stageLists = allLists.filter(function (l) { return l.stage === stage; });
    var passedSet = {};        // 全学期已通过 wordId 集合
    var listsPassedWords = {}; // listId -> { name, wordIds, passedIds, tested, lastScore }
    stageLists.forEach(function (l) {
      var pset = {};
      try {
        if (window.StudyLists && StudyLists.getPassedWordIds) {
          StudyLists.getPassedWordIds(l.id).forEach(function (id) { pset[id] = true; });
        }
      } catch (e) {}
      var last = window.StudyLists ? StudyLists.getLastTestSession(l.id) : null;
      listsPassedWords[l.id] = {
        name: l.name,
        wordIds: l.wordIds || [],
        passedIds: Object.keys(pset),
        tested: !!last,
        lastScore: last ? (last.score || 0) : 0
      };
      Object.keys(pset).forEach(function (id) { passedSet[id] = true; });
    });

    // 当前学期已通过的单词(可挑选)
    var passedWords = allWords.filter(function (w) { return passedSet[w.id]; });

    var wrapper = el('div', { className: 'review-hub-view' });

    // 顶部
    wrapper.appendChild(el('div', { className: 'back-bar' }, [
      el('button', { className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { state.reviewSelected = []; navigate('home'); } } }),
      el('h2', { text: '🔁 复习' }),
      el('span', { className: 'small text-muted',
        text: stageLabel + ' · 已通过 ' + passedWords.length + ' 词' })
    ]));

    // 第一段:复习清单(已考核通过的清单)
    wrapper.appendChild(el('div', { className: 'section' }, [
      el('div', { className: 'section-title',
        html: '复习清单 <small>已考核通过的清单 · 一键进入复习</small>' }),
      renderReviewListsBox(stageLists, listsPassedWords, stage)
    ]));

    // 第二段:可挑选的已通过单词
    wrapper.appendChild(el('div', { className: 'section' }, [
      el('div', { className: 'section-title',
        html: '可挑选单词 <small>勾选已通过的单词,组成复习组</small>' }),
      renderReviewPickerBox(passedWords, stage)
    ]));

    return wrapper;
  }

  // 复习清单区
  function renderReviewListsBox(stageLists, listsPassedWords, stage) {
    var wrap = el('div', { className: 'review-list-box glass' });
    var reviewable = stageLists.filter(function (l) {
      var info = listsPassedWords[l.id];
      return info && info.tested && info.passedIds.length > 0;
    });
    if (reviewable.length === 0) {
      wrap.appendChild(el('div', { className: 'empty-msg',
        text: '本学期还没有已考核通过的清单。先到「学习」页去学习并考核,通过的清单会出现在这里。' }));
      return wrap;
    }
    reviewable.forEach(function (l) {
      var info = listsPassedWords[l.id];
      var row = el('div', { className: 'review-list-row' }, [
        el('div', { className: 'review-list-main' }, [
          el('div', { className: 'review-list-name', text: l.name || '(未命名)' }),
          el('div', { className: 'review-list-meta text-muted',
            text: '已通过 ' + info.passedIds.length + ' 词 · 上次 ' + info.lastScore + ' 分' })
        ]),
        el('div', { className: 'review-list-actions' }, [
          el('button', {
            className: 'btn btn-secondary btn-sm',
            text: '📖 学习',
            on: { click: function () { navigate('list/' + l.id); } }
          }),
          el('button', {
            className: 'btn btn-primary btn-sm',
            text: '🔁 复习',
            on: { click: function () {
              if (window.StudyListsView && StudyListsView.startListTest) {
                StudyListsView.startListTest(l, { scope: 'list', stage: stage, grade: 'all' });
              } else {
                navigate('list/' + l.id);
              }
            } }
          })
        ])
      ]);
      wrap.appendChild(row);
    });
    return wrap;
  }

  // 复习页:可挑选的已通过单词
  function renderReviewPickerBox(passedWords, stage) {
    var wrap = el('div', { className: 'review-picker-wrap' });
    var selectedSet = new Set(state.reviewSelected);
    var listContainer = el('div', { className: 'pick-list-container' });

    var filterRow = el('div', { className: 'pick-filter-row' }, [
      el('input', {
        className: 'form-input',
        attrs: { type: 'text', placeholder: '🔍 搜索单词/释义…' },
        on: { input: function (e) { state.reviewKeyword = e.target.value; renderList(); } }
      }),
      el('span', { className: 'text-muted small', id: 'review-pick-count-text',
        text: '共 ' + passedWords.length + ' 词' })
    ]);
    wrap.appendChild(filterRow);
    wrap.appendChild(listContainer);

    function renderList() {
      listContainer.innerHTML = '';
      var keyword = (state.reviewKeyword || '').toLowerCase();
      var visible = passedWords.filter(function (w) {
        if (!keyword) return true;
        return (w.word && w.word.toLowerCase().indexOf(keyword) >= 0) ||
               (w.translation && w.translation.toLowerCase().indexOf(keyword) >= 0);
      });
      if (visible.length === 0) {
        listContainer.appendChild(el('div', { className: 'view-placeholder' }, [
          el('div', { className: 'emoji', text: '🔍' }),
          el('p', { text: keyword ? '没有匹配的已通过单词' : '当前学期还没有已通过单词' })
        ]));
        return;
      }
      visible.slice(0, 200).forEach(function (w) {
        var checked = selectedSet.has(w.id);
        var row = el('label', { className: 'pick-row' + (checked ? ' selected' : '') }, [
          el('input', {
            attrs: { type: 'checkbox' },
            on: {
              change: function (e) {
                if (e.target.checked) {
                  if (!selectedSet.has(w.id)) state.reviewSelected.push(w.id);
                  selectedSet.add(w.id);
                } else {
                  state.reviewSelected = state.reviewSelected.filter(function (x) { return x !== w.id; });
                  selectedSet.delete(w.id);
                }
                row.classList.toggle('selected', selectedSet.has(w.id));
                updateBar();
              }
            }
          }),
          el('div', { className: 'pick-row-main' }, [
            el('div', { className: 'pick-row-word' }, [
              el('span', { className: 'pick-row-text', text: w.word || '' }),
              w.pos ? el('span', { className: 'pick-row-pos', text: w.pos }) : null,
              el('span', { className: 'pick-badge pick-badge-passed', text: '已通过' })
            ]),
            el('div', { className: 'pick-row-trans', text: w.translation || '' })
          ])
        ]);
        if (checked) {
          var cb = row.querySelector('input[type=checkbox]');
          if (cb) cb.checked = true;
        }
        listContainer.appendChild(row);
      });
      if (visible.length > 200) {
        listContainer.appendChild(el('div', { className: 'text-muted small mt-2',
          text: '还有 ' + (visible.length - 200) + ' 词未显示,请用搜索框过滤。' }));
      }
    }
    renderList();

    // 底部 action bar
    var stepBar = el('div', { className: 'pick-action-bar' });
    function updateBar() {
      stepBar.innerHTML = '';
      var n = state.reviewSelected.length;
      if (n === 0) {
        stepBar.appendChild(el('div', { className: 'pick-empty-hint' }, [
          el('div', { className: 'pick-empty-icon', text: '👆' }),
          el('p', { text: '勾选已通过单词,然后建清单复习或直接复习' })
        ]));
        return;
      }
      stepBar.appendChild(el('div', { className: 'pick-action-row' }, [
        el('button', {
          className: 'btn btn-primary btn-lg',
          text: '📋 创建清单 (' + n + ')',
          on: { click: createReviewList }
        }),
        el('button', {
          className: 'btn btn-secondary btn-lg',
          text: '🔁 直接复习 (' + n + ')',
          on: { click: startReviewTest }
        }),
        el('button', {
          className: 'btn btn-ghost btn-sm',
          text: '清空',
          on: { click: function () {
            state.reviewSelected = [];
            selectedSet.clear();
            updateBar();
            renderList();
          } }
        })
      ]));
    }
    wrap.appendChild(stepBar);
    updateBar();
    return wrap;
  }

  function createReviewList() {
    var ids = (state.reviewSelected || []).slice();
    if (ids.length === 0) { toast('请先勾选单词', 'error'); return; }
    var name = buildAutoListName(state.currentStage) + ' 复习';
    var list = StudyLists.createList({
      name: name, stage: state.currentStage, wordIds: ids
    });
    state.reviewSelected = [];
    navigate('list/' + list.id);
    toast('已创建「' + name + '」', 'success');
  }

  function startReviewTest() {
    var ids = (state.reviewSelected || []).slice();
    if (ids.length === 0) { toast('请先勾选单词', 'error'); return; }
    var name = '复习组 ' + Storage.STAGE_NAMES[state.currentStage] + ' ' + new Date().toLocaleString('zh-CN', { hour12: false });
    var list = StudyLists.createList({
      name: name, stage: state.currentStage, wordIds: ids
    });
    state.reviewSelected = [];
    if (window.StudyListsView && StudyListsView.startListTest) {
      StudyListsView.startListTest(list, { scope: 'list', stage: state.currentStage, grade: 'all' });
    } else {
      navigate('list/' + list.id);
    }
  }

  function buildReviewModeCard(opts) {
    var card = el('div', { className: 'review-mode-card glass' + (opts.count === 0 ? ' disabled' : '') });
    card.appendChild(el('div', { className: 'review-mode-icon', text: opts.icon }));
    card.appendChild(el('div', { className: 'review-mode-title', text: opts.title }));
    card.appendChild(el('div', { className: 'review-mode-desc text-muted', text: opts.desc }));
    card.appendChild(el('div', { className: 'review-mode-count' }, [
      el('div', { className: 'review-mode-count-num', text: String(opts.count) }),
      el('div', { className: 'review-mode-count-label', text: opts.countLabel || '词' })
    ]));
    if (opts.count === 0) {
      card.appendChild(el('div', { className: 'review-mode-empty',
        text: '暂无数据,先去清单学习考核' }));
      return card;
    }
    if (opts.filters && opts.filters.length > 1) {
      var sel = el('select', { className: 'form-input' });
      opts.filters.forEach(function (g) {
        var o = el('option', { text: g.label });
        o.value = g.value;
        sel.appendChild(o);
      });
      sel.value = 'all';
      card.appendChild(el('label', { className: 'small text-muted', text: '学期范围' }));
      card.appendChild(sel);
      card.appendChild(el('button', {
        className: 'btn btn-primary mt-2',
        text: opts.actionText,
        on: { click: function () { opts.onStart(sel.value); } }
      }));
    } else {
      card.appendChild(el('button', {
        className: 'btn btn-primary mt-2',
        text: opts.actionText,
        on: { click: function () { opts.onStart('all'); } }
      }));
    }
    return card;
  }

  // 已通过清单 picker
  function showListPicker(stage, listsPassedWords) {
    var choices = Object.keys(listsPassedWords)
      .filter(function (k) { return listsPassedWords[k].tested; })
      .map(function (k) {
        var info = listsPassedWords[k];
        return { id: k, name: info.name, passed: info.passedIds.length, total: (info.wordIds || []).length };
      });
    if (choices.length === 0) {
      toast('还没有已考核通过的清单', 'info');
      return;
    }
    var overlay = el('div', { className: 'modal-overlay',
      style: 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var modal = el('div', { className: 'card', style: 'max-width:520px;width:100%;max-height:80vh;overflow:auto;' });
    modal.appendChild(el('div', { className: 'card-title', text: '选择清单进行复习' }));
    choices.forEach(function (c) {
      var row = el('div', { className: 'picker-row' }, [
        el('div', { className: 'picker-row-name', text: c.name }),
        el('div', { className: 'picker-row-meta text-muted', text: '已通过 ' + c.passed + ' / ' + c.total + ' 词' }),
        el('button', {
          className: 'btn btn-primary btn-sm',
          text: '复习',
          on: { click: function () {
            document.body.removeChild(overlay);
            var list = StudyLists.getList(c.id);
            if (list) StudyListsView.startListTest(list, { scope: 'list', stage: stage, grade: 'all' });
          } }
        })
      ]);
      modal.appendChild(row);
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // 单个单词 picker(从已学已过词中多选,创建一次性清单进行复习)
  function showWordPicker(stage, passedSet) {
    var vocab = Storage.getVocab(stage);
    var all = vocab && vocab.words ? vocab.words : [];
    var passIds = Object.keys(passedSet);
    var passedWords = all.filter(function (w) { return passedSet[w.id]; });

    var overlay = el('div', { className: 'modal-overlay',
      style: 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;',
      on: { click: function (e) { if (e.target === overlay) document.body.removeChild(overlay); } }
    });
    var modal = el('div', { className: 'card', style: 'max-width:560px;width:100%;max-height:85vh;overflow:auto;' });
    modal.appendChild(el('div', { className: 'card-title', text: '选择单词进行复习' }));
    modal.appendChild(el('div', { className: 'text-muted small',
      text: '当前共 ' + passedWords.length + ' 个已学已过的单词,勾选需要复习的:' }));

    var selected = {};
    var search = el('input', { className: 'form-input', attrs: { placeholder: '🔍 搜索单词/释义…' } });
    modal.appendChild(search);

    var selectAllRow = el('div', { className: 'picker-actions' }, [
      el('button', { className: 'btn btn-ghost btn-sm', text: '全选',
        on: { click: function () { passedWords.forEach(function (w) { selected[w.id] = true; }); refresh(); } } }),
      el('button', { className: 'btn btn-ghost btn-sm', text: '全不选',
        on: { click: function () { selected = {}; refresh(); } } }),
      el('span', { className: 'text-muted small', id: 'picker-count', text: '已选 0' })
    ]);
    modal.appendChild(selectAllRow);

    var listWrap = el('div', { className: 'picker-words', attrs: { id: 'picker-list' } });
    function refresh() {
      listWrap.innerHTML = '';
      var keyword = (search.value || '').toLowerCase();
      var visible = passedWords.filter(function (w) {
        if (!keyword) return true;
        return (w.word && w.word.toLowerCase().indexOf(keyword) >= 0) ||
               (w.translation && w.translation.toLowerCase().indexOf(keyword) >= 0);
      });
      visible.slice(0, 200).forEach(function (w) {
        var row = el('label', { className: 'picker-word-row' }, [
          el('input', {
            attrs: { type: 'checkbox', checked: selected[w.id] ? 'checked' : null },
            on: { change: function (e) {
              if (e.target.checked) selected[w.id] = true; else delete selected[w.id];
              updateCount();
            } }
          }),
          el('span', { className: 'picker-word-text', text: w.word }),
          el('span', { className: 'picker-word-zh text-muted', text: w.translation || '' })
        ]);
        listWrap.appendChild(row);
      });
      if (visible.length > 200) {
        listWrap.appendChild(el('div', { className: 'text-muted small',
          text: '还有 ' + (visible.length - 200) + ' 个没显示,请用搜索框过滤。' }));
      } else if (visible.length === 0) {
        listWrap.appendChild(el('div', { className: 'empty-msg',
          text: '当前学期没有已学已过的单词' }));
      }
      updateCount();
    }
    function updateCount() {
      var c = Object.keys(selected).length;
      var cnt = document.getElementById('picker-count');
      if (cnt) cnt.textContent = '已选 ' + c;
      var startBtn = document.getElementById('picker-start-btn');
      if (startBtn) startBtn.disabled = c === 0;
    }
    search.addEventListener('input', refresh);
    refresh();
    modal.appendChild(listWrap);

    modal.appendChild(el('div', { className: 'mt-2 flex gap-2' }, [
      el('button', {
        id: 'picker-start-btn', className: 'btn btn-primary',
        text: '🚀 创建临时复习组并开始', disabled: true,
        on: { click: function () {
          var wordIds = Object.keys(selected);
          if (wordIds.length === 0) return;
          var tempList = StudyLists.createList({
            name: '自定义复习 ' + Storage.todayStr(),
            stage: stage, grade: 'all', wordIds: wordIds
          });
          document.body.removeChild(overlay);
          StudyListsView.startListTest(tempList, { scope: 'list', stage: stage, grade: 'all' });
        } }
      }),
      el('button', {
        className: 'btn btn-ghost', text: '取消',
        on: { click: function () { document.body.removeChild(overlay); } }
      })
    ]));

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
      el('button', { className: 'btn btn-ghost', text: '← 主页',
        on: { click: function () { navigate('home'); } } }),
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
      className: 'btn btn-primary', text: '🔁 再来一次',
      on: { click: function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        // 记录本次的模式,允许用户选择重考同样的题
        if (window.App && App.state) App.state.lastTestMode = modeId;
        if (window.App && App.startTestMode) {
          App.startTestMode(modeId);
        } else {
          navigate('test');
        }
      } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-secondary', text: '📋 选其他模式',
      on: { click: function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        navigate('test');
      } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-secondary', text: '查看错题本',
      on: { click: function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        navigate('wrongbook');
      } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-secondary', text: '📜 查看历史',
      on: { click: function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        navigate('history');
      } }
    }));
    actions.appendChild(el('button', {
      className: 'btn btn-ghost', text: '回到主页',
      on: { click: function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        navigate('home');
      } }
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
      el('span', { className: 'small text-muted', text: '答错的单词自动入本' })
    ]));

    // 顶部统计
    var statsRow = el('div', { className: 'wrong-stats-row' });
    [
      ['错题总数', stats.total, '词'],
      ['累计错次', stats.totalErrors, '次'],
      ['最高错次', stats.topFrequent && stats.topFrequent[0] ? stats.topFrequent[0].frequency : 0, '次']
    ].forEach(function (s) {
      statsRow.appendChild(el('div', { className: 'stat-card' }, [
        el('div', { className: 'label', text: s[0] }),
        el('div', { className: 'value', text: String(s[1]) }),
        el('span', { className: 'text-muted', text: ' ' + s[2] })
      ]));
    });
    wrapper.appendChild(statsRow);

    // 第一段:可挑选的错题单词
    wrapper.appendChild(el('div', { className: 'section' }, [
      el('div', { className: 'section-title',
        html: '可挑选单词 <small>勾选错题组成学习清单进行考核</small>' }),
      renderWrongPickerSection(stage, items)
    ]));

    // 第二段:错题学习清单(本学期的清单)
    wrapper.appendChild(el('div', { className: 'section' }, [
      el('div', { className: 'section-title',
        html: '错题学习清单 <small>本学期清单 · 可进入学习或考核</small>' }),
      renderWrongListsSection(stage)
    ]));

    return wrapper;
  }

  // 错题本:可挑选的错题单词区
  function renderWrongPickerSection(stage, items) {
    var wrap = el('div', { className: 'review-picker-wrap' });

    if (!items || items.length === 0) {
      wrap.appendChild(el('div', { className: 'wrong-empty' }, [
        el('div', { className: 'emoji', text: '🎉' }),
        el('h2', { text: '当前词库没有错题' }),
        el('p', { text: '继续努力!所有单词都答对,继续保持。' })
      ]));
      return wrap;
    }

    // 学期范围筛选(取错题中的 grade)
    var gradeSet = {};
    items.forEach(function (it) {
      var g = (it.grade || 'all');
      gradeSet[g] = (gradeSet[g] || 0) + 1;
    });
    var gradeChips = [];
    if (gradeSet['all']) gradeChips.push({ value: 'all', label: '全部学期', count: gradeSet['all'] });
    Storage.STAGES.forEach(function (s) {
      var g = s.replace(/^[^-]+-/, '');
      if (gradeSet[g] && g !== 'all') gradeChips.push({ value: g, label: (Storage.STAGE_NAMES[s] || s), count: gradeSet[g] });
    });

    var currentGrade = state.wrongbookGrade || 'all';
    var filtered = (currentGrade === 'all')
      ? items.slice()
      : items.filter(function (it) { return (it.grade || 'all') === currentGrade; });
    filtered.sort(function (a, b) { return b.frequency - a.frequency; });

    var gradeRow = el('div', { className: 'wrongbook-grade-row' });
    gradeChips.forEach(function (g) {
      var isActive = currentGrade === g.value;
      gradeRow.appendChild(el('button', {
        className: 'chip ' + (isActive ? 'chip-active' : ''),
        text: g.label + ' · ' + g.count,
        on: { click: function () {
          state.wrongbookGrade = g.value;
          navigate('wrongbook');
        } }
      }));
    });
    wrap.appendChild(gradeRow);

    var selected = {};
    var selectedCountEl, createBtn;
    var list = el('div', { className: 'wrong-list' });

    function makeRow(it, checked) {
      var cb = el('input', {
        attrs: { type: 'checkbox', ...(checked ? { checked: 'checked' } : {}) },
        on: { change: function (e) {
          if (e.target.checked) selected[it.wordId] = true; else delete selected[it.wordId];
          renderSelection();
        } }
      });
      var row = el('div', { className: 'wrong-item' + (checked ? ' wrong-item-selected' : '') }, [
        cb,
        el('div', { className: 'wrong-item-main' }, [
          el('div', { className: 'wrong-item-word' }, [
            el('span', { text: it.word }),
            el('span', { className: 'pick-badge pick-badge-wrong', text: '错题' }),
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
              navigate('wrongbook');
            } }
          })
        ])
      ]);
      return row;
    }

    function renderSelection() {
      var n = Object.keys(selected).length;
      if (selectedCountEl) selectedCountEl.textContent = '已选 ' + n;
      if (createBtn) createBtn.disabled = n === 0;
      var rows = list.querySelectorAll('.wrong-item');
      rows.forEach(function (row, i) {
        var it = filtered[i];
        if (!it) return;
        if (selected[it.wordId]) row.classList.add('wrong-item-selected');
        else row.classList.remove('wrong-item-selected');
      });
    }

    if (filtered.length === 0) {
      wrap.appendChild(el('div', { className: 'empty-msg', text: '当前筛选下没有错题' }));
      return wrap;
    }

    // 选择 + 创建 bar
    var selectRow = el('div', { className: 'wrongbook-select-row' });
    var selectAllBtn = el('button', { className: 'btn btn-ghost btn-sm', text: '全选',
      on: { click: function () {
        filtered.forEach(function (it) { selected[it.wordId] = true; });
        renderSelection();
      } } });
    var clearBtn = el('button', { className: 'btn btn-ghost btn-sm', text: '全不选',
      on: { click: function () { selected = {}; renderSelection(); } } });
    selectedCountEl = el('span', { className: 'text-muted', text: '已选 0' });
    createBtn = el('button', {
      className: 'btn btn-primary btn-sm', text: '📋 创建学习清单并开始',
      disabled: true,
      on: { click: function () {
        var wordIds = Object.keys(selected);
        if (wordIds.length === 0) { toast('请先勾选错题', 'info'); return; }
        var name = '错题复习 ' + Storage.todayStr() + ' (' + wordIds.length + ' 词)';
        var newList = StudyLists.createList({
          name: name, stage: stage, grade: currentGrade, wordIds: wordIds
        });
        toast('已创建清单「' + name + '」,进入考核', 'success');
        StudyListsView.startListTest(newList, { scope: 'list', stage: stage, grade: currentGrade });
      } }
    });
    selectRow.appendChild(selectAllBtn);
    selectRow.appendChild(clearBtn);
    selectRow.appendChild(selectedCountEl);
    selectRow.appendChild(createBtn);
    wrap.appendChild(selectRow);

    filtered.forEach(function (it) {
      list.appendChild(makeRow(it, false));
    });
    wrap.appendChild(list);

    // 底部:清空
    wrap.appendChild(el('div', { className: 'mt-3' }, [
      el('button', {
        className: 'btn btn-ghost btn-sm', text: '🗑 清空本期错题',
        on: { click: function () {
          if (confirm('确认清空当前词库(' + Storage.STAGE_NAMES[stage] + ')的错题?')) {
            if (window.WrongBook) WrongBook.clear(stage);
            navigate('wrongbook');
            toast('已清空', 'success');
          }
        } }
      })
    ]));

    return wrap;
  }

  // 错题本:错题学习清单(本学期所有清单)
  function renderWrongListsSection(stage) {
    var wrap = el('div', { className: 'wrongbook-list-box glass' });
    var allLists = window.StudyLists ? StudyLists.getAllLists() : [];
    var stageLists = allLists.filter(function (l) { return l.stage === stage; });
    if (stageLists.length === 0) {
      wrap.appendChild(el('div', { className: 'empty-msg',
        text: '本学期还没有清单。在「学习」页挑单词即可创建。' }));
      return wrap;
    }
    stageLists.forEach(function (l) {
      var learnedCount = 0;
      try { if (window.StudyLists && StudyLists.getStudiedWordIds) learnedCount = StudyLists.getStudiedWordIds(l.id).length; } catch (e) {}
      var last = window.StudyLists ? StudyLists.getLastTestSession(l.id) : null;
      var testStat = last
        ? '已考 · ' + Math.round((last.score || 0)) + '分'
        : '未考';
      var row = el('div', { className: 'wrongbook-list-row' }, [
        el('div', { className: 'wrongbook-list-main' }, [
          el('div', { className: 'wrongbook-list-name', text: l.name || '(未命名)' }),
          el('div', { className: 'wrongbook-list-meta text-muted',
            text: (l.wordIds || []).length + ' 词 · 已学 ' + learnedCount + ' · ' + testStat })
        ]),
        el('div', { className: 'wrongbook-list-actions' }, [
          el('button', {
            className: 'btn btn-secondary btn-sm',
            text: '📖 学习',
            on: { click: function () { navigate('list/' + l.id); } }
          }),
          el('button', {
            className: 'btn btn-primary btn-sm',
            text: '📝 考核',
            on: { click: function () {
              if (window.StudyListsView && StudyListsView.startListTest) {
                StudyListsView.startListTest(l, { scope: 'list', stage: state.currentStage, grade: 'all' });
              } else {
                navigate('list/' + l.id);
              }
            } }
          })
        ])
      ]);
      wrap.appendChild(row);
    });
    return wrap;
  }

  // ---------- Stats view (v2 — 3 维度主视图 + 旧仪表盘保留) ----------
  function renderStats() {
    var stage = state.currentStage;
    state.statsView = state.statsView || 'overview';
    state.statsRange = state.statsRange || '30';

    var wrapper = el('div', { className: 'stats-view' });

    // 顶部 tab 切换
    var tabs = el('div', { className: 'stats-top-tabs' });
    [
      { value: 'overview',  label: '📋 总览' },
      { value: 'daily',     label: '📈 每日' },
      { value: 'segment',   label: '🎓 初中高' },
      { value: 'dashboard', label: '📊 仪表盘(原 8 维)' }
    ].forEach(function (t) {
      tabs.appendChild(el('button', {
        className: 'stats-top-tab' + (state.statsView === t.value ? ' active' : ''),
        text: t.label,
        on: { click: function () {
          state.statsView = t.value;
          renderCurrentView();
        } }
      }));
    });
    wrapper.appendChild(tabs);

    var viewContainer = el('div', { className: 'stats-view-container' });
    wrapper.appendChild(viewContainer);

    function rerender() {
      viewContainer.innerHTML = '';
      switch (state.statsView) {
        case 'overview':  viewContainer.appendChild(renderStatsOverview()); break;
        case 'daily':     viewContainer.appendChild(renderStatsDaily());    break;
        case 'segment':   viewContainer.appendChild(renderStatsSegment());  break;
        case 'dashboard': viewContainer.appendChild(renderStatsDashboard()); break;
      }
    }
    rerender();
    return wrapper;
  }

  // 维度 1:每个学期表格
  function renderStatsOverview() {
    var wrap = el('div', { className: 'stats-overview' });
    wrap.appendChild(el('div', { className: 'section-title',
      text: '每个学期的学/通过/错题' }));

    var board = (window.Stats && Stats.getPerStageBoard) ? Stats.getPerStageBoard() : [];
    var tableWrap = el('div', { className: 'table-wrap glass' });
    var table = el('table', { className: 'stats-stage-table' });
    table.appendChild(el('thead', null, [
      el('tr', null, [
        el('th', { text: '学期' }),
        el('th', { text: '总词数' }),
        el('th', { text: '已学' }),
        el('th', { text: '已通过' }),
        el('th', { text: '未通过' }),
        el('th', { text: '错题本' })
      ])
    ]));
    var tbody = el('tbody');
    board.forEach(function (row) {
      var tr = el('tr', null, [
        el('td', null, [el('b', { text: row.stageLabel })]),
        el('td', { text: String(row.total) }),
        el('td', null, [
          el('span', { text: row.learned + ' ' }),
          el('span', { className: 'text-muted small', text: '(' + row.learnedPct + '%)' })
        ]),
        el('td', null, [
          el('span', { text: row.passed + ' ' }),
          el('span', { className: 'text-muted small', text: '(' + row.passedPct + '%)' })
        ]),
        el('td', null, [
          row.failed > 0
            ? el('span', { className: 'pick-badge-failed', text: String(row.failed) })
            : el('span', { className: 'text-muted', text: '0' })
        ]),
        el('td', null, [
          row.wrong > 0
            ? el('span', { className: 'pick-badge-failed', text: String(row.wrong) })
            : el('span', { className: 'text-muted', text: '0' })
        ])
      ]);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    // 汇总行
    var total = board.reduce(function (s, r) { return s + r.total; }, 0);
    var learned = board.reduce(function (s, r) { return s + r.learned; }, 0);
    var passed = board.reduce(function (s, r) { return s + r.passed; }, 0);
    var failed = board.reduce(function (s, r) { return s + r.failed; }, 0);
    var wrong = board.reduce(function (s, r) { return s + r.wrong; }, 0);
    var summaryCard = el('div', { className: 'stats-summary-card glass' }, [
      el('div', { className: 'card-title', text: '所有学期汇总' }),
      el('div', { className: 'stats-summary-grid' }, [
        el('div', { className: 'summary-item' }, [
          el('div', { className: 'summary-num', text: String(total) }),
          el('div', { className: 'summary-label', text: '总词数' })
        ]),
        el('div', { className: 'summary-item' }, [
          el('div', { className: 'summary-num', text: String(learned) }),
          el('div', { className: 'summary-label', text: '已学' })
        ]),
        el('div', { className: 'summary-item' }, [
          el('div', { className: 'summary-num', text: String(passed) }),
          el('div', { className: 'summary-label', text: '已通过' })
        ]),
        el('div', { className: 'summary-item' }, [
          el('div', { className: 'summary-num warn', text: String(failed) }),
          el('div', { className: 'summary-label', text: '未通过' })
        ]),
        el('div', { className: 'summary-item' }, [
          el('div', { className: 'summary-num err', text: String(wrong) }),
          el('div', { className: 'summary-label', text: '错题本' })
        ])
      ])
    ]);
    wrap.appendChild(summaryCard);
    return wrap;
  }

  // 维度 2:每日 4 卡 + 30 天趋势
  function renderStatsDaily() {
    var wrap = el('div', { className: 'stats-daily' });
    wrap.appendChild(el('div', { className: 'section-title',
      text: '近 30 天学习与考核仪表' }));

    var board = (window.Stats && Stats.getDailyBoard) ? Stats.getDailyBoard(30) :
                { days: 30, buckets: {}, summary: { learned: 0, testedCorrect: 0, testedWrong: 0, reviewCorrect: 0, reviewWrong: 0, wrongStudied: 0, wrongTestedCorrect: 0, wrongTestedWrong: 0, activeDays: 0 } };
    var s = board.summary;

    var cardsRow = el('div', { className: 'stats-cards-row' });
    function card(icon, title, val, sub) {
      return el('div', { className: 'stat-big-card' }, [
        el('div', { className: 'stat-big-icon', text: icon }),
        el('div', { className: 'stat-big-title', text: title }),
        el('div', { className: 'stat-big-num', text: String(val) }),
        sub ? el('div', { className: 'stat-big-sub', text: sub }) : null
      ]);
    }
    cardsRow.appendChild(card('📚', '已学词数', s.learned, '近 30 天'));
    var testTotal = s.testedCorrect + s.testedWrong;
    var testRate = testTotal > 0 ? Math.round(s.testedCorrect / testTotal * 100) : 0;
    cardsRow.appendChild(card('📝', '考核正确率', testRate + '%',
      testTotal + ' 题 · 对 ' + s.testedCorrect + ' / 错 ' + s.testedWrong));
    var revTotal = s.reviewCorrect + s.reviewWrong;
    var revRate = revTotal > 0 ? Math.round(s.reviewCorrect / revTotal * 100) : 0;
    cardsRow.appendChild(card('🔁', '复习正确率', revRate + '%',
      revTotal + ' 题 · 对 ' + s.reviewCorrect + ' / 错 ' + s.reviewWrong));
    cardsRow.appendChild(card('📕', '错题学习量', s.wrongStudied,
      '对 ' + s.wrongTestedCorrect + ' / 错 ' + s.wrongTestedWrong));
    wrap.appendChild(cardsRow);

    // 30 天柱状图(svg)
    wrap.appendChild(el('div', { className: 'section-title mt-3',
      text: '近 30 天每日学习+考核量' }));
    wrap.appendChild(buildTrendChart(board.buckets));

    // 活跃天
    wrap.appendChild(el('div', { className: 'text-muted mt-3 small',
      text: '近 30 天活跃 ' + s.activeDays + ' 天' }));

    return wrap;
  }

  function buildTrendChart(buckets) {
    var days = Object.keys(buckets).sort();
    var W = 800, H = 220, padX = 30, padY = 30;
    var dailyTotals = days.map(function (d) {
      var b = buckets[d];
      return (b.learned || 0) + (b.testedCorrect || 0) + (b.testedWrong || 0) +
             (b.reviewCorrect || 0) + (b.reviewWrong || 0);
    });
    var maxVal = Math.max(1, ...dailyTotals);
    var barW = Math.max(8, (W - padX * 2) / Math.max(1, days.length) - 1);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" ' +
              'xmlns="http://www.w3.org/2000/svg" class="stats-trend-svg">';
    // 坐标轴
    svg += '<line x1="' + padX + '" y1="' + (H - padY) + '" x2="' + (W - padX) + '" ' +
           'y2="' + (H - padY) + '" stroke="#888" stroke-width="1"/>';
    svg += '<line x1="' + padX + '" y1="' + padY + '" x2="' + padX + '" ' +
           'y2="' + (H - padY) + '" stroke="#888" stroke-width="1"/>';
    var stepY = (H - padY * 2) / 4;
    for (var i = 1; i <= 4; i++) {
      var y = H - padY - i * stepY;
      svg += '<line x1="' + padX + '" y1="' + y + '" x2="' + (W - padX) + '" ' +
             'y2="' + y + '" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';
      var label = Math.round((i / 4) * maxVal);
      svg += '<text x="' + (padX - 4) + '" y="' + (y + 4) + '" text-anchor="end" ' +
             'fill="#888" font-size="10">' + label + '</text>';
    }
    dailyTotals.forEach(function (val, i) {
      var h = (H - padY * 2) * (val / Math.max(1, maxVal));
      var x = padX + i * (barW + 1);
      var y = H - padY - h;
      var color = val > 0 ? '#6c5ce7' : 'rgba(108,92,231,0.15)';
      svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" ' +
             'fill="' + color + '" rx="2"/>';
    });
    // X 轴日期范围标注
    if (days.length > 0) {
      var firstDate = days[0].slice(5);
      var lastDate = days[days.length - 1].slice(5);
      svg += '<text x="' + padX + '" y="' + (H - padY + 18) + '" fill="#888" font-size="10">' + firstDate + '</text>';
      svg += '<text x="' + (W - padX) + '" y="' + (H - padY + 18) + '" fill="#888" ' +
             'font-size="10" text-anchor="end">' + lastDate + '</text>';
    }
    svg += '</svg>';
    var wrap = el('div', { className: 'stats-trend-chart glass',
      attrs: { innerHTML: svg } });
    return wrap;
  }

  // 维度 3:初中 vs 高中
  function renderStatsSegment() {
    var wrap = el('div', { className: 'stats-segment' });
    wrap.appendChild(el('div', { className: 'section-title',
      text: '初中 / 高中(及大学/雅思)总对比' }));

    var board = (window.Stats && Stats.getSegmentAggregate) ? Stats.getSegmentAggregate() : [];
    var cards = el('div', { className: 'stats-segment-grid' });
    board.forEach(function (seg) {
      var d = seg.detail;
      var card = el('div', { className: 'stats-segment-card glass' }, [
        el('div', { className: 'card-title', text: seg.label + ' (' + d.stagesCount + ' 学期)' }),
        el('div', { className: 'stats-segment-big', text: d.passed + ' / ' + d.total }),
        el('div', { className: 'text-muted small', text: '最新已通过 / 总词数' }),
        el('div', { className: 'stats-segment-rows' }, [
          el('div', { className: 'seg-row' }, [
            el('span', { text: '已学' }),
            el('span', null, [
              el('b', { text: String(d.learned) }),
              el('span', { className: 'text-muted small', text: ' (' + d.learnedPct + '%)' })
            ])
          ]),
          el('div', { className: 'seg-row' }, [
            el('span', { text: '已通过' }),
            el('span', null, [
              el('b', { className: 'pick-badge-passed', text: String(d.passed) }),
              el('span', { className: 'text-muted small', text: ' (' + d.passedPct + '%)' })
            ])
          ]),
          el('div', { className: 'seg-row' }, [
            el('span', { text: '未通过' }),
            el('span', null, [
              el('b', { className: 'pick-badge-failed', text: String(d.failed) })
            ])
          ]),
          el('div', { className: 'seg-row' }, [
            el('span', { text: '错题本' }),
            el('span', null, [
              el('b', { className: 'pick-badge-failed', text: String(d.wrong) })
            ])
          ])
        ])
      ]);
      cards.appendChild(card);
    });
    wrap.appendChild(cards);

    return wrap;
  }

  // 旧 8-维度 dashboard,保留可访问
  function renderStatsDashboard() {
    var stage = state.currentStage;
    var range = state.statsRange || '30';
    var grade = state.statsGrade || 'all';
    var grades = (window.Stats && Stats.getStageGrades)
      ? Stats.getStageGrades(stage)
      : [{ value: 'all', label: '全部' }];

    var wrap = el('div', { className: 'stats-dash-wrap' });
    var header = el('div', { className: 'stats-header' });

    var rangeTabs = el('div', { className: 'range-tabs' });
    ['7', '30', '90', 'all'].forEach(function (r) {
      var label = r === 'all' ? '全部' : (r + '天');
      rangeTabs.appendChild(el('button', {
        className: 'range-tab' + (range === r ? ' active' : ''),
        text: label,
        on: { click: function () { state.statsRange = r; renderCurrentView(); } }
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

    wrap.appendChild(header);

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
    wrap.appendChild(dash);
    return wrap;
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

  // ---------- 手动同步 ----------
  async function manualSync() {
    if (!window.Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) {
      toast('请先登录(右上角 🚪 退出/登录)', 'error');
      return;
    }
    if (!window.StudyLists || !StudyLists.pullFromBackend) {
      toast('StudyLists 模块未加载', 'error');
      return;
    }
    toast('🔄 正在同步...', 'info');
    var pushed = 0;
    var pulled = 0;

    // 1) 把本地所有清单推到云端(create / update)
    if (window.BackendSync) {
      var all = StudyLists.getAllLists();
      for (var i = 0; i < all.length; i++) {
        var l = all[i];
        if (!l.remoteId) {
          await BackendSync.Lists.create({
            name: l.name, stage: l.stage, grade: l.grade || 'all', wordIds: l.wordIds || []
          }).then(function (row) {
            if (row && row.id) {
              var lists = StudyLists.getAllLists();
              var idx = lists.findIndex(function (x) { return x.id === l.id; });
              if (idx >= 0) {
                lists[idx]._synced = true;
                lists[idx].remoteId = row.id;
                try { localStorage.setItem('vm_study_lists', JSON.stringify(lists)); } catch (e) {}
                pushed++;
              }
            }
          }).catch(function () {});
        } else if (l._localDirty) {
          await BackendSync.Lists.update(l.remoteId, {
            name: l.name, grade: l.grade || 'all', wordIds: l.wordIds || []
          }).then(function () {
            var lists = StudyLists.getAllLists();
            var idx = lists.findIndex(function (x) { return x.id === l.remoteId; });
            if (idx >= 0) {
              lists[idx]._localDirty = false;
              try { localStorage.setItem('vm_study_lists', JSON.stringify(lists)); } catch (e) {}
              pushed++;
            }
          }).catch(function () {});
        }
      }
    }

    // 2) 从云端拉取最新清单
    await StudyLists.pullFromBackend().then(function (lists) {
      pulled = Array.isArray(lists) ? lists.length : 0;
    }).catch(function () {});

    // 3) 重新渲染主页
    var cnt = (window.StudyLists && StudyLists.getAllLists) ? StudyLists.getAllLists().length : 0;
    toast('✅ 同步完成:推送 ' + pushed + ' 项,云端共 ' + cnt + ' 清单', 'success');
    if (typeof renderCurrentView === 'function') renderCurrentView();
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
    console.info('[VocabMastery] v' + APP_VERSION + ' build ' + BUILD_TAG);
    console.info('[VocabMastery] 当前 storage 后端:' + (window.BackendSync ? 'Supabase(已加载)' : '仅本地(无后端)'));
    state.currentStage = Storage.getCurrentStage();
    await loadStage(state.currentStage);

    if (window.StudyLists && StudyLists.pullFromBackend) {
      try { await StudyLists.pullFromBackend(); } catch (e) { console.warn('pullFromBackend failed', e); }
    }

    // 启动时拉云端 sessions 合并到本地,这样跨设备"已学"状态正确
    if (window.BackendSync && BackendSync.Sessions && BackendSync.Sessions.recentAll) {
      try {
        const remoteSessions = await BackendSync.Sessions.recentAll();
        if (Array.isArray(remoteSessions) && window.StudyLists && StudyLists._mergeRemoteSessions) {
          StudyLists._mergeRemoteSessions(remoteSessions);
        }
      } catch (e) { console.warn('pull sessions failed', e); }
    }

    renderTopbar();

    // Status bar
    var statusBar = document.getElementById('status-bar');
    if (statusBar) {
      statusBar.innerHTML = '<span><span class="dot"></span>当前词库:' +
        Storage.STAGE_NAMES[state.currentStage] + '</span><span title="' + BUILD_TAG + '">v' + APP_VERSION + '</span>';
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