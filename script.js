// ============================================
// 生活记录工具 - 主程序
// ============================================

// === 本地存储 Key ===
// 当前版本的数据存储键
const STATE_KEY = 'life_record_app_v3';
// 旧版本的数据存储键（用于数据迁移）
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
// 验证DOM元素
if (!weightRecordsBody) {
  console.error('警告：weightRecordsBody元素未找到！请检查HTML结构。');
}
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

// === DOM 引用 - 导入导出 ===
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
const importDataInput = document.createElement('input');
importDataInput.type = 'file';
importDataInput.accept = '.json,.xlsx,.xls';
importDataInput.style.display = 'none';
document.body.appendChild(importDataInput);

// === 应用状态 ===
// state: 存储所有用户数据和应用状态
let state = {
  users: [],           // 用户列表
  currentUserId: null, // 当前选中的用户ID
};
let currentRange = '7';  // 图表显示范围：7天/30天/全部
let currentTab = 'weight'; // 当前标签页：weight/meal/expense/analytics

// ============================================
// 工具函数
// ============================================

/**
 * 获取今天的日期字符串（YYYY-MM-DD格式）
 * @returns {string} 今天的日期
 */
function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化体重变化值
 * @param {number} delta - 体重变化值
 * @returns {string} 格式化后的字符串，如 "+0.5 kg" 或 "-0.3 kg"
 */
function formatDelta(delta) {
  if (delta == null || Number.isNaN(delta)) return '--';
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0) return `+${abs} kg`;
  if (delta < 0) return `-${abs} kg`;
  return '0.0 kg';
}

/**
 * 使用线性回归计算体重趋势
 * @param {number[]} values - 体重值数组
 * @returns {number|null} 斜率值，负数表示下降趋势，正数表示上升趋势
 */
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

// ============================================
// 数据存储与管理
// ============================================

/**
 * 保存应用状态到本地存储
 */
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存数据失败：', e);
    alert('保存数据失败，可能是存储空间不足。');
  }
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

/**
 * 从本地存储加载应用状态
 * @returns {Object} 应用状态对象
 */
function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        console.log('成功加载数据，用户数量：', parsed.users.length);
        // 确保每个用户都有正确的数据结构
        parsed.users.forEach((user) => {
          if (!user.weightRecords) user.weightRecords = [];
          if (!user.mealRecords) user.mealRecords = [];
          if (!user.expenseRecords) user.expenseRecords = [];
        });
        return parsed;
      }
    } catch (e) {
      console.warn('解析状态失败，尝试迁移旧数据：', e);
    }
  }
  // 尝试从旧版本迁移
  const migrated = migrateFromV1();
  if (migrated) {
    console.log('从旧版本迁移数据成功');
    return migrated;
  }

  // 创建默认用户
  console.log('创建默认用户');
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

// ============================================
// 渲染函数
// ============================================

/**
 * 渲染用户选择下拉框
 * 显示所有用户，并标记当前选中的用户
 */
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

/**
 * 渲染体重统计卡片
 * 显示当前体重、变化、趋势、目标进度和BMI等信息
 */
function renderStats() {
  const user = getCurrentUser();
  console.log('renderStats - 当前用户：', user);
  console.log('renderStats - 体重记录数量：', user?.weightRecords?.length || 0);
  
  if (!user || !user.weightRecords || !user.weightRecords.length) {
    if (currentWeightEl) currentWeightEl.textContent = '--';
    if (weightChangeEl) weightChangeEl.textContent = '较昨日：--';
    if (totalChangeEl) totalChangeEl.textContent = '--';
    if (startWeightEl) startWeightEl.textContent = '起始体重：--';
    if (recentAvgEl) recentAvgEl.textContent = '均值：--';
    if (trendTextEl) trendTextEl.textContent = '趋势：--';
    if (goalProgressEl) goalProgressEl.textContent = '--';
    if (goalEstimateEl) goalEstimateEl.textContent = '预估达成时间：--';
    if (bmiValueEl) bmiValueEl.textContent = '--';
    if (bmiStatusEl) bmiStatusEl.textContent = '需要身高与最新体重';
    return;
  }

  // 按日期和时间戳排序
  const sorted = [...user.weightRecords].sort((a, b) => {
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

  if (currentWeightEl) currentWeightEl.textContent = `${latest.weight.toFixed(1)} kg`;

  if (prev) {
    const delta = latest.weight - prev.weight;
    if (weightChangeEl) weightChangeEl.textContent = `较昨日：${formatDelta(delta)}`;
  } else {
    if (weightChangeEl) weightChangeEl.textContent = '较昨日：--';
  }

  const totalDelta = latest.weight - first.weight;
  if (totalChangeEl) totalChangeEl.textContent = formatDelta(totalDelta);
  if (startWeightEl) startWeightEl.textContent = `起始体重：${first.weight.toFixed(1)} kg`;

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
    if (goalProgressEl) goalProgressEl.textContent = '尚未设置目标';
    if (goalEstimateEl) goalEstimateEl.textContent = '预估达成时间：--';
  } else {
    const diff = latest.weight - user.goalWeight;
    if (diff <= 0) {
      if (goalProgressEl) goalProgressEl.textContent = '已达到或低于目标 🎉';
      if (goalEstimateEl) goalEstimateEl.textContent = '预估达成时间：已完成';
    } else {
      const startingDiff = first.weight - user.goalWeight;
      const finished = startingDiff > 0 ? startingDiff - diff : 0;
      const percent =
        startingDiff > 0 ? Math.min(100, (finished / startingDiff) * 100) : 0;
      if (goalProgressEl) goalProgressEl.textContent = `还差 ${diff.toFixed(1)} kg（约 ${
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
          if (goalEstimateEl) goalEstimateEl.textContent = `预估达成时间：${y}-${m}-${d}`;
        } else {
          if (goalEstimateEl) goalEstimateEl.textContent = '预估达成时间：趋势暂不明显';
        }
      } else {
        if (goalEstimateEl) goalEstimateEl.textContent = '预估达成时间：数据较少';
      }
    }
  }
}

/**
 * 渲染体重记录表格
 * 显示所有体重记录，包括日期、时间、体重、变化和备注
 */
function renderWeightTable() {
  const user = getCurrentUser();
  console.log('renderWeightTable - 当前用户：', user);
  console.log('renderWeightTable - 体重记录：', user?.weightRecords);
  
  // 检查DOM元素是否存在
  if (!weightRecordsBody) {
    console.error('weightRecordsBody元素不存在！');
    return;
  }
  
  weightRecordsBody.innerHTML = '';
  if (selectAllWeightCheckbox) {
    selectAllWeightCheckbox.checked = false;
  }

  // 如果没有用户或没有记录，显示空状态
  if (!user) {
    console.warn('renderWeightTable - 没有当前用户');
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = '请先选择或创建用户';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.color = 'var(--text-muted)';
    emptyCell.style.padding = '20px';
    emptyRow.appendChild(emptyCell);
    weightRecordsBody.appendChild(emptyRow);
    return;
  }
  
  // 确保weightRecords数组存在
  if (!user.weightRecords) {
    user.weightRecords = [];
    console.warn('renderWeightTable - 用户weightRecords不存在，已初始化');
  }
  
  if (!user.weightRecords.length) {
    console.log('renderWeightTable - 用户没有体重记录');
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = '暂无记录，请先添加体重数据';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.color = 'var(--text-muted)';
    emptyCell.style.padding = '20px';
    emptyRow.appendChild(emptyCell);
    weightRecordsBody.appendChild(emptyRow);
    return;
  }
  
  console.log('renderWeightTable - 开始渲染体重记录表格，记录数：', user.weightRecords.length);

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
    
    // 验证DOM元素存在后再添加
    if (weightRecordsBody) {
      weightRecordsBody.appendChild(row);
      console.log(`renderWeightTable - 已添加第${i + 1}条记录：`, record.date, record.weight);
    } else {
      console.error('renderWeightTable - weightRecordsBody元素不存在，无法添加行');
    }
  }
  
  console.log('renderWeightTable - 渲染完成，表格中应有', sorted.length, '行数据');
  console.log('renderWeightTable - 实际表格行数：', weightRecordsBody ? weightRecordsBody.children.length : 0);
}

/**
 * 渲染激励文字
 * 根据最新的体重变化显示鼓励性文字
 */
function renderMotivation() {
  const user = getCurrentUser();
  if (!user || !user.weightRecords || !user.weightRecords.length) {
    if (motivationText) motivationText.textContent = '';
    return;
  }

  // 按日期和时间戳排序
  const sorted = [...user.weightRecords].sort((a, b) => {
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

/**
 * 渲染体重趋势图表
 * 使用Canvas绘制折线图，支持7天/30天/全部数据范围
 */
function renderWeightChart() {
  const user = getCurrentUser();
  console.log('renderWeightChart - 当前用户：', user);
  console.log('renderWeightChart - 体重记录数量：', user?.weightRecords?.length || 0);
  
  if (!chartCanvas) {
    console.error('图表Canvas元素不存在！');
    return;
  }
  
  if (!chartCanvas.getContext) {
    console.error('Canvas不支持getContext方法');
    return;
  }
  
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) {
    console.warn('无法获取Canvas上下文');
    return;
  }
  
  // 获取Canvas实际显示尺寸（考虑设备像素比）
  const rect = chartCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  
  // 设置Canvas实际尺寸（考虑高DPI屏幕）
  if (chartCanvas.width !== displayWidth * dpr || chartCanvas.height !== displayHeight * dpr) {
    chartCanvas.width = displayWidth * dpr;
    chartCanvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
  }
  
  const width = displayWidth;
  const height = displayHeight;

  // 清除画布（防止重复绘制）
  ctx.clearRect(0, 0, width, height);

  if (!user) {
    console.warn('renderWeightChart - 没有当前用户');
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('请先选择或创建用户', width / 2, height / 2);
    return;
  }
  
  if (!user.weightRecords || !user.weightRecords.length) {
    console.log('renderWeightChart - 没有体重记录');
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据，先记录一次体重吧。', width / 2, height / 2);
    return;
  }
  
  console.log('renderWeightChart - 开始绘制图表，记录数：', user.weightRecords.length);

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

  // 如果没有数据，显示提示
  if (dataToShow.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据，先记录一次体重吧。', width / 2, height / 2);
    return;
  }

  const weights = dataToShow.map((r) => r.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  // 如果最大值和最小值相同，添加一些间距
  const range = maxW - minW || 1;
  const minWAdjusted = minW - range * 0.1;
  const maxWAdjusted = maxW + range * 0.1;
  
  const padding = 40;
  const innerWidth = Math.max(width - padding * 2, 100);
  const innerHeight = Math.max(height - padding * 2, 100);

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
    const val = maxWAdjusted - ((maxWAdjusted - minWAdjusted) * i) / 4;
    ctx.fillText(val.toFixed(1), padding - 4, y + 3);
  }

  // 如果只有一条数据或所有数据相同，只显示一个点
  if (dataToShow.length === 1 || range === 0) {
    const x = padding + innerWidth / 2;
    const y = padding + innerHeight / 2;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  /**
   * 将记录映射到画布坐标
   * @param {Object} record - 体重记录
   * @param {number} index - 记录索引
   * @returns {{x: number, y: number}} 画布坐标
   */
  function mapPoint(record, index) {
    const t = dataToShow.length === 1 ? 0.5 : index / (dataToShow.length - 1);
    const x = padding + innerWidth * t;
    const ratio = (record.weight - minWAdjusted) / (maxWAdjusted - minWAdjusted || 1);
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

/**
 * 渲染所有内容（根据当前标签页）
 * 这是主要的渲染入口函数
 */
function renderAll() {
  console.log('renderAll - 开始渲染，当前标签页：', currentTab);
  console.log('renderAll - 当前状态：', {
    users: state.users.length,
    currentUserId: state.currentUserId,
    currentUser: getCurrentUser()
  });
  
  renderUserSelector();
  // 根据当前标签页渲染对应的内容
  if (currentTab === 'weight') {
    console.log('渲染体重记录标签页');
    renderStats();           // 渲染统计卡片
    renderWeightTable();     // 渲染体重记录表格
    renderMotivation();      // 渲染激励文字
    // 延迟渲染图表，确保Canvas尺寸正确
    setTimeout(() => {
      renderWeightChart();   // 渲染体重趋势图
    }, 100);
  } else if (currentTab === 'meal') {
    renderMealTable();       // 渲染餐饮记录表格
  } else if (currentTab === 'expense') {
    renderExpenseStats();    // 渲染开支统计
    renderExpenseTable();    // 渲染开支记录表格
  } else if (currentTab === 'analytics') {
    renderAnalytics();       // 渲染数据分析页面
  }
  
  console.log('renderAll - 渲染完成');
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

// ============================================
// 数据导入导出功能
// ============================================

/**
 * 生成导入数据Excel模板
 * 创建一个包含示例数据的Excel模板文件，包含多个工作表
 */
function downloadTemplate() {
  try {
    // 检查SheetJS库是否加载
    if (typeof XLSX === 'undefined') {
      alert('Excel处理库未加载，请刷新页面重试。');
      return;
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 1. 用户信息工作表
    const userData = [
      ['用户ID', '姓名', '身高(cm)', '目标体重(kg)'],
      ['u-001', '示例用户', 170, 65],
      ['u-002', '用户2', 165, 60]
    ];
    const userWs = XLSX.utils.aoa_to_sheet(userData);
    XLSX.utils.book_append_sheet(wb, userWs, '用户信息');

    // 2. 体重记录工作表
    const weightData = [
      ['日期', '时间', '体重(kg)', '备注'],
      ['2024-01-01', '08:00', 70.5, '早上空腹'],
      ['2024-01-02', '08:00', 70.2, '早上空腹'],
      ['2024-01-03', '08:00', 69.8, '早上空腹']
    ];
    const weightWs = XLSX.utils.aoa_to_sheet(weightData);
    XLSX.utils.book_append_sheet(wb, weightWs, '体重记录');

    // 3. 餐饮记录工作表
    const mealData = [
      ['日期', '时间', '餐次', '内容', '热量(kcal)', '备注'],
      ['2024-01-01', '12:00', '午餐', '米饭、青菜、鸡胸肉', 500, '营养均衡'],
      ['2024-01-01', '18:00', '晚餐', '蔬菜沙拉、水煮蛋', 300, '轻食'],
      ['2024-01-02', '08:00', '早餐', '燕麦、牛奶、鸡蛋', 350, '高蛋白']
    ];
    const mealWs = XLSX.utils.aoa_to_sheet(mealData);
    XLSX.utils.book_append_sheet(wb, mealWs, '餐饮记录');

    // 4. 开支记录工作表
    const expenseData = [
      ['日期', '时间', '分类', '金额(元)', '描述'],
      ['2024-01-01', '12:30', '餐饮', 25.50, '午餐'],
      ['2024-01-01', '08:00', '交通', 5.00, '地铁卡充值'],
      ['2024-01-02', '14:00', '购物', 99.00, '日用品']
    ];
    const expenseWs = XLSX.utils.aoa_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, expenseWs, '开支记录');

    // 5. 使用说明工作表
    const instructionData = [
      ['使用说明'],
      [''],
      ['1. 用户信息表：'],
      ['   - 用户ID：唯一标识，建议格式 u-001, u-002 等'],
      ['   - 姓名：用户显示名称'],
      ['   - 身高：单位厘米，如 170'],
      ['   - 目标体重：单位千克，如 65'],
      [''],
      ['2. 体重记录表：'],
      ['   - 日期：格式 YYYY-MM-DD，如 2024-01-01'],
      ['   - 时间：格式 HH:MM，如 08:00'],
      ['   - 体重：单位千克，如 70.5'],
      ['   - 备注：可选，如"早上空腹"'],
      [''],
      ['3. 餐饮记录表：'],
      ['   - 日期：格式 YYYY-MM-DD'],
      ['   - 时间：格式 HH:MM'],
      ['   - 餐次：早餐/午餐/晚餐/加餐/夜宵'],
      ['   - 内容：食物描述'],
      ['   - 热量：单位千卡，可选'],
      ['   - 备注：可选'],
      [''],
      ['4. 开支记录表：'],
      ['   - 日期：格式 YYYY-MM-DD'],
      ['   - 时间：格式 HH:MM'],
      ['   - 分类：餐饮/交通/购物/娱乐/医疗/教育/其他'],
      ['   - 金额：单位元，如 25.50'],
      ['   - 描述：支出说明'],
      [''],
      ['5. 导入说明：'],
      ['   - 可以只填写部分工作表'],
      ['   - 日期和时间格式必须正确'],
      ['   - 数值字段请填写数字'],
      ['   - 导入时会自动创建用户（如果不存在）']
    ];
    const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
    // 设置列宽
    instructionWs['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instructionWs, '使用说明');

    // 导出Excel文件
    XLSX.writeFile(wb, '生活记录数据模板.xlsx');
    alert('Excel模板下载成功！\n\n模板包含：\n- 用户信息表\n- 体重记录表\n- 餐饮记录表\n- 开支记录表\n- 使用说明表\n\n请按照使用说明填写数据后导入。');
  } catch (e) {
    console.error('下载模板失败：', e);
    alert('下载模板失败：' + e.message + '\n请确保浏览器支持文件下载功能。');
  }
}

/**
 * 导出所有数据为JSON文件
 * 包含所有用户的所有记录（体重、餐饮、开支）
 */
function exportData() {
  try {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `生活记录数据_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('数据导出成功！');
  } catch (e) {
    console.error('导出数据失败：', e);
    alert('导出数据失败，请重试。');
  }
}

/**
 * 从Excel文件解析数据
 * @param {File} file - Excel文件
 * @returns {Promise<Object>} 解析后的数据对象
 */
function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    if (typeof XLSX === 'undefined') {
      reject(new Error('Excel处理库未加载，请刷新页面重试。'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // 解析用户信息
        const users = [];
        let currentUserId = null;

        // 读取用户信息表
        if (workbook.SheetNames.includes('用户信息')) {
          const userSheet = workbook.Sheets['用户信息'];
          const userRows = XLSX.utils.sheet_to_json(userSheet, { header: 1 });
          
          // 跳过表头，从第二行开始
          for (let i = 1; i < userRows.length; i++) {
            const row = userRows[i];
            if (row && row[0]) {
              const userId = String(row[0]).trim();
              const userName = String(row[1] || '').trim() || '未命名用户';
              const height = row[2] ? Number(row[2]) : null;
              const goalWeight = row[3] ? Number(row[3]) : null;

              if (userId) {
                const user = {
                  id: userId,
                  name: userName,
                  height: Number.isFinite(height) ? height : null,
                  goalWeight: Number.isFinite(goalWeight) ? goalWeight : null,
                  weightRecords: [],
                  mealRecords: [],
                  expenseRecords: []
                };
                users.push(user);
                if (!currentUserId) currentUserId = userId;
              }
            }
          }
        }

        // 如果没有用户信息表，创建一个默认用户
        if (users.length === 0) {
          const defaultUser = {
            id: `u-${Date.now()}`,
            name: '导入用户',
            height: null,
            goalWeight: null,
            weightRecords: [],
            mealRecords: [],
            expenseRecords: []
          };
          users.push(defaultUser);
          currentUserId = defaultUser.id;
        }

        // 读取体重记录表
        if (workbook.SheetNames.includes('体重记录')) {
          const weightSheet = workbook.Sheets['体重记录'];
          const weightRows = XLSX.utils.sheet_to_json(weightSheet, { header: 1 });
          
          for (let i = 1; i < weightRows.length; i++) {
            const row = weightRows[i];
            if (row && row[0]) {
              const date = String(row[0]).trim();
              const time = String(row[1] || '').trim() || '00:00';
              const weight = Number(row[2]);
              const note = String(row[3] || '').trim();

              if (date && Number.isFinite(weight)) {
                const record = {
                  id: `w-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 8)}`,
                  date: date,
                  time: time,
                  timestamp: new Date(date + ' ' + time).getTime() || Date.now(),
                  weight: weight,
                  note: note
                };
                users[0].weightRecords.push(record);
              }
            }
          }
        }

        // 读取餐饮记录表
        if (workbook.SheetNames.includes('餐饮记录')) {
          const mealSheet = workbook.Sheets['餐饮记录'];
          const mealRows = XLSX.utils.sheet_to_json(mealSheet, { header: 1 });
          
          for (let i = 1; i < mealRows.length; i++) {
            const row = mealRows[i];
            if (row && row[0]) {
              const date = String(row[0]).trim();
              const time = String(row[1] || '').trim() || '00:00';
              const mealTime = String(row[2] || '').trim();
              const content = String(row[3] || '').trim();
              const calories = row[4] ? Number(row[4]) : null;
              const note = String(row[5] || '').trim();

              if (date && mealTime && content) {
                const record = {
                  id: `m-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 8)}`,
                  date: date,
                  time: time,
                  timestamp: new Date(date + ' ' + time).getTime() || Date.now(),
                  mealTime: mealTime,
                  content: content,
                  calories: Number.isFinite(calories) ? calories : null,
                  note: note
                };
                users[0].mealRecords.push(record);
              }
            }
          }
        }

        // 读取开支记录表
        if (workbook.SheetNames.includes('开支记录')) {
          const expenseSheet = workbook.Sheets['开支记录'];
          const expenseRows = XLSX.utils.sheet_to_json(expenseSheet, { header: 1 });
          
          for (let i = 1; i < expenseRows.length; i++) {
            const row = expenseRows[i];
            if (row && row[0]) {
              const date = String(row[0]).trim();
              const time = String(row[1] || '').trim() || '00:00';
              const category = String(row[2] || '').trim();
              const amount = Number(row[3]);
              const description = String(row[4] || '').trim();

              if (date && category && Number.isFinite(amount)) {
                const record = {
                  id: `e-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 8)}`,
                  date: date,
                  time: time,
                  timestamp: new Date(date + ' ' + time).getTime() || Date.now(),
                  category: category,
                  amount: amount,
                  description: description
                };
                users[0].expenseRecords.push(record);
              }
            }
          }
        }

        resolve({
          users: users,
          currentUserId: currentUserId
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 从JSON或Excel文件导入数据
 * 支持合并模式和覆盖模式
 */
function importData() {
  importDataInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let importedData;

      // 判断文件类型
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel文件
        importedData = await parseExcelFile(file);
      } else {
        // JSON文件
        const reader = new FileReader();
        importedData = await new Promise((resolve, reject) => {
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              resolve(data);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.readAsText(file);
        });
      }
      
      // 验证数据格式
      if (!importedData || !Array.isArray(importedData.users)) {
        alert('数据格式不正确，请确保文件格式正确。');
        return;
      }

      // 询问用户是合并还是覆盖
      const mode = confirm(
        '选择导入模式：\n' +
        '确定 = 合并数据（保留现有数据，添加新用户）\n' +
        '取消 = 覆盖数据（清空现有数据，完全替换）'
      );

      if (mode) {
        // 合并模式：添加新用户，如果用户ID已存在则跳过
        importedData.users.forEach((importedUser) => {
          const existingUser = state.users.find((u) => u.id === importedUser.id);
          if (!existingUser) {
            state.users.push(importedUser);
          } else {
            // 如果用户已存在，询问是否合并该用户的数据
            if (confirm(`用户 "${importedUser.name}" 已存在，是否合并其数据？`)) {
              // 合并数据：合并各类型的记录
              if (importedUser.weightRecords) {
                existingUser.weightRecords = [
                  ...(existingUser.weightRecords || []),
                  ...importedUser.weightRecords
                ];
              }
              if (importedUser.mealRecords) {
                existingUser.mealRecords = [
                  ...(existingUser.mealRecords || []),
                  ...importedUser.mealRecords
                ];
              }
              if (importedUser.expenseRecords) {
                existingUser.expenseRecords = [
                  ...(existingUser.expenseRecords || []),
                  ...importedUser.expenseRecords
                ];
              }
            }
          }
        });
      } else {
        // 覆盖模式：完全替换
        state = importedData;
      }

      // 确保有当前用户
      if (!state.currentUserId && state.users.length > 0) {
        state.currentUserId = state.users[0].id;
      }

      saveState();
      renderAll();
      alert('数据导入成功！');
    } catch (e) {
      console.error('导入数据失败：', e);
      alert('导入数据失败：' + e.message + '\n请确保文件格式正确。');
    }
    
    // 清空input，允许重复选择同一文件
    importDataInput.value = '';
  };
  importDataInput.click();
}

// ============================================
// 事件处理
// ============================================

// 标签页切换事件
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

// 导入导出按钮事件
if (exportDataBtn) {
  exportDataBtn.addEventListener('click', exportData);
}
if (downloadTemplateBtn) {
  downloadTemplateBtn.addEventListener('click', downloadTemplate);
}
if (importDataBtn) {
  importDataBtn.addEventListener('click', importData);
}

// 体重记录表单提交事件
weightForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const date = weightDateInput.value;
  const weight = Number(weightInput.value);
  const note = weightNoteInput.value.trim();

  // 数据验证
  if (!date || !Number.isFinite(weight)) {
    alert('请填写完整日期和体重。');
    return;
  }

  // 生成唯一记录ID和时间戳，支持同一天多次记录
  const recordId = `w-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const timestamp = Date.now();
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const newRecord = { id: recordId, date, time: timeStr, timestamp, weight, note };
  
  // 初始化记录数组（如果不存在）
  if (!user.weightRecords) {
    user.weightRecords = [];
    console.log('初始化weightRecords数组');
  }
  
  console.log('保存前记录数：', user.weightRecords.length);
  user.weightRecords.push(newRecord);
  console.log('保存后记录数：', user.weightRecords.length);
  console.log('新记录：', newRecord);
  
  // 按日期和时间戳排序
  user.weightRecords.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  
  // 保存状态
  saveState();
  console.log('数据已保存到localStorage');
  console.log('当前用户记录数：', user.weightRecords.length);
  
  // 重新渲染
  renderAll();
  
  // 清空备注输入框（保留日期和体重，方便连续输入）
  weightNoteInput.value = '';
  
  // 显示成功提示
  console.log('体重记录已保存并渲染完成！');
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

// 图表范围按钮事件（只在体重标签页时渲染图表）
rangeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    rangeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.dataset.range || '7';
    // 只在体重标签页时渲染图表，避免重复渲染
    if (currentTab === 'weight') {
      renderWeightChart();
    }
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
  console.log('应用初始化开始...');
  
  // 检查必要的DOM元素
  if (!weightDateInput || !weightInput || !weightForm) {
    console.error('关键DOM元素未找到，请检查HTML结构');
    return;
  }
  
  // 设置所有日期输入为今天
  if (weightDateInput) weightDateInput.value = todayISO();
  if (mealDateInput) mealDateInput.value = todayISO();
  if (expenseDateInput) expenseDateInput.value = todayISO();

  // 尝试从旧版本迁移数据
  const legacyState = localStorage.getItem(LEGACY_STATE_KEY);
  if (legacyState && !localStorage.getItem(STATE_KEY)) {
    console.log('检测到旧版本数据，开始迁移...');
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
        console.log('旧数据迁移成功');
      }
    } catch (e) {
      console.warn('迁移旧数据失败：', e);
    }
  }

  // 加载状态
  state = loadState();
  console.log('加载后的状态：', state);
  
  // 确保有当前用户
  ensureCurrentUser();
  console.log('确保当前用户后的状态：', state);

  const current = getCurrentUser();
  console.log('当前用户：', current);
  if (current) {
    if (goalInput) goalInput.value = current.goalWeight ?? '';
    if (heightInput) heightInput.value = current.height ?? '';
    
    // 确保weightRecords数组存在
    if (!current.weightRecords) {
      current.weightRecords = [];
      console.log('初始化当前用户的weightRecords数组');
    }
    
    console.log('当前用户体重记录数：', current.weightRecords.length);
    console.log('当前用户体重记录：', current.weightRecords);
  }

  // 渲染所有内容
  renderAll();
  console.log('应用初始化完成');
  
  // 验证数据是否正确加载
  const savedState = localStorage.getItem(STATE_KEY);
  if (savedState) {
    console.log('localStorage中的数据：', JSON.parse(savedState));
  } else {
    console.log('localStorage中没有数据');
  }
}

document.addEventListener('DOMContentLoaded', init);
