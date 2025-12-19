import CONFIG from "../../utils/settings.js";
import { showToast } from "../../components/toast.js";

const API_BASE = `${CONFIG.BASE_URL}/api/reports`;
const API_BASE_SPORTS = `${CONFIG.BASE_URL}/api/events/sports/`;
const API_BASE_TOURNAMENTS = `${API_BASE}/orders/leagues`;
const API_BASE_MATCHES = (tournamentId) => `${API_BASE}/orders/leagues/${tournamentId}/matches`;

const selSport = document.getElementById('filterSport');
const selTournament = document.getElementById('filterTournament');
const selMatch = document.getElementById('filterMatch');

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDateLabel(iso) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

let revenueChart, fillRateChart;

async function loadTournaments() {
    try {
        const sportId = selSport ? selSport.value : '';
        const url = sportId ? `${API_BASE_TOURNAMENTS}?sport_id=${sportId}` : API_BASE_TOURNAMENTS;
        const res = await fetch(url);
        const data = await res.json();
        selTournament.innerHTML = '<option value="">Tất cả</option>' +
            data.map(t => `<option value="${t.league_id}">${t.league_name}</option>`).join('');
    } catch (e) {
        console.error('Không load được giải đấu', e);
    }
}

async function loadSports() {
    if (!selSport) return;
    try {
        const res = await fetch(API_BASE_SPORTS);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        selSport.innerHTML = '<option value="">Tất cả</option>' + list.map(s => `<option value="${s.sport_id}">${s.sport_name}</option>`).join('');
    } catch (e) {
        console.error('Không load được môn thể thao', e);
    }
}

// When sport changes, reload tournaments
if (selSport) {
    selSport.addEventListener('change', async () => {
        await loadTournaments();
    });
}

// 2. When a tournament is selected, load its matches
selTournament.addEventListener('change', async () => {
    const tid = selTournament.value;
    // Empty the match select
    selMatch.innerHTML = '';
    // Add default option
    selMatch.innerHTML = '<option value="">Tất cả</option>';
    if (!tid) return;
    try {
        const res = await fetch(API_BASE_MATCHES(tid));
        const data = await res.json();
        selMatch.innerHTML += data.map(m =>
            `<option value="${m.match_id}">${m.display} - ${m.match_time_fmt}</option>`
        ).join('');
    } catch (e) {
        console.error('Không load được trận đấu', e);
    }
});

async function loadDashboard() {
    try {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        const sportId = selSport ? selSport.value : '';
        const leagueId = selTournament.value;
        const matchId = selMatch.value;
        const params = new URLSearchParams();
        if (start) params.append('start_date', start);
        if (end) params.append('end_date', end);
        if (sportId) params.append('sport_id', sportId);
        if (leagueId) params.append('league_id', leagueId);
        if (matchId) params.append('match_id', matchId);

        // 1) Revenue
        const revRes = await fetch(`${API_BASE}/revenue/?${params}`);
        if (!revRes.ok) throw new Error("Không thể tải dữ liệu doanh thu.");
        const rev = await revRes.json();
        document.getElementById('totalRevenue').innerText = formatCurrency(rev.total_revenue);

        // Revenue chart
        const days = rev.by_date.map(x => formatDateLabel(x.day));
        const revData = rev.by_date.map(x => x.revenue);
        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(
            document.getElementById('revenueChart'), { type: 'line', data: { labels: days, datasets: [{ label: 'Doanh thu', data: revData, fill: true, tension: 0.3 }] }, options: { responsive: true, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } } }
        );

        // 2) Ticket status
        const statusRes = await fetch(`${API_BASE}/ticket-status/?${params}`);
        if (!statusRes.ok) throw new Error("Không thể tải dữ liệu trạng thái vé.");
        const status = await statusRes.json();
        const matches = status.payload.matches;
        const totalCap = matches.reduce((sum, m) => sum + m.total_capacity, 0);
        const totalSold = matches.reduce((sum, m) => sum + m.sold_tickets, 0);
        const overallRate = totalCap ? (totalSold / totalCap * 100).toFixed(2) + '%' : '--';
        document.getElementById('overallFillRate').innerText = overallRate;

        // Daily sales card
        const today = new Date().toISOString().slice(0, 10);
        const todayData = status.daily_sales.find(d => d.day === today);
        document.getElementById('ticketsSoldToday').innerText = todayData ? todayData.sold : 0;

        // Fill rate chart
        const labels = matches.map(m => m.match_name);
        const rates = matches.map(m => parseFloat(m.fill_rate));
        if (fillRateChart) fillRateChart.destroy();
        fillRateChart = new Chart(
            document.getElementById('fillRateChart'), { type: 'bar', data: { labels, datasets: [{ label: 'Lấp đầy (%)', data: rates, }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 100, grid: { display: false } }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } } }
        );

        // 3) Returns summary
        const retRes = await fetch(`${API_BASE}/returns-report/?${params}`);
        if (!retRes.ok) throw new Error("Không thể tải dữ liệu hoàn trả.");
        const ret = await retRes.json();
        document.getElementById('totalReturns').innerText = ret.total_returns;

        showToast("Dữ liệu dashboard đã được tải thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
        console.error("Lỗi khi tải dashboard:", error);
    }
}

// Load sports first, then tournaments
(async () => {
    try {
        // Default date range: last 7 days
        const now = new Date();
        const past = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
        document.getElementById('endDate').value = now.toISOString().slice(0, 10);
        document.getElementById('startDate').value = past.toISOString().slice(0, 10);

        await loadSports();
        await loadTournaments();
        await loadDashboard();
    } catch (error) {
        showToast("Đã xảy ra lỗi khi tải trang.", "error");
    }
})();

document.getElementById('applyFilters').addEventListener('click', () => loadDashboard());