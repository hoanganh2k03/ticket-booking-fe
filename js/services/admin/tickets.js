// import CONFIG from "../../utils/settings.js";
// const BASE_URL = CONFIG.BASE_URL;


// function creatNewTickets(event) {
//     event.preventDefault();
  
//     fetch(`${BASE_URL}/api/tickets/matches/without-tickets/`)
//       .then(response => response.json())
//       .then(data => {
//         const content = document.getElementById('content-container');
//         content.innerHTML = `
//           <h3>Danh sách trận cần được tạo vé</h3>
//           <table id="matchTable" class="display">
//             <thead>
//               <tr>
//                 <th>STT</th>
//                 <th>Mô Tả</th>
//                 <th>Vòng</th>
//                 <th>Đội 1</th>
//                 <th>Đội 2</th>
//                 <th>Sân</th>
//                 <th>Giải</th>
//                 <th>Thời gian</th>
//                 <th>Chi tiết</th>
//               </tr>
//             </thead>
//             <tbody>
//             ${data.data.map((match, index) => {
//               const matchTime = new Date(match.match_time);
//               const isPast = matchTime < new Date();
            
//               const actionButton = isPast
//   ? `<button class="btn btn-sm btn-secondary" onclick="loadMatchDetailPage(${match.match_id})">Trận đấu đã kết thúc</button>`
//   : `<button class="btn btn-sm btn-outline-warning" onclick="loadMatchDetailPage(${match.match_id})">Tạo vé</button>`;

            
//               return `
//                 <tr>
//                   <td>${index + 1}</td>
//                   <td>${match.description}</td>
//                   <td>${match.round}</td>
//                   <td>${match.team_1_name}</td>
//                   <td>${match.team_2_name}</td>
//                   <td>${match.stadium_name}</td>
//                   <td>${match.league_name}</td>
//                   <td>${matchTime.toLocaleString()}</td>
//                   <td>${actionButton}</td>
//                 </tr>
//               `;
//             }).join('')}
            
//             </tbody>
//           </table>
//         `;
  
//         $('#matchTable').DataTable();
//       })
//       .catch(error => {
//         console.error('Lỗi khi lấy danh sách trận:', error);
//         Swal.fire('Lỗi', 'Không thể tải danh sách trận đấu', 'error');
//       });
//   }
  
//   // hàm tạo vé theo section
//   function getLocalDatetimeString(date) {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     const hours = String(date.getHours()).padStart(2, '0');
//     const minutes = String(date.getMinutes()).padStart(2, '0');
//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }
//   // hàm hiển thị thông tin để tạo vé theo trận 
//  // hàm hiển thị thông tin để tạo vé theo trận 
//  function loadMatchDetailPage(matchId) {
//   fetch(`${BASE_URL}/api/tickets/match-detail/${matchId}/`)
//     .then(response => response.json())
//     .then(data => {
//       const now = new Date();
//       const matchTime = new Date(data.match_time);
//       const content = document.getElementById('content-container');
//       window.matchTime = matchTime; // Lưu để dùng ở hàm createTicket

//       content.innerHTML = `
//         <button class="btn btn-outline-secondary mb-3" onclick="creatNewTickets(event)">
//           <i class="bi bi-arrow-left-circle"></i> Quay lại danh sách trận
//         </button>

//         <h3><i class="bi bi-ticket-detailed" style="color: #ffc107; margin-right: 8px;"></i>
//           ${matchTime < now ? 'Chi tiết vé - Trận đã kết thúc' : 'Tạo vé từng Section'}
//         </h3>

//         <div class="card">
//           <div class="card-body">
//             <div class="info-item">
//               <span class="info-label"><strong>Mô tả:</strong></span>
//               <span class="info-value">${data.description}</span>
//             </div>
//             <div class="info-item">
//               <span class="info-label"><strong>Sân vận động:</strong></span>
//               <span class="info-value">${data.stadium_name}</span>
//             </div>
//             <div class="info-item">
//               <span class="info-label"><strong>Thời gian thi đấu:</strong></span>
//               <span class="info-value">${matchTime.toLocaleString()}</span>
//             </div>
//           </div>
//         </div>

//         <h4 class="mt-4">Danh sách khu vực chỗ ngồi của sân ${data.stadium_name}</h4>
//         <form id="ticket-form">
//           <table class="table table-bordered">
//             <thead>
//   <tr>
//     <th>STT</th>
//     <th>Tên khu vực</th>
//     <th>Giá vé</th>
//     <th>Ngày mở bán</th>
//     <th>Số ghế khả dụng</th>
//     ${matchTime >= now ? '<th>Thao tác</th>' : ''}
//   </tr>
// </thead>

//             <tbody>
//               ${data.sections.map((section, index) => {
//                 const price = section.has_price ? parseFloat(section.price).toLocaleString('vi-VN') + ' đ' : '';
//                 const sellDateObj = section.has_price ? new Date(section.sell_date) : null;
//                 const sellDate = sellDateObj ? getLocalDatetimeString(sellDateObj) : '';
//                 const availableSeats = section.available_seats;

//                 let actionButton = '';

//                 // Không hiển thị thông báo lỗi về ghế nếu chưa tạo vé
//                 if (!section.has_price) {
//                   actionButton = availableSeats === 0 
//                     ? `<button class="btn btn-sm btn-outline-secondary" disabled>
//                         <i class="bi bi-x-circle"></i> Không thể tạo vé
//                       </button>` 
//                     : `<button id="btn-create-${section.section_id}" class="btn btn-sm btn-outline-primary"
//                         onclick="createTicket(${data.match_id}, ${section.section_id}, event)">
//                         <i class="bi bi-ticket-detailed"></i> Tạo vé
//                       </button>`;
//                 } else {
//                   if (!section.is_closed) {
//                     actionButton = `
//                       <button class="btn btn-sm btn-outline-warning" onclick="event.preventDefault();redirectToEdit(${section.pricing_id})">
//                         <i class="bi bi-pencil-square"></i> Cập nhật vé đang bán
//                       </button>`;
//                   } else {
//                     if (sellDateObj > now) {
//                       actionButton = `
//                         <button class="btn btn-sm btn-outline-primary" onclick="showUpdateTicketForm(${section.pricing_id})">
//                           <i class="bi bi-pencil-square"></i> Cập nhật vé chưa bán
//                         </button>`;
//                     } else if (matchTime < now) {
//                       actionButton = `
//                         <button class="btn btn-sm btn-outline-secondary" disabled>
//                           <i class="bi bi-flag-fill"></i> Trận đã đấu
//                         </button>`;
//                     } else {
//                       actionButton = `<span class="text-muted">Không thể cập nhật</span>`;
//                     }
//                   }
//                 }

//                 return `
//                   <tr>
//                     <td>${index + 1}</td>
//                     <td>${section.section_name}</td>
//                     <td>
//                       <input type="text" id="price-${section.section_id}" class="form-control ${section.has_price ? 'bg-light' : ''}"
//                         value="${price}" ${section.has_price || matchTime < now ? 'readonly' : ''}>
//                     </td>
//                     <td>
//                       <input type="datetime-local" id="sell-${section.section_id}" class="form-control ${section.has_price ? 'bg-light' : ''}"
//                         value="${sellDate}" 
//                         ${section.has_price || matchTime < now ? 'readonly' : ''} 
//                         min="${getLocalDatetimeString(new Date(Date.now() + 60000))}" 
//                         max="${getLocalDatetimeString(new Date(matchTime.getTime() - 60000))}">
//                     </td>
//                     <td>
//                       <input type="text" id="available-seats-${section.section_id}" class="form-control bg-light"
//                         value="${availableSeats}" readonly>
//                     </td>
//                    ${matchTime >= now ? `<td>${actionButton}</td>` : ''}

//                   </tr>
//                 `;
//               }).join('')}
//             </tbody>
//           </table>
//         </form>
//       `;
//     })
//     .catch(error => {
//       console.error('Lỗi khi lấy chi tiết trận:', error);
//       Swal.fire('Lỗi', 'Không thể tải chi tiết trận đấu', 'error');
//     });
// }







// // tạo vé
// function createTicket(matchId, sectionId, event) {
//   event.preventDefault();

//   const price = document.getElementById(`price-${sectionId}`).value;
//   const sellDateInput = document.getElementById(`sell-${sectionId}`);
//   const sellDateStr = sellDateInput.value;
//   const availableSeatsInput = document.getElementById(`available-seats-${sectionId}`);
//   const availableSeats = parseInt(availableSeatsInput.value);

//   if (!price || !sellDateStr || isNaN(availableSeats)) {
//     Swal.fire('Lỗi', 'Vui lòng nhập đầy đủ thông tin', 'error');
//     return;
//   }

//   if (isNaN(price) || parseFloat(price) <= 0) {
//     Swal.fire('Lỗi', 'Vui lòng nhập giá vé hợp lệ', 'error');
//     return;
//   }

//   if (availableSeats <= 0) {
//     Swal.fire('Lỗi', 'Khu vực này không còn ghế khả dụng để tạo vé', 'error');
//     return;
//   }

//   const requestData = {
//     price: parseFloat(price),
//     sell_date: sellDateStr,
//     available_seats: availableSeats
//   };

//   fetch(`${BASE_URL}/api/tickets/match/${matchId}/section/${sectionId}/price/`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(requestData),
//   })
//   .then(async response => {
//     let data;
//     try {
//       data = await response.json();
//     } catch (e) {
//       console.error('Không thể parse JSON từ server:', e);
//       throw new Error('Phản hồi không hợp lệ từ server');
//     }

//     if (!response.ok) {
//       const errorMsg = data?.message || 'Đã xảy ra lỗi khi tạo vé';
//       throw new Error(errorMsg);
//     }

//     Swal.fire('Thành công', 'Vé đã được tạo cho khu vực này!', 'success');

//     const priceInput = document.getElementById(`price-${sectionId}`);
//     const sellDateInput = document.getElementById(`sell-${sectionId}`);

//     priceInput.value = `${parseFloat(price).toLocaleString('vi-VN')} đ`;
//     priceInput.readOnly = true;
//     priceInput.classList.add('bg-light');

//     const sellDate = new Date(sellDateStr);
//     sellDateInput.value = getLocalDatetimeString(sellDate);
//     sellDateInput.disabled = true;
//     sellDateInput.classList.add('bg-light');

//     const button = document.getElementById(`btn-create-${sectionId}`);
//     if (button) {
//       button.outerHTML = `
//         <button class="btn btn-sm btn-primary" disabled>
//           <i class="bi bi-check-circle"></i> Đã tạo vé
//         </button>`;
//     }
//   })
//   .catch(error => {
//     console.error('Lỗi khi tạo vé:', error);
//     Swal.fire('Lỗi', error.message || 'Không thể tạo vé', 'error');
//   });
// }



//   // update vé
//   // function updateTicket(matchId, sectionId, event) {
//   //   event.preventDefault(); // Ngăn form reload
  
//   //   const price = parseInt(document.getElementById(`price-${sectionId}`).value);
//   //   const availableSeats = parseInt(document.getElementById(`seats-${sectionId}`).value);
//   //   const sellDate = document.getElementById(`sell-${sectionId}`).value;
//   //   const isClosedStr = document.getElementById(`closed-${sectionId}`).value;
//   //   const isClosed = isClosedStr === "true";
  
//   //   if (isNaN(price) || isNaN(availableSeats) || !sellDate) {
//   //     Swal.fire('Lỗi nhập liệu', 'Vui lòng nhập đúng định dạng để cập nhật!', 'warning');
//   //     return;
//   //   }
  
//   //   const requestData = {
//   //     price: price,
//   //     available_seats: availableSeats,
//   //     sell_date: sellDate,
//   //     is_closed: isClosed
//   //   };
  
//   //   fetch(`http://192.168.238.22:8000/api/tickets/match/${matchId}/section/${sectionId}/price/`, {
//   //     method: "PUT",
//   //     headers: {
//   //       "Content-Type": "application/json",
//   //     },
//   //     body: JSON.stringify(requestData),
//   //   })
//   //     .then(response => {
//   //       if (!response.ok) {
//   //         throw new Error("Lỗi cập nhật từ server");
//   //       }
//   //       return response.json();
//   //     })
//   //     .then(data => {
//   //       Swal.fire('Thành công', 'Cập nhật vé thành công!', 'success');
//   //     })
//   //     .catch(error => {
//   //       console.error("Lỗi cập nhật vé:", error);
//   //       Swal.fire('Lỗi', 'Không thể cập nhật vé. Vui lòng thử lại.', 'error');
//   //     });
//   // }
  
//   // hiển thị VÉ sectionPrice

//   function loadTicketPage(event) {
//     event.preventDefault();
  
//     Promise.all([
//       fetch(`${BASE_URL}/api/tickets/section-prices/`).then(res => res.json()),
//       fetch(`${BASE_URL}/api/tickets/completed-matches/`).then(res => res.json())
//     ])
//       .then(([ticketData, matches]) => {
//         const content = document.getElementById('content-container');
  
//         const matchOptions = matches.map(match =>
//           `<option value="${match.match_id}">${match.description}</option>`
//         ).join('');
  
//         content.innerHTML = `
//           <div class="d-flex justify-content-between align-items-center mb-3">
//             <h3>Danh sách Vé</h3>
//             <a href="#" onclick="creatNewTickets(event)" class="btn btn-primary">
//                 <i class="bi bi-ticket-perforated"></i> Tạo vé cho trận đấu
//             </a>
//             <div id="ticket-controls" class="d-flex align-items-center">
//               <select id="match-filter" class="form-select me-2">
//                 <option value="">--Các trận đã tạo vé--</option>
//                 ${matchOptions}
//               </select>
//             </div>
//           </div>  
  
//           <table id="ticketTable" class="display">
//             <thead>
//               <tr>
//                 <th>STT</th>
//                 <th>Tên trận</th>
//                 <th>Tên sân vận động</th>
//                 <th>Tên khu vực</th>
//                 <th>Giá vé</th>
//                 <th>Số ghế còn</th>
//                 <th>Trạng thái</th>
//                 <th>Ngày bán</th>
//                 <th>Thời gian thi đấu</th>
//                 <th>Hành động</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${ticketData.results.map(ticket => {
//                 const now = new Date();
//                 const sellDate = new Date(ticket.sell_date);
//                 const matchTime = new Date(ticket.match_time);
  
//                 let actionButton = '';
//                 if (!ticket.is_closed) {
//                   actionButton = `
//                    <button class="btn btn-sm btn-outline-warning" onclick="redirectToEdit(${ticket.pricing_id})">
//   <i class="bi bi-pencil-square"></i> Cập nhật vé đang bán
// </button>`;
// } else {
//   if (sellDate > now) {
//     actionButton = `
//       <button class="btn btn-sm btn-outline-primary" onclick="showUpdateTicketForm(${ticket.pricing_id})">
//         <i class="bi bi-pencil-square"></i> Cập nhật vé chưa bán
//       </button>`;
//   } else if (matchTime < now) {
//     actionButton = `
//       <button class="btn btn-sm btn-outline-secondary" disabled>
//         <i class="bi bi-flag-fill"></i> Trận đã đấu
//       </button>`;
//   } else {
//     actionButton = `<span class="text-muted">Không thể cập nhật</span>`;
//   }
// }
  
//                 return `
//                   <tr data-pricing-id="${ticket.pricing_id}">
//                     <td>${ticket.pricing_id}</td>
//                     <td>${ticket.match_description}</td>
//                     <td>${ticket.stadium_name}</td>
//                     <td>${ticket.section_name}</td>
//                     <td>${Number(ticket.price).toLocaleString('vi-VN')} đ</td>
//                     <td>${ticket.available_seats}</td>
//                     <td>${ticket.is_closed ? 'Đang đóng' : 'Đang mở'}</td>
//                     <td>${ticket.sell_date}</td>
//                     <td>${ticket.match_time}</td>
//                     <td>
//                       ${actionButton}
//                       <button class="btn btn-sm btn-outline-danger" onclick="deleteTicket(${ticket.pricing_id})">Xóa</button>
//                     </td>
//                   </tr>
//                 `;
//               }).join('')}
//             </tbody>
//           </table>
//         `;
  
//         const table = $('#ticketTable').DataTable();
  
//         document.getElementById('match-filter').addEventListener('change', function () {
//           const selectedMatchId = this.value;
        
//           const renderActionButtons = (ticket) => {
//             const now = new Date();
//             const sellDate = new Date(ticket.sell_date);
//             const matchTime = new Date(ticket.match_time);
        
//             if (!ticket.is_closed) {
//               return `
//                 <button class="btn btn-sm btn-outline-warning" onclick="redirectToEdit(${ticket.pricing_id})">
//                   <i class="bi bi-pencil-square"></i> Cập nhật vé đang bán
//                 </button>`;
//             } else {
//               if (sellDate > now) {
//                 return `
//                   <button class="btn btn-sm btn-outline-primary" onclick="showUpdateTicketForm(${ticket.pricing_id})">
//                     <i class="bi bi-pencil-square"></i> Cập nhật vé chưa bán
//                   </button>`;
//               } else if (matchTime < now) {
//                 return `
//                   <button class="btn btn-sm btn-outline-secondary" disabled>
//                     <i class="bi bi-flag-fill"></i> Trận đã đấu
//                   </button>`;
//               } else {
//                 return `<span class="text-muted">Không thể cập nhật</span>`;
//               }
//             }
//           };
        
//           if (selectedMatchId) {
//             fetch(`${BASE_URL}/api/tickets/match/${selectedMatchId}/section-prices/`)
//               .then(res => res.json())
//               .then(data => {
//                 if (!data || data.length === 0) {
//                   Swal.fire('Lỗi', 'Không có dữ liệu vé cho trận đấu này', 'error');
//                   return;
//                 }
//                 table.clear();
//                 data.forEach(ticket => {
//                   const actionButton = renderActionButtons(ticket);
//                   table.row.add([
//                     ticket.pricing_id,
//                     ticket.match_description,
//                     ticket.stadium_name,
//                     ticket.section_name,
//                     Number(ticket.price).toLocaleString('vi-VN') + ' đ',
//                     ticket.available_seats,
//                     ticket.is_closed ? 'Đang đóng' : 'Đang mở',
//                     ticket.sell_date,
//                     ticket.match_time,
//                     `${actionButton} <button class="btn btn-sm btn-outline-danger" onclick="deleteTicket(${ticket.pricing_id})">Xóa</button>`
//                   ]);
//                 });
//                 table.draw();
//               });
//           } else {
//             // Trường hợp không lọc - render lại từ dữ liệu gốc ticketData
//             table.clear().rows.add(ticketData.results.map(ticket => {
//               const actionButton = renderActionButtons(ticket);
//               return [
//                 ticket.pricing_id,
//                 ticket.match_description,
//                 ticket.stadium_name,
//                 ticket.section_name,
//                 Number(ticket.price).toLocaleString('vi-VN') + ' đ',
//                 ticket.available_seats,
//                 ticket.is_closed ? 'Đang đóng' : 'Đang mở',
//                 ticket.sell_date,
//                 ticket.match_time,
//                 `${actionButton} <button class="btn btn-sm btn-outline-danger" onclick="deleteTicket(${ticket.pricing_id})">Xóa</button>`
//               ];
//             })).draw();
//           }
//         });
        
//       })
//       .catch(error => {
//         console.error('Lỗi khi tải dữ liệu vé:', error);
//         Swal.fire('Lỗi', 'Không thể tải dữ liệu vé', 'error');
//       });
//   }
  
//   function redirectToEdit(pricingId) {
    
//     console.log(pricingId);
//     window.location.href = `/pages/admin/tickets/edit_ticketPrice.html?pricing_id=${pricingId}`;
//     console.log(window.location.href);
//   }
  
  
//   // UPDATE VÉ SECTION PRICE 
//   function showUpdateTicketForm(pricingId) {
//     fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/`)
//       .then(res => res.json())
//       .then(ticket => {
//         const now = new Date();
//         const matchTime = new Date(ticket.match_time);
  
//         const toDatetimeLocal = (date) => {
//           const pad = (n) => n.toString().padStart(2, '0');
//           return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
//         };
  
//         const nowStr = toDatetimeLocal(now);
//         const matchTimeStr = toDatetimeLocal(matchTime);
  
//         Swal.fire({
//           title: 'Cập nhật vé',
//           html: `
//             <div class="form-group text-start mb-2">
//               <label>Tên trận:</label>
//               <input type="text" class="form-control" value="${ticket.match_description}" readonly>
//             </div>
//             <div class="form-group text-start mb-2">
//               <label>Tên sân vận động:</label>
//               <input type="text" class="form-control" value="${ticket.stadium_name}" readonly>
//             </div>
//             <div class="form-group text-start mb-2">
//               <label>Tên khu vực:</label>
//               <input type="text" class="form-control" value="${ticket.section_name}" readonly>
//             </div>
//             <div class="form-group text-start mb-2">
//               <label>Số ghế khả dụng:</label>
//               <input type="number" class="form-control" value="${ticket.available_seats}" readonly>
//             </div>
//             <div class="form-group text-start mb-2">
//               <label>Giá vé:</label>
//               <input type="number" id="edit-price" class="form-control" value="${ticket.price}">
//             </div>
//             <div class="form-group text-start">
//               <label>Ngày bán:</label>
//               <input 
//                 type="datetime-local" 
//                 id="edit-sell-date" 
//                 class="form-control" 
//                 value="${ticket.sell_date}" 
//                 min="${nowStr}" 
//                 max="${matchTimeStr}">
//             </div>
//           `,
//           showCancelButton: true,
//           confirmButtonText: 'Cập nhật',
//           cancelButtonText: 'Hủy',
//           preConfirm: () => {
//             const price = parseFloat(document.getElementById('edit-price').value);
//             const sellDateInput = document.getElementById('edit-sell-date').value;
  
//             const sellDate = new Date(sellDateInput);
  
//             if (isNaN(sellDate.getTime())) {
//               Swal.showValidationMessage('Vui lòng nhập ngày bán hợp lệ.');
//               return false;
//             }
  
//             if (sellDate <= now) {
//               Swal.showValidationMessage('Ngày bán phải lớn hơn thời điểm hiện tại.');
//               return false;
//             }
  
//             if (sellDate >= matchTime) {
//               Swal.showValidationMessage('Ngày bán phải nhỏ hơn thời gian diễn ra trận đấu.');
//               return false;
//             }
  
//             const updatedData = {
//               price: price,
//               sell_date: sellDateInput,
//             };
  
//             return fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/`, {
//               method: 'PUT',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify(updatedData)
//             })
//             .then(res => {
//               if (!res.ok) throw new Error("Cập nhật không thành công");
//               return res.json();
//             })
//             .catch(err => {
//               Swal.showValidationMessage(`Lỗi: ${err.message}`);
//             });
//           }
//         }).then(result => {
//           if (result.isConfirmed) {
//             Swal.fire('Thành công', 'Cập nhật vé thành công', 'success').then(() => {
//               loadTicketPage(new Event('click'));
//             });
//           }
//         });
//       })
//       .catch(err => {
//         Swal.fire('Lỗi', 'Không thể tải dữ liệu vé', 'error');
//       });
//   }
  
  
  
  
  
//   // XÓA VÉ
//   function deleteTicket(pricingId) {
//     Swal.fire({
//       title: 'Xác nhận xóa?',
//       text: "Hành động này sẽ không thể hoàn tác!",
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#d33',
//       cancelButtonText: 'Hủy',
//       confirmButtonText: 'Xóa'
//     }).then((result) => {
//       if (result.isConfirmed) {
//         fetch(`${BASE_URL}/api/tickets/section-prices/${pricingId}/`, {
//           method: 'DELETE'
//         })
//         .then(res => {
//           if (!res.ok) throw new Error('Xóa thất bại');
//           Swal.fire('Đã xóa!', 'Vé đã được xóa thành công.', 'success').then(() => {
//             loadTicketPage(new Event('click'));
//           });
//         })
//         .catch(err => {
//           Swal.fire('Lỗi', 'Không thể xóa vé', 'error');
//         });
//       }
//     });
//   }
