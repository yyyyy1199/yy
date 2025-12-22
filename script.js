// === 本地存储 Key ===
const STATE_KEY = 'life_record_app_v3';
const LEGACY_STATE_KEY = 'weight_app_state_v2';
const LEGACY_RECORDS_KEY = 'weight_records_v1';
const LEGACY_GOAL_KEY = 'weight_goal_v1';

// === DOM 引用 - 标签页 ===
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// === DOM 引用 - 体重记录 ===
const weightDateInput = document.getElementById('weightDate');
const weightInput = document.getElementById('weight');
const weightNoteInput = document.getElementById('weightNote');
const weightForm = document.getElementById('weightForm');
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

const weightRecordsBody = document.getElementById('weightRecordsBody');
const clearWeightBtn = document.getElementById('clearWeightBtn');
const deleteSelectedWeightBtn = document.getElementById('deleteSelectedWeightBtn');
const selectAllWeightCheckbox = document.getElementById('selectAllWeight');

const goalInput = document.getElementById('goalWeight');
const heightInput = document.getElementById('heightInput');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const saveHeightBtn = document.getElementById('saveHeightBtn');

const chartCanvas = document.getElementById('weightChart');
const rangeButtons = document.querySelectorAll('.range-btn');

// === DOM 引用 - 餐饮记录 ===
const mealDateInput = document.getElementById('mealDate');
const mealTimeInput = document.getElementById('mealTime');
const mealContentInput = document.getElementById('mealContent');
const mealCaloriesInput = document.getElementById('mealCalories');
const mealNoteInput = document.getElementById('mealNote');
const mealForm = document.getElementById('mealForm');

const mealRecordsBody = document.getElementById('mealRecordsBody');
const clearMealBtn = document.getElementById('clearMealBtn');
const deleteSelectedMealBtn = document.getElementById('deleteSelectedMealBtn');
const selectAllMealCheckbox = document.getElementById('selectAllMeal');

// === DOM 引用 - 开支记录 ===
const expenseDateInput = document.getElementById('expenseDate');
const expenseCategoryInput = document.getElementById('expenseCategory');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseDescriptionInput = document.getElementById('expenseDescription');
const expenseForm = document.getElementById('expenseForm');

const expenseRecordsBody = document.getElementById('expenseRecordsBody');
const clearExpenseBtn = document.getElementById('clearExpenseBtn');
const deleteSelectedExpenseBtn = document.getElementById('deleteSelectedExpenseBtn');
const selectAllExpenseCheckbox = document.getElementById('selectAllExpense');

const todayExpenseEl = document.getElementById('todayExpense');
const todayExpenseCountEl = document.getElementById('todayExpenseCount');
const monthExpenseEl = document.getElementById('monthExpense');
const monthExpenseCountEl = document.getElementById('monthExpenseCount');
const avgDailyExpenseEl = document.getElementById('avgDailyExpense');
const expenseDaysEl = document.getElementById('expenseDays');

// === DOM 引用 - 数据分析 ===
const weightAnalyticsEl = document.getElementById('weightAnalytics');
const mealAnalyticsEl = document.getElementById('mealAnalytics');
const expenseAnalyticsEl = document.getElementById('expenseAnalytics');
const expenseChartCanvas = document.getElementById('expenseChart');

// === DOM 引用 - 用户管理 ===
const userSelect = document.getElementById('userSelect');
const addUserBtn = document.getElementById('addUserBtn');

// === 状态 ===
let state = {
  users: [],
  currentUserId: null,
};
let currentRange = '7';
let currentTab = 'weight';

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
          .map((r) => {
            // 为旧记录添加ID和时间戳
            const id = r.id || `r-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
            const timestamp = r.timestamp || Date.now() - Math.random() * 86400000; // 随机时间戳避免冲突
            const timeStr = r.time || new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            return { ...r, id, timestamp, time: timeStr };
          })
          .sort((a, b) => {
            if (a.date !== b.date) {
              return a.date < b.date ? -1 : 1;
            }
            return (a.timestamp || 0) - (b.timestamp || 0);
          });
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
    weightRecords: records,
    mealRecords: [],
    expenseRecords: [],
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
    weightRecords: [],
    mealRecords: [],
    expenseRecords: [],
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
      weightRecords: [],
      mealRecords: [],
      expenseRecords: [],
    };
    state.users.push(defaultUser);
    state.currentUserId = defaultUser.id;
  } else if (!getCurrentUser()) {
    state.currentUserId = state.users[0].id;
  }
  // 迁移旧数据结构
  state.users.forEach((user) => {
    if (user.records && !user.weightRecords) {
      user.weightRecords = user.records || [];
      user.mealRecords = user.mealRecords || [];
      user.expenseRecords = user.expenseRecords || [];
      delete user.records;
    }
  });
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
  if (!user || !user.weightRecords || !user.weightRecords.length) {
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

  // 按日期和时间戳排序
  const sorted = [...user.records].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  const latest = sorted[sorted.length - 1];
  // 找到前一个不同日期的记录（用于计算"较昨日"）
  let prev = null;
  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    if (sorted[i].date !== latest.date) {
      prev = sorted[i];
      break;
    }
  }
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

  // 最近7天：按日期去重，每天取最后一条记录
  const dateMap = new Map();
  sorted.forEach((r) => {
    if (!dateMap.has(r.date) || (dateMap.get(r.date).timestamp || 0) < (r.timestamp || 0)) {
      dateMap.set(r.date, r);
    }
  });
  const uniqueDates = Array.from(dateMap.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
  const last7 = uniqueDates.slice(-7);
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

function renderWeightTable() {
  const user = getCurrentUser();
  weightRecordsBody.innerHTML = '';
  selectAllWeightCheckbox.checked = false;

  if (!user || !user.weightRecords || !user.weightRecords.length) return;

  // 按日期和时间戳排序
  const sorted = [...user.weightRecords].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  for (let i = 0; i < sorted.length; i += 1) {
    const row = document.createElement('tr');
    const record = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const delta = prev ? record.weight - prev.weight : null;

    const checkTd = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'record-check';
    // 确保recordId与删除逻辑一致
    const recordId = record.id || `r-${record.date}-${record.timestamp || i}`;
    check.dataset.recordId = recordId;
    checkTd.appendChild(check);

    const dateTd = document.createElement('td');
    dateTd.textContent = record.date;

    const timeTd = document.createElement('td');
    timeTd.textContent = record.time || '--';

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
    row.appendChild(timeTd);
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

  // 按日期和时间戳排序
  const sorted = [...user.records].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  const latest = sorted[sorted.length - 1];
  // 找到前一个不同日期的记录
  let prev = null;
  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    if (sorted[i].date !== latest.date) {
      prev = sorted[i];
      break;
    }
  }

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

function renderWeightChart() {
  const user = getCurrentUser();
  if (!chartCanvas || !chartCanvas.getContext) return;
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;

  ctx.clearRect(0, 0, width, height);

  if (!user || !user.weightRecords || !user.weightRecords.length) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据，先记录一次体重吧。', width / 2, height / 2);
    return;
  }

  // 按日期和时间戳排序
  const sorted = [...user.weightRecords].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  // 图表显示：按日期去重，每天取最后一条记录（或平均值）
  const dateMap = new Map();
  sorted.forEach((r) => {
    if (!dateMap.has(r.date)) {
      dateMap.set(r.date, []);
    }
    dateMap.get(r.date).push(r);
  });
  // 每天取最后一条记录
  const dailyRecords = Array.from(dateMap.entries())
    .map(([date, dayRecords]) => {
      const sortedDay = dayRecords.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      return sortedDay[sortedDay.length - 1];
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let dataToShow;
  if (currentRange === '7') {
    dataToShow = dailyRecords.slice(-7);
  } else if (currentRange === '30') {
    dataToShow = dailyRecords.slice(-30);
  } else {
    dataToShow = dailyRecords;
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
  if (currentTab === 'weight') {
    renderStats();
    renderWeightTable();
    renderMotivation();
    renderWeightChart();
  } else if (currentTab === 'meal') {
    renderMealTable();
  } else if (currentTab === 'expense') {
    renderExpenseStats();
    renderExpenseTable();
  } else if (currentTab === 'analytics') {
    renderAnalytics();
  }
}

// === 餐饮记录渲染 ===
function renderMealTable() {
  const user = getCurrentUser();
  mealRecordsBody.innerHTML = '';
  selectAllMealCheckbox.checked = false;

  if (!user || !user.mealRecords || !user.mealRecords.length) return;

  const sorted = [...user.mealRecords].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  sorted.forEach((record) => {
    const row = document.createElement('tr');
    const checkTd = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'record-check';
    check.dataset.recordId = record.id || `m-${record.date}-${record.timestamp || 0}`;
    checkTd.appendChild(check);

    row.appendChild(checkTd);
    row.appendChild(createTd(record.date));
    row.appendChild(createTd(record.time || '--'));
    row.appendChild(createTd(record.mealTime || '--'));
    row.appendChild(createTd(record.content || '--'));
    row.appendChild(createTd(record.calories ? `${record.calories} kcal` : '--'));
    row.appendChild(createTd(record.note || ''));
    mealRecordsBody.appendChild(row);
  });
}

// === 开支记录渲染 ===
function renderExpenseStats() {
  const user = getCurrentUser();
  if (!user || !user.expenseRecords || !user.expenseRecords.length) {
    todayExpenseEl.textContent = '--';
    todayExpenseCountEl.textContent = '记录数：0';
    monthExpenseEl.textContent = '--';
    monthExpenseCountEl.textContent = '记录数：0';
    avgDailyExpenseEl.textContent = '--';
    expenseDaysEl.textContent = '有记录天数：0';
    return;
  }

  const today = todayISO();
  const todayRecords = user.expenseRecords.filter((r) => r.date === today);
  const todayTotal = todayRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  todayExpenseEl.textContent = `¥${todayTotal.toFixed(2)}`;
  todayExpenseCountEl.textContent = `记录数：${todayRecords.length}`;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthRecords = user.expenseRecords.filter((r) => r.date >= monthStart);
  const monthTotal = monthRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  monthExpenseEl.textContent = `¥${monthTotal.toFixed(2)}`;
  monthExpenseCountEl.textContent = `记录数：${monthRecords.length}`;

  const dateSet = new Set(user.expenseRecords.map((r) => r.date));
  const days = dateSet.size;
  const total = user.expenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const avg = days > 0 ? total / days : 0;
  avgDailyExpenseEl.textContent = `¥${avg.toFixed(2)}`;
  expenseDaysEl.textContent = `有记录天数：${days}`;
}

function renderExpenseTable() {
  const user = getCurrentUser();
  expenseRecordsBody.innerHTML = '';
  selectAllExpenseCheckbox.checked = false;

  if (!user || !user.expenseRecords || !user.expenseRecords.length) return;

  const sorted = [...user.expenseRecords].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  sorted.forEach((record) => {
    const row = document.createElement('tr');
    const checkTd = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'record-check';
    check.dataset.recordId = record.id || `e-${record.date}-${record.timestamp || 0}`;
    checkTd.appendChild(check);

    row.appendChild(checkTd);
    row.appendChild(createTd(record.date));
    row.appendChild(createTd(record.time || '--'));
    row.appendChild(createTd(record.category || '--'));
    row.appendChild(createTd(record.amount ? `¥${record.amount.toFixed(2)}` : '--'));
    row.appendChild(createTd(record.description || ''));
    expenseRecordsBody.appendChild(row);
  });
}

function createTd(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

// === 数据分析渲染 ===
function renderAnalytics() {
  const user = getCurrentUser();
  if (!user) return;

  // 体重分析
  let weightHtml = '';
  if (user.weightRecords && user.weightRecords.length) {
    const sorted = [...user.weightRecords].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
    const latest = sorted[sorted.length - 1];
    const first = sorted[0];
    const totalChange = latest.weight - first.weight;
    const avg = sorted.reduce((sum, r) => sum + r.weight, 0) / sorted.length;
    weightHtml = `
      <div class="analytics-item"><span class="analytics-label">记录总数</span><span class="analytics-value">${sorted.length}</span></div>
      <div class="analytics-item"><span class="analytics-label">起始体重</span><span class="analytics-value">${first.weight.toFixed(1)} kg</span></div>
      <div class="analytics-item"><span class="analytics-label">当前体重</span><span class="analytics-value">${latest.weight.toFixed(1)} kg</span></div>
      <div class="analytics-item"><span class="analytics-label">累计变化</span><span class="analytics-value">${formatDelta(totalChange)}</span></div>
      <div class="analytics-item"><span class="analytics-label">平均体重</span><span class="analytics-value">${avg.toFixed(1)} kg</span></div>
    `;
  } else {
    weightHtml = '<div class="analytics-item"><span class="analytics-label">暂无数据</span></div>';
  }
  weightAnalyticsEl.innerHTML = weightHtml;

  // 餐饮分析
  let mealHtml = '';
  if (user.mealRecords && user.mealRecords.length) {
    const totalCalories = user.mealRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
    const mealTimeCount = {};
    user.mealRecords.forEach((r) => {
      mealTimeCount[r.mealTime] = (mealTimeCount[r.mealTime] || 0) + 1;
    });
    mealHtml = `
      <div class="analytics-item"><span class="analytics-label">记录总数</span><span class="analytics-value">${user.mealRecords.length}</span></div>
      <div class="analytics-item"><span class="analytics-label">总热量</span><span class="analytics-value">${totalCalories} kcal</span></div>
      <div class="analytics-item"><span class="analytics-label">平均热量</span><span class="analytics-value">${totalCalories > 0 ? (totalCalories / user.mealRecords.length).toFixed(0) : 0} kcal</span></div>
    `;
    Object.entries(mealTimeCount).forEach(([time, count]) => {
      mealHtml += `<div class="analytics-item"><span class="analytics-label">${time}</span><span class="analytics-value">${count} 次</span></div>`;
    });
  } else {
    mealHtml = '<div class="analytics-item"><span class="analytics-label">暂无数据</span></div>';
  }
  mealAnalyticsEl.innerHTML = mealHtml;

  // 开支分析
  let expenseHtml = '';
  if (user.expenseRecords && user.expenseRecords.length) {
    const total = user.expenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const categoryTotal = {};
    user.expenseRecords.forEach((r) => {
      categoryTotal[r.category] = (categoryTotal[r.category] || 0) + (r.amount || 0);
    });
    expenseHtml = `
      <div class="analytics-item"><span class="analytics-label">记录总数</span><span class="analytics-value">${user.expenseRecords.length}</span></div>
      <div class="analytics-item"><span class="analytics-label">总支出</span><span class="analytics-value">¥${total.toFixed(2)}</span></div>
      <div class="analytics-item"><span class="analytics-label">平均单笔</span><span class="analytics-value">¥${(total / user.expenseRecords.length).toFixed(2)}</span></div>
    `;
    Object.entries(categoryTotal)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        expenseHtml += `<div class="analytics-item"><span class="analytics-label">${cat}</span><span class="analytics-value">¥${amount.toFixed(2)}</span></div>`;
      });
  } else {
    expenseHtml = '<div class="analytics-item"><span class="analytics-label">暂无数据</span></div>';
  }
  expenseAnalyticsEl.innerHTML = expenseHtml;

  // 开支分类饼图
  renderExpenseChart();
}

function renderExpenseChart() {
  const user = getCurrentUser();
  if (!expenseChartCanvas || !expenseChartCanvas.getContext) return;
  const ctx = expenseChartCanvas.getContext('2d');
  const width = expenseChartCanvas.width;
  const height = expenseChartCanvas.height;

  ctx.clearRect(0, 0, width, height);

  if (!user || !user.expenseRecords || !user.expenseRecords.length) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', width / 2, height / 2);
    return;
  }

  const categoryTotal = {};
  user.expenseRecords.forEach((r) => {
    categoryTotal[r.category] = (categoryTotal[r.category] || 0) + (r.amount || 0);
  });

  const entries = Object.entries(categoryTotal).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (total === 0) return;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;

  const colors = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  let startAngle = -Math.PI / 2;

  entries.forEach(([category, amount], index) => {
    const sliceAngle = (amount / total) * Math.PI * 2;
    const color = colors[index % colors.length];

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // 标签
    const labelAngle = startAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(category, labelX, labelY);

    startAngle += sliceAngle;
  });
}

// === 事件处理 ===
// 标签页切换
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    currentTab = tab;
    renderAll();
  });
});

// 体重记录表单
weightForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const date = weightDateInput.value;
  const weight = Number(weightInput.value);
  const note = weightNoteInput.value.trim();

  if (!date || !Number.isFinite(weight)) {
    alert('请填写完整日期和体重。');
    return;
  }

  const recordId = `w-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const timestamp = Date.now();
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const newRecord = { id: recordId, date, time: timeStr, timestamp, weight, note };
  if (!user.weightRecords) user.weightRecords = [];
  user.weightRecords.push(newRecord);
  user.weightRecords.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  saveState();
  renderAll();
  weightNoteInput.value = '';
});

clearWeightBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.weightRecords || !user.weightRecords.length) return;
  if (!confirm('确定要清空当前用户的全部体重数据吗？此操作不可恢复。')) return;
  user.weightRecords = [];
  saveState();
  renderAll();
});

deleteSelectedWeightBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.weightRecords || !user.weightRecords.length) return;
  const checked = Array.from(weightRecordsBody.querySelectorAll('.record-check:checked'));
  if (!checked.length) {
    alert('请先选择要删除的记录。');
    return;
  }
  if (!confirm(`确认删除所选的 ${checked.length} 条记录吗？`)) return;
  const idsToDelete = new Set(checked.map((c) => c.dataset.recordId));
  user.weightRecords = user.weightRecords.filter((r) => {
    const recordId = r.id || `w-${r.date}-${r.timestamp || 0}`;
    return !idsToDelete.has(recordId);
  });
  saveState();
  renderAll();
});

selectAllWeightCheckbox.addEventListener('change', () => {
  const checked = selectAllWeightCheckbox.checked;
  weightRecordsBody.querySelectorAll('.record-check').forEach((c) => {
    c.checked = checked;
  });
});

// 餐饮记录表单
mealForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const date = mealDateInput.value;
  const mealTime = mealTimeInput.value;
  const content = mealContentInput.value.trim();
  const calories = mealCaloriesInput.value ? Number(mealCaloriesInput.value) : null;
  const note = mealNoteInput.value.trim();

  if (!date || !mealTime || !content) {
    alert('请填写完整日期、餐次和内容。');
    return;
  }

  const recordId = `m-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const timestamp = Date.now();
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const newRecord = { id: recordId, date, time: timeStr, timestamp, mealTime, content, calories, note };
  if (!user.mealRecords) user.mealRecords = [];
  user.mealRecords.push(newRecord);
  user.mealRecords.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  saveState();
  renderAll();
  mealContentInput.value = '';
  mealCaloriesInput.value = '';
  mealNoteInput.value = '';
});

clearMealBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.mealRecords || !user.mealRecords.length) return;
  if (!confirm('确定要清空当前用户的全部餐饮数据吗？此操作不可恢复。')) return;
  user.mealRecords = [];
  saveState();
  renderAll();
});

deleteSelectedMealBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.mealRecords || !user.mealRecords.length) return;
  const checked = Array.from(mealRecordsBody.querySelectorAll('.record-check:checked'));
  if (!checked.length) {
    alert('请先选择要删除的记录。');
    return;
  }
  if (!confirm(`确认删除所选的 ${checked.length} 条记录吗？`)) return;
  const idsToDelete = new Set(checked.map((c) => c.dataset.recordId));
  user.mealRecords = user.mealRecords.filter((r) => {
    const recordId = r.id || `m-${r.date}-${r.timestamp || 0}`;
    return !idsToDelete.has(recordId);
  });
  saveState();
  renderAll();
});

selectAllMealCheckbox.addEventListener('change', () => {
  const checked = selectAllMealCheckbox.checked;
  mealRecordsBody.querySelectorAll('.record-check').forEach((c) => {
    c.checked = checked;
  });
});

// 开支记录表单
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const date = expenseDateInput.value;
  const category = expenseCategoryInput.value;
  const amount = Number(expenseAmountInput.value);
  const description = expenseDescriptionInput.value.trim();

  if (!date || !category || !Number.isFinite(amount) || amount < 0) {
    alert('请填写完整日期、分类和金额。');
    return;
  }

  const recordId = `e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const timestamp = Date.now();
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const newRecord = { id: recordId, date, time: timeStr, timestamp, category, amount, description };
  if (!user.expenseRecords) user.expenseRecords = [];
  user.expenseRecords.push(newRecord);
  user.expenseRecords.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  saveState();
  renderAll();
  expenseAmountInput.value = '';
  expenseDescriptionInput.value = '';
});

clearExpenseBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.expenseRecords || !user.expenseRecords.length) return;
  if (!confirm('确定要清空当前用户的全部开支数据吗？此操作不可恢复。')) return;
  user.expenseRecords = [];
  saveState();
  renderAll();
});

deleteSelectedExpenseBtn.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user || !user.expenseRecords || !user.expenseRecords.length) return;
  const checked = Array.from(expenseRecordsBody.querySelectorAll('.record-check:checked'));
  if (!checked.length) {
    alert('请先选择要删除的记录。');
    return;
  }
  if (!confirm(`确认删除所选的 ${checked.length} 条记录吗？`)) return;
  const idsToDelete = new Set(checked.map((c) => c.dataset.recordId));
  user.expenseRecords = user.expenseRecords.filter((r) => {
    const recordId = r.id || `e-${r.date}-${r.timestamp || 0}`;
    return !idsToDelete.has(recordId);
  });
  saveState();
  renderAll();
});

selectAllExpenseCheckbox.addEventListener('change', () => {
  const checked = selectAllExpenseCheckbox.checked;
  expenseRecordsBody.querySelectorAll('.record-check').forEach((c) => {
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
    renderWeightChart();
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
    weightRecords: [],
    mealRecords: [],
    expenseRecords: [],
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
  // 设置所有日期输入为今天
  weightDateInput.value = todayISO();
  mealDateInput.value = todayISO();
  expenseDateInput.value = todayISO();

  // 尝试从旧版本迁移数据
  const legacyState = localStorage.getItem(LEGACY_STATE_KEY);
  if (legacyState && !localStorage.getItem(STATE_KEY)) {
    try {
      const parsed = JSON.parse(legacyState);
      if (parsed && Array.isArray(parsed.users)) {
        parsed.users.forEach((user) => {
          if (user.records && !user.weightRecords) {
            user.weightRecords = user.records || [];
            user.mealRecords = user.mealRecords || [];
            user.expenseRecords = user.expenseRecords || [];
            delete user.records;
          }
        });
        state = parsed;
        saveState();
      }
    } catch (e) {
      console.warn('迁移旧数据失败：', e);
    }
  }

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
