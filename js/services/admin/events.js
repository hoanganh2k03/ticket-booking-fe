// import CONFIG from "../../utils/settings.js";
// const BASE_URL = CONFIG.BASE_URL;

// // TRẬN ĐẤU 
// function loadMatchPage(event) {
//   console.log("loadMatchPage được gọi!");
//   event.preventDefault();

//   fetch(`${BASE_URL}/api/events/matches/`)
//     .then(response => response.json())
//     .then(data => {
//       const content = document.getElementById('content-container');
//       content.innerHTML = `
//         <h3><i class="bi bi-dribbble" style="color: #dc3545; margin-right: 8px;"></i>Danh sách trận đấu</h3>
//         <a href="/pages/admin/events/add_match.html" class="btn btn-success shadow-sm">
//     <i class="bi bi-plus-circle me-1"></i> Tạo trận đấu mới
//   </a>


//         <table id="matchTable" class="display">
//           <thead>
//             <tr>
//               <th>STT</th>
//               <th>Mô Tả</th>
//               <th>Vòng</th>
//               <th>Đội 1</th>
//               <th>Đội 2</th>
//               <th>Sân</th>
//               <th>Giải</th>
//               <th>Thời gian</th>
//               <th>Hành động</th>
//             </tr>
//           </thead>
//           <tbody>
//           ${data.map(match => {
//             const matchTime = new Date(match.match_time);
//             const now = new Date();
//             const isPast = matchTime < now;
          
//             return `
//               <tr>
//                 <td>${match.match_id}</td>
//                 <td>${match.description}</td>
//                 <td>${match.round}</td>
//                 <td>${match.team_1_name}</td>
//                 <td>${match.team_2_name}</td>
//                 <td>${match.stadium_name}</td>
//                 <td>${match.league_name}</td>
//                 <td>${matchTime.toLocaleString()}</td>
//                 <td>
//                   ${isPast ? `<div class="text-danger small mb-1">Trận đã kết thúc</div>` : ''}
//                   <button class="btn btn-sm btn-outline-primary me-2" onclick="showUpdateMatchForm(${match.match_id})">
//                     <i class="bi bi-pencil-square"></i> Cập nhật
//                   </button>
//                   <button class="btn btn-sm btn-outline-danger" onclick="deleteMatch(${match.match_id})">
//                     Xóa
//                   </button>
//                 </td>
//               </tr>
//             `;
//           }).join('')}       
//           </tbody>
//         </table>
//       `;

//       $('#matchTable').DataTable();
//     })
//     .catch(error => {
//       console.error('Lỗi khi lấy danh sách trận:', error);
//       Swal.fire('Lỗi', 'Không thể tải danh sách trận đấu', 'error');
//     });
// }
// window.loadMatchPage = loadMatchPage;
// // hàm cập nhật trận
// function showUpdateMatchForm(matchId) {
//   Promise.all([
//     fetch(`${BASE_URL}/api/events/matches/${matchId}/`).then(res => res.json()),
//     fetch(`${BASE_URL}/api/events/creat/stadiums/`).then(res => res.json())
//   ])
//     .then(([match, stadiumsData]) => {
//       const content = document.getElementById('content-container');
//       const stadiumOptions = stadiumsData.data.map(stadium => {
//         const selected = stadium.stadium_name === match.stadium_name ? 'selected' : '';
//         return `<option value="${stadium.stadium_name}" ${selected}>${stadium.stadium_name}</option>`;
//       }).join('');

//       const matchTime = new Date(match.match_time);
//       const matchTimeLocal = new Date(matchTime.getTime() - matchTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
//       const now = new Date();
//       const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // thời điểm hiện tại + 1 ngày
//       const minDatetimeLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
//       content.innerHTML = `
//         <h3>Cập nhật trận đấu ${match.description}</h3>
//         <form id="updateMatchForm">
//           <div class="mb-3">
//             <label>Giải đấu</label>
//             <input type="text" class="form-control" value="${match.league_name}" disabled>
//           </div>
//           <div class="mb-3">
//             <label>Vòng</label>
//             <input type="text" class="form-control" value="${match.round}" disabled>
//           </div>
//           <div class="mb-3">
//             <label>Đội 1</label>
//             <input type="text" class="form-control" value="${match.team_1_name}" disabled>
//           </div>
//           <div class="mb-3">
//             <label>Đội 2</label>
//             <input type="text" class="form-control" value="${match.team_2_name}" disabled>
//           </div>
//           <div class="mb-3">
//             <label>Mô tả</label>
//             <input type="text" class="form-control" name="description" value="${match.description}" required>
//           </div>
//           <div class="mb-3">
//             <label>Tên sân</label>
//             <select class="form-select" name="stadium_name" id="stadiumSelect" required>
//               ${stadiumOptions}
//             </select>
//           </div>
//                 <div class="mb-3">
//           <label>Thời gian</label>
//           <input type="datetime-local" class="form-control" name="match_time" min="${minDatetimeLocal}" value="${matchTimeLocal}" required>
//         </div>
//           <button type="submit" class="btn btn-success">Cập nhật</button>
//           <button type="button" class="btn btn-danger" onclick="deleteMatch(${match.match_id})">Xoá</button>
//           <button type="button" class="btn btn-secondary" onclick="loadMatchPage(event)">Huỷ</button>
//         </form>
//       `;

//       document.getElementById('updateMatchForm').addEventListener('submit', function (e) {
//         e.preventDefault();
//         const formData = new FormData(e.target);
//         const match_time = new Date(formData.get('match_time'));

//         // Kiểm tra match_time phải > thời điểm hiện tại
//         if (match_time < tomorrow) {
//           Swal.fire('Lỗi', 'Thời gian trận đấu phải cách thời điểm hiện tại ít nhất 1 ngày.', 'error');
//           return;
//         }

//         const payload = {
//           description: formData.get('description'),
//           stadium_name: formData.get('stadium_name'),
//           match_time: match_time.toISOString()
//         };

//         fetch(`${BASE_URL}/api/events/matches/${matchId}/`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(payload)
//         })
//           .then(res => {
//             if (!res.ok) throw new Error('Cập nhật thất bại');
//             return res.json();
//           })
//           .then(data => {
//             Swal.fire('Thành công', 'Đã cập nhật trận đấu!', 'success');
//             loadMatchPage(new Event('custom'));
//           })
//           .catch(err => {
//             console.error(err);
//             Swal.fire('Lỗi', 'Không thể cập nhật', 'error');
//           });
//       });
//     })
//     .catch(error => {
//       console.error('Lỗi khi tải dữ liệu:', error);
//       Swal.fire('Lỗi', 'Không thể tải thông tin trận đấu hoặc sân vận động', 'error');
//     });
// }
// window.showUpdateMatchForm = showUpdateMatchForm;

// // xóa trận
// function deleteMatch(matchId) {
//   Swal.fire({
//     title: 'Bạn có chắc chắn?',
//     text: `Bạn có muốn xóa trận đấu #${matchId} không?`,
//     icon: 'warning',
//     showCancelButton: true,
//     confirmButtonText: 'Xóa',
//     cancelButtonText: 'Hủy'
//   }).then((result) => {
//     if (result.isConfirmed) {
//       fetch(`${BASE_URL}/api/events/matches/${matchId}/`, {
//         method: 'DELETE'
//       })
//       .then(response => {
//         if (!response.ok) throw new Error('Không thể xóa trận');
//         Swal.fire('Đã xóa!', 'Trận đấu đã được xóa.', 'success');
//         loadMatchPage(new Event('custom'));
//       })
//       .catch(error => {
//         console.error('Lỗi khi xóa trận:', error);
//         Swal.fire('Lỗi', 'Không thể xóa trận đấu', 'error');
//       });
//     }
//   });
// }
// window.deleteMatch = deleteMatch;

// // TẠO TRẬN
// function showCreateMatchForm(event) {
//     event.preventDefault();
  
//     const content = document.getElementById('content-container');
//     content.innerHTML = `
//       <h3>Tạo trận đấu mới</h3>
//       <form id="createMatchForm">
//         <div class="mb-3 datetime-group">
//     <label for="match_date">Ngày giờ trận đấu:</label>
//     <div class="datetime-wrapper">
//       <i class="bi bi-calendar-event-fill"></i>
//       <input type="datetime-local" class="form-control custom-datetime" id="match_date" name="match_date" required>
//     </div>
//     <small id="dateError" style="color: red; display: none;">Thời gian phải lớn hơn thời điểm hiện tại!</small>
//   </div>
  
//         <div class="mb-3">
//           <label>Mô tả:</label>
//           <input type="text" class="form-control" name="description" required>
//         </div>
//         <div class="mb-3">
//           <label>Vòng đấu:</label>
//           <input type="text" class="form-control" name="round" required>
//         </div>
//         <div class="mb-3">
//           <label>Sân vận động:</label>
//           <select class="form-control" name="stadium_id" id="stadiumSelect" required>
//             <option value="">Chọn sân vận động</option>
//           </select>
//         </div>
//         <div class="mb-3">
//           <label>Giải đấu:</label>
//           <select class="form-control" name="league" id="leagueSelect" required>
//             <option value="">Chọn giải đấu</option>
//           </select>
//         </div>
//         <div class="mb-3">
//           <label>Đội 1:</label>
//           <select class="form-control" name="team_1" id="team1Select" required>
//             <option value="">Chọn đội 1</option>
//           </select>
//         </div>
//         <div class="mb-3">
//           <label>Đội 2:</label>
//           <select class="form-control" name="team_2" id="team2Select" required>
//             <option value="">Chọn đội 2</option>
//           </select>
//         </div>
//         <button type="submit" class="btn btn-primary">Tạo</button>
//       </form>
//     `;
  
//     // Gán min cho input datetime-local là thời điểm hiện tại
//     const matchDateInput = document.getElementById('match_date');
//     const now = new Date();
//     const localISOTime = now.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
//     matchDateInput.min = localISOTime;
  
//     // Bắt sự kiện thay đổi để kiểm tra hợp lệ
//     matchDateInput.addEventListener('input', function () {
//       const selectedDate = new Date(this.value);
//       const currentTime = new Date();
//       if (selectedDate <= currentTime) {
//         document.getElementById('dateError').style.display = 'block';
//         this.setCustomValidity("Thời gian phải lớn hơn hiện tại.");
//       } else {
//         document.getElementById('dateError').style.display = 'none';
//         this.setCustomValidity("");
//       }
//     });
  
//     // Gọi API và đổ dữ liệu vào dropdown
//     fetch(`${BASE_URL}/api/events/creat/stadiums/`)
//       .then(res => res.json())
//       .then(data => {
//         const select = document.getElementById('stadiumSelect');
//         data.data.forEach(stadium => {
//           const option = document.createElement('option');
//           option.value = stadium.stadium_id;
//           option.textContent = stadium.stadium_name;
//           select.appendChild(option);
//         });
//       });
  
//     fetch(`${BASE_URL}/api/events/creat/leagues/`)
//       .then(res => res.json())
//       .then(data => {
//         const select = document.getElementById('leagueSelect');
//         data.data.forEach(league => {
//           const option = document.createElement('option');
//           option.value = league.league_name;
//           option.textContent = league.league_name;
//           select.appendChild(option);
//         });
//       });
  
//     fetch(`${BASE_URL}/api/events/creat/teams/`)
//       .then(res => res.json())
//       .then(data => {
//         const select1 = document.getElementById('team1Select');
//         const select2 = document.getElementById('team2Select');
//         data.data.forEach(team => {
//           const option1 = document.createElement('option');
//           option1.value = team.team_id;
//           option1.textContent = team.team_name;
//           select1.appendChild(option1);
  
//           const option2 = document.createElement('option');
//           option2.value = team.team_id;
//           option2.textContent = team.team_name;
//           select2.appendChild(option2);
//         });
//       });
  
//     // Gửi request khi submit form
//     document.getElementById('createMatchForm').addEventListener('submit', function (e) {
//       e.preventDefault();
  
//       const formData = new FormData(e.target);
//       const selectedDate = new Date(formData.get("match_date"));
//       const now = new Date();
  
//       // Kiểm tra lại để đảm bảo người dùng không vượt qua check bằng JS
//       if (selectedDate <= now) {
//         Swal.fire('Lỗi', 'Thời gian trận đấu phải lớn hơn hiện tại!', 'error');
//         return;
//       }
  
//       const data = {
//         match_date: selectedDate.toISOString(),
//         description: formData.get("description"),
//         stadium_id: parseInt(formData.get("stadium_id")),
//         league: formData.get("league"),
//         round: formData.get("round"),
//         team_1: parseInt(formData.get("team_1")),
//         team_2: parseInt(formData.get("team_2"))
//       };
  
//       fetch(`${BASE_URL}/api/events/matches/create/`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(data)
//       })
//         .then(res => res.json())
//         .then(response => {
//           if (response.status === "success") {
//             Swal.fire('Thành công', 'Đã tạo trận đấu mới!', 'success');
//             loadMatchPage(event); // Reload danh sách trận
//           } else {
//             console.error(response.errors);
//             Swal.fire('Lỗi', 'Không thể tạo trận đấu. Vui lòng kiểm tra dữ liệu.', 'error');
//           }
//         })
//         .catch(err => {
//           console.error('Lỗi tạo trận:', err);
//           Swal.fire('Lỗi', 'Không thể kết nối đến server.', 'error');
//         });
//     });
//   }






// // GIẢI ĐẤU
// function loadLeaguesPage(event) {
//   event.preventDefault();

//   fetch(`${BASE_URL}/api/events/leagues/`)
//     .then(response => response.json())
//     .then(data => {
//       const leagues = data.results;
//       const content = document.getElementById('content-container');
//       content.innerHTML = `
//         <h3><i class="bi bi-trophy-fill" style="color: #ffc107; margin-right: 8px;"></i>Danh sách Giải đấu</h3>

//         <button id="addLeagueBtn" class="btn btn-primary mb-3">Thêm Giải đấu</button>

//         <table id="leagueTable" class="display">
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Tên giải</th>
//               <th>Loại giải đấu</th>
//               <th>Ngày bắt đầu</th>
//               <th>Ngày kết thúc</th>
//               <th>Ngày tạo</th>
//               <th>Ngày cập nhật</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${leagues.map(league => {
//               let leagueTypeName;
//               switch (league.league_type) {
//                 case 0:
//                   leagueTypeName = 'Giải Vô địch quốc gia';
//                   break;
//                 case 1:
//                   leagueTypeName = 'Giải Đấu loại trực tiếp';
//                   break;
//                 case 2:
//                   leagueTypeName = 'Giải Giao hữu';
//                   break;
//                 default:
//                   leagueTypeName = 'Không xác định';
//               }

//               return `
//                 <tr>
//                   <td>${league.league_id}</td>
//                   <td>${league.league_name}</td>
//                   <td>${leagueTypeName}</td>
//                   <td>${league.start_date}</td>
//                   <td>${league.end_date}</td>
//                   <td>${league.created_at}</td>
//                   <td>${league.updated_at}</td>
//                   <td>
//                     <button class="btn btn-warning btn-sm edit-btn" data-id="${league.league_id}">Cập nhật</button>
//                     <button class="btn btn-danger btn-sm delete-btn" data-id="${league.league_id}">Xóa</button>
//                   </td>
//                 </tr>
//               `;
//             }).join('')}
//           </tbody>
//         </table>
//       `;

//       // Nút Thêm giải đấu
//       const addLeagueBtn = document.getElementById('addLeagueBtn');
//       if (addLeagueBtn) {
//         addLeagueBtn.addEventListener('click', function () {
//           window.location.href = 'events/add_leagues.html';
//         });
//       }

//       // Khởi tạo bảng
//       $('#leagueTable').DataTable();

//       // Sự kiện XÓA
//       document.querySelectorAll('.delete-btn').forEach(button => {
//         button.addEventListener('click', function () {
//           const leagueId = this.getAttribute('data-id');

//           Swal.fire({
//             title: 'Xác nhận',
//             text: 'Bạn có chắc chắn muốn xóa giải đấu này?',
//             icon: 'warning',
//             showCancelButton: true,
//             confirmButtonText: 'Xóa',
//             cancelButtonText: 'Hủy'
//           }).then(result => {
//             if (result.isConfirmed) {
//               fetch(`${BASE_URL}/api/events/leagues/${leagueId}/`, {
//                 method: 'DELETE'
//               })
//                 .then(res => {
//                   if (res.status === 204) {
//                     Swal.fire('Đã xóa!', 'Giải đấu đã được xóa.', 'success').then(() => {
//                       loadLeaguesPage(new Event('click'));
//                     });
//                   } else {
//                     throw new Error('Xóa thất bại');
//                   }
//                 })
//                 .catch(err => {
//                   console.error(err);
//                   Swal.fire('Lỗi', 'Không thể xóa giải đấu', 'error');
//                 });
//             }
//           });
//         });
//       });

//       // Sự kiện CẬP NHẬT
//       document.querySelectorAll('.edit-btn').forEach(button => {
//         button.addEventListener('click', function () {
//           const leagueId = this.getAttribute('data-id');
//           window.location.href = `events/edit_leagues.html?id=${leagueId}`;
//         });
//       });
//     })
//     .catch(error => {
//       console.error('Lỗi khi lấy danh sách giải đấu:', error);
//       Swal.fire('Lỗi', 'Không thể tải danh sách giải đấu', 'error');
//     });
// }

// // Xóa giải đấu
// function deleteLeague(leagueId) {
//   fetch(`${BASE_URL}/api/events/leagues/${leagueId}/`, {
//     method: "DELETE",
//   })
//     .then(response => {
//       if (response.ok) {
//         loadLeaguesPage(); // Tải lại trang sau khi xóa
//       } else {
//         return response.json().then(errorData => {
//           throw new Error(errorData.detail || "Không thể xóa giải đấu");
//         });
//       }
//     })
//     .catch(error => {
//       console.error('Lỗi khi xóa giải đấu:', error);
//       Swal.fire('Lỗi', error.message, 'error');
//     });
// }




// // SÂN VẬN ĐỘNG
// // show
// function loadStadiumsPage(event) {
//   if (event) event.preventDefault();

//   fetch(`${BASE_URL}/api/events/stadiums/`)
//     .then(response => response.json())
//     .then(data => {
//       const stadiums = data.results;
//       const content = document.getElementById('content-container');
//       content.innerHTML = `
//         <h3><i class="bi bi-geo-alt-fill" style="color: #dc3545; margin-right: 8px;"></i>Danh sách Sân vận động</h3>
        
//         <div class="mb-3 text-end">
//           <button id="addStadiumBtn" class="btn" style="background-color: #007bff; color: white;">
//             <i class="bi bi-plus-circle me-1"></i> Thêm Sân mới
//           </button>
//         </div>
        
//         <table id="stadiumTable" class="display">
//           <thead>
//             <tr>
//               <th>STT</th>
//               <th>Tên sân</th>
//               <th>Địa điểm</th>
//               <th>Sức chứa</th>   
//               <th>Layout</th>
//               <th>Hành động</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${stadiums.map((stadium, index) => `
//               <tr data-stadium-id="${stadium.stadium_id}" data-stadium-name="${stadium.stadium_name}">
//                 <td>${index + 1}</td>
//                 <td>${stadium.stadium_name}</td>
//                 <td>${stadium.location}</td>
//                 <td>${stadium.capacity}</td>
//                 <td><img src="${stadium.stadium_layouts}" alt="${stadium.stadium_name}" width="50" height="50"/></td>
//                 <td>
//                   <button class="btn btn-sm btn-outline-primary view-sections-btn">Xem khu vực</button>
//                   <button class="btn btn-sm btn-outline-warning update-stadium-btn"><i class="bi bi-pencil-square"></i> Cập nhật</button>
//                   <button class="btn btn-sm btn-outline-danger delete-stadium-btn"><i class="bi bi-trash"></i> Xóa</button>
//                   <label class="btn btn-sm btn-outline-secondary upload-layout-btn">
//                     <i class="bi bi-upload"></i> Upload ảnh
//                     <input type="file" accept="image/*" class="d-none stadium-layout-input">
//                   </label>
//                 </td>
//               </tr>
//             `).join('')}
//           </tbody>
//         </table>
//         <div id="stadium-update-form-container"></div>
//       `;

//       const addStadiumBtn = document.getElementById('addStadiumBtn');
//       if (addStadiumBtn) {
//         addStadiumBtn.addEventListener('click', function () {
//           window.location.href = 'events/add_stadiums.html'; 
//         });
//       }

//       $('#stadiumTable').DataTable();

//       document.querySelectorAll('.view-sections-btn').forEach(button => {
//         button.addEventListener('click', function () {
//           const stadiumId = this.closest('tr').getAttribute('data-stadium-id');
//           loadSectionsForStadium(stadiumId);
//         });
//       });

//       document.querySelectorAll('.update-stadium-btn').forEach(button => {
//         button.addEventListener('click', function () {
//           const stadiumId = this.closest('tr').getAttribute('data-stadium-id');
//           showUpdateStadiumForm(stadiumId);
//         });
//       });

//       document.querySelectorAll('.delete-stadium-btn').forEach(button => {
//         button.addEventListener('click', function () {
//           const stadiumId = this.closest('tr').getAttribute('data-stadium-id');
//           const stadiumName = this.closest('tr').getAttribute('data-stadium-name');
//           deleteStadium(stadiumId, stadiumName);
//         });
//       });

//       // ✅ Xử lý upload ảnh layout
//       document.querySelectorAll('.stadium-layout-input').forEach(input => {
//         input.addEventListener('change', function () {
//           const file = this.files[0];
//           const stadiumRow = this.closest('tr');
//           const stadiumId = stadiumRow.getAttribute('data-stadium-id');

//           if (!file) return;

//           const formData = new FormData();
//           formData.append('stadium_layouts', file);

//           fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/upload-layout/`, {
//             method: 'PATCH',
//             body: formData
//           })
//           .then(response => {
//             if (!response.ok) {
//               throw new Error('Không thể cập nhật ảnh.');
//             }
//             return response.json();
//           })
//           .then(data => {
//             Swal.fire('Thành công', 'Ảnh sân đã được cập nhật!', 'success');
//             // Cập nhật ảnh hiển thị
//             stadiumRow.querySelector('td:nth-child(5) img').src = data.stadium_layouts;
//           })
//           .catch(error => {
//             console.error('Lỗi upload ảnh:', error);
//             Swal.fire('Lỗi', 'Tải ảnh thất bại.', 'error');
//           });
//         });
//       });
//     })
//     .catch(error => {
//       console.error('Lỗi khi lấy danh sách sân vận động:', error);
//       Swal.fire('Lỗi', 'Không thể tải danh sách sân vận động', 'error');
//     });
// }



// // xóa sânsân
// function deleteStadium(stadiumId, stadiumName) {
//   Swal.fire({
//     title: 'Bạn có chắc chắn?',
//     text: `Bạn có muốn xóa sân ${stadiumName} không?`,
//     icon: 'warning',
//     showCancelButton: true,
//     confirmButtonText: 'Có, xóa!',
//     cancelButtonText: 'Hủy bỏ',
//     reverseButtons: true
//   }).then((result) => {
//     if (result.isConfirmed) {
//       fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/`, {
//         method: 'DELETE',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       })
//       .then(response => {
//         if (response.ok) {
//           Swal.fire(
//             'Đã xóa!',
//             `Sân ${stadiumName} đã được xóa thành công.`,
//             'success'
//           );
//           document.querySelector(`tr[data-stadium-id="${stadiumId}"]`)?.remove();
//         } else {
//           throw new Error('Lỗi khi xóa sân');
//         }
//       })
//       .catch(error => {
//         console.error('Có lỗi xảy ra:', error);
//         Swal.fire('Lỗi', 'Không thể xóa sân. Vui lòng thử lại.', 'error');
//       });
//     }
//   });
// }




// // Giả sử bạn có nút xóa trong bảng
// // document.querySelectorAll('.delete-stadium-btn').forEach(button => {
// //   button.addEventListener('click', function () {
// //     const stadiumId = this.closest('tr').getAttribute('data-stadium-id');
// //     const stadiumName = this.closest('tr').querySelector('.stadium-name').textContent;  // Giả sử bạn có lớp này cho tên sân
// //     deleteStadium(stadiumId, stadiumName);
// //   });
// // });



// // update sân
// function showUpdateStadiumForm(stadiumId) {
//   fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/`)
//     .then(response => response.json())
//     .then(stadium => {
//       const formContainer = document.getElementById('stadium-update-form-container');
//       formContainer.innerHTML = `
//         <h4 class="mt-4">Cập nhật Sân vận động ${stadium.stadium_name}</h4>
//         <form id="updateStadiumForm">
//           <div class="mb-2">
//             <label class="form-label">Tên sân:</label>
//             <input type="text" class="form-control" id="updateStadiumName" value="${stadium.stadium_name}" required>
//           </div>
//           <div class="mb-2">
//             <label class="form-label">Địa điểm:</label>
//             <input type="text" class="form-control" id="updateStadiumLocation" value="${stadium.location}" required>
//           </div>
//           <div class="mb-2">
//   <label class="form-label">Sức chứa:</label>
//   <input type="number" class="form-control" id="updateStadiumCapacity" value="${stadium.capacity}" readonly>
// </div>

//           <button type="submit" class="btn btn-success">Lưu thay đổi</button>
//         </form>
//       `;

//       document.getElementById('updateStadiumForm').addEventListener('submit', function (e) {
//         e.preventDefault();
//         updateStadium(stadiumId);
//       });
//     })
//     .catch(error => {
//       console.error('Lỗi khi tải thông tin sân:', error);
//       Swal.fire('Lỗi', 'Không thể tải thông tin sân', 'error');
//     });
// }
// // hàm update
// function updateStadium(stadiumId) {
//   const name = document.getElementById('updateStadiumName').value;
//   const location = document.getElementById('updateStadiumLocation').value;
//   const capacity = document.getElementById('updateStadiumCapacity').value;

//   fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/`, {
//     method: 'PATCH',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       stadium_name: name,
//       location: location,
//       capacity: parseInt(capacity)
//     })
//   })
//     .then(response => {
//       if (!response.ok) throw new Error('Update failed');
//       return response.json();
//     })
//     .then(data => {
//       Swal.fire('Thành công', 'Đã cập nhật sân vận động!', 'success');
//       loadStadiumsPage(new Event('refresh')); // Load lại bảng
//     })
//     .catch(error => {
//       console.error('Lỗi khi cập nhật sân:', error);
//       Swal.fire('Lỗi', 'Cập nhật sân thất bại', 'error');
//     });
// }


// // events-team
// function loadTeamsPage(event) {
//   if (event) event.preventDefault();

//   fetch(`${BASE_URL}/api/events/teams/`)
//     .then(response => response.json())
//     .then(data => {
//       const teams = data.results;
//       const content = document.getElementById('content-container');
//       content.innerHTML = `
//         <div class="d-flex justify-content-between align-items-center mb-3">
//           <h3><i class="bi bi-people-fill" style="color: #0dcaf0; margin-right: 8px;"></i>Danh sách đội bóng</h3>
//           <button id="addTeamBtn" class="btn btn-primary">
//             <i class="bi bi-plus-circle me-1"></i> Thêm đội bóng
//           </button>
//         </div>
//         <table id="teamTable" class="display">
//           <thead>
//             <tr>
//               <th>STT</th>
//               <th>Tên đội</th>
//               <th>Logo</th>
//               <th>HLV trưởng</th>
//               <th>Mô tả</th>
//               <th>Hành động</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${teams.map((team, index) => `
//               <tr data-team-id="${team.team_id}" data-team-name="${team.team_name}">
//                 <td>${index + 1}</td>
//                 <td>${team.team_name}</td>
//                 <td>
//                   <img id="team-logo-${team.team_id}" src="${team.logo || '/media/team_logos/default.webp'}" alt="${team.team_name}" width="50" height="50"/>
//                 </td>
//                 <td>${team.head_coach}</td>
//                 <td>${team.description}</td>
//                 <td>
//                   <button id="editTeamBtn" class="btn btn-sm btn-warning me-1 edit-team-btn">
//                     <i class="bi bi-pencil-square"></i> Cập nhật
//                   </button>
//                   <button class="btn btn-sm btn-danger me-1 delete-team-btn">
//                     <i class="bi bi-trash"></i> Xóa
//                   </button>
//                   <label class="btn btn-sm btn-info upload-logo-btn">
//                     <i class="bi bi-upload"></i> Upload logo
//                     <input type="file" accept="image/*" class="d-none team-logo-input">
//                   </label>
//                 </td>
//               </tr>
//             `).join('')}
//           </tbody>
//         </table>
//       `;

//       // Nút thêm đội
//       const addTeamBtn = document.getElementById('addTeamBtn');
// if (addTeamBtn) {
//   addTeamBtn.addEventListener('click', function () {
//     window.location.href = 'events/add_team.html'; // Thay đổi đườsng dẫn nếu cần
//   });
// }


//       $('#teamTable').DataTable();

//       // Nút cập nhật đội
//       document.querySelectorAll('.edit-team-btn').forEach(button => {
//         button.addEventListener('click', function () {
//             const teamId = this.closest('tr').getAttribute('data-team-id');
//             window.location.href = 'events/edit_team.html?id=' + teamId;
//         });
//     });
//       // Nút xóa đội
//       document.querySelectorAll('.delete-team-btn').forEach(button => {
//         button.addEventListener('click', function () {
//           const teamId = this.closest('tr').getAttribute('data-team-id');
//           const teamName = this.closest('tr').getAttribute('data-team-name');
//           deleteTeam(teamId, teamName);
//         });
//       });

//       // Xử lý upload logo
//       document.querySelectorAll('.team-logo-input').forEach(input => {
//         input.addEventListener('change', function () {
//           const file = this.files[0];
//           const teamRow = this.closest('tr');
//           const teamId = teamRow.getAttribute('data-team-id');

//           if (!file) return;

//           const formData = new FormData();
//           formData.append('logo', file);

//           fetch(`${BASE_URL}/api/events/teams/${teamId}/upload-logo/`, {
//             method: 'POST',
//             body: formData
//           })
//             .then(response => {
//               if (!response.ok) {
//                 throw new Error('Không thể cập nhật logo.');
//               }
//               return response.json();
//             })
//             .then(data => {
//               Swal.fire('Thành công', 'Logo đội đã được cập nhật!', 'success');
//               teamRow.querySelector(`#team-logo-${teamId}`).src = data.logo_url;
//             })
//             .catch(error => {
//               console.error('Lỗi upload logo:', error);
//               Swal.fire('Lỗi', 'Tải ảnh thất bại.', 'error');
//             });
//         });
//       });
//     })
//     .catch(error => {
//       console.error('Lỗi khi lấy danh sách đội bóng:', error);
//       Swal.fire('Lỗi', 'Không thể tải danh sách đội bóng', 'error');
//     });
// }

// function deleteTeam(teamId) {
//   Swal.fire({
//     title: 'Xác nhận xóa?',
//     text: 'Bạn có chắc chắn muốn xóa đội bóng này?',
//     icon: 'warning',
//     showCancelButton: true,
//     confirmButtonText: 'Xóa',
//     cancelButtonText: 'Hủy'
//   }).then((result) => {
//     if (result.isConfirmed) {
//       fetch(`${BASE_URL}/api/events/teams/${teamId}/`, {
//         method: 'DELETE'
//       })
//         .then(response => {
//           if (response.ok) {
//             Swal.fire('Đã xóa', 'Đội bóng đã được xóa.', 'success');
//             loadTeamsPage(); // Reload lại danh sách
//           } else {
//             Swal.fire('Lỗi', 'Xóa không thành công.', 'error');
//           }
//         });
//     }
//   });
// }

//   // events-section theo stadium_idid
//   function loadSectionsForStadium(stadiumId) {
//     fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/sections/`)
//       .then(response => response.json())
//       .then(data => {
//         if (data.length === 0) {
//           Swal.fire('Thông báo', 'Không có khu vực nào cho sân này.', 'info');
//           return;
//         }
  
//         const stadiumName = data[0].stadium_name || 'Không rõ';
//         const content = document.getElementById('content-container');
  
//         content.innerHTML = `
//           <button id="back-to-stadiums-btn" class="btn btn-outline-secondary mb-3">
//             <i class="bi bi-arrow-left-circle"></i> Quay lại danh sách sân vận động
//           </button>
  
//           <h3><i class="bi bi-list-ul" style="color: #0d6efd; margin-right: 8px;"></i>Khu vực tại sân ${stadiumName}</h3>
//             <button class="btn mb-3" style="background-color: #007bff; color: white;" onclick="showAddSectionModal(${stadiumId})">
//             <i class="bi bi-plus-circle"></i> Thêm khu vực
//           </button>
//           <table id="sectionTable" class="display">
//             <thead>
//               <tr>
//                 <th>ID</th>
//                 <th>Tên khu vực</th>
//                 <th>Sức chứa</th>
//                 <th>Hành động</th>
//               </tr>
//             </thead>
//             <tbody>
//   ${data.map(section => `
//     <tr>
//       <td>${section.section_id}</td>
//       <td>${section.section_name}</td>
//       <td>${section.capacity}</td>
//       <td>
//         <button class="btn btn-sm btn-outline-primary" 
//           onclick="loadSeatsForSection(${stadiumId}, ${section.section_id}, '${section.section_name}', '${stadiumName}')">
//           <i class="bi bi-eye"></i> Xem ghế
//         </button>
//         <button class="btn btn-sm btn-outline-warning" 
//           onclick="showUpdateSectionModal(${stadiumId}, ${section.section_id}, '${section.section_name}', ${section.capacity})">
//           <i class="bi bi-pencil-square"></i> Cập nhật
//         </button>
//         <button class="btn btn-sm btn-outline-danger" 
//           onclick="confirmDeleteSection(${stadiumId}, ${section.section_id}, '${section.section_name}')">
//           <i class="bi bi-trash"></i> Xóa
//         </button>
//       </td>
//     </tr>
//   `).join('')}
// </tbody>

//           </table>
  
//           <!-- Modal cập nhật section -->
// <div class="modal fade" id="updateSectionModal" tabindex="-1" aria-labelledby="updateSectionModalLabel" aria-hidden="true">
//   <div class="modal-dialog modal-dialog-centered">
//     <div class="modal-content shadow-lg">
//       <div class="modal-header bg-warning text-dark">
//         <h5 class="modal-title" id="updateSectionModalLabel">
//           <i class="bi bi-pencil-square me-2"></i>Cập nhật khu vực
//         </h5>
//         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
//       </div>
//       <div class="modal-body">
//         <form id="updateSectionForm">
//           <div class="mb-3">
//             <label for="sectionNameInput" class="form-label">Tên khu vực</label>
//             <input type="text" class="form-control" id="sectionNameInput" placeholder="VD: Khán đài B" required>
//           </div>
//           <div class="mb-3">
//             <label for="sectionCapacityInput" class="form-label">Sức chứa</label>
//             <input type="number" class="form-control" id="sectionCapacityInput" placeholder="VD: 4000" required>
//           </div>
//           <input type="hidden" id="currentSectionId">
//           <div class="text-end">
//             <button type="submit" class="btn btn-warning text-dark">
//               <i class="bi bi-save me-1"></i> Lưu thay đổi
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   </div>
// </div>

//           <!-- Modal thêm section -->
// <div class="modal fade" id="addSectionModal" tabindex="-1" aria-labelledby="addSectionModalLabel" aria-hidden="true">
//   <div class="modal-dialog modal-dialog-centered">
//     <div class="modal-content shadow-lg">
//       <div class="modal-header bg-primary text-white">
//         <h5 class="modal-title" id="addSectionModalLabel">
//           <i class="bi bi-plus-circle me-2"></i>Thêm khu vực mới
//         </h5>
//         <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Đóng"></button>
//       </div>
//       <div class="modal-body">
//         <form id="addSectionForm">
//           <div class="mb-3">
//             <label for="newSectionName" class="form-label">Tên khu vực</label>
//             <input type="text" class="form-control" id="newSectionName" placeholder="VD: Khán đài A" required>
//           </div>
//           <div class="mb-3">
//             <label for="newSectionCapacity" class="form-label">Sức chứa</label>
//             <input type="number" class="form-control" id="newSectionCapacity" placeholder="VD: 5000" required>
//           </div>
//           <div class="text-end">
//             <button type="submit" class="btn" style="background-color: #007bff; color: white;">
//               <i class="bi bi-plus-lg"></i> Thêm khu vực
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   </div>
// </div>


//         `;
  
//         $('#sectionTable').DataTable();
  
//         document.getElementById('back-to-stadiums-btn').addEventListener('click', function (e) {
//           loadStadiumsPage(e);
//         });
//       })
//       .catch(error => {
//         console.error('Lỗi khi tải danh sách khu vực:', error);
//         Swal.fire('Lỗi', 'Không thể tải danh sách khu vực của sân', 'error');
//       });
//   }
//   // Hàm xử lý update sectionsection
//   function showUpdateSectionModal(stadiumId, sectionId, sectionName, capacity) {
//     document.getElementById('sectionNameInput').value = sectionName;
//     document.getElementById('sectionCapacityInput').value = capacity;
//     document.getElementById('currentSectionId').value = sectionId;
  
//     // Gắn sự kiện submit cho form cập nhật
//     document.getElementById('updateSectionForm').onsubmit = function (e) {
//       e.preventDefault();
  
//       const updatedName = document.getElementById('sectionNameInput').value;
//       const updatedCapacity = parseInt(document.getElementById('sectionCapacityInput').value);
//       const sectionId = document.getElementById('currentSectionId').value;
  
//       fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/sections/${sectionId}/update/`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           section_name: updatedName,
//           capacity: updatedCapacity
//         })
//       })
//       .then(res => {
//         if (!res.ok) {
//           throw new Error('Không thể cập nhật khu vực');
//         }
//         return res.json();
//       })
//       .then(() => {
//         Swal.fire('Thành công', 'Cập nhật khu vực thành công!', 'success');
//         $('#updateSectionModal').modal('hide');
//         loadSectionsForStadium(stadiumId);
//       })
//       .catch(err => {
//         console.error(err);
//         Swal.fire('Lỗi', 'Cập nhật khu vực thất bại!', 'error');
//       });
//     };
  
//     // Hiển thị modal
//     new bootstrap.Modal(document.getElementById('updateSectionModal')).show();
//   }
//     // hàm xử lý thêm section
//     function showAddSectionModal(stadiumId) {
//       document.getElementById('newSectionName').value = '';
//       document.getElementById('newSectionCapacity').value = '';
    
//       document.getElementById('addSectionForm').onsubmit = function (e) {
//         e.preventDefault();
    
//         const sectionName = document.getElementById('newSectionName').value;
//         const capacity = parseInt(document.getElementById('newSectionCapacity').value);
    
//         fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/sections/create/`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({
//             section_name: sectionName,
//             capacity: capacity
//           })
//         })
//         .then(res => {
//           if (!res.ok) throw new Error('Không thể tạo khu vực');
//           return res.json();
//         })
//         .then(() => {
//           Swal.fire('Thành công', 'Đã thêm khu vực mới!', 'success');
//           $('#addSectionModal').modal('hide');
//           loadSectionsForStadium(stadiumId);
//         })
//         .catch(err => {
//           console.error(err);
//           Swal.fire('Lỗi', 'Tạo khu vực thất bại!', 'error');
//         });
//       };
    
//       new bootstrap.Modal(document.getElementById('addSectionModal')).show();
//     }
//     // xóa sec
//     function confirmDeleteSection(stadiumId, sectionId, sectionName) {
//       Swal.fire({
//         title: 'Bạn có chắc chắn?',
//         text: `Bạn có muốn xóa khu vực "${sectionName}" không?`,
//         icon: 'warning',
//         showCancelButton: true,
//         confirmButtonText: 'Có, xóa!',
//         cancelButtonText: 'Hủy bỏ'
//       }).then((result) => {
//         if (result.isConfirmed) {
//           fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/sections/${sectionId}/delete/`, {
//             method: 'DELETE',
//             headers: {
//               'Content-Type': 'application/json',
//             }
//           })
//           .then(response => {
//             if (response.ok) { // dùng response.ok thay vì kiểm tra cụ thể 204
//               Swal.fire('Đã xóa!', `Section "${sectionName}" đã được xóa thành công.`, 'success');
//               // Gọi lại hàm để load danh sách mới
//               loadSectionsForStadium(stadiumId);

//             } else {
//               return response.json().then(err => {
//                 throw new Error(err.detail || 'Không thể xóa section');
//               });
//             }
//           })
//           .catch(error => {
//             console.error('Lỗi khi xóa section:', error);
//             Swal.fire('Lỗi', error.message || 'Đã xảy ra lỗi khi xóa section. Vui lòng thử lại.', 'error');
//           });
          
          
          
//         }
//       });
//     }
    

  
//   // lấy ghế theo từng sec và sân
//   function loadSeatsForSection(stadiumId, sectionId, sectionName, stadiumName) {
//     fetch(`${BASE_URL}/api/events/stadiums/${stadiumId}/sections/${sectionId}/seats/`)
//       .then(response => response.json())
//       .then(data => {
//         const content = document.getElementById('content-container');
  
//         content.innerHTML = `
//           <button class="btn btn-outline-secondary mb-3" onclick="loadSectionsForStadium(${stadiumId})">
//             <i class="bi bi-arrow-left-circle"></i> Quay lại khu vực
//           </button>
  
//           <h3><i class="bi bi-chair" style="color: #20c997; margin-right: 8px;"></i>Danh sách ghế của khu vực <strong>${sectionName}</strong> tại sân <strong>${stadiumName}</strong></h3>
  
//           <table id="seatTable" class="display">
//             <thead>
//               <tr>
//                 <th>ID</th>
//                 <th>Mã ghế</th>
//                 <th>Số ghế</th>
//                 <th>Trạng thái</th>
//                 <th>Hành động</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${data.map(seat => `
//                 <tr id="seat-row-${seat.seat_id}">
//                   <td>${seat.seat_id}</td>
//                   <td>${seat.seat_code}</td>
//                   <td>${seat.seat_number}</td>
//                   <td id="seat-status-${seat.seat_id}">${seat.status === 0 ? 'Sẵn sàng' : 'Bảo trì'}</td>
//                   <td>
//                     <div class="form-check form-switch">
//                       <input class="form-check-input" type="checkbox" role="switch"
//                         id="switch-${seat.seat_id}"
//                         ${seat.status === 0 ? 'checked' : ''}
//                         onchange="toggleSeatStatus(${seat.seat_id}, this.checked)">
//                     </div>
//                   </td>
//                 </tr>
//               `).join('')}
//             </tbody>
//           </table>
//         `;
  
//         $('#seatTable').DataTable();
//       })
//       .catch(error => {
//         console.error('Lỗi khi lấy danh sách ghế:', error);
//         Swal.fire('Lỗi', 'Không thể tải danh sách ghế', 'error');
//       });
//   }
  
//   function toggleSeatStatus(seatId, isChecked) {
//     const newStatus = isChecked ? 0 : 1; // 0 = Sẵn sàng, 1 = Bảo trì
  
//     fetch(`${BASE_URL}/api/tickets/seats/${seatId}/`, {
//       method: 'PATCH',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ status: newStatus })
//     })
//     .then(response => {
//       if (!response.ok) throw new Error('Cập nhật thất bại');
//       return response.json();
//     })
//     .then(() => {
//       const statusCell = document.getElementById(`seat-status-${seatId}`);
//       statusCell.innerText = newStatus === 0 ? 'Sẵn sàng' : 'Bảo trì';
//     })
//     .catch(error => {
//       console.error(error);
//       Swal.fire('Lỗi', 'Không thể cập nhật trạng thái ghế', 'error');
//       // Rollback toggle nếu lỗi
//       const switchInput = document.getElementById(`switch-${seatId}`);
//       if (switchInput) switchInput.checked = !isChecked;
//     });
//   }
  

//   // Sau khi khởi tạo DataTable
// $('#sectionTable tbody').on('click', 'tr', function () {
//     const table = $('#sectionTable').DataTable();
//     const dataRow = table.row(this).data();
  
//     const sectionId = dataRow[0];
//     const sectionName = dataRow[1];
  
//     // Lấy lại stadiumName từ context bên trên
//     loadSeatsForSection(stadiumId, sectionId, sectionName, stadiumName);
//   });