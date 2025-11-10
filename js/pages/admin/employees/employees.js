import CONFIG from "../../../utils/settings.js";
import { showToast } from "../../../components/toast.js";

const API_BASE = `${CONFIG.BASE_URL}/api/accounts/employees/`;

// State
let employees = [];
let currentPage = 1;
const perPage = 10;
let sortKey = null;
let sortAsc = true;

let tbody, pagination;
let filterName, filterEmail, filterPhone, filterFrom, filterTo;
let employeeModal, form, fields, btnAdd, detailModal;

tbody = document.getElementById('employeeTableBody');
pagination = document.getElementById('pagination');
filterName = document.getElementById('filterName');
filterEmail = document.getElementById('filterEmail');
filterPhone = document.getElementById('filterPhone');
filterFrom = document.getElementById('filterFrom');
filterTo = document.getElementById('filterTo');
form = document.getElementById('employeeForm');
btnAdd = document.getElementById('btnAdd');
detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
employeeModal = new bootstrap.Modal(document.getElementById('employeeModal'));
fields = {
    id: document.getElementById('employeeId'),
    fullName: document.getElementById('fullName'),
    citizenId: document.getElementById('citizenId'),
    email: document.getElementById('email'),
    phone: document.getElementById('phoneNumber'),
    dob: document.getElementById('dateOfBirth'),
    gender: document.getElementById('gender'),
    role: document.getElementById('role'),
    address: document.getElementById('address'),
    image: document.getElementById('image'),
};

const dobInput = document.getElementById('dateOfBirth');

// tính ngày tối đa (ngày nay trừ 18 năm)
const today = new Date();
today.setFullYear(today.getFullYear() - 18);
const maxDate = today.toISOString().split('T')[0];
dobInput.setAttribute('max', maxDate);


const confirmDisableModal = new bootstrap.Modal(document.getElementById('confirmDisableModal'));
let disableEmployeeId = null;

// Load data
async function loadData() {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(res.status);
        const json = await res.json();
        employees = Array.isArray(json) ? json : (json.results || []);
        renderTable();
    } catch (e) {
        showToast('Không tải được dữ liệu', 'error');
    }
}

// Format date
function fmtDate(iso) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// Apply filters
function applyFilters(data) {
    return data.filter(emp => {
        if (filterName.value && !emp.full_name.toLowerCase().includes(filterName.value.toLowerCase())) return false;
        if (filterEmail.value && !emp.email.toLowerCase().includes(filterEmail.value.toLowerCase())) return false;
        if (filterPhone.value && !emp.phone_number.includes(filterPhone.value)) return false;
        if (filterFrom.value && new Date(emp.created_at) < new Date(filterFrom.value)) return false;
        if (filterTo.value && new Date(emp.created_at) > new Date(filterTo.value)) return false;
        return true;
    });
}

// Render table & pagination
function renderTable() {
    let data = applyFilters([...employees]);
    if (sortKey) {
        data.sort((a, b) => {
            let va = a[sortKey];
            let vb = b[sortKey];
            if (sortKey.endsWith('_at')) {
                va = new Date(va);
                vb = new Date(vb);
            }
            return (va > vb ? 1 : va < vb ? -1 : 0) * (sortAsc ? 1 : -1);
        });
    }
    const total = data.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    currentPage = Math.min(currentPage, pages);
    const slice = data.slice((currentPage - 1) * perPage, currentPage * perPage);
    tbody.innerHTML = slice.map(emp => {
        const roleLabel = emp.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
        const genderLabel = emp.gender ? 'Nữ' : 'Nam';
        const statusBadge = emp.is_active
            ? '<span class="badge bg-success">Hoạt động</span>'
            : '<span class="badge bg-danger">Khóa</span>';
        const updated = fmtDate(emp.updated_at);
        return `
            <tr onclick="showDetail(${emp.id})">
                <td>${emp.id}</td>
                <td>${emp.full_name}</td>
                <td>${roleLabel}</td>
                <td>${genderLabel}</td>
                <td>${statusBadge}</td>
                <td>${updated}</td>
                <td>
                    ${emp.is_active ? `<button 
                        class="btn btn-sm btn-info" 
                        onclick="openEditModal(${emp.id}); event.stopPropagation();" 
                        title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>` : ''}
                    ${emp.is_active 
                        ? `<button 
                                class="btn btn-sm btn-warning" 
                                onclick="toggleAccount(${emp.id},false); event.stopPropagation();" 
                                title="Khóa">
                                <i class="fas fa-lock"></i>
                        </button>`
                        : `<button 
                                class="btn btn-sm btn-success" 
                                onclick="toggleAccount(${emp.id},true); event.stopPropagation();" 
                                title="Kích hoạt">
                                <i class="fas fa-unlock"></i>
                        </button>`
                    }
                </td>
            </tr>`;

    }).join('');
    pagination.innerHTML = '';
    for (let i = 1; i <= pages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.onclick = e => { e.preventDefault(); currentPage = i; renderTable(); };
        pagination.appendChild(li);
    }
}

// Show detail modal
function showDetail(id) {
    fetch(`${API_BASE}${id}/`)
        .then(r => r.json())
        .then(emp => {
            document.getElementById('detailImage').src = emp.image || '';
            document.getElementById('detailId').innerText = emp.id;
            document.getElementById('detailName').innerText = emp.full_name;
            document.getElementById('detailCitizen').innerText = emp.citizen_id;
            document.getElementById('detailEmail').innerText = emp.email;
            document.getElementById('detailPhone').innerText = emp.phone_number;
            document.getElementById('detailDob').innerText = emp.date_of_birth;
            document.getElementById('detailGender').innerText = emp.gender ? 'Nữ' : 'Nam';
            document.getElementById('detailRole').innerText = emp.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
            document.getElementById('detailAddress').innerText = emp.address;
            document.getElementById('detailCreated').innerText = new Date(emp.created_at).toLocaleString('vi-VN');
            detailModal.show();
        });
}

window.showDetail = showDetail;


// Open Add/Edit
window.openAddModal = function () {
    form.reset();
    fields.id.value = '';
    employeeModal.show();
};

// Save form
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = fields.id.value;
    let url, method;
    if (id) {
        url = `${CONFIG.BASE_URL}/api/accounts/employee/profile/update/`;
        method = 'PATCH';
    } 
    else {
        url = API_BASE;
        method = 'POST';
    }

    // Tạo FormData từ form
    const formData = new FormData(form);

    try {
        const res = await fetch(url, {
            method,
            body: formData
        });
        const json = await res.json();
    
        if (!res.ok) {
            let errorMsg = 'Lỗi không xác định';
            if (json.errors && typeof json.errors === 'object') {
                const firstKey = Object.keys(json.errors)[0];
                const arr = json.errors[firstKey];
                if (Array.isArray(arr) && arr.length > 0) {
                    errorMsg = arr[0];
                }
            } else if (json.data && typeof json.data === 'object') {
                const firstKey = Object.keys(json.data)[0];
                const arr = json.data[firstKey];
                if (Array.isArray(arr) && arr.length > 0) {
                    errorMsg = arr[0];
                }
            } else if (json.message) {
                errorMsg = json.message;
            }
            showToast(errorMsg, 'error');
            return;
        }
    
        // Nếu tới đây nghĩa là res.ok = true
        employeeModal.hide();
        showToast(
            id
                ? 'Cập nhật nhân viên thành công'
                : 'Thêm nhân viên thành công',
            'success'
        );
        loadData();
    } catch (err) {
        console.error(err);
        showToast('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
    }
    
});

// Toggle status
window.toggleAccount = function (id, enable) {
    if (!enable) {
        disableEmployeeId = id;
        confirmDisableModal.show();
    } else {
        // Kích hoạt ngay lập tức
        fetch(`${API_BASE}${id}/enable_account/`, { method: 'POST' })
            .then(r => r.json().then(j => ({ ok: r.ok, j })))
            .then(({ ok, j }) => {
                showToast(j.message || '', ok ? 'success' : 'warning');
                loadData();
            })
            .catch(() => showToast('Lỗi trạng thái', 'error'));
    }
};

document.getElementById('confirmDisableBtn').addEventListener('click', () => {
    if (!disableEmployeeId) return;
    fetch(`${API_BASE}${disableEmployeeId}/disable_account/`, { method: 'POST' })
        .then(r => r.json().then(j => ({ ok: r.ok, j })))
        .then(({ ok, j }) => {
            showToast(j.message || '', ok ? 'success' : 'warning');
            loadData();
        })
        .catch(() => showToast('Lỗi trạng thái', 'error'))
        .finally(() => confirmDisableModal.hide());
});



// Event listeners
document.getElementById('btnFilter').addEventListener('click', () => { currentPage = 1; renderTable(); });
document.getElementById('btnReset').addEventListener('click', () => {
    [filterName, filterEmail, filterPhone, filterFrom, filterTo].forEach(el => el.value = '');
    currentPage = 1;
    renderTable();
});
document.querySelectorAll('#employeeTable thead th[data-key]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) sortAsc = !sortAsc;
        else { sortKey = key; sortAsc = true; }
        renderTable();
    });
});
btnAdd.addEventListener('click', () => window.openAddModal());

// Mở modal và điền dữ liệu vào form để sửa
window.openEditModal = function (id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    fields.id.value = emp.id;
    fields.fullName.value = emp.full_name;
    fields.citizenId.value = emp.citizen_id;
    fields.email.value = emp.email;
    fields.phone.value = emp.phone_number;
    fields.dob.value = emp.date_of_birth;
    fields.gender.value   = emp.gender ? '1' : '0';
    fields.role.value = emp.role;
    fields.address.value = emp.address;
    // Lưu ý: xử lý preview ảnh nếu cần

    employeeModal.show();
};


// Load initial
loadData();

