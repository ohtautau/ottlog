export type FoodIdea = { id: string; name: string; english: string; tags: string[]; examples: string[] };
// Editorial inspiration catalog, separate from Tau's restaurant library.
// Broad cuisines always show three representative dishes. Tags describe common preparations.
const catalog = `
湘菜|Hunan cuisine|asian chinese spicy meat rice|湖南小炒肉 / Hunan stir-fried pork;剁椒鱼头 / Steamed fish head with chopped chilli;干锅花菜 / Dry-pot cauliflower
川菜|Sichuan cuisine|asian chinese spicy meat|麻婆豆腐 / Mapo tofu;水煮牛肉 / Sichuan boiled beef;回锅肉 / Twice-cooked pork
粤菜|Cantonese cuisine|asian chinese mild meat|白切鸡 / Poached chicken;烧鹅 / Roast goose;虾饺 / Har gow
东北菜|Northeastern Chinese cuisine|asian chinese mild meat|锅包肉 / Sweet and sour pork;地三鲜 / Three treasures stir-fry;酸菜白肉 / Pork with pickled cabbage
江浙菜|Jiangsu and Zhejiang cuisine|asian chinese mild meat|东坡肉 / Dongpo pork;松鼠鱼 / Squirrel-shaped fish;小笼包 / Soup dumplings
西北菜|Northwestern Chinese cuisine|asian chinese meat noodles|兰州牛肉面 / Lanzhou beef noodles;肉夹馍 / Roujiamo;羊肉泡馍 / Lamb soup with flatbread
印度菜|Indian cuisine|asian indian spicy meat|黄油鸡 / Butter chicken;香饭 / Biryani;马萨拉薄饼 / Masala dosa
南印度菜|South Indian cuisine|asian indian spicy|蒸米糕 / Idli;马萨拉薄饼 / Masala dosa;酸辣汤 / Rasam
印尼菜|Indonesian cuisine|asian southeast spicy meat rice|仁当牛肉 / Beef rendang;印尼炒饭 / Nasi goreng;加多加多 / Gado-gado
马来菜|Malay cuisine|asian southeast spicy meat rice|椰浆饭 / Nasi lemak;沙爹 / Satay;马来卤面 / Mee rebus
泰国菜|Thai cuisine|asian southeast spicy meat|青咖喱 / Green curry;打抛饭 / Basil rice;冬阴功 / Tom yum
越南菜|Vietnamese cuisine|asian southeast mild meat|越南河粉 / Pho;越式法包 / Banh mi;鲜春卷 / Goi cuon
娘惹菜|Peranakan cuisine|asian southeast spicy meat|叻沙 / Laksa;黑果焖鸡 / Ayam buah keluak;娘惹杂菜 / Chap chye
日本菜|Japanese cuisine|asian mild meat|寿司 / Sushi;拉面 / Ramen;天妇罗 / Tempura
韩国菜|Korean cuisine|asian spicy meat|石锅拌饭 / Bibimbap;韩式炸鸡 / Korean fried chicken;泡菜锅 / Kimchi jjigae
意大利菜|Italian cuisine|western mild meat|玛格丽特披萨 / Margherita pizza;肉酱意面 / Bolognese;蘑菇烩饭 / Mushroom risotto
法国菜|French cuisine|western mild meat|油封鸭 / Duck confit;法式洋葱汤 / French onion soup;可丽饼 / Crepes
西班牙菜|Spanish cuisine|western mild meat|海鲜饭 / Paella;蒜香虾 / Gambas al ajillo;土豆蛋饼 / Tortilla espanola
希腊菜|Greek cuisine|western mild meat|烤肉串 / Souvlaki;慕萨卡 / Moussaka;希腊沙拉 / Greek salad
美国菜|American cuisine|western meat rich|汉堡 / Burger;烟熏烤肋排 / Smoked ribs;芝士通心粉 / Mac and cheese
墨西哥菜|Mexican cuisine|western spicy meat|塔可 / Tacos;卷饼 / Burrito;芝士薄饼 / Quesadilla
中东菜|Middle Eastern cuisine|western mild|鹰嘴豆泥 / Hummus;烤肉卷 / Shawarma;鹰嘴豆丸子 / Falafel
英式料理|British cuisine|western mild meat|炸鱼薯条 / Fish and chips;牧羊人派 / Shepherd's pie;英式早餐 / Full English breakfast
德国菜|German cuisine|western mild meat|烤猪肘 / Pork knuckle;香肠 / Bratwurst;椒盐卷饼 / Pretzel
海南鸡饭|Hainanese chicken rice|asian chinese rice meat mild quick|
烧腊饭|Cantonese roast meat rice|asian chinese rice meat mild quick|
湖南小炒肉|Hunan stir-fried pork|asian chinese rice meat spicy rich|
烤鱼|Chinese grilled fish|asian chinese meat spicy rich share|
麻辣烫|Mala soup|asian chinese soup spicy rich|
干锅|Dry pot|asian chinese spicy rich share|
田鸡粥|Frog porridge|asian chinese rice soup meat mild|
皮蛋瘦肉粥|Century egg and pork congee|asian chinese rice soup meat mild|
兰州牛肉面|Lanzhou beef noodles|asian chinese noodles soup meat mild|
重庆小面|Chongqing noodles|asian chinese noodles spicy quick|
螺蛳粉|Luosifen|asian chinese noodles soup spicy|
酸辣粉|Hot and sour glass noodles|asian chinese noodles soup spicy|
饺子|Chinese dumplings|asian chinese meat mild quick|
小笼包|Xiao long bao|asian chinese meat mild|
锅盔|Guo kui flatbread|asian chinese bread meat quick|
麻婆豆腐|Mapo tofu|asian chinese rice meat spicy|
清炒时蔬|Stir-fried vegetables|asian chinese veg mild light|
酿豆腐|Yong tau foo|asian chinese soup mild light|
鱼片米粉汤|Sliced fish bee hoon soup|asian chinese soup noodles meat mild light|
福建虾面|Hokkien prawn mee|asian southeast noodles meat rich|
炒粿条|Char kway teow|asian southeast noodles meat rich quick|
肉骨茶|Bak kut teh|asian chinese soup meat mild|
辣椒螃蟹|Chilli crab|asian southeast meat spicy rich share|
咖喱鱼头|Fish head curry|asian indian soup meat spicy share|
叻沙|Laksa|asian southeast noodles soup meat spicy rich|
青咖喱|Thai green curry|asian southeast soup rice meat spicy rich|
打抛饭|Thai basil rice|asian southeast rice meat spicy quick|
冬阴功汤|Tom yum soup|asian southeast soup meat spicy light|
泰式炒河粉|Pad Thai|asian southeast noodles meat quick|
青木瓜沙拉|Som tam|asian southeast spicy light|
香兰炸鸡|Pandan chicken|asian southeast meat rich|
印度煎饼|Roti prata|asian indian bread veg quick rich|
鸡蛋煎饼|Egg prata|asian indian bread veg quick rich|
印度香饭|Biryani|asian indian rice meat spicy|
黄油鸡|Butter chicken|asian indian meat mild rich|
坦都里烤鸡|Tandoori chicken|asian indian meat spicy|
马萨拉薄饼|Masala dosa|asian indian bread veg spicy|
蒸米糕|Idli|asian indian veg mild light|
印度扁豆咖喱|Dal|asian indian veg soup spicy|
菠菜奶酪|Palak paneer|asian indian veg mild rich|
印度馕|Naan|asian indian bread veg mild|
印尼炒饭|Nasi goreng|asian southeast rice meat spicy quick|
仁当牛肉|Beef rendang|asian southeast rice meat spicy rich|
印尼炸鸡|Ayam penyet|asian southeast rice meat spicy rich|
加多加多|Gado-gado|asian southeast veg light|
椰浆饭|Nasi lemak|asian southeast rice meat spicy quick|
沙爹|Satay|asian southeast meat rich share|
马来卤面|Mee rebus|asian southeast noodles spicy|
隆东|Lontong|asian southeast rice soup spicy|
越南河粉|Pho|asian southeast noodles soup meat mild light|
越式法包|Banh mi|asian southeast bread meat quick|
越南鲜春卷|Vietnamese fresh spring rolls|asian southeast meat light|
黑果焖鸡|Ayam buah keluak|asian southeast meat rich|
娘惹杂菜|Chap chye|asian southeast mild light|
寿司|Sushi|asian rice meat mild light|
日式拉面|Ramen|asian noodles soup meat rich|
日式咖喱饭|Japanese curry rice|asian rice meat mild|
荞麦冷面|Cold soba|asian noodles mild light|
天妇罗|Tempura|asian meat rich|
韩式炸鸡|Korean fried chicken|asian meat spicy rich share|
石锅拌饭|Bibimbap|asian rice meat spicy|
泡菜锅|Kimchi jjigae|asian soup meat spicy|
炸鸡|Fried chicken|western meat rich quick|
汉堡|Burger|western bread meat rich quick|
牛排|Steak|western meat rich|
烤肋排|Barbecue ribs|western meat rich share|
芝士通心粉|Mac and cheese|western noodles veg mild rich|
披萨|Pizza|western bread rich share|
肉酱意面|Spaghetti bolognese|western noodles meat mild|
蘑菇烩饭|Mushroom risotto|western rice veg mild rich|
油封鸭|Duck confit|western meat rich|
海鲜饭|Seafood paella|western rice meat share|
炸鱼薯条|Fish and chips|western meat rich|
希腊沙拉|Greek salad|western veg mild light|
鹰嘴豆泥|Hummus|western veg mild light|
鹰嘴豆丸子|Falafel|western veg rich|
烤肉卷|Shawarma|western bread meat quick|
塔可|Tacos|western bread meat spicy quick|
墨西哥卷饼|Burrito|western rice bread meat quick|
红豆冰|Ice kacang|asian southeast sweet cold veg|
珍多冰|Chendol|asian southeast sweet cold veg|
豆花|Soybean pudding|asian chinese sweet veg light|
榴莲黑糯米|Durian black glutinous rice|asian southeast sweet rice veg rich|
榴莲|Durian|asian southeast sweet veg rich|
娘惹糕|Nyonya kueh|asian southeast sweet veg|
咖椰吐司|Kaya toast|asian southeast bread sweet veg quick|
法式牛角包|Croissant|western bread veg rich|
可丽饼|Crepes|western bread sweet veg|
冰淇淋|Ice cream|western sweet cold veg|
芝士蛋糕|Cheesecake|western sweet veg rich|
华夫饼|Waffles|western bread sweet veg|
水果碗|Fruit bowl|sweet cold veg light|
`;
export const foodIdeas: FoodIdea[] = catalog.trim().split('\n').map((line, index) => {
  const [name, english, tags, examples] = line.split('|');
  return { id: `idea-${index + 1}`, name, english, tags: tags.split(' '), examples: examples ? examples.split(';') : [] };
});
type Answer = { id: string; label: string; caption: string; prefer?: string; avoid?: string };
export const foodQuestions: { id: string; prompt: string; options: Answer[] }[] = [
  { id: 'sweet', prompt: '现在想吃甜的吗？', options: [{ id: 'sweet-yes', label: '是', caption: '来一点甜的', prefer: 'sweet' }, { id: 'sweet-no', label: '否', caption: '想吃咸香的', avoid: 'sweet' }, { id: 'sweet-any', label: '不确定', caption: '先看看还有什么' }] },
  { id: 'spicy', prompt: '今天想吃辣吗？', options: [{ id: 'spicy-yes', label: '是', caption: '辣一点更开胃', prefer: 'spicy' }, { id: 'spicy-no', label: '否', caption: '温和一点', avoid: 'spicy' }, { id: 'spicy-any', label: '不确定', caption: '味道对了就可以' }] },
  { id: 'staple', prompt: '饭和面，更想吃哪个？', options: [{ id: 'staple-rice', label: '米饭', caption: '好好吃一碗饭', prefer: 'rice', avoid: 'noodles' }, { id: 'staple-noodles', label: '面条', caption: '吸溜一口面', prefer: 'noodles', avoid: 'rice' }, { id: 'staple-any', label: '都可以', caption: '主食不重要' }] },
  { id: 'soup', prompt: '想喝一口热汤吗？', options: [{ id: 'soup-yes', label: '是', caption: '热汤配这一餐', prefer: 'soup' }, { id: 'soup-no', label: '否', caption: '想吃干香的', avoid: 'soup' }, { id: 'soup-any', label: '不确定', caption: '还没有特别的想法' }] },
  { id: 'region', prompt: '亚洲风味，还是西式风味？', options: [{ id: 'region-asian', label: '亚洲', caption: '米面、香料与锅气', prefer: 'asian', avoid: 'western' }, { id: 'region-western', label: '西式', caption: '烘烤、奶香与炙烤', prefer: 'western', avoid: 'asian' }, { id: 'region-any', label: '都可以', caption: '让味道带路' }] },
  { id: 'weight', prompt: '清爽一点，还是浓郁一点？', options: [{ id: 'weight-light', label: '清爽', caption: '蔬菜与轻盈的口感', prefer: 'light', avoid: 'rich' }, { id: 'weight-rich', label: '浓郁', caption: '酥香、酱汁、满足感', prefer: 'rich', avoid: 'light' }, { id: 'weight-any', label: '都可以', caption: '好吃就行' }] },
  { id: 'protein', prompt: '更想吃肉，还是蔬食？', options: [{ id: 'protein-meat', label: '肉类', caption: '鸡、牛、猪或海鲜', prefer: 'meat' }, { id: 'protein-veg', label: '蔬食', caption: '蔬菜、豆类与奶蛋', prefer: 'veg', avoid: 'meat' }, { id: 'protein-any', label: '都可以', caption: '搭配着吃也很好' }] },
  { id: 'speed', prompt: '想简单快速地吃一餐吗？', options: [{ id: 'speed-yes', label: '是', caption: '来份方便的', prefer: 'quick' }, { id: 'speed-no', label: '否', caption: '可以慢慢享用', prefer: 'share' }, { id: 'speed-any', label: '不确定', caption: '时间不是问题' }] },
];
export function rankFoodIdeas(answers: string[]): FoodIdea[] {
  const selected = foodQuestions.flatMap((q, i) => q.options.filter(o => o.id === answers[i]));
  const score = (food: FoodIdea) => selected.reduce((sum, answer) => sum + (answer.prefer && food.tags.includes(answer.prefer) ? 4 : 0) - (answer.avoid && food.tags.includes(answer.avoid) ? 6 : 0), 0);
  // Prefer concrete meals on ties; cuisine categories remain selectable suggestions.
  return [...foodIdeas].sort((a, b) => score(b) - score(a) || a.examples.length - b.examples.length || a.id.localeCompare(b.id, 'en', { numeric: true }));
}
