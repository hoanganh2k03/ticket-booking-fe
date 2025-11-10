import CONFIG from "../../../utils/settings.js";
import { showToast } from "../../../components/toast.js";
const API_BASE = CONFIG.BASE_URL + "/api";

// Hàm thiết lập giá trị tối đa cho input discount_value
function setMaxValue(discountType) {
    const discountValueInput = document.getElementById("discount_value");
    if (!discountValueInput) return;

    if (discountType === "percentage") {
        discountValueInput.max = 100;
        discountValueInput.min = 1;
    } else {
        discountValueInput.max = 10000000;
        discountValueInput.min = 1000;
    }
}

function toDatetimeLocal(date) {
    const pad = n => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

// Hàm lấy danh sách match từ API
async function fetchMatches() {
    try {
        const resp = await fetch(`${API_BASE}/promotions/match/`);
        if (!resp.ok) throw new Error(`Lỗi khi fetch matches: ${resp.status}`);
        const data = await resp.json();
        return data.results || data;
    } catch (err) {
        console.error(err);
        return [];
    }
}

// Hàm lấy danh sách section theo match_id từ API
async function fetchSections(matchId) {
    try {
        const resp = await fetch(`${API_BASE}/promotions/section/?match=${matchId}`);
        if (!resp.ok) throw new Error(`Lỗi khi fetch sections: ${resp.status}`);
        const data = await resp.json();
        return data.results || data;
    } catch (err) {
        console.error(err);
        return [];
    }
}


// Hàm fetch thông tin Promotion theo promoId
async function fetchPromotion(promoId) {
    try {
        const response = await fetch(`${API_BASE}/promotions/${promoId}/`);
        if (!response.ok) {
            throw new Error(`Error fetching promotion: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        showToast("Có lỗi khi tải thông tin Promotion.", "danger",);
        return null;
    }
}

// Hàm cập nhật nội dung giao diện với dữ liệu Promotion
async function populateEditForm(data) {
    if (!data) return;

    // Lưu dữ liệu gốc vào biến toàn cục để dùng khi cập nhật
    window.currentPromotion = data;

    // Cập nhật thông tin hiển thị bên trái
    infoPromoCode.textContent = data.promo_code;
    infoDiscount.textContent =
        data.discount_type === "percentage"
            ? `${data.discount_value}%`
            : `${data.discount_value} VNĐ`;
    infoTime.textContent = `${new Date(data.start_time).toLocaleDateString()} - ${new Date(data.end_time).toLocaleDateString()}`;
    infoStatus.textContent = data.status ? "Đang kích hoạt" : "Tạm dừng";
    infoUser.textContent = data.user.full_name || "N/A";

    // Thiết lập min cho ô end_time: không được nhỏ hơn thời gian hiện tại
    const nowStr = new Date().toISOString().slice(0, 16);
    endTimeInput.value = data.end_time.slice(0, 16);
    endTimeInput.min = nowStr;

    // Cập nhật các trường trong form chỉnh sửa (luôn cho phép chỉnh sửa những field cơ bản)
    endTimeInput.value = data.end_time.slice(0, 16);
    usageLimitInput.value = data.usage_limit;
    descriptionInput.value = data.description || "";

    // Nếu Promotion chưa được dùng (giả sử data.used_count === 0 hoặc không tồn tại),
    // cho phép chỉnh sửa thêm các trường khác
    const extraFieldsContainer = document.getElementById("extraFields");
    if (!data.used_count || data.used_count === 0) {
        const startTimeValue = data.start_time.slice(0, 16);
        // Kiểm tra nếu ngày bắt đầu > hiện tại thì cho phép chỉnh sửa, ngược lại disable
        const isEditable = new Date(data.start_time) > new Date();
        extraFieldsContainer.innerHTML = `
        <div class="mb-3">
            <label for="promo_code" class="form-label">Mã Promotion</label>
            <input type="text" class="form-control" id="promo_code" value="${data.promo_code}">
        </div>
        <div class="mb-3">
            <label for="discount_value" class="form-label">Giá trị giảm</label>
            <input type="number" class="form-control" id="discount_value" value="${data.discount_value}">
        </div>
        <div class="mb-3">
            <label for="discount_type" class="form-label">Loại giảm</label>
            <select class="form-select" id="discount_type">
            <option value="percentage" ${data.discount_type === 'percentage' ? "selected" : ""}>Phần trăm</option>
            <option value="amount" ${data.discount_type === 'amount' ? "selected" : ""}>VNĐ</option>
            </select>
        </div>
        <div class="mb-3">
            <label for="start_time" class="form-label">Ngày bắt đầu</label>
            <input type="datetime-local" class="form-control" id="start_time" value="${startTimeValue}" min="${nowStr}" ${isEditable ? "" : "disabled"}>
        </div>
    `;

        // Thiết lập giá trị tối đa cho input discount_value dựa trên loại giảm
        const discountValueInput = document.getElementById("discount_value");
        const discountTypeSelect = document.getElementById("discount_type");
        if (discountValueInput && discountTypeSelect) {
            setMaxValue(discountTypeSelect.value);
            discountTypeSelect.addEventListener("change", function () {
                setMaxValue(this.value);
            });
        }
    } else {
        extraFieldsContainer.innerHTML = "";
    }

    // Hiển thị danh sách áp dụng khuyến mãi (xử lý như cũ)
    appliedList.innerHTML = "";
    if (data.promotion_details && Array.isArray(data.promotion_details)) {
        const detailsByMatch = data.promotion_details.reduce((acc, line) => {
            if (!acc[line.match]) acc[line.match] = { sections: [], lines: [] };
            acc[line.match].sections.push(line.section);
            acc[line.match].lines.push(line);
            return acc;
        }, {});

        for (const [matchIdStr, group] of Object.entries(detailsByMatch)) {
            const matchId = parseInt(matchIdStr, 10);
            const allSections = await fetchSections(matchId);
            const sectionIds = allSections.map(s => parseInt(s.section_id, 10));
            const uniqueSections = [...new Set(group.sections)];
            const coversAll = uniqueSections.length === sectionIds.length && sectionIds.every(id => uniqueSections.includes(id));
            const matchName = group.lines[0].match_name || "Unknown Match";

            if (coversAll) {
                const displayText = `${matchName} - Tất cả khu vực`;
                appliedList.appendChild(createAppliedRow(matchId, 0, displayText));
            } else {
                group.lines.forEach(line => {
                    const rawSection = line.section_name;
                    const sectionDisplay = rawSection.includes(" - ") ? rawSection.split(" - ")[0].trim() : rawSection;
                    const displayText = `${matchName} - ${sectionDisplay}`;
                    appliedList.appendChild(createAppliedRow(matchId, line.section, displayText));
                });
            }
        }
    }
}

// Hàm tải dữ liệu Promotion và cập nhật giao diện
async function loadPromotion(promoId) {
    const data = await fetchPromotion(promoId);
    populateEditForm(data);
}

// Hàm lấy danh sách các dòng đã áp dụng từ giao diện
function getAppliedLines() {
    const lines = [];
    appliedList.querySelectorAll("li").forEach((li) => {
        const match = parseInt(li.getAttribute("data-match"), NaN);
        const section = parseInt(li.getAttribute("data-section"), NaN);
        if (!isNaN(match) && !isNaN(section)) {
            lines.push({ match, section });
        }
    });
    return lines;
}

// Hàm chuyển đổi danh sách applied lines từ giao diện
// Nếu data-section là "0" (All Section) thì tự động lấy tất cả các section cho match đó
async function getProcessedAppliedLines() {
    const lines = [];
    const appliedItems = appliedList.querySelectorAll("li");
    for (const li of appliedItems) {
        const matchIdStr = li.getAttribute("data-match");
        const sectionIdStr = li.getAttribute("data-section");
        const matchId = parseInt(matchIdStr, 10);

        // Nếu section = "0", lấy tất cả section của match đó từ API
        if (sectionIdStr === "0") {
            const sections = await fetchSections(matchIdStr);
            sections.forEach((section) => {
                lines.push({ match: matchId, section: parseInt(section.section_id, 10) });
            });
        } else {
            const sectionId = parseInt(sectionIdStr, 10);
            if (!isNaN(matchId) && !isNaN(sectionId)) {
                lines.push({ match: matchId, section: sectionId });
            }
        }
    }
    return lines;
}

// Hàm cập nhật Promotion qua API
async function updatePromotion(promoId) {
    if (!window.currentPromotion) {
        showToast("Dữ liệu Promotion chưa được tải.", "danger");
        return;
    }

    // Xây dựng object cập nhật dựa trên currentPromotion và dữ liệu từ form
    // Nếu Promotion chưa được sử dụng, cập nhật thêm các trường extra từ container extraFields
    const updatedData = {
        promo_code: window.currentPromotion.promo_code,
        discount_value: window.currentPromotion.discount_value,
        discount_type: window.currentPromotion.discount_type,
        start_time: toDatetimeLocal(new Date(window.currentPromotion.start_time)),
        end_time: toDatetimeLocal(new Date(endTimeInput.value)), // "YYYY-MM-DDTHH:MM"
        usage_limit: parseInt(usageLimitInput.value, 10),
        description: descriptionInput.value,
        status: window.currentPromotion.status,
        user_id: localStorage.getItem("employee_id"),
    };

    // Nếu promotion chưa dùng, cập nhật các trường bổ sung từ extraFields
    if (!window.currentPromotion.used_count || window.currentPromotion.used_count === 0) {
        const promoCodeInput = document.getElementById("promo_code");
        const discountValueInput = document.getElementById("discount_value");
        const discountTypeSelect = document.getElementById("discount_type");
        const startTimeInputExtra = document.getElementById("start_time");
        if (promoCodeInput && discountValueInput && discountTypeSelect && startTimeInputExtra) {
            updatedData.promo_code = promoCodeInput.value;
            updatedData.discount_value = parseFloat(discountValueInput.value);
            updatedData.discount_type = discountTypeSelect.value;
            updatedData.start_time = startTimeInputExtra.value;
        }
    }

    // Lấy danh sách applied lines đã xử lý (bulk xử lý All Section nếu có)
    const appliedLines = await getProcessedAppliedLines();
    updatedData.lines = appliedLines.length > 0 ? appliedLines : [];

    console.log("Updated data:", updatedData);

    try {
        const resp = await fetch(`${API_BASE}/promotions/${promoId}/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedData),
        });
        if (!resp.ok) {
            const errData = await resp.json();
            throw new Error(`Error updating promotion: ${JSON.stringify(errData)}`);
        }
        const data = await resp.json();
        showToast("Cập nhật mã khuyến mãi thành công! Đang chuyển hướng đến trang danh sách...", "success");
        setTimeout(() => {
            const role = localStorage.getItem("role");
            if (role === "staff") { 
                window.location.href = "/pages/staff/base.html#promotions/promotions";
            }
            else {
                window.location.href = "/pages/admin/base.html#promotions/promotions";
            }
        }, 3000);
    } catch (error) {
        console.error(error);
        let message = "Có lỗi khi cập nhật Promotion.";
        try {
            const jsonPart = error.message.split("Error updating promotion: ")[1];
            if (jsonPart) {
                const errObj = JSON.parse(jsonPart);
                const firstValue = Object.values(errObj)[0];
                message = Array.isArray(firstValue) ? firstValue[0] : firstValue;
            }
        } catch (e) {
            console.error("Lỗi khi parse message:", e);
        }
        showToast(message, "danger");
    }
}

// Tạo row trong danh sách áp dụng
function createAppliedRow(matchId, sectionId, displayText) {
    const li = document.createElement("li");
    li.className =
        "list-group-item d-flex justify-content-between align-items-center";

    li.setAttribute("data-match", matchId);
    li.setAttribute("data-section", sectionId);

    const spanText = document.createElement("span");
    spanText.className = "applied-text";
    spanText.textContent = displayText;
    li.appendChild(spanText);

    const btnRemove = document.createElement("button");
    btnRemove.className = "btn btn-sm btn-outline-danger remove-applied";
    btnRemove.type = "button";
    btnRemove.innerHTML = `<i class="bi bi-x-circle"></i>`;
    btnRemove.addEventListener("click", () => {
        li.remove();
    });
    li.appendChild(btnRemove);

    return li;
}


document.addEventListener("DOMContentLoaded", async () => {
    // DOM element reference
    const btnBack = document.getElementById("btnBack");
    window.infoPromoCode = document.getElementById("infoPromoCode");
    window.infoDiscount = document.getElementById("infoDiscount");
    window.infoTime = document.getElementById("infoTime");
    window.infoStatus = document.getElementById("infoStatus");
    window.infoUser = document.getElementById("infoUser");

    window.endTimeInput = document.getElementById("end_time");
    window.usageLimitInput = document.getElementById("usage_limit");
    window.descriptionInput = document.getElementById("description");

    window.bulkMatch = document.getElementById("bulk_match");
    const btnBulkApply = document.getElementById("btnBulkApply");

    // Elements for "Theo Section" (fixed inputs instead of dynamic rows)
    window.sectionMatchSel = document.getElementById("section_match");
    const btnApplySection = document.getElementById("btnApplySection");

    window.appliedList = document.getElementById("appliedList");

    const btnCancel = document.getElementById("btnCancel");
    const btnUpdate = document.getElementById("btnUpdate");

    // ----------------- PHẦN GỌI API CHO DANH SÁCH TRẬN ĐẤU VÀ SECTION -----------------
    (async function updateMatchList() {
        const matches = await fetchMatches();
        if (matches && matches.length > 0) {
            bulkMatch.innerHTML = `<option value="">--Chọn trận đấu--</option>`;
            sectionMatchSel.innerHTML = `<option value="">--Chọn trận đấu--</option>`;

            matches.forEach((match) => {
                const opt1 = document.createElement("option");
                opt1.value = match.match_id;
                opt1.textContent = `${match.display} - ${match.match_time_fmt}`;
                bulkMatch.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = match.match_id;
                opt2.textContent = `${match.display} - ${match.match_time_fmt}`;
                sectionMatchSel.appendChild(opt2);
            });
        }
    })();

    // Khi chọn match trong tab "Theo Section", gọi API lấy danh sách section của match đó
    sectionMatchSel.addEventListener("change", async () => {
        const matchId = sectionMatchSel.value;
        if (matchId) {
            const sections = await fetchSections(matchId);
            const sectionSectionSel = document.getElementById("section_section");
            sectionSectionSel.innerHTML = `<option value="">--Chọn khu vực--</option>`;
            if (sections && sections.length > 0) {
                sections.forEach((section) => {
                    const opt = document.createElement("option");
                    opt.value = section.section_id;
                    opt.textContent = section.section_name;
                    sectionSectionSel.appendChild(opt);
                });
            } else {
                sectionSectionSel.innerHTML = `<option value="">Không có section</option>`;
            }
        }
    });
    // ----------------- HẾT PHẦN GỌI API -----------------

    btnBulkApply.addEventListener("click", () => {
        if (!bulkMatch.value) {
            showToast("Chưa chọn trận đấu để áp dụng!", 'warning');
            return;
        }
    
        const selectedMatchId = bulkMatch.value;
        const selectedMatchText = bulkMatch.options[bulkMatch.selectedIndex].text;
    
        // Nếu đã áp dụng toàn bộ khu vực trước đó, báo lỗi
        const hasAll = Array.from(appliedList.children).some(li =>
            li.getAttribute("data-match") === selectedMatchId && li.getAttribute("data-section") === "0"
        );
        if (hasAll) {
            showToast("Đã áp dụng toàn bộ khu vực cho trận này rồi!", 'warning');
            return;
        }
    
        // Xóa tất cả các dòng đã áp dụng cho match này
        Array.from(appliedList.children)
            .filter(li => li.getAttribute("data-match") === selectedMatchId)
            .forEach(li => li.remove());
    
        // Thêm một dòng mới cho tất cả khu vực
        appliedList.appendChild(createAppliedRow(selectedMatchId, "0", `${selectedMatchText} - Tất cả khu vực`));
    });
    

    btnApplySection.addEventListener("click", () => {
        const matchId = sectionMatchSel.value; // match id
        const sectionId = document.getElementById("section_section").value; // section id
        if (!matchId || !sectionId) {
            showToast("Chọn trận đấu và khu vực trước khi áp dụng!", 'warning',);
            return;
        }
        const selectedMatchText =
            sectionMatchSel.options[sectionMatchSel.selectedIndex].text;
        const selectedSectionText =
            document.getElementById("section_section").options[
                document.getElementById("section_section").selectedIndex
            ].text;

        let existsAll = Array.from(appliedList.children).some(
            (li) =>
                li.getAttribute("data-match") === matchId &&
                li.getAttribute("data-section") === "0" // giả sử "All Section" là 0
        );
        if (existsAll && sectionId !== "0") {
            showToast(
                `Đã có '${selectedMatchText} - Tất cả khu vực' trong danh sách, không thể thêm chi tiết!`,
                "danger",
            );
            return;
        }
        let exists = Array.from(appliedList.children).some(
            (li) =>
                li.getAttribute("data-match") === matchId &&
                li.getAttribute("data-section") === sectionId
        );
        if (exists) {
            showToast("Sự kết hợp match và section này đã tồn tại!", "danger",);
            return;
        }
        const displayText = `${selectedMatchText} - ${selectedSectionText}`;
        const li = createAppliedRow(matchId, sectionId, displayText);
        appliedList.appendChild(li);
    });

    btnCancel.addEventListener("click", () => {
        if (confirm("Bạn có chắc muốn hủy mọi thay đổi?")) {
            window.location.reload();
        }
    });

    btnBack.addEventListener("click", (e) => {
        e.preventDefault();
        const role = localStorage.getItem("role");
        if (role === "staff") {
            window.location.href = "/pages/staff/base.html#promotions/promotions"; // Trang chính của staff
        } else {
            window.location.href = "/pages/admin/base.html#promotions/promotions"; // Trang chính của admin
        }
    });

    btnUpdate.addEventListener("click", async (e) => {
        e.preventDefault();
        const promoId = btnUpdate.getAttribute("data-promo-id");
        if (!promoId) {
            showToast("Không xác định được Mã khuyến mãi cần sửa.", "danger",);
            return;
        }

        // Nếu Promotion đã được sử dụng, kiểm tra số lượng mã phải >= số mã đã sử dụng
        const usageLimit = parseInt(usageLimitInput.value, 10);
        if (usageLimit == 0) {
            showToast(`Số lượng mã thêm vào phải lớn hơn 0.`, "warning");
            return;
        }

        // Kiểm tra các trường bắt buộc luôn có (ví dụ: end_time, usage_limit)
        if (!endTimeInput.value.trim() || !usageLimitInput.value.trim()) {
            showToast("Vui lòng nhập đầy đủ thông tin bắt buộc (ngày kết thúc, số lượng mã).", "warning",);
            return;
        }

        // Nếu container extraFields có nội dung
        const extraFieldsContainer = document.getElementById("extraFields");
        if (extraFieldsContainer.innerHTML.trim() !== "") {
            // Kiểm tra các input bổ sung: promo_code, discount_value, discount_type, start_time
            const promoCodeInput = document.getElementById("promo_code");
            const discountValueInput = document.getElementById("discount_value");
            const discountTypeSelect = document.getElementById("discount_type");
            const startTimeInputExtra = document.getElementById("start_time");
            if (
                !promoCodeInput.value.trim() ||
                !discountValueInput.value.trim() ||
                !discountTypeSelect.value.trim() ||
                !startTimeInputExtra.value.trim()
            ) {
                showToast("Vui lòng nhập đầy đủ thông tin bắt buộc cho các trường: Mã Promotion, Giá trị giảm, Loại giảm, Ngày bắt đầu.", "warning",);
                return;
            }

            // Bắt lỗi cho input
            promoCodeInput.addEventListener("input", function () {
                if (this.validity.patternMismatch) {
                    this.classList.add("is-invalid");
                } else {
                    this.classList.remove("is-invalid");
                }
            });

            // Similarly, validate discount_value input
            discountValueInput.addEventListener("input", function () {
                const allowedMax = parseFloat(this.max);
                const currentVal = parseFloat(this.value);
                if (!isNaN(currentVal) && currentVal > allowedMax) {
                    this.classList.add("is-invalid");
                } else {
                    this.classList.remove("is-invalid");
                }
            });

            // Validate start_time: đảm bảo start_time < end_time
            startTimeInputExtra.addEventListener("input", function () {
                const startInput = this;
                const endInput = document.getElementById("end_time");
                if (
                    endInput.value &&
                    new Date(startInput.value) >= new Date(endInput.value)
                ) {
                    startInput.classList.add("is-invalid");
                } else {
                    startInput.classList.remove("is-invalid");
                }
            });
        }

        await updatePromotion(promoId);
    });

    // ----------------- LOAD THÔNG TIN PROMOTION TỪ API -----------------
    // Lấy promoId từ URL
    const params = new URLSearchParams(window.location.search);
    const promoId = params.get("promoId");
    if (!promoId) {
        showToast("Không xác định được Promotion cần sửa.", "danger",);
        return;
    }
    btnUpdate.setAttribute("data-promo-id", promoId);
    await loadPromotion(promoId);
    // ----------------- HẾT LOAD THÔNG TIN -----------------
});

(function () {
    "use strict";
    const form = document.getElementById("editPromotionForm");
    form.addEventListener("submit", function (event) {
        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        form.classList.add("was-validated");
    }, false);
})();



// Validate end_time: đảm bảo end_time > start_time
document.getElementById("end_time").addEventListener("input", function () {
    const startInput = document.getElementById("start_time");
    const endInput = this;
    if (
        startInput.value &&
        new Date(startInput.value) >= new Date(endInput.value)
    ) {
        endInput.classList.add("is-invalid");
    } else {
        endInput.classList.remove("is-invalid");
    }
});
