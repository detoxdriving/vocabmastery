(function (global) {
  'use strict';

  var EXTRA = {
    "abandon": {
      phoneticEn: "/əˈbændən/",
      phoneticUs: "/əˈbændən/",
      syllables: ["a", "ban", "don"],
      syllableCount: 3,
      wordForms: [
        { label: "第三人称单数", form: "abandons" },
        { label: "现在分词", form: "abandoning" },
        { label: "过去式", form: "abandoned" },
        { label: "过去分词", form: "abandoned" },
        { label: "名词", form: "abandonment" }
      ],
      definitionEn: "to leave a place, thing, or person permanently",
      notes: [
        { label: "词根词缀", text: "a-(加强)+ bandon(控制) → 放弃控制 → 抛弃" }
      ],
      collocations: [
        { phrase: "abandon hope", trans: "放弃希望" },
        { phrase: "abandon oneself to", trans: "沉溺于,陷入" },
        { phrase: "abandon ship", trans: "弃船" }
      ],
      synonyms: [
        { word: "desert", phonetic: "/ˈdezət/", trans: "遗弃,放弃",
          exampleEn: "He deserted his family and moved abroad.",
          exampleZh: "他抛弃了家人,移居国外。" },
        { word: "forsake", phonetic: "/fəˈseɪk/", trans: "摒弃,抛弃",
          exampleEn: "She forsook her old habits and started a new life.",
          exampleZh: "她摒弃旧习惯,开始了新生活。" },
        { word: "quit", phonetic: "/kwɪt/", trans: "停止,放弃",
          exampleEn: "He quit his job to pursue his dream.",
          exampleZh: "他辞掉工作去追寻梦想。" }
      ],
      antonyms: [
        { word: "keep", phonetic: "/kiːp/", trans: "保留" },
        { word: "retain", phonetic: "/rɪˈteɪn/", trans: "保持" }
      ],
      sceneExamples: [
        { scene: "日常", en: "He had to abandon his car in the snow.", zh: "他不得不在雪中弃车而去。" },
        { scene: "文学", en: "Never abandon hope, even in the darkest times.", zh: "即使在最黑暗的时刻,也绝不放弃希望。" },
        { scene: "影视", en: "The crew decided to abandon the sinking ship.", zh: "船员们决定弃船逃离。" }
      ]
    },
    "ability": {
      phoneticEn: "/əˈbɪlɪti/",
      phoneticUs: "/əˈbɪlɪti/",
      syllables: ["a", "bil", "i", "ty"],
      syllableCount: 4,
      wordForms: [
        { label: "复数", form: "abilities" },
        { label: "形容词", form: "able" },
        { label: "副词", form: "ably" }
      ],
      definitionEn: "the power or skill to do something",
      notes: [
        { label: "词根词缀", text: "abil(=able 能够) + -ity(名词后缀) → 能力" }
      ],
      collocations: [
        { phrase: "have the ability to", trans: "有能力做…" },
        { phrase: "to the best of one's ability", trans: "竭尽全力" },
        { phrase: "natural ability", trans: "天赋" }
      ],
      synonyms: [
        { word: "capability", phonetic: "/ˌkeɪpəˈbɪlɪti/", trans: "能力,才能" },
        { word: "capacity", phonetic: "/kəˈpæsɪti/", trans: "容量,能力" },
        { word: "skill", phonetic: "/skɪl/", trans: "技能" }
      ],
      antonyms: [
        { word: "inability", phonetic: "/ɪnəˈbɪlɪti/", trans: "无能" }
      ],
      sceneExamples: [
        { scene: "面试", en: "I have the ability to work under pressure.", zh: "我具备在压力下工作的能力。" },
        { scene: "教育", en: "She has a natural ability for languages.", zh: "她有学习语言的天赋。" },
        { scene: "职场", en: "We choose people based on ability, not background.", zh: "我们根据能力而非背景选人。" }
      ]
    },
    "able": {
      phoneticEn: "/ˈeɪbəl/",
      phoneticUs: "/ˈeɪbəl/",
      syllables: ["a", "ble"],
      syllableCount: 2,
      wordForms: [
        { label: "副词", form: "ably" },
        { label: "名词", form: "ability" },
        { label: "比较级", form: "abler" },
        { label: "最高级", form: "ablest" }
      ],
      definitionEn: "having the power, skill, or means to do something",
      notes: [
        { label: "用法", text: "be able to do sth. = can do sth. 表示'能够做某事'" }
      ],
      collocations: [
        { phrase: "be able to", trans: "能够" },
        { phrase: "able-bodied", trans: "身体健康的" }
      ],
      synonyms: [
        { word: "capable", phonetic: "/ˈkeɪpəbəl/", trans: "有能力的" },
        { word: "competent", phonetic: "/ˈkɒmpɪtənt/", trans: "能胜任的" }
      ],
      antonyms: [
        { word: "unable", phonetic: "/ʌnˈeɪbəl/", trans: "不能的" }
      ],
      sceneExamples: [
        { scene: "日常", en: "Will you be able to come to the meeting?", zh: "你能来参加会议吗?" },
        { scene: "口语", en: "I was finally able to fix the computer.", zh: "我终于把电脑修好了。" }
      ]
    },
    "abnormal": {
      phoneticEn: "/æbˈnɔːməl/",
      phoneticUs: "/æbˈnɔːrməl/",
      syllables: ["ab", "nor", "mal"],
      syllableCount: 3,
      wordForms: [
        { label: "副词", form: "abnormally" },
        { label: "名词", form: "abnormality" },
        { label: "复数", form: "abnormalities" }
      ],
      definitionEn: "different from what is normal or usual",
      notes: [
        { label: "词根词缀", text: "ab-(偏离) + norm(标准) + -al(形容词) → 偏离标准的 → 反常的" }
      ],
      collocations: [
        { phrase: "abnormal behavior", trans: "异常行为" },
        { phrase: "abnormal weather", trans: "反常天气" }
      ],
      synonyms: [
        { word: "unusual", phonetic: "/ʌnˈjuːʒuəl/", trans: "不寻常的" },
        { word: "irregular", phonetic: "/ɪˈreɡjələ(r)/", trans: "不规则的" }
      ],
      antonyms: [
        { word: "normal", phonetic: "/ˈnɔːməl/", trans: "正常的" },
        { word: "typical", phonetic: "/ˈtɪpɪkəl/", trans: "典型的" }
      ],
      sceneExamples: [
        { scene: "医疗", en: "The doctor found an abnormal growth in the X-ray.", zh: "医生在 X 光片上发现了异常肿块。" },
        { scene: "气象", en: "The abnormal heat wave lasted for weeks.", zh: "反常的热浪持续了好几周。" }
      ]
    },
    "academic": {
      phoneticEn: "/ˌækəˈdemɪk/",
      phoneticUs: "/ˌækəˈdemɪk/",
      syllables: ["ac", "a", "dem", "ic"],
      syllableCount: 4,
      wordForms: [
        { label: "副词", form: "academically" },
        { label: "名词", form: "academy" },
        { label: "名词", form: "academia" }
      ],
      definitionEn: "relating to education, schools, or universities",
      notes: [
        { label: "词根词缀", text: "academ(学院) + -ic(形容词) → 学院的 → 学术的" }
      ],
      collocations: [
        { phrase: "academic performance", trans: "学业表现" },
        { phrase: "academic year", trans: "学年" },
        { phrase: "academic research", trans: "学术研究" }
      ],
      synonyms: [
        { word: "scholarly", phonetic: "/ˈskɒləli/", trans: "学术的" },
        { word: "educational", phonetic: "/ˌedjuˈkeɪʃənəl/", trans: "教育的" }
      ],
      sceneExamples: [
        { scene: "教育", en: "Her academic record is excellent.", zh: "她的学业成绩非常优秀。" },
        { scene: "研究", en: "He spent his whole life in academic research.", zh: "他毕生从事学术研究。" }
      ]
    },
    "accept": {
      phoneticEn: "/əkˈsept/",
      phoneticUs: "/əkˈsept/",
      syllables: ["ac", "cept"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "acceptance" },
        { label: "形容词", form: "acceptable" },
        { label: "形容词", form: "accepted" },
        { label: "反义词", form: "reject" }
      ],
      definitionEn: "to agree to receive or take something offered",
      notes: [
        { label: "词根词缀", text: "ac-(加强) + cept(拿,取) → 一再拿走 → 接受" }
      ],
      collocations: [
        { phrase: "accept an invitation", trans: "接受邀请" },
        { phrase: "accept responsibility", trans: "承担责任" },
        { phrase: "accept...as", trans: "把…看作" }
      ],
      synonyms: [
        { word: "receive", phonetic: "/rɪˈsiːv/", trans: "收到" },
        { word: "take", phonetic: "/teɪk/", trans: "拿,接受" }
      ],
      antonyms: [
        { word: "refuse", phonetic: "/rɪˈfjuːz/", trans: "拒绝" },
        { word: "reject", phonetic: "/rɪˈdʒekt/", trans: "拒收" }
      ],
      sceneExamples: [
        { scene: "社交", en: "I'm happy to accept your invitation.", zh: "我很高兴接受你的邀请。" },
        { scene: "职场", en: "She accepted the job offer immediately.", zh: "她立刻接受了那份工作。" }
      ]
    },
    "accident": {
      phoneticEn: "/ˈæksɪdənt/",
      phoneticUs: "/ˈæksɪdənt/",
      syllables: ["ac", "ci", "dent"],
      syllableCount: 3,
      wordForms: [
        { label: "形容词", form: "accidental" },
        { label: "副词", form: "accidentally" },
        { label: "复数", form: "accidents" }
      ],
      definitionEn: "an unexpected event that causes damage or harm",
      notes: [
        { label: "词根词缀", text: "ac-(加强) + cid(落下) + -ent → 偶然落下 → 事故" }
      ],
      collocations: [
        { phrase: "traffic accident", trans: "交通事故" },
        { phrase: "by accident", trans: "偶然,意外地" },
        { phrase: "car accident", trans: "车祸" }
      ],
      synonyms: [
        { word: "incident", phonetic: "/ˈɪnsɪdənt/", trans: "事件" },
        { word: "mishap", phonetic: "/ˈmɪshæp/", trans: "不幸之事" }
      ],
      sceneExamples: [
        { scene: "新闻", en: "He was injured in a car accident.", zh: "他在车祸中受了伤。" },
        { scene: "日常", en: "I met her by accident at the airport.", zh: "我在机场偶然遇见了她。" }
      ]
    },
    "achieve": {
      phoneticEn: "/əˈtʃiːv/",
      phoneticUs: "/əˈtʃiːv/",
      syllables: ["a", "chieve"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "achievement" },
        { label: "形容词", form: "achievable" },
        { label: "第三人称单数", form: "achieves" }
      ],
      definitionEn: "to succeed in finishing something or reaching a goal",
      notes: [
        { label: "词根词缀", text: "a-(到) + chieve(头) → 到达头顶 → 完成,达到" }
      ],
      collocations: [
        { phrase: "achieve success", trans: "取得成功" },
        { phrase: "achieve a goal", trans: "达成目标" },
        { phrase: "achieve great things", trans: "成就大事" }
      ],
      synonyms: [
        { word: "accomplish", phonetic: "/əˈkʌmplɪʃ/", trans: "完成" },
        { word: "attain", phonetic: "/əˈteɪn/", trans: "达到" }
      ],
      sceneExamples: [
        { scene: "职场", en: "She achieved great success in her career.", zh: "她在事业上取得了巨大成功。" },
        { scene: "学习", en: "Hard work helps you achieve your goals.", zh: "努力工作帮助你达成目标。" }
      ]
    },
    "action": {
      phoneticEn: "/ˈækʃən/",
      phoneticUs: "/ˈækʃən/",
      syllables: ["ac", "tion"],
      syllableCount: 2,
      wordForms: [
        { label: "动词", form: "act" },
        { label: "形容词", form: "active" },
        { label: "副词", form: "actively" }
      ],
      definitionEn: "the process of doing something",
      notes: [
        { label: "词根词缀", text: "act(行动) + -ion(名词后缀) → 行动" }
      ],
      collocations: [
        { phrase: "take action", trans: "采取行动" },
        { phrase: "in action", trans: "在运转中" },
        { phrase: "action movie", trans: "动作片" }
      ],
      synonyms: [
        { word: "act", phonetic: "/ækt/", trans: "行为" },
        { word: "deed", phonetic: "/diːd/", trans: "事迹" }
      ],
      sceneExamples: [
        { scene: "日常", en: "We must take action to protect the environment.", zh: "我们必须采取行动保护环境。" },
        { scene: "电影", en: "The action movie was full of exciting scenes.", zh: "这部动作片充满了激动人心的场面。" }
      ]
    },
    "active": {
      phoneticEn: "/ˈæktɪv/",
      phoneticUs: "/ˈæktɪv/",
      syllables: ["ac", "tive"],
      syllableCount: 2,
      wordForms: [
        { label: "副词", form: "actively" },
        { label: "名词", form: "activity" },
        { label: "反义词", form: "passive" }
      ],
      definitionEn: "doing things; moving or working",
      notes: [
        { label: "词根词缀", text: "act(行动) + -ive(形容词) → 行动的 → 积极的" }
      ],
      collocations: [
        { phrase: "active voice", trans: "主动语态" },
        { phrase: "take an active part in", trans: "积极参与" },
        { phrase: "physically active", trans: "身体活跃的" }
      ],
      synonyms: [
        { word: "energetic", phonetic: "/ˌenəˈdʒetɪk/", trans: "精力充沛的" },
        { word: "lively", phonetic: "/ˈlaɪvli/", trans: "活泼的" }
      ],
      antonyms: [
        { word: "passive", phonetic: "/ˈpæsɪv/", trans: "被动的" },
        { word: "inactive", phonetic: "/ɪnˈæktɪv/", trans: "不活跃的" }
      ],
      sceneExamples: [
        { scene: "运动", en: "He is very active in playing basketball.", zh: "他非常热衷于打篮球。" },
        { scene: "语法", en: "This sentence is in the active voice.", zh: "这个句子是主动语态。" }
      ]
    },
    "advantage": {
      phoneticEn: "/ədˈvɑːntɪdʒ/",
      phoneticUs: "/ədˈvæntɪdʒ/",
      syllables: ["ad", "van", "tage"],
      syllableCount: 3,
      wordForms: [
        { label: "形容词", form: "advantageous" },
        { label: "副词", form: "advantageously" },
        { label: "复数", form: "advantages" }
      ],
      definitionEn: "something that helps you or gives you a better position",
      notes: [
        { label: "词根词缀", text: "ad-(朝向) + vantage(优势) → 有利之处" }
      ],
      collocations: [
        { phrase: "take advantage of", trans: "利用" },
        { phrase: "have an advantage over", trans: "比…有优势" },
        { phrase: "competitive advantage", trans: "竞争优势" }
      ],
      synonyms: [
        { word: "benefit", phonetic: "/ˈbenɪfɪt/", trans: "好处" },
        { word: "edge", phonetic: "/edʒ/", trans: "优势" }
      ],
      antonyms: [
        { word: "disadvantage", phonetic: "/ˌdɪsədˈvɑːntɪdʒ/", trans: "不利" }
      ],
      sceneExamples: [
        { scene: "职场", en: "Speaking English gives her an advantage in the job market.", zh: "会说英语让她在就业市场有优势。" },
        { scene: "日常", en: "Take advantage of the warm weather to go hiking.", zh: "趁着天气好去远足吧。" }
      ]
    },
    "advice": {
      phoneticEn: "/ədˈvaɪs/",
      phoneticUs: "/ədˈvaɪs/",
      syllables: ["ad", "vice"],
      syllableCount: 2,
      wordForms: [
        { label: "动词", form: "advise" },
        { label: "形容词", form: "advisable" },
        { label: "不可数", form: "无复数形式" }
      ],
      definitionEn: "an opinion given to help someone decide what to do",
      notes: [
        { label: "重要", text: "advice 是不可数名词,不可说 an advice 或 advices" }
      ],
      collocations: [
        { phrase: "a piece of advice", trans: "一条建议" },
        { phrase: "ask for advice", trans: "征求建议" },
        { phrase: "follow advice", trans: "听从建议" }
      ],
      synonyms: [
        { word: "suggestion", phonetic: "/səˈdʒestʃən/", trans: "建议" },
        { word: "tip", phonetic: "/tɪp/", trans: "小贴士" }
      ],
      sceneExamples: [
        { scene: "日常", en: "Let me give you a piece of advice.", zh: "我给你一个建议吧。" },
        { scene: "职场", en: "She asked her boss for advice on the project.", zh: "她向老板征求项目建议。" }
      ]
    },
    "ago": {
      phoneticEn: "/əˈɡəʊ/",
      phoneticUs: "/əˈɡoʊ/",
      syllables: ["a", "go"],
      syllableCount: 2,
      wordForms: [],
      definitionEn: "back in time from now",
      notes: [
        { label: "用法", text: "只能与一般过去时连用:long ago / a week ago" }
      ],
      collocations: [
        { phrase: "long ago", trans: "很久以前" },
        { phrase: "a while ago", trans: "不久前" }
      ],
      synonyms: [
        { word: "before", phonetic: "/bɪˈfɔː(r)/", trans: "以前" }
      ],
      sceneExamples: [
        { scene: "日常", en: "I graduated from college three years ago.", zh: "我三年前从大学毕业。" },
        { scene: "回忆", en: "Long ago, there lived a wise old man.", zh: "很久以前,那里住着一位智慧的老人。" }
      ]
    },
    "agree": {
      phoneticEn: "/əˈɡriː/",
      phoneticUs: "/əˈɡriː/",
      syllables: ["a", "gree"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "agreement" },
        { label: "形容词", form: "agreeable" },
        { label: "第三人称单数", form: "agrees" }
      ],
      definitionEn: "to have the same opinion as someone else",
      notes: [
        { label: "搭配", text: "agree with sb. / agree to sth. / agree that..." }
      ],
      collocations: [
        { phrase: "agree with", trans: "同意某人" },
        { phrase: "agree to", trans: "同意某事" },
        { phrase: "agree on", trans: "就…达成一致" }
      ],
      synonyms: [
        { word: "consent", phonetic: "/kənˈsent/", trans: "同意" },
        { word: "concur", phonetic: "/kənˈkɜː(r)/", trans: "意见一致" }
      ],
      antonyms: [
        { word: "disagree", phonetic: "/ˌdɪsəˈɡriː/", trans: "不同意" }
      ],
      sceneExamples: [
        { scene: "日常", en: "I completely agree with you.", zh: "我完全同意你的看法。" },
        { scene: "商务", en: "Both parties agreed to the contract terms.", zh: "双方都同意合同条款。" }
      ]
    },
    "amaze": {
      phoneticEn: "/əˈmeɪz/",
      phoneticUs: "/əˈmeɪz/",
      syllables: ["a", "maze"],
      syllableCount: 2,
      wordForms: [
        { label: "形容词", form: "amazed" },
        { label: "形容词", form: "amazing" },
        { label: "名词", form: "amazement" }
      ],
      definitionEn: "to surprise someone very much",
      notes: [
        { label: "辨析", text: "amazed(感到惊讶) / amazing(令人惊讶的)" }
      ],
      collocations: [
        { phrase: "amazed at", trans: "对…感到惊讶" },
        { phrase: "amazing grace", trans: "奇异恩典" }
      ],
      synonyms: [
        { word: "astonish", phonetic: "/əˈstɒnɪʃ/", trans: "使惊讶" },
        { word: "astound", phonetic: "/əˈstaʊnd/", trans: "使震惊" }
      ],
      sceneExamples: [
        { scene: "口语", en: "You never cease to amaze me.", zh: "你总是让我感到惊喜。" },
        { scene: "旅行", en: "The view from the mountain amazed us.", zh: "山上的景色让我们惊叹不已。" }
      ]
    },
    "ancient": {
      phoneticEn: "/ˈeɪnʃənt/",
      phoneticUs: "/ˈeɪnʃənt/",
      syllables: ["an", "cient"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "antiquity" },
        { label: "副词", form: "anciently" }
      ],
      definitionEn: "very old; belonging to a time long ago",
      notes: [
        { label: "联想", text: "ancient - modern - contemporary(古-今-当代)" }
      ],
      collocations: [
        { phrase: "ancient history", trans: "古代史" },
        { phrase: "ancient civilization", trans: "古代文明" }
      ],
      synonyms: [
        { word: "antique", phonetic: "/ænˈtiːk/", trans: "古老的" },
        { word: "archaic", phonetic: "/ɑːˈkeɪɪk/", trans: "古代的" }
      ],
      antonyms: [
        { word: "modern", phonetic: "/ˈmɒdn/", trans: "现代的" }
      ],
      sceneExamples: [
        { scene: "历史", en: "Ancient Egypt is famous for its pyramids.", zh: "古埃及以其金字塔闻名。" },
        { scene: "旅行", en: "We visited many ancient temples in Greece.", zh: "我们在希腊参观了许多古老的寺庙。" }
      ]
    },
    "animal": {
      phoneticEn: "/ˈænɪməl/",
      phoneticUs: "/ˈænɪməl/",
      syllables: ["an", "i", "mal"],
      syllableCount: 3,
      wordForms: [
        { label: "复数", form: "animals" },
        { label: "形容词", form: "animalistic" }
      ],
      definitionEn: "a living creature that can move and feel",
      notes: [
        { label: "辨析", text: "animal(动物) / creature(生物,含人)" }
      ],
      collocations: [
        { phrase: "wild animal", trans: "野生动物" },
        { phrase: "domestic animal", trans: "家畜" },
        { phrase: "animal rights", trans: "动物权利" }
      ],
      synonyms: [
        { word: "creature", phonetic: "/ˈkriːtʃə(r)/", trans: "生物" },
        { word: "beast", phonetic: "/biːst/", trans: "野兽" }
      ],
      sceneExamples: [
        { scene: "自然", en: "Lions are the king of the animal world.", zh: "狮子是动物世界之王。" },
        { scene: "儿童", en: "Children love watching animal videos.", zh: "孩子们喜欢看动物视频。" }
      ]
    },
    "answer": {
      phoneticEn: "/ˈɑːnsə(r)/",
      phoneticUs: "/ˈænsər/",
      syllables: ["an", "swer"],
      syllableCount: 2,
      wordForms: [
        { label: "第三人称单数", form: "answers" },
        { label: "现在分词", form: "answering" },
        { label: "过去式", form: "answered" }
      ],
      definitionEn: "a reply to a question or statement",
      notes: [
        { label: "辨析", text: "answer(回答) / reply(回复,较正式) / respond(回应)" }
      ],
      collocations: [
        { phrase: "answer the phone", trans: "接电话" },
        { phrase: "answer a question", trans: "回答问题" },
        { phrase: "in answer to", trans: "作为对…的回应" }
      ],
      synonyms: [
        { word: "reply", phonetic: "/rɪˈplaɪ/", trans: "回答" },
        { word: "response", phonetic: "/rɪˈspɒns/", trans: "回应" }
      ],
      antonyms: [
        { word: "question", phonetic: "/ˈkwestʃən/", trans: "提问" }
      ],
      sceneExamples: [
        { scene: "课堂", en: "Please answer the following question.", zh: "请回答下面的问题。" },
        { scene: "日常", en: "He didn't answer my letter for weeks.", zh: "他好几个星期没回我的信。" }
      ]
    },
    "appear": {
      phoneticEn: "/əˈpɪə(r)/",
      phoneticUs: "/əˈpɪr/",
      syllables: ["ap", "pear"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "appearance" },
        { label: "反义词", form: "disappear" },
        { label: "副词", form: "apparently" }
      ],
      definitionEn: "to come into sight or become visible",
      notes: [
        { label: "辨析", text: "appear(出现,看似) / seem(似乎) / look(看起来)" }
      ],
      collocations: [
        { phrase: "appear on TV", trans: "出现在电视上" },
        { phrase: "appear to be", trans: "似乎是" }
      ],
      synonyms: [
        { word: "emerge", phonetic: "/iˈmɜːdʒ/", trans: "出现" },
        { word: "show up", phonetic: "/ʃəʊ ʌp/", trans: "露面" }
      ],
      antonyms: [
        { word: "disappear", phonetic: "/ˌdɪsəˈpɪə(r)/", trans: "消失" }
      ],
      sceneExamples: [
        { scene: "日常", en: "A rainbow appeared after the rain.", zh: "雨后出现了一道彩虹。" },
        { scene: "演出", en: "She appeared on stage to loud applause.", zh: "她在热烈的掌声中登台亮相。" }
      ]
    },
    "area": {
      phoneticEn: "/ˈeəriə/",
      phoneticUs: "/ˈeriə/",
      syllables: ["ar", "e", "a"],
      syllableCount: 3,
      wordForms: [
        { label: "形容词", form: "areal" },
        { label: "复数", form: "areas" }
      ],
      definitionEn: "a part of a place, country, or surface",
      notes: [
        { label: "用法", text: "既可指几何面积,也可指地理区域" }
      ],
      collocations: [
        { phrase: "in the area", trans: "在该地区" },
        { phrase: "area code", trans: "电话区号" },
        { phrase: "rural area", trans: "农村地区" }
      ],
      synonyms: [
        { word: "region", phonetic: "/ˈriːdʒən/", trans: "地区" },
        { word: "zone", phonetic: "/zəʊn/", trans: "区域" }
      ],
      sceneExamples: [
        { scene: "日常", en: "There are many parks in this area.", zh: "这个地区有许多公园。" },
        { scene: "数学", en: "Please calculate the area of this triangle.", zh: "请计算这个三角形的面积。" }
      ]
    },
    "art": {
      phoneticEn: "/ɑːt/",
      phoneticUs: "/ɑːrt/",
      syllables: ["art"],
      syllableCount: 1,
      wordForms: [
        { label: "形容词", form: "artistic" },
        { label: "名词", form: "artist" },
        { label: "形容词", form: "artful" }
      ],
      definitionEn: "the making of things that are beautiful",
      notes: [
        { label: "辨析", text: "art(艺术) / craft(工艺) / fine arts(美术)" }
      ],
      collocations: [
        { phrase: "art gallery", trans: "艺术馆" },
        { phrase: "modern art", trans: "现代艺术" },
        { phrase: "work of art", trans: "艺术品" }
      ],
      synonyms: [
        { word: "fine arts", phonetic: "/ˌfaɪn ˈɑːts/", trans: "美术" }
      ],
      sceneExamples: [
        { scene: "文化", en: "She studied art history in college.", zh: "她在大学里学习艺术史。" },
        { scene: "日常", en: "The museum has a great collection of modern art.", zh: "这座博物馆收藏了大量现代艺术作品。" }
      ]
    },
    "ask": {
      phoneticEn: "/ɑːsk/",
      phoneticUs: "/æsk/",
      syllables: ["ask"],
      syllableCount: 1,
      wordForms: [
        { label: "名词", form: "question" },
        { label: "第三人称单数", form: "asks" },
        { label: "过去式", form: "asked" }
      ],
      definitionEn: "to say something in order to get an answer",
      notes: [
        { label: "辨析", text: "ask(普通问) / inquire(正式问询) / question(质疑)" }
      ],
      collocations: [
        { phrase: "ask for", trans: "请求,要" },
        { phrase: "ask about", trans: "询问" },
        { phrase: "ask a question", trans: "提问" }
      ],
      synonyms: [
        { word: "inquire", phonetic: "/ɪnˈkwaɪə(r)/", trans: "询问" },
        { word: "request", phonetic: "/rɪˈkwest/", trans: "请求" }
      ],
      sceneExamples: [
        { scene: "日常", en: "Feel free to ask if you have any questions.", zh: "有任何问题尽管问。" },
        { scene: "求助", en: "He asked for help with his homework.", zh: "他请求帮忙做作业。" }
      ]
    },
    "classic": {
      phoneticEn: "/ˈklæsɪk/",
      phoneticUs: "/ˈklæsɪk/",
      syllables: ["clas", "sic"],
      syllableCount: 2,
      wordForms: [
        { label: "复数", form: "classics" },
        { label: "比较级", form: "more classic" },
        { label: "最高级", form: "most classic" }
      ],
      definitionEn: "a book, play, or film that is important and has been admired for a long time; something that is very good and one of the best examples of its kind",
      notes: [
        { label: "词根词缀", text: "class(分类) + -ic(形容词词尾,属于…) → classic 经典作品,名著" }
      ],
      collocations: [
        { phrase: "classic case", trans: "经典案例,典型案例" },
        { phrase: "classic example", trans: "经典例子,经典案例,经典实例" },
        { phrase: "classic literature", trans: "古典文学" },
        { phrase: "classic car", trans: "老爷车" },
        { phrase: "classic music", trans: "古典音乐" }
      ],
      synonyms: [
        { word: "traditional", phonetic: "/trəˈdɪʃənəl/", trans: "传统的" },
        { word: "typical", phonetic: "/ˈtɪpɪkəl/", trans: "典型的" },
        { word: "timeless", phonetic: "/ˈtaɪmləs/", trans: "永恒的" }
      ],
      sceneExamples: [
        { scene: "文学", en: "Pride and Prejudice is a classic of English literature.", zh: "《傲慢与偏见》是英国文学的经典之作。" },
        { scene: "音乐", en: "She loves listening to classic jazz on weekends.", zh: "她喜欢在周末听经典爵士乐。" },
        { scene: "电影", en: "This classic film has been watched for generations.", zh: "这部经典电影被好几代人观看过。" },
        { scene: "日常", en: "It's a classic case of trying to do too much at once.", zh: "这是一个典型的想要一次做太多事的案例。" }
      ]
    },
    "appreciate": {
      phoneticEn: "/əˈpriːʃieɪt/",
      phoneticUs: "/əˈpriːʃieɪt/",
      syllables: ["ap", "pre", "ci", "ate"],
      syllableCount: 4,
      wordForms: [
        { label: "名词", form: "appreciation" },
        { label: "形容词", form: "appreciative" },
        { label: "第三人称单数", form: "appreciates" }
      ],
      definitionEn: "to recognize the value or worth of something",
      notes: [
        { label: "辨析", text: "appreciate(感激,欣赏) / enjoy(享受)" }
      ],
      collocations: [
        { phrase: "appreciate the beauty", trans: "欣赏美" },
        { phrase: "I would appreciate", trans: "如果…我将不胜感激" }
      ],
      synonyms: [
        { word: "value", phonetic: "/ˈvæljuː/", trans: "重视" },
        { word: "treasure", phonetic: "/ˈtreʒə(r)/", trans: "珍视" }
      ],
      sceneExamples: [
        { scene: "日常", en: "I really appreciate your help.", zh: "我非常感谢你的帮助。" },
        { scene: "艺术", en: "She appreciates modern art very much.", zh: "她非常欣赏现代艺术。" }
      ]
    },
    "approach": {
      phoneticEn: "/əˈprəʊtʃ/",
      phoneticUs: "/əˈproʊtʃ/",
      syllables: ["ap", "proach"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "approach" },
        { label: "形容词", form: "approachable" },
        { label: "第三人称单数", form: "approaches" }
      ],
      definitionEn: "a way of dealing with something; to come near",
      notes: [
        { label: "一词多义", text: "可作名词(方法)和动词(接近)" }
      ],
      collocations: [
        { phrase: "approach to", trans: "处理…的方法" },
        { phrase: "a new approach", trans: "新方法" }
      ],
      synonyms: [
        { word: "method", phonetic: "/ˈmeθəd/", trans: "方法" },
        { word: "come near", phonetic: "/kʌm nɪə(r)/", trans: "接近" }
      ],
      sceneExamples: [
        { scene: "职场", en: "We need a different approach to solve this problem.", zh: "我们需要用不同的方法来解决这个问题。" },
        { scene: "日常", en: "Winter is approaching fast.", zh: "冬天很快就要来了。" }
      ]
    },
    "average": {
      phoneticEn: "/ˈævərɪdʒ/",
      phoneticUs: "/ˈævərɪdʒ/",
      syllables: ["av", "er", "age"],
      syllableCount: 3,
      wordForms: [
        { label: "动词", form: "average" },
        { label: "名词", form: "average" }
      ],
      definitionEn: "the middle value; ordinary or usual",
      notes: [
        { label: "一词多性", text: "可作名词(平均数)、形容词(普通的)、动词(平均为)" }
      ],
      collocations: [
        { phrase: "on average", trans: "平均" },
        { phrase: "above average", trans: "高于平均" }
      ],
      synonyms: [
        { word: "ordinary", phonetic: "/ˈɔːdnri/", trans: "普通的" },
        { word: "typical", phonetic: "/ˈtɪpɪkəl/", trans: "典型的" }
      ],
      sceneExamples: [
        { scene: "统计", en: "The average score was 85.", zh: "平均分是 85 分。" },
        { scene: "口语", en: "He's just an average student.", zh: "他只是个普通学生。" }
      ]
    },
    "avoid": {
      phoneticEn: "/əˈvɔɪd/",
      phoneticUs: "/əˈvɔɪd/",
      syllables: ["a", "void"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "avoidance" },
        { label: "形容词", form: "avoidable" },
        { label: "第三人称单数", form: "avoids" }
      ],
      definitionEn: "to stay away from something or someone",
      notes: [
        { label: "辨析", text: "avoid doing sth.(避免做某事)" }
      ],
      collocations: [
        { phrase: "avoid doing", trans: "避免做某事" },
        { phrase: "avoid trouble", trans: "避开麻烦" }
      ],
      synonyms: [
        { word: "evade", phonetic: "/ɪˈveɪd/", trans: "躲避" },
        { word: "shun", phonetic: "/ʃʌn/", trans: "回避" }
      ],
      sceneExamples: [
        { scene: "日常", en: "Try to avoid eating too much sugar.", zh: "尽量避免吃太多糖。" },
        { scene: "口语", en: "He avoided eye contact with her.", zh: "他避开了她的目光。" }
      ]
    },
    "aware": {
      phoneticEn: "/əˈweə(r)/",
      phoneticUs: "/əˈwer/",
      syllables: ["a", "ware"],
      syllableCount: 2,
      wordForms: [
        { label: "名词", form: "awareness" },
        { label: "副词", form: "awareness" }
      ],
      definitionEn: "knowing about something; conscious",
      notes: [
        { label: "搭配", text: "be aware of(意识到) / be aware that..." }
      ],
      collocations: [
        { phrase: "be aware of", trans: "意识到" },
        { phrase: "become aware", trans: "变得知道" }
      ],
      synonyms: [
        { word: "conscious", phonetic: "/ˈkɒnʃəs/", trans: "意识到的" },
        { word: "cognizant", phonetic: "/ˈkɒɡnɪzənt/", trans: "认知的" }
      ],
      antonyms: [
        { word: "unaware", phonetic: "/ˌʌnəˈweə(r)/", trans: "不知道的" }
      ],
      sceneExamples: [
        { scene: "日常", en: "Are you aware of the risks?", zh: "你意识到这些风险了吗?" },
        { scene: "教育", en: "We should be aware of our own biases.", zh: "我们应该意识到自己的偏见。" }
      ]
    },
    "background": {
      phoneticEn: "/ˈbækɡraʊnd/",
      phoneticUs: "/ˈbækɡraʊnd/",
      syllables: ["back", "ground"],
      syllableCount: 2,
      wordForms: [
        { label: "形容词", form: "background" },
        { label: "复数", form: "backgrounds" }
      ],
      definitionEn: "the part behind something; one's past experience",
      notes: [
        { label: "合成词", text: "back(后面) + ground(地面)" }
      ],
      collocations: [
        { phrase: "family background", trans: "家庭背景" },
        { phrase: "educational background", trans: "教育背景" }
      ],
      synonyms: [
        { word: "setting", phonetic: "/ˈsetɪŋ/", trans: "背景" }
      ],
      sceneExamples: [
        { scene: "面试", en: "Tell me about your educational background.", zh: "请告诉我你的教育背景。" },
        { scene: "日常", en: "She prefers a plain background for her photos.", zh: "她喜欢简洁的背景来拍照。" }
      ]
    },
    "balance": {
      phoneticEn: "/ˈbæləns/",
      phoneticUs: "/ˈbæləns/",
      syllables: ["bal", "ance"],
      syllableCount: 2,
      wordForms: [
        { label: "形容词", form: "balanced" },
        { label: "副词", form: "balancedly" },
        { label: "第三人称单数", form: "balances" }
      ],
      definitionEn: "an even distribution of weight; a state of steadiness",
      notes: [
        { label: "一词多性", text: "名词(平衡)/动词(权衡,使平衡)" }
      ],
      collocations: [
        { phrase: "keep balance", trans: "保持平衡" },
        { phrase: "balance sheet", trans: "资产负债表" },
        { phrase: "work-life balance", trans: "工作与生活的平衡" }
      ],
      synonyms: [
        { word: "equilibrium", phonetic: "/ˌiːkwɪˈlɪbriəm/", trans: "平衡" },
        { word: "stability", phonetic: "/stəˈbɪlɪti/", trans: "稳定" }
      ],
      sceneExamples: [
        { scene: "运动", en: "It's hard to keep your balance on ice.", zh: "在冰上保持平衡很难。" },
        { scene: "生活", en: "You need a good work-life balance.", zh: "你需要良好的工作生活平衡。" }
      ]
    },
    "beauty": {
      phoneticEn: "/ˈbjuːti/",
      phoneticUs: "/ˈbjuːti/",
      syllables: ["beau", "ty"],
      syllableCount: 2,
      wordForms: [
        { label: "形容词", form: "beautiful" },
        { label: "副词", form: "beautifully" },
        { label: "复数", form: "beauties" }
      ],
      definitionEn: "a quality that gives pleasure to the senses",
      notes: [
        { label: "派生", text: "beautiful(美丽的) → beauty(美)" }
      ],
      collocations: [
        { phrase: "natural beauty", trans: "自然美" },
        { phrase: "beauty salon", trans: "美容院" },
        { phrase: "sleeping beauty", trans: "睡美人" }
      ],
      synonyms: [
        { word: "elegance", phonetic: "/ˈelɪɡəns/", trans: "优雅" },
        { word: "loveliness", phonetic: "/ˈlʌvlinəs/", trans: "可爱" }
      ],
      antonyms: [
        { word: "ugliness", phonetic: "/ˈʌɡlinəs/", trans: "丑陋" }
      ],
      sceneExamples: [
        { scene: "自然", en: "The beauty of the sunset took my breath away.", zh: "日落的美丽让我屏住了呼吸。" },
        { scene: "文学", en: "Beauty is in the eye of the beholder.", zh: "美在于观察者的眼睛。" }
      ]
    },
    "behavior": {
      phoneticEn: "/bɪˈheɪvjə(r)/",
      phoneticUs: "/bɪˈheɪvjər/",
      syllables: ["be", "hav", "ior"],
      syllableCount: 3,
      wordForms: [
        { label: "动词", form: "behave" },
        { label: "形容词", form: "behavioral" },
        { label: "复数", form: "behaviors" }
      ],
      definitionEn: "the way a person acts or conducts oneself",
      notes: [
        { label: "辨析", text: "behavior(美式) / behaviour(英式)" }
      ],
      collocations: [
        { phrase: "good behavior", trans: "良好行为" },
        { phrase: "bad behavior", trans: "不良行为" },
        { phrase: "human behavior", trans: "人类行为" }
      ],
      synonyms: [
        { word: "conduct", phonetic: "/ˈkɒndʌkt/", trans: "行为" },
        { word: "manners", phonetic: "/ˈmænəz/", trans: "举止" }
      ],
      sceneExamples: [
        { scene: "教育", en: "His behavior in class was excellent.", zh: "他在课堂上的表现非常好。" },
        { scene: "心理", en: "Human behavior is influenced by many factors.", zh: "人类行为受多种因素影响。" }
      ]
    },
    "benefit": {
      phoneticEn: "/ˈbenɪfɪt/",
      phoneticUs: "/ˈbenɪfɪt/",
      syllables: ["ben", "e", "fit"],
      syllableCount: 3,
      wordForms: [
        { label: "形容词", form: "beneficial" },
        { label: "副词", form: "beneficially" },
        { label: "第三人称单数", form: "benefits" }
      ],
      definitionEn: "a good or helpful result",
      notes: [
        { label: "搭配", text: "benefit from(从…中获益) / be of benefit to(对…有益)" }
      ],
      collocations: [
        { phrase: "benefit from", trans: "从…获益" },
        { phrase: "health benefits", trans: "健康益处" },
        { phrase: "for the benefit of", trans: "为了…的利益" }
      ],
      synonyms: [
        { word: "advantage", phonetic: "/ədˈvɑːntɪdʒ/", trans: "好处" },
        { word: "profit", phonetic: "/ˈprɒfɪt/", trans: "利益" }
      ],
      sceneExamples: [
        { scene: "健康", en: "Exercise has many benefits for your health.", zh: "锻炼对健康有许多好处。" },
        { scene: "职场", en: "Employees can benefit from this training.", zh: "员工可以从这个培训中受益。" }
      ]
    },
    "border": {
      phoneticEn: "/ˈbɔːdə(r)/",
      phoneticUs: "/ˈbɔːrdər/",
      syllables: ["bor", "der"],
      syllableCount: 2,
      wordForms: [
        { label: "形容词", form: "borderless" },
        { label: "复数", form: "borders" }
      ],
      definitionEn: "the line that separates two countries or areas",
      notes: [
        { label: "辨析", text: "border(边界) / boundary(界限) / frontier(边疆)" }
      ],
      collocations: [
        { phrase: "cross the border", trans: "越过边境" },
        { phrase: "border line", trans: "边界线" }
      ],
      synonyms: [
        { word: "boundary", phonetic: "/ˈbaʊndri/", trans: "边界" },
        { word: "frontier", phonetic: "/ˈfrʌntɪə(r)/", trans: "边境" }
      ],
      sceneExamples: [
        { scene: "旅行", en: "We crossed the border into France.", zh: "我们越过边界进入法国。" },
        { scene: "口语", en: "The garden is bordered by roses.", zh: "花园四周种着玫瑰。" }
      ]
    },
    "brave": {
      phoneticEn: "/breɪv/",
      phoneticUs: "/breɪv/",
      syllables: ["brave"],
      syllableCount: 1,
      wordForms: [
        { label: "副词", form: "bravely" },
        { label: "名词", form: "bravery" },
        { label: "比较级", form: "braver" },
        { label: "最高级", form: "bravest" }
      ],
      definitionEn: "ready to face danger or pain without showing fear",
      notes: [
        { label: "辨析", text: "brave(勇敢的,侧重行动) / courageous(有勇气的,侧重精神)" }
      ],
      collocations: [
        { phrase: "brave soldier", trans: "勇敢的战士" },
        { phrase: "brave the storm", trans: "勇敢面对风暴" }
      ],
      synonyms: [
        { word: "courageous", phonetic: "/kəˈreɪdʒəs/", trans: "勇敢的" },
        { word: "valiant", phonetic: "/ˈvæliənt/", trans: "英勇的" }
      ],
      antonyms: [
        { word: "cowardly", phonetic: "/ˈkaʊədli/", trans: "胆小的" }
      ],
      sceneExamples: [
        { scene: "故事", en: "The brave knight saved the princess.", zh: "勇敢的骑士救出了公主。" },
        { scene: "口语", en: "It was brave of you to speak up.", zh: "你敢站出来真是勇敢。" }
      ]
    },
    "calm": {
      phoneticEn: "/kɑːm/",
      phoneticUs: "/kɑːm/",
      syllables: ["calm"],
      syllableCount: 1,
      wordForms: [
        { label: "副词", form: "calmly" },
        { label: "名词", form: "calmness" },
        { label: "第三人称单数", form: "calms" }
      ],
      definitionEn: "not excited, nervous, or angry",
      notes: [
        { label: "一词多性", text: "形容词(平静的)/动词(使平静)" }
      ],
      collocations: [
        { phrase: "keep calm", trans: "保持冷静" },
        { phrase: "calm down", trans: "平静下来" }
      ],
      synonyms: [
        { word: "peaceful", phonetic: "/ˈpiːsfəl/", trans: "平静的" },
        { word: "tranquil", phonetic: "/ˈtræŋkwɪl/", trans: "宁静的" }
      ],
      antonyms: [
        { word: "agitated", phonetic: "/ˈædʒɪteɪtɪd/", trans: "焦躁的" }
      ],
      sceneExamples: [
        { scene: "日常", en: "Please stay calm and tell me what happened.", zh: "请保持冷静,告诉我发生了什么。" },
        { scene: "口语", en: "The sea was calm and beautiful.", zh: "海面平静而美丽。" }
      ]
    }
  };

  function getWordExtra(word) {
    if (!word) return null;
    var key = String(word.word || '').toLowerCase();
    var base = EXTRA[key];
    if (!base) return null;
    return Object.assign({}, base);
  }

  function syllableCount(word) {
    if (!word) return 0;
    var w = String(word.word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
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

  function splitSyllables(word) {
    if (!word) return [];
    var w = String(word.word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return [];
    var count = syllableCount(word);
    if (count <= 1) return [w];
    var per = Math.ceil(w.length / count);
    var parts = [];
    for (var i = 0; i < count; i++) {
      var s = i * per;
      var e = Math.min(w.length, s + per);
      parts.push(w.slice(s, e));
    }
    return parts;
  }

  function getDefinitionEntries(word) {
    if (!word) return [];
    var trans = String(word.translation || '');
    if (!trans) return [];
    return trans.split(/[;；,，]/).map(function (t) { return t.trim(); }).filter(function (t) { return !!t; });
  }

  function getPosEntries(word) {
    if (!word || !word.pos) return [];
    var p = String(word.pos).replace(/[\/a\/n]\.\s?/g, ';').trim();
    var pos = String(word.pos || '').split(/[;；\/]/).map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
    return pos;
  }

  function enrichWord(word) {
    if (!word) return word;
    if (word._enriched) return word;
    var extra = getWordExtra(word) || {};
    var enriched = Object.assign({}, word, extra);
    if (!enriched.phoneticEn && word.phonetic) enriched.phoneticEn = word.phonetic;
    if (!enriched.phoneticUs && word.phonetic) enriched.phoneticUs = word.phonetic;
    if (!enriched.syllables || enriched.syllables.length === 0) {
      enriched.syllables = splitSyllables(word);
    }
    if (!enriched.syllableCount) enriched.syllableCount = enriched.syllables.length;
    enriched._enriched = true;
    return enriched;
  }

  global.WordDetailData = {
    getWordExtra: getWordExtra,
    enrichWord: enrichWord,
    syllableCount: syllableCount,
    splitSyllables: splitSyllables,
    getDefinitionEntries: getDefinitionEntries,
    getPosEntries: getPosEntries,
    hasExtra: function (word) {
      if (!word) return false;
      return !!EXTRA[String(word.word || '').toLowerCase()];
    }
  };
})(window);