// Smoke test: study-lists.addWordToList + StudyLists round-trip
const fs = require('fs');
const path = require('path');

global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
global.BackendSync = undefined;

eval(fs.readFileSync(path.join(__dirname, 'js', 'study-lists.js'), 'utf8'));

const SL = global.StudyLists;

console.log('Test 1: createList');
const list = SL.createList({ name: '水果清单', stage: 'gaoyi', wordIds: [] });
console.log('  id =', list.id, 'name =', list.name);

console.log('Test 2: addWordToList - new word');
const r1 = SL.addWordToList(list.id, 1);
console.log('  result =', r1);

console.log('Test 3: addWordToList - duplicate');
const r2 = SL.addWordToList(list.id, 1);
console.log('  result =', r2);

console.log('Test 4: addWordToList - 2nd new word');
const r3 = SL.addWordToList(list.id, 2);
console.log('  result =', r3);

console.log('Test 5: addWordToList - bad list id');
const r4 = SL.addWordToList('nope', 1);
console.log('  result =', r4);

console.log('Test 6: getList round-trip');
const back = SL.getList(list.id);
console.log('  wordIds =', back.wordIds);

console.log('Test 7: getAllLists count');
console.log('  count =', SL.getAllLists().length);

console.log('Test 8: removeWordFromList');
const r5 = SL.removeWordFromList(list.id, 1);
console.log('  result =', r5);

console.log('Test 9: persistence check');
const raw = global.localStorage.getItem('vm_study_lists');
const arr = JSON.parse(raw);
console.log('  saved wordIds =', arr[0].wordIds);

console.log('\n✓ addWordToList smoke test passed');