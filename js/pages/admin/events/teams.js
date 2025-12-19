// Import cấu hình từ settings.js
import CONFIG from "../../../utils/settings.js";

// API endpoint
const API_URL = CONFIG.BASE_URL + "/api/events/teams/";
const SPORTS_API = CONFIG.BASE_URL + "/api/events/sports/";
const BASE_URL = CONFIG.BASE_URL;  // Thêm BASE_URL để dùng cho upload
console.log("API_URL", API_URL); // In URL API ra console để kiểm tra

// Biến dữ liệu toàn cục
let teams = [];
let filteredTeams = [];
let sportsMap = {}; // sport_id -> sport_name mapping (populated from /api/events/sports/)

// Tham chiếu tới tbody
const tbody = document.querySelector("#teamTable tbody");

// Hàm fetch dữ liệu đội bóng
async function loadTeamsPage(event) {
  if (event) event.preventDefault();

  try {
    const sportSelect = document.getElementById('sportFilter');
    const selectedSport = sportSelect ? sportSelect.value : '';
    const url = selectedSport ? `${API_URL}?sport_id=${encodeURIComponent(selectedSport)}` : API_URL;

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`Lỗi khi tải dữ liệu đội bóng: ${resp.status}`);
      Swal.fire('Lỗi', 'Không thể tải danh sách đội bóng', 'error');
      return;
    }
    const data = await resp.json();
    console.log("Dữ liệu từ API (teams):", data);

    teams = data.results
      ? data.results.map((t) => ({
          id: t.team_id,
          sport: t.sport,
          sport_name: t.sport_name || (typeof t.sport === 'string' ? t.sport : null) || sportsMap[t.sport] || null,
          name: t.team_name,
          logo: t.logo,
          coach: t.head_coach,
          description: t.description,
          rating: t.rating,
        }))
      : [];

    // Ensure sports dropdown is populated
    if (Object.keys(sportsMap).length === 0) {
      await loadSportsAndPopulate();
    }

    applyFilter(); // Sau khi fetch xong thì lọc và render
  } catch (error) {
    console.error("Lỗi khi tải danh sách đội bóng:", error);
    Swal.fire('Lỗi', 'Không thể tải danh sách đội bóng', 'error');
  }
}

// Hàm lọc và render bảng
function applyFilter() {
  filteredTeams = teams;
  const tbody = document.querySelector('#teamTable tbody');

  // Destroy existing DataTable to avoid duplicate rows when re-rendering
  if ($.fn.DataTable.isDataTable('#teamTable')) {
    try {
      $('#teamTable').DataTable().destroy();
    } catch (err) {
      console.warn('Error destroying DataTable (ignored):', err);
    }
  }

  tbody.innerHTML = filteredTeams.map((team, index) => `
    <tr data-team-id="${team.id}">
      <td>${index + 1}</td> <!-- STT tự tăng -->
      <td>${team.name}</td>
      

      <td>
        <img id="team-logo-${team.id}" src="${team.logo || '/media/team_logos/default.webp'}" alt="${team.name}" width="50" height="50"/>
      </td>
      <td>${team.coach || ''}</td>
      <td>${team.sport_name || team.sport || ''}</td>
        <td>${team.rating}</td>
      <td>${team.description || ''}</td>
      <td>
        <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${team.id}"><i class="bi bi-pencil-square"></i>Cập nhật</button>
        <button class="btn btn-sm btn-outline-danger delete-stadium-btn"  data-id="${team.id}"> <i class="bi bi-trash"></i> Xóa</button>
        <label class="btn btn-sm btn-outline-secondary upload-layout-btn">
          <i class="bi bi-upload"></i> Upload logo
          <input type="file" accept="image/*" class="d-none team-logo-input">
        </label>
      </td>
    </tr>
  `).join('');

  attachEventListeners();

  // Reinitialize DataTable
  $('#teamTable').DataTable();

  // Restore search if there was a search value
  const searchVal = document.getElementById('searchTeamInput').value;
  if (searchVal) {
    $('#teamTable').DataTable().search(searchVal).draw();
  }
}
document.getElementById('searchTeamInput').addEventListener('input', function (e) {
  const searchTerm = e.target.value.toLowerCase();
  $('#teamTable').DataTable().search(searchTerm).draw();
});

// Gắn sự kiện Cập nhật, Xóa, Upload Logo
function attachEventListeners() {
  // Nút cập nhật đội bóng
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function () {
      const teamId = this.getAttribute('data-id');
      window.location.href = `events/edit_team.html?id=${teamId}`;
    });
  });

  // Nút xóa đội bóng
  document.querySelectorAll('.delete-stadium-btn').forEach(button => {
    button.addEventListener('click', async function () {
      const teamId = this.getAttribute('data-id');
  
      const confirmResult = await Swal.fire({
        title: 'Xác nhận',
        text: 'Bạn có chắc chắn muốn xóa đội bóng này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
      });
  
      if (confirmResult.isConfirmed) {
        try {
          const res = await fetch(`${API_URL}${teamId}/`, {
            method: 'DELETE'
          });
        
          if (res.status === 204) {
            Swal.fire('Đã xóa!', 'Đội bóng đã được xóa.', 'success');
            await loadTeamsPage();
          } else {
            const errData = await res.json();
            const message = errData.message || 'Không thể xóa đội bóng';
            Swal.fire('Lỗi', message, 'error');
          }
        } catch (err) {
          console.error(err);
          Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
        }
        
      }
    });
  });
  

  // Xử lý upload logo đội bóng
  document.querySelectorAll('.team-logo-input').forEach(input => {
    input.addEventListener('change', function () {
      const file = this.files[0];
      const teamRow = this.closest('tr');
      const teamId = teamRow.getAttribute('data-team-id');

      if (!file) return;

      const formData = new FormData();
      formData.append('logo', file);

      fetch(`${BASE_URL}/api/events/teams/${teamId}/upload-logo/`, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Không thể cập nhật logo.');
          }
          return response.json();
        })
        .then(data => {
          Swal.fire('Thành công', 'Logo đội đã được cập nhật!', 'success');
          teamRow.querySelector(`#team-logo-${teamId}`).src = data.logo_url;
        })
        .catch(error => {
          console.error('Lỗi upload logo:', error);
          Swal.fire('Lỗi', 'Tải ảnh thất bại.', 'error');
        });
    });
  });
}

// Load and populate sports dropdown
async function loadSportsAndPopulate() {
  try {
    const resp = await fetch(SPORTS_API);
    if (!resp.ok) throw new Error(`Failed to fetch sports: ${resp.status}`);
    const data = await resp.json();
    const list = data.results || (Array.isArray(data) ? data : []);

    const sportSelect = document.getElementById('sportFilter');
    if (!sportSelect) return;

    // reset options to default to avoid duplicates
    sportSelect.innerHTML = '<option value="">-- Tất cả môn thể thao --</option>';

    list.forEach(s => {
      sportsMap[s.sport_id] = s.sport_name;
      const opt = document.createElement('option');
      opt.value = s.sport_id;
      opt.textContent = s.sport_name;
      sportSelect.appendChild(opt);
    });

    // attach change listener only once
    if (!sportSelect.dataset.listenerAttached) {
      sportSelect.addEventListener('change', function () {
        loadTeamsPage();
      });
      sportSelect.dataset.listenerAttached = '1';
    }
  } catch (err) {
    console.error('Error loading sports:', err);
  }
}

// Load dữ liệu ban đầu
loadTeamsPage();
