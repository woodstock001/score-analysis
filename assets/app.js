/* 成绩分析 · 启动与事件 */

DB.load();
Cloud.restoreSession();

// 若本地有登录态但配置丢失，提示重新填 URL
if (Cloud.session && !Cloud.ready()) {
  setTimeout(() => UI.toast('云配置丢失，请在设置里重新填写'), 600);
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const act = el.dataset.act;

  switch (act) {
    case 'tab':
      UI.entryId = null;
      UI.setTab(el.dataset.tab);
      break;

    case 'toggleMore': {
      const m = document.getElementById('more_' + el.dataset.code);
      if (m) {
        m.classList.toggle('on');
        el.textContent = m.classList.contains('on') ? '收起 ▴' : '更多 ▾';
      }
      break;
    }

    case 'saveExam':
      UI.saveExam();
      break;

    case 'editExam':
      UI.entryId = el.dataset.id;
      UI.tab = 'entry';
      UI.render();
      window.scrollTo(0, 0);
      break;

    case 'cancelEdit':
      UI.entryId = null;
      UI.tab = 'analysis';
      UI.render();
      break;

    case 'deleteExam':
      if (confirm('删除这次考试？该次所有科目成绩会一起删除。')) {
        DB.removeExam(el.dataset.id);
        UI.entryId = null;
        UI.tab = 'home';
        UI.render();
        UI.toast('已删除');
      }
      break;

    case 'addTarget': {
      const s = SCHOOL_MAP[el.dataset.id];
      if (!s) break;
      const stu = DB.activeStudent();
      const label = s.name + (s.campus ? '（' + s.campus + '）' : '');
      DB.addTarget({
        studentId: stu.id, schoolId: s.id, schoolName: label,
        line: s.line, rank: s.rank, adjust: s.adjust, level: s.level, year: s.year
      });
      UI.searchQ = '';
      UI.render();
      UI.toast('已添加 ' + label);
      break;
    }

    case 'removeTarget':
      DB.removeTarget(el.dataset.id);
      UI.render();
      break;

    case 'customTarget': {
      const name = prompt('学校名称');
      if (!name) break;
      const line = prompt('2026 年录取线（或参考线）', '');
      if (line == null) break;
      const rank = prompt('录取位次（不知道可留空）', '');
      DB.addTarget({
        studentId: DB.activeStudent().id, schoolName: name.trim(),
        line: Number(line) || null, rank: rank ? Number(rank) : null, level: 'C', year: 2026
      });
      UI.render();
      UI.toast('已添加自定义目标');
      break;
    }

    case 'addStudent': {
      const name = prompt('学生小名');
      if (!name) break;
      const g = prompt('年级（7 = 初一，8 = 初二，9 = 初三，4 = 四年级）', '7');
      if (g == null) break;
      const grade = Number(g) || 7;
      const s = DB.addStudent({ name: name.trim(), nickname: name.trim(), grade, status: grade >= 7 && grade <= 9 ? 'active' : 'reserved' });
      if (!DB.data.students.some(x => x.status === 'active' && x.id !== s.id)) {
        DB.data.settings.activeStudent = s.id;
      }
      DB.save();
      UI.render();
      UI.toast('已添加');
      break;
    }

    case 'editStudent': {
      const s = DB.student(el.dataset.id);
      if (!s) break;
      const g = prompt(`${s.nickname} 现在是 ${s.grade} 年级，改成几年级？\n7/8/9 = 初中，4-6 = 小学（预留）`, String(s.grade));
      if (g == null) break;
      const grade = Number(g);
      if (!grade || grade < 1 || grade > 12) return UI.toast('年级不对');
      DB.updateStudent(s.id, { grade, status: grade >= 7 && grade <= 9 ? 'active' : 'reserved' });
      UI.examId = null;
      UI.render();
      UI.toast('已改成 ' + grade + ' 年级');
      break;
    }

    case 'setActive':
      DB.data.settings.activeStudent = el.dataset.id;
      DB.save();
      UI.examId = null;
      UI.tab = 'home';
      UI.render();
      break;

    case 'saveSb':
      DB.data.settings.url = document.getElementById('sbUrl').value.trim();
      DB.data.settings.anonKey = document.getElementById('sbKey').value.trim();
      DB.save();
      UI.toast('配置已保存');
      break;

    case 'cloudSignup': {
      try {
        DB.data.settings.url = document.getElementById('sbUrl').value.trim();
        DB.data.settings.anonKey = document.getElementById('sbKey').value.trim();
        DB.save();
        if (!Cloud.ready()) return UI.toast('先填 Project URL 和 anon key');
        const email = document.getElementById('sbEmail').value.trim();
        const pass = document.getElementById('sbPass').value;
        if (!email || pass.length < 6) return UI.toast('邮箱要有效，密码至少 6 位');
        el.disabled = true;
        await Cloud.signUp(email, pass);
        await Cloud.signIn(email, pass);
        UI.render();
        UI.toast('注册并登录成功');
      } catch (err) {
        alert('注册失败：' + err.message + '\n\n如果是邮箱确认开启，先去 Supabase 后台关闭 Confirm email，或点邮件里的确认链接。');
      } finally { el.disabled = false; }
      break;
    }

    case 'cloudLogin': {
      try {
        DB.data.settings.url = document.getElementById('sbUrl').value.trim();
        DB.data.settings.anonKey = document.getElementById('sbKey').value.trim();
        DB.save();
        if (!Cloud.ready()) return UI.toast('先填 Project URL 和 anon key');
        const email = document.getElementById('sbEmail').value.trim();
        const pass = document.getElementById('sbPass').value;
        el.disabled = true;
        await Cloud.signIn(email, pass);
        UI.render();
        UI.toast('登录成功');
      } catch (err) {
        alert('登录失败：' + err.message);
      } finally { el.disabled = false; }
      break;
    }

    case 'cloudLogout':
      Cloud.signOut();
      UI.render();
      break;

    case 'cloudPush': {
      try {
        el.disabled = true;
        el.textContent = '上传中…';
        await Cloud.pushAll();
        UI.render();
        UI.toast('已上传到云端');
      } catch (err) {
        alert('上传失败：' + err.message + '\n\n检查：1) 表是否已建 2) RLS 策略是否允许 3) 网络是否能访问 supabase.co');
      } finally { el.disabled = false; }
      break;
    }

    case 'cloudPull': {
      if (!confirm('从云端恢复会覆盖本机现有数据，继续？')) break;
      try {
        el.disabled = true;
        el.textContent = '拉取中…';
        await Cloud.pullAll();
        UI.render();
        UI.toast('已从云端恢复');
      } catch (err) {
        alert('恢复失败：' + err.message);
      } finally { el.disabled = false; }
      break;
    }

    case 'exportJson': {
      const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
      download(blob, `成绩分析备份_${new Date().toISOString().slice(0, 10)}.json`);
      break;
    }

    case 'exportCsv': {
      const stu = DB.activeStudent();
      const blob = new Blob([DB.exportCSV(stu.id)], { type: 'text/csv;charset=utf-8' });
      download(blob, `成绩明细_${stu.nickname}_${new Date().toISOString().slice(0, 10)}.csv`);
      break;
    }

    case 'importJson': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const f = input.files[0];
        if (!f) return;
        if (!confirm('导入会覆盖当前全部数据，继续？')) return;
        try {
          DB.importJSON(await f.text());
          UI.render();
          UI.toast('导入成功');
        } catch (err) {
          alert('导入失败：' + err.message);
        }
      };
      input.click();
      break;
    }

    case 'clearAll': {
      if (!confirm('清空全部数据？此操作不可恢复，建议先导出 JSON。')) break;
      if (!confirm('再确认一次：所有学生、考试、成绩、目标都会被删除。')) break;
      localStorage.removeItem('cjfx_v1');
      DB.load();
      UI.tab = 'home';
      UI.examId = null;
      UI.render();
      UI.toast('已清空');
      break;
    }
  }
});

// select / checkbox / 输入
document.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'switchStudent') {
    DB.data.settings.activeStudent = el.value;
    DB.save();
    UI.examId = null;
    UI.render();
  } else if (act === 'selectExam') {
    UI.examId = el.value;
    UI.render();
  } else if (act === 'gradeChange') {
    rebuildSubjects(el.value);
  } else if (act === 'autoSync') {
    DB.data.settings.autoSync = el.checked;
    DB.save();
    if (el.checked) UI.toast('已开启自动同步');
  } else if (act === 'cmpA') {
    UI.cmpA = el.value;
    UI.render();
  } else if (act === 'cmpB') {
    UI.cmpB = el.value;
    UI.render();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'schoolSearch') {
    UI.searchQ = e.target.value;
    const list = document.getElementById('searchList');
    if (list) list.innerHTML = UI.renderSearch();
  }
});

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function rebuildSubjects(grade) {
  const old = {};
  document.querySelectorAll('#subjArea .subj-row').forEach(row => {
    const c = row.dataset.subject;
    old[c] = {
      raw: document.getElementById('sc_' + c)?.value ?? '',
      full: document.getElementById('sf_' + c)?.value ?? '',
      aPaper: document.getElementById('sa_' + c)?.value ?? '',
      aFull: document.getElementById('saf_' + c)?.value ?? '',
      bPaper: document.getElementById('sb_' + c)?.value ?? '',
      bFull: document.getElementById('sbf_' + c)?.value ?? '',
      classAvg: document.getElementById('savg_' + c)?.value ?? '',
      classRank: document.getElementById('srank_' + c)?.value ?? ''
    };
  });
  const lastFull = DB.data.settings.lastFull || {};
  const area = document.getElementById('subjArea');
  if (!area) return;
  area.innerHTML = subjectsOfGrade(Number(grade))
    .map(s => UI.subjectRow(s, old[s.code] || {}, lastFull))
    .join('');
}

UI.render();
