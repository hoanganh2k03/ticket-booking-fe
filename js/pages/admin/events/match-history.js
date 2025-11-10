import CONFIG from "../../../utils/settings.js";

const BASE_URL = CONFIG.BASE_URL;
const API_URL = BASE_URL + "/api/events/match-history/";

let matchHistories = [];
let dataTable = null;

const btnBack = document.getElementById("btnBack");

document.addEventListener("DOMContentLoaded", loadMatchHistories);

async function loadMatchHistories() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Lỗi khi gọi API lịch sử trận");

    const data = await response.json();
    matchHistories = data.results || data || [];

    renderDataTable(matchHistories);
  } catch (error) {
    console.error("Lỗi khi tải lịch sử trận:", error);
    Swal.fire("Lỗi", "Không thể tải dữ liệu lịch sử trận", "error");
  }
}

function renderDataTable(data) {
  const formatted = data.map((item, index) => ([
    index + 1,
    item.match_code || "",
    item.old_description || "",
    item.new_description || "",
    formatDatetime(item.old_time),
    formatDatetime(item.new_time),
    formatDatetime(item.changed_at),
    item.employee_info || "Không rõ",
    item.reason || ""
  ]));

  if (dataTable) {
    dataTable.clear().rows.add(formatted).draw();
  } else {
    dataTable = $('#matchHistoryTable').DataTable({
      data: formatted,
      columns: [
        { title: "STT" },
        { title: "Mã trận" },
        { title: "Mô tả (cũ)" },
        { title: "Mô tả (mới)" },
        { title: "Thời gian đấu (cũ)" },
        { title: "Thời gian đấu (mới)" },
        { title: "Thời gian thay đổi" },
        { title: "Nhân viên thay đổi" },
        { title: "Lý do" }
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

function formatDatetime(datetimeStr) {
  if (!datetimeStr) return "-";
  return new Date(datetimeStr).toLocaleString("vi-VN");
}

// Tìm kiếm
document.getElementById('matchHistorySearchInput').addEventListener('input', function (event) {
  const keyword = event.target.value.toLowerCase().trim();

  const filtered = matchHistories.filter(item => {
    const matchCode = item.match_code?.toString().toLowerCase() || "";
    const empInfo = item.employee_info?.toLowerCase() || "";
    return matchCode.includes(keyword) || empInfo.includes(keyword);
  });

  renderDataTable(filtered);
});

// Quay lại danh sách trận
function backToMatchList() {
  const role = localStorage.getItem("role");
  if (role === "admin") {
    window.location.href = "/pages/admin/base.html#events/matchs";
  } else if (role === "staff") {
    window.location.href = "/pages/staff/base.html#events/matchs";
  }
}

btnBack.addEventListener("click", function (e) {
  e.preventDefault();
  backToMatchList();
});

// Cho phép gọi từ ngoài (nếu cần)
window.loadMatchHistories = loadMatchHistories;
window.renderDataTable = renderDataTable;
