/* 成绩分析 · 配置层
 * 科目、中考分值、年级时间轴、目标校库
 */

// 成都中考 710 分制（成招考委〔2026〕5号）
const ZHONGKAO_TOTAL = 710;

const SUBJECTS = [
  { code: 'yuwen',  name: '语文', zk: 150, full: 150, hasAB: true,  from: 7 },
  { code: 'shuxue', name: '数学', zk: 150, full: 150, hasAB: true,  from: 7 },
  { code: 'yingyu', name: '英语', zk: 150, full: 150, hasAB: true,  from: 7 },
  { code: 'wuli',   name: '物理', zk: 70,  full: 100, hasAB: true,  from: 8 },
  { code: 'huaxue', name: '化学', zk: 50,  full: 100, hasAB: true,  from: 9 },
  { code: 'daofa',  name: '道法', zk: 20,  full: 100, grade: true,  from: 7 },
  { code: 'lishi',  name: '历史', zk: 20,  full: 100, grade: true,  from: 7 },
  { code: 'dili',   name: '地理', zk: 20,  full: 100, grade: true,  from: 7, until: 8 },
  { code: 'shengwu',name: '生物', zk: 20,  full: 100, grade: true,  from: 7, until: 8 },
  { code: 'tiyu',   name: '体育', zk: 60,  full: 60,  direct: true, from: 9 }
];

const SUBJECT_MAP = {};
SUBJECTS.forEach(s => { SUBJECT_MAP[s.code] = s; });

// 等级折算：A20 / B16 / C12 / D8
const GRADE_POINTS = { A: 20, B: 16, C: 12, D: 8 };

// 某年级的应考科目
function subjectsOfGrade(grade) {
  return SUBJECTS.filter(s => s.from <= grade && (!s.until || s.until >= grade));
}

// 某年级已覆盖的中考分值
function coveredZk(grade) {
  return subjectsOfGrade(grade).reduce((a, s) => a + s.zk, 0);
}

const EXAM_TYPES = ['月考', '期中', '期末', '诊断考', '一模', '二模', '中考', '其他'];

const SEMESTERS = ['上学期', '下学期'];

// ── 目标校库 ──────────────────────────────────────────────
// level: A=官方录取线+位次, B=咨询线(非录取线), C=自定义
const SCHOOLS = [
  // 市直属四校九区（A 级，2026）
  { id: 'sz-wenmiao', name: '石室中学', campus: '文庙', district: '市直属', type: 'public', year: 2026, line: 637, rank: 1668, adjust: 637, level: 'A', tier: '第一梯队' },
  { id: 'sz-beihu',   name: '石室中学', campus: '北湖', district: '市直属', type: 'public', year: 2026, line: 630, rank: 2808, adjust: 632, level: 'A', tier: '第二梯队' },
  { id: 'qz-linyin',  name: '成都七中', campus: '林荫', district: '市直属', type: 'public', year: 2026, line: 647, rank: 546,  adjust: 647, level: 'A', tier: '第一梯队' },
  { id: 'qz-gaoxin',  name: '成都七中', campus: '高新', district: '市直属', type: 'public', year: 2026, line: 636, rank: 1819, adjust: 637, level: 'A', tier: '第一梯队' },
  { id: 'sd-ningxia', name: '树德中学', campus: '宁夏', district: '市直属', type: 'public', year: 2026, line: 642, rank: 1037, adjust: 642, level: 'A', tier: '第一梯队' },
  { id: 'sd-guanghua',name: '树德中学', campus: '光华', district: '市直属', type: 'public', year: 2026, line: 632, rank: 2459, adjust: 632, level: 'A', tier: '第二梯队' },
  { id: 'sd-waiguoyu',name: '树德中学', campus: '外国语', district: '市直属', type: 'public', year: 2026, line: 630, rank: 2808, adjust: 630, level: 'A', tier: '第二梯队' },
  { id: 'ez-fenghuang', name: '成都二中', campus: '凤凰', district: '市直属', type: 'public', year: 2026, line: 626, rank: 3572, adjust: 626, level: 'A', tier: '第三梯队' },
  { id: 'ez-hongxing',  name: '成都二中', campus: '红星', district: '市直属', type: 'public', year: 2026, line: 624, rank: 3938, adjust: 622, level: 'A', tier: '第三梯队' },
  { id: 'jky-fuzhong',  name: '市教科院附中', campus: '', district: '市直属', type: 'public', year: 2026, line: 626, rank: 3572, adjust: 624, level: 'A', tier: '第三梯队' },
  { id: 'jky-fuxiao',   name: '市教科院附校', campus: '', district: '市直属', type: 'public', year: 2026, line: 621, rank: 4527, adjust: 620, level: 'A', tier: '第三梯队' },
  { id: 'cs-fuzhong',   name: '川师附中', campus: '', district: '市直属', type: 'public', year: 2026, line: 625, rank: 3752, adjust: 622, level: 'A', tier: '第三梯队' },
  { id: 'sd-yixinhui',  name: '树德怡心湖', campus: '', district: '市直属', type: 'public', year: 2026, line: 622, rank: 4333, adjust: 608, level: 'A', tier: '第三梯队' },

  // 成华区（A 级，2026）
  { id: 'ch-yingcai',  name: '成都英才学校', campus: '七中领办', district: '成华', type: 'public', year: 2026, line: 618, rank: 5098,  adjust: 620, level: 'A', tier: '第四梯队' },
  { id: 'ch-lie5',     name: '列五中学', campus: '', district: '成华', type: 'public', year: 2026, line: 605, rank: 7682,  adjust: 605, level: 'A', tier: '第五梯队' },
  { id: 'ch-49',       name: '四十九中', campus: '', district: '成华', type: 'public', year: 2026, line: 604, rank: 7857,  adjust: 603, level: 'A', tier: '第五梯队' },
  { id: 'ch-jiaxiang', name: '成华嘉祥', campus: '民办', district: '成华', type: 'private', year: 2026, line: 580, rank: null, adjust: null, level: 'A', tier: '第六梯队' },
  { id: 'ch-huaxi-sj', name: '华西中学', campus: '双建', district: '成华', type: 'public', year: 2026, line: 579, rank: 12063, adjust: 589, level: 'A', tier: '第六梯队' },
  { id: 'ch-cddf',     name: '成大附中', campus: '', district: '成华', type: 'public', year: 2026, line: 576, rank: 12486, adjust: 576, level: 'A', tier: '第六梯队' },
  { id: 'ch-huaxi-gl', name: '华西中学', campus: '桂龙', district: '成华', type: 'public', year: 2026, line: 570, rank: 13419, adjust: 576, level: 'A', tier: '第七梯队' },
  { id: 'ch-shiyan',   name: '成都实验中学', campus: '', district: '成华', type: 'public', year: 2026, line: 561, rank: 14720, adjust: 563, level: 'A', tier: '第七梯队' },
  { id: 'ch-38',       name: '三十八中', campus: '', district: '成华', type: 'public', year: 2026, line: 558, rank: 15132, adjust: 557, level: 'A', tier: '第七梯队' },

  // 其他区（B 级：咨询线，非录取线）
  { id: 'b-cdfz',      name: '川大附中（十二中）', campus: '', district: '武侯', type: 'public', year: 2026, line: 620, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-xibei',     name: '西北中学', campus: '', district: '武侯', type: 'public', year: 2026, line: 582, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-qzwd',      name: '七中万达', campus: '', district: '金牛', type: 'public', year: 2026, line: 618, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-sstf',      name: '石室天府', campus: '', district: '高新', type: 'public', year: 2026, line: 627, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-sdsy',      name: '树德实验高中', campus: '', district: '青羊', type: 'public', year: 2026, line: 613, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-qzdb',      name: '七中东部学校', campus: '', district: '东部新区', type: 'public', year: 2026, line: 610, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-dzk',       name: '电子科大实验中学', campus: '', district: '高新', type: 'public', year: 2026, line: 595, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-zhonghe',   name: '中和中学', campus: '', district: '高新', type: 'public', year: 2026, line: 580, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-qyjky',     name: '青羊教科附', campus: '', district: '青羊', type: 'public', year: 2026, line: 586, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-slzx',      name: '双流中学', campus: '紫东', district: '双流', type: 'public', year: 2026, line: 590, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-thzx',      name: '棠湖中学', campus: '双江路', district: '双流', type: 'public', year: 2026, line: 580, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-shiwai',    name: '成都实验外国语', campus: '', district: '温江', type: 'private', year: 2026, line: 570, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-jxjj',      name: '嘉祥锦江', campus: '民办', district: '锦江', type: 'private', year: 2026, line: 619, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-qzjc',      name: '七中菁才', campus: '', district: '市直属', type: 'public', year: 2026, line: 600, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-sjky',      name: '省教科院附中', campus: '', district: '市直属', type: 'public', year: 2026, line: 610, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-qzmc',      name: '七中墨池', campus: '', district: '市直属', type: 'public', year: 2026, line: 618, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-ssjg',      name: '石室锦官', campus: '', district: '市直属', type: 'public', year: 2026, line: 618, rank: null, adjust: null, level: 'B', tier: '参考' },
  { id: 'b-ssdb',      name: '石室东部', campus: '', district: '东部新区', type: 'public', year: 2026, line: 602, rank: null, adjust: null, level: 'B', tier: '参考' },

  // 参考线
  { id: 'line-pugao',  name: '普高线（5+2）', campus: '', district: '参考线', type: 'public', year: 2026, line: 509, rank: null, adjust: null, level: 'A', tier: '参考线' },
  { id: 'line-zonggao',name: '综高线（5+2）', campus: '', district: '参考线', type: 'public', year: 2026, line: 485, rank: null, adjust: null, level: 'A', tier: '参考线' }
];

// 默认勾选的四所目标校
const DEFAULT_TARGETS = ['qz-linyin', 'sd-ningxia', 'ch-yingcai', 'ch-49'];

const SCHOOL_MAP = {};
SCHOOLS.forEach(s => { SCHOOL_MAP[s.id] = s; });
