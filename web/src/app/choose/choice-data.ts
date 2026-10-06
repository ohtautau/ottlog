/** Scores always follow this order: 漫游、感受、秩序、表达. */
export type ChoiceScores = [number, number, number, number];

export type ChoiceOption = {
  id: string;
  label: string;
  caption: string;
  color: string;
  scores: ChoiceScores;
  custom?: boolean;
};

export type ChoiceQuestion = {
  id: string;
  prompt: string;
  kicker: string;
  options: ChoiceOption[];
  scored?: boolean;
};

export const choiceCustomLimit = 40;

export const choiceDimensions = ["漫游", "感受", "秩序", "表达"] as const;

// Each option contributes 0–4 to each dimension, with the same total weight.
// These are creative associations with the imagery, not psychological measures.
export const choiceQuestions: ChoiceQuestion[] = [
  {
    id: "light",
    prompt: "从哪束光出发？",
    kicker: "先选一个方向，理由可以晚点再想。",
    options: [
      { id: "light-dawn", label: "晨光", caption: "把今天翻到第一页", color: "#F9CE69", scores: [2, 1, 3, 2] },
      { id: "light-night", label: "夜色", caption: "晚一点也有自己的光", color: "#A398D9", scores: [3, 3, 1, 1] },
    ],
  },
  {
    id: "pocket",
    prompt: "口袋里装什么？",
    kicker: "只能带走一样，别担心实用不实用。",
    options: [
      { id: "pocket-stone", label: "石头", caption: "握住一点真实的重量", color: "#B8C4B5", scores: [0, 2, 4, 2] },
      { id: "pocket-feather", label: "羽毛", caption: "风往哪里就去哪里", color: "#EACDBD", scores: [4, 3, 0, 1] },
      { id: "pocket-match", label: "火柴", caption: "给小小的念头点个火", color: "#F39372", scores: [2, 1, 1, 4] },
    ],
  },
  {
    id: "sound",
    prompt: "世界调成哪档？",
    kicker: "给此刻拧一下旋钮。",
    options: [
      { id: "sound-mute", label: "静音", caption: "先听见自己这边", color: "#C7D8CC", scores: [1, 4, 3, 0] },
      { id: "sound-slow", label: "慢放", caption: "路过的细节都留一秒", color: "#ECD493", scores: [1, 3, 4, 0] },
      { id: "sound-echo", label: "回声", caption: "想听见远方的回应", color: "#A9CEE0", scores: [3, 3, 0, 2] },
      { id: "sound-distortion", label: "失真", caption: "偶尔跑调也挺好听", color: "#DBA6C9", scores: [3, 0, 1, 4] },
    ],
  },
  {
    id: "place",
    prompt: "暂时住在哪里？",
    kicker: "不查房价，也不用收拾行李。",
    options: [
      { id: "place-cloud", label: "云端", caption: "地址每天换一个", color: "#BBD9EE", scores: [4, 2, 0, 2] },
      { id: "place-sea", label: "海底", caption: "让热闹隔着一层水", color: "#80BEC1", scores: [2, 4, 2, 0] },
      { id: "place-corner", label: "街角", caption: "看普通日子慢慢发生", color: "#E9B99A", scores: [0, 3, 4, 1] },
      { id: "place-field", label: "旷野", caption: "视线走得比脚更远", color: "#B6CD8E", scores: [4, 1, 1, 2] },
      { id: "place-page", label: "书页", caption: "给自己另写一段剧情", color: "#D0B7DD", scores: [1, 2, 1, 4] },
    ],
  },
  {
    id: "mark",
    prompt: "留一道什么痕迹？",
    kicker: "空白的地方，借你随手画一下。",
    options: [
      { id: "mark-circle", label: "圆圈", caption: "把在意的东西圈起来", color: "#EFCA7E", scores: [0, 3, 4, 1] },
      { id: "mark-zigzag", label: "折线", caption: "转几个弯才像自己的路", color: "#E69E81", scores: [3, 0, 2, 3] },
      { id: "mark-space", label: "空白", caption: "有些位置留着就很好", color: "#CCD8C3", scores: [2, 4, 2, 0] },
      { id: "mark-ripple", label: "涟漪", caption: "轻轻一下也能传很远", color: "#9BCDD3", scores: [2, 4, 1, 1] },
      { id: "mark-color", label: "色块", caption: "喜欢就涂得大一点", color: "#DDA1BA", scores: [1, 2, 1, 4] },
      { id: "mark-code", label: "乱码", caption: "暂时不需要被看懂", color: "#B0A3D9", scores: [4, 0, 0, 4] },
    ],
  },
  {
    id: "waiting",
    prompt: "等一场什么？",
    kicker: "要是时间肯停一会儿。",
    options: [
      { id: "waiting-rain", label: "阵雨", caption: "把空气里的褶皱抚平", color: "#A5C7D4", scores: [1, 4, 2, 1] },
      { id: "waiting-wind", label: "大风", caption: "让没想好的事先出发", color: "#BCCEA1", scores: [4, 1, 0, 3] },
      { id: "waiting-snow", label: "初雪", caption: "熟悉的街道重新开场", color: "#C7CDE5", scores: [2, 4, 2, 0] },
      { id: "waiting-bloom", label: "花开", caption: "慢慢长成也算有进展", color: "#E8B3C5", scores: [0, 3, 4, 1] },
      { id: "waiting-blackout", label: "停电", caption: "把所有必须按下暂停", color: "#AB9DC8", scores: [2, 2, 0, 4] },
      { id: "waiting-sunset", label: "日落", caption: "给今天一个温柔的句号", color: "#EAA57D", scores: [0, 4, 3, 1] },
      { id: "waiting-meeting", label: "偶遇", caption: "给计划外的人留个位", color: "#E9CE82", scores: [4, 2, 0, 2] },
    ],
  },
  {
    id: "shape",
    prompt: "此刻是什么形状？",
    kicker: "不用画得标准，像你选的就行。",
    options: [
      { id: "shape-moon", label: "月牙", caption: "留一点还没说完的弧度", color: "#E9D28C", scores: [1, 4, 1, 2] },
      { id: "shape-square", label: "方块", caption: "给零碎的念头找个位置", color: "#B9C5AB", scores: [0, 1, 4, 3] },
      { id: "shape-star", label: "星芒", caption: "想朝好几个方向发光", color: "#EFAB7D", scores: [3, 1, 0, 4] },
      { id: "shape-wave", label: "波浪", caption: "起伏里有自己的节拍", color: "#94C6CE", scores: [2, 4, 1, 1] },
      { id: "shape-spiral", label: "漩涡", caption: "绕进去看看还有什么", color: "#ACA1D1", scores: [4, 2, 1, 1] },
      { id: "shape-fragment", label: "碎片", caption: "拼不完整也能很好看", color: "#D8A8C0", scores: [2, 2, 0, 4] },
      { id: "shape-line", label: "长线", caption: "把想到的事一直做下去", color: "#A6C4AC", scores: [1, 0, 4, 3] },
      { id: "shape-dot", label: "圆点", caption: "小一点也有存在感", color: "#D8BC9A", scores: [0, 3, 3, 2] },
    ],
  },
  {
    id: "ending",
    prompt: "把结尾交给谁？",
    kicker: "给这一段旅程找个落点。",
    options: [
      { id: "ending-ocean", label: "大海", caption: "寄出去就让它漂流", color: "#8EC4CA", scores: [4, 3, 0, 1] },
      { id: "ending-future", label: "未来", caption: "把悬念留给下一次出发", color: "#BAC8E3", scores: [4, 0, 2, 2] },
      { id: "ending-today", label: "今天", caption: "眼前这页已经够好了", color: "#E9C682", scores: [0, 3, 4, 1] },
      { id: "ending-self", label: "自己", caption: "最后一笔想亲手落下", color: "#E79B83", scores: [1, 1, 2, 4] },
      { id: "ending-someone", label: "某人", caption: "有句话想让你刚好看见", color: "#DFA8B8", scores: [1, 4, 0, 3] },
      { id: "ending-moon", label: "月亮", caption: "没说出口的它也收下", color: "#BBACD8", scores: [2, 4, 1, 1] },
      { id: "ending-dice", label: "骰子", caption: "让偶然帮忙推开一扇门", color: "#B9CF97", scores: [4, 0, 0, 4] },
      { id: "ending-silence", label: "沉默", caption: "不接着说也算一个结尾", color: "#BECBBB", scores: [1, 4, 3, 0] },
      { id: "ending-comma", label: "逗号", caption: "其实我还没打算结束", color: "#D4B296", scores: [3, 1, 1, 3] },
    ],
  },
  {
    id: "message",
    prompt: "给此刻留一句话？",
    kicker: "选一句，或者用自己的话收尾。",
    scored: false,
    options: [
      { id: "message-slow", label: "慢慢来", caption: "按自己的节奏往前走", color: "#B9CF97", scores: [0, 0, 0, 0] },
      { id: "message-try", label: "去试试", caption: "先迈出眼前这一步", color: "#E79B83", scores: [0, 0, 0, 0] },
      { id: "message-rest", label: "先休息", caption: "给自己一点空白", color: "#8EC4CA", scores: [0, 0, 0, 0] },
      { id: "message-custom", label: "自己写", caption: "这一块，留给你的话", color: "#BBACD8", scores: [0, 0, 0, 0], custom: true },
    ],
  },
];

export type ChoiceResult = {
  title: string;
  description: string;
  keywords: string[];
  scores: ChoiceScores;
  labels: [string, string, string, string];
  explanation: string;
};

const resultTitles = [
  ["还没有地址的风", "风里捡到的月亮", "带着地图的云", "拐弯处的烟花"],
  ["把远方折成信", "慢慢亮起来的海", "收藏雨声的房间", "会发光的悄悄话"],
  ["给远方画条线", "安放月光的抽屉", "有自己节拍的钟", "有棱角的烟花"],
  ["不按路线开的花", "写给月亮的涂鸦", "一笔一画的奇想", "正在发生的小宇宙"],
];

const dimensionDescriptions = [
  "这一路，你给未知和转弯留了不少位置。",
  "这一路，细小的声响、光线和心情被你轻轻收下。",
  "这一路，你为零碎的念头找到了位置和节拍。",
  "这一路，你留下了几笔很有自己味道的颜色。",
];

const dimensionKeywords = [
  ["向外走走", "允许偶然"],
  ["收集微光", "感受此刻"],
  ["自己的节拍", "安放日常"],
  ["留下一笔", "自由表达"],
];

/**
 * Match one answer to its own round, so stale or duplicated IDs cannot add weight.
 * An axis is the selected contributions divided by their possible maximum (4).
 * Ties use the fixed dimension order, keeping a repeated route exactly reproducible.
 */
export function deriveChoiceResult(answerIds: string[]): ChoiceResult {
  const selected = choiceQuestions.flatMap((question, index) => {
    // The closing line is displayed verbatim, without inferring scores from free text.
    if (question.scored === false) return [];
    const option = question.options.find((item) => item.id === answerIds[index]);
    return option ? [option] : [];
  });
  const labels: ChoiceResult["labels"] = [...choiceDimensions];

  if (selected.length === 0) {
    return {
      title: "还没落笔的空白",
      description: "从一个选择开始，留下一张属于此刻的创意画像。",
      keywords: ["等待出发", "留一点空白"],
      scores: [0, 0, 0, 0],
      labels,
      explanation: "每一轮的选择都会为漫游、感受、秩序、表达添上一点颜色。",
    };
  }

  const totals: ChoiceScores = [0, 0, 0, 0];
  for (const option of selected) {
    for (let axis = 0; axis < totals.length; axis += 1) {
      totals[axis] += option.scores[axis];
    }
  }
  const scores = totals.map((total) => Math.round((total / (selected.length * 4)) * 100)) as ChoiceScores;
  const ranked = [0, 1, 2, 3].sort((a, b) => totals[b] - totals[a] || a - b);
  const [primary, secondary] = ranked;
  const strongestChoices = selected
    .map((option, index) => ({ option, index }))
    .sort((a, b) => b.option.scores[primary] - a.option.scores[primary] || a.index - b.index)
    .slice(0, 2)
    .map(({ option }) => `「${option.label}」`)
    .join("和");

  return {
    title: resultTitles[primary][secondary],
    description: `${dimensionDescriptions[primary]}这是这次选择的一张创意画像，换条路也会有新的风景。`,
    keywords: [dimensionKeywords[primary][0], dimensionKeywords[secondary][0], dimensionKeywords[primary][1]],
    scores,
    labels,
    explanation: `${strongestChoices}为「${labels[primary]}」添色最多。四个数值来自所选意象的累加，呈现这条路线的色彩浓度。`,
  };
}
