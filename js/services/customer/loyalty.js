import CONFIG from "../../utils/settings.js";
import { showCusToast } from "../../components/toast.js";

const { BASE_URL } = CONFIG;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Kiểm tra đăng nhập
    const customerId = localStorage.getItem('customer_id');
    const accessToken = localStorage.getItem('access_token');

    if (!customerId) {
        Swal.fire({
            icon: 'warning',
            title: 'Yêu cầu đăng nhập',
            text: 'Vui lòng đăng nhập để xem thông tin hạng thành viên.',
            confirmButtonText: 'Đăng nhập ngay'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "/pages/customer/login.html";
            }
        });
        return;
    }

    // 2. DOM Elements
    const contentDiv = document.getElementById('loyalty-content');
    const spinnerDiv = document.getElementById('loading-spinner');
    
    // Profile Elements
    const userNameElem = document.getElementById('user-name');
    const tierBadgeElem = document.getElementById('tier-badge');
    const currentPointsElem = document.getElementById('current-points');
    const loyaltyScoreElem = document.getElementById('loyalty-score');
    
    // Progress Elements
    const nextTierLabel = document.getElementById('next-tier-label');
    const progressBarElem = document.getElementById('tier-progress-bar');
    const progressTextElem = document.getElementById('progress-text');
    
    // History Elements
    const historyListElem = document.getElementById('history-list');
    const noHistoryElem = document.getElementById('no-history');

    // 3. Hàm gọi API
    async function fetchLoyaltyData() {
        try {
            const response = await fetch(`${BASE_URL}/api/accounts/customer/loyalty/?id=${customerId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${accessToken}` // Mở comment nếu API yêu cầu token
                }
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                renderUI(data.data);
            } else {
                showCusToast(data.message || 'Không thể tải thông tin.', 'error');
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            showCusToast('Lỗi kết nối đến máy chủ.', 'error');
        } finally {
            // Ẩn loading, hiện nội dung
            if (spinnerDiv) spinnerDiv.style.display = 'none';
            if (contentDiv) contentDiv.style.display = 'block';
        }
    }

    // 4. Hàm Render Giao diện
    function renderUI(data) {
        const { profile, tier_progress, history } = data;

        // --- A. Render Profile ---
        userNameElem.textContent = profile.full_name;
        currentPointsElem.textContent = profile.points.toLocaleString('vi-VN');
        loyaltyScoreElem.textContent = profile.loyalty_score.toLocaleString('vi-VN');

        // Xử lý Badge Hạng (Màu sắc & Icon)
        const tierKey = profile.tier.toLowerCase();
    
    // Khai báo các biến mặc định
    let tierName = "Thành viên";
    let badgeClass = "bg-secondary";
    let iconClass = "fa-user";
    let tierBenefit = "Tích lũy điểm để thăng hạng"; // Biến chứa nội dung chú thích

    if (tierKey === 'bronze') {
        tierName = "Thành viên Đồng";
        badgeClass = "bg-bronze"; // Nhớ thêm CSS màu đồng ở bước 2
        iconClass = "fa-shield-alt";
        tierBenefit = "Quyền lợi: Tích điểm tiêu dùng cơ bản (Hệ số x1.0)";
    } else if (tierKey === 'silver') {
        tierName = "Thành viên Bạc";
        badgeClass = "bg-secondary";
        iconClass = "fa-medal";
        tierBenefit = "Quyền lợi: Nhân 1.1 lần điểm thưởng khi thanh toán";
    } else if (tierKey === 'gold') {
        tierName = "Thành viên Vàng";
        badgeClass = "bg-warning text-dark";
        iconClass = "fa-crown";
        tierBenefit = "Quyền lợi: Nhân 1.2 lần điểm thưởng. Ưu tiên hỗ trợ.";
    } else if (tierKey === 'diamond') {
        tierName = "Thành viên Kim Cương";
        badgeClass = "bg-info text-white";
        iconClass = "fa-gem";
        tierBenefit = "Quyền lợi: Nhân 1.5 lần điểm thưởng + Quà tặng nóng mỗi 2000 điểm!";
    }

    // Gán class và nội dung HTML
    tierBadgeElem.className = `badge rounded-pill px-3 py-2 ${badgeClass}`;
    tierBadgeElem.innerHTML = `<i class="fas ${iconClass} me-1"></i> ${tierName}`;
    
    // --- PHẦN QUAN TRỌNG: Cấu hình Tooltip ---
    // 1. Thêm attribute cho thẻ
    tierBadgeElem.setAttribute('data-bs-toggle', 'tooltip');
    tierBadgeElem.setAttribute('data-bs-placement', 'bottom'); // Hiện chú thích ở dưới
    tierBadgeElem.setAttribute('title', tierBenefit); // Nội dung chú thích
    tierBadgeElem.style.cursor = "help"; // Đổi con chuột thành dấu hỏi khi rê vào

    // 2. Kích hoạt Tooltip của Bootstrap (Bắt buộc phải có dòng này mới hiện đẹp)
    try {
        // Hủy tooltip cũ nếu có để tránh lỗi hiển thị chồng chéo khi re-render
        const oldTooltip = bootstrap.Tooltip.getInstance(tierBadgeElem);
        if (oldTooltip) oldTooltip.dispose();

        // Tạo tooltip mới
        new bootstrap.Tooltip(tierBadgeElem);
    } catch (e) {
        console.log("Bootstrap Tooltip chưa được load, sẽ hiển thị title mặc định.");
    }

       

        // Cập nhật lại cache Tier mới nhất cho localStorage (để trang thanh toán dùng)
        localStorage.setItem('customer_tier', profile.tier);

        // --- B. Render Progress Bar ---
        // Kiểm tra xem backend trả về có phải Max Level không
        if (tier_progress.next_tier_name === "DIAMOND_REWARD") {
            
            // 1. Label hấp dẫn
            nextTierLabel.innerHTML = `<i class="fas fa-gift text-diamond"></i> Mốc thưởng tiếp theo`;
            
            // 2. Thanh Progress Bar đặc biệt
            progressBarElem.className = "progress-bar bg-diamond"; // Class CSS mới tạo
            
            setTimeout(() => {
                progressBarElem.style.width = `${tier_progress.progress_percent}%`;
            }, 200);

            // 3. Text thông báo
            progressTextElem.innerHTML = `
                <span class="text-diamond"><i class="fas fa-gem"></i> Đẳng cấp Tối Thượng!</span> 
                Tích thêm <strong>${tier_progress.points_needed.toLocaleString()}</strong> điểm uy tín để nhận thưởng nóng 
                <strong class="text-warning">500 điểm</strong> tiêu dùng.
            `;

        } else if (tier_progress.next_tier_name === "MAX_LEVEL") {
            // (Code dự phòng cũ nếu có lỗi)
            // ...
        } else {
            // --- TRƯỜNG HỢP THƯỜNG (Silver, Gold) ---
            nextTierLabel.innerHTML = `Tiếp theo: <strong>${tier_progress.next_tier_name}</strong>`;
            
            // Reset về màu mặc định
            progressBarElem.className = "progress-bar progress-bar-striped progress-bar-animated bg-warning";
            
            setTimeout(() => {
                progressBarElem.style.width = `${tier_progress.progress_percent}%`;
            }, 200);

            progressTextElem.innerHTML = `Tích thêm <strong class="text-primary">${tier_progress.points_needed.toLocaleString()}</strong> điểm xét hạng nữa để thăng hạng.`;
        }
        
        // --- C. Render History Table ---
        if (history && history.length > 0) {
            noHistoryElem.style.display = 'none';
            historyListElem.innerHTML = history.map(item => {
                const isPositive = item.change_amount > 0;
                const sign = isPositive ? '+' : '';
                const colorClass = isPositive ? 'text-success' : 'text-danger'; // Bootstrap colors
                const icon = isPositive ? '<i class="fas fa-arrow-up small"></i>' : '<i class="fas fa-arrow-down small"></i>';
                
                // Link tới đơn hàng (nếu có tính năng xem chi tiết đơn)
                const orderText = item.order_id 
                    ? `<span 
                        class="badge bg-light text-dark border" 
                        style="cursor: pointer; transition: all 0.2s;" 
                        onclick="copyOrderCode('${item.order_id}')" 
                        title="Nhấn để sao chép mã đơn">
                            #${item.order_id} <i class="fas fa-copy text-muted ms-1" style="font-size: 0.8em;"></i>
                    </span>` 
                    : '-';

                return `
                    <tr>
                        <td class="ps-4 text-muted small">${item.created_at}</td>
                        <td>${item.reason}</td>
                        <td>${orderText}</td>
                        <td class="text-end pe-4 fw-bold ${colorClass}">
                            ${icon} ${sign}${item.change_amount.toLocaleString()}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            historyListElem.innerHTML = '';
            noHistoryElem.style.display = 'block';
        }
    }

    // Khởi chạy
    fetchLoyaltyData();
});


// Hàm sao chép mã đơn hàng
window.copyOrderCode = function(orderId) {
    // 1. Sử dụng API Clipboard hiện đại
    navigator.clipboard.writeText(orderId).then(() => {
        
        // 2. Thông báo thành công (Dùng showCusToast nếu bạn đã có, hoặc dùng alert tạm)
        // Nếu bạn có hàm showCusToast như các file trước:
        if (typeof showCusToast === 'function') {
            showCusToast(`Đã sao chép mã đơn: ${orderId}`, 'success');
        } else {
            // Fallback nếu không có toast
            alert(`Đã sao chép: ${orderId}`);
        }

    }).catch(err => {
        console.error('Không thể sao chép: ', err);
        // Fallback cho trình duyệt cũ hoặc lỗi bảo mật (ít gặp)
        const textArea = document.createElement("textarea");
        textArea.value = orderId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        if (typeof showCusToast === 'function') {
            showCusToast(`Đã sao chép mã đơn: ${orderId}`, 'success');
        }
    });
};