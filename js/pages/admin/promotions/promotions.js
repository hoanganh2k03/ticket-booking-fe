import CONFIG from "../../../utils/settings.js";
import { showToast } from "../../../components/toast.js";

// API endpoint
const API_URL = CONFIG.BASE_URL + "/api/promotions/";
console.log("API_URL", API_URL);

// Khai báo biến dữ liệu toàn cục (rỗng ban đầu, sau fetch sẽ được gán)
let promotions = [];
let currentPage = 1;
let pageSize = parseInt(document.getElementById("pageSize").value, 10);
let filtered = [];

// Các tham chiếu đến element của trang
const tbody = document.querySelector("#promotionsTable tbody");
const selectAll = document.getElementById("selectAll");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterQuantity = document.getElementById("filterQuantity");   // "": tất cả, "exhausted": Đã hết mã, "available": Còn mã
const filterEndDate = document.getElementById("filterEndDate");    // "": tất cả, "valid": Chưa hết hạn, "expired": Đã hết hạn
const pageSizeSel = document.getElementById("pageSize");
const pagination = document.getElementById("pagination");
const paginationInfo = document.getElementById("paginationInfo");
const bulkDelete = document.getElementById("bulkDelete");
const bulkToggle = document.getElementById("bulkToggle");
const detailModalEl = document.getElementById('detailModal');
const detailModal = new bootstrap.Modal(detailModalEl);

function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatTime(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Hàm fetch dữ liệu từ API
async function loadPromotions() {
    try {
        const resp = await fetch(API_URL);
        if (!resp.ok) {
            console.error(`Failed to fetch promotions: ${resp.status}`);
            return;
        }
        const data = await resp.json();
        promotions = data.results
            ? data.results.map((p) => ({
                id: p.promo_id,
                code: p.promo_code,
                value: p.discount_value,
                type: p.discount_type,
                start: p.start_time,
                end: p.end_time,
                usage_limit: p.usage_limit,
                status: p.status,
                user: p.user,
                desc: p.description,
                available: p.available,
                used_count: p.used_count,
                lines: p.promotion_details,
            }))
            : [];
        applyFilter();
    } catch (error) {
        console.error("Error fetching promotions:", error);
    }
}

function applyFilter() {
    const q = searchInput.value.toLowerCase();
    const st = filterStatus.value;          // Lọc theo trạng thái (Active/Inactive)
    const quantity = filterQuantity.value;  // "" | "exhausted" | "available"
    const endDateFilter = filterEndDate.value; // "" | "valid" | "expired"
    const now = new Date();

    filtered = promotions.filter((p) => {
        // 1. Lọc theo text (mã hoặc mô tả)
        const text = p.code.toLowerCase() + (p.desc ? p.desc.toLowerCase() : "");
        if (q && !text.includes(q)) return false;

        // 2. Lọc theo trạng thái:
        if (st && String(p.status) !== st) return false;

        // 3. Lọc theo số lượng mã:
        let availableQuantity = (p.usage_limit !== undefined) ? p.usage_limit : 0;
        if (quantity === "exhausted" && availableQuantity > 0) return false;
        if (quantity === "available" && availableQuantity === 0) return false;

        // 4. Lọc theo ngày hết hạn:
        if (endDateFilter === "valid" && new Date(p.end) < now) return false;
        if (endDateFilter === "expired" && new Date(p.end) >= now) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    tbody.innerHTML = "";
    const startIdx = (currentPage - 1) * pageSize;
    const pageData = filtered.slice(startIdx, startIdx + pageSize);

    pageData.forEach((p) => {
        const tr = document.createElement("tr");

        const startDate = formatDate(p.start);
        const startTime = formatTime(p.start);
        const endDate = formatDate(p.end);
        const endTime = formatTime(p.end);

        tr.innerHTML = `
          <td><input type="checkbox" class="selectRow" data-id="${p.id}"></td>
          <td>
            <button class="btn btn-sm btn-link detail-btn" data-id="${p.id}">
              ${p.code}
            </button>
          </td>
          <td>${p.value}${p.type === "percentage" ? "%" : " VNĐ"}</td>
          <td>${p.usage_limit}</td>
          <td>
            ${startDate}<br>
            <small class="time-highlight">${startTime}</small>
          </td>
          <td>
            ${endDate}<br>
            <small class="time-highlight">${endTime}</small>
          </td>
          <td>
            <div class="form-check form-switch">
              <input class="form-check-input status-switch" type="checkbox" 
                     data-id="${p.id}" ${p.status ? "checked" : ""} disabled>
            </div>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-primary update-btn" data-id="${p.id}">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${p.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
    });

    // cập nhật info
    const total = filtered.length;
    const from = startIdx + 1;
    const to = Math.min(total, startIdx + pageSize);
    paginationInfo.textContent = `Hiển thị ${from}–${to} / ${total}`;

    tbody.querySelectorAll(".update-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const promoId = btn.getAttribute("data-id");
            history.pushState({ page: "editPromotion", promoId: promoId }, "", `/pages/admin/promotions/edit_promotions.html?promoId=${promoId}`);
            window.location.href = `/pages/admin/promotions/edit_promotions.html?promoId=${promoId}`;
        });
    });
}

function renderPagination() {
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    pagination.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li");
        li.className = "page-item" + (i === currentPage ? " active" : "");
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = i;
            renderTable();
            renderPagination();
        });
        pagination.appendChild(li);
    }
}

// Sự kiện
searchInput.addEventListener("input", applyFilter);
filterStatus.addEventListener("change", applyFilter);
filterQuantity.addEventListener("change", applyFilter);
filterEndDate.addEventListener("change", applyFilter);
pageSizeSel.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSel.value, 10);
    applyFilter();
});
selectAll.addEventListener("change", () => {
    document
        .querySelectorAll(".selectRow")
        .forEach((cb) => (cb.checked = selectAll.checked));
});

tbody.addEventListener("click", (e) => {
    if (e.target.closest(".detail-btn")) {
        e.preventDefault();
        const id = parseInt(e.target.dataset.id);
        const promo = promotions.find((p) => p.id === id);
        if (promo) {
            showDetail(promo);
            console.log("Clicked detail button, promo=", id);
        }
    }

    if (e.target.closest(".status-switch")) {
        const cb = e.target.closest(".status-switch");
        const id = parseInt(cb.dataset.id);
        const newStatus = cb.checked;

        // Update status qua API (PATCH)
        fetch(`${API_URL}${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });

        // Cập nhật tạm dữ liệu
        const p = promotions.find((p) => p.id === id);
        if (p) p.status = newStatus;
    }

    if (e.target.closest(".delete-btn")) {
        const deleteBtn = e.target.closest(".delete-btn");
        const id = parseInt(deleteBtn.dataset.id);
        console.log("Clicked delete button, id=", id);
        if (confirm(`Bạn có chắn chắn muốn xóa mã khuyến mãi ${id}?`)) {
            fetch(`${API_URL}${id}/`, { method: "DELETE" })
                .then(async resp => {
                    if (resp.ok) {
                        showToast("Xóa Promotion thành công", "success",);
                        loadPromotions();
                    } else {
                        const err = await resp.json();
                        showToast(err.detail || "Có lỗi xảy ra khi xóa", "danger",);
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast("Không thể kết nối đến server", "danger",);
                });
        }
    }
});

bulkDelete.addEventListener("click", () => {
    const ids = Array.from(document.querySelectorAll(".selectRow:checked")).map(
        (cb) => cb.dataset.id
    );
    if (!ids.length) {
        showToast('Chưa chọn mục nào', "warning",);
        return;
    }
    Promise.all(
        ids.map((id) => fetch(`${API_URL}${id}/`, { method: "DELETE" }))
    ).then(() => loadPromotions());
});

bulkToggle.addEventListener("click", () => {
    const ids = Array.from(document.querySelectorAll(".selectRow:checked"))
        .map(cb => parseInt(cb.dataset.id));
    if (!ids.length) {
        showToast('Chưa chọn mục nào', "warning",);
        return;
    }

    const anyInactive = promotions.some(p => ids.includes(p.id) && !p.status);

    fetch(`${API_URL}bulk_toggle/`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: anyInactive })
    })
        .then(async resp => {
            const data = await resp.json();
            if (!resp.ok) {
                showToast(data.detail || 'Có lỗi xảy ra', "danger",);
                return;
            }
            showToast(`Đã cập nhật trạng thái của ${data.updated} mã.`, "success",);
            loadPromotions();
        })
        .catch(err => {
            console.error(err);
            showToast('Không thể kết nối đến server', "danger",);
        });
});

function formatDateTime(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    // Ví dụ locale 'vi-VN', dateStyle short, timeStyle short
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(d);
}

function showDetail(p) {
    console.log("Clicked detail button, promo=", p);

    const startFormatted = formatDateTime(p.start);
    const endFormatted = formatDateTime(p.end);

    // Cập nhật các thông tin chung
    detailModalEl.querySelector("#detailCode").textContent = p.code;

    detailModalEl.querySelector("#detailValue").textContent =
        p.value + (p.type === "percentage" ? "%" : " VNĐ");

    detailModalEl.querySelector("#detailQuantity").textContent =
        `${p.usage_limit}`;

    detailModalEl.querySelector("#detailTime").textContent =
        `${startFormatted} → ${endFormatted}`;

    detailModalEl.querySelector("#detailUser").textContent =
        p.user.full_name || "";

    detailModalEl.querySelector("#detailDesc").textContent = p.desc || "";

    // 3. Gom tất cả section theo match
    const grouped = {};
    (p.lines || []).forEach((item) => {
        const m = item.match_name;

        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(item.section_name);
    });

    // 4. Hiển thị “áp dụng cho”
    const container = detailModalEl.querySelector("#detailLinesContainer");
    container.innerHTML = "";

    Object.entries(grouped).forEach(([matchName, sections]) => {
        const card = document.createElement("div");
        card.className = "card mb-3 shadow-sm";

        card.innerHTML = `
        <div class="card-header bg-secondary text-white fw-bold">
          ${matchName}
        </div>
        <div class="card-body"></div>
      `;

        const body = card.querySelector(".card-body");
        const row = document.createElement("div");
        row.className = "d-flex flex-wrap gap-2";

        sections.forEach((secName) => {
            const badge = document.createElement("span");
            badge.className = "badge bg-warning text-dark p-2";
            badge.textContent = secName;
            row.appendChild(badge);
        });

        body.appendChild(row);
        container.appendChild(card);
    });

    detailModal.show();
}

// Khởi tạo load dữ liệu từ API
loadPromotions();

detailModalEl.addEventListener('hidden.bs.modal', () => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
});
