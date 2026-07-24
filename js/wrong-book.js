/**
 * VocabMastery · Wrong Book Module
 * 错题本管理:基于 Storage 的 wrong_book 增删查与统计
 * 持久化在 localStorage,跨刷新保留
 */
(function (global) {
  'use strict';

  function loadAll() {
    try {
      var raw = localStorage.getItem('vm_wrong_meta');
      if (!raw) return { frequency: {}, lastAt: {} };
      return JSON.parse(raw);
    } catch (err) {
      return { frequency: {}, lastAt: {} };
    }
  }

  function saveAll(meta) {
    try {
      localStorage.setItem('vm_wrong_meta', JSON.stringify(meta));
    } catch (err) {
      console.warn('[WrongBook] save meta failed', err);
    }
  }

  // 词频统计:每次答错都 +1
  function bumpMeta(stage, wordId) {
    var meta = loadAll();
    var key = stage + ':' + wordId;
    meta.frequency[key] = (meta.frequency[key] || 0) + 1;
    meta.lastAt[key] = Date.now();
    saveAll(meta);
  }

  /**
   * 获取某词库下的所有错词
   * @returns {Array<{wordId, word, translation, frequency, lastAt}>}
   */
  function getAll(stage) {
    var ids = Storage.getWrongBook(stage) || [];
    var vocab = Storage.getVocab(stage);
    var meta = loadAll();
    var result = [];
    ids.forEach(function (id) {
      var w = vocab && vocab.words ? vocab.words.find(function (x) { return x.id === id; }) : null;
      var key = stage + ':' + id;
      result.push({
        wordId: id,
        word: w ? w.word : ('#' + id),
        translation: w ? (w.translation || '') : '',
        phonetic: w ? (w.phonetic || '') : '',
        frequency: meta.frequency[key] || 1,
        lastAt: meta.lastAt[key] || null
      });
    });
    return result;
  }

  /**
   * 添加错词(幂等)
   * 同时:错词加入错题本 + 降级 SRS 间隔到 1 天 + 累计错次
   */
  function add(stage, wordId) {
    if (Storage.addWrong) Storage.addWrong(stage, wordId);
    bumpMeta(stage, wordId);
    // 降级:错词 1 天后再复习
    if (Storage.getCard && Storage.updateCard) {
      var card = Storage.getCard(stage, wordId);
      if (card) {
        var next = Object.assign({}, card, {
          lapses: (card.lapses || 0) + 1,
          interval: 1,
          dueDate: SRS.addDays(Storage.todayStr(), 1)
        });
        Storage.updateCard(stage, wordId, next);
      }
    }
  }

  /**
   * 从错题本移除(用户主动掌握)
   */
  function remove(stage, wordId) {
    if (Storage.removeWrong) Storage.removeWrong(stage, wordId);
  }

  function isInBook(stage, wordId) {
    var book = Storage.getWrongBook(stage) || [];
    return book.indexOf(wordId) !== -1;
  }

  /**
   * 错题统计
   * { total, uniqueWords, topFrequent: [...] }
   */
  function getStats(stage) {
    var book = getAll(stage);
    var totalErrors = book.reduce(function (s, w) { return s + (w.frequency || 0); }, 0);
    return {
      stage: stage,
      total: book.length,
      uniqueWords: book.length,
      totalErrors: totalErrors,
      topFrequent: book.slice().sort(function (a, b) { return b.frequency - a.frequency; }).slice(0, 10)
    };
  }

  /**
   * 获取错次最高的 Top N
   */
  function getMostFrequent(stage, n) {
    n = n || 10;
    return getStats(stage).topFrequent.slice(0, n);
  }

  /**
   * 清空错题本
   */
  function clear(stage) {
    var book = Storage.getWrongBook(stage) || [];
    book.forEach(function (id) { Storage.removeWrong(stage, id); });
  }

  global.WrongBook = {
    getAll: getAll,
    add: add,
    remove: remove,
    isInBook: isInBook,
    getStats: getStats,
    getMostFrequent: getMostFrequent,
    clear: clear
  };
})(window);
