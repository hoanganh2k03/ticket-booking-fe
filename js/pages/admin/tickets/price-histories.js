// Import cấu hình từ settings.js
import CONFIG from "../../../utils/settings.js";

const BASE_URL = CONFIG.BASE_URL;
const API_URL = BASE_URL + "/api/tickets/price-histories/";

let priceHistories = [];
let dataTable = null;

const btnBack = document.getElementById("btnBack");
console.log(btnBack);
document.addEventListener("DOMContentLoaded", loadPriceHistories);

async function loadPriceHistories() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Lỗi khi gọi API lịch sử giá");

    const data = await response.json();
    priceHistories = data.results || [];

    renderDataTable(priceHistories);
  } catch (error) {
    console.error("Lỗi khi tải lịch sử thay đổi giá:", error);
    Swal.fire("Lỗi", "Không thể tải lịch sử thay đổi giá", "error");
  }
}

function renderDataTable(data) {
  const formatted = data.map((item, index) => ([
    index + 1,
    item.match_id || "",
    item.section_id || "",
    Number(item.old_price).toLocaleString("vi-VN") + " đ",
    Number(item.new_price).toLocaleString("vi-VN") + " đ",
    new Date(item.effective_date).toLocaleString("vi-VN"),
    new Date(item.changed_at).toLocaleString("vi-VN"),
    `${item.changed_by || ""} - ${item.changed_by_name || "Không rõ"}`,
    item.reason || ""
  ]));

  if (dataTable) {
    dataTable.clear().rows.add(formatted).draw();
  } else {
    dataTable = $('#priceHistoryTable').DataTable({
      data: formatted,
      columns: [
        { title: "STT" },
        { title: "Mã trận" },
        { title: "Mã khu vực" },
        { title: "Giá cũ" },
        { title: "Giá mới" },
        { title: "Ngày hiệu lực" },
        { title: "Thời gian thay đổi" },
        { title: "Mã - Tên NV thực hiện" },
        { title: "Lý do thay đổi" }
      ],
      searching: false,
      lengthChange: false,
      paging: true,
      pageLength: 10,
      language: {
        emptyTable: "Không có dữ liệu",
        paginate: {
          previous: "Trước",
          next: "Sau"
        }
      }
    });
  }
}



// Tìm kiếm người dùng
document.getElementById('ticketSearchInput').addEventListener('input', function (event) {
  const searchTerm = event.target.value.toLowerCase().trim();

  const filtered = priceHistories.filter(history => {
    const matchId = history.match_id?.toString().toLowerCase() || "";
    const changedBy = history.changed_by?.toString().toLowerCase() || "";
    const changedByName = history.changed_by_name?.toLowerCase() || "";
    const combinedInfo = `${changedBy} ${changedByName}`.trim();

    return matchId.includes(searchTerm) || combinedInfo.includes(searchTerm);
  });

  renderDataTable(filtered);
});

function backToTicketsList() {
  console.log("Đã gọi hàm backToTicketsList"); // ✅ kiểm tra click

  const role = localStorage.getItem("role");
  console.log("Role từ localStorage:", role); // ✅ kiểm tra giá trị

  if (role === "admin") {
    console.log("Chuyển trang admin");
    window.location.href = "/pages/admin/base.html#tickets/tickets";
  } else if (role === "staff") {
    console.log("Chuyển trang staff");
    window.location.href = "/pages/staff/base.html#tickets/tickets";
  } else {
    console.warn("Không xác định được vai trò người dùng.");
  }
}



btnBack.addEventListener("click", function (e) {
  e.preventDefault();
  backToTicketsList();
});


window.loadPriceHistories = loadPriceHistories;
window.renderDataTable = renderDataTable;
