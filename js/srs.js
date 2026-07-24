/**
 * SRS module: SuperMemo SM-2 spaced repetition algorithm.
 * Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 *
 * Ratings:
 *   Again  -> q = 1  (failure; reset)
 *   Hard   -> q = 3
 *   Good   -> q = 4
 *   Easy   -> q = 5
 *
 * The card state passed in must contain at least:
 *   { ef, interval, repetitions, dueDate, lastReviewed, lapses, stats }
 *
 * Returns a NEW card object (does not mutate input).
 */
(function (global) {
  'use strict';

  var MIN_EF = 1.3;
  var DEFAULT_EF = 2.5;
  var MS_PER_DAY = 86400000;

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function addDays(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function newCard() {
    return {
      ef: DEFAULT_EF,
      interval: 0,
      repetitions: 0,
      dueDate: todayStr(),
      lastReviewed: null,
      lapses: 0,
      addedDate: todayStr(),
      stats: { attempts: 0, correct: 0, wrong: 0, totalTime: 0 }
    };
  }

  /**
   * Compute next EF using the SM-2 formula.
   * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
   * Clamped at MIN_EF = 1.3.
   */
  function calcEF(prevEF, q) {
    var next = prevEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (next < MIN_EF) next = MIN_EF;
    // Round to 3 decimals for cleanliness
    return Math.round(next * 1000) / 1000;
  }

  /**
   * Map user-friendly rating to SM-2 quality score.
   * Again -> 1, Hard -> 3, Good -> 4, Easy -> 5
   */
  function ratingToQuality(rating) {
    switch (rating) {
      case 'again': return 1;
      case 'hard': return 3;
      case 'good': return 4;
      case 'easy': return 5;
      default: return 4;
    }
  }

  /**
   * Main review function.
   * @param {Object} card  - current card state
   * @param {string} rating - 'again' | 'hard' | 'good' | 'easy'
   * @param {Object} options - { timeMs?: number } - reaction time in ms
   * @returns {Object} next card state
   */
  function review(card, rating, options) {
    options = options || {};
    var now = todayStr();
    var q = ratingToQuality(rating);

    // Build a working copy with defaults
    var current = card ? Object.assign({}, card) : newCard();
    if (!current.stats) {
      current.stats = { attempts: 0, correct: 0, wrong: 0, totalTime: 0 };
    }

    var prevEF = current.ef || DEFAULT_EF;
    var prevInterval = current.interval || 0;
    var prevReps = current.repetitions || 0;
    var prevLapses = current.lapses || 0;

    var newEF = calcEF(prevEF, q);
    var newInterval;
    var newReps;
    var newLapses = prevLapses;

    if (q < 3) {
      // Failure: reset to learning state
      newReps = 0;
      newInterval = 1;
      newLapses = prevLapses + 1;
    } else {
      newReps = prevReps + 1;
      if (newReps === 1) {
        newInterval = 1;
      } else if (newReps === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(prevInterval * newEF);
        if (newInterval < 1) newInterval = 1;
      }
    }

    var dueDate = addDays(now, newInterval);

    // Update stats
    var newStats = {
      attempts: (current.stats.attempts || 0) + 1,
      correct: (current.stats.correct || 0) + (q >= 3 ? 1 : 0),
      wrong: (current.stats.wrong || 0) + (q < 3 ? 1 : 0),
      totalTime: (current.stats.totalTime || 0) +
        (options.timeMs ? Math.round(options.timeMs / 1000) : 0)
    };

    return {
      ef: newEF,
      interval: newInterval,
      repetitions: newReps,
      dueDate: dueDate,
      lastReviewed: now,
      lapses: newLapses,
      addedDate: current.addedDate || now,
      stats: newStats
    };
  }

  /**
   * Compute the next due date (preview, no state mutation).
   */
  function previewNext(card, rating) {
    var q = ratingToQuality(rating);
    var now = todayStr();
    var prevEF = (card && card.ef) || DEFAULT_EF;
    var prevInterval = (card && card.interval) || 0;
    var prevReps = (card && card.repetitions) || 0;
    var newEF = calcEF(prevEF, q);
    var interval;
    if (q < 3) {
      interval = 1;
    } else {
      var reps = prevReps + 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 6;
      else {
        interval = Math.round(prevInterval * newEF);
        if (interval < 1) interval = 1;
      }
    }
    return {
      ef: newEF,
      interval: interval,
      dueDate: addDays(now, interval)
    };
  }

  // ---------- Public API ----------
  global.SRS = {
    review: review,
    previewNext: previewNext,
    ratingToQuality: ratingToQuality,
    calcEF: calcEF,
    newCard: newCard,
    MIN_EF: MIN_EF,
    DEFAULT_EF: DEFAULT_EF,
    todayStr: todayStr,
    addDays: addDays
  };
})(window);