// === 本地存储 Key ===
const STATE_KEY = 'weight_app_state_v2';
const LEGACY_RECORDS_KEY = 'weight_records_v1';
const LEGACY_GOAL_KEY = 'weight_goal_v1';

// === DOM 引用 ===
const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const noteInput = document.getElementById('note');
const recordForm = document.getElementById('recordForm');
const motivationText = document.getElementById('motivationText');

const currentWeightEl = document.getElementById('currentWeight');
const weightChangeEl = document.getElementById('weightChange');
const totalChangeEl = document.getElementById('totalChange');
const startWeightEl = document.getElementById('startWeight');
const recentAvgEl = document.getElementById('recentAvg');
const trendTextEl = document.getElementById('trendText');
const goalProgressEl = document.getElementById('goalProgress');
const goalEstimateEl = document.getElementById('goalEstimate');
const bmiValueEl = document.getElementById('bmiValue');
const bmiStatusEl = document.getElementById('bmiStatus');

const recordsBody = document.getElementById('recordsBody');
const clearAllBtn = document.getElementById('clearAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const selectAllCheckbox = document.getElementById('selectAll');

const goalInput = document.getElementById('goalWeight');
const heightInput = document.getElementById('heightInput');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const saveHeightBtn = document.getElementById('saveHeightBtn');

const chartCanvas = document.getElementById('weightChart');
const rangeButtons = document.querySelectorAll('.range-btn');

const userSelect = document.getElementById('userSelect');
const addUserBtn = document.getElementById('addUserBtn');

// === 状态 ===
let state = {
  users: [],
  currentUserId: null,
};
let currentRange = '7';

// === 工具函数 ===
function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDelta(delta) {
  if (delta == null || Number.isNaN(delta)) return '--';
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0) return `+${abs} kg`;
  if (delta < 0) return `-${abs} kg`;
  return '0.0 kg';
}

// 线性回归估计趋势（简单实现）
function estimateTrend(values) {
  if (values.length < 3) return null;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  return slope;
}

// === 本地存储 ===
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function migrateFromV1() {
  const legacyRecordsRaw = localStorage.getItem(LEGACY_RECORDS_KEY);
  const legacyGoalRaw = localStorage.getItem(LEGACY_GOAL_KEY);
  let records = [];
  let goal = null;

  if (legacyRecordsRaw) {
    try {
      const parsed = JSON.parse(legacyRecordsRaw);
      if (Array.isArray(parsed)) {
        records = parsed
          .filter(
            (r) =>
              r &&
              typeof r.date === 'string' &&
              typeof r.weight === 'number' &&
              !Number.isNaN(r.weight)
          )
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      }
    } catch (e) {
      console.warn('迁移旧版记录失败：', e);
    }
  }

  if (legacyGoalRaw) {
    const g = Number(legacyGoalRaw);
    goal = Number.isFinite(g) ? g : null;
  }

  if (!records.length && goal == null) return null;

  const defaultUser = {
    id: `u-${Date.now()}`,
    name: '默认用户',
    height: null,
    goalWeight: goal,
    records,
  };

  return {
    users: [defaultUser],
    currentUserId: defaultUser.id,
  };
}

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        return parsed;
      }
    } catch (e) {
      console.warn('解析状态失败，尝试迁移旧数据：', e);
    }
  }
  const migrated = migrateFromV1();
  if (migrated) return migrated;

  const defaultUser = {
    id: `u-${Date.now()}`,
    name: '默认用户',
    height: null,
    goalWeight: null,
    records: [],
  };
  return { users: [defaultUser], currentUserId: defaultUser.id };
}

function getCurrentUser() {
  return state.users.find((u) => u.id === state.currentUserId) || null;
}

function ensureCurrentUser() {
  if (!state.users.length) {
    const defaultUser = {
      id: `u-${Date.now()}`,
      name: '默认用户',
      height: null,
      goalWeight: null,
      records: [],
    };
    state.users.push(defaultUser);
    state.currentUserId = defaultUser.id;
  } else if (!getCurrentUser()) {
    state.currentUserId = state.users[0].id;
  }
}

// === 渲染 ===
function renderUserSelector() {
  userSelect.innerHTML = '';
  state.users.forEach((u) => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = u.name;
    if (u.id === state.currentUserId) option.selected = true;
    userSelect.appendChild(option);
  });
}

function renderStats() {
  const user = getCurrentUser();
  if (!user || !user.records.length) {
    currentWeightEl.textContent = '--';
    weightChangeEl.textContent = '较昨日：--';
    totalChangeEl.textContent = '--';
    startWeightEl.textContent = '起始体重：--';
    recentAvgEl.textContent = '均值：--';
    trendTextEl.textContent = '趋势：--';
    goalProgressEl.textContent = '--';
    goalEstimateEl.textContent = '预估达成时间：--';
    bmiValueEl.textContent = '--';
    bmiStatusEl.textContent = '需要身高与最新体重';
    return;
  }

  const sorted = [...user.records].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const first = sorted[0];

  currentWeightEl.textContent = `${latest.weight.toFixed(1)} kg`;

  if (prev) {
    const delta = latest.weight - prev.weight;
    weightChangeEl.textContent = `较昨日：${formatDelta(delta)}`;
  } else {
    weightChangeEl.textContent = '较昨日：--';
  }

  const totalDelta = latest.weight - first.weight;
  totalChangeEl.textContent = formatDelta(totalDelta);
  startWeightEl.textContent = `起始体重：${first.weight.toFixed(1)} kg`;

  const last7 = sorted.slice(-7);
  const avg7 =
    last7.reduce((sum, r) => sum + r.weight, 0) / (last7.length || 1);
  recentAvgEl.textContent = `均值：${avg7.toFixed(1)} kg`;

  const slope = estimateTrend(last7.map((r) => r.weight));
  if (slope == null) {
    trendTextEl.textContent = '趋势：数据较少';
  } else if (slope < -0.05) {
    trendTextEl.textContent = '趋势：明显下降 👍';
  } else if (slope < 0) {
    trendTextEl.textContent = '趋势：缓慢下降 💪';
  } else if (slope < 0.05) {
    trendTextEl.textContent = '趋势：基本持平 🙂';
  } else {
    trendTextEl.textContent = '趋势：略有上升，注意调整 ⚠️';
  }

  // BMI
  if (user.height && Number.isFinite(user.height) && user.height > 0) {
    const hM = user.height / 100;
    const bmi = latest.weight / (hM * hM);
    bmiValueEl.textContent = bmi.toFixed(1);
    let status = 'BMI 状态：';
    if (bmi < 18.5) status += '偏瘦';
    else if (bmi < 24) status += '正常';
    else if (bmi < 28) status += '超重';
    else status += '肥胖';
    bmiStatusEl.textContent = status;
  } else {
    bmiValueEl.textContent = '--';
    bmiStatusEl.textContent = '需要身高与最新体重';
  }

  // 目标进度与预估
  if (user.goalWeight == null || !Number.isFinite(user.goalWeight)) {
    goalProgressEl.textContent = '尚未设置目标';
    goalEstimateEl.textContent = '预估达成时间：--';
  } else {
    const diff = latest.weight - user.goalWeight;
    if (diff <= 0) {
      goalProgressEl.textContent = '已达到或低于目标 🎉';
      goalEstimateEl.textContent = '预估达成时间：已完成';
    } else {
      const startingDiff = first.weight - user.goalWeight;
      const finished = startingDiff > 0 ? startingDiff - diff : 0;
      const percent =
        startingDiff > 0 ? Math.min(100, (finished / startingDiff) * 100) : 0;
      goalProgressEl.textContent = `还差 ${diff.toFixed(1)} kg（约 ${
        startingDiff > 0 ? percent.toFixed(0) : 0
      }% 完成）`;

      if (last7.length >= 2) {
        const first7 = last7[0].weight;
        const last7w = last7[last7.length - 1].weight;
        const totalChange7 = first7 - last7w;
        const dailyLoss = totalChange7 / (last7.length - 1);
        if (dailyLoss > 0.01) {
          const daysNeeded = diff / dailyLoss;
          const estDate = new Date();
          estDate.setDate(estDate.getDate() + Math.round(daysNeeded));
          const y = estDate.getFullYear();
          const m = String(estDate.getMonth() + 1).padStart(2, '0');
          const d = String(estDate.getDate()).padStart(2, '0');
          goalEstimateEl.textContent = `预估达成时间：${y}-${m}-${d}`;
        } else {
          goalEstimateEl.textContent = '预估达成时间：趋势暂不明显';
        }
      } else {
        goalEstimateEl.textContent = '预估达成时间：数据较少';
      }
    }
  }
}

function renderTable() {
  const user = getCurrentUser();
  recordsBody.innerHTML = '';
  selectAllCheckbox.checked = false;

  if (!user || !user.records.length) return;

  const sorted = [...user.records].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  for (let i = 0; i < sorted.length; i += 1) {
    const row = document.createElement('tr');
    const record = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const delta = prev ? record.weight - prev.weight : null;

    const checkTd = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'record-check';
    check.dataset.date = record.date;
    checkTd.appendChild(check);

    const dateTd = document.createElement('td');
    dateTd.textContent = record.date;

    const weightTd = document.createElement('td');
    weightTd.textContent = record.weight.toFixed(1);

    const deltaTd = document.createElement('td');
    if (prev) {
      const deltaText = formatDelta(delta);
      deltaTd.textContent = deltaText;
      if (delta > 0) {
        deltaTd.classList.add('change-positive');
      } else if (delta < 0) {
        deltaTd.classList.add('change-negative');
      } else {
        deltaTd.classList.add('change-neutral');
      }
    } else {
      deltaTd.textContent = '--';
      deltaTd.classList.add('change-neutral');
    }

    const noteTd = document.createElement('td');
    noteTd.textContent = record.note || '';

    row.appendChild(checkTd);
    row.appendChild(dateTd);
    row.appendChild(weightTd);
    row.appendChild(deltaTd);
    row.appendChild(noteTd);
    recordsBody.appendChild(row);
  }
}

function renderMotivation() {
  const user = getCurrentUser();
  if (!user || !user.records.length) {
    motivationText.textContent = '';
    return;
  }

  const sorted = [...user.records].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  let text = '';

  if (!prev) {
    text =
      '已经迈出第一步，后面每一次坚持记录，都会成为你改变的证据。加油！';
  } else {
    const delta = latest.weight - prev.weight;
    const minWeight = Math.min(...sorted.map((r) => r.weight));
    const isNewLow = latest.weight <= minWeight + 1e-6;

    if (delta < -0.05) {
      text = `今天比昨天轻了 ${(-delta).toFixed(
        1
      )} kg，变化非常棒！保持这样的节奏，你离目标会越来越近。`;
    } else if (delta > 0.05) {
      text = `今天比昨天重了 ${delta.toFixed(
        1
      )} kg，很可能是水分和作息的波动，不必焦虑，关键是继续记录和调整。`;
    } else {
      text =
        '体重基本持平，这本身也是一种稳定的自律表现，坚持下去，曲线就会慢慢向下走。';
    }

    if (isNewLow) {
      text += ' 另外，今天是你的新低点，恭喜突破自己！🎉';
    }

    if (user.goalWeight != null && latest.weight <= user.goalWeight + 1e-6) {
      text =
        '你已经到达或低于设定的目标体重，这是非常了不起的成就！接下来可以把目标从“减肥”升级为“健康和塑形”啦。';
    }
  }

  motivationText.textContent = text;
}

function renderChart() {
  const user = getCurrentUser();
  if (!chartCanvas || !chartCanvas.getContext) return;
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;

  ctx.clearRect(0, 0, width, height);

  if (!user || !user.records.length) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据，先记录一次体重吧。', width / 2, height / 2);
    return;
  }

  const sorted = [...user.records].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  let dataToShow;
  if (currentRange === '7') {
    dataToShow = sorted.slice(-7);
  } else if (currentRange === '30') {
    dataToShow = sorted.slice(-30);
  } else {
    dataToShow = sorted;
  }

  const weights = dataToShow.map((r) => r.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const padding = 30;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // 背景网格
  ctx.strokeStyle = 'rgba(148,163,184,0.3)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + (innerHeight * i) / 4;
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + innerWidth, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // y 轴文字
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + (innerHeight * i) / 4;
    const val = maxW - ((maxW - minW) * i) / 4;
    ctx.fillText(val.toFixed(1), padding - 4, y + 3);
  }

  if (dataToShow.length === 1 || maxW === minW) {
    const x = padding + innerWidth / 2;
    const y = padding + innerHeight / 2;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  function mapPoint(record, index) {
    const t = dataToShow.length === 1 ? 0.5 : index / (dataToShow.length - 1);
    const x = padding + innerWidth * t;
    const ratio = (record.weight - minW) / (maxW - minW || 1);
    const y = padding + innerHeight * (1 - ratio);
    return { x, y };
  }

  // 折线
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.9)';
  ctx.beginPath();
  dataToShow.forEach((r, i) => {
    const { x, y } = mapPoint(r, i);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 填充区域
  const gradient = ctx.createLinearGradient(0, padding, 0, height);
  gradient.addColorStop(0, 'rgba(129, 140, 248, 0.28)');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.2)');

  ctx.lineTo(padding + innerWidth, padding + innerHeight + 10);
  ctx.lineTo(padding, padding + innerHeight + 10);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 数据点
  ctx.fillStyle = '#22c55e';
  dataToShow.forEach((r, i) => {
    const { x, y } = mapPoint(r, i);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderAll() {
  renderUserSelector();
  renderStats();
  renderTable();
  renderMotivation();
  renderChart();
}

// === 事件 ===
recordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const date = dateInput.value;
  const weight = Number(weightInput.value);
  const note = noteInput.value.trim();

  if (!date || !Number.isFinite(weight)) {
    alert('请填写完整日期和体重。');
    return;
  }

  const idx = user.records.findIndex((r) => r.date === date);
  const newRecord = { date, weight, note };
  if (idx >= 0) {
    user.records[idx] = newRecord;
  } else {
    user.records.push(newRecord);
  }

  user.records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  saveState();
  renderAll();

  noteInput.value = '';
});

clearAllBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.records.length) return;
  if (!confirm('确定要清空当前用户的全部打卡数据吗？此操作不可恢复。')) return;
  user.records = [];
  saveState();
  renderAll();
});

deleteSelectedBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.records.length) return;
  const checked = Array.from(
    recordsBody.querySelectorAll('.record-check:checked')
  );
  if (!checked.length) {
    alert('请先选择要删除的记录。');
    return;
  }
  if (!confirm(`确认删除所选的 ${checked.length} 条记录吗？`)) return;
  const datesToDelete = new Set(checked.map((c) => c.dataset.date));
  user.records = user.records.filter((r) => !datesToDelete.has(r.date));
  saveState();
  renderAll();
});

selectAllCheckbox.addEventListener('change', () => {
  const checked = selectAllCheckbox.checked;
  recordsBody.querySelectorAll('.record-check').forEach((c) => {
    c.checked = checked;
  });
});

saveGoalBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;
  const val = Number(goalInput.value);
  if (!Number.isFinite(val) || val <= 0) {
    alert('请输入合理的目标体重。');
    return;
  }
  user.goalWeight = val;
  saveState();
  renderAll();
});

saveHeightBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;
  const val = Number(heightInput.value);
  if (!Number.isFinite(val) || val < 80 || val > 250) {
    alert('请输入合理的身高（80~250 cm）。');
    return;
  }
  user.height = val;
  saveState();
  renderAll();
});

rangeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    rangeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.dataset.range || '7';
    renderChart();
  });
});

userSelect.addEventListener('change', () => {
  const id = userSelect.value;
  state.currentUserId = id;
  ensureCurrentUser();
  renderAll();
  const current = getCurrentUser();
  if (current) {
    goalInput.value = current.goalWeight ?? '';
    heightInput.value = current.height ?? '';
  }
});

addUserBtn.addEventListener('click', () => {
  const name = prompt('请输入新用户名称（例如：Alice）：', '');
  if (!name) return;
  const heightStr = prompt('请输入身高(cm，可留空)：', '');
  const height = heightStr ? Number(heightStr) : null;
  const id = `u-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const newUser = {
    id,
    name: name.trim() || '新用户',
    height: Number.isFinite(height) ? height : null,
    goalWeight: null,
    records: [],
  };
  state.users.push(newUser);
  state.currentUserId = id;
  saveState();
  goalInput.value = '';
  heightInput.value = newUser.height ?? '';
  renderAll();
});

// === 初始化 ===
function init() {
  dateInput.value = todayISO();
  state = loadState();
  ensureCurrentUser();

  const current = getCurrentUser();
  if (current) {
    goalInput.value = current.goalWeight ?? '';
    heightInput.value = current.height ?? '';
  }

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
