// Import cấu hình từ settings.js
import CONFIG from "../../../utils/settings.js";

const API_URL = CONFIG.BASE_URL + "/api/tickets/section-prices/";
const BASE_URL = CONFIG.BASE_URL;

let tickets = [];
let matchSportMap = {}; // match_id -> sport_id
let sportsList = [];
let matchesList = []; // store completed matches list for fallback lookups

// normalize descriptions (trim, collapse whitespace, lowercase)
function normalizeText(s) {
  return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function loadTicketPage(event) {
  if (event) event.preventDefault();

  try {
    const [ticketResp, matchResp, sportsResp] = await Promise.all([
      fetch(API_URL),
      fetch(`${BASE_URL}/api/tickets/completed-matches/`),
      fetch(`${BASE_URL}/api/events/sports/`)
    ]);

    if (!ticketResp.ok || !matchResp.ok) throw new Error("Failed to fetch data");

    const ticketData = await ticketResp.json();
    const matches = await matchResp.json();
    const sportsData = sportsResp && sportsResp.ok ? await sportsResp.json() : [];
    // Normalize sports list (handle pagination if necessary)
    const sports = (sportsData.results && sportsData.results.length) ? sportsData.results : (Array.isArray(sportsData) ? sportsData : []);
    sportsList = sports;

    // Gán dữ liệu tickets
    // Tạo map: normalized(match_description) => match_id
    const matchMap = {};
    matches.forEach(m => {
      matchMap[normalizeText(m.description)] = m.match_id;
      // build match->sport mapping (serializer now returns sport_id)
      matchSportMap[m.match_id] = m.sport_id != null ? Number(m.sport_id) : null;
    });

    // Gán match_id và sport cho từng ticket dựa vào match_description
    tickets = ticketData.results.map(t => ({
      ...t,
      id: t.pricing_id,
      match_id: matchMap[normalizeText(t.match_description)] || null,
      sport_id: t.sport_id != null ? Number(t.sport_id) : (matchMap[normalizeText(t.match_description)] ? matchSportMap[matchMap[normalizeText(t.match_description)]] : null),
      sport_name: t.sport_name || null
    }));

    // Populate dropdown lọc môn thể thao
    const sportFilter = document.getElementById('sport-filter');
    if (sportFilter) {
      sportFilter.innerHTML = '<option value="">--Tất cả môn thể thao--</option>' + sports.map(s => `<option value="${s.sport_id}">${s.sport_name}</option>`).join('');
      sportFilter.addEventListener('change', () => {
        // Repopulate matches dropdown to show only matches in the selected sport
        const selected = sportFilter.value;
        const matchFilter = document.getElementById('match-filter');
        if (matchFilter) {
          const filteredMatches = selected ? matches.filter(m => m.sport_id == parseInt(selected)) : matches;
          matchFilter.innerHTML = `\n            <option value="">--Các trận đã tạo vé--</option>\n            ${filteredMatches.map(m => `<option value="${m.match_id}">${m.description}</option>`).join('')}`;
          matchFilter.value = '';
          matchFilter.dispatchEvent(new Event('change'));
        }
        applyFilter();
      });
    }

    // Populate dropdown lọc trận (initial)
    const matchFilter = document.getElementById("match-filter");
    matchFilter.innerHTML = `
      <option value="">--Các trận đã tạo vé--</option>
      ${matches.map(m => `<option value="${m.match_id}">${m.description}</option>`).join('')}
    `;
    matchFilter.addEventListener("change", applyFilter);

    // Khởi tạo bảng nếu chưa có
    if (!$.fn.DataTable.isDataTable("#ticketTable")) {
      table = $('#ticketTable').DataTable({
        data: [],
        columns: [
          { title: "STT" },
          { title: "Tên trận" },
          { title: "Tên sân vận động" },
          { title: "Tên khu vực" },
          { title: "Giá vé" },
          { title: "Số ghế còn" },
          { title: "Trạng thái" },
          { title: "Ngày bán" },
          { title: "Thời gian thi đấu" },
          { title: "Hành động" }
        ]
      });
    }

    // Hiển thị toàn bộ vé ban đầu
    applyFilter();

  } catch (error) {
    console.error("Lỗi khi tải danh sách vé:", error);
    Swal.fire("Lỗi", "Không thể tải danh sách vé", "error");
  }
}

function applyFilter() {
  const selectedMatchIdRaw = document.getElementById('match-filter').value;
  const selectedMatchId = parseInt(selectedMatchIdRaw);
  const selectedSportRaw = document.getElementById('sport-filter') ? document.getElementById('sport-filter').value : '';
  const selectedSportId = parseInt(selectedSportRaw);

  const searchTerm = (document.getElementById('ticketSearchInput').value || '').trim().toLowerCase();

  console.log("Selected Match ID:", selectedMatchId, "Selected Sport ID:", selectedSportId, "Search:", searchTerm);

  let filtered = tickets;

  if (!isNaN(selectedMatchId)) {
    filtered = filtered.filter(t => t.match_id === selectedMatchId);
  } else if (!isNaN(selectedSportId)) {
    filtered = filtered.filter(t => {
      if (t.sport_id != null) return Number(t.sport_id) === selectedSportId;
      if (t.match_id && matchSportMap[t.match_id] != null) return Number(matchSportMap[t.match_id]) === selectedSportId;
      return false;
    });
  }

  if (searchTerm) {
    filtered = filtered.filter(ticket => {
      const matchDescription = (ticket.match_description || '').toLowerCase();
      const stadiumName = (ticket.stadium_name || '').toLowerCase();
      return matchDescription.includes(searchTerm) || stadiumName.includes(searchTerm);
    });
  }

  console.log("Filtered Tickets:", filtered);

  renderTable(filtered);
}

function renderTable(data) {
  const now = new Date();

  const rows = data.map((ticket, index) => {
    const sellDate = new Date(ticket.sell_date);
    const matchTime = new Date(ticket.match_time);

    let actionButton = '';
    if (ticket.available_seats === 0) {
      // Vé đã bán hết
      actionButton = `
    <button class="btn btn-sm btn-outline-secondary" disabled>
      <i class="bi bi-x-circle"></i> Vé đã bán hết
    </button>`;
    } else if (matchTime < now) {
      // Trận đã đấu
      actionButton = `
    <button class="btn btn-sm btn-outline-secondary" disabled>
      <i class="bi bi-flag-fill"></i> Trận đã đấu
    </button>`;
    } else if (sellDate > now) {
      // Vé chưa bán
      actionButton = `
    <button class="btn btn-sm btn-outline-primary" onclick="showUpdateTicketForm(${ticket.pricing_id})">
      <i class="bi bi-pencil-square"></i> Vé chưa bán
    </button>`;
    } else {
      // Vé đang trong thời gian bán
      actionButton = `
    <button class="btn btn-sm btn-outline-warning" onclick="redirectToEdit(${ticket.pricing_id})">
      <i class="bi bi-pencil-square"></i> Vé đang bán
    </button>`;
      if (ticket.is_closed) {
        actionButton += `
      <button class="btn btn-sm btn-outline-success" onclick="reopenSelling(${ticket.pricing_id})">
        <i class="bi bi-play-circle"></i> Mở bán lại
      </button>`;
      } else {
        actionButton += `
      <button class="btn btn-sm btn-outline-danger" onclick="stopSelling(${ticket.pricing_id})">
        <i class="bi bi-stop-circle"></i> Dừng bán
      </button>`;
      }
    }




    // Chỉ hiển thị nút Xóa khi vé chưa bán
    let deleteButton = '';
    if (ticket.is_closed && sellDate > now) {
      deleteButton = `
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTicket(${ticket.pricing_id})">
          <i class="bi bi-trash"></i> Xóa
        </button>
      `;
    }

    return [
      index + 1,
      ticket.match_description,
      ticket.stadium_name,
      ticket.section_name,
      Number(ticket.price).toLocaleString('vi-VN') + ' đ',
      ticket.available_seats,
      ticket.is_closed ? 'Đang đóng' : 'Đang mở',
      ticket.sell_date,
      ticket.match_time,
      `${actionButton}
      ${deleteButton}`
    ];

  });

  const table = $('#ticketTable').DataTable();
  table.clear().rows.add(rows).draw();
}
document.getElementById('ticketSearchInput').addEventListener('input', function () {
  // Khi người dùng gõ, gọi lại applyFilter để kết hợp tìm kiếm với các bộ lọc hiện tại
  applyFilter();
});

// Gán hàm cho global
window.applyFilter = applyFilter;
window.loadTicketPage = loadTicketPage;





// Chuyển hướng đến trang cập nhật vé đang bán
function redirectToEdit(pricingId) {
  window.location.href = `/pages/admin/tickets/edit_ticketPrice.html?pricing_id=${pricingId}`;
}
window.redirectToEdit = redirectToEdit; // Để có thể gọi từ HTML

// Cập nhật vé chưa bán (bằng SweetAlert)
function showUpdateTicketForm(pricingId) {
  event.preventDefault();

  console.log(pricingId);
  fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/`)
    .then(res => res.json())
    .then(ticket => {
      const now = new Date();
      const matchTime = new Date(ticket.match_time);

      const toDatetimeLocal = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };

      Swal.fire({
        title: 'Cập nhật vé',
        html: `
          <div class="form-group text-start mb-2">
            <label>Tên trận:</label>
            <input type="text" class="form-control" value="${ticket.match_description}" readonly>
          </div>
          <div class="form-group text-start mb-2">
            <label>Tên khu vực:</label>
            <input type="text" class="form-control" value="${ticket.section_name}" readonly>
          </div>
          <div class="form-group text-start mb-2">
            <label>Số ghế khả dụng:</label>
            <input type="number" class="form-control" value="${ticket.available_seats}" readonly>
          </div>
          <div class="form-group text-start mb-2">
            <label>Giá vé:</label>
            <input type="number" id="edit-price" class="form-control" value="${ticket.price}">
          </div>
          <div class="form-group text-start">
            <label>Ngày bán:</label>
            <input 
              type="datetime-local" 
              id="edit-sell-date" 
              class="form-control" 
              value="${ticket.sell_date}" 
              min="${toDatetimeLocal(now)}" 
              max="${toDatetimeLocal(matchTime)}">
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const price = parseInt(document.getElementById('edit-price').value);
          const sellDateInput = document.getElementById('edit-sell-date').value;
          const sellDate = new Date(sellDateInput);

          // Kiểm tra giá trị tiền: phải là số nguyên và nằm trong khoảng từ 50.000 đến 10.000.000
          if (isNaN(price) || !Number.isInteger(price) || price < 50000 || price > 10000000) {
            Swal.showValidationMessage('Giá vé phải là số nguyên trong khoảng từ 50,000 đến 10,000,000 đ.');
            return false;
          }

          if (isNaN(sellDate.getTime())) {
            Swal.showValidationMessage('Vui lòng nhập ngày bán hợp lệ.');
            return false;
          }
          if (sellDate <= now) {
            Swal.showValidationMessage('Ngày bán phải lớn hơn thời điểm hiện tại.');
            return false;
          }
          if (sellDate >= matchTime) {
            Swal.showValidationMessage('Ngày bán phải nhỏ hơn thời gian trận đấu.');
            return false;
          }

          return fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price, sell_date: sellDateInput })
          })
            .then(res => {
              if (!res.ok) throw new Error("Cập nhật không thành công");
              return res.json();
            })
            .catch(err => Swal.showValidationMessage(`Lỗi: ${err.message}`));
        }
      }).then(result => {
        if (result.isConfirmed) {
          Swal.fire('Thành công', 'Cập nhật vé thành công', 'success').then(() => {
            loadTicketPage(new Event('click'));
          });
        }
      });
    })
    .catch(err => {
      console.error("Lỗi tải dữ liệu vé:", err);
      Swal.fire('Lỗi', 'Không thể tải thông tin vé', 'error');
    });
}


window.showUpdateTicketForm = showUpdateTicketForm; // Để có thể gọi từ HTML
function stopSelling(pricingId) {
  event.preventDefault();  // Ngăn chặn sự kiện mặc định nếu cần thiết (nếu trong form)

  console.log("Dừng bán vé với ID: ", pricingId);

  fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/stop_selling/`, {
    method: "PATCH",  // Sử dụng PATCH vì chúng ta chỉ thay đổi một phần dữ liệu (is_closed)
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Lỗi khi dừng bán vé!');
      }
      return res.json();  // Nếu thành công, trả về dữ liệu JSON
    })
    .then(data => {
      console.log("Dừng bán thành công:", data);
      alert("Đã dừng bán vé thành công.");

      // Cập nhật lại giao diện hoặc reload lại danh sách vé
      loadTicketPage();  // Hàm này có thể được dùng để tải lại danh sách vé
    })
    .catch(error => {
      console.error("Lỗi khi dừng bán vé:", error);
      alert("Có lỗi xảy ra khi dừng bán vé.");
    });
}
window.stopSelling = stopSelling; // Để có thể gọi từ HTML
function reopenSelling(pricingId) {
  fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/reopen_selling/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Lỗi khi mở bán vé');
      }
      return response.json();
    })
    .then(data => {
      console.log(data.status);
      // Hiển thị thông báo thành công
      alert('Vé đã được mở bán lại thành công.');
    })
    .catch(error => {
      console.error('Lỗi:', error);
      alert('Đã xảy ra lỗi khi mở bán lại vé.');
    });
}

window.reopenSelling = reopenSelling; // Để có thể gọi từ HTML

// Xóa vé
function deleteTicket(pricingId) {
  Swal.fire({
    title: 'Xác nhận xóa?',
    text: "Hành động này sẽ không thể hoàn tác!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonText: 'Hủy',
    confirmButtonText: 'Xóa'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/`, {
        method: 'DELETE'
      })
        .then(res => {
          if (!res.ok) throw new Error('Xóa thất bại');
          Swal.fire('Đã xóa!', 'Vé đã được xóa thành công.', 'success').then(() => {
            loadTicketPage(new Event('click'));
          });
        })
        .catch(err => {
          Swal.fire('Lỗi', 'Không thể xóa vé', 'error');
        });
    }
  });
}

window.deleteTicket = deleteTicket;
// Gọi hàm tải dữ liệu ban đầu
// loadTicketPage();

const table = $('#ticketTable').DataTable();

const userRole = localStorage.getItem("role");
console.log("User Role:", userRole);
if (userRole !== "admin") {
  const btnAddTicket = document.getElementById("btnAddTicket");
  const btnPriceHistory = document.getElementById("btnPriceHistory");
  if (btnAddTicket) btnAddTicket.style.display = "none";
  if (btnPriceHistory) btnPriceHistory.style.display = "none";
}


if (userRole !== "admin") {
  table.column(-1).visible(false);
}

loadTicketPage();

