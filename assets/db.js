/* 成绩分析 · 存储层
 * 本地 localStorage 为主，Supabase（用户自有）为云备份
 * 数据不经过任何第三方后端
 */

const STORE_KEY = 'cjfx_v1';

const DB = {
  data: null,

  blank() {
    return {
      students: [],
      exams: [],
      scores: [],
      targets: [],
      settings: { url: '', anonKey: '', email: '', autoSync: false, lastSync: null, activeStudent: null }
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      this.data = raw ? Object.assign(this.blank(), JSON.parse(raw)) : this.blank();
      this.data.settings = Object.assign(this.blank().settings, this.data.settings || {});
    } catch (e) {
      console.error('读取本地数据失败', e);
      this.data = this.blank();
    }
    if (!this.data.students.length) this.seed();
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('保存失败', e);
      alert('本地保存失败，可能是浏览器存储已满');
    }
    if (this.data.settings.autoSync) Cloud.schedulePush();
  },

  seed() {
    const qq = this.addStudent({ name: 'QQ', nickname: 'QQ', grade: 7, enrollYear: 2026, status: 'active' }, true);
    this.addStudent({ name: '汤圆', nickname: '汤圆', grade: 4, enrollYear: null, status: 'reserved' }, true);
    this.data.settings.activeStudent = qq.id;
    DEFAULT_TARGETS.forEach(id => {
      const s = SCHOOL_MAP[id];
      if (s) this.addTarget({ studentId: qq.id, schoolId: id, schoolName: s.name + (s.campus ? '（' + s.campus + '）' : ''), line: s.line, rank: s.rank, adjust: s.adjust, level: s.level, year: s.year }, true);
    });
    localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
  },

  uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  },

  // ── 学生 ──
  addStudent(s, silent) {
    const row = {
      id: this.uid(),
      name: s.name || '',
      nickname: s.nickname || s.name || '',
      grade: Number(s.grade) || 7,
      enrollYear: s.enrollYear || null,
      school: s.school || '',
      className: s.className || '',
      status: s.status || 'active',
      createdAt: new Date().toISOString()
    };
    this.data.students.push(row);
    if (!silent) this.save();
    return row;
  },

  updateStudent(id, patch) {
    const s = this.data.students.find(x => x.id === id);
    if (s) Object.assign(s, patch);
    this.save();
  },

  removeStudent(id) {
    this.data.students = this.data.students.filter(x => x.id !== id);
    const examIds = this.data.exams.filter(e => e.studentId === id).map(e => e.id);
    this.data.exams = this.data.exams.filter(e => e.studentId !== id);
    this.data.scores = this.data.scores.filter(s => !examIds.includes(s.examId));
    this.data.targets = this.data.targets.filter(t => t.studentId !== id);
    if (this.data.settings.activeStudent === id) {
      this.data.settings.activeStudent = this.data.students[0] ? this.data.students[0].id : null;
    }
    this.save();
  },

  student(id) {
    return this.data.students.find(x => x.id === id);
  },

  activeStudent() {
    return this.student(this.data.settings.activeStudent) || this.data.students[0] || null;
  },

  // ── 考试 ──
  addExam(e) {
    const row = {
      id: this.uid(),
      studentId: e.studentId,
      name: e.name || '',
      type: e.type || '月考',
      date: e.date || new Date().toISOString().slice(0, 10),
      grade: Number(e.grade) || 7,
      semester: e.semester || '上学期',
      classSize: numOrNull(e.classSize),
      gradeSize: numOrNull(e.gradeSize),
      classRank: numOrNull(e.classRank),
      gradeRank: numOrNull(e.gradeRank),
      classAvg: numOrNull(e.classAvg),
      gradeAvg: numOrNull(e.gradeAvg),
      note: e.note || '',
      createdAt: new Date().toISOString()
    };
    this.data.exams.push(row);
    this.save();
    return row;
  },

  updateExam(id, patch) {
    const e = this.data.exams.find(x => x.id === id);
    if (e) Object.assign(e, patch);
    this.save();
  },

  removeExam(id) {
    this.data.exams = this.data.exams.filter(x => x.id !== id);
    this.data.scores = this.data.scores.filter(s => s.examId !== id);
    this.save();
  },

  examsOf(studentId) {
    const t = d => { const v = Date.parse(d); return isNaN(v) ? 0 : v; };
    return this.data.exams
      .filter(e => e.studentId === studentId)
      .sort((a, b) => t(a.date) - t(b.date) || String(a.createdAt).localeCompare(String(b.createdAt)));
  },

  exam(id) {
    return this.data.exams.find(x => x.id === id);
  },

  // ── 分数 ──
  saveScores(examId, rows) {
    this.data.scores = this.data.scores.filter(s => s.examId !== examId);
    rows.forEach(r => {
      if (r.raw == null || r.raw === '') return;
      this.data.scores.push({
        id: this.uid(),
        examId,
        subject: r.subject,
        raw: Number(r.raw),
        full: Number(r.full) || SUBJECT_MAP[r.subject]?.full || 100,
        grade: r.grade || null,
        aPaper: numOrNull(r.aPaper),
        aFull: numOrNull(r.aFull),
        bPaper: numOrNull(r.bPaper),
        bFull: numOrNull(r.bFull),
        classAvg: numOrNull(r.classAvg),
        classRank: numOrNull(r.classRank)
      });
    });
    this.save();
  },

  scoresOf(examId) {
    return this.data.scores.filter(s => s.examId === examId);
  },

  // ── 目标 ──
  addTarget(t, silent) {
    const row = {
      id: this.uid(),
      studentId: t.studentId,
      schoolId: t.schoolId || null,
      schoolName: t.schoolName || '',
      line: numOrNull(t.line),
      rank: numOrNull(t.rank),
      adjust: numOrNull(t.adjust),
      level: t.level || 'C',
      year: t.year || 2026
    };
    this.data.targets.push(row);
    if (!silent) this.save();
    return row;
  },

  removeTarget(id) {
    this.data.targets = this.data.targets.filter(t => t.id !== id);
    this.save();
  },

  targetsOf(studentId) {
    return this.data.targets.filter(t => t.studentId === studentId);
  },

  // ── 导入导出 ──
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },

  importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.students)) throw new Error('格式不对，缺少 students');
    this.data = Object.assign(this.blank(), obj);
    this.save();
  },

  exportCSV(studentId) {
    const stu = this.student(studentId);
    const exams = this.examsOf(studentId);
    const lines = ['学生,考试,日期,年级,科目,分数,满分,得分率,班均分,班排'];
    exams.forEach(e => {
      this.scoresOf(e.id).forEach(s => {
        const rate = s.full ? (s.raw / s.full * 100).toFixed(1) + '%' : '';
        lines.push([stu?.nickname || '', e.name, e.date, e.grade + '年级', SUBJECT_MAP[s.subject]?.name || s.subject, s.raw, s.full, rate, s.classAvg ?? '', s.classRank ?? ''].join(','));
      });
    });
    return '\ufeff' + lines.join('\n');
  }
};

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// ── Supabase（用户自有项目，REST 直连，无 SDK） ──────────────
const Cloud = {
  session: null,
  timer: null,
  busy: false,

  cfg() {
    const s = DB.data.settings;
    return { url: (s.url || '').replace(/\/+$/, ''), key: s.anonKey || '' };
  },

  ready() {
    const c = this.cfg();
    return !!(c.url && c.key);
  },

  headers() {
    const c = this.cfg();
    const h = { 'apikey': c.key, 'Content-Type': 'application/json' };
    if (this.session?.access_token) h['Authorization'] = 'Bearer ' + this.session.access_token;
    return h;
  },

  async call(path, opts = {}) {
    const c = this.cfg();
    if (!this.ready()) throw new Error('未配置 Supabase');
    const res = await fetch(c.url + path, {
      method: opts.method || 'GET',
      headers: Object.assign(this.headers(), opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = data?.msg || data?.message || data?.error_description || res.status + ' ' + res.statusText;
      throw new Error(msg);
    }
    return data;
  },

  async signUp(email, password) {
    const c = this.cfg();
    const res = await fetch(c.url + '/auth/v1/signup', {
      method: 'POST',
      headers: { 'apikey': c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.message || '注册失败');
    return data;
  },

  async signIn(email, password) {
    const c = this.cfg();
    const res = await fetch(c.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || '登录失败');
    this.setSession(data);
    return data;
  },

  async refresh() {
    if (!this.session?.refresh_token) throw new Error('未登录');
    const c = this.cfg();
    const res = await fetch(c.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.session.refresh_token })
    });
    const data = await res.json();
    if (!res.ok) { this.session = null; throw new Error('登录已过期，请重新登录'); }
    this.setSession(data);
    return data;
  },

  setSession(data) {
    this.session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user || this.session?.user
    };
    localStorage.setItem('cjfx_session', JSON.stringify(this.session));
  },

  restoreSession() {
    try {
      const raw = localStorage.getItem('cjfx_session');
      if (raw) this.session = JSON.parse(raw);
    } catch { this.session = null; }
    return this.session;
  },

  signOut() {
    this.session = null;
    localStorage.removeItem('cjfx_session');
  },

  uid() {
    return this.session?.user?.id;
  },

  async ensure() {
    if (!this.session) throw new Error('请先登录云备份');
    const exp = this.session.user?.expires_at;
    // 提前 60 秒刷新
    if (exp && Date.now() / 1000 > exp - 60) await this.refresh();
  },

  async pushAll() {
    await this.ensure();
    const uid = this.uid();
    if (!uid) throw new Error('未登录');
    this.busy = true;
    try {
      for (const t of ['scores', 'exams', 'students', 'targets']) {
        await this.call(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } });
      }
      const students = DB.data.students.map(s => ({
        id: s.id, user_id: uid, name: s.name, nickname: s.nickname, grade: s.grade,
        enroll_year: s.enrollYear, school: s.school, class_name: s.className, status: s.status
      }));
      const exams = DB.data.exams.map(e => ({
        id: e.id, user_id: uid, student_id: e.studentId, name: e.name, type: e.type,
        date: e.date, grade: e.grade, semester: e.semester,
        class_size: e.classSize, grade_size: e.gradeSize, class_rank: e.classRank, grade_rank: e.gradeRank,
        class_avg: e.classAvg, grade_avg: e.gradeAvg, note: e.note
      }));
      const scores = DB.data.scores.map(s => ({
        id: s.id, user_id: uid, exam_id: s.examId, subject: s.subject, raw: s.raw, full: s.full,
        grade: s.grade, a_paper: s.aPaper, a_full: s.aFull, b_paper: s.bPaper, b_full: s.bFull,
        class_avg: s.classAvg, class_rank: s.classRank
      }));
      const targets = DB.data.targets.map(t => ({
        id: t.id, user_id: uid, student_id: t.studentId, school_id: t.schoolId, school_name: t.schoolName,
        line: t.line, rank: t.rank, adjust: t.adjust, level: t.level, year: t.year
      }));
      const ins = async (table, rows) => {
        if (!rows.length) return;
        for (let i = 0; i < rows.length; i += 100) {
          await this.call(`/rest/v1/${table}`, { method: 'POST', body: rows.slice(i, i + 100), headers: { 'Prefer': 'return=minimal' } });
        }
      };
      await ins('students', students);
      await ins('exams', exams);
      await ins('scores', scores);
      await ins('targets', targets);
      DB.data.settings.lastSync = new Date().toISOString();
      DB.save();
    } finally {
      this.busy = false;
    }
  },

  async pullAll() {
    await this.ensure();
    const uid = this.uid();
    if (!uid) throw new Error('未登录');
    const q = `?user_id=eq.${uid}`;
    const [students, exams, scores, targets] = await Promise.all([
      this.call('/rest/v1/students' + q),
      this.call('/rest/v1/exams' + q),
      this.call('/rest/v1/scores' + q),
      this.call('/rest/v1/targets' + q)
    ]);
    if (!students.length) throw new Error('云端没有数据');
    DB.data.students = students.map(s => ({
      id: s.id, name: s.name, nickname: s.nickname, grade: s.grade, enrollYear: s.enroll_year,
      school: s.school, className: s.class_name, status: s.status
    }));
    DB.data.exams = exams.map(e => ({
      id: e.id, studentId: e.student_id, name: e.name, type: e.type, date: e.date, grade: e.grade,
      semester: e.semester, classSize: e.class_size, gradeSize: e.grade_size,
      classRank: e.class_rank, gradeRank: e.grade_rank, classAvg: e.class_avg, gradeAvg: e.grade_avg, note: e.note
    }));
    DB.data.scores = scores.map(s => ({
      id: s.id, examId: s.exam_id, subject: s.subject, raw: s.raw, full: s.full, grade: s.grade,
      aPaper: s.a_paper, aFull: s.a_full, bPaper: s.b_paper, bFull: s.b_full,
      classAvg: s.class_avg, classRank: s.class_rank
    }));
    DB.data.targets = targets.map(t => ({
      id: t.id, studentId: t.student_id, schoolId: t.school_id, schoolName: t.school_name,
      line: t.line, rank: t.rank, adjust: t.adjust, level: t.level, year: t.year
    }));
    if (!DB.data.settings.activeStudent || !DB.data.students.find(s => s.id === DB.data.settings.activeStudent)) {
      DB.data.settings.activeStudent = DB.data.students[0]?.id || null;
    }
    DB.data.settings.lastSync = new Date().toISOString();
    DB.save();
  },

  schedulePush() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.session || this.busy) return;
      this.pushAll().catch(e => console.warn('自动同步失败', e.message));
    }, 4000);
  }
};
