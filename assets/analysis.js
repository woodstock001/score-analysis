/* 成绩分析 · 算法层
 * 得分率 / 学科贡献 / 偏科 / 提分空间 / 趋势 / 目标差距
 */

const A = {
  pct(v) { return v == null || isNaN(v) ? null : v * 100; },
  round(v, n = 1) { return v == null || isNaN(v) ? null : Math.round(v * 10 ** n) / 10 ** n; },

  rate(raw, full) {
    if (raw == null || !full) return null;
    return raw / full;
  },

  // 单次考试体检
  exam(exam, scores) {
    const items = [];
    let sumRaw = 0, sumFull = 0, zkCovered = 0, zkEarned = 0;
    let hasClassAvg = false;

    scores.forEach(s => {
      const sub = SUBJECT_MAP[s.subject];
      if (!sub) return;
      const r = this.rate(s.raw, s.full);
      if (r == null) return;
      const item = {
        subject: s.subject,
        name: sub.name,
        raw: s.raw,
        full: s.full,
        rate: r,
        zk: sub.zk,
        grade: s.grade || null,
        classAvg: s.classAvg ?? null,
        classRank: s.classRank ?? null,
        aRate: s.aFull ? this.rate(s.aPaper, s.aFull) : null,
        bRate: s.bFull ? this.rate(s.bPaper, s.bFull) : null,
        diff: s.classAvg != null ? s.raw - s.classAvg : null,
        diffRate: s.classAvg != null ? r - (s.classAvg / s.full) : null
      };
      if (s.classAvg != null) hasClassAvg = true;
      items.push(item);
      sumRaw += s.raw;
      sumFull += s.full;
      zkCovered += sub.zk;
      zkEarned += sub.zk * r;
    });

    const totalRate = sumFull ? sumRaw / sumFull : null;
    // 学科贡献：单科得分率 - 总得分率（正=贡献科，负=拖后腿）
    items.forEach(it => {
      it.contrib = totalRate != null ? it.rate - totalRate : null;
      it.zkLoss = it.zk * (1 - it.rate); // 该科在中考里丢的分
    });
    items.sort((a, b) => b.rate - a.rate);

    const rates = items.map(i => i.rate);
    const imbalance = rates.length > 1 ? (Math.max(...rates) - Math.min(...rates)) * 100 : null;

    // 覆盖度与预测
    const coverage = zkCovered / ZHONGKAO_TOTAL;
    const predicted = totalRate != null ? totalRate * ZHONGKAO_TOTAL : null;
    const confidence = coverage >= 0.9 ? '高' : coverage >= 0.7 ? '中' : '低';

    // 班内位置
    const classPercentile = (exam.classRank && exam.classSize) ? (1 - exam.classRank / exam.classSize) * 100 : null;
    const gradePercentile = (exam.gradeRank && exam.gradeSize) ? (1 - exam.gradeRank / exam.gradeSize) * 100 : null;

    return {
      exam, items, totalRaw: sumRaw, totalFull: sumFull, totalRate,
      zkCovered, zkEarned, coverage, predicted, confidence,
      imbalance, hasClassAvg,
      classPercentile, gradePercentile,
      strongest: items[0] || null,
      weakest: items[items.length - 1] || null
    };
  },

  // 目标差距
  targets(examStat, targets) {
    if (!examStat.totalRate) return [];
    return targets.map(t => {
      const line = t.line;
      const targetRate = line / ZHONGKAO_TOTAL;
      const gapRate = (targetRate - examStat.totalRate) * 100;
      const gapScore = line - examStat.predicted;
      return {
        target: t,
        line,
        targetRate,
        gapRate,
        gapScore,
        reached: gapRate <= 0
      };
    }).sort((a, b) => a.line - b.line);
  },

  // 趋势
  trend(exams, scoresByExam) {
    const series = exams.map(e => {
      const st = this.exam(e, scoresByExam[e.id] || []);
      return { exam: e, rate: st.totalRate, predicted: st.predicted, items: st.items };
    }).filter(p => p.rate != null);

    if (!series.length) return { series: [], slope: null, volatility: null, drops: 0, alerts: [] };

    const ys = series.map(p => p.rate * 100);
    const n = ys.length;
    let slope = null;
    if (n >= 2) {
      const xs = ys.map((_, i) => i);
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
      const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      slope = den ? num / den : null;
    }

    let volatility = null;
    if (n >= 2) {
      const my = ys.reduce((a, b) => a + b, 0) / n;
      volatility = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0) / n);
    }

    let drops = 0;
    for (let i = n - 1; i > 0; i--) {
      if (ys[i] < ys[i - 1]) drops++; else break;
    }

    // 单科连续下滑
    const subAlerts = [];
    const codes = [...new Set(series.flatMap(s => s.items.map(i => i.subject)))];
    codes.forEach(code => {
      const vals = series.map(s => {
        const it = s.items.find(i => i.subject === code);
        return it ? it.rate : null;
      });
      const valid = vals.filter(v => v != null);
      if (valid.length >= 3) {
        let d = 0;
        for (let i = valid.length - 1; i > 0; i--) {
          if (valid[i] < valid[i - 1]) d++; else break;
        }
        if (d >= 3) subAlerts.push({ subject: code, name: SUBJECT_MAP[code]?.name || code, drops: d, level: 'red' });
        else if (d === 2) subAlerts.push({ subject: code, name: SUBJECT_MAP[code]?.name || code, drops: d, level: 'yellow' });
      }
    });

    const alerts = [];
    if (drops >= 3) alerts.push({ level: 'red', text: `总分得分率连续 ${drops} 次下降` });
    else if (drops === 2) alerts.push({ level: 'yellow', text: '总分得分率连续 2 次下降' });
    if (volatility != null && volatility > 6) alerts.push({ level: 'yellow', text: `成绩波动大（标准差 ${this.round(volatility)} 个百分点）` });
    if (slope != null && slope < -1) alerts.push({ level: 'red', text: `整体呈下滑趋势（每次约 ${this.round(slope)} 个百分点）` });

    return { series, slope, volatility, drops, alerts, subAlerts };
  },

  // 结构诊断
  structure(examStat) {
    const items = examStat.items;
    const totalRate = examStat.totalRate;

    // 提分空间：低于自身平均水平的科目，按中考分值加权
    const room = items
      .filter(i => totalRate != null && i.rate < totalRate)
      .map(i => ({ ...i, room: i.zk * (totalRate - i.rate) }))
      .sort((a, b) => b.room - a.room);

    // A/B 卷
    const ab = items.filter(i => i.aRate != null || i.bRate != null).map(i => {
      let flag = null;
      if (i.aRate != null && i.aRate < 0.85) flag = 'A卷基础有漏洞';
      else if (i.bRate != null && i.bRate < 0.5) flag = 'B卷拔高能力不足';
      return { ...i, flag };
    });

    // 等级科目风险
    const gradeRisk = items.filter(i => SUBJECT_MAP[i.subject]?.grade).map(i => ({
      ...i,
      note: i.rate < 0.85 ? '可能丢档，每档 4 分' : '稳定在 A 档附近'
    }));

    let imbalanceLevel = '均衡';
    if (examStat.imbalance != null) {
      if (examStat.imbalance > 15) imbalanceLevel = '严重偏科';
      else if (examStat.imbalance > 10) imbalanceLevel = '存在偏科';
    }

    return { room, ab, gradeRisk, imbalanceLevel };
  },

  // 多学生对比
  compare(studentA, studentB, examA, examB) {
    const stA = this.exam(examA, DB.scoresOf(examA.id));
    const stB = this.exam(examB, DB.scoresOf(examB.id));
    const mapA = {}, mapB = {};
    stA.items.forEach(i => mapA[i.subject] = i);
    stB.items.forEach(i => mapB[i.subject] = i);
    const codes = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])];
    const rows = codes.map(code => ({
      subject: code,
      name: SUBJECT_MAP[code]?.name || code,
      a: mapA[code]?.rate ?? null,
      b: mapB[code]?.rate ?? null,
      diff: (mapA[code]?.rate != null && mapB[code]?.rate != null) ? (mapA[code].rate - mapB[code].rate) * 100 : null
    }));
    return { stA, stB, rows };
  }
};
