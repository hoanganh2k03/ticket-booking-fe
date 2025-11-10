// Import cấu hình từ settings.js
import CONFIG from "../../../utils/settings.js";

// API endpoint
const API_URL = CONFIG.BASE_URL + "/api/events/stadiums/";
const API_URL2= CONFIG.BASE_URL + "/api/tickets/seats/";

console.log("API_URL", API_URL); // In URL API ra console để kiểm tra

// Khai báo biến dữ liệu toàn cục (rỗng ban đầu, sau fetch sẽ được gán)
let stadiums = [];
let filteredStadiums = [];

// Các tham chiếu đến element của trang
const contentContainer = document.getElementById('content-container');

// Hàm fetch dữ liệu sân vận động
async function loadStadiumsPage(event) {
  if (event) event.preventDefault();

  // 👉 Hiện danh sách sân, ẩn danh sách khu vực
  document.getElementById('stadium-container').style.display = 'block';
  document.getElementById('section-container').style.display = 'none';

  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) {
      console.error(`Lỗi khi tải dữ liệu sân vận động: ${resp.status}`);
      Swal.fire('Lỗi', 'Không thể tải danh sách sân vận động', 'error');
      return;
    }

    const data = await resp.json();
    console.log("Dữ liệu từ API:", data);

    stadiums = data.results
      ? data.results.map((s) => ({
          id: s.stadium_id,
          name: s.stadium_name,
          location: s.location,
          capacity: s.capacity,
          layout: s.stadium_layouts_url,
        }))
      : [];

    applyFilter(); // Sau khi fetch xong thì lọc và render
  } catch (error) {
    console.error("Lỗi khi tải danh sách sân vận động:", error);
    Swal.fire('Lỗi', 'Không thể tải danh sách sân vận động', 'error');
  }
}



// Hàm lọc và render bảng
function applyFilter() {
  filteredStadiums = stadiums;

  const tbody = document.querySelector('#stadiumTable tbody');
  tbody.innerHTML = filteredStadiums.map((stadium, index) => `
    <tr data-stadium-id="${stadium.id}">
      <td>${index + 1}</td>
      <td>${stadium.name}</td>
      <td>${stadium.location}</td>
      <td>${stadium.capacity}</td>
      <td>
        <img id="stadium-layout-${stadium.id}" src="${stadium.layout || '/media/stadium_layouts/default.webp'}" alt="${stadium.name}" width="50" height="50"/>
      </td>
      <td>
        
        
           <button class="btn btn-sm btn-outline-primary view-sections-btn"><i class="bi bi-eye"></i> Xem khu vực</button>

        <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${stadium.id}">
          <i class="bi bi-pencil-square"></i> Cập nhật
        </button>

        

        <button class="btn btn-sm btn-outline-danger delete-stadium-btn" 
        data-id="${stadium.id}" 
        data-stadium-name="${stadium.name}">
  <i class="bi bi-trash"></i> Xóa
</button>

        <label class="btn btn-sm btn-outline-secondary upload-layout-btn">
          <i class="bi bi-upload"></i> Upload ảnh
          <input type="file" accept="image/*" class="d-none stadium-layout-input" data-id="${stadium.id}">
        </label>
      </td>
    </tr>
  `).join('');

  attachEventListeners();

  // Nếu table chưa được khởi tạo DataTable thì khởi tạo
  if (!$.fn.DataTable.isDataTable('#stadiumTable')) {
    $('#stadiumTable').DataTable();
  }
  document.querySelectorAll('.view-sections-btn').forEach(button => {
    button.addEventListener('click', function () {
      const stadiumId = this.closest('tr').getAttribute('data-stadium-id');
      loadSectionsForStadium(stadiumId);
    });
  });
}
document.getElementById('searchStadiumInput').addEventListener('input', function (e) {
  const searchTerm = e.target.value.toLowerCase();
  $('#stadiumTable').DataTable().search(searchTerm).draw();
});



// Gắn các sự kiện Xóa, Cập nhật
function attachEventListeners() {

  // document.querySelectorAll('.view-sections-btn').forEach(button => {
  //   button.addEventListener('click', function () {
  //     const stadiumId = this.closest('tr').getAttribute('data-stadium-id');
  //     window.location.href = `events/section.html?id=${stadiumId}`;
  //   });
  // });

  
  
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function () {
      const stadiumId = this.getAttribute('data-id');
      window.location.href = `events/edit_stadiums.html?id=${stadiumId}`;
    });
  });

  document.querySelectorAll('.delete-stadium-btn').forEach(button => {
    button.addEventListener('click', function () {
      const stadiumId = this.getAttribute('data-id');
      const stadiumName = this.getAttribute('data-stadium-name');
      deleteStadium(stadiumId, stadiumName);
    });
  });


  // ✅ Xử lý upload ảnh layout
  document.querySelectorAll('.stadium-layout-input').forEach(input => {
    input.addEventListener('change', function () {
      const file = this.files[0];
      const stadiumRow = this.closest('tr');
      const stadiumId = stadiumRow.getAttribute('data-stadium-id');
  
      if (!file) return;
  
      const formData = new FormData();
      formData.append('stadium_layouts', file);
  
      fetch(`${API_URL}${stadiumId}/upload-layout/`, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Không thể cập nhật layout sân.');
          }
          return response.json();
        })
        .then(data => {
          Swal.fire('Thành công', 'Layout sân đã được cập nhật!', 'success');
          stadiumRow.querySelector(`#stadium-layout-${stadiumId}`).src = data.stadium_layouts_url;
        })
        .catch(error => {
          console.error('Lỗi upload layout:', error);
          Swal.fire('Lỗi', 'Tải layout thất bại.', 'error');
        });
    });
  });
  
  // xóa
  function deleteStadium(stadiumId, stadiumName) {
    Swal.fire({
      title: 'Bạn có chắc chắn?',
      text: `Bạn có muốn xóa sân ${stadiumName} không?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Có, xóa!',
      cancelButtonText: 'Hủy bỏ',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${API_URL}${stadiumId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(response => {
          if (response.ok) {
            Swal.fire(
              'Đã xóa!',
              `Sân ${stadiumName} đã được xóa thành công.`,
              'success'
            );
            document.querySelector(`tr[data-stadium-id="${stadiumId}"]`)?.remove();
          } else if (response.status === 400) {  // Kiểm tra nếu lỗi từ API là 400
            response.json().then(data => {
              const errorMessage = data.error || 'Không thể xóa sân. Vui lòng thử lại.';
              Swal.fire('Lỗi', errorMessage, 'error');
            });
          } else {
            throw new Error('Lỗi khi xóa sân');
          }
        })
        .catch(error => {
          console.error('Có lỗi xảy ra:', error);
          Swal.fire('Lỗi', 'Không thể xóa sân. Vui lòng thử lại.', 'error');
        });
      }
    });
  }
}
// hàm bbên event.js
function loadSectionsForStadium(stadiumId) {
  fetch(`${API_URL}${stadiumId}/sections/`)
    .then(response => response.json())
    .then(data => {
      if (data.length === 0) {
        Swal.fire('Thông báo', 'Không có khu vực nào cho sân này.', 'info');
        return;
      }

      const stadiumName = data[0].stadium_name || 'Không rõ';
      // const content = document.getElementById('content-container');
      const sectionContainer = document.getElementById('section-container');

      sectionContainer.innerHTML = `
        <button id="back-to-stadiums-btn" class="btn btn-outline-secondary mb-3">
          <i class="bi bi-arrow-left-circle"></i> Quay lại danh sách sân vận động
        </button>

        <h3><i class="bi bi-list-ul" style="color: #0d6efd; margin-right: 8px;"></i>Khu vực tại sân ${stadiumName}</h3>
          <button class="btn mb-3" style="background-color: #007bff; color: white;" onclick="showAddSectionModal(${stadiumId})">
          <i class="bi bi-plus-circle"></i> Thêm khu vực
        </button>
        <table id="sectionTable" class="display">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên khu vực</th>
              <th>Sức chứa</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
${data.map(section => `
  <tr>
    <td>${section.section_id}</td>
    <td>${section.section_name}</td>
    <td>${section.capacity}</td>
    <td>
      <button class="btn btn-sm btn-outline-primary" 
        onclick="loadSeatsForSection(${stadiumId}, ${section.section_id}, '${section.section_name}', '${stadiumName}')">
        <i class="bi bi-eye"></i> Xem ghế
      </button>
      <button class="btn btn-sm btn-outline-warning" 
        onclick="showUpdateSectionModal(${stadiumId}, ${section.section_id}, '${section.section_name}', ${section.capacity})">
        <i class="bi bi-pencil-square"></i> Cập nhật
      </button>
      <button class="btn btn-sm btn-outline-danger" 
        onclick="confirmDeleteSection(${stadiumId}, ${section.section_id}, '${section.section_name}')">
        <i class="bi bi-trash"></i> Xóa
      </button>
    </td>
  </tr>
`).join('')}
</tbody>

        </table>

        <!-- Modal cập nhật section -->
<div class="modal fade" id="updateSectionModal" tabindex="-1" aria-labelledby="updateSectionModalLabel" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered">
  <div class="modal-content shadow-lg">
    <div class="modal-header bg-warning text-dark">
      <h5 class="modal-title" id="updateSectionModalLabel">
        <i class="bi bi-pencil-square me-2"></i>Cập nhật khu vực
      </h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
    </div>
    <div class="modal-body">
      <form id="updateSectionForm">
        <div class="mb-3">
          <label for="sectionNameInput" class="form-label">Tên khu vực</label>
          <input type="text" class="form-control" id="sectionNameInput" placeholder="VD:A,B,VIP" required>
        </div>
        <div class="mb-3">
          <label for="sectionCapacityInput" class="form-label">Sức chứa</label>
          <input type="number" class="form-control" id="sectionCapacityInput" placeholder="VD: 3000" required>
        </div>
        <input type="hidden" id="currentSectionId">
        <div class="text-end">
          <button type="submit" class="btn btn-warning text-dark">
            <i class="bi bi-save me-1"></i> Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
</div>

        <!-- Modal thêm section -->
<div class="modal fade" id="addSectionModal" tabindex="-1" aria-labelledby="addSectionModalLabel" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered">
  <div class="modal-content shadow-lg">
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title" id="addSectionModalLabel">
        <i class="bi bi-plus-circle me-2"></i>Thêm khu vực mới
      </h5>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Đóng"></button>
    </div>
    <div class="modal-body">
      <form id="addSectionForm">
        <div class="mb-3">
          <label for="newSectionName" class="form-label">Tên khu vực</label>
          <input type="text" class="form-control" id="newSectionName" placeholder="VD: A,VIP,.." required>
        </div>
        <div class="mb-3">
          <label for="newSectionCapacity" class="form-label">Sức chứa</label>
          <input type="number" class="form-control" id="newSectionCapacity" placeholder="Từ 0-3000" required>
        </div>
        <div class="text-end">
          <button type="submit" class="btn" style="background-color: #007bff; color: white;">
            <i class="bi bi-plus-lg"></i> Thêm khu vực
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
</div>


      `;
      
      $('#sectionTable').DataTable();
    setTimeout(() => {
  const backBtn = document.getElementById('back-to-stadiums-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadStadiumsPage(); // 👉 Gọi lại danh sách sân
    });
  } else {
    console.error('Không tìm thấy nút quay lại!');
  }
}, 0);

      // Gắn sự kiện cho nút quay lại
    // 👉 Hiện danh sách khu vực, ẩn danh sách sân
document.getElementById('stadium-container').style.display = 'none';
sectionContainer.style.display = 'block';


    })
    .catch(error => {
      console.error('Lỗi khi tải danh sách khu vực:', error);
      Swal.fire('Lỗi', 'Không thể tải danh sách khu vực của sân', 'error');
    });
    
    
}

// Hàm xử lý update sectionsection
function showUpdateSectionModal(stadiumId, sectionId, sectionName, capacity) {
  document.getElementById('sectionNameInput').value = sectionName;
  document.getElementById('sectionCapacityInput').value = capacity;
  document.getElementById('currentSectionId').value = sectionId;

  document.getElementById('updateSectionForm').onsubmit = function (e) {
    e.preventDefault();

    const updatedName = document.getElementById('sectionNameInput').value.trim();
    const updatedCapacity = parseInt(document.getElementById('sectionCapacityInput').value);
    const sectionId = document.getElementById('currentSectionId').value;

    // Kiểm tra hợp lệ sức chứa
    if (isNaN(updatedCapacity) || updatedCapacity <= 0 || updatedCapacity >= 3000) {
      Swal.fire('Lỗi', 'Sức chứa phải lớn hơn 0 và nhỏ hơn 3000.', 'error');
      return;
    }

    fetch(`${API_URL}${stadiumId}/sections/${sectionId}/update/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        section_name: updatedName,
        capacity: updatedCapacity
      })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw data;  // ✅ Ném trực tiếp object lỗi JSON
      }
      return res.json();
    })
    
    .then(() => {
      Swal.fire('Thành công', 'Cập nhật khu vực thành công!', 'success');
      $('#updateSectionModal').modal('hide');
      loadSectionsForStadium(stadiumId);
    })
    .catch(err => {
      console.error(err);
    
      // ✅ Kiểm tra lỗi trùng tên
      if (err.section_name && err.section_name[0] === "Tên khu vực đã tồn tại trong sân vận động này.") {
        Swal.fire('Lỗi', 'Tên khu vực đã tồn tại trong sân vận động này.', 'error');
      } else {
        Swal.fire('Lỗi', err.detail || 'Cập nhật khu vực thất bại!', 'error');
      }
    });
    
  };

  new bootstrap.Modal(document.getElementById('updateSectionModal')).show();
}

window.showUpdateSectionModal = showUpdateSectionModal;



  // hàm xử lý thêm section
  function showAddSectionModal(stadiumId) {
    document.getElementById('newSectionName').value = '';
    document.getElementById('newSectionCapacity').value = '';
  
    document.getElementById('addSectionForm').onsubmit = function (e) {
      e.preventDefault();
  
      const sectionName = document.getElementById('newSectionName').value.trim();
      const capacity = parseInt(document.getElementById('newSectionCapacity').value);
  
      // Kiểm tra hợp lệ sức chứa
      if (isNaN(capacity) || capacity <= 0 || capacity >= 3000) {
        Swal.fire('Lỗi', 'Sức chứa phải lớn hơn 0 và nhỏ hơn 3000.', 'error');
        return;
      }
  
      // Gửi request tạo section
      fetch(`${API_URL}${stadiumId}/sections/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          section_name: sectionName,
          capacity: capacity
        })
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw err }); // Đọc lỗi trả về từ API
        }
        return res.json();
      })
      .then(() => {
        Swal.fire('Thành công', 'Đã thêm khu vực mới!', 'success');
        $('#addSectionModal').modal('hide');
        loadSectionsForStadium(stadiumId);
      })
      .catch(err => {
        console.error(err);
  
        // Kiểm tra nếu lỗi là trùng tên khu vực
        if (err.section_name && err.section_name[0] === "Tên khu vực đã tồn tại trong sân vận động này.") {
          Swal.fire('Lỗi', 'Tên khu vực đã tồn tại trong sân vận động này.', 'error');
        } else {
          Swal.fire('Lỗi', 'Tạo khu vực thất bại!', 'error');
        }
      });
    };
  
    new bootstrap.Modal(document.getElementById('addSectionModal')).show();
  }
  window.showAddSectionModal = showAddSectionModal;
  
  
  // xóa sec
  function confirmDeleteSection(stadiumId, sectionId, sectionName) {
  Swal.fire({
    title: 'Bạn có chắc chắn?',
    text: `Bạn có muốn xóa khu vực "${sectionName}" không?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Có, xóa!',
    cancelButtonText: 'Hủy bỏ'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`${API_URL}${stadiumId}/sections/${sectionId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      .then(async response => {
        if (!response.ok) {
          // Nếu có JSON, parse lỗi; nếu không, dùng lỗi mặc định
          let errorMessage = 'Đã xảy ra lỗi khi xóa khu vực.';
          try {
            const err = await response.json();
            errorMessage = err.detail || errorMessage;
          } catch (e) {
            // Không có JSON body, giữ nguyên errorMessage
          }
          throw new Error(errorMessage);
        }

        // Nếu status là 204 thì không có JSON
        if (response.status === 204) {
          return null;
        }

        return response.json(); // Trường hợp khác có thể vẫn có JSON
      })
      .then(data => {
        // Nếu có `detail`, nghĩa là lỗi logic nào đó vẫn được trả trong 200
        if (data && data.detail) {
          Swal.fire('Lỗi', data.detail, 'error');
        } else {
          Swal.fire('Đã xóa!', `Khu vực "${sectionName}" đã được xóa thành công.`, 'success');
          loadSectionsForStadium(stadiumId); // Reload
        }
      })
      .catch(error => {
        console.error('Lỗi khi xóa section:', error);
        Swal.fire('Lỗi', error.message || 'Đã xảy ra lỗi khi xóa khu vực. Vui lòng thử lại.', 'error');
      });
    }
  });
}

window.confirmDeleteSection = confirmDeleteSection;

  
  
  
  function loadSeatsForSection(stadiumId, sectionId, sectionName, stadiumName) {
  fetch(`${API_URL}${stadiumId}/sections/${sectionId}/seats/`)
    .then(response => response.json())
    .then(data => {
      const seatContainer = document.getElementById('seatContainer-container');

      seatContainer.innerHTML = `
        <button id="back-to-sections-btn" class="btn btn-outline-secondary mb-3">
          <i class="bi bi-arrow-left-circle"></i> Quay lại khu vực
        </button>

        <h3><i class="bi bi-chair" style="color: #20c997; margin-right: 8px;"></i>
          Danh sách ghế của khu vực <strong>${sectionName}</strong> tại sân <strong>${stadiumName}</strong>
        </h3>

        <table id="seatTable" class="display">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã ghế</th>
              <th>Số ghế</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(seat => `
              <tr id="seat-row-${seat.seat_id}">
                <td>${seat.seat_id}</td>
                <td>${seat.seat_code}</td>
                <td>${seat.seat_number}</td>
                <td id="seat-status-${seat.seat_id}">
                  ${seat.status === 0 ? 'Sẵn sàng' : 'Bảo trì'}
                </td>
                <td>
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch"
                      id="switch-${seat.seat_id}"
                      ${seat.status === 0 ? 'checked' : ''}
                      onchange="toggleSeatStatus(${seat.seat_id}, this.checked)">
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      $('#seatTable').DataTable();

      // ✅ Gắn sự kiện cho nút "Quay lại khu vực"
      setTimeout(() => {
        const backBtn = document.getElementById('back-to-sections-btn');
        if (backBtn) {
          backBtn.addEventListener('click', (e) => {
  e.preventDefault();

  // Gọi lại khu vực
  loadSectionsForStadium(stadiumId);

  // Ẩn danh sách ghế, hiện danh sách khu vực
  seatContainer.style.display = 'none';
  document.getElementById('section-container').style.display = 'block';
});

        } else {
          console.error('Không tìm thấy nút quay lại khu vực!');
        }
      }, 0);
      document.getElementById('section-container').style.display = 'none';
      seatContainer.style.display = 'block';
    })
    .catch(error => {
      console.error('Lỗi khi lấy danh sách ghế:', error);
      Swal.fire('Lỗi', 'Không thể tải danh sách ghế', 'error');
    });
}

  window.loadSeatsForSection = loadSeatsForSection;

  function toggleSeatStatus(seatId, isChecked) {
    const newStatus = isChecked ? 0 : 1; // 0 = Sẵn sàng, 1 = Bảo trì
  
    fetch(`${API_URL2}${seatId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    })
    .then(response => {
      if (!response.ok) throw new Error('Cập nhật thất bại');
      return response.json();
    })
    .then(() => {
      const statusCell = document.getElementById(`seat-status-${seatId}`);
      statusCell.innerText = newStatus === 0 ? 'Sẵn sàng' : 'Bảo trì';
    })
    .catch(error => {
      console.error(error);
      Swal.fire('Lỗi', 'Không thể cập nhật trạng thái ghế', 'error');
      // Rollback toggle nếu lỗi
      const switchInput = document.getElementById(`switch-${seatId}`);
      if (switchInput) switchInput.checked = !isChecked;
    });
  }
  window.toggleSeatStatus = toggleSeatStatus;

  // Sau khi khởi tạo DataTable
$('#sectionTable tbody').on('click', 'tr', function () {
    const table = $('#sectionTable').DataTable();
    const dataRow = table.row(this).data();
  
    const sectionId = dataRow[0];
    const sectionName = dataRow[1];
  
    // Lấy lại stadiumName từ context bên trên
    loadSeatsForSection(stadiumId, sectionId, sectionName, stadiumName);
  });
// Tải dữ liệu ban đầu

loadStadiumsPage();
