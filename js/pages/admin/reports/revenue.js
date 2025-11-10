import CONFIG from "../../../utils/settings.js";
const API_BASE = CONFIG.BASE_URL + "/api/reports/revenue/";
import { showToast } from "../../../components/toast.js";


async function fetchRevenue(startDate, endDate) {
    const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
    });
    const resp = await fetch(`${API_BASE}?${params}`, {
        headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) throw new Error(`API lỗi: ${resp.status}`);
    showToast("Tải báo cáo thành công", "success", 2000);
    return resp.json();
}

function formatCurrency(x) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(parseFloat(x));
}

function clearTables() {
    document.querySelector("#table-by-match tbody").innerHTML = "";
    document.querySelector("#table-by-section tbody").innerHTML = "";
}

function renderTables(data) {
    // Bảng theo trận
    const matchTbody = document.querySelector("#table-by-match tbody");
    data.by_match.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${item.match_id}</td>
      <td>${item.match_name}</td>
      <td>${new Date(item.match_time).toLocaleDateString("vi-VN")}</td>
      <td>${formatCurrency(item.revenue)}</td>
    `;
        matchTbody.appendChild(tr);
    });

    // Bảng theo khu vực
    const sectionTbody = document.querySelector("#table-by-section tbody");
    data.by_section.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${item.section_id}</td>
      <td>${item.section_name}</td>
      <td>${formatCurrency(item.revenue)}</td>
    `;
        sectionTbody.appendChild(tr);
    });
}

let revenueChart = null;
function renderChart(data) {
    // chuẩn bị data
    const dailyMap = {};
    data.by_match.forEach(item => {
        const day = new Date(item.match_time).toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + parseFloat(item.revenue);
    });
    const dates = Object.keys(dailyMap).sort();
    const labels = dates.map(d => new Date(d).toLocaleDateString('vi-VN'));
    const values = dates.map(d => dailyMap[d]);

    const canvasId = 'revenue-chart';
    let chart = Chart.getChart(canvasId);

    if (!chart) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Doanh thu (₫)', data: values, fill: false, tension: 0.1 }] },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Ngày' } },
                    y: { title: { display: true, text: 'Doanh thu (₫)' } },
                },
            },
        });
    } else {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
    }
}


// Lấy nút theo bảng
const userName = window.currentUserName || "Nguyen Van A";
const startInput = document.querySelector("#start-date");
const endInput = document.querySelector("#end-date");
const loadBtn = document.querySelector("#load-btn");

// Mặc định: 7 ngày gần nhất
const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
startInput.value = weekAgo;
endInput.value = today;

loadBtn.addEventListener("click", async () => {
    loadBtn.disabled = true;
    clearTables();

    try {
        const { status, total_revenue, by_match, by_section } = await fetchRevenue(
            startInput.value,
            endInput.value
        );
        if (status === "success") {
            // Hiển thị tổng doanh thu
            // document.querySelector("#total-revenue").textContent = formatCurrency(total_revenue);
            // Vẽ bảng & biểu đồ
            renderChart({ by_match });
            renderTables({ by_match, by_section });
        } else {
            console.error("API trả về lỗi:", status);
        }
    } catch (err) {
        console.error("Không thể tải báo cáo:", err);
        showToast("Không thể tải báo cáo", "error", 3000);
    } finally {
        loadBtn.disabled = false;
    }
});

// export toàn bộ báo cáo từ backend
function exportReport(format) {
    const params = new URLSearchParams({
        start_date: startInput.value,
        end_date: endInput.value,
        export_format: format,
        employee_name: encodeURIComponent(localStorage.getItem("full_name") || ""),
    });
    // mở ra tab mới để browser tự download
    window.open(`${API_BASE}?${params.toString()}`, '_blank');
}

// gắn sự kiện cho 2 nút xuất
document
    .getElementById('export-report-pdf')
    .addEventListener('click', () => exportReport('pdf'));

document
    .getElementById('export-report-excel')
    .addEventListener('click', () => exportReport('xlsx'));


// Tự động tải lần đầu
loadBtn.click();
