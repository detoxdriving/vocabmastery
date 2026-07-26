var fs = require('fs');

var real = JSON.parse(fs.readFileSync('d:/trae solo/english study/real-missing.json', 'utf-8'));

// 解析词性 + 中文释义
function parseEntry(e) {
  var rest = e.rest.trim();
  // 提取词性
  var posMatch = rest.match(/^(v\.|vt\.|vi\.|n\.|a\.|ad\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.|art\.|num\.|aux\.)/i);
  var pos = posMatch ? posMatch[1].toLowerCase().replace(/\.$/, '') : '';
  var trans = rest.slice(posMatch ? posMatch[0].length : 0).trim();
  // 清理中文释义
  trans = trans.replace(/^\s*[.,:;]\s*/, '');
  // 处理多词性: "a./n." → "n." 默认取第一个
  return {
    word: e.word,
    phonetic: e.phonetic,
    pos: pos,
    translation: trans.slice(0, 60),
    definition: '',
    root: '',
    family: [],
    examples: [],
    collocations: [],
    synonyms: [],
    antonyms: [],
    keyword: '',
    image: '📘',
    topic: 'high-school',
    grade: '',
    frequency: 4500,
    difficulty: 2
  };
}

var allWords = real.map(parseEntry);

// 按字母排序
allWords.sort(function (a, b) { return a.word.toLowerCase().localeCompare(b.word.toLowerCase()); });

console.log('总词数:', allWords.length);
console.log('首词:', allWords[0].word, '尾词:', allWords[allWords.length - 1].word);

// 平均分成 4 份
var groups = {
  gaoer_shang: [],
  gaoer_xia: [],
  gaosan_shang: [],
  gaosan_xia: []
};

var quarter = Math.ceil(allWords.length / 4);
groups.gaoer_shang = allWords.slice(0, quarter);
groups.gaoer_xia = allWords.slice(quarter, 2 * quarter);
groups.gaosan_shang = allWords.slice(2 * quarter, 3 * quarter);
groups.gaosan_xia = allWords.slice(3 * quarter);

Object.keys(groups).forEach(function (k) {
  console.log(k + ': ' + groups[k].length + ' 词 (' + groups[k][0].word + ' ~ ' + groups[k][groups[k].length - 1].word + ')');
});

// 把 grade 字段写好
groups.gaoer_shang.forEach(function (w) { w.grade = 'gaoer-shang'; w.stage = 'senior'; });
groups.gaoer_xia.forEach(function (w) { w.grade = 'gaoer-xia'; w.stage = 'senior'; });
groups.gaosan_shang.forEach(function (w) { w.grade = 'gaosan-shang'; w.stage = 'senior'; });
groups.gaosan_xia.forEach(function (w) { w.grade = 'gaosan-xia'; w.stage = 'senior'; });

// 输出 word-data/gaoer-shang.js 等文件
function emit(filename, words) {
  var lines = [
    '// ' + filename.replace('.js', '') + ' · ' + words.length + ' 词',
    '// 来源:高考英语词汇3500词精校版(顺序版) + word-data 补充',
    'module.exports = ['
  ];
  words.forEach(function (w, i) {
    var line = JSON.stringify(w);
    if (i < words.length - 1) line += ',';
    lines.push(line);
  });
  lines.push('];');
  var content = lines.join('\n');
  fs.writeFileSync('d:/trae solo/english study/word-data/' + filename, content, 'utf-8');
  console.log('✅ 已写入 word-data/' + filename + ' (' + Math.round(content.length / 1024) + ' KB)');
}

emit('gaoer-shang.js', groups.gaoer_shang);
emit('gaoer-xia.js', groups.gaoer_xia);
emit('gaosan-shang.js', groups.gaosan_shang);
emit('gaosan-xia.js', groups.gaosan_xia);

// 还要写一个 chuzhong-supplement 不覆盖的基础词补到 gaoyi-shang / gaoyi-xia 里吗?
// 不,用户原话是"高中补充完毕"。 gaoyi 已有 2859 词,新加 718 在高二高三上。

console.log('\n完成。');
console.log('高中 6 学期统计:');
console.log('  gaoyi-shang: 1458 词');
console.log('  gaoyi-xia:   1401 词');
console.log('  gaoer-shang: ' + groups.gaoer_shang.length + ' 词');
console.log('  gaoer-xia:   ' + groups.gaoer_xia.length + ' 词');
console.log('  gaosan-shang:' + groups.gaosan_shang.length + ' 词');
console.log('  gaosan-xia:  ' + groups.gaosan_xia.length + ' 词');
console.log('  合计: ' + (1458 + 1401 + groups.gaoer_shang.length + groups.gaoer_xia.length + groups.gaosan_shang.length + groups.gaosan_xia.length) + ' 词');