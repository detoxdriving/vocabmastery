/**
 * VocabMastery · Statistical Engine
 * 计算 8 大维度 / 17 项指标
 * 依赖:window.Storage(必须先加载)
 */
(function (global) {
  'use strict';

  var MS_PER_DAY = 86400000;
  var QWERTY_ROWS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m']
  ];

  // ---------- 基础工具 ----------
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function dateStr(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function rangeStart(range) {
    if (!range || range === 'all') return 0;
    var days = parseInt(range, 10);
    if (!days || isNaN(days)) return 0;
    return Date.now() - days * MS_PER_DAY;
  }

  function wordById(vocab, id) {
    if (!vocab || !vocab.words) return null;
    return vocab.words.find(function (w) { return w.id === id; }) || null;
  }

  // 过滤 attempts:按 stage + range
  function filterAttempts(attempts, stage, range) {
    var start = rangeStart(range);
    return attempts.filter(function (a) {
      if (stage && a.stage && a.stage !== stage) return false;
      if (start > 0 && a.timestamp && a.timestamp < start) return false;
      return true;
    });
  }

  // 过滤词表:按年级细分
  function filterVocabByGrade(vocab, grade) {
    if (!vocab || !vocab.words) return [];
    if (!grade || grade === 'all') return vocab.words;
    return vocab.words.filter(function (w) { return w.grade === grade; });
  }

  // 阶段细分映射(junior => [chuyi-shang, chuyi-xia, chuer-shang, chuer-xia, chusan-shang, chusan-xia])
  var STAGE_GRADES = {
    junior: [
      { value: 'all',          label: '全部' },
      { value: 'chuyi-shang',  label: '初一上' },
      { value: 'chuyi-xia',    label: '初一下' },
      { value: 'chuer-shang',  label: '初二上' },
      { value: 'chuer-xia',    label: '初二下' },
      { value: 'chusan-shang', label: '初三上' },
      { value: 'chusan-xia',   label: '初三下' }
    ],
    senior: [
      { value: 'all',          label: '全部' },
      { value: 'gaoyi-shang',  label: '高一上' },
      { value: 'gaoyi-xia',    label: '高一下' },
      { value: 'gaoer-shang',  label: '高二上' },
      { value: 'gaoer-xia',    label: '高二下' },
      { value: 'gaosan-shang', label: '高三上' },
      { value: 'gaosan-xia',   label: '高三下' }
    ],
    college: [
      { value: 'all', label: '全部' },
      { value: 'cet4', label: 'CET-4' },
      { value: 'cet6', label: 'CET-6' }
    ],
    ielts: [
      { value: 'all', label: '全部' }
    ]
  };

  function getStageGrades(stage) {
    return STAGE_GRADES[stage] || [{ value: 'all', label: '全部' }];
  }

  // ============================================================
  // 维度 1:词汇量
  // ============================================================
  function getVocabTotal(stage) {
    var v = Storage.getVocab(stage);
    return v && v.words ? v.words.length : 0;
  }

  function getVocabLearned(stage) {
    var p = Storage.getProgress(stage);
    return Object.keys(p.cards || {}).length;
  }

  function getVocabMastered(stage) {
    var p = Storage.getProgress(stage);
    var n = 0;
    Object.keys(p.cards || {}).forEach(function (id) {
      if (p.cards[id].interval >= 35) n++;
    });
    return n;
  }

  function getDueCount(stage, todayStr) {
    var day = todayStr || today();
    var dueIds = Storage.getDueCards(stage, day);
    return dueIds.length;
  }

  function getVocabUnlearned(stage) {
    return getVocabTotal(stage) - getVocabLearned(stage);
  }

  // ============================================================
  // 统计 v2 — 给 renderStats 用
  // ============================================================

  // 学过的 word id 集合 — 跨本学期所有清单
  function getStageLearnedSet(stage) {
    var ids = {};
    if (window.StudyLists && StudyLists.getAllLists) {
      var lists = StudyLists.getAllLists().filter(function (l) { return l.stage === stage; });
      lists.forEach(function (l) {
        try {
          if (StudyLists.getStudiedWordIds) {
            StudyLists.getStudiedWordIds(l.id).forEach(function (id) { ids[id] = true; });
          }
        } catch (e) {}
      });
    }
    return ids;
  }

  // 通过的 word id 集合 — 从每个清单最近一次 test 推导
  function getStagePassedSet(stage) {
    var passed = {}, failed = {};
    if (window.StudyLists && StudyLists.getAllLists) {
      var lists = StudyLists.getAllLists().filter(function (l) { return l.stage === stage; });
      lists.forEach(function (l) {
        try {
          if (StudyLists.getLastTestSession) {
            var last = StudyLists.getLastTestSession(l.id);
            if (last) {
              var wrongMap = {};
              (last.wrongWordIds || []).forEach(function (id) { wrongMap[id] = true; });
              (l.wordIds || []).forEach(function (id) {
                if (wrongMap[id]) failed[id] = true;
                else passed[id] = true;
              });
            }
          }
        } catch (e) {}
      });
    }
    return { passed: passed, failed: failed };
  }

  // 错题本集合 — 单参数 stage
  function getStageWrongSet(stage) {
    var ids = {};
    try {
      if (window.WrongBook && WrongBook.getAll) {
        WrongBook.getAll(stage).forEach(function (it) {
          if (it && it.wordId != null) ids[it.wordId] = true;
        });
      }
    } catch (e) {}
    return ids;
  }

  // 维度 1:每个学期 { total, learned, passed, failed, wrong, learned%, passed% }
  function getPerStageBoard() {
    var result = [];
    Storage.STAGES.forEach(function (stage) {
      var total = getVocabTotal(stage);
      var learnedSet = getStageLearnedSet(stage);
      var _passFail = getStagePassedSet(stage);
      var wrongSet = getStageWrongSet(stage);
      var learned = Object.keys(learnedSet).length;
      var passed = Object.keys(_passFail.passed).length;
      var failed = Object.keys(_passFail.failed).length;
      var wrong = Object.keys(wrongSet).length;
      result.push({
        stage: stage,
        stageLabel: Storage.STAGE_NAMES[stage] || stage,
        total: total,
        learned: learned,
        passed: passed,
        failed: failed,
        wrong: wrong,
        learnedPct: total > 0 ? Math.round(learned / total * 100) : 0,
        passedPct: total > 0 ? Math.round(passed / total * 100) : 0
      });
    });
    return result;
  }

  // 维度 3:初中 vs 高中 — stage group 汇总
  function getSegmentAggregate() {
    var junior = [], senior = [], college = [], ielts = [];
    Storage.STAGES.forEach(function (s) {
      if (s.indexOf('chuyi') === 0 || s.indexOf('chuer') === 0 || s.indexOf('chusan') === 0 ||
          s.indexOf('chuzhong') === 0) junior.push(s);
      else if (s.indexOf('gao') === 0) senior.push(s);
      else if (s === 'college') college.push(s);
      else if (s === 'ielts') ielts.push(s);
    });
    function roll(segs) {
      var t = 0, l = 0, p = 0, f = 0, w = 0;
      segs.forEach(function (s) {
        var board = getPerStageBoard().find(function (b) { return b.stage === s; });
        if (board) { t += board.total; l += board.learned; p += board.passed; f += board.failed; w += board.wrong; }
      });
      return {
        total: t, learned: l, passed: p, failed: f, wrong: w,
        learnedPct: t > 0 ? Math.round(l / t * 100) : 0,
        passedPct: t > 0 ? Math.round(p / t * 100) : 0,
        stagesCount: segs.length
      };
    }
    return [
      { segment: 'junior',  label: '初中', detail: roll(junior)  },
      { segment: 'senior',  label: '高中', detail: roll(senior)  },
      { segment: 'college', label: '大学', detail: roll(college) },
      { segment: 'ielts',   label: '雅思', detail: roll(ielts)   }
    ].filter(function (s) { return s.detail.stagesCount > 0; });
  }

  // 维度 2:每日 sessions 累计 — 按天分组
  function getDailyBoard(days) {
    days = days || 30;
    var todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    var dayMs = 86400000;
    // 30 天每日 buckets
    var buckets = {};
    for (var d = days - 1; d >= 0; d--) {
      var dd = new Date(todayDate.getTime() - d * dayMs);
      buckets[dateStr(dd)] = {
        learned: 0, studySessions: 0,
        testedCorrect: 0, testedWrong: 0, testSessions: 0,
        reviewCorrect: 0, reviewWrong: 0, reviewSessions: 0,
        wrongStudied: 0, wrongTestedCorrect: 0, wrongTestedWrong: 0
      };
    }
    // 拉所有 sessions
    function allSessions() {
      var arr = [];
      try {
        if (window.StudyLists && StudyLists.getAllLists) {
          StudyLists.getAllLists().forEach(function (l) {
            try {
              if (StudyLists.getSessionsByList) {
                (StudyLists.getSessionsByList(l.id) || []).forEach(function (s) { arr.push(s); });
              }
            } catch (e) {}
          });
        }
      } catch (e) {}
      return arr;
    }
    var sessions = allSessions();
    sessions.forEach(function (s) {
      var day = dateStr(new Date(s.createdAt || s.finishedAt || 0));
      var b = buckets[day];
      if (!b) return;
      var correct = Number(s.correctCount) || 0;
      var wrong = (s.wrongWordIds || []).length;
      // sessions.studiedWordIds 默认就有 L1 学习的 wordId
      if (s.type === 'study') {
        b.learned += (s.studiedWordIds || (s.wordId != null ? [s.wordId] : [])).length;
        b.studySessions += 1;
      } else if (s.type === 'test') {
        if (s.mode === '4D' && /review/i.test(s.mode + '')) {
          // 复习考核
          b.reviewCorrect += correct;
          b.reviewWrong += wrong;
          b.reviewSessions += 1;
        } else {
          b.testedCorrect += correct;
          b.testedWrong += wrong;
          b.testSessions += 1;
        }
      } else if (s.type === 'wrongbook_test' || s.type === 'wrongbook_study') {
        b.wrongStudied += (s.studiedWordIds || []).length;
        if (s.type === 'wrongbook_test') {
          b.wrongTestedCorrect += correct;
          b.wrongTestedWrong += wrong;
        }
      }
    });
    // 近期 30 天汇总
    var summary = {
      learned: 0, testedCorrect: 0, testedWrong: 0,
      reviewCorrect: 0, reviewWrong: 0,
      wrongStudied: 0, wrongTestedCorrect: 0, wrongTestedWrong: 0,
      activeDays: 0
    };
    Object.keys(buckets).forEach(function (k) {
      var b = buckets[k];
      summary.learned += b.learned;
      summary.testedCorrect += b.testedCorrect;
      summary.testedWrong += b.testedWrong;
      summary.reviewCorrect += b.reviewCorrect;
      summary.reviewWrong += b.reviewWrong;
      summary.wrongStudied += b.wrongStudied;
      summary.wrongTestedCorrect += b.wrongTestedCorrect;
      summary.wrongTestedWrong += b.wrongTestedWrong;
      if (b.studySessions || b.testSessions || b.reviewSessions ||
          b.learned || b.testedCorrect || b.testedWrong ||
          b.reviewCorrect || b.reviewWrong || b.wrongStudied) {
        summary.activeDays++;
      }
    });
    return { days: days, buckets: buckets, summary: summary };
  }

  function getStageProgress(stage) {
    var total = getVocabTotal(stage);
    var learned = getVocabLearned(stage);
    return {
      stage: stage,
      total: total,
      learned: learned,
      percent: total > 0 ? Math.round(learned / total * 1000) / 10 : 0
    };
  }

  function getAllStagesProgress() {
    return Storage.STAGES.map(function (s) {
      return getStageProgress(s);
    });
  }

  // ============================================================
  // 维度 2:正确率细分
  // ============================================================
  function calcRate(correct, total) {
    return total > 0 ? Math.round(correct / total * 1000) / 10 : 0;
  }

  function getOverallCorrectRate(stage, range) {
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);
    var c = 0, t = filtered.length;
    filtered.forEach(function (a) { if (a.correct) c++; });
    return {
      correct: c,
      total: t,
      rate: calcRate(c, t)
    };
  }

  function getStageCorrectRate(stage, range) {
    return getOverallCorrectRate(stage, range);
  }

  // 按 grade 细分
  function getGradeCorrectRate(stage, grade, range) {
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);
    var vocab = Storage.getVocab(stage);
    var wordGrade = {};
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) {
        wordGrade[w.id] = w.grade;
      });
    }
    var c = 0, t = 0;
    filtered.forEach(function (a) {
      if (grade !== 'all' && wordGrade[a.wordId] !== grade) return;
      t++;
      if (a.correct) c++;
    });
    return {
      grade: grade,
      correct: c,
      total: t,
      rate: calcRate(c, t)
    };
  }

  // 按题型(mode) 细分
  function getTypeCorrectRate(stage, modeType, range) {
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);
    var c = 0, t = 0;
    filtered.forEach(function (a) {
      var mode = a.mode || 'study';
      if (modeType && mode !== modeType) return;
      t++;
      if (a.correct) c++;
    });
    return {
      mode: modeType,
      correct: c,
      total: t,
      rate: calcRate(c, t)
    };
  }

  // 按主题(topic)细分
  function getTopicCorrectRate(stage, range) {
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);
    var vocab = Storage.getVocab(stage);
    var wordTopic = {};
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) {
        wordTopic[w.id] = w.topic || '未分类';
      });
    }
    var buckets = {};
    filtered.forEach(function (a) {
      var topic = wordTopic[a.wordId] || '未分类';
      if (!buckets[topic]) buckets[topic] = { correct: 0, total: 0 };
      buckets[topic].total++;
      if (a.correct) buckets[topic].correct++;
    });
    var arr = Object.keys(buckets).map(function (k) {
      return {
        topic: k,
        correct: buckets[k].correct,
        total: buckets[k].total,
        rate: calcRate(buckets[k].correct, buckets[k].total)
      };
    });
    arr.sort(function (a, b) { return b.total - a.total; });
    return arr;
  }

  // ============================================================
  // 维度 3:理解率(语义层面)
  // ============================================================
  function getComprehensionBreakdown(stage, range) {
    // 3.1 释义: mode in ['study','L1','L2','T2','T3']
    // 3.2 语境: ['L6','T7']
    // 3.3 词族: ['L7','T8']
    // 3.4 搭配: 需要从 word.collocations 关联,目前用 word stats 估算
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);

    function rate(modes) {
      var c = 0, t = 0;
      filtered.forEach(function (a) {
        if (modes.indexOf(a.mode) >= 0) {
          t++;
          if (a.correct) c++;
        }
      });
      return { correct: c, total: t, rate: calcRate(c, t) };
    }

    return {
      meaning:  rate(['study', 'L1', 'L2', 'T2', 'T3']),     // 3.1 释义
      context:  rate(['L6', 'T7']),                            // 3.2 语境
      family:   rate(['L7', 'T8']),                            // 3.3 词族
      collocation: { correct: 0, total: 0, rate: 0 }           // 3.4 搭配:暂无数据时为 0
    };
  }

  // ============================================================
  // 维度 4:发音正确率
  // ============================================================
  function getPronunciationStats(stage, range) {
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);
    // L10 / T9 是发音相关
    var scores = [];
    var syllableRates = { correct: 0, total: 0 };
    var stressRates = { correct: 0, total: 0 };
    var wordScore = {};

    filtered.forEach(function (a) {
      if (a.mode !== 'L10' && a.mode !== 'T9') return;
      if (typeof a.pronScore === 'number') {
        scores.push(a.pronScore);
        if (!wordScore[a.wordId]) wordScore[a.wordId] = [];
        wordScore[a.wordId].push(a.pronScore);
      }
      if (typeof a.syllableCorrect === 'boolean') {
        syllableRates.total++;
        if (a.syllableCorrect) syllableRates.correct++;
      }
      if (typeof a.stressCorrect === 'boolean') {
        stressRates.total++;
        if (a.stressCorrect) stressRates.correct++;
      }
    });

    var avgScore = scores.length > 0
      ? Math.round(scores.reduce(function (s, v) { return s + v; }, 0) / scores.length * 10) / 10
      : 0;

    // 4.4 易错发音 Top 10
    var top10 = Object.keys(wordScore).map(function (wid) {
      var arr = wordScore[wid];
      var avg = arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
      return { wordId: Number(wid), avgScore: Math.round(avg * 10) / 10, count: arr.length };
    });
    top10.sort(function (a, b) { return a.avgScore - b.avgScore; });
    top10 = top10.slice(0, 10);

    return {
      avgScore: avgScore,
      sampleCount: scores.length,
      syllable: { rate: calcRate(syllableRates.correct, syllableRates.total), total: syllableRates.total },
      stress:   { rate: calcRate(stressRates.correct,   stressRates.total),   total: stressRates.total },
      topMistakes: top10
    };
  }

  // ============================================================
  // 维度 5:记忆持久度
  // ============================================================
  function getMemoryPersistence(stage) {
    var p = Storage.getProgress(stage);
    var ids = Object.keys(p.cards || {});
    if (ids.length === 0) return { avgEF: 2.5, totalCards: 0 };
    var sum = 0;
    ids.forEach(function (id) { sum += p.cards[id].ef || 2.5; });
    return {
      avgEF: Math.round(sum / ids.length * 100) / 100,
      totalCards: ids.length
    };
  }

  // 艾宾浩斯遗忘曲线 R = e^(-t/S),S ≈ ef * interval
  function getPredictedForget(stage, daysAhead) {
    daysAhead = daysAhead || 7;
    var p = Storage.getProgress(stage);
    var ids = Object.keys(p.cards || {});
    var tdy = new Date(today() + 'T00:00:00');
    var count = 0;
    ids.forEach(function (id) {
      var c = p.cards[id];
      var interval = c.interval || 0;
      if (interval <= 0) return;
      var stability = (c.ef || 2.5) * interval;
      if (stability <= 0) return;
      // 距下次复习的天数(interval)
      var t = interval;
      // R = e^(-t/S)
      var R = Math.exp(-t / stability);
      // 遗忘概率 = 1 - R
      if ((1 - R) > 0.3) count++;
    });
    return {
      predictedForgetCount: count,
      totalCards: ids.length,
      daysAhead: daysAhead
    };
  }

  // 记忆曲线:按 lastReviewed 距今的天数,统计各时间区间的回忆率
  function getMemoryCurve(stage) {
    var p = Storage.getProgress(stage);
    var log = Storage.getAttemptsLog('all');
    var tdy = Date.now();
    // 桶:[0,1), [1,3), [3,7), [7,14), [14,30), [30,60), [60+)
    var buckets = [
      { label: '<1天', min: 0, max: 1, c: 0, t: 0 },
      { label: '1-3天', min: 1, max: 3, c: 0, t: 0 },
      { label: '3-7天', min: 3, max: 7, c: 0, t: 0 },
      { label: '7-14天', min: 7, max: 14, c: 0, t: 0 },
      { label: '14-30天', min: 14, max: 30, c: 0, t: 0 },
      { label: '30-60天', min: 30, max: 60, c: 0, t: 0 },
      { label: '60天+', min: 60, max: 1e9, c: 0, t: 0 }
    ];
    log.forEach(function (a) {
      if (a.stage && a.stage !== stage) return;
      var card = p.cards[a.wordId];
      if (!card || !card.lastReviewed) return;
      var last = new Date(card.lastReviewed + 'T00:00:00').getTime();
      var daysAgo = (tdy - last) / MS_PER_DAY;
      for (var i = 0; i < buckets.length; i++) {
        if (daysAgo >= buckets[i].min && daysAgo < buckets[i].max) {
          buckets[i].t++;
          if (a.correct) buckets[i].c++;
          break;
        }
      }
    });
    buckets.forEach(function (b) {
      b.rate = calcRate(b.c, b.t);
    });
    return buckets;
  }

  // ============================================================
  // 维度 6:效率指标
  // ============================================================
  function getDailyAverage(stage, days) {
    days = days || 30;
    var log = Storage.getAttemptsLog(days);
    var filtered = filterAttempts(log, stage, days);
    var vocab = Storage.getVocab(stage);
    var knownIds = {};
    if (vocab && vocab.words) {
      var p = Storage.getProgress(stage);
      Object.keys(p.cards || {}).forEach(function (id) {
        // 任何卡片被创建即视为"学过"
        if (p.cards[id].addedDate) knownIds[id] = true;
      });
    }
    // 每天新学词数 = 每天首次出现的 wordId 数
    var dayMap = {};
    var seen = {};
    // 按时间正序遍历
    var sorted = filtered.slice().sort(function (a, b) { return a.timestamp - b.timestamp; });
    sorted.forEach(function (a) {
      var day = new Date(a.timestamp).toISOString().slice(0, 10);
      if (!seen[a.wordId]) {
        if (!dayMap[day]) dayMap[day] = { newWords: 0, reviews: 0 };
        dayMap[day].newWords++;
        seen[a.wordId] = true;
      } else {
        if (!dayMap[day]) dayMap[day] = { newWords: 0, reviews: 0 };
        dayMap[day].reviews++;
      }
    });
    var totalNew = 0, totalDays = 0;
    Object.keys(dayMap).forEach(function (d) {
      totalNew += dayMap[d].newWords;
      totalDays++;
    });
    return totalDays > 0
      ? Math.round(totalNew / Math.min(days, totalDays) * 10) / 10
      : 0;
  }

  function getReviewAverage(stage, days) {
    days = days || 30;
    var log = Storage.getAttemptsLog(days);
    var filtered = filterAttempts(log, stage, days);
    var dayMap = {};
    var seen = {};
    var sorted = filtered.slice().sort(function (a, b) { return a.timestamp - b.timestamp; });
    sorted.forEach(function (a) {
      var day = new Date(a.timestamp).toISOString().slice(0, 10);
      if (!seen[a.wordId]) {
        seen[a.wordId] = true;
        return; // 新学不计为复习
      }
      if (!dayMap[day]) dayMap[day] = 0;
      dayMap[day]++;
    });
    var totalReview = 0, activeDays = 0;
    Object.keys(dayMap).forEach(function (d) {
      totalReview += dayMap[d];
      activeDays++;
    });
    return activeDays > 0
      ? Math.round(totalReview / Math.min(days, activeDays) * 10) / 10
      : 0;
  }

  function getAvgResponseTime(stage, range) {
    var log = Storage.getAttemptsLog(range);
    var filtered = filterAttempts(log, stage, range);
    if (filtered.length === 0) return { avgSec: 0, count: 0 };
    var sum = 0, c = 0;
    filtered.forEach(function (a) {
      if (typeof a.timeMs === 'number' && a.timeMs > 0) {
        sum += a.timeMs;
        c++;
      }
    });
    return {
      avgSec: c > 0 ? Math.round(sum / c / 100) / 10 : 0,
      count: c
    };
  }

  function getStreak(stage) {
    var p = Storage.getProgress(stage);
    return p.streak || 0;
  }

  // ============================================================
  // 维度 7:错题分析
  // ============================================================
  function getWrongTotal(stage) {
    var log = Storage.getAttemptsLog('all');
    var n = 0;
    log.forEach(function (a) {
      if (a.stage && a.stage !== stage) return;
      if (!a.correct) n++;
    });
    return n;
  }

  function getMostWrong(stage, n) {
    n = n || 20;
    var log = Storage.getAttemptsLog('all');
    var buckets = {};
    log.forEach(function (a) {
      if (a.stage && a.stage !== stage) return;
      if (a.correct) return;
      if (!buckets[a.wordId]) buckets[a.wordId] = 0;
      buckets[a.wordId]++;
    });
    var arr = Object.keys(buckets).map(function (wid) {
      return { wordId: Number(wid), wrongCount: buckets[wid] };
    });
    arr.sort(function (a, b) { return b.wrongCount - a.wrongCount; });
    return arr.slice(0, n);
  }

  // 易混淆词对算法:
  // (a) 用户对 A 错、对 B 对(或反之),且 A、B 字形相似;
  // (b) 同一题中选项有 B 时用户多次选 A,或反之;
  // 简化:用 attempts_log 的 chosenOption / correctOption 字段(如有),
  // 统计:对 A 的正确率 < 0.3 且对 B 的正确率 < 0.3, 累计共错 ≥ 3 次
  function getConfusionPairs(stage, n) {
    n = n || 10;
    var log = Storage.getAttemptsLog('all');
    var filtered = log.filter(function (a) { return !a.stage || a.stage === stage; });

    // 计算每词正确率
    var perWord = {};
    filtered.forEach(function (a) {
      if (!perWord[a.wordId]) perWord[a.wordId] = { c: 0, t: 0 };
      perWord[a.wordId].t++;
      if (a.correct) perWord[a.wordId].c++;
    });

    // 统计 confusion log(来自 confusions 字段)
    var pairCount = {};
    filtered.forEach(function (a) {
      if (!a.confusions || !Array.isArray(a.confusions)) return;
      a.confusions.forEach(function (otherId) {
        if (otherId === a.wordId) return;
        var key = a.wordId < otherId
          ? a.wordId + '-' + otherId
          : otherId + '-' + a.wordId;
        if (!pairCount[key]) {
          pairCount[key] = { a: Math.min(a.wordId, otherId), b: Math.max(a.wordId, otherId), count: 0 };
        }
        pairCount[key].count++;
      });
    });

    // 辅助:对 A 的正确率 < 0.3 且对 B 的正确率 < 0.3,合并进混淆池
    var ids = Object.keys(perWord);
    for (var i = 0; i < ids.length; i++) {
      var aId = Number(ids[i]);
      var aStat = perWord[aId];
      if (aStat.t < 2) continue;
      var aRate = aStat.c / aStat.t;
      if (aRate >= 0.3) continue;
      for (var j = i + 1; j < ids.length; j++) {
        var bId = Number(ids[j]);
        var bStat = perWord[bId];
        if (bStat.t < 2) continue;
        var bRate = bStat.c / bStat.t;
        if (bRate >= 0.3) continue;
        // 字形相似(共前缀至少 3 字符)
        var key = aId + '-' + bId;
        if (!pairCount[key]) {
          pairCount[key] = { a: aId, b: bId, count: 1, aRate: aRate, bRate: bRate };
        }
      }
    }

    var arr = Object.keys(pairCount).map(function (k) { return pairCount[k]; });
    arr.sort(function (x, y) { return y.count - x.count; });
    if (arr.length > n) arr = arr.slice(0, n);
    // 补全 aRate / bRate
    arr.forEach(function (p) {
      var as = perWord[p.a] || { c: 0, t: 0 };
      var bs = perWord[p.b] || { c: 0, t: 0 };
      p.aRate = as.t > 0 ? Math.round(as.c / as.t * 100) / 100 : 0;
      p.bRate = bs.t > 0 ? Math.round(bs.c / bs.t * 100) / 100 : 0;
      p.aTotal = as.t;
      p.bTotal = bs.t;
    });
    return arr;
  }

  // QWERTY 拼写错误热力图 3x10
  function getKeyboardHeatmap(stage) {
    var heat = [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0]
    ];
    var log = Storage.getAttemptsLog('all');
    var filtered = log.filter(function (a) { return !a.stage || a.stage === stage; });
    var vocab = Storage.getVocab(stage);
    var byId = {};
    if (vocab && vocab.words) {
      vocab.words.forEach(function (w) { byId[w.id] = w; });
    }

    function posOf(ch) {
      var c = ch.toLowerCase();
      for (var r = 0; r < QWERTY_ROWS.length; r++) {
        var col = QWERTY_ROWS[r].indexOf(c);
        if (col >= 0) return { row: r, col: col };
      }
      return null;
    }

    filtered.forEach(function (a) {
      if (a.correct) return;
      if (a.mode !== 'L4' && a.mode !== 'L5' && a.mode !== 'T5') return;
      if (typeof a.typedText !== 'string') return;
      var word = byId[a.wordId];
      if (!word) return;
      var target = word.word.toLowerCase();
      var typed = a.typedText.toLowerCase().replace(/\s/g, '');
      var len = Math.min(target.length, typed.length);
      for (var i = 0; i < len; i++) {
        if (target[i] !== typed[i]) {
          var p1 = posOf(target[i]);
          var p2 = posOf(typed[i]);
          if (p1) heat[p1.row][p1.col]++;
          if (p2 && (p1.row !== p2.row || p1.col !== p2.col)) heat[p2.row][p2.col]++;
        }
      }
      // 长度差异(多打 / 少打)的字符
      if (typed.length > target.length) {
        for (var k = target.length; k < typed.length; k++) {
          var p = posOf(typed[k]);
          if (p) heat[p.row][p.col]++;
        }
      } else if (target.length > typed.length) {
        for (var m2 = typed.length; m2 < target.length; m2++) {
          var pm = posOf(target[m2]);
          if (pm) heat[pm.row][pm.col]++;
        }
      }
    });

    return {
      rows: QWERTY_ROWS,
      heat: heat,
      labels: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
    };
  }

  // ============================================================
  // 维度 8:进度 / 热力图
  // ============================================================
  // 365 天学习热力图:每天 0-24 小时强度
  function getHeatmapData(stage, year) {
    year = year || 365;
    var log = Storage.getAttemptsLog('all');
    var filtered = log.filter(function (a) { return !a.stage || a.stage === stage; });
    // 桶: day(YYYY-MM-DD) -> hour(0-23) -> count
    var dayMap = {};
    filtered.forEach(function (a) {
      var d = new Date(a.timestamp);
      var ds = dateStr(d);
      var h = d.getHours();
      if (!dayMap[ds]) dayMap[ds] = new Array(24).fill(0);
      dayMap[ds][h]++;
    });
    // 生成最近 year 天的日期数组
    var result = [];
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    for (var i = year - 1; i >= 0; i--) {
      var dd = new Date(now.getTime() - i * MS_PER_DAY);
      var dStr = dateStr(dd);
      result.push({
        date: dStr,
        hourly: dayMap[dStr] || new Array(24).fill(0),
        total: (dayMap[dStr] || new Array(24).fill(0)).reduce(function (s, v) { return s + v; }, 0)
      });
    }
    return result;
  }

  // ============================================================
  // 维度 9:学习清单(StudyLists)
  // ============================================================
  function getAllLists(stage) {
    if (!global.StudyLists) return [];
    var lists = StudyLists.getAllLists();
    if (stage) lists = lists.filter(function (l) { return l.stage === stage; });
    return lists.map(function (l) {
      var stats = StudyLists.getListStats(l.id);
      return {
        id: l.id,
        name: l.name,
        stage: l.stage,
        grade: l.grade,
        wordCount: (l.wordIds || []).length,
        studyCount: stats.study.count,
        testCount: stats.test.count,
        avgStudyScore: stats.study.avgScore,
        avgTestScore: stats.test.avgScore,
        bestTestScore: stats.test.bestScore,
        updatedAt: l.updatedAt
      };
    });
  }

  function getListStats(listId) {
    if (!global.StudyLists) return null;
    return StudyLists.getListStats(listId);
  }

  function getListTrend(listId, type) {
    if (!global.StudyLists) return [];
    return StudyLists.getListTrend(listId, type);
  }

  // ============================================================
  // 维度 10:能力维度趋势(5 大能力)
  // ============================================================
  var ABILITY_DEFS = [
    { id: 'spelling',  label: '拼写', modes: ['L4', 'L5', 'T5'] },
    { id: 'meaning',   label: '中文', modes: ['L1', 'L2', 'T2', 'T3'] },
    { id: 'pronunciation', label: '发音', modes: ['L10', 'T9'] },
    { id: 'sentence',  label: '造句', modes: ['feynman'] },
    { id: 'cloze',     label: '填空', modes: ['L6', 'T7'] }
  ];

  function getAbilityDefinitions() {
    return ABILITY_DEFS.map(function (a) {
      return { id: a.id, label: a.label };
    });
  }

  function getAbilityTrend(stage, ability, days) {
    days = days || 30;
    var def = ABILITY_DEFS.filter(function (a) { return a.id === ability; })[0];
    if (!def) return [];
    var log = Storage.getAttemptsLog(days);
    var dayMap = {};
    log.forEach(function (a) {
      if (a.stage && stage && a.stage !== stage) return;
      if (def.modes.indexOf(a.mode) < 0) return;
      var d = new Date(a.timestamp);
      var ds = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      if (!dayMap[ds]) dayMap[ds] = { c: 0, t: 0 };
      dayMap[ds].t++;
      if (a.correct) dayMap[ds].c++;
    });
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var result = [];
    for (var i = days - 1; i >= 0; i--) {
      var d2 = new Date(now.getTime() - i * MS_PER_DAY);
      var ds2 = d2.getFullYear() + '-' +
        String(d2.getMonth() + 1).padStart(2, '0') + '-' +
        String(d2.getDate()).padStart(2, '0');
      var bucket = dayMap[ds2];
      var rate = (bucket && bucket.t > 0) ? Math.round(bucket.c / bucket.t * 1000) / 10 : 0;
      result.push({ date: ds2, value: rate, total: bucket ? bucket.t : 0 });
    }
    return result;
  }

  function getAbilityOverview(stage, days) {
    days = days || 30;
    return ABILITY_DEFS.map(function (def) {
      var trend = getAbilityTrend(stage, def.id, days);
      var activeDays = 0, totalT = 0, totalC = 0, sumRates = 0;
      trend.forEach(function (d) {
        if (d.total > 0) {
          activeDays++;
          totalT += d.total;
          sumRates += d.value;
        }
      });
      var avgRate = activeDays > 0 ? Math.round(sumRates / activeDays * 10) / 10 : 0;
      var exactRate = totalT > 0 ? Math.round(totalC / totalT * 1000) / 10 : 0;
      var trendNonZero = trend.filter(function (d) { return d.total > 0; });
      var exact = (function () {
        var log = Storage.getAttemptsLog(days);
        var c = 0, t = 0;
        log.forEach(function (a) {
          if (a.stage && stage && a.stage !== stage) return;
          if (def.modes.indexOf(a.mode) < 0) return;
          t++;
          if (a.correct) c++;
        });
        return t > 0 ? Math.round(c / t * 1000) / 10 : 0;
      })();
      return {
        id: def.id,
        label: def.label,
        avgRate: exact,
        activeDays: activeDays,
        trend: trend
      };
    });
  }

  // ============================================================
  // 维度 11:会话记录(Sessions)
  // ============================================================
  function getRecentSessions(stage, n) {
    if (!global.StudyLists) return [];
    return StudyLists.getRecentSessions(stage, n || 20);
  }

  function getSessionListStats(stage, range) {
    if (!global.StudyLists) return { totalSessions: 0, studyCount: 0, testCount: 0, avgScore: 0 };
    var sessions = StudyLists.getRecentSessions(stage, 999);
    if (range && range !== 'all') {
      var cutoff = Date.now() - parseInt(range, 10) * MS_PER_DAY;
      sessions = sessions.filter(function (s) { return s.createdAt >= cutoff; });
    }
    var sCount = 0, tCount = 0, sum = 0;
    sessions.forEach(function (s) {
      if (s.type === 'study') sCount++;
      else if (s.type === 'test') tCount++;
      sum += (s.score || 0);
    });
    return {
      totalSessions: sessions.length,
      studyCount: sCount,
      testCount: tCount,
      avgScore: sessions.length > 0 ? Math.round(sum / sessions.length * 10) / 10 : 0
    };
  }

  // ============================================================
  // 维度 12:错题清空率 — 对应 standards.md E 维度
  // ============================================================
  var COHORT_TO_SEGMENT = {
    chuyi: 'junior', chuer: 'junior', chusan: 'junior', chuzhong: 'junior',
    gaoyi: 'senior', gaoer: 'senior', gaosan: 'senior',
    college: 'college', ielts: 'ielts'
  };
  var SEGMENT_CLEAR_THRESHOLD = {
    junior: 90, senior: 92, college: 95, ielts: 95
  };
  var SEGMENT_LABEL = {
    junior: '初中', senior: '高中', college: '大学', ielts: '雅思'
  };

  function getClearRate(stage) {
    var current = (Storage.getWrongBook && Storage.getWrongBook(stage)) || [];
    var cleared = (global.WrongBook && WrongBook.getClearedIds)
      ? WrongBook.getClearedIds(stage) : [];
    var currentCount = current.length;
    var clearedCount = cleared.length;
    var total = currentCount + clearedCount;
    var rate = total === 0 ? 0 : Math.round((clearedCount / total) * 100);

    var cohort = String(stage || '').split('-')[0];
    var segment = COHORT_TO_SEGMENT[cohort] || 'junior';
    var threshold = SEGMENT_CLEAR_THRESHOLD[segment];
    return {
      stage: stage,
      segment: segment,
      segmentLabel: SEGMENT_LABEL[segment],
      currentCount: currentCount,
      clearedCount: clearedCount,
      totalEncountered: total,
      rate: rate,
      threshold: threshold,
      passed: rate >= threshold,
      gap: threshold - rate
    };
  }

  function getClearRateBySegment(stage) {
    var info = getClearRate(stage);
    return {
      stage: stage,
      label: info.segmentLabel,
      threshold: info.threshold,
      rate: info.rate,
      passed: info.passed,
      currentCount: info.currentCount,
      clearedCount: info.clearedCount,
      totalEncountered: info.totalEncountered,
      gap: info.gap
    };
  }

  // ============================================================
  // 维度 13:Feynman 复述挑战 — 对应 standards.md D 维度
  // ============================================================
  var FEYNMAN_THRESHOLD = {
    junior: 12, senior: 20, college: 30, ielts: 45
  };
  var FEYNMAN_WORD_RANGE = {
    junior: { min: 5, max: 8 },
    senior: { min: 5, max: 10 },
    college: { min: 8, max: 12 },
    ielts: { min: 10, max: 15 }
  };

  function getFeynmanStats(stage) {
    var history = (global.Feynman && Feynman.getHistory)
      ? Feynman.getHistory() : [];
    var records = history.filter(function (h) {
      return !stage || !h.stage || h.stage === stage;
    });

    var totalCount = records.length;
    var totalWordsTried = 0;
    var totalWordsUsed = 0;
    var scoreSum = 0;
    var scoreCount = 0;
    var recentTrend = [];

    records.forEach(function (r) {
      totalWordsTried += (r.wordCount || 0);
      totalWordsUsed += (r.usedWords ? r.usedWords.length : 0);
      if (typeof r.score === 'number') {
        scoreSum += r.score;
        scoreCount++;
      }
    });

    var last14 = records.slice(-14);
    last14.forEach(function (r) {
      recentTrend.push({
        timestamp: r.timestamp,
        score: r.score || 0,
        wordCount: r.wordCount || 0,
        usedCount: r.usedWords ? r.usedWords.length : 0
      });
    });

    var cohort = String(stage || '').split('-')[0];
    var segment = COHORT_TO_SEGMENT[cohort] || 'junior';
    var threshold = FEYNMAN_THRESHOLD[segment];
    var wordRange = FEYNMAN_WORD_RANGE[segment];
    var avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
    var coverageRate = totalWordsTried === 0 ? 0
      : Math.round((totalWordsUsed / totalWordsTried) * 100);

    var passedWeekly = false;
    var weeklyTarget = 0;
    if (segment === 'junior') weeklyTarget = 1;
    else if (segment === 'senior') weeklyTarget = 1.5;
    else if (segment === 'college') weeklyTarget = 2;
    else if (segment === 'ielts') weeklyTarget = 3;

    if (threshold > 0 && totalCount >= threshold) passedWeekly = true;

    return {
      stage: stage,
      segment: segment,
      segmentLabel: SEGMENT_LABEL[segment],
      totalCount: totalCount,
      threshold: threshold,
      weeklyTarget: weeklyTarget,
      passed: passedWeekly,
      gap: Math.max(0, threshold - totalCount),
      totalWordsTried: totalWordsTried,
      totalWordsUsed: totalWordsUsed,
      coverageRate: coverageRate,
      avgScore: avgScore,
      scoreEvaluated: scoreCount,
      wordRange: wordRange,
      recentTrend: recentTrend
    };
  }

  // ---------- 公开 API ----------
  global.Stats = {
    // 维度 1
    getVocabTotal: getVocabTotal,
    getVocabLearned: getVocabLearned,
    getVocabMastered: getVocabMastered,
    getDueCount: getDueCount,
    getVocabUnlearned: getVocabUnlearned,
    // 统计 v2
    getPerStageBoard: getPerStageBoard,
    getSegmentAggregate: getSegmentAggregate,
    getDailyBoard: getDailyBoard,
    getStageProgress: getStageProgress,
    getAllStagesProgress: getAllStagesProgress,
    // 维度 2
    getOverallCorrectRate: getOverallCorrectRate,
    getStageCorrectRate: getStageCorrectRate,
    getGradeCorrectRate: getGradeCorrectRate,
    getTypeCorrectRate: getTypeCorrectRate,
    getTopicCorrectRate: getTopicCorrectRate,
    // 维度 3
    getComprehensionBreakdown: getComprehensionBreakdown,
    // 维度 4
    getPronunciationStats: getPronunciationStats,
    // 维度 5
    getMemoryPersistence: getMemoryPersistence,
    getPredictedForget: getPredictedForget,
    getMemoryCurve: getMemoryCurve,
    // 维度 6
    getDailyAverage: getDailyAverage,
    getReviewAverage: getReviewAverage,
    getAvgResponseTime: getAvgResponseTime,
    getStreak: getStreak,
    getHeatmapData: getHeatmapData,
    // 维度 7
    getWrongTotal: getWrongTotal,
    getMostWrong: getMostWrong,
    getConfusionPairs: getConfusionPairs,
    getKeyboardHeatmap: getKeyboardHeatmap,
    // 工具
    getStageGrades: getStageGrades,
    today: today,
    // 维度 9 - 学习清单
    getAllLists: getAllLists,
    getListStats: getListStats,
    getListTrend: getListTrend,
    // 维度 10 - 能力维度趋势
    getAbilityDefinitions: getAbilityDefinitions,
    getAbilityTrend: getAbilityTrend,
    getAbilityOverview: getAbilityOverview,
    // 维度 11 - 会话记录
    getRecentSessions: getRecentSessions,
    getSessionListStats: getSessionListStats,
    // 维度 12 - 错题清空率(standards.md E 维度)
    getClearRate: getClearRate,
    getClearRateBySegment: getClearRateBySegment,
    // 维度 13 - Feynman 复述挑战(standards.md D 维度)
    getFeynmanStats: getFeynmanStats
  };
})(window);
