import CONFIG from "../../../utils/settings.js";
const API_BASE = `${CONFIG.BASE_URL}/api/returns`;
import { showToast } from "../../../components/toast.js";


let returnsTable;
$(document).ready(function () {
    // 2. Khởi tạo DataTable
    returnsTable = $("#returns-table").DataTable({
        ajax: {
            url: `${API_BASE}/`,
            type: "GET",
            dataSrc: "results",
        },
        processing: true,
        serverSide: false, // dùng client-side paging nếu API đã paginate
        responsive: true,
        autoWidth: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50],
        dom:
            `<"d-flex justify-content-between mb-3"<"col-auto"l><"col-auto"f>>` +
            `rt` +
            `<"d-flex justify-content-between mt-3"<"col-auto"i><"col-auto"p>>`,
        columns: [
            { data: "return_id", title: "#" },
            { data: "customer", title: "Khách hàng" },
            { data: "seat_code", title: "Mã vé" },
            {
                data: "original_price",
                title: "Giá gốc",
                render: $.fn.dataTable.render.number(",", ".", 0, ""),
            },
            { data: "return_reason", title: "Lý do" },
            {
                data: "return_time",
                title: "Ngày gửi",
                render: d => new Date(d).toLocaleString(),
            },
            {
                data: null,
                title: "Hành động",
                orderable: false,
                createdCell: function (td) {
                    // set flex container cho cell
                    $(td).css({
                        display: "flex",
                        "justify-content": "center",
                        gap: "0.5rem",
                    });
                },
                render: row => {
                    // nếu vẫn đang pending thì cho hai nút
                    if (row.return_status === "pending") {
                        return `
              <button
                class="btn btn-success btn-round"
                onclick="openProcessModal(${row.return_id}, ${row.original_price})"
                title="Xử lý hoàn vé"
              >
                <i class="bi bi-check-lg"></i>
              </button>
              <button
                class="btn btn-danger btn-round"
                onclick="openRejectModal(${row.return_id})"
                title="Từ chối hoàn vé"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            `;
                    }
                    // ngược lại hiển thị badge
                    let badge = "";
                    if (row.return_status === "completed") {
                        badge = `<span class="badge bg-success">Đã hoàn vé</span>`;
                    } else if (row.return_status === "rejected") {
                        badge = `<span class="badge bg-danger">Đã Từ chối</span>`;
                    } else if (row.return_status === "approved") {
                        badge = `<span class="badge bg-primary">Đã duyệt</span>`;
                    } else {
                        badge = `<span class="badge bg-secondary">${row.return_status}</span>`;
                    }
                    return badge;
                },
            },
        ],
        language: {
            emptyTable: "Không có yêu cầu nào",
            processing: "Đang tải…",
            paginate: { previous: "‹", next: "›" },
            info: "Hiển thị _START_ đến _END_ của _TOTAL_ yêu cầu",
            lengthMenu: "Hiển thị _MENU_",
            search: "Tìm:",
        },
    });

    // 3. Tìm kiếm client-side
    $("#searchInput").on("keyup", function () {
        returnsTable.search(this.value).draw();
    });
});

// 4. Mở modal “Xử lý hoàn vé”
window.openProcessModal = function (returnId, originalPrice) {
    $("#processReturnId").val(returnId);
    // gợi ý hoàn 80% hoặc giữ nguyên giá gốc
    $("#refundAmount").val((originalPrice * 0.8).toFixed(0));
    $("#processNote").val("");
    new bootstrap.Modal(document.getElementById("processModal")).show();
};

// 5. Xử lý submit modal Process
// $("#btnProcess").off("click").on("click", function () {
//     const id = $("#processReturnId").val();
//     const method = $("#refundMethod").val();
//     const amount = $("#refundAmount").val();
//     const note = $("#processNote").val();

//     $.ajax({
//         url: `${API_BASE}/${id}/process/`,
//         method: "POST",
//         data: { refund_method: method, refund_amount: amount, note, employee: localStorage.getItem("employee_id") },
//     })
//         .done(() => {
//             bootstrap.Modal.getInstance(
//                 document.getElementById("processModal")
//             ).hide();
//             returnsTable.ajax.reload(null, false);
//             showToast("Hoàn vé đã được xử lý", "success");
//         })
//         .fail(xhr => {
//             const msg = xhr.responseJSON?.detail || "Có lỗi xảy ra";
//             showToast(msg, "error");
//         });
// });
// 5. Xử lý submit modal Process
// 5. Xử lý submit modal Process
$("#btnProcess").off("click").on("click", function () {
    // --- BẮT ĐẦU THÊM ---
    const $btn = $(this); // Lấy chính nút đó
    const originalHtml = $btn.html(); // Lưu lại nội dung HTML gốc (ví dụ: "Xác nhận")

    // Vô hiệu hóa nút và hiển thị trạng thái "Đang xử lý"
    $btn.prop("disabled", true).html(
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...'
    );
    // --- KẾT THÚC THÊM ---

    const id = $("#processReturnId").val();
    const method = $("#refundMethod").val();
    const amount = $("#refundAmount").val();
    const note = $("#processNote").val();

    $.ajax({
        url: `${API_BASE}/${id}/process/`,
        method: "POST",
        data: { refund_method: method, refund_amount: amount, note, employee: localStorage.getItem("employee_id") },
    })
        .done(() => {
            bootstrap.Modal.getInstance(
                document.getElementById("processModal")
            ).hide();
            returnsTable.ajax.reload(null, false);
            showToast("Hoàn vé đã được xử lý", "success");
        })
        .fail(xhr => {
            const msg = xhr.responseJSON?.detail || "Có lỗi xảy ra";
            showToast(msg, "error");
        })
        // --- THÊM KHỐI NÀY ---
        // .always() sẽ luôn chạy sau khi .done() hoặc .fail() hoàn tất
        .always(() => {
            // Kích hoạt lại nút và trả lại nội dung HTML gốc
            $btn.prop("disabled", false).html(originalHtml);
        });
        // --- KẾT THÚC THÊM ---
});

// 6. Mở modal “Từ chối hoàn vé”
window.openRejectModal = function (returnId) {
    $("#rejectReturnId").val(returnId);
    $("#rejectNote").val("");
    new bootstrap.Modal(document.getElementById("rejectModal")).show();
};

// 7. Xử lý submit modal Reject
// $("#btnReject").off("click").on("click", function () {
//     const id         = $("#rejectReturnId").val();
//     const note       = $("#rejectNote").val().trim();
//     const employeeId = localStorage.getItem("employee_id");

//     if (!note) {
//         showToast("Bạn phải nhập lý do từ chối.", "warning");
//         return;
//     }

//     $.ajax({
//         url:    `${API_BASE}/${id}/reject/`,
//         method: "POST",
//         data:   {
//             note:     note,
//             employee: employeeId
//         },
//     })
//     .done(() => {
//         // Ẩn modal
//         bootstrap.Modal
//             .getInstance(document.getElementById("rejectModal"))
//             .hide();

//         // Reload lại bảng dữ liệu
//         returnsTable.ajax.reload(null, false);

//         showToast("Yêu cầu hoàn vé đã bị từ chối", "success");
//     })
//     .fail(xhr => {
//         const msg = xhr.responseJSON?.detail || "Có lỗi xảy ra";
//         showToast(msg, "error");
//     });
// });

// 7. Xử lý submit modal Reject
$("#btnReject").off("click").on("click", function () {
    // --- BẮT ĐẦU THÊM ---
    const $btn = $(this); // Lấy chính nút đó
    const originalHtml = $btn.html(); // Lưu lại nội dung HTML gốc

    // Vô hiệu hóa nút và hiển thị trạng thái "Đang xử lý"
    $btn.prop("disabled", true).html(
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...'
    );
    // --- KẾT THÚC THÊM ---

    const id         = $("#rejectReturnId").val();
    const note       = $("#rejectNote").val().trim();
    const employeeId = localStorage.getItem("employee_id");

    if (!note) {
        showToast("Bạn phải nhập lý do từ chối.", "warning");
        // --- THÊM DÒNG NÀY ---
        // Nếu validate lỗi, cũng phải bật lại nút
        $btn.prop("disabled", false).html(originalHtml);
        return;
    }

    $.ajax({
        url:    `${API_BASE}/${id}/reject/`,
        method: "POST",
        data:   {
            note:     note,
            employee: employeeId
        },
    })
    .done(() => {
        bootstrap.Modal
            .getInstance(document.getElementById("rejectModal"))
            .hide();
        returnsTable.ajax.reload(null, false);
        showToast("Yêu cầu hoàn vé đã bị từ chối", "success");
    })
    .fail(xhr => {
        const msg = xhr.responseJSON?.detail || "Có lỗi xảy ra";
        showToast(msg, "error");
    })
    // --- THÊM KHỐI NÀY ---
    .always(() => {
        // Kích hoạt lại nút và trả lại nội dung HTML gốc
        $btn.prop("disabled", false).html(originalHtml);
    });
    // --- KẾT THÚC THÊM ---
});