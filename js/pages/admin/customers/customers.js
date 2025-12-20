
import CONFIG from "../../../utils/settings.js";
import { showToast } from "../../../components/toast.js";

const API_BASE = `${CONFIG.BASE_URL}/api/accounts/staff/customers/`;


let customers = [],
    currentPage = 1,
    perPage = 5,
    sortKey = null,
    sortAsc = true;

const tbody = document.querySelector("#customerTable tbody");
const pagination = document.querySelector(".pagination");
const filters = { name: "", email: "", phone: "", from: "", to: "" };

// Các phần tử UI
const searchInput = document.getElementById("searchInput");
const emailFilter = document.getElementById("emailFilter");
const phoneFilter = document.getElementById("phoneFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const btnFilter = document.getElementById("btnFilter");
const btnReset = document.getElementById("btnReset");
const btnAdd = document.getElementById("btnAdd");
const modalEl = document.getElementById("customerModal");
const modal = new bootstrap.Modal(modalEl);

// Khi modal đã ẩn hoàn toàn, remove mọi backdrop thừa và class modal-open
modalEl.addEventListener('hidden.bs.modal', () => {
    document.querySelectorAll('.modal-backdrop')
        .forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
});


const form = document.getElementById("customerForm");
const modalTitle = document.getElementById("modalTitle");

const confirmModalHtml = `
    <div class="modal fade" tabindex="-1" id="confirmModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Xác nhận xóa</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p id="confirmText"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-danger" id="confirmBtn">Xóa</button>
          </div>
        </div>
      </div>
    </div>
  `;

document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
const confirmModalEl = document.getElementById('confirmModal');
const confirmModal = new bootstrap.Modal(confirmModalEl);
const confirmText = document.getElementById('confirmText');
const confirmBtn = document.getElementById('confirmBtn');

let pendingDelete = null;

// Lấy dữ liệu từ API
async function loadData() {
    try {
        const res = await fetch(API_BASE, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`API lỗi ${res.status}`);
        const json = await res.json();
        customers = Array.isArray(json) ? json : (json.results ?? []);
        render();
    }
    catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
        showToast("Lỗi khi tải dữ liệu", "error");
    }
}

// Áp dụng filter
function applyFilters(data) {
    return data.filter((c) => {
        return (
            (!filters.name || c.full_name.toLowerCase().includes(filters.name)) &&
            (!filters.email || c.email.toLowerCase().includes(filters.email)) &&
            (!filters.phone || c.phone_number.includes(filters.phone)) &&
            (!filters.from || new Date(c.created_at) >= new Date(filters.from)) &&
            (!filters.to || new Date(c.created_at) <= new Date(filters.to))
        );
    });
}

// Hàm định dạng ngày tháng
function formatDateDMY(iso) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}




// Vẽ lại bảng & phân trang
function render() {
    const data = applyFilters([...customers]);
    if (data.length === 0) {
        showToast('Không có khách hàng nào phù hợp', 'info');
    }
    if (sortKey) {
        data.sort((a, b) =>
            a[sortKey] > b[sortKey]
                ? sortAsc
                    ? 1
                    : -1
                : a[sortKey] < b[sortKey]
                    ? sortAsc
                        ? -1
                        : 1
                    : 0
        );
    }
    const total = data.length,
        pages = Math.max(1, Math.ceil(total / perPage));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * perPage;
    const pageData = data.slice(start, start + perPage);

    // Render rows
    tbody.innerHTML = pageData
        .map(
            (c) => `
        <tr>
          <td>${c.id}</td>
          <td>
            <div class="fw-bold">${c.full_name}</div>
            <small class="text-muted">${c.email}</small>
          </td>
          <td>${c.phone_number}</td>
          
          <td class="text-center">${getTierBadge(c.tier)}</td>
          
          <td class="text-center">
            <span class="fw-bold text-primary">${c.loyalty_score?.toLocaleString() || 0}</span>
          </td>
          
          <td class="text-center">
            <span class="badge bg-success rounded-pill">
                ${c.points?.toLocaleString() || 0} pts
            </span>
          </td>

          <td>${formatDateDMY(c.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger btn-icon btn-icon-danger" data-action="delete" data-id="${c.id}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `
        )
        .join("");

    // Render pagination
    pagination.innerHTML = "";
    for (let i = 1; i <= pages; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentPage ? "active" : ""}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = i;
            render();
        });
        pagination.appendChild(li);
    }
}

// Xử lý event
btnFilter.addEventListener("click", () => {
    filters.name = searchInput.value.trim().toLowerCase();
    filters.email = emailFilter.value.trim().toLowerCase();
    filters.phone = phoneFilter.value.trim();
    filters.from = fromDate.value;
    filters.to = toDate.value;
    currentPage = 1;
    render();
});

btnReset.addEventListener("click", () => {
    [searchInput, emailFilter, phoneFilter, fromDate, toDate].forEach(
        (el) => (el.value = "")
    );
    filters.name = filters.email = filters.phone = filters.from = filters.to = "";
    currentPage = 1;
    render();
});

// Sort khi click header
document.querySelectorAll("#customerTable thead th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (sortKey === key) sortAsc = !sortAsc;
        else {
            sortKey = key;
            sortAsc = true;
        }
        render();
    });
});

confirmBtn.addEventListener('click', async () => {
    if (pendingDelete) {
        try {
            const res = await fetch(`${API_BASE}${pendingDelete.id}/`, { method: 'DELETE' });
            if (!res.ok) {
                const errorData = await res.json();
                confirmModal.hide();
                showToast(`${errorData.message}`, 'error');
                return;
            }
            pendingDelete = null;
            confirmModal.hide();
            showToast('Xóa khách hàng thành công', 'success');
            loadData();
        } catch (err) {
            console.error(err);
            showToast('Xóa khách hàng thất bại', 'error');
        }
    }
});

// Sửa / Xóa từng dòng
tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "edit") {
        const res = await fetch(API_BASE + id + "/");
        const c = await res.json();
        document.getElementById("customerId").value = c.id;
        document.getElementById("fullName").value = c.full_name;
        document.getElementById("email").value = c.email;
        document.getElementById("phone").value = c.phone_number;
        modalTitle.textContent = "Cập nhật Khách hàng";
        modal.show();
    } else if (btn.dataset.action === 'delete') {
        const cust = customers.find(x => x.id.toString() === id);
        if (cust) {
            pendingDelete = cust;
            confirmText.textContent = `Bạn có chắc muốn xóa khách hàng "${cust.full_name}" không?`;
            confirmModal.show();
        }
    }
});

// Thêm mới
btnAdd.addEventListener("click", () => {
    
    form.reset();
    document.getElementById("customerId").value = "";
    modalTitle.textContent = "Thêm Khách hàng";
    modal.show();
});

// Submit form tạo/cập nhật
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('customerId').value;
    const payload = {
        full_name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone_number: document.getElementById('phone').value
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}${id}/` : API_BASE;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            const messages = Object.entries(data)
                .map(([, errs]) => errs.join(' '))
                .join('\n');
            showToast(messages, 'error', 5000);
            return;
        }

        // Thành công
        modal.hide();
        showToast(
            id
                ? 'Cập nhật khách hàng thành công'
                : 'Thêm khách hàng thành công',
            'success'
        );
        loadData();

    } catch (err) {
        console.error(err);
        // Lỗi mạng hoặc parse JSON
        showToast('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
    }
});
// 
// Hàm tạo huy hiệu hạng thành viên
function getTierBadge(tier) {
    if (!tier) return '<span class="badge bg-secondary">Thành viên</span>';
    
    const t = tier.toLowerCase();
    
    switch (t) {
        case 'diamond':
            // Màu xanh dương sáng + Icon Kim cương
            return `<span class="badge bg-info text-white border border-light shadow-sm">
                        <i class="fas fa-gem me-1"></i>Kim Cương
                    </span>`;
        case 'gold':
            // Màu vàng + Icon Vương miện
            return `<span class="badge bg-warning text-dark border border-warning shadow-sm">
                        <i class="fas fa-crown me-1"></i>Vàng
                    </span>`;
        case 'silver':
            // Màu xám bạc + Icon Huân chương
            return `<span class="badge bg-secondary border border-secondary shadow-sm">
                        <i class="fas fa-medal me-1"></i>Bạc
                    </span>`;
        case 'bronze':
            // Màu đồng (hoặc tối) + Icon Khiên
            return `<span class="badge" style="background-color: #cd7f32; color: white;">
                        <i class="fas fa-shield-alt me-1"></i>Đồng
                    </span>`;
        default:
            return `<span class="badge bg-light text-dark border">
                        <i class="fas fa-user me-1"></i>${tier}
                    </span>`;
    }
}


// Khởi tạo
loadData();
