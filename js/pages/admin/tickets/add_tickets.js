import CONFIG from "../../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;

let allMatches = {
  missing: [],
  completed: [],
};

document.addEventListener("DOMContentLoaded", () => {
  fetchMatchesWithoutTickets();

  document.getElementById("matchTypeFilter").addEventListener("change", () => {
    filterAndRender();
  });

  document.getElementById("matchSearchInput").addEventListener("input", () => {
    filterAndRender();
  });
});

function fetchMatchesWithoutTickets() {
  fetch(`${BASE_URL}/api/tickets/matches/without-tickets/`)
    .then(response => response.json())
    .then(data => {
      allMatches.missing = data.matches_with_missing_prices || [];
      allMatches.completed = data.completed_matches || [];
      filterAndRender(); // render lần đầu
    })
    .catch(error => {
      console.error("Lỗi khi lấy danh sách trận:", error);
      Swal.fire("Lỗi", "Không thể tải danh sách trận đấu", "error");
    });
}

function filterAndRender() {
  const filterType = document.getElementById("matchTypeFilter").value;
  const keyword = document.getElementById("matchSearchInput").value.toLowerCase();

  let matches = [];

  if (filterType === "missing") {
    matches = allMatches.missing;
  } else if (filterType === "completed") {
    matches = allMatches.completed;
  } else {
    matches = [...allMatches.missing, ...allMatches.completed];
  }

  // Lọc theo từ khóa
  if (keyword) {
    matches = matches.filter(match =>
      `${match.description} ${match.team_1_name} ${match.team_2_name} ${match.stadium_name} ${match.league_name}`
        .toLowerCase()
        .includes(keyword)
    );
  }

  renderMatchesTable(matches);
}

function renderMatchesTable(matches) {
  const tbody = document.querySelector("#matchesTable tbody");
  tbody.innerHTML = "";

  matches.forEach((match, index) => {
    const matchTime = new Date(match.match_time);
    const isPast = matchTime < new Date();
    const isCompleted = allMatches.completed.find(m => m.match_id === match.match_id);

    const actionButton = isCompleted
      ? `<button class="btn btn-sm btn-secondary" onclick="loadMatchDetailPage(${match.match_id}, 'completed')">Trận đấu đã kết thúc</button>`
      : `<button class="btn btn-sm btn-outline-warning" onclick="loadMatchDetailPage(${match.match_id}, 'missing')"><i class="bi bi-ticket-detailed"></i> Tạo vé</button>`;

    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>${match.description}</td>
        <td>${match.round}</td>
        <td>${match.team_1_name}</td>
        <td>${match.team_2_name}</td>
        <td>${match.stadium_name}</td>
        <td>${match.league_name}</td>
        <td>${matchTime.toLocaleString()}</td>
        <td>${actionButton}</td>
      </tr>
    `;

    tbody.insertAdjacentHTML("beforeend", row);
  });
}
// search mo ta 
document.getElementById("matchSearchInput").addEventListener("input", function () {
  const keyword = this.value.toLowerCase().trim();
  const rows = document.querySelectorAll("#matchesTable tbody tr");

  rows.forEach(row => {
    const cells = row.children;

    const description = cells[1]?.textContent.toLowerCase();
    const team1 = cells[2]?.textContent.toLowerCase();
    const team2 = cells[3]?.textContent.toLowerCase();
    const stadium = cells[4]?.textContent.toLowerCase();
    const league = cells[5]?.textContent.toLowerCase();

    const matchText = `${description} ${team1} ${team2} ${stadium} ${league}`;

    if (matchText.includes(keyword)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});
//loc ngày
function filterMatchesByDate() {
  const startDateInput = document.getElementById("startDate").value;
  const endDateInput = document.getElementById("endDate").value;
  const rows = document.querySelectorAll("#matchesTable tbody tr");

  const startDate = startDateInput ? new Date(startDateInput) : null;
  const endDate = endDateInput ? new Date(endDateInput) : null;

  rows.forEach(row => {
    const matchTimeText = row.children[7]?.textContent?.trim(); // Cột "Thời gian đấu"
    const matchTime = new Date(matchTimeText);

    let showRow = true;

    if (startDate && matchTime < startDate) {
      showRow = false;
    }

    if (endDate) {
      // Cộng thêm 1 ngày để tính cả ngày endDate
      const adjustedEnd = new Date(endDate);
      adjustedEnd.setDate(adjustedEnd.getDate() + 1);

      if (matchTime >= adjustedEnd) {
        showRow = false;
      }
    }

    row.style.display = showRow ? "" : "none";
  });
}

// Gắn sự kiện khi người dùng chọn ngày
document.getElementById("startDate").addEventListener("change", filterMatchesByDate);
document.getElementById("endDate").addEventListener("change", filterMatchesByDate);


// 
function getLocalDatetimeString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}



function loadMatchDetailPage(matchId) { 
  document.getElementById("matches-list-container").style.display = "none";  // Ẩn bảng hiện tại
  fetch(`${BASE_URL}/api/tickets/match-detail/${matchId}/`)
    .then(response => response.json())
    .then(data => {
      const now = new Date();
      const matchTime = new Date(data.match_time);
      const content = document.getElementById('content-container');
      window.matchTime = matchTime; // Lưu để dùng ở hàm createTicket
      window.currentMatchId = matchId;

      content.innerHTML = `
  <button class="btn btn-outline-secondary mb-3" onclick="backToMatchList()">
    <i class="bi bi-arrow-left-circle"></i> Quay lại danh sách trận
  </button>

  <div class="card shadow-sm mb-4">
    <div class="card-body">
      <h4 class="mb-3 text-warning">
        <i class="bi bi-ticket-detailed"></i> 
        ${matchTime < now ? 'Chi tiết vé - Trận đã kết thúc' : 'Tạo vé từng khu vực'}
      </h4>

      <table class="table table-borderless mb-0">
        <tbody>
          <tr>
            <th style="width: 180px;">Mô tả:</th>
            <td>${data.description}</td>
          </tr>
          <tr>
            <th>Sân vận động:</th>
            <td>${data.stadium_name}</td>
          </tr>
          <tr>
            <th>Thời gian thi đấu:</th>
            <td>${matchTime.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <h5 class="mb-3">Danh sách khu vực chỗ ngồi của sân <strong>${data.stadium_name}</strong></h5>
  <form id="ticket-form">
    <div class="table-responsive">
      <table class="table table-bordered align-middle text-center">
        <thead class="table-light">
          <tr>
            <th>STT</th>
            <th>Khu vực</th>
            <th>Giá vé</th>
            <th>Ngày mở bán</th>

            <th>Số ghế còn lại</th>
            ${matchTime >= now ? '<th>Thao tác</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${data.sections.map((section, index) => {
            const price = section.has_price ? parseFloat(section.price).toLocaleString('vi-VN') + ' đ' : '';
            const sellDateObj = section.has_price ? new Date(section.sell_date) : null;
            const sellDate = sellDateObj ? getLocalDatetimeString(sellDateObj) : '';
            const availableSeats = section.available_seats;

            let actionButton = '';

            if (!section.has_price) {
              actionButton = availableSeats === 0 
                ? `<button class="btn btn-sm btn-outline-secondary" disabled>
                    <i class="bi bi-x-circle"></i> Không thể tạo vé
                  </button>` 
                : `<button id="btn-create-${section.section_id}" class="btn btn-sm btn-outline-primary"
                    onclick="createTicket(${data.match_id}, ${section.section_id}, event)">
                    <i class="bi bi-ticket-detailed"></i> Tạo vé
                  </button>`;
            } else {
              if (!section.is_closed) {
                actionButton = ` 
                  <button class="btn btn-sm btn-outline-warning" onclick="event.preventDefault();redirectToEdit(${section.pricing_id})">
                    <i class="bi bi-pencil-square"></i> Cập nhật vé đang bán
                  </button> 
                  `
                  ;
              } else {
                if (sellDateObj > now) {
                  actionButton = `
  
      <button class="btn btn-sm btn-outline-primary" onclick="showUpdateTicketForm(${section.pricing_id})">
        <i class="bi bi-pencil-square"></i> Cập nhật vé chưa bán
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="event.preventDefault(); deleteTicket(${section.pricing_id})">
  <i class="bi bi-trash"></i> Xóa vé
</button>

   
                     `;
                } else if (matchTime < now) {
                  actionButton = `
                    <button class="btn btn-sm btn-outline-secondary" disabled>
                      <i class="bi bi-flag-fill"></i> Trận đã đấu
                    </button>`;
                } else {
                  actionButton = `<span class="text-muted">Không thể cập nhật</span>`;
                }
              }
            }

            return `
              <tr>
                <td>${index + 1}</td>
                <td>${section.section_name}</td>
                <td>
                  <input type="text" id="price-${section.section_id}" 
                    class="form-control text-end ${section.has_price ? 'bg-light' : ''}" 
                    value="${price}" ${section.has_price || matchTime < now ? 'readonly' : ''}>
                </td>
                <td>
                  <input type="datetime-local" id="sell-${section.section_id}" 
                    class="form-control ${section.has_price ? 'bg-light' : ''}" 
                    value="${sellDate}" 
                    ${section.has_price || matchTime < now ? 'readonly' : ''} 
                    min="${getLocalDatetimeString(new Date(Date.now() + 60000))}" 
                    max="${getLocalDatetimeString(new Date(matchTime.getTime() - 60000))}">
                </td>
                <td>
                  <input type="text" id="available-seats-${section.section_id}" class="form-control bg-light text-center" value="${availableSeats}" readonly>
                </td>
                ${matchTime >= now ? `<td>${actionButton}</td>` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  </form>
`;


    })
    
    .catch(error => {
      console.error('Lỗi khi lấy chi tiết trận:', error);
      Swal.fire('Lỗi', 'Không thể tải chi tiết trận đấu', 'error');
    });
}

// 
function createTicket(matchId, sectionId, event) {
  console.log("matchId:", matchId, "sectionId:", sectionId);
  event.preventDefault();

  const priceInput = document.getElementById(`price-${sectionId}`);
  const sellDateInput = document.getElementById(`sell-${sectionId}`);
  const availableSeatsInput = document.getElementById(`available-seats-${sectionId}`);
  const button = document.getElementById(`btn-create-${sectionId}`);

  if (!priceInput || !sellDateInput || !availableSeatsInput || !button) {
    console.error('Một hoặc nhiều phần tử không tồn tại trong DOM.');
    Swal.fire('Lỗi', 'Không thể tìm thấy các phần tử cần thiết để tạo vé.', 'error');
    return;
  }

  const price = priceInput.value;
  const sellDateStr = sellDateInput.value;
  const availableSeats = parseInt(availableSeatsInput.value);

  if (!price || !sellDateStr || isNaN(availableSeats)) {
    Swal.fire('Lỗi', 'Vui lòng nhập đầy đủ thông tin', 'error');
    return;
  }

  if (isNaN(price) || parseFloat(price) <= 0) {
    Swal.fire('Lỗi', 'Vui lòng nhập giá vé hợp lệ', 'error');
    return;
  }

  const priceValue = parseFloat(price);

  if (priceValue < 50000 || priceValue > 10000000) {
    Swal.fire('Lỗi', 'Giá vé phải nằm trong khoảng từ 50,000 đến 10,000,000 đ', 'error');
    return;
  }

  if (availableSeats <= 0) {
    Swal.fire('Lỗi', 'Khu vực này không còn ghế khả dụng để tạo vé', 'error');
    return;
  }

  const sellDate = new Date(sellDateStr);
  const now = new Date();

  if (sellDate < now) {
    Swal.fire('Lỗi', 'Ngày giờ bắt đầu bán vé không được ở trong quá khứ', 'error');
    return;
  }

  const requestData = {
    price: priceValue,
    sell_date: sellDateStr,
    available_seats: availableSeats
  };

  fetch(`${BASE_URL}/api/tickets/match/${matchId}/section/${sectionId}/price/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  })
  .then(async response => {
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Không thể parse JSON từ server:', e);
      throw new Error('Phản hồi không hợp lệ từ server');
    }

    if (!response.ok) {
      const errorMsg = data?.message || 'Đã xảy ra lỗi khi tạo vé';
      throw new Error(errorMsg);
    }

    Swal.fire('Thành công', 'Vé đã được tạo cho khu vực này!', 'success');

    // Cập nhật lại giao diện
    priceInput.value = `${priceValue.toLocaleString('vi-VN')} đ`;
    priceInput.readOnly = true;
    priceInput.classList.add('bg-light');

    sellDateInput.value = getLocalDatetimeString(sellDate);
    sellDateInput.disabled = true;
    sellDateInput.classList.add('bg-light');

    if (button) {
      button.outerHTML = `
        <button class="btn btn-sm btn-primary" disabled>
          <i class="bi bi-check-circle"></i> Đã tạo vé
        </button>`;
    }
  })
  .catch(error => {
    console.error('Lỗi khi tạo vé:', error);
    Swal.fire('Lỗi', error.message || 'Không thể tạo vé', 'error');
  });
}



function redirectToEdit(pricingId) {
    
  console.log(pricingId);
  window.location.href = `/pages/admin/tickets/edit_ticketPrice.html?pricing_id=${pricingId}`;
  console.log(window.location.href);
}
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
        return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
function backToTicketsList() {
   if (localStorage.getItem("role") ===  "admin") {
    window.location.href = "/pages/admin/base.html#tickets/tickets";
  }
  else if (localStorage.getItem("role") ===  "staff") {
    window.location.href = "/pages/staff/base.html#tickets/tickets";
  }


}
function backToMatchList() {
  const contentContainer = document.getElementById("content-container");
  const matchListContainer = document.getElementById("matches-list-container");

  // Xóa nội dung chi tiết nhưng KHÔNG ẩn container
  contentContainer.innerHTML = "";

  // Hiện lại danh sách trận
  matchListContainer.style.display = "block";

  // Gọi lại render bảng nếu dữ liệu còn
  if (allMatches && allMatches.completed && allMatches.missing) {
    const all = [...allMatches.completed, ...allMatches.missing];
    renderMatchesTable(all);
  } else {
    console.error("Dữ liệu allMatches không tồn tại hoặc bị lỗi.");
  }
}




const backBtn = document.getElementById("backBtn");
backBtn.addEventListener("click", (e) => {
  e.preventDefault();
  backToTicketsList();
});

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
          loadMatchDetailPage(window.currentMatchId);

        });
      })
      .catch(err => {
        Swal.fire('Lỗi', 'Không thể xóa vé', 'error');
      });
    }
  });
}
window.deleteTicket = deleteTicket; 
window.backToMatchList= backToMatchList; // Để có thể gọi từ HTML
window.backToTicketsList = backToTicketsList; // Để có thể gọi từ HTML
window.showUpdateTicketForm = showUpdateTicketForm; // Để có thể gọi từ HTML
window.redirectToEdit= redirectToEdit; // Để có thể gọi từ bên ngoài
// 
window.loadMatchDetailPage = loadMatchDetailPage; // Để có thể gọi từ bên ngoài
window.createTicket = createTicket; // Để có thể gọi từ bên ngoài 

