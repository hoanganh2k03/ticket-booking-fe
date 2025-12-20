// Import cấu hình từ settings.js
import CONFIG from "../../../utils/settings.js";

// API endpoints
const API_URL = CONFIG.BASE_URL + "/api/events/matches/";
const API_URL2 = CONFIG.BASE_URL + "/api/events/creat/stadiums/";
const SPORTS_API = CONFIG.BASE_URL + "/api/events/sports/";

console.log("API_URL:", API_URL);

// Biến toàn cục
let matches = [];
let filteredMatches = [];
let sportsMap = {}; // sport_id -> sport_name mapping (populated from /api/events/sports/) 

// Load danh sách trận đấu
function loadMatchPage() {
  console.log("loadMatchPage được gọi!");
  const sportSelect = document.getElementById('sportFilter');
  const selectedSport = sportSelect ? sportSelect.value : '';
  const url = selectedSport ? `${API_URL}?sport_id=${encodeURIComponent(selectedSport)}` : API_URL;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const list = data.results || (Array.isArray(data) ? data : (data.data || data));
      matches = list;
      filteredMatches = [...matches];
      renderMatchTable(filteredMatches);

      // Populate sports dropdown if empty
      if (Object.keys(sportsMap).length === 0) {
        loadSportsAndPopulate();
      }
    })
    .catch(error => {
      console.error('Lỗi khi lấy danh sách trận:', error);
      Swal.fire('Lỗi', 'Không thể tải danh sách trận đấu', 'error');
    });
} 

// Render bảng trận
function renderMatchTable(data) {
  const tbody = document.querySelector('#matchTable tbody');
  if (!tbody) {
    console.warn("Không tìm thấy tbody.");
    return;
  }

  // Destroy existing DataTable to avoid duplicate rows on re-render
  if ($.fn.DataTable.isDataTable('#matchTable')) {
    try {
      $('#matchTable').DataTable().destroy();
    } catch (err) {
      console.warn('Error destroying DataTable (ignored):', err);
    }
  }

  tbody.innerHTML = data.map(match => {
    const matchTime = new Date(match.match_time);
    const now = new Date();
    const isPast = matchTime < now;

    let actionButtons = isPast ? `
      <div class="text-danger small mb-1">Trận đã kết thúc</div>
    ` : `
      <button class="btn btn-sm btn-outline-primary me-2" onclick="showUpdateMatchForm(${match.match_id})">
        <i class="bi bi-pencil-square"></i> Cập nhật
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="deleteMatch(${match.match_id})">
        Xóa
      </button>
    `;

    return `
      <tr>
        <td>${match.match_id}</td>
        <td>${match.description}</td>
        <td>${match.round}</td>
        <td>${match.team_1_name}</td>
        <td>${match.team_2_name}</td>
        <td>${match.stadium_name}</td>
        <td>${match.league_name}</td>
        <td>${matchTime.toLocaleString()}</td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join('');

  $('#matchTable').DataTable();
}

// Tìm kiếm realtime
document.getElementById('searchMatchInput').addEventListener('input', function (e) {
  const term = e.target.value.toLowerCase();
  $('#matchTable').DataTable().search(term).draw();
});

// Load and populate sports dropdown
async function loadSportsAndPopulate() {
  try {
    const resp = await fetch(SPORTS_API);
    if (!resp.ok) throw new Error(`Failed to fetch sports: ${resp.status}`);
    const data = await resp.json();
    const list = data.results || (Array.isArray(data) ? data : (data.data || []));

    const sportSelect = document.getElementById('sportFilter');
    if (!sportSelect) return;

    sportSelect.innerHTML = '<option value="">-- Tất cả môn thể thao --</option>';
    list.forEach(s => {
      sportsMap[s.sport_id] = s.sport_name;
      const opt = document.createElement('option');
      opt.value = s.sport_id;
      opt.textContent = s.sport_name;
      sportSelect.appendChild(opt);
    });

    if (!sportSelect.dataset.listenerAttached) {
      sportSelect.addEventListener('change', function () {
        loadMatchPage();
      });
      sportSelect.dataset.listenerAttached = '1';
    }
  } catch (err) {
    console.error('Error loading sports:', err);
  }
}

// Gọi loadSportsAndPopulate và loadMatchPage khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", function () {
  loadSportsAndPopulate();
  loadMatchPage();
});

// Hàm cập nhật trận đấu
async function showUpdateMatchForm(matchId) {
  try {
    const [match, stadiumsData] = await Promise.all([
      fetch(`${API_URL}${matchId}/`).then(res => res.json()),
      fetch(API_URL2).then(res => res.json())
    ]);

    // Nếu đang mở bán vé, chỉ cho cập nhật thời gian và mô tả (có lưu lịch sử)
    if (match.ticket_status === 0) {
      try {
        await window.showUpdateMatchHistoryForm(matchId);
      } catch (e) {
        console.error("Lỗi khi show form cập nhật lịch sử:", e);
        Swal.fire('Lỗi', 'Không thể hiển thị form cập nhật lịch sử trận đấu', 'error');
      }
      return;
    }

    const now = new Date();
    const matchTime = new Date(match.match_time);
    const minDate = (match.ticket_status === 2)
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
      : matchTime;

    const toDatetimeLocal = (date) => {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const stadiumOptions = stadiumsData.data.map(stadium => {
      const selected = stadium.stadium_name === match.stadium_name ? 'selected' : '';
      return `<option value="${stadium.stadium_name}" ${selected}>${stadium.stadium_name}</option>`;
    }).join('');

    Swal.fire({
      title: `Cập nhật trận: ${match.description}`,
      html: `
        <div class="form-group text-start mb-2"><label>Giải đấu:</label>
          <input type="text" class="form-control" value="${match.league_name}" readonly></div>
        <div class="form-group text-start mb-2"><label>Vòng:</label>
          <input type="text" class="form-control" value="${match.round}" readonly></div>
        <div class="form-group text-start mb-2"><label>Đội 1:</label>
          <input type="text" class="form-control" value="${match.team_1_name}" readonly></div>
        <div class="form-group text-start mb-2"><label>Đội 2:</label>
          <input type="text" class="form-control" value="${match.team_2_name}" readonly></div>
        <div class="form-group text-start mb-2"><label>Mô tả:</label>
          <input type="text" id="edit-description" class="form-control" value="${match.description}" required></div>
        <div class="form-group text-start mb-2"><label>Sân vận động:</label>
          <select id="edit-stadium" class="form-select" ${match.ticket_status === 1 ? 'disabled' : ''}>
            ${stadiumOptions}
          </select>
          ${match.ticket_status === 1 ? '<div class="mt-1 text-danger"><i class="bi bi-info-circle-fill"></i> Vui lòng xóa tất cả vé đã tạo cho trận nếu muốn đổi sân!</div>' : ''}
        </div>
        <div class="form-group text-start"><label>Thời gian trận:</label>
          <input type="datetime-local" id="edit-match-time" class="form-control" value="${toDatetimeLocal(matchTime)}" min="${toDatetimeLocal(minDate)}" required>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const description = document.getElementById('edit-description').value.trim();
        const stadiumName = document.getElementById('edit-stadium').value;
        const matchTimeStr = document.getElementById('edit-match-time').value;
        const newMatchTime = new Date(matchTimeStr);

        if (!description) {
          Swal.showValidationMessage('Mô tả không được để trống.');
          return false;
        }

        if (isNaN(newMatchTime.getTime())) {
          Swal.showValidationMessage('Vui lòng nhập thời gian hợp lệ.');
          return false;
        }

        if (newMatchTime < minDate) {
          Swal.showValidationMessage(`Thời gian trận đấu phải lớn hơn ${toDatetimeLocal(minDate)}`);
          return false;
        }

        return fetch(`${API_URL}${matchId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description,
            stadium_name: stadiumName,
            match_time: newMatchTime.toISOString()
          })
        })
        .then(res => {
          if (!res.ok) throw new Error('Cập nhật không thành công');
          return res.json();
        })
        .catch(err => {
          Swal.showValidationMessage(`Lỗi: ${err.message}`);
        });
      }
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire('Thành công', 'Cập nhật trận đấu thành công', 'success').then(() => {
          loadMatchPage(new Event('click'));
        });
      }
    });

  } catch (error) {
    console.error("Lỗi khi tải thông tin trận:", error);
    Swal.fire('Lỗi', 'Không thể tải thông tin trận đấu hoặc sân vận động', 'error');
  }
}
window.showUpdateMatchForm = showUpdateMatchForm;

// Xóa trận
function deleteMatch(matchId) {
  Swal.fire({
    title: 'Bạn có chắc chắn?',
    text: `Bạn có muốn xóa trận đấu #${matchId} không?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`${API_URL}${matchId}/`, {
        method: 'DELETE'
      })
      .then(async response => {
        if (response.ok) {
          Swal.fire('Đã xóa!', 'Trận đấu đã được xóa thành công.', 'success')
            .then(() => loadMatchPage(new Event('custom')));
        } else {
          const errorData = await response.json();

          // --- Lấy thông báo lỗi rõ ràng ---
          let message = 'Không thể xóa trận đấu.';
          if (Array.isArray(errorData)) {
            message = errorData[0];  // Ví dụ: ["Không thể xóa trận đấu..."]
          } else if (typeof errorData === 'object') {
            const firstKey = Object.keys(errorData)[0];
            const value = errorData[firstKey];
            if (Array.isArray(value)) {
              message = value[0];
            } else {
              message = value;
            }
          }

          Swal.fire('Không thể xóa', message, 'warning');
        }
      })
      .catch(error => {
        console.error('Lỗi khi gửi yêu cầu xóa:', error);
        Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
      });
    }
  });
}

window.deleteMatch = deleteMatch;


// Form cập nhật lịch sử (nếu vé đang mở bán)
async function showUpdateMatchHistoryForm(matchId) {
  try {
    const res = await fetch(`${API_URL}${matchId}/`);
    const match = await res.json();

    const toDatetimeLocal = (date) => {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const matchTime = new Date(match.match_time);

    Swal.fire({
      title: `Cập nhật trận đã mở bán(Bản cập nhật sẽ được ghi lại!): ${match.description}`,
      html: `
        <div class="form-group text-start mb-2"><label>Thời gian cũ:</label>
          <input type="text" class="form-control" value="${matchTime.toLocaleString()}" readonly></div>
        <div class="form-group text-start mb-2"><label>Thời gian mới:</label>
          <input type="datetime-local" id="edit-match-time" class="form-control" min="${toDatetimeLocal(matchTime)}" required></div>
        <div class="form-group text-start mb-2"><label>Mô tả mới:</label>
          <input type="text" id="edit-description" class="form-control" value="${match.description}" required></div>
        <div class="form-group text-start mb-2"><label>Lý do thay đổi:</label>
          <input type="text" id="edit-reason" class="form-control" placeholder="Nhập lý do thay đổi" required></div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const description = document.getElementById('edit-description').value.trim();
        const matchTimeStr = document.getElementById('edit-match-time').value;
        const reason = document.getElementById('edit-reason').value.trim();
        const newMatchTime = new Date(matchTimeStr);

        if (!description || !reason) {
          Swal.showValidationMessage('Mô tả và lý do không được để trống.');
          return false;
        }

        if (isNaN(newMatchTime.getTime())) {
          Swal.showValidationMessage('Vui lòng nhập thời gian hợp lệ.');
          return false;
        }

        if (newMatchTime <= matchTime) {
          Swal.showValidationMessage('Thời gian mới phải lớn hơn thời gian hiện tại.');
          return false;
        }

        return fetch(`${API_URL}${matchId}/update-with-history/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description,
            match_time: newMatchTime.toISOString(),
            reason: reason
          })
        })
        .then(res => {
          if (!res.ok) throw new Error('Cập nhật không thành công');
          return res.json();
        })
        .catch(err => {
          Swal.showValidationMessage(`Lỗi: ${err.message}`);
        });
      }
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire('Thành công', 'Đã cập nhật lịch thi đấu', 'success').then(() => {
          loadMatchPage(new Event('click'));
        });
      }
    });

  } catch (error) {
    console.error("Lỗi khi tải trận đấu:", error);
    Swal.fire('Lỗi', 'Không thể tải thông tin trận đấu', 'error');
  }
}

window.showUpdateMatchHistoryForm = showUpdateMatchHistoryForm;

// Gọi lại lần nữa để chắc chắn đã đăng ký
loadMatchPage();
