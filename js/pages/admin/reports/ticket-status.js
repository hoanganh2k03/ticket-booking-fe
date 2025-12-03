
import { showToast } from "../../../components/toast.js";
import CONFIG from "../../../utils/settings.js";

const API_BASE = `${CONFIG.BASE_URL}/api/reports/ticket-status/`;

// Fetch data từ API
async function fetchReport(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}${qs ? "?" + qs : ""}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API lỗi ${res.status}`);
    const data = await res.json();
    if (data.status !== "success")
        throw new Error("API trả về trạng thái không thành công");
    return data;
}

// Populate dropdown trận
function populateMatchSelect(matches) {
    const sel = document.getElementById("matchSelect");
    sel.innerHTML = '<option value="">Tất cả trận đấu</option>';
    matches.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.match_id;
        opt.textContent = m.match_name;
        sel.appendChild(opt);
    });
}

// Cập nhật thông số tổng quan
function updateSummary(matches) {
    document.getElementById("totalMatches").textContent = matches.length;
    const totalSold = matches.reduce((sum, m) => sum + m.sold_tickets, 0);
    document.getElementById("totalSold").textContent = totalSold;
    const avg = matches.length
        ? matches.reduce((s, m) => s + parseFloat(m.fill_rate), 0) / matches.length
        : 0;
    document.getElementById("avgFillRate").textContent = `${avg.toFixed(1)}%`;
}

// Vẽ biểu đồ Bar tỷ lệ lấp đầy
let fillRateChart_T = null;
function renderfillRateChart_T(matches) {
    const canvasId = 'fillRateChart_T';
    // Lấy hoặc tạo instance
    let chart = Chart.getChart(canvasId);
    const dataLabels = matches.map(m => m.match_name);
    const dataValues = matches.map(m => parseFloat(m.fill_rate));

    if (!chart) {
        // tạo mới lần đầu
        const ctx = document.getElementById(canvasId).getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dataLabels,
                datasets: [{
                    label: 'Tỷ lệ lấp đầy (%)',
                    data: dataValues,
                    backgroundColor: dataLabels.map(() => '#ff7f50'),
                    borderColor: dataLabels.map(() => '#ff6347'),
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, max: 100 } },
                plugins: { legend: { display: false } },
            },
        });
    } else {
        // khi đã có chart, chỉ update data
        chart.data.labels = dataLabels;
        chart.data.datasets[0].data = dataValues;
        chart.update();
    }
}


// Vẽ biểu đồ Line doanh số theo ngày
let dailySalesChart = null;
function renderDailySalesChart(dailySales) {
    const canvasId = 'dailySalesChart';
    let chart = Chart.getChart(canvasId);

    const labels = dailySales.map(d => d.day);
    const values = dailySales.map(d => d.sold);

    if (!chart) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Số vé bán',
                    data: values,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 4,
                }],
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { position: 'top' } },
            },
        });
    } else {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
    }
}


// Khởi tạo DataTables cho matches và sections
function initTables(matches, sections) {
    // Matches Table
    if ($.fn.dataTable.isDataTable("#matchesTable"))
        $("#matchesTable").DataTable().destroy();
    $("#matchesTable").DataTable({
        data: matches,
        columns: [
            { title: "ID", data: "match_id" },
            {
                title: 'Ngày giờ',
                data: 'match_date',
                render: d => {
                    if (!d) return '';
                    const dt = new Date(d);
                    const dateStr = dt.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    const timeStr = dt.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    return `
                    <div style="line-height:1.1;">
                      <div>${dateStr}</div>
                      <div style="color:#ec4899;font-weight:500;font-size:0.9rem;margin-top:0.5rem;">
                        ${timeStr}
                      </div>
                    </div>
                  `;
                }
            },
            { title: "Trận đấu", data: "match_name" },
            { title: "Sức chứa", data: "total_capacity" },
            { title: "Đã bán", data: "sold_tickets" },
            { title: "Còn lại", data: "available_tickets" },
            { title: "Tỷ lệ (%)", data: "fill_rate" },
        ],
        paging: true,
        searching: false,
        info: false,
        autoWidth: false,
        lengthChange: false,
    });

    // Sections Table
    if ($.fn.DataTable.isDataTable("#sectionsTable"))
        $("#sectionsTable").DataTable().destroy();
    $("#sectionsTable").DataTable({
        data: sections,
        columns: [
            { title: "ID", data: "section_id" },
            { title: "Khu vực", data: "section_name" },
            { title: "Sức chứa", data: "capacity" },
            { title: "Còn lại", data: "available_seats" },
        ],
        paging: true,
        searching: false,
        info: false,
        autoWidth: false,
        lengthChange: false,
    });
}

// Hàm chính khởi tạo dashboard
async function initializeDashboard(params = {}) {
    try {
        const { payload, daily_sales } = await fetchReport(params);
        const { matches, sections } = payload;

        populateMatchSelect(matches);
        updateSummary(matches);
        renderfillRateChart_T(matches);
        renderDailySalesChart(daily_sales);
        initTables(matches, sections);
    } catch (err) {
        console.error(err);
        showToast("Tải/báo cáo thất bại", "error");
    }
}

const startInput = document.getElementById("startDate");
const endInput = document.getElementById("endDate");
const matchSelect = document.getElementById("matchSelect");
const applyBtn = document.getElementById("applyFilter");

// Mặc định 7 ngày gần nhất
const today = new Date();
const weekAgo = new Date(today);
weekAgo.setDate(today.getDate() - 7);

if (startInput) startInput.value = weekAgo.toISOString().slice(0, 10);
if (endInput) endInput.value = today.toISOString().slice(0, 10);

// Load lần đầu với tham số mặc định
initializeDashboard({
    start_date: startInput.value,
    end_date: endInput.value,
});

// Bắt sự kiện filter
applyBtn.addEventListener("click", () => {
    const params = {};
    if (matchSelect && matchSelect.value) params.match_id = matchSelect.value;
    if (startInput && startInput.value) params.start_date = startInput.value;
    if (endInput && endInput.value) params.end_date = endInput.value;
    initializeDashboard(params);
});

// Hàm mở tab mới gọi API export
function exportTicketStatus(format) {
    // Lấy filter hiện tại
    const params = {};
    if (startInput.value) params.start_date = startInput.value;
    if (endInput.value) params.end_date = endInput.value;
    if (matchSelect.value) params.match_id = matchSelect.value;
    params.employee_name = encodeURIComponent(localStorage.getItem("full_name") || "");

    params.export_format = format;

    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/?${qs}`;
    window.open(url, '_blank');
}

// Gắn sự kiện cho 2 nút xuất
document
    .getElementById('export-pdf-report')
    .addEventListener('click', () => exportTicketStatus('pdf'));

document
    .getElementById('export-excel-report')
    .addEventListener('click', () => exportTicketStatus('xlsx'));
