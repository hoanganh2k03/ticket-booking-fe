import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

let allOrders = []; // Store all orders for filtering

window.onload = function() {
    // Check for access token and customer_id
    const accessToken = localStorage.getItem('access_token');
    const customer_id = localStorage.getItem('customer_id');
    if (!accessToken || !customer_id) {
        showCusToast('Vui lòng đăng nhập để xem danh sách đơn hàng.', 'info');
        setTimeout(() => {
            window.location.href = '/pages/customer/login.html';
        }, 1000);
        return;
    }

    // Fetch customer orders
    fetch(`${BASE_URL}/api/orders/customer/?customer_id=${customer_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => {
            if (!response.ok) {
                console.error('Error fetching orders:', response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.data) {
                allOrders = data.data;
                console.log('Fetched orders:', allOrders);

                // Sort orders by created_at (newest first)
                allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                populateStadiumFilters();
                displayOrders(allOrders);
                setupFilterListeners();
            } else {
                // showCusToast('Không thể tải danh sách đơn hàng.', 'danger');
                document.getElementById('order-list').innerHTML = '<p>Không có đơn hàng nào.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            if (error.message.includes('Unauthorized')) {
                showCusToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'danger');
                setTimeout(() => {
                    window.location.href = '/pages/customer/login.html';
                }, 1000);
            } else {
                showCusToast('Có lỗi xảy ra khi tải danh sách đơn hàng.', 'danger');
                document.getElementById('order-list').innerHTML = '<p>Tải danh sách đơn hàng không thành công.</p>';
            }
        });
};


// Populate stadium filter options
function populateStadiumFilters() {
    const stadiumFilter = document.getElementById('stadiumFilter');
    const stadiums = [...new Set(allOrders.map(order => order.match.stadium_name))];
    stadiums.forEach(stadium => {
        const option = document.createElement('option');
        option.value = stadium;
        option.textContent = stadium;
        stadiumFilter.appendChild(option);
    });
}

// Setup filter event listeners
function setupFilterListeners() {
    const filters = ['orderStatusFilter', 'priceSort', 'stadiumFilter', 'dateFilter', 'dateSort'];
    filters.forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', applyFilters);
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
        filters.forEach(filterId => {
            document.getElementById(filterId).value = '';
        });
        applyFilters();
    });
}

// Apply filters to orders
function applyFilters() {
    const orderStatus = document.getElementById('orderStatusFilter').value;
    const priceSort = document.getElementById('priceSort').value;
    const stadium = document.getElementById('stadiumFilter').value;
    const date = document.getElementById('dateFilter').value;
    const dateSort = document.getElementById('dateSort').value;

    let filteredOrders = [...allOrders];

    // Filter by order status
    if (orderStatus) {
        filteredOrders = filteredOrders.filter(order => order.order_status.toLowerCase() === orderStatus);
    }

    // Filter by stadium
    if (stadium) {
        filteredOrders = filteredOrders.filter(order => order.match.stadium_name === stadium);
    }

    // Filter by date
    if (date) {
        const selectedDate = new Date(date);
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate.toDateString() === selectedDate.toDateString();
        });
    }

    // Sort by price
    if (priceSort) {
        filteredOrders.sort((a, b) => {
            const priceA = parseFloat(a.total_amount);
            const priceB = parseFloat(b.total_amount);
            return priceSort === 'asc' ? priceA - priceB : priceB - priceA;
        });
    }

    // Sort by date
    if (dateSort) {
        filteredOrders.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }

    displayOrders(filteredOrders);
}

// Function to display orders
function displayOrders(orders) {
    const orderList = document.getElementById('order-list');
    orderList.innerHTML = '';

    if (orders.length === 0) {
        orderList.innerHTML = '<p>Không có đơn hàng nào.</p>';
        return;
    }

    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.classList.add('order-card');

        const statusClass = `status-${order.order_status.toLowerCase()}`;
        const formattedDate = new Date(order.created_at).toLocaleString('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
        const matchTime = new Date(order.match.match_time).toLocaleString('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short'
        });

        // Change order status from code to display text
        let orderStatusText = '';
        switch (order.order_status) {
            case 'received':
                orderStatusText = 'Thành công';
                break;
            case 'pending':
                orderStatusText = 'Đang xử lý';
                break;
            case 'cancelled':
                orderStatusText = 'Đã hủy';
                break;
            default:
                orderStatusText = order.order_status;  // In case it's a custom status
        }

        orderCard.innerHTML = `
            <div class="order-header">
                <p><strong>Mã đơn hàng:</strong> ${order.order_id}</p>
                <i class="fas fa-chevron-down toggle-details"></i>
            </div>
            <div class="order-content">
                <div class="left">
                    <p><strong>Tổng tiền:</strong> ${parseFloat(order.total_amount).toLocaleString('vi-VN')} VND</p>
                    <p><strong>Trạng thái:</strong> <span class="${statusClass}">${orderStatusText}</span></p>
                    <p><strong>Thời gian đặt:</strong> ${formattedDate}</p>
                    ${
                        order.order_status === 'received' && order.payment && order.payment.created_at
                            ? `<p><strong>Thời gian thanh toán:</strong> ${new Date(order.payment.created_at).toLocaleString('vi-VN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                            })}</p>`
                            : ''
                    }
                </div>
                <div class="right">
                    <p><strong>Trận đấu:</strong> ${order.match.team_1} vs ${order.match.team_2}</p>
                    <p><strong>Thời gian trận đấu:</strong> ${matchTime}</p>
                    <p><strong>Sân vận động:</strong> ${order.match.stadium_name}</p>
                </div>
            </div>
            <div class="order-details">
                <strong>Chi tiết đơn hàng:</strong>
                ${groupOrderDetailsBySection(order.order_details)}
            </div>
        `;

        orderCard.querySelector('.toggle-details').addEventListener('click', (e) => {
            e.stopPropagation();
            const details = orderCard.querySelector('.order-details');
            const icon = orderCard.querySelector('.toggle-details');
            details.classList.toggle('active');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });

        orderList.appendChild(orderCard);
    });
}

// Function to group order details by section_name
function groupOrderDetailsBySection(orderDetails) {
    // Group the order details by section_name
    const groupedBySection = orderDetails.reduce((acc, detail) => {
        const sectionName = detail.section_name || 'Không xác định';
        if (!acc[sectionName]) {
            acc[sectionName] = [];
        }
        acc[sectionName].push(detail);
        return acc;
    }, {});

    // Create the HTML for grouped order details
    let groupedHTML = '';
    for (const [section, details] of Object.entries(groupedBySection)) {
        groupedHTML += `
            <div class="section-group">
                <strong>Khu vực: <i>${section}</i></strong>
                ${details.map(detail => `
                    <p><strong>Giá vé:</strong> ${parseFloat(detail.price).toLocaleString('vi-VN')} VND, <strong>Ghế:</strong> ${detail.seat || 'Chưa chọn'}</p>
                    ${detail.promotion && Object.keys(detail.promotion).length > 0 ? `
                        <p><strong>Khuyến mãi:</strong> ${detail.promotion.promo_code} - ${detail.promotion.discount_type === 'percentage' 
                            ? `Giảm ${detail.promotion.discount_value}%` 
                            : `Giảm ${parseFloat(detail.promotion.discount_value).toLocaleString('vi-VN')} VND`}</p>
                    ` : ''}
                    ${detail.qr_code ? `
                        <div class="qr-code-container">
                            <img src="data:image/png;base64,${detail.qr_code}" alt="QR Code" class="qr-code-img">
                        </div>
                    ` : ''}
                `).join('')}
            </div>
        `;
    }

    return groupedHTML;
}
