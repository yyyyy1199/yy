// 全局状态：保存学生、座位、选中项与当前网格设置
const state = {
    students: [],
    seats: [],
    selectedSeatIndexes: new Set(),
    gridConfig: {
        rows: 5,
        cols: 6,
        seatSize: 80
    }
};
// 统一收集页面元素，方便后续引用
const elements = {
    downloadTemplateBtn: document.getElementById("downloadTemplateBtn"),
    studentFile: document.getElementById("studentFile"),
    rowsInput: document.getElementById("rowsInput"),
    colsInput: document.getElementById("colsInput"),
    seatSizeInput: document.getElementById("seatSizeInput"),
    generateBtn: document.getElementById("generateBtn"),
    gridWrapper: document.getElementById("gridWrapper"),
    rowHeaders: document.getElementById("rowHeaders"),
    colHeaders: document.getElementById("colHeaders"),
    seatGrid: document.getElementById("seatGrid"),
    swapBtn: document.getElementById("swapBtn"),
    reshuffleSelectionBtn: document.getElementById("reshuffleSelectionBtn"),
    clearSelectionBtn: document.getElementById("clearSelectionBtn"),
    exportExcelBtn: document.getElementById("exportExcelBtn"),
    exportImageBtn: document.getElementById("exportImageBtn"),
    studentSummary: document.getElementById("studentSummary"),
    studentTableWrapper: document.getElementById("studentTableWrapper"),
    studentTableBody: document.getElementById("studentTableBody")
};
// 性别映射：兼容不同写法
const GENDER_LABEL = {
    \u7537: "male",
    \u5973: "female",
    \u7537\u751F: "male",
    \u5973\u751F: "female",
    male: "male",
    female: "female"
};
// 初始化入口：绑定全部事件
function init() {
    elements.downloadTemplateBtn.addEventListener("click", downloadTemplate);
    elements.studentFile.addEventListener("change", handleFileUpload);
    elements.generateBtn.addEventListener("click", handleGenerateSeats);
    elements.swapBtn.addEventListener("click", swapSelectedSeats);
    elements.reshuffleSelectionBtn.addEventListener("click", reshuffleSelectedSeats);
    elements.clearSelectionBtn.addEventListener("click", clearSelectedSeats);
    elements.exportExcelBtn.addEventListener("click", exportExcel);
    elements.exportImageBtn.addEventListener("click", exportImage);
    [
        "rowsInput",
        "colsInput",
        "seatSizeInput"
    ].forEach((key)=>{
        elements[key].addEventListener("input", ()=>{
            const value = Number(elements[key].value);
            if (value > 0) {
                state.gridConfig = {
                    ...state.gridConfig,
                    rows: Number(elements.rowsInput.value),
                    cols: Number(elements.colsInput.value),
                    seatSize: Number(elements.seatSizeInput.value)
                };
                if (state.seats.length) renderSeatGrid();
            }
        });
    });
}
// 供教师下载的模板示例
function downloadTemplate() {
    const sample = [
        {
            StudentID: "20230001",
            Name: "\u5F20\u4E09",
            Gender: "\u7537"
        },
        {
            StudentID: "20230002",
            Name: "\u674E\u56DB",
            Gender: "\u5973"
        }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "student_template.xlsx");
}
// 根据文件类型调用对应解析方式
function handleFileUpload(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") parseCsvFile(file);
    else if (ext === "xlsx" || ext === "xls") parseExcelFile(file);
    else alert("\u4EC5\u652F\u6301 CSV \u6216 Excel \u6587\u4EF6\u3002");
}
// 解析 CSV 模板（UTF-8）
function parseCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (e)=>{
        const rows = e.target.result.split(/\r?\n/).map((line)=>line.trim()).filter(Boolean);
        const header = rows.shift()?.split(",").map((h)=>h.trim());
        if (!header || header.length < 3) {
            alert("CSV \u6A21\u677F\u4E0D\u6B63\u786E\u3002");
            return;
        }
        const data = rows.map((line)=>{
            const parts = line.split(",").map((v)=>v.trim());
            return {
                StudentID: parts[0] || "",
                Name: parts[1] || "",
                Gender: parts[2] || ""
            };
        });
        acceptStudentList(data);
    };
    reader.readAsText(file, "utf-8");
}
// 解析 Excel 模板
function parseExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e)=>{
        const workbook = XLSX.read(new Uint8Array(e.target.result), {
            type: "array"
        });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const data = XLSX.utils.sheet_to_json(sheet, {
            defval: ""
        });
        acceptStudentList(data);
    };
    reader.readAsArrayBuffer(file);
}
// 将多样的性别字段转为统一的 male/female
function normalizeGender(value) {
    const cleaned = String(value).trim();
    return GENDER_LABEL[cleaned] || "unknown";
}
// 校验并接收学生名单
function acceptStudentList(data) {
    const normalized = data.map((row)=>({
            id: row.StudentID?.toString().trim(),
            name: row.Name?.toString().trim(),
            gender: normalizeGender(row.Gender)
        })).filter((row)=>row.id && row.name && row.gender !== "unknown");
    if (!normalized.length) {
        alert("\u672A\u8BC6\u522B\u5230\u6709\u6548\u7684\u5B66\u751F\u8BB0\u5F55\uFF0C\u8BF7\u68C0\u67E5\u6A21\u677F\u5185\u5BB9\u3002");
        return;
    }
    state.students = normalized;
    updateStudentPreview();
    resetSeats();
    elements.exportExcelBtn.disabled = true;
    elements.exportImageBtn.disabled = true;
}
// 名单预览，包含序号列
function updateStudentPreview() {
    const total = state.students.length;
    const male = state.students.filter((s)=>s.gender === "male").length;
    const female = state.students.filter((s)=>s.gender === "female").length;
    elements.studentSummary.textContent = `\u{5171} ${total} \u{4EBA}\u{FF08}\u{7537}\u{751F} ${male} \u{FF0C}\u{5973}\u{751F} ${female}\u{FF09}\u{3002}`;
    elements.studentTableWrapper.classList.remove("hidden");
    elements.studentTableBody.innerHTML = state.students.map((s, idx)=>`
        <tr>
          <td>${idx + 1}</td>
          <td>${s.id}</td>
          <td>${s.name}</td>
          <td>${s.gender === "male" ? "\u7537" : "\u5973"}</td>
        </tr>
      `).join("");
}
// 上传新名单后，清空当前座位
function resetSeats() {
    state.seats = [];
    state.selectedSeatIndexes.clear();
    elements.seatGrid.innerHTML = "\u8BF7\u8BBE\u7F6E\u884C\u5217\u5E76\u751F\u6210\u5EA7\u4F4D\u3002";
    elements.seatGrid.classList.add("empty");
    elements.rowHeaders.innerHTML = "";
    elements.colHeaders.innerHTML = "";
    elements.gridWrapper.classList.add("inactive");
    refreshActionButtons();
}
// 生成座位：随机打乱学生并填充网格
function handleGenerateSeats() {
    if (!state.students.length) {
        alert("\u8BF7\u5148\u4E0A\u4F20\u5B66\u751F\u540D\u5355\u3002");
        return;
    }
    const rows = Number(elements.rowsInput.value);
    const cols = Number(elements.colsInput.value);
    if (rows <= 0 || cols <= 0) {
        alert("\u884C\u5217\u6570\u5FC5\u987B\u5927\u4E8E 0\u3002");
        return;
    }
    const capacity = rows * cols;
    if (capacity < state.students.length) {
        alert(`\u{5EA7}\u{4F4D}\u{6570}\u{4E0D}\u{8DB3}\u{FF08}\u{5F53}\u{524D}\u{5BB9}\u{91CF} ${capacity}\u{FF0C}\u{5B66}\u{751F} ${state.students.length}\u{FF09}\u{3002}\u{8BF7}\u{589E}\u{52A0}\u{884C}\u{5217}\u{6570}\u{3002}`);
        return;
    }
    state.gridConfig = {
        rows,
        cols,
        seatSize: Number(elements.seatSizeInput.value)
    };
    const shuffled = [
        ...state.students
    ].sort(()=>Math.random() - 0.5);
    state.seats = Array.from({
        length: capacity
    }, (_, idx)=>({
            seatIndex: idx,
            student: shuffled[idx] || null
        }));
    state.selectedSeatIndexes.clear();
    renderSeatGrid();
    elements.exportExcelBtn.disabled = false;
    elements.exportImageBtn.disabled = false;
}
// 渲染座位网格，同时展示“第X行/第Y列”与连续序号
function renderSeatGrid() {
    const { rows, cols, seatSize } = state.gridConfig;
    const gridTemplate = `repeat(${cols}, ${seatSize}px)`;
    elements.seatGrid.style.gridTemplateColumns = gridTemplate;
    elements.seatGrid.style.gridTemplateRows = `repeat(${rows}, ${seatSize}px)`;
    elements.seatGrid.classList.remove("empty");
    elements.seatGrid.innerHTML = "";
    renderGridHeaders(rows, cols, seatSize);
    state.seats.forEach((seat, idx)=>{
        const row = Math.floor(idx / cols) + 1;
        const col = idx % cols + 1;
        const serialNumber = (row - 1) * cols + col; // 第二行第一列会接续上一行计数
        const seatDiv = document.createElement("div");
        seatDiv.className = [
            "seat",
            seat.student ? seat.student.gender : "empty"
        ].concat(state.selectedSeatIndexes.has(idx) ? [
            "selected"
        ] : []).join(" ");
        seatDiv.style.width = `${seatSize}px`;
        seatDiv.style.height = `${seatSize}px`;
        seatDiv.dataset.index = idx;
        seatDiv.innerHTML = seat.student ? `
        <div class="serial">\u{5E8F}\u{53F7} ${serialNumber}</div>
        <div class="position">\u{7B2C}${row}\u{884C}\u{7B2C}${col}\u{5217}</div>
        <div class="name">${seat.student.name}</div>
        <div class="sid">${seat.student.id}</div>
      ` : `
        <div class="serial">\u{5E8F}\u{53F7} ${serialNumber}</div>
        <div class="position">\u{7B2C}${row}\u{884C}\u{7B2C}${col}\u{5217}</div>
        <div class="name">\u{7A7A}</div>
      `;
        seatDiv.addEventListener("click", ()=>toggleSeatSelection(idx));
        elements.seatGrid.appendChild(seatDiv);
    });
    refreshActionButtons();
}
// 点击座位即可选择/反选
function toggleSeatSelection(index) {
    if (!state.seats.length) return;
    if (state.selectedSeatIndexes.has(index)) state.selectedSeatIndexes.delete(index);
    else state.selectedSeatIndexes.add(index);
    renderSeatGrid();
}
// 根据选择数量更新按钮状态
function refreshActionButtons() {
    const count = state.selectedSeatIndexes.size;
    elements.swapBtn.disabled = count !== 2;
    elements.reshuffleSelectionBtn.disabled = count < 2;
    elements.clearSelectionBtn.disabled = count === 0;
}
// 绘制行/列标题，满足“第几行第几列”的展示要求
function renderGridHeaders(rows, cols, seatSize) {
    elements.gridWrapper.classList.toggle("inactive", !state.seats.length);
    elements.colHeaders.style.gridTemplateColumns = `repeat(${cols}, ${seatSize}px)`;
    elements.rowHeaders.style.gridTemplateRows = `repeat(${rows}, ${seatSize}px)`;
    elements.colHeaders.innerHTML = Array.from({
        length: cols
    }, (_, idx)=>`<div class="header-item">\u{7B2C}${idx + 1}\u{5217}</div>`).join("");
    elements.rowHeaders.innerHTML = Array.from({
        length: rows
    }, (_, idx)=>`<div class="header-item">\u{7B2C}${idx + 1}\u{884C}</div>`).join("");
}
// 选中两个座位后互换
function swapSelectedSeats() {
    if (state.selectedSeatIndexes.size !== 2) return;
    const [a, b] = Array.from(state.selectedSeatIndexes);
    const temp = state.seats[a].student;
    state.seats[a].student = state.seats[b].student;
    state.seats[b].student = temp;
    state.selectedSeatIndexes.clear();
    renderSeatGrid();
}
// 批量随机：仅对选中的座位重新洗牌
function reshuffleSelectedSeats() {
    const indexes = Array.from(state.selectedSeatIndexes);
    if (indexes.length < 2) return;
    const students = indexes.map((idx)=>state.seats[idx].student).filter(Boolean);
    if (!students.length) {
        alert("\u6240\u9009\u5EA7\u4F4D\u4E2D\u6CA1\u6709\u5B66\u751F\u53EF\u7528\u4E8E\u968F\u673A\u3002");
        return;
    }
    const shuffled = [
        ...students
    ].sort(()=>Math.random() - 0.5);
    const seatMeta = indexes.map((idx)=>({
            idx,
            hadStudent: Boolean(state.seats[idx].student)
        }));
    seatMeta.forEach(({ idx, hadStudent })=>{
        state.seats[idx].student = hadStudent ? shuffled.pop() || null : null;
    });
    state.selectedSeatIndexes.clear();
    renderSeatGrid();
}
// 清空所选座位，便于手动调整
function clearSelectedSeats() {
    state.selectedSeatIndexes.forEach((idx)=>{
        state.seats[idx].student = null;
    });
    state.selectedSeatIndexes.clear();
    renderSeatGrid();
}
// 导出电子表格：包含序号、行列、性别等字段
function exportExcel() {
    if (!state.seats.length) return;
    const { rows, cols } = state.gridConfig;
    const data = state.seats.map((seat, idx)=>{
        const row = Math.floor(idx / cols) + 1;
        const col = idx % cols + 1;
        return {
            SerialNumber: idx + 1,
            Row: row,
            Column: col,
            Seat: `${row}\u{884C}${col}\u{5217}`,
            StudentID: seat.student?.id || "",
            Name: seat.student?.name || "",
            Gender: seat.student ? seat.student.gender === "male" ? "\u7537" : "\u5973" : ""
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seats");
    XLSX.writeFile(wb, "seat_plan.xlsx");
}
// 导出座位图为 PNG，使用 html2canvas
function exportImage() {
    if (!state.seats.length) return;
    html2canvas(elements.gridWrapper).then((canvas)=>{
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "seat_plan.png";
        link.click();
    });
}
document.addEventListener("DOMContentLoaded", init);

//# sourceMappingURL=my-project.579125c3.js.map
