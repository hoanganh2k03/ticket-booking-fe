import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

// Hàm định dạng thời gian theo kiểu Việt Nam
function formatMatchTime(matchTime) {
    const date = new Date(matchTime);  // Chuyển đổi từ ISO 8601
    return date.toLocaleString('vi-VN', {  // Định dạng theo kiểu Việt Nam
        weekday: 'long',  // Hiển thị thứ (ví dụ: Thứ Bảy)
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,  // Không sử dụng định dạng 12 giờ, dùng 24 giờ
    });
}

async function updateOrderStatus(orderId) {
    try {
        const response = await fetch(`${BASE_URL}/api/orders/update-order-status/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId
            })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.warn("Failed to update order status:", data);
        }
    } catch (error) {
        console.warn("Error updating order status:", error);
    }
}

function clearPendingMomoOrder(orderId) {
    const pendingOrderId = sessionStorage.getItem('pendingMomoOrderId');
    if (!orderId || pendingOrderId === orderId) {
        sessionStorage.removeItem('pendingMomoOrderId');
    }
}

async function fetchOrderDetails(orderId) {
    try {
        const response = await fetch(`${BASE_URL}/api/orders/order/details/qr/`, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                order_id: orderId,
                _t: Date.now()  // Cache busting
            })
        });
        const data = await response.json();

        if (response.ok) {
            let orderStatusText = '';
            switch (data.order_status) {
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
                    orderStatusText = data.order_status;
            }

            let paymentStatusText = '';
            switch (data.payment_status) {
                case 'success':
                    paymentStatusText = 'Thành công';
                    break;
                case 'pending':
                    paymentStatusText = 'Đang chờ';
                    break;
                case 'failed':
                    paymentStatusText = 'Thất bại';
                    break;
                default:
                    paymentStatusText = data.payment_status;
            }

            let paymentMethodText = '';
            switch (data.payment_method) {
                case 'transfer':
                    paymentMethodText = 'Chuyển khoản';
                    break;
                case 'bank_card':
                    paymentMethodText = 'Thẻ ngân hàng';
                    break;
                case 'cash':
                    paymentMethodText = 'Tiền mặt';
                    break;
                default:
                    paymentMethodText = data.payment_method;
            }

            document.getElementById("payment-method").textContent = paymentMethodText;

            document.getElementById("order-id").textContent = data.order_id;
            document.getElementById("user-name").textContent = data.user;
            document.getElementById("order-status").textContent = orderStatusText;
            document.getElementById("total-amount").textContent = Math.round(data.total_amount);

            document.getElementById("payment-method").textContent = paymentMethodText;
            document.getElementById("transaction-code").textContent = data.transaction_code;
            document.getElementById("payment-status").textContent = paymentStatusText;

            document.getElementById("teams").textContent = `${data.match.team_1} vs ${data.match.team_2}`;
            document.getElementById("match-time").textContent = formatMatchTime(data.match.match_time);

            const orderDetailsContainer = document.getElementById("order-details");
            let totalItems = 0;

            // Nhóm các vé theo vùng (pricing_section)
            const groupedBySection = data.order_details.reduce((acc, detail) => {
                const section = detail.pricing_section || 'Khác';
                if (!acc[section]) acc[section] = [];
                acc[section].push(detail);
                return acc;
            }, {});

            // Hiển thị thông tin nhóm theo vùng
            for (const [section, details] of Object.entries(groupedBySection)) {
                const sectionElement = document.createElement("div");
                sectionElement.classList.add("order-section");

                const sectionHeader = document.createElement("h4");
                sectionHeader.textContent = `Khu vực: ${section}`;
                sectionElement.appendChild(sectionHeader);

                details.forEach(detail => {
                    const orderDetailElement = document.createElement("div");
                    orderDetailElement.classList.add("order-detail");

                    orderDetailElement.innerHTML = `
                        <div>Ghế: ${detail.seat || "N/A"}</div>
                        <div>
                            Mã: 
                            ${detail.promo_code 
                                ? detail.discount_type === 'percentage' 
                                ? `${detail.promo_code} - Giảm ${detail.discount_value}%` 
                                : `${detail.promo_code} - Giảm ${detail.discount_value}VND`
                                : "Không"}
                        </div>
                        <div>Giá: ${Math.round(detail.price)} VND</div>
                        <div>
                            <img class="qr-code" src="data:image/png;base64,${detail.qr_code}" alt="QR Code">
                        </div>
                    `;
                    sectionElement.appendChild(orderDetailElement);
                    totalItems++;
                });

                orderDetailsContainer.appendChild(sectionElement);
            }

            document.getElementById("total-items").textContent = totalItems;
        } else {
            alert("Error fetching order details: " + data.error);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to fetch order details");
    }
}

// Lấy Order ID từ URL hoặc từ localStorage
const query = new URLSearchParams(window.location.search);
const orderId = query.get('orderId') || query.get('order_id') || localStorage.getItem('orderID');
const resultCode = query.get('resultCode');
const pendingMomoOrderId = sessionStorage.getItem('pendingMomoOrderId');

if (orderId) {
    localStorage.setItem('orderID', orderId);
    
    // Nếu thanh toán vừa thành công (resultCode=0), chờ 1 giây để backend update xong
    if (resultCode && resultCode !== '0') {
        clearPendingMomoOrder(orderId);
        fetchOrderDetails(orderId);
    } else if (resultCode === '0' || pendingMomoOrderId === orderId) {
        console.log("Payment successful, waiting for backend update...");
        setTimeout(async () => {
            await updateOrderStatus(orderId);
            clearPendingMomoOrder(orderId);
            fetchOrderDetails(orderId);
        }, 1000);
    } else {
        fetchOrderDetails(orderId);
    }
} else {
    alert("Khong tim thay ma don hang.");
}
