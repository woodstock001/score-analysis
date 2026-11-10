/* 成绩分析 · 界面层 */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function p1(v) { return v == null || isNaN(v) ? '—' : v.toFixed(1) + '%'; }
function n1(v) { return v == null || isNaN(v) ? '—' : (Math.round(v * 10) / 10).toString(); }
function intf(v) { return v == null || isNaN(v) ? '—' : Math.round(v).toString(); }
function rateColor(r) {
  if (r == null) return '';
  if (r >= 0.85) return 'ok';
  if (r >= 0.75) return '';
  if (r >= 0.6) return 'warn';
  return 'bad';
}

const UI = {
  tab: 'home',
  examId: null,
  entryId: null,
  cmpA: null,
  cmpB: null,
  searchQ: '',

  setTab(t) { this.tab = t; this.render(); window.scrollTo({ top: 0, behavior: 'instant' }); },

  toast(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;z-index:99;opacity:0;transition:.2s';
    document.body.appendChild(d);
    requestAnimationFrame(() => d.style.opacity = '1');
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 250); }, 1800);
  },

  render() {
    const stu = DB.activeStudent();
    const students = DB.data.students;
    const tabs = [
      ['home', '概览'], ['entry', '录入'], ['analysis', '分析'],
      ['targets', '目标'], ['students', '学生'], ['settings', '设置']
    ];

    let body = '';
    if (!students.length) body = this.viewEmpty();
    else if (this.tab === 'home') body = this.viewHome(stu);
    else if (this.tab === 'entry') body = this.viewEntry(stu);
    else if (this.tab === 'analysis') body = this.viewAnalysis(stu);
    else if (this.tab === 'targets') body = this.viewTargets(stu);
    else if (this.tab === 'students') body = this.viewStudents();
    else body = this.viewSettings();

    document.getElementById('app').innerHTML = `
      <div class="topbar">
        <div class="topbar-in">
          <div class="brand">成绩分析<small>成都中考 · 710 分制</small></div>
          <div class="spacer"></div>
          ${students.length ? `
          <div class="stu-switch">
            <select data-act="switchStudent">
              ${students.map(s => `<option value="${s.id}" ${s.id === stu?.id ? 'selected' : ''}>${esc(s.nickname || s.name)}</option>`).join('')}
            </select>
          </div>` : ''}
        </div>
      </div>
      ${students.length ? `
      <div class="tabs">
        <div class="tabs-in">
          ${tabs.map(([k, n]) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}
        </div>
      </div>` : ''}
      <div class="wrap">${body}</div>
    `;
  },

  viewEmpty() {
    return `<div class="empty">
      <div class="ico">📘</div>
      <p>还没有学生档案</p>
      <button class="btn primary" data-act="tab" data-tab="students">建立第一个档案</button>
    </div>`;
  },

  // ══════════ 概览 ══════════
  viewHome(stu) {
    if (!stu) return this.viewEmpty();
    const exams = DB.examsOf(stu.id);
    if (!exams.length) {
      return `<div class="card">
        <div class="empty">
          <div class="ico">📝</div>
          <p>${esc(stu.nickname || stu.name)} 还没有成绩记录<br>录入第一次考试，建立基线</p>
          <button class="btn primary" data-act="tab" data-tab="entry">录入成绩</button>
        </div>
      </div>`;
    }

    const scoresByExam = {};
    exams.forEach(e => scoresByExam[e.id] = DB.scoresOf(e.id));
    const last = exams[exams.length - 1];
    const st = A.exam(last, scoresByExam[last.id]);
    const tg = A.targets(st, DB.targetsOf(stu.id));
    const tr = A.trend(exams, scoresByExam);
    const struct = A.structure(st);
    const alerts = [
      ...tr.alerts,
      ...tr.subAlerts.map(a => ({ level: a.level, text: `${a.name} 连续 ${a.drops} 次得分率下滑` }))
    ];

    const gapRows = tg.map(t => {
      const cls = t.reached ? 'ok' : (t.gapRate < 3 ? 'warn' : 'bad');
      return `<div class="target-item">
        <div class="target-main">
          <div class="target-name">${esc(t.target.schoolName)}</div>
          <div class="target-meta">线 ${t.line} 分 · 需 ${p1(t.targetRate * 100)} 得分率</div>
        </div>
        <div class="target-gap">
          <div class="g" style="color:var(--${cls === 'ok' ? 'ok' : cls === 'warn' ? 'warn' : 'bad'})">
            ${t.reached ? '已达' : '差 ' + n1(Math.abs(t.gapScore)) + ' 分'}
          </div>
          <div class="tiny muted">${t.reached ? '超出 ' + n1(Math.abs(t.gapRate)) + 'pt' : '低 ' + n1(Math.abs(t.gapRate)) + 'pt'}</div>
        </div>
      </div>`;
    }).join('');

    const trendPts = tr.series.slice(-8).map(s => ({
      label: s.exam.name.length > 6 ? s.exam.name.slice(0, 6) : s.exam.name,
      value: s.rate * 100
    }));

    return `
      <div class="card">
        <div class="card-h">
          <h3>最近一次 · ${esc(last.name)}</h3>
          <div class="spacer"></div>
          <span class="tag brand">${esc(last.type)}</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap">
          <div>
            <div class="big">${n1(st.predicted)}<small>分</small></div>
            <div class="tiny muted">按当前得分率外推中考</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div class="tag ${st.confidence === '高' ? 'ok' : st.confidence === '中' ? 'warn' : 'bad'}">
              覆盖度 ${p1(st.coverage * 100)} · 置信${st.confidence}
            </div>
            <div class="tiny muted" style="margin-top:5px">${esc(last.date)} · ${last.grade} 年级</div>
          </div>
        </div>
        <div class="kpis" style="margin-top:14px">
          <div class="kpi"><div class="k">加权得分率</div><div class="v">${p1(st.totalRate * 100)}</div></div>
          <div class="kpi"><div class="k">校内总分</div><div class="v">${n1(st.totalRaw)}<small>/${intf(st.totalFull)}</small></div></div>
          <div class="kpi"><div class="k">偏科指数</div><div class="v">${n1(st.imbalance)}<small>pt</small></div></div>
        </div>
        ${st.confidence !== '高' ? `<div class="note info">
          <span>ℹ️</span><span>当前只覆盖 ${intf(st.zkCovered)}/710 分（${p1(st.coverage * 100)}），未含${this.missingSubjects(last.grade)}。外推分仅作趋势参考。</span>
        </div>` : ''}
      </div>

      ${alerts.length ? `<div class="card">
        <div class="card-h"><h3>需要关注</h3></div>
        ${alerts.map(a => `<div class="note ${a.level === 'red' ? 'bad' : 'warn'}" style="margin-top:8px">
          <span>${a.level === 'red' ? '🔴' : '🟡'}</span><span>${esc(a.text)}</span>
        </div>`).join('')}
      </div>` : ''}

      <div class="card">
        <div class="card-h"><h3>距目标</h3><div class="spacer"></div>
          <span class="tiny muted">2026 数据</span></div>
        ${gapRows || '<div class="muted small">还没有设定目标校</div>'}
      </div>

      ${trendPts.length >= 2 ? `<div class="card">
        <div class="card-h"><h3>得分率走势</h3><div class="spacer"></div>
          <span class="tiny ${tr.slope > 0 ? 'muted' : ''}" style="color:${tr.slope >= 0 ? 'var(--ok)' : 'var(--bad)'}">
            ${tr.slope == null ? '' : (tr.slope >= 0 ? '↑ ' : '↓ ') + n1(Math.abs(tr.slope)) + ' pt/次'}
          </span></div>
        ${lineChart(trendPts)}
      </div>` : ''}

      <div class="card">
        <div class="card-h"><h3>本次最该补的三科</h3></div>
        ${struct.room.length ? struct.room.slice(0, 3).map(r => `
          <div class="bar-row">
            <div class="bar-label">${esc(r.name)}</div>
            <div class="bar-track"><div class="bar-fill ${rateColor(r.rate)}" style="width:${Math.min(r.rate * 100, 100)}%"></div></div>
            <div class="bar-val">+${n1(r.room)} 分</div>
          </div>`).join('') : '<div class="muted small">各科都达到自身平均水平，没有明显拖后腿的科目</div>'}
      </div>

      <div class="row-btns">
        <button class="btn" data-act="tab" data-tab="entry">再录一次</button>
        <button class="btn primary" data-act="tab" data-tab="analysis">看完整分析</button>
      </div>
    `;
  },

  missingSubjects(grade) {
    const have = subjectsOfGrade(grade).map(s => s.code);
    const miss = SUBJECTS.filter(s => !have.includes(s.code)).map(s => s.name);
    return miss.length ? miss.join('、') : '任何科目';
  },

  // ══════════ 录入 ══════════
  viewEntry(stu) {
    const editing = this.entryId ? DB.exam(this.entryId) : null;
    if (!editing && (stu.grade < 7 || stu.grade > 9)) {
      return `<div class="card"><div class="empty">
        <div class="ico">🌱</div>
        <p>${esc(stu.nickname || stu.name)} 现在 ${stu.grade} 年级，初中成绩分析还没启用</p>
        <p class="tiny muted" style="margin-top:6px">升入初中后，在「学生」页把年级改成 7 年级，就能开始录。</p>
        <button class="btn" data-act="tab" data-tab="students" style="margin-top:14px">去学生页</button>
      </div></div>`;
    }
    const grade = editing ? editing.grade : (stu.grade >= 7 && stu.grade <= 9 ? stu.grade : 7);
    const subjects = subjectsOfGrade(grade);
    const lastFull = DB.data.settings.lastFull || {};
    const existing = editing ? DB.scoresOf(editing.id) : [];
    const bySub = {};
    existing.forEach(s => bySub[s.subject] = s);

    const subjRows = subjects.map(s => this.subjectRow(s, bySub[s.code] || {}, lastFull)).join('');

    return `
      <div class="card">
        <div class="card-h">
          <h3>${editing ? '编辑考试' : '录入成绩'}</h3>
          <div class="spacer"></div>
          <span class="tag brand">${esc(stu.nickname || stu.name)}</span>
          ${editing ? '<span class="tag warn">编辑中</span>' : ''}
        </div>
        <div class="field"><label>考试名称</label>
          <input class="inp" id="examName" placeholder="如：2026 秋季期中考试" value="${esc(editing?.name || '')}"></div>
        <div class="grid2">
          <div class="field"><label>类型</label>
            <select class="inp" id="examType">
              ${EXAM_TYPES.map(t => `<option ${editing?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select></div>
          <div class="field"><label>日期</label>
            <input class="inp" type="date" id="examDate" value="${editing?.date || new Date().toISOString().slice(0, 10)}"></div>
        </div>
        <div class="grid3">
          <div class="field"><label>年级</label>
            <select class="inp" id="examGrade" data-act="gradeChange">
              ${[7, 8, 9].map(g => `<option value="${g}" ${grade === g ? 'selected' : ''}>${g} 年级</option>`).join('')}
            </select></div>
          <div class="field"><label>学期</label>
            <select class="inp" id="examSemester">
              ${SEMESTERS.map(s => `<option ${editing?.semester === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select></div>
          <div class="field"><label>　</label>
            <div class="tiny muted" style="padding-top:10px">满分可改</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>各科成绩</h3><div class="spacer"></div>
          <span class="tiny muted">只填有成绩的科目</span></div>
        ${grade === 9 ? '<div class="note info" style="margin-bottom:10px"><span>ℹ️</span><span>地理、生物已在初二结业，不在本次录入范围；需要补录就把年级切到 8 年级。</span></div>' : ''}
        <div id="subjArea">${subjRows}</div>
      </div>

      <div class="card">
        <div class="card-h"><h3>排名与均分</h3><div class="spacer"></div>
          <span class="tiny muted">选填，不填不影响其他分析</span></div>
        <div class="grid2">
          <div class="field"><label>班级排名</label><input class="inp" type="number" id="classRank" value="${editing?.classRank ?? ''}"></div>
          <div class="field"><label>班级人数</label><input class="inp" type="number" id="classSize" value="${editing?.classSize ?? ''}"></div>
          <div class="field"><label>年级排名</label><input class="inp" type="number" id="gradeRank" value="${editing?.gradeRank ?? ''}"></div>
          <div class="field"><label>年级人数</label><input class="inp" type="number" id="gradeSize" value="${editing?.gradeSize ?? ''}"></div>
          <div class="field"><label>班级平均分</label><input class="inp" type="number" step="0.5" id="classAvg" value="${editing?.classAvg ?? ''}"></div>
          <div class="field"><label>年级平均分</label><input class="inp" type="number" step="0.5" id="gradeAvg" value="${editing?.gradeAvg ?? ''}"></div>
        </div>
      </div>

      <div class="row-btns">
        ${editing ? `<button class="btn danger" data-act="deleteExam" data-id="${editing.id}">删除</button>` : ''}
        <button class="btn primary" data-act="saveExam">${editing ? '保存修改' : '保存并分析'}</button>
      </div>
      ${editing ? `<div style="text-align:center;margin-top:10px"><button class="btn ghost sm" data-act="cancelEdit">取消编辑</button></div>` : ''}
    `;
  },

  subjectRow(s, cur, lastFull) {
    cur = cur || {};
    const full = cur.full ?? (lastFull && lastFull[s.code]) ?? s.full;
    return `<div class="subj-row" data-subject="${s.code}">
      <div class="subj-top">
        <div class="subj-name">${s.name}</div>
        <div class="subj-score">
          <input type="number" step="0.5" inputmode="decimal" id="sc_${s.code}" placeholder="分数" value="${cur.raw ?? ''}">
          <span class="slash">/</span>
          <input type="number" step="1" inputmode="numeric" class="full" id="sf_${s.code}" value="${full}" title="满分可改">
        </div>
        <button class="more-btn" data-act="toggleMore" data-code="${s.code}">更多 ▾</button>
      </div>
      <div class="subj-more" id="more_${s.code}">
        ${s.hasAB ? `<div class="grid2">
          <div class="field"><label>A 卷得分</label><input class="inp" type="number" step="0.5" id="sa_${s.code}" value="${cur.aPaper ?? ''}"></div>
          <div class="field"><label>A 卷满分</label><input class="inp" type="number" step="1" id="saf_${s.code}" value="${cur.aFull ?? ''}"></div>
          <div class="field"><label>B 卷得分</label><input class="inp" type="number" step="0.5" id="sb_${s.code}" value="${cur.bPaper ?? ''}"></div>
          <div class="field"><label>B 卷满分</label><input class="inp" type="number" step="1" id="sbf_${s.code}" value="${cur.bFull ?? ''}"></div>
        </div>` : ''}
        <div class="grid2">
          <div class="field"><label>班级平均分</label><input class="inp" type="number" step="0.5" id="savg_${s.code}" value="${cur.classAvg ?? ''}"></div>
          <div class="field"><label>班级排名</label><input class="inp" type="number" step="1" id="srank_${s.code}" value="${cur.classRank ?? ''}"></div>
        </div>
      </div>
    </div>`;
  },

  readEntry() {
    const g = code => document.getElementById(code)?.value ?? '';
    const rows = [];
    document.querySelectorAll('#subjArea .subj-row').forEach(el => {
      const code = el.dataset.subject;
      const raw = g('sc_' + code);
      if (raw === '' || raw == null) return;
      rows.push({
        subject: code,
        raw,
        full: g('sf_' + code),
        aPaper: g('sa_' + code), aFull: g('saf_' + code),
        bPaper: g('sb_' + code), bFull: g('sbf_' + code),
        classAvg: g('savg_' + code), classRank: g('srank_' + code)
      });
    });
    return {
      name: g('examName').trim(),
      type: g('examType'),
      date: g('examDate'),
      grade: g('examGrade'),
      semester: g('examSemester'),
      classRank: g('classRank'), classSize: g('classSize'),
      gradeRank: g('gradeRank'), gradeSize: g('gradeSize'),
      classAvg: g('classAvg'), gradeAvg: g('gradeAvg'),
      rows
    };
  },

  saveExam() {
    const stu = DB.activeStudent();
    if (!stu) return;
    const v = this.readEntry();
    if (!v.name) { this.toast('先填考试名称'); return; }
    if (!v.rows.length) { this.toast('至少填一科成绩'); return; }

    const { rows, ...examFields } = v;
    const payload = { ...examFields, studentId: stu.id };
    let examId = this.entryId;
    if (examId) {
      DB.updateExam(examId, payload);
    } else {
      const e = DB.addExam(payload);
      examId = e.id;
    }
    DB.saveScores(examId, rows);

    // 记住各科满分
    const lf = { ...(DB.data.settings.lastFull || {}) };
    v.rows.forEach(r => { if (r.full) lf[r.subject] = Number(r.full); });
    DB.data.settings.lastFull = lf;
    DB.save();

    this.entryId = null;
    this.examId = examId;
    this.tab = 'analysis';
    this.render();
    this.toast('已保存');
  },

  // ══════════ 分析 ══════════
  viewAnalysis(stu) {
    const exams = DB.examsOf(stu.id);
    if (!exams.length) {
      return `<div class="card"><div class="empty"><div class="ico">📊</div>
        <p>还没有数据</p><button class="btn primary" data-act="tab" data-tab="entry">先录一次</button></div></div>`;
    }
    const cur = exams.find(e => e.id === this.examId) || exams[exams.length - 1];
    this.examId = cur.id;

    const scoresByExam = {};
    exams.forEach(e => scoresByExam[e.id] = DB.scoresOf(e.id));
    const st = A.exam(cur, scoresByExam[cur.id]);
    const tg = A.targets(st, DB.targetsOf(stu.id));
    const tr = A.trend(exams, scoresByExam);
    const struct = A.structure(st);
    const alerts = [
      ...tr.alerts,
      ...tr.subAlerts.map(a => ({ level: a.level, text: `${a.name} 连续 ${a.drops} 次得分率下滑` }))
    ];

    const sel = `<select class="inp" data-act="selectExam" style="width:auto;display:inline-block;padding:7px 10px;font-size:13px">
      ${exams.slice().reverse().map(e => `<option value="${e.id}" ${e.id === cur.id ? 'selected' : ''}>${esc(e.name)} · ${e.date}</option>`).join('')}
    </select>`;

    // 学科条形
    const bars = st.items.map(i => `
      <div class="bar-row">
        <div class="bar-label">${esc(i.name)}</div>
        <div class="bar-track"><div class="bar-fill ${rateColor(i.rate)}" style="width:${Math.min(i.rate * 100, 100)}%"></div></div>
        <div class="bar-val">${p1(i.rate * 100)}</div>
      </div>`).join('');

    // 目标表
    const tgtRows = tg.map(t => {
      const cls = t.reached ? 'ok' : (t.gapRate < 3 ? 'warn' : 'bad');
      return `<tr>
        <td>${esc(t.target.schoolName)}${t.target.level === 'B' ? ' <span class="tag">咨询</span>' : ''}</td>
        <td class="num">${t.line}</td>
        <td class="num">${t.target.rank ?? '—'}</td>
        <td class="num">${p1(t.targetRate * 100)}</td>
        <td class="num"><span class="tag ${cls}">${t.reached ? '已达' : '-' + n1(Math.abs(t.gapRate)) + 'pt'}</span></td>
        <td class="num">${t.reached ? '超额 ' + n1(Math.abs(t.gapScore)) : '-' + n1(Math.abs(t.gapScore))}</td>
      </tr>`;
    }).join('');

    // A/B 卷
    const abHtml = struct.ab.length ? struct.ab.map(i => `
      <div style="padding:8px 0;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:center;gap:8px">
          <b style="width:46px">${esc(i.name)}</b>
          <span class="tiny muted">A卷 ${i.aRate != null ? p1(i.aRate * 100) : '—'}</span>
          <span class="tiny muted">B卷 ${i.bRate != null ? p1(i.bRate * 100) : '—'}</span>
          ${i.flag ? `<span class="tag ${i.flag.includes('基础') ? 'bad' : 'warn'}" style="margin-left:auto">${i.flag}</span>` : ''}
        </div>
      </div>`).join('') : '<div class="muted small">没有 A/B 卷数据。录分时展开「更多」填写即可。</div>';

    // 提分空间
    const roomHtml = struct.room.length ? struct.room.slice(0, 5).map((r, idx) => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9">
        <span class="tag brand">${idx + 1}</span>
        <div style="flex:1">
          <b>${esc(r.name)}</b>
          <div class="tiny muted">当前 ${p1(r.rate * 100)}，低于自身均分 ${n1((st.totalRate - r.rate) * 100)}pt</div>
        </div>
        <div style="text-align:right">
          <b style="color:var(--ok)">+${n1(r.room)}</b>
          <div class="tiny muted">中考折算</div>
        </div>
      </div>`).join('') : '<div class="muted small">没有低于自身平均水平的科目</div>';

    // 等级科目
    const gradeHtml = struct.gradeRisk.length ? struct.gradeRisk.map(g => `
      <div class="bar-row">
        <div class="bar-label">${esc(g.name)}</div>
        <div class="bar-track"><div class="bar-fill ${rateColor(g.rate)}" style="width:${Math.min(g.rate * 100, 100)}%"></div></div>
        <div class="bar-val">${p1(g.rate * 100)}</div>
      </div>
      <div class="tiny muted" style="margin:-4px 0 6px 55px">${g.note}</div>`).join('') : '';

    // 趋势
    const trendPts = tr.series.map(s => ({ label: s.exam.name.slice(0, 5), value: s.rate * 100 }));

    return `
      <div class="card" style="padding:13px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          ${sel}
          <div class="spacer"></div>
          <button class="btn sm" data-act="editExam" data-id="${cur.id}">编辑</button>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>单次体检</h3><div class="spacer"></div>
          <span class="tag ${st.confidence === '高' ? 'ok' : st.confidence === '中' ? 'warn' : 'bad'}">置信${st.confidence}</span></div>
        <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
          <div><div class="big">${p1(st.totalRate * 100)}</div><div class="tiny muted">加权得分率</div></div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:20px;font-weight:700">${n1(st.totalRaw)}<span class="muted" style="font-size:13px">/${intf(st.totalFull)}</span></div>
            <div class="tiny muted">校内总分</div>
          </div>
        </div>
        <div class="kpis" style="margin-top:14px">
          <div class="kpi"><div class="k">外推中考</div><div class="v">${n1(st.predicted)}<small>分</small></div></div>
          <div class="kpi"><div class="k">班级位次</div><div class="v">${st.classPercentile != null ? p1(st.classPercentile) : '—'}<small>${st.classPercentile != null ? '百分位' : '未录'}</small></div></div>
          <div class="kpi"><div class="k">偏科指数</div><div class="v">${n1(st.imbalance)}<small>pt</small></div></div>
        </div>
        <div class="note info" style="margin-top:12px">
          <span>ℹ️</span><span>覆盖 ${intf(st.zkCovered)}/710 分（${p1(st.coverage * 100)}），未含${this.missingSubjects(cur.grade)}。外推假设未考科目保持同等水平。</span>
        </div>
        ${st.classPercentile == null ? `<div class="note warn"><span>⚠️</span><span>未录入班级排名和人数，位次类指标不可用。这不影响得分率和学科诊断。</span></div>` : ''}
      </div>

      <div class="card">
        <div class="card-h"><h3>各科得分率</h3><div class="spacer"></div>
          <span class="tiny muted">${struct.imbalanceLevel}</span></div>
        ${bars}
      </div>

      <div class="card">
        <div class="card-h"><h3>学科均衡</h3><div class="spacer"></div>
          <span class="tiny muted">偏科指数 ${n1(st.imbalance)} pt</span></div>
        ${radarChart(st.items)}
      </div>

      <div class="card">
        <div class="card-h"><h3>距目标</h3><div class="spacer"></div><span class="tiny muted">2026 录取数据</span></div>
        ${tgtRows ? `<table class="tbl">
          <thead><tr><th>学校</th><th class="num">线</th><th class="num">位次</th><th class="num">需得分率</th><th class="num">差距</th><th class="num">折算分</th></tr></thead>
          <tbody>${tgtRows}</tbody></table>` : '<div class="muted small">还没有目标校，去「目标」页添加</div>'}
        <div class="tiny muted" style="margin-top:10px">差距按当前加权得分率计算，负值为还需提升的幅度。</div>
      </div>

      <div class="card">
        <div class="card-h"><h3>提分空间</h3><div class="spacer"></div><span class="tiny muted">按中考分值加权</span></div>
        ${roomHtml}
      </div>

      <div class="card">
        <div class="card-h"><h3>A / B 卷结构</h3></div>
        ${abHtml}
        <div class="tiny muted" style="margin-top:8px">A 卷低于 85% 说明基础有漏洞，先别刷难题；B 卷低于 50% 说明拔高能力不足。</div>
      </div>

      ${gradeHtml ? `<div class="card">
        <div class="card-h"><h3>等级科目</h3><div class="spacer"></div><span class="tiny muted">一档 4 分</span></div>
        ${gradeHtml}
        <div class="tiny muted" style="margin-top:8px">道法、历史、地理、生物按 A20/B16/C12/D8 折算，四科全 B 比全 A 少 16 分。</div>
      </div>` : ''}

      ${trendPts.length >= 2 ? `<div class="card">
        <div class="card-h"><h3>得分率走势</h3><div class="spacer"></div>
          <span class="tiny" style="color:${(tr.slope ?? 0) >= 0 ? 'var(--ok)' : 'var(--bad)'}">
            ${tr.slope == null ? '' : (tr.slope >= 0 ? '↑' : '↓') + n1(Math.abs(tr.slope)) + ' pt/次'}
            ${tr.volatility != null ? ' · 波动 ' + n1(tr.volatility) : ''}</span></div>
        ${lineChart(trendPts)}
      </div>` : `<div class="card"><div class="muted small">录满 2 次考试后显示趋势。</div></div>`}

      ${alerts.length ? `<div class="card">
        <div class="card-h"><h3>预警</h3></div>
        ${alerts.map(a => `<div class="note ${a.level === 'red' ? 'bad' : 'warn'}" style="margin-top:8px">
          <span>${a.level === 'red' ? '🔴' : '🟡'}</span><span>${esc(a.text)}</span></div>`).join('')}
        <div class="tiny muted" style="margin-top:10px">单次下滑叫失常，连续 3 次才定性为弱科。</div>
      </div>` : ''}
    `;
  },

  // ══════════ 目标 ══════════
  viewTargets(stu) {
    const targets = DB.targetsOf(stu.id);
    const exams = DB.examsOf(stu.id);
    const last = exams[exams.length - 1];
    const st = last ? A.exam(last, DB.scoresOf(last.id)) : null;

    const list = targets.map(t => {
      const s = t.schoolId ? SCHOOL_MAP[t.schoolId] : null;
      const name = t.schoolName || (s ? s.name + (s.campus ? '（' + s.campus + '）' : '') : '未命名');
      const targetRate = t.line / ZHONGKAO_TOTAL;
      let gapHtml = '<span class="tiny muted">待录入成绩</span>';
      if (st && st.totalRate != null) {
        const gapRate = (targetRate - st.totalRate) * 100;
        const gapScore = t.line - st.predicted;
        const cls = gapRate <= 0 ? 'ok' : gapRate < 3 ? 'warn' : 'bad';
        gapHtml = `<div class="g" style="color:var(--${cls === 'ok' ? 'ok' : cls === 'warn' ? 'warn' : 'bad'})">${gapRate <= 0 ? '已达' : '差 ' + n1(Math.abs(gapScore)) + ' 分'}</div>
          <div class="tiny muted">${gapRate <= 0 ? '超 ' + n1(Math.abs(gapRate)) + 'pt' : '低 ' + n1(Math.abs(gapRate)) + 'pt'}</div>`;
      }
      return `<div class="target-item">
        <div class="target-main">
          <div class="target-name">${esc(name)} ${t.level === 'B' ? '<span class="tag">咨询线</span>' : ''}</div>
          <div class="target-meta">线 ${t.line} 分 · 需 ${p1(targetRate * 100)} · 位次 ${t.rank ?? '—'} · ${t.year} 年</div>
        </div>
        <div class="target-gap">${gapHtml}</div>
        <button class="btn sm ghost" data-act="removeTarget" data-id="${t.id}" style="color:var(--muted);padding:4px 8px">✕</button>
      </div>`;
    }).join('');

    return `
      <div class="card">
        <div class="card-h"><h3>${esc(stu.nickname || stu.name)} 的目标校</h3><div class="spacer"></div>
          <span class="tiny muted">${targets.length} 所</span></div>
        ${list || '<div class="muted small">还没有目标校</div>'}
      </div>

      <div class="card">
        <div class="card-h"><h3>添加目标</h3></div>
        <div class="search-box">
          <input class="inp" id="schoolSearch" placeholder="搜索学校，如 列五、四十九中、七中" value="${esc(this.searchQ)}" data-act="schoolSearch">
        </div>
        <div class="search-list" id="searchList">
          ${this.renderSearch()}
        </div>
        <div style="margin-top:14px">
          <button class="btn block sm" data-act="customTarget">+ 自定义添加（手动填分数线）</button>
        </div>
      </div>

      <div class="note info">
        <span>ℹ️</span><span>A 级为官方录取线+位次（市直属、成华区已核实）；B 级为出分日咨询线，不是录取线，仅供参考。数据年份 2026。</span>
      </div>
    `;
  },

  renderSearch() {
    const q = (this.searchQ || '').trim();
    const added = new Set(DB.targetsOf(DB.data.settings.activeStudent).map(t => t.schoolId));
    let list = SCHOOLS.filter(s => !added.has(s.id));
    if (q) {
      list = list.filter(s => (s.name + s.campus + s.district).includes(q));
    } else {
      list = list.slice(0, 12);
    }
    if (!list.length) return '<div class="search-item muted">没有匹配的学校</div>';
    return list.map(s => {
      const label = s.name + (s.campus ? '（' + s.campus + '）' : '');
      return `<div class="search-item" data-act="addTarget" data-id="${s.id}">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13.5px">${esc(label)}</div>
          <div class="tiny muted">${esc(s.district)} · ${s.type === 'private' ? '民办' : '公办'} · 线 ${s.line}${s.rank ? ' · 位次 ' + s.rank : ''}</div>
        </div>
        <span class="tag ${s.level === 'A' ? 'brand' : ''}">${s.level}</span>
      </div>`;
    }).join('');
  },

  // ══════════ 学生 ══════════
  viewStudents() {
    const cur = DB.data.settings.activeStudent;
    const cards = DB.data.students.map(s => {
      const exams = DB.examsOf(s.id);
      return `<div class="stu-card ${s.id === cur ? 'on' : ''}">
        <div class="avatar ${s.status === 'reserved' ? 'gray' : ''}">${esc((s.nickname || s.name).slice(0, 1))}</div>
        <div style="flex:1">
          <div style="font-weight:700">${esc(s.nickname || s.name)} ${s.status === 'reserved' ? '<span class="tag">预留</span>' : ''}</div>
          <div class="tiny muted">${s.grade} 年级 · ${exams.length} 次考试${s.enrollYear ? ' · ' + (s.enrollYear + 3) + ' 年中考' : ''}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn sm ghost" data-act="editStudent" data-id="${s.id}">改年级</button>
          <button class="btn sm" data-act="setActive" data-id="${s.id}">${s.id === cur ? '当前' : '切换'}</button>
        </div>
      </div>`;
    }).join('');

    // 对比
    const actives = DB.data.students.filter(s => DB.examsOf(s.id).length > 0);
    let cmp = '';
    if (actives.length >= 2) {
      const a = this.cmpA || actives[0].id;
      const b = this.cmpB || actives[1].id;
      const opts = sel => actives.map(s => `<option value="${s.id}" ${sel === s.id ? 'selected' : ''}>${esc(s.nickname || s.name)}</option>`).join('');
      const examsA = DB.examsOf(a), examsB = DB.examsOf(b);
      if (examsA.length && examsB.length) {
        const ea = examsA[examsA.length - 1], eb = examsB[examsB.length - 1];
        const r = A.compare(a, b, ea, eb);
        cmp = `<div class="card">
          <div class="card-h"><h3>学生对比</h3></div>
          <div class="grid2" style="margin-bottom:12px">
            <select class="inp" data-act="cmpA">${opts(a)}</select>
            <select class="inp" data-act="cmpB">${opts(b)}</select>
          </div>
          <div class="tiny muted" style="margin-bottom:10px">
            取各自最近一次：${esc(ea.name)} / ${esc(eb.name)}。跨年级只比得分率，不比原始分。
          </div>
          <table class="tbl">
            <thead><tr><th>科目</th><th class="num">${esc(DB.student(a).nickname)}</th><th class="num">${esc(DB.student(b).nickname)}</th><th class="num">差</th></tr></thead>
            <tbody>
              ${r.rows.map(row => `<tr>
                <td>${esc(row.name)}</td>
                <td class="num">${p1(row.a * 100)}</td>
                <td class="num">${p1(row.b * 100)}</td>
                <td class="num" style="color:${row.diff > 0 ? 'var(--ok)' : row.diff < 0 ? 'var(--bad)' : 'inherit'}">${row.diff == null ? '—' : (row.diff > 0 ? '+' : '') + n1(row.diff) + 'pt'}</td>
              </tr>`).join('')}
              <tr style="font-weight:700">
                <td>加权得分率</td>
                <td class="num">${p1(r.stA.totalRate * 100)}</td>
                <td class="num">${p1(r.stB.totalRate * 100)}</td>
                <td class="num">${n1((r.stA.totalRate - r.stB.totalRate) * 100)}pt</td>
              </tr>
            </tbody>
          </table>
        </div>`;
      }
    }

    return `
      <div class="card">
        <div class="card-h"><h3>学生档案</h3><div class="spacer"></div>
          <button class="btn sm" data-act="addStudent">+ 添加</button></div>
        ${cards}
        <div class="tiny muted" style="margin-top:10px">预留档案（如汤圆）不参与分析，升初中后改年级即可启用。</div>
      </div>
      ${cmp}
    `;
  },

  // ══════════ 设置 ══════════
  viewSettings() {
    const s = DB.data.settings;
    const logged = !!Cloud.session?.user;
    const email = Cloud.session?.user?.email || '';

    return `
      <div class="card">
        <div class="card-h"><h3>云备份（你的 Supabase）</h3><div class="spacer"></div>
          <span class="tag ${logged ? 'ok' : ''}">${logged ? '已登录' : '未登录'}</span></div>
        <div class="note info" style="margin-top:0;margin-bottom:12px">
          <span>🔒</span><span>数据只存在你的浏览器和你自己的 Supabase 项目里，不经过任何第三方后端。</span>
        </div>
        <div class="field"><label>Project URL</label>
          <input class="inp" id="sbUrl" placeholder="https://xxxx.supabase.co" value="${esc(s.url)}"></div>
        <div class="field"><label>anon public key</label>
          <input class="inp" id="sbKey" placeholder="eyJhbGci..." value="${esc(s.anonKey)}"></div>
        ${logged ? `
          <div class="set-item"><div class="t"><b>${esc(email)}</b><span>已连接</span></div>
            <button class="btn sm" data-act="cloudLogout">退出</button></div>
          <div class="row-btns">
            <button class="btn" data-act="cloudPull">从云端恢复</button>
            <button class="btn primary" data-act="cloudPush">上传到云端</button>
          </div>
          <div class="set-item" style="margin-top:8px">
            <div class="t"><b>自动同步</b><span>每次保存后自动上传</span></div>
            <label class="switch"><input type="checkbox" data-act="autoSync" ${s.autoSync ? 'checked' : ''}><i></i></label>
          </div>
          ${s.lastSync ? `<div class="tiny muted">上次同步：${new Date(s.lastSync).toLocaleString('zh-CN')}</div>` : ''}
        ` : `
          <div class="field"><label>邮箱</label><input class="inp" id="sbEmail" type="email" placeholder="you@example.com"></div>
          <div class="field"><label>密码</label><input class="inp" id="sbPass" type="password" placeholder="至少 6 位"></div>
          <div class="row-btns">
            <button class="btn" data-act="cloudSignup">注册</button>
            <button class="btn primary" data-act="cloudLogin">登录</button>
          </div>
          <div class="tiny muted" style="margin-top:10px">第一次用先「注册」，用邮箱建账号；之后在任意设备登录即可拉回数据。</div>
        `}
        <div style="margin-top:12px">
          <button class="btn block sm" data-act="saveSb">保存配置</button>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>数据</h3></div>
        <div class="set-item">
          <div class="t"><b>导出 JSON</b><span>完整备份，可再导入</span></div>
          <button class="btn sm" data-act="exportJson">导出</button>
        </div>
        <div class="set-item">
          <div class="t"><b>导出 CSV</b><span>Excel 可打开，当前学生</span></div>
          <button class="btn sm" data-act="exportCsv">导出</button>
        </div>
        <div class="set-item">
          <div class="t"><b>导入 JSON</b><span>覆盖当前数据</span></div>
          <button class="btn sm" data-act="importJson">导入</button>
        </div>
        <div class="set-item">
          <div class="t"><b style="color:var(--bad)">清空全部数据</b><span>不可恢复，先导出备份</span></div>
          <button class="btn sm danger" data-act="clearAll">清空</button>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>说明</h3></div>
        <div class="tiny muted" style="line-height:1.8">
          · 成都中考现行 710 分制（成招考委〔2026〕5号），语数外各 150、物理 70、化学 50、体育 60、道法/历史/地理/生物各 20（等级折算）。<br>
          · 目标校数据为 2026 年，每年 7 月更新；录取位次比分数线更稳定，追踪以位次为主。<br>
          · 初一阶段缺物理、化学、体育，外推分仅作趋势参考，不当作预测。<br>
          · 成绩数据默认只存本机浏览器；配置 Supabase 后同步到你自己的云端项目。
        </div>
      </div>
    `;
  }
};

// ══════════ 图表 ══════════
function lineChart(points) {
  if (!points.length) return '';
  const W = 340, H = 150, padL = 30, padR = 12, padT = 14, padB = 24;
  const vals = points.map(p => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(max - min, 4);
  min = Math.max(0, min - span * 0.25);
  max = min + span * 1.5;
  const x = i => padL + (points.length === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (points.length - 1));
  const y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;

  const grid = [0, 0.5, 1].map(t => {
    const v = min + (max - min) * t;
    return `<line class="grid-line" x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}"/>
      <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`;
  }).join('');

  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="3" fill="#0e7490"/>`).join('');
  const labels = points.map((p, i) => (points.length <= 8 || i % 2 === 0)
    ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>` : '').join('');
  const lastV = `<text x="${x(points.length - 1)}" y="${y(points[points.length - 1].value) - 8}" text-anchor="end" style="font-weight:700;fill:#0e7490">${n1(points[points.length - 1].value)}%</text>`;

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${grid}
    <path d="${area}" fill="rgba(14,116,144,.08)"/>
    <path d="${path}" fill="none" stroke="#0e7490" stroke-width="2" stroke-linejoin="round"/>
    ${dots}${labels}${lastV}
  </svg>`;
}

function radarChart(items) {
  if (items.length < 3) return '';
  const W = 320, H = 260, cx = 160, cy = 125, R = 88;
  const n = items.length;
  const ang = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];

  const rings = [0.33, 0.66, 1].map(k => {
    const d = items.map((_, i) => pt(i, R * k).map(v => v.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${d}" fill="none" stroke="#eef2f6" stroke-width="1"/>`;
  }).join('');

  const spokes = items.map((_, i) => {
    const [px, py] = pt(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#eef2f6"/>`;
  }).join('');

  const dataPts = items.map((it, i) => pt(i, R * Math.min(it.rate, 1)).map(v => v.toFixed(1)).join(',')).join(' ');
  const labels = items.map((it, i) => {
    const [lx, ly] = pt(i, R + 18);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    return `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}">${esc(it.name)}</text>`;
  }).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${rings}${spokes}
    <polygon points="${dataPts}" fill="rgba(14,116,144,.18)" stroke="#0e7490" stroke-width="2"/>
    ${labels}
  </svg>`;
}
