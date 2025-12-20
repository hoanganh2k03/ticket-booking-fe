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
// Map dùng để chuyển đổi mã loại giải đấu sang tiếng Việt
const LEAGUE_TYPE_MAP = {
  'round_robin': 'Đấu vòng tròn',
  'knockout': 'Đấu loại trực tiếp',
  'hybrid': 'Hỗn hợp',
  'friendly': 'Giao hữu',
  'other': 'Khác'
};

// Hàm format ngày tháng (từ ISO sang dd/mm/yyyy)
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN');
}

// Biến lưu trữ danh sách sport để tra cứu tên (ID -> Name)
let sportsMap = {};
let eventsAttached = false; // prevent attaching duplicate delegated events
let isLoadingLeagues = false; // prevent concurrent loads


async function loadLeaguesPage(event) {
  if (event) event.preventDefault();

  try {
    // BƯỚC 1: Tải danh sách môn thể thao trước (để lấy tên sport từ ID)
    // Giả sử API lấy sport của bạn là /api/events/sports/
    // Nếu bạn chưa muốn làm bước này, có thể bỏ qua và hiển thị ID tạm.
    try {
        const resSport = await fetch(`${CONFIG.BASE_URL}/api/events/sports/`);
        if (resSport.ok) {
            const sportsData = await resSport.json();
            console.log("Dữ liệu sport từ API:", sportsData);
            const list = sportsData.results || sportsData; // Xử lý pagination nếu có
            list.forEach(s => {
                // Lưu vào map: key là ID, value là Tên
                sportsMap[s.sport_id] = s.sport_name; 
            });

            // Populate sport filter dropdown
            const sportSelect = document.getElementById('sportFilter');
            if (sportSelect) {
                // reset options to default (avoid duplicates on repeated loads)
                sportSelect.innerHTML = '<option value="">-- Tất cả môn thể thao --</option>';
                list.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.sport_id;
                    opt.textContent = s.sport_name;
                    sportSelect.appendChild(opt);
                });
                // attach change listener only once
                if (!sportSelect.dataset.listenerAttached) {
                    sportSelect.addEventListener('change', async function() {
                        // When a sport is selected, fetch filtered leagues from server for accuracy
                        const selected = this.value;
                        console.debug('sportSelect change -> selected:', selected);
                        try {
                            const url = selected ? `${API_URL}?sport_id=${encodeURIComponent(selected)}` : API_URL;
                            console.debug('Fetching leagues with URL:', url);
                            const resp = await fetch(url);
                            if (!resp.ok) {
                                throw new Error(`Failed to fetch leagues: ${resp.status}`);
                            }
                            const data = await resp.json();
                            console.debug('Fetched leagues response:', data);
                            const rawList = data.results || (Array.isArray(data) ? data : []);
                            leagues = rawList.map((l) => ({
                                id: l.league_id,
                                name: l.league_name,
                                type: l.league_type,
                                sport_id: (l.sport_id !== undefined) ? l.sport_id : l.sport,
                                sport_name: l.sport_name || sportsMap[(l.sport_id !== undefined) ? l.sport_id : l.sport] || null,
                                start: l.start_date,
                                end: l.end_date,
                                created: l.created_at,
                                updated: l.updated_at,
                                has_matches: l.has_matches
                            }));

                            console.debug('Mapped leagues (first 10):', leagues.slice(0, 10));
                            applyFilter();
                        } catch (err) {
                            console.error('Error fetching filtered leagues:', err);
                            Swal.fire('Lỗi', 'Không thể tải danh sách giải đấu theo môn đã chọn', 'error');
                        }
                    });
                    sportSelect.dataset.listenerAttached = '1';
                }
            }
        }
    } catch (e) {
        console.warn("Không tải được danh sách sport:", e);
    }

    // BƯỚC 2: Tải danh sách giải đấu
    const resp = await fetch(API_URL); // API_URL trỏ đến /leagues/
    if (!resp.ok) {
      console.error(`Lỗi khi tải dữ liệu giải đấu: ${resp.status}`);
      Swal.fire('Lỗi', 'Không thể tải danh sách giải đấu', 'error');
      return;
    }

    const data = await resp.json();
    console.log("Dữ liệu từ API:", data);

    // Xử lý dữ liệu phân trang (DRF thường trả về { count, results: [] })
    // Hoặc nếu trả về mảng trực tiếp thì dùng data
    const rawList = data.results || (Array.isArray(data) ? data : []);

    leagues = rawList.map((l) => ({
          id: l.league_id,
          name: l.league_name,
          type: l.league_type, // Giá trị chuỗi: 'round_robin', ...
          // Accept both 'sport' (FK id) and explicit 'sport_id' from API
          sport_id: (l.sport_id !== undefined) ? l.sport_id : l.sport,
          // Prefer explicit sport_name if API provides it, otherwise look up in sportsMap
          sport_name: l.sport_name || sportsMap[(l.sport_id !== undefined) ? l.sport_id : l.sport] || null,
          start: l.start_date,
          end: l.end_date,
          created: l.created_at,
          updated: l.updated_at,
          has_matches: l.has_matches
    }));

    applyFilter(); // Render bảng
  } catch (error) {
    console.error("Lỗi khi tải danh sách giải đấu:", error);
    Swal.fire('Lỗi', 'Không thể kết nối server', 'error');
  }
}

// Render bảng
function applyFilter() {
  // Apply sport filter first
  const sportSelect = document.getElementById('sportFilter');
  const selectedSport = sportSelect ? sportSelect.value : '';
  console.debug('applyFilter -> selectedSport:', selectedSport, 'leagues.length:', leagues.length);

  filteredLeagues = leagues.filter(l => {
    if (selectedSport && selectedSport !== '') {
      return String(l.sport_id) === String(selectedSport);
    }
    return true;
  });
  console.debug('applyFilter -> filteredLeagues.length:', filteredLeagues.length);

  const tbody = document.querySelector('#leagueTable tbody'); // Đảm bảo lấy đúng tbody
  if (!tbody) return;
if ($.fn.DataTable.isDataTable('#leagueTable')) {
    $('#leagueTable').DataTable().destroy();
  }
  tbody.innerHTML = filteredLeagues.map((league, index) => {
    
    // 1. Xử lý hiển thị Loại giải đấu (Dùng Map thay cho switch cũ)
    const leagueTypeName = LEAGUE_TYPE_MAP[league.type] || 'Không xác định';

    // 2. Xử lý hiển thị Tên môn thể thao
    // Nếu có trong map thì lấy tên, không thì hiện ID
    const sportName = league.sport_name || (sportsMap[league.sport_id] ? sportsMap[league.sport_id] : `Sport ID: ${league.sport_id}`);

    // 3. Xử lý nút cập nhật (Logic has_matches)
    let updateColumn = '';
    if (league.has_matches) {
      updateColumn = `<span class="badge bg-secondary" title="Không thể sửa vì đã có trận đấu">Đã chốt</span>`;
    } else {
      updateColumn = `
        <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${league.id}">
          <i class="bi bi-pencil-square"></i>
        </button>`;
    }

    // 4. Format ngày tháng cho đẹp
    const startDate = formatDate(league.start);
    const endDate = formatDate(league.end);
    const createdDate = formatDate(league.created);
    const updatedDate = formatDate(league.updated);

    // 5. Return HTML khớp với THEAD
    // Thứ tự: STT | Tên | Sport | Loại | Bắt đầu | Kết thúc | Tạo | Update | Thao tác
    return `
      <tr>
        <td>${index + 1}</td>
        <td class="fw-bold text-primary">${league.name}</td>
        <td><span class="badge bg-info text-dark">${sportName}</span></td>
        <td><span class="badge bg-info text-dark">${leagueTypeName}</span></td>
        <td>${startDate}</td>
        <td>${endDate}</td>
        <td class="small text-muted">${createdDate}</td>
        <td class="small text-muted">${updatedDate}</td>
        <td>
          <div class="d-flex gap-1">
            ${updateColumn}
            <button class="btn btn-sm btn-outline-danger delete-league-btn" data-id="${league.id}">
               <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Recreate DataTable to reflect current rows
  

  $('#leagueTable').DataTable({
      language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/vi.json' } // Tiếng Việt cho bảng
  });

  // Re-apply current search term if any
  const searchTerm = document.getElementById('searchLeagueInput')?.value || '';
  if (searchTerm) {
    $('#leagueTable').DataTable().search(searchTerm).draw();
  }
}


document.getElementById('searchLeagueInput').addEventListener('input', function (e) {
  const searchTerm = e.target.value.toLowerCase();
  $('#leagueTable').DataTable().search(searchTerm).draw();
});


// Gắn các sự kiện Xóa, Cập nhật
// function attachEventListeners() {
//   document.querySelectorAll('.edit-btn').forEach(button => {
//     button.addEventListener('click', function () {
//       const leagueId = this.getAttribute('data-id');
//       window.location.href = `events/edit_leagues.html?id=${leagueId}`;
//     });
//   });

//   document.querySelectorAll('.delete-stadium-btn').forEach(button => {
//     button.addEventListener('click', async function () {
//       const leagueId = this.getAttribute('data-id');

//       const confirmResult = await Swal.fire({
//         title: 'Xác nhận',
//         text: 'Bạn có chắc chắn muốn xóa giải đấu này?',
//         icon: 'warning',
//         showCancelButton: true,
//         confirmButtonText: 'Xóa',
//         cancelButtonText: 'Hủy'
//       });

//       if (confirmResult.isConfirmed) {
//         try {
//           const res = await fetch(`${API_URL}${leagueId}/`, {
//             method: 'DELETE'
//           });

//           if (res.status === 204) {
//             Swal.fire('Đã xóa!', 'Giải đấu đã được xóa.', 'success');
//             await loadLeaguesPage();
//           } else {
//             const data = await res.json();  // Lấy thông tin lỗi
//             const errorMessage = data?.error || 'Không thể xóa giải đấu.';
            
//             Swal.fire('Không thể xóa', errorMessage, 'warning');
//           }

//         } catch (err) {
//           console.error(err);
//           Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa giải đấu.', 'error');
//         }
//       }
//     });
//   });
// }
// ... (Phần loadLeaguesPage và applyFilter giữ nguyên) ...

// === XÓA HOÀN TOÀN HÀM attachEventListeners() CŨ VÀ THAY BẰNG LOGIC SAU ===

// Hàm xử lý sự kiện Xóa (đã tách ra)
async function handleDelete(leagueId) {
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
            // API_URL đã được định nghĩa là /api/events/leagues/
            const res = await fetch(`${API_URL}${leagueId}/`, {
                method: 'DELETE'
            });

            if (res.status === 204) {
                Swal.fire('Đã xóa!', 'Giải đấu đã được xóa.', 'success');
                // Tải lại dữ liệu sau khi xóa
                await loadLeaguesPage();
            } else {
                // Xử lý lỗi nếu giải đấu đã có trận đấu (IntegrityError)
                const data = await res.json(); 
                const errorMessage = data?.error || data?.detail || 'Không thể xóa giải đấu.';
                
                Swal.fire('Không thể xóa', errorMessage, 'warning');
            }

        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa giải đấu.', 'error');
        }
    }
}

// Hàm gán sự kiện (chỉ cần chạy một lần)
function attachDelegatedEvents() {
    // 1. Delegation cho nút DELETE
    // Sử dụng document để lắng nghe click trên toàn trang, nhưng chỉ xử lý khi click vào .delete-league-btn
    document.addEventListener('click', function(e) {
        const deleteButton = e.target.closest('.delete-league-btn'); 
        if (deleteButton) {
            const leagueId = deleteButton.getAttribute('data-id');
            handleDelete(leagueId);
        }
    });

    // 2. Delegation cho nút EDIT
    document.addEventListener('click', function(e) {
        const editButton = e.target.closest('.edit-btn');
        if (editButton) {
            const leagueId = editButton.getAttribute('data-id');
            window.location.href = `events/edit_leagues.html?id=${leagueId}`;
        }
    });

    // Sau khi gán sự kiện, tải dữ liệu
    loadLeaguesPage();
}

// === THAY ĐỔI CUỐI CÙNG (ở ngoài cùng thẻ script) ===
// Thay vì gọi loadLeaguesPage(), gọi hàm gán sự kiện ủy quyền.
attachDelegatedEvents();

// NOTE: initial load is triggered inside attachDelegatedEvents(); do not call loadLeaguesPage() again to avoid duplicate fetches.
