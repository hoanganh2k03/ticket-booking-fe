import { showToast } from '../../../components/toast.js';
import CONFIG from '../../../utils/settings.js';

const API_BASE = `${CONFIG.BASE_URL}/api/reports/payments/`;
let currentPage = 1;

// map phương thức thanh toán sang tiếng Việt
const METHOD_LABEL = {
    bank_card: 'Thẻ ngân hàng',
    transfer: 'Chuyển khoản',
    cash: 'Tiền mặt',
};

// map trạng thái thanh toán sang tiếng Việt + class badge
const STATUS_LABEL = {
    pending: 'Đang chờ',
    success: 'Thành công',
    failed: 'Thất bại',
};
const STATUS_BADGE = {
    pending: 'warning',
    success: 'success',
    failed: 'danger',
};


const elems = {
    search: document.getElementById('filterSearch'),
    status: document.getElementById('filterStatus'),
    method: document.getElementById('filterMethod'),
    from: document.getElementById('filterFrom'),
    to: document.getElementById('filterTo'),
    tableBody: document.getElementById('paymentTableBody'),
    pagination: document.getElementById('pagination'),
};

function buildQuery() {
    const params = new URLSearchParams();
    if (elems.search.value) params.append('search', elems.search.value);
    if (elems.status.value) params.append('payment_status', elems.status.value);
    if (elems.method.value) params.append('payment_method', elems.method.value);
    if (elems.from.value) params.append('start_date', elems.from.value);
    if (elems.to.value) params.append('end_date', elems.to.value);
    params.append('page', currentPage);
    return params.toString();
}

async function fetchPayments(urlOverride = null) {
    try {
        const url = urlOverride || (API_BASE + '?' + buildQuery());
        const res = await fetch(url);
        if (!res.ok) throw new Error("Không thể tải dữ liệu thanh toán.");
        const data = await res.json();
        renderTable(data.results);
        renderPagination(data.next, data.previous);
        showToast("Dữ liệu thanh toán đã được tải thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
        console.error("Lỗi khi tải dữ liệu thanh toán:", error);
    }
}

function renderTable(items) {
    elems.tableBody.innerHTML = '';
    if (!items.length) {
        elems.tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }
    items.forEach(p => {
        const methodText = METHOD_LABEL[p.payment_method] || p.payment_method;
        const statusText = STATUS_LABEL[p.payment_status] || p.payment_status;
        const statusClass = STATUS_BADGE[p.payment_status] || 'secondary';

        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${p.payment_id}</td>
        <td>${p.order_id}</td>
        <td>
          <span class="badge bg-primary">
            ${methodText}
          </span>
        </td>
        <td>
          <span class="badge bg-${statusClass}">
            ${statusText}
          </span>
        </td>
        <td>${p.transaction_code}</td>
        <td>${new Date(p.created_at).toLocaleString('vi-VN')}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="showDetail(${p.payment_id})">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      `;
        elems.tableBody.appendChild(tr);
    });
}


function renderPagination(next, previous) {
    elems.pagination.innerHTML = `
        <li class="page-item ${previous ? '' : 'disabled'}">
          <a class="page-link" href="#" id="prevPage">&laquo; Trang trước</a>
        </li>
        <li class="page-item ${next ? '' : 'disabled'}">
          <a class="page-link" href="#" id="nextPage">Trang sau &raquo;</a>
        </li>
      `;

    // nếu có trang trước, gán handler
    document.getElementById('prevPage').addEventListener('click', e => {
        e.preventDefault();
        if (previous) {
            // gọi thẳng URL DRF trả về
            fetchPayments(previous);
        }
    });

    // nếu có trang sau, gán handler
    document.getElementById('nextPage').addEventListener('click', e => {
        e.preventDefault();
        if (next) {
            fetchPayments(next);
        }
    });
}

document.getElementById('btnFilter').addEventListener('click', () => {
    currentPage = 1;
    const fromDate = elems.from.value;
    const toDate = elems.to.value;
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc", "error");
        return;
    }
    currentPage = 1;
    fetchPayments();
});
document.getElementById('btnReset').addEventListener('click', () => {
    elems.search.value = '';
    elems.status.value = '';
    elems.method.value = '';
    elems.from.value = '';
    elems.to.value = '';
    currentPage = 1;
    fetchPayments();
});

window.showDetail = async id => {
    const res = await fetch(`${API_BASE}${id}/`);
    const p = await res.json();

    document.getElementById('detailPaymentId').textContent = p.payment_id;
    document.getElementById('detailOrderId').textContent = p.order_id;
    // badge phương thức
    document.getElementById('detailMethod').innerHTML =
        `<span class="badge bg-primary">${METHOD_LABEL[p.payment_method]}</span>`;
    // badge trạng thái
    const sc = STATUS_BADGE[p.payment_status];
    document.getElementById('detailStatus').innerHTML =
        `<span class="badge bg-${sc}">${STATUS_LABEL[p.payment_status]}</span>`;

    document.getElementById('detailCode').textContent = p.transaction_code;
    document.getElementById('detailDate').textContent = new Date(p.created_at).toLocaleString('vi-VN');
    new bootstrap.Modal(document.getElementById('paymentDetailModal')).show();
};

// Khởi tạo
fetchPayments();

