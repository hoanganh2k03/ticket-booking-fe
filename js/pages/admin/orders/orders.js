import { showToast } from "../../../components/toast.js";
import CONFIG from "../../../utils/settings.js";

// const API_BASE = `/api/accounts/employees/`;
const API_BASE_ORDERS = `${CONFIG.BASE_URL}/api/reports/orders`;
const API_BASE_TOURNAMENTS = `${API_BASE_ORDERS}/leagues`;
const API_BASE_MATCHES = (tournamentId) => `${API_BASE_ORDERS}/leagues/${tournamentId}/matches`;
const API_CUSTOMERS = `${CONFIG.BASE_URL}/api/accounts/staff/customers/`;

// DOM elements
const selTournament = document.getElementById('filterTournament');
const selMatch = document.getElementById('filterMatch');
const btnFilter = document.getElementById('btnFilter');
const btnReset = document.getElementById('btnReset');
const tableBody = document.getElementById('orderTableBody');
const pagination = document.getElementById('pagination');
const detailModal = new bootstrap.Modal('#detailModal');

const btnAddOrder = document.getElementById('btnAddOrder');
const addOrderModal = new bootstrap.Modal(document.getElementById('addOrderModal'));
const customerList = document.getElementById('customerList');
const btnNextOrder = document.getElementById('btnNextOrder');
let selectedCustomerId = null;

let currentPage = 1;


function formatVND(val) {
    const s = String(val).split('.')[0];
    const withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return withCommas + ' VNĐ';
}

function formatMethod(method) {
    switch (method) {
        case 'offline':
            return `<span class="badge badge-offline">Trực tiếp</span>`;
        case 'online':
            return `<span class="badge badge-online">Trực tuyến</span>`;
        default:
            return `<span class="badge bg-light text-dark">${method}</span>`;
    }
}

const paymentMethodMap = {
    bank_card: 'Thẻ ngân hàng',
    transfer: 'Chuyển khoản',
    cash: 'Tiền mặt'
};


const paymentStatusMap = {
    success: 'Thành công',
    failed: 'Thất bại',
    pending: 'Đang chờ'
};

function formatPaymentMethod(method) {
    return paymentMethodMap[method] || method;
}

function formatPaymentStatus(status) {
    return paymentStatusMap[status] || status;
}

const orderStatusMap = {
    pending: 'Đang chờ',
    received: 'Đã nhận',
    cancelled: 'Đã hủy'
};

const orderStatusBadgeClass = {
    pending: 'warning',
    received: 'success',
    cancelled: 'danger'
};

function formatOrderStatus(status) {
    const label = orderStatusMap[status] || status;
    const color = orderStatusBadgeClass[status] || 'secondary';
    return `<span class="badge bg-${color}">${label}</span>`;
}

function formatDateTime(input) {
    const d = input instanceof Date ? input : new Date(input);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');

    return `
      <div>${day}-${month}-${year}</div>
      <div class="text-primary font-weight-bold">${hh}:${mm}</div>
    `;
}

async function loadTournaments() {
    try {
        const res = await fetch(API_BASE_TOURNAMENTS);
        const data = await res.json();
        selTournament.innerHTML = '<option value="">Tất cả</option>' +
            data.map(t => `<option value="${t.league_id}">${t.league_name}</option>`).join('');
    } catch (e) {
        console.error('Không load được giải đấu', e);
    }
}

// 2. When a tournament is selected, load its matches
selTournament.addEventListener('change', async () => {
    const tid = selTournament.value;
    selMatch.innerHTML = '<option value="">Tất cả</option>';
    if (!tid) return;
    try {
        const res = await fetch(API_BASE_MATCHES(tid));
        const data = await res.json();
        selMatch.innerHTML += data.map(m =>
            `<option value="${m.match_id}">${m.display} - ${m.match_time_fmt}</option>`).join('');
    } catch (e) {
        console.error('Không load được trận đấu', e);
    }
});

// 3. Fetch orders with filters and pagination
async function fetchOrders(page = 1) {
    currentPage = page; // Cập nhật trang hiện tại
    const filters = {
        search: document.getElementById('filterKeyword').value,
        status: document.getElementById('filterStatus').value,
        method: document.getElementById('filterMethod').value,
        from_date: document.getElementById('filterFrom').value,
        to_date: document.getElementById('filterTo').value,
        season: selTournament.value,
        match: selMatch.value,
        page: currentPage, // Thêm tham số trang
    };

    const qs = Object.entries(filters)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    const url = qs ? `${API_BASE_ORDERS}?${qs}` : API_BASE_ORDERS;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const orders = Array.isArray(data.results) ? data.results : [];
        renderTable(orders);
        renderPagination(data.next, data.previous); // Gọi hàm render phân trang
    } catch (e) {
        console.error('Lỗi load orders', e);
    }
}


// // 3) Khi bấm Next: chuyển sang trang đặt đơn
// btnNextOrder.addEventListener('click', () => {
//     const customerId = $("#selectCustomer").val();
//     if (customerId) {
//         window.location.href = `/orders/create?customer_id=${customerId}`;
//     }
// });

// 1. Khi bấm nút Chọn Khách hàng
btnAddOrder.addEventListener('click', async () => {
    document.getElementById('customerInput').value = '';
    addOrderModal.show();
    await loadCustomers();
});

// 2. Tải danh sách khách hàng từ API và populate datalist
async function loadCustomers() {
    try {
        const res = await fetch(API_CUSTOMERS);
        const data = await res.json();
        const list = Array.isArray(data.results) ? data.results : data;
        const datalist = document.getElementById('customerDatalist');
        datalist.innerHTML = list.map(cust =>
            `<option value="${cust.full_name}" data-id="${cust.id}">${cust.phone_number}</option>`
        ).join('');
    } catch (error) {
        console.error(error);
    }
}

// 3. Khi bấm Tiếp theo, tìm khách hàng dựa trên giá trị input và chuyển sang trang tạo đơn
btnNextOrder.addEventListener('click', () => {
    const customerInput = document.getElementById('customerInput');
    const datalist = document.getElementById('customerDatalist');
    const inputValue = customerInput.value.trim();
    const option = Array.from(datalist.options).find(opt => opt.value === inputValue);

    if (option && option.dataset.id) {
        window.location.href = `/pages/admin/orders/order_customer.html?customer_id=${option.dataset.id}`;
    } else {
        alert('Vui lòng chọn khách hàng hợp lệ.');
    }
});

document.getElementById('btnAddCustomer').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = "customers/customers";
    addOrderModal.hide();
});

// 4. Render orders table
function renderTable(orders) {
    tableBody.innerHTML = orders.map(o => {
        return `
        <tr onclick="openDetail('${o.order_id}')">
          <td>${o.order_id}</td>
          <td>${o.user}</td>
          <td>${formatVND(o.total_amount)}</td>
          <td>${formatOrderStatus(o.order_status)}</td>
          <td>${formatMethod(o.order_method)}</td>
          <td>${formatDateTime(o.created_at)}</td>
        </tr>
      `;
    }).join('');
}

// 5. Render pagination
function renderPagination(next, previous) {
    pagination.innerHTML = `
        <li class="page-item ${previous ? '' : 'disabled'}">
            <a class="page-link" href="#" id="prevPage">&laquo; Trang trước</a>
        </li>
        <li class="page-item ${next ? '' : 'disabled'}">
            <a class="page-link" href="#" id="nextPage">Trang sau &raquo;</a>
        </li>
    `;

    // Xử lý sự kiện cho nút "Trang trước"
    document.getElementById('prevPage').addEventListener('click', (e) => {
        e.preventDefault();
        if (previous) fetchOrders(currentPage - 1);
    });

    // Xử lý sự kiện cho nút "Trang sau"
    document.getElementById('nextPage').addEventListener('click', (e) => {
        e.preventDefault();
        if (next) fetchOrders(currentPage + 1);
    });
}

// 6. Open detail modal
async function openDetail(id) {
    try {
        const res = await fetch(`${API_BASE_ORDERS}/${id}/`);
        const o = await res.json();

        document.getElementById('detailAmount').innerText = formatVND(o.total_amount);
        document.getElementById('detailDate').innerHTML = formatDateTime(o.created_at);

        // --- Thông tin chi tiết đơn hàng ---
        const items = o.details.map(d => {
            const price = d.price.toLocaleString('vi-VN', {
                style: 'currency', currency: 'VND'
            });
            return `
                <tr>
                    <td>${d.section || '-'}</td>
                    <td>${d.seat}</td>
                    <td>${formatVND(price)}</td>
                    <td>${d.promotion || '-'}</td>
                </tr>
                `;
        }).join('');
        document.getElementById('detailItems').innerHTML = items;

        // --- Thông tin Trận đấu ---
        if (o.match) {
            document.getElementById('detailMatchDesc').innerText = o.match.description || '-';
            document.getElementById('detailMatchLeague').innerText = o.match.league || '-';
            document.getElementById('detailMatchStadium').innerText = o.match.stadium || '-';
            document.getElementById('detailMatchTeam1').innerText = o.match.team_1 || '-';
            document.getElementById('detailMatchTeam2').innerText = o.match.team_2 || '-';
            document.getElementById('detailMatchRound').innerText = o.match.round || '-';
            document.getElementById('detailMatchTime').innerHTML = formatDateTime(o.match.match_time);
        }

        // Fill modal fields
        document.getElementById('detailOrderId').innerText = o.order_id;
        document.getElementById('detailUser').innerText = o.user;
        document.getElementById('detailStatus').innerHTML = formatOrderStatus(o.order_status);
        document.getElementById('detailMethod').innerHTML = formatMethod(o.order_method);

        // -- Thông tin thanh toán --
        const payments = Array.isArray(o.payments) ? o.payments : [o.payments];
        console.log('Payments:', payments);
        if (o.order_status == 'cancelled') {
            document.getElementById('payTableBody').innerHTML = '<tr><td colspan="3" class="text-center">Không có thông tin thanh toán</td></tr>';
        }
        else {
            const payRows = payments.map(p => `
                                            <tr>
                                                <td>${formatPaymentMethod(p.payment_method)}</td>
                                                <td>${formatPaymentStatus(p.payment_status)}</td>
                                                <td>${p.transaction_code}</td>
                                            </tr>
                                            `).join('');
            document.getElementById('payTableBody').innerHTML = payRows;
        }
        

        detailModal.show();
    } catch (e) {
        console.error('Lỗi load chi tiết', e);
    }
}
window.openDetail = openDetail;

// 7. Filter / Reset events
btnFilter.addEventListener('click', () => {
    currentPage = 1;
    fetchOrders();
});

btnReset.addEventListener('click', () => {
    document.querySelectorAll('.filters-card input, .filters-card select').forEach(el => el.value = '');
    currentPage = 1;
    fetchOrders();
});

// Init
loadTournaments();
fetchOrders();

