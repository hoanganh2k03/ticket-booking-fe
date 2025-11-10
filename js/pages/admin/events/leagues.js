// Import cấu hình từ settings.js
import CONFIG from "../../../utils/settings.js";

// API endpoint
const API_URL = CONFIG.BASE_URL + "/api/events/leagues/";
console.log("API_URL", API_URL); // Debug URL API

// Biến toàn cục
let leagues = [];
let filteredLeagues = [];

// DOM Elements
const tbody = document.querySelector("#leagueTable tbody");
const detailModalEl = document.getElementById('detailModal');
let detailModal = null;
if (detailModalEl) {
  detailModal = new bootstrap.Modal(detailModalEl);
}

// Fetch dữ liệu giải đấu
async function loadLeaguesPage(event) {
  if (event) event.preventDefault();

  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) {
      console.error(`Lỗi khi tải dữ liệu giải đấu: ${resp.status}`);
      Swal.fire('Lỗi', 'Không thể tải danh sách giải đấu', 'error');
      return;
    }

    const data = await resp.json();
    console.log("Dữ liệu từ API:", data);

    leagues = data.results
      ? data.results.map((l) => ({
          id: l.league_id,
          name: l.league_name,
          type: l.league_type,
          start: l.start_date,
          end: l.end_date,
          created: l.created_at,
          updated: l.updated_at,
          has_matches: l.has_matches // ⚠️ Thêm dòng này để xử lý nút cập nhật
        }))
      : [];

    applyFilter(); // Gọi sau khi fetch xong
  } catch (error) {
    console.error("Lỗi khi tải danh sách giải đấu:", error);
    Swal.fire('Lỗi', 'Không thể tải danh sách giải đấu', 'error');
  }
}

// Render bảng
function applyFilter() {
  filteredLeagues = leagues;

  tbody.innerHTML = filteredLeagues.map((league, index) => {
    let leagueTypeName;
    switch (league.type) {
      case 0:
        leagueTypeName = 'Giải Vô địch quốc gia';
        break;
      case 1:
        leagueTypeName = 'Giải Đấu loại trực tiếp';
        break;
      case 2:
        leagueTypeName = 'Giải Giao hữu';
        break;
      default:
        leagueTypeName = 'Không xác định';
    }

    // Cột nút cập nhật
    let updateColumn = '';
    if (league.has_matches) {
      updateColumn = `<span class="badge bg-secondary">Giải đã tổ chức</span>`;
    } else {
      updateColumn = `
        <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${league.id}">
          <i class="bi bi-pencil-square"></i> Cập nhật
        </button>`;
    }

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${league.name}</td>
        <td>${leagueTypeName}</td>
        <td>${league.start}</td>
        <td>${league.end}</td>
        <td>${league.created}</td>
        <td>${league.updated}</td>
        <td>
          ${updateColumn}
          <button class="btn btn-sm btn-outline-danger delete-stadium-btn" data-id="${league.id}">
            <i class="bi bi-trash"></i> Xóa
          </button>
        </td>
      </tr>`;
  }).join('');
  attachEventListeners(); // Cần có sau khi render lại DOM


  // DataTable (chỉ khởi tạo 1 lần)
  if (!$.fn.DataTable.isDataTable('#leagueTable')) {
    $('#leagueTable').DataTable();
  }
}


document.getElementById('searchLeagueInput').addEventListener('input', function (e) {
  const searchTerm = e.target.value.toLowerCase();
  $('#leagueTable').DataTable().search(searchTerm).draw();
});


// Gắn các sự kiện Xóa, Cập nhật
function attachEventListeners() {
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function () {
      const leagueId = this.getAttribute('data-id');
      window.location.href = `events/edit_leagues.html?id=${leagueId}`;
    });
  });


  document.querySelectorAll('.delete-stadium-btn').forEach(button => {
    button.addEventListener('click', async function () {
      const leagueId = this.getAttribute('data-id');

      const confirmResult = await Swal.fire({
        title: 'Xác nhận',
        text: 'Bạn có chắc chắn muốn xóa giải đấu này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
      });

      if (confirmResult.isConfirmed) {
        try {
          const res = await fetch(`${API_URL}${leagueId}/`, {
            method: 'DELETE'
          });

          if (res.status === 204) {
            Swal.fire('Đã xóa!', 'Giải đấu đã được xóa.', 'success');
            await loadLeaguesPage();
          } else {
            const data = await res.json();  // Lấy thông tin lỗi
            const errorMessage = data?.error || 'Không thể xóa giải đấu.';
            
            Swal.fire('Không thể xóa', errorMessage, 'warning');
          }

        } catch (err) {
          console.error(err);
          Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa giải đấu.', 'error');
        }
      }
    });
  });
}


// Tải dữ liệu ban đầu
loadLeaguesPage();
