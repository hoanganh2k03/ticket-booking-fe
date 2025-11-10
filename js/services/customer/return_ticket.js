import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

let allOrders = []; // Store all orders for filtering

// Function to render orders
function renderOrders(orders) {
    const orderList = document.getElementById('order-list');
    orderList.innerHTML = '';

    if (orders.length === 0) {
        orderList.innerHTML = '<p>Không có đơn hàng nào phù hợp với bộ lọc.</p>';
        return;
    }

    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.classList.add('order-card');

        const formattedDate = new Date(order.created_at).toLocaleString('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
        const matchTime = new Date(order.match.match_time).toLocaleString('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short'
        });

        orderCard.innerHTML = `
            <div class="order-header">
                <p>Đơn hàng: ${order.order_id} - ${order.match.league}</p>
                <i class="fas fa-chevron-down toggle-details"></i>
            </div>
            <div class="order-content">
                <div class="left">
                    <p><strong>Trận đấu:</strong> ${order.match.team_1} vs ${order.match.team_2}</p>
                    <p><strong>Thời gian trận đấu:</strong> ${matchTime}</p>
                    <p><strong>Sân vận động:</strong> ${order.stadium_name}</p>
                </div>
                <div class="right">
                    <p><strong>Thời gian đặt:</strong> ${formattedDate}</p>
                    <p><strong>Tổng tiền:</strong> ${parseFloat(order.total_amount).toLocaleString('vi-VN')} VND</p>
                </div>
            </div>
            <div class="order-details">
                ${groupOrderDetailsBySection(order.order_details)}
            </div>
        `;

        // Toggle order details
        orderCard.querySelector('.toggle-details').addEventListener('click', (e) => {
            e.stopPropagation();
            const details = orderCard.querySelector('.order-details');
            const icon = orderCard.querySelector('.toggle-details');
            details.classList.toggle('active');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });

        // Open modal for return ticket
        orderCard.querySelectorAll('.return-ticket-btn').forEach(button => {
            button.addEventListener('click', () => {
                const detailId = button.getAttribute('data-detail-id');
                openModal(detailId);
            });
        });

        orderList.appendChild(orderCard);
    });
}

// Function to group order details by section_name
function groupOrderDetailsBySection(orderDetails) {
    const groupedBySection = orderDetails.reduce((acc, detail) => {
        const sectionName = detail.section_name || 'Không xác định';
        if (!acc[sectionName]) {
            acc[sectionName] = [];
        }
        acc[sectionName].push(detail);
        return acc;
    }, {});

    let groupedHTML = '';
    for (const [section, details] of Object.entries(groupedBySection)) {
        groupedHTML += `
        <div class="section-group">
            <strong>Khu vực: ${section}</strong>
            ${details.map(detail => {
                const priceFormatted = parseFloat(detail.price).toLocaleString('vi-VN');
                const seatDisplay = detail.seat || 'Chưa chọn';
                const promoDisplay = detail.promotion ? `<p><strong>Mã khuyến mãi:</strong> ${detail.promotion}</p>` : '';

                if (detail.return === null) {
                    return `
                        <div class="ticket">
                            <p><strong>Ghế:</strong> ${seatDisplay}</p>
                            <p><strong>Giá vé:</strong> ${priceFormatted} VND</p>
                            ${promoDisplay}
                            <button class="return-ticket-btn" data-detail-id="${detail.detail_id}">Hoàn Vé</button>
                        </div>
                    `;
                } else {
                    const returnInfo = detail.return;
                    const returnTime = new Date(returnInfo.return_time).toLocaleString('vi-VN');
                    const processedTime = returnInfo.processed_time ? new Date(returnInfo.processed_time).toLocaleString('vi-VN') : 'Chưa xử lý';
                    const refundAmount = returnInfo.refund_amount ? parseFloat(returnInfo.refund_amount).toLocaleString('vi-VN') + ' VND' : 'Chưa có';
                    
                    const statusMapping = {
                        'pending': 'Đang chờ',
                        'approved': 'Đã duyệt',
                        'completed': 'Hoàn tất',
                        'rejected': 'Từ chối'
                    };

                    const methodMapping = {
                        'bank_card': 'Thẻ ngân hàng',
                        'transfer': 'Chuyển khoản',
                        'cash': 'Tiền mặt'
                    };

                    const returnStatusVN = statusMapping[returnInfo.return_status] || returnInfo.return_status;
                    const refundMethodVN = methodMapping[returnInfo.refund_method] || returnInfo.refund_method;

                    return `
                        <div class="ticket returned-ticket">
                            <p><strong>Ghế:</strong> ${seatDisplay}</p>
                            <p><strong>Giá vé:</strong> ${priceFormatted} VND</p>
                            ${promoDisplay}
                            <div class="return-info">
                                <p><strong>Thông tin trả vé:</strong></p>
                                <p><strong>⏱ Thời gian yêu cầu:</strong> ${returnTime}</p>
                                <p><strong>📌 Trạng thái:</strong> ${returnStatusVN}</p>
                                <p><strong>💳 Phương thức hoàn tiền:</strong> ${refundMethodVN}</p>
                                <p><strong>💰 Số tiền hoàn:</strong> ${refundAmount}</p>
                                <p><strong>📝 Lý do:</strong> ${returnInfo.return_reason}</p>
                                <p><strong>🗒 Ghi chú:</strong> ${returnInfo.note || 'Không có'}</p>
                                <p><strong>✅ Thời gian xử lý:</strong> ${processedTime}</p>
                            </div>
                        </div>
                    `;
                }
            }).join('')}
        </div>
        `;
    }

    return groupedHTML;
}

// Populate stadium filter options
function populateStadiumFilters() {
    const stadiumFilter = document.getElementById('stadiumFilter');
    const stadiums = [...new Set(allOrders.map(order => order.stadium_name))];
    stadiums.forEach(stadium => {
        const option = document.createElement('option');
        option.value = stadium;
        option.textContent = stadium;
        stadiumFilter.appendChild(option);
    });
}

// Setup filter event listeners
function setupFilterListeners() {
    const filters = ['priceSort', 'stadiumFilter', 'dateFilter', 'dateSort'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                console.log(`Filter ${filterId} changed to: ${element.value}`);
                applyFilters();
            });
        } else {
            console.error(`Element with ID ${filterId} not found`);
        }
    });

    const resetButton = document.getElementById('resetFilters');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            filters.forEach(filterId => {
                const element = document.getElementById(filterId);
                if (element) element.value = ''; // Reset all filters to empty
            });
            console.log('Filters reset');
            applyFilters();
        });
    } else {
        console.error('Reset button not found');
    }
}

// Apply filters to orders
function applyFilters() {
    const priceSort = document.getElementById('priceSort').value;
    const stadium = document.getElementById('stadiumFilter').value;
    const date = document.getElementById('dateFilter').value;
    const dateSort = document.getElementById('dateSort').value;

    console.log('Applying filters:', { priceSort, stadium, date, dateSort });

    let filteredOrders = [...allOrders];

    // Filter by stadium
    if (stadium) {
        filteredOrders = filteredOrders.filter(order => order.stadium_name === stadium);
    }

    // Filter by date
    if (date) {
        const selectedDate = new Date(date);
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate.toDateString() === selectedDate.toDateString();
        });
    }

    // Sort orders: prioritize dateSort, use priceSort as secondary sort
    filteredOrders.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        const priceA = parseFloat(a.total_amount) || 0;
        const priceB = parseFloat(b.total_amount) || 0;

        // Primary sort: by date if dateSort is selected
        if (dateSort) {
            const dateComparison = dateSort === 'asc' ? dateA - dateB : dateB - dateA;
            // Secondary sort: by price if priceSort is selected and dates are equal
            if (dateComparison === 0 && priceSort) {
                console.log(`Secondary sort by price: ${priceA} vs ${priceB}`);
                return priceSort === 'asc' ? priceA - priceB : priceB - priceA;
            }
            console.log(`Sorting by date: ${dateA} vs ${dateB}`);
            return dateComparison;
        }

        // If no dateSort but priceSort is selected, sort by price
        if (priceSort) {
            console.log(`Sorting by price: ${priceA} vs ${priceB}`);
            return priceSort === 'asc' ? priceA - priceB : priceB - priceA;
        }

        // Default: sort by date descending if no sort is explicitly selected
        console.log(`Default sorting by date: ${dateA} vs ${dateB}`);
        return dateB - dateA;
    });

    console.log('Filtered and sorted orders:', filteredOrders);
    renderOrders(filteredOrders);
}

// Function to fetch orders
async function fetchOrders() {
    const customerId = localStorage.getItem('customer_id');
    if (!customerId) {
        showCusToast('Vui lòng đăng nhập để xem danh sách đơn hàng.', 'info');
        setTimeout(() => {
            window.location.href = '/pages/customer/login.html';
        }, 1000);
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/orders/order-list/?customer_id=${customerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Lỗi khi gọi API');
        }

        const data = await response.json();
        
        if (data.status === 'success' && data.data && data.data.length > 0) {
            allOrders = data.data; // Lưu trữ danh sách đơn hàng gốc
            // Sort orders by created_at descending (newest first) by default
            allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            console.log('Fetched and sorted orders:', allOrders);
            populateStadiumFilters();
            renderOrders(allOrders);
            setupFilterListeners();
        } else {
            document.getElementById('order-list').innerHTML = '<p>Không có đơn hàng nào.</p>';
        }
    } catch (error) {
        console.error('Lỗi:', error);
        document.getElementById('order-list').innerHTML = '<p>Danh sách đơn hàng trống.</p>';
    }
}

// Open modal
function openModal(detailId) {
    const modal = new bootstrap.Modal(document.getElementById('reasonModal'));
    const submitButton = document.getElementById('submit-reason');
    submitButton.setAttribute('data-order-detail-id', detailId);
    modal.show();
}

// Submit reason
document.getElementById('submit-reason').addEventListener('click', async () => {
    const reasonText = document.getElementById('reason-text').value;
    const orderDetailId = document.getElementById('submit-reason').getAttribute('data-order-detail-id');

    if (!reasonText) {
        showCusToast('Vui lòng nhập lý do hoàn vé!', 'warning');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/orders/ticket-return/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reason: reasonText,
                detail_id: orderDetailId
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Lỗi khi gửi lý do hoàn vé');
        }

        if (responseData.status === 'success') {
            showCusToast('Lý do hoàn vé đã được gửi thành công!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('reasonModal')).hide();
            document.getElementById('reason-text').value = ''; // Clear textarea
            setTimeout(() => {
                location.reload(); // Reload trang để cập nhật trạng thái vé
            }, 1000);
        } else {
            throw new Error(responseData.message || 'Có lỗi xảy ra khi xử lý yêu cầu');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        showCusToast(`Lỗi: ${error.message}`, 'danger');
    }
});

// Initialize
window.onload = fetchOrders;