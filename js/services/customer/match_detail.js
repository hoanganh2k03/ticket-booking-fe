import CONFIG from "../../utils/settings.js";
import { showCusToast } from "../../components/toast.js";

const { BASE_URL, TUNNEL_URL } = CONFIG;
const MAX_TICKETS_PER_SECTION = 5;
const MAX_TOTAL_AMOUNT = 50000000; // 50,000,000 VND

// Biến toàn cục để lưu trữ dữ liệu tính toán (Tránh đọc từ DOM)
let currentMatchData = null; // Lưu data trận đấu để tra cứu giá gốc
let selectedTickets = [];    // Lưu danh sách vé đã chọn

// Utility to sanitize quantity input
function sanitizeQuantity(value, max) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return 0;
    return Math.min(num, max);
}

// Utility to handle errors
function handleError(error, defaultMessage = 'Có lỗi xảy ra, vui lòng thử lại.') {
    console.error(error);
    showCusToast(defaultMessage, 'danger');
}

// Fetch promotions for a section
async function fetchPromotions(matchId, sectionId, promoSelect) {
    try {
        const promotions = await fetch(`${BASE_URL}/api/orders/promotions/${matchId}/${sectionId}/`)
            .then(response => response.json());

        promoSelect.innerHTML = '<option value="">--Chọn khuyến mãi (Giá gốc)--</option>';
        if (promotions.length > 0) {
            promoSelect.style.display = 'inline-block';
            promotions.forEach(promo => {
                const option = document.createElement('option');
                option.value = promo.promo_id;
                
                let optionText = '';
                if (promo.discount_type === 'amount') {
                    optionText = `${promo.promo_code} - Giảm ${parseFloat(promo.discount_value).toLocaleString()} VND`;
                } else if (promo.discount_type === 'percentage') {
                    const discountPercentage = Math.floor(promo.discount_value);
                    optionText = `${promo.promo_code} - Giảm ${discountPercentage}%`;
                }
                option.textContent = optionText;
                
                // Lưu data vào dataset để tính toán dễ dàng
                option.dataset.promoId = promo.promo_id;
                option.dataset.discountType = promo.discount_type;
                option.dataset.discountValue = promo.discount_value;
                
                promoSelect.appendChild(option);
            });
        } else {
            promoSelect.style.display = 'none';
        }
    } catch (error) {
        handleError(error, 'Không thể tải danh sách khuyến mãi.');
        promoSelect.innerHTML = '<option value="">Lỗi tải khuyến mãi</option>';
    }
}

// --- HÀM TÍNH TỔNG TIỀN TRUNG TÂM (LOGIC CHUẨN) ---
function calculateGrandTotal() {
    const usePointsInput = document.getElementById('use-points-input');
    const totalOrderCostElement = document.getElementById('total-order-cost');
    const pointsDiscountElem = document.getElementById('points-discount-amount');
    const earningContainer = document.getElementById('earning-points-display');
    const earningValue = document.getElementById('earning-points-value');

    let totalTicketCost = 0;

    // 1. Tính tổng tiền vé dựa trên mảng selectedTickets
    selectedTickets.forEach(ticket => {
        // Tìm thông tin giá gốc từ dữ liệu trận đấu đã fetch
        const pricingInfo = currentMatchData.section_prices.find(p => p.section.section_id === ticket.section);
        if (!pricingInfo) return;

        const unitPrice = parseFloat(pricingInfo.price);
        let discountPerUnit = 0;

        // Lấy thông tin khuyến mãi đang chọn trên giao diện
        const promoSelect = document.getElementById(`promo-code-${ticket.section}`);
        if (promoSelect && promoSelect.selectedIndex > 0) {
            const selectedOption = promoSelect.options[promoSelect.selectedIndex];
            const type = selectedOption.dataset.discountType;
            const value = parseFloat(selectedOption.dataset.discountValue);

            if (type === 'amount') {
                discountPerUnit = value;
            } else if (type === 'percentage') {
                discountPerUnit = (value / 100) * unitPrice;
            }
        }

        const finalUnitPrice = Math.max(0, unitPrice - discountPerUnit);
        
        // Cập nhật hiển thị giá tiền của từng Section (nếu cần)
        const sectionTotalElem = document.getElementById(`total-price-${ticket.section}`);
        if (sectionTotalElem) {
            sectionTotalElem.textContent = (finalUnitPrice * ticket.quantity).toLocaleString('vi-VN');
        }

        totalTicketCost += finalUnitPrice * ticket.quantity;
    });

    // 2. Logic giới hạn điểm tích lũy
    let pointsToUse = 0;
    if (usePointsInput) {
        let rawInput = parseInt(usePointsInput.value) || 0;
        const maxUserPoints = parseInt(usePointsInput.max) || 0;
        
        // Trần điểm: Không dùng quá số tiền đơn hàng (quy đổi 1 điểm = 1000đ)
        const maxPointsNeeded = Math.ceil(totalTicketCost / 1000);
        const realLimit = Math.min(maxUserPoints, maxPointsNeeded);

        if (rawInput > realLimit) {
            pointsToUse = realLimit;
            usePointsInput.value = realLimit; // Auto correct input
            
            // Thông báo user (chỉ báo khi input thực sự thay đổi vì logic)
            if (rawInput > maxUserPoints && rawInput !== realLimit) {
                showCusToast(`Bạn chỉ có tối đa ${maxUserPoints} điểm.`, 'warning');
            }
        } else {
            pointsToUse = rawInput;
        }
    }

    // 3. Tính toán tiền cuối cùng
    const discountFromPoints = pointsToUse * 1000;
    const finalAmount = Math.max(0, totalTicketCost - discountFromPoints);

    // 4. Update UI tổng tiền
    if (pointsDiscountElem) pointsDiscountElem.textContent = discountFromPoints.toLocaleString('vi-VN');
    if (totalOrderCostElement) totalOrderCostElement.textContent = finalAmount.toLocaleString('vi-VN');

    // 5. Logic hiển thị điểm SẼ nhận được (Earning Points)
    if (earningContainer && earningValue) {
        const userTier = localStorage.getItem('customer_tier') || 'bronze';
        let multiplier = 1.0;
        if (userTier === 'silver') multiplier = 1.1;
        if (userTier === 'gold') multiplier = 1.2;
        if (userTier === 'diamond') multiplier = 1.5;

        const basePoints = Math.floor(finalAmount / 10000);
        const pointsEarned = Math.floor(basePoints * multiplier);

        if (pointsEarned > 0) {
            earningContainer.style.display = 'inline-block';
            earningValue.textContent = pointsEarned.toLocaleString('vi-VN');
            earningContainer.title = `Hạng ${userTier.toUpperCase()}: Nhân ${multiplier} lần`;
        } else {
            earningContainer.style.display = 'none';
        }
    }

    return finalAmount;
}


// Main function to initialize the page
async function initializeMatchDetails() {
    // --- KHỞI TẠO ĐIỂM ---
    const pointsSection = document.getElementById('points-section');
    const availablePointsElem = document.getElementById('available-points');
    const usePointsInput = document.getElementById('use-points-input');
    
    // Lắng nghe sự kiện nhập điểm ngay từ đầu
    if(usePointsInput){
        usePointsInput.addEventListener('input', calculateGrandTotal);
    }

    if (localStorage.getItem('access_token')) {
        const userPoints = await fetchCustomerPoints(); // Hàm này đã update localStorage 'customer_tier'
        if (pointsSection) {
            pointsSection.style.display = 'block';
            if(availablePointsElem) availablePointsElem.textContent = userPoints.toLocaleString('vi-VN');
            if(usePointsInput) usePointsInput.max = userPoints;
        }
    }

    const selectedMatchId = localStorage.getItem('selectedMatch');
    if (!selectedMatchId) {
        document.getElementById('match-detail-container').innerHTML = '<p>Không có thông tin chi tiết trận đấu.</p>';
        return;
    }

    try {
        const selectedMatch = await fetch(`${BASE_URL}/api/orders/matches/${selectedMatchId}/`)
            .then(res => res.json());

        // Lưu vào biến toàn cục để dùng lại
        currentMatchData = selectedMatch;

        if (!selectedMatch.team_1 || !selectedMatch.team_2) {
            throw new Error('Dữ liệu trận đấu không hợp lệ');
        }

        // --- UPDATE GIAO DIỆN INFO ---
        document.getElementById('team1-logo').src = selectedMatch.team_1.logo || 'https://via.placeholder.com/50';
        document.getElementById('team2-logo').src = selectedMatch.team_2.logo || 'https://via.placeholder.com/50';
        document.getElementById('match-title').textContent = `${selectedMatch.team_1.team_name} vs ${selectedMatch.team_2.team_name}`;
        document.getElementById('league').textContent = selectedMatch.league.league_name;
        document.getElementById('round').textContent = selectedMatch.round;
        document.getElementById('match-time').textContent = new Date(selectedMatch.match_time).toLocaleString();
        document.getElementById('stadium').textContent = selectedMatch.stadium.stadium_name;
        document.getElementById('description').textContent = selectedMatch.description;

        const layoutImage = document.getElementById('stadium-layout-image');
        if (selectedMatch.stadium.stadium_layouts) {
            layoutImage.src = selectedMatch.stadium.stadium_layouts;
            layoutImage.alt = `Bố cục sân vận động`;
        } else {
            layoutImage.style.display = 'none';
            document.getElementById('stadium-layout-container').innerHTML = '<p>Không có ảnh bố cục sân vận động.</p>';
        }

        // --- XỬ LÝ VÉ ---
        const ticketContainer = document.getElementById('ticket-container');
        
        if (selectedMatch.section_prices?.length > 0) {
            selectedMatch.section_prices.forEach(ticket => {
                if (ticket.is_closed || ticket.available_seats <= 0) return;

                const maxQuantity = Math.min(ticket.available_seats, MAX_TICKETS_PER_SECTION);
                let quantityOptions = '<option value="0">0</option>';
                for (let i = 1; i <= maxQuantity; i++) {
                    quantityOptions += `<option value="${i}">${i}</option>`;
                }

                const ticketDiv = document.createElement('div');
                ticketDiv.classList.add('ticket-card');
                ticketDiv.innerHTML = `
                    <p><strong>Khu vực:</strong> ${ticket.section.section_name}</p>
                    <p><strong>Giá:</strong> ${parseFloat(ticket.price).toLocaleString('vi-VN')} VND</p>
                    <p><strong>Còn lại:</strong> <span id="available-seats-${ticket.section.section_id}">${ticket.available_seats}</span> vé</p>
                    <button id="buy-btn-${ticket.section.section_id}" class="buy-btn">Mua vé</button>
                    <div id="quantity-div-${ticket.section.section_id}" style="display:none;">
                        <label>Số lượng:</label>
                        <select id="quantity-${ticket.section.section_id}">
                            ${quantityOptions}
                        </select>
                        <select id="promo-code-${ticket.section.section_id}" style="display:none; margin-top: 5px;">
                            <option value="">--Chọn khuyến mãi--</option>
                        </select>
                        <button id="cancel-btn-${ticket.section.section_id}" class="cancel-btn">Hủy</button>
                        <p><strong>Thành tiền:</strong> <span id="total-price-${ticket.section.section_id}">0</span> VND</p>
                    </div>
                `;
                ticketContainer.appendChild(ticketDiv);

                const sectionId = ticket.section.section_id;
                const buyButton = document.getElementById(`buy-btn-${sectionId}`);
                const quantityDiv = document.getElementById(`quantity-div-${sectionId}`);
                const quantitySelect = document.getElementById(`quantity-${sectionId}`);
                const cancelButton = document.getElementById(`cancel-btn-${sectionId}`);
                const promoSelect = document.getElementById(`promo-code-${sectionId}`);

                // Nút Mua
                buyButton.addEventListener('click', () => {
                    const accessToken = localStorage.getItem('access_token');
                    if (!accessToken) {
                        showCusToast('Vui lòng đăng nhập trước khi mua vé.', 'info');
                        setTimeout(() => { window.location.href = '/pages/customer/login.html'; }, 1500);
                        return;
                    }
                    quantityDiv.style.display = 'block';
                    buyButton.style.display = 'none';
                    quantitySelect.disabled = false;
                    fetchPromotions(selectedMatchId, sectionId, promoSelect);
                });

                // Thay đổi số lượng
                quantitySelect.addEventListener('change', () => {
                    let quantity = sanitizeQuantity(quantitySelect.value, maxQuantity);

                    // Update mảng selectedTickets
                    const existingItem = selectedTickets.find(t => t.section === sectionId);
                    if (quantity > 0) {
                        if (existingItem) existingItem.quantity = quantity;
                        else selectedTickets.push({ section: sectionId, quantity: quantity });
                    } else {
                        if (existingItem) selectedTickets.splice(selectedTickets.indexOf(existingItem), 1);
                    }

                    // Tính lại tiền
                    const totalCost = calculateGrandTotal();
                    if (totalCost > MAX_TOTAL_AMOUNT) {
                        quantitySelect.value = '0';
                        if (existingItem) selectedTickets.splice(selectedTickets.indexOf(existingItem), 1);
                        calculateGrandTotal();
                        showCusToast(`Tổng số tiền không được vượt quá ${MAX_TOTAL_AMOUNT.toLocaleString()} VND.`, 'danger');
                    }
                });

                // Thay đổi khuyến mãi
                promoSelect.addEventListener('change', () => {
                    calculateGrandTotal();
                });

                // Nút Hủy
                cancelButton.addEventListener('click', () => {
                    quantityDiv.style.display = 'none';
                    buyButton.style.display = 'inline-block';
                    quantitySelect.value = '0';
                    promoSelect.value = '';
                    
                    // Xóa khỏi mảng
                    const idx = selectedTickets.findIndex(t => t.section === sectionId);
                    if (idx !== -1) selectedTickets.splice(idx, 1);
                    
                    calculateGrandTotal();
                });
            });

            // --- XỬ LÝ NÚT ĐẶT HÀNG ---
            const orderButton = document.getElementById('order-button');
            orderButton.style.display = 'inline-block';
            
            orderButton.addEventListener('click', async () => {
                // Kiểm tra có vé nào được chọn không
                if (selectedTickets.length === 0 || !selectedTickets.some(t => t.quantity > 0)) {
                    showCusToast('Vui lòng chọn ít nhất một vé để đặt hàng.', 'danger');
                    return;
                }

                const finalAmount = calculateGrandTotal();
                if (finalAmount > MAX_TOTAL_AMOUNT) {
                    showCusToast(`Tổng số tiền quá lớn.`, 'danger');
                    return;
                }

                // Chuẩn bị dữ liệu gửi Backend
                const orderData = {
                    user: localStorage.getItem('customer_id'),
                    total_amount: finalAmount,
                    use_points: parseInt(document.getElementById('use-points-input')?.value) || 0,
                    order_status: 'pending',
                    order_method: 'online',
                    order_details: []
                };

                // Biến đổi cấu trúc để phù hợp với Backend (Flatten tickets)
                selectedTickets.forEach(ticket => {
                    const pSelect = document.getElementById(`promo-code-${ticket.section}`);
                    const promoID = (pSelect && pSelect.value) ? parseInt(pSelect.value) : null;
                    const pricingItem = currentMatchData.section_prices.find(t => t.section.section_id === ticket.section);

                    for (let i = 0; i < ticket.quantity; i++) {
                        orderData.order_details.push({
                            pricing: pricingItem.pricing_id,
                            price: pricingItem.price, // Giá gốc, backend sẽ tính lại giảm giá
                            promotion: promoID,
                            qr_code: null,
                            seat_id: null,
                        });
                    }
                });

                try {
                    const response = await fetch(`${BASE_URL}/api/orders/create-order/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderData)
                    }).then(res => res.json());

                    if (response.status === 'success') {
                        showCusToast('Đặt hàng thành công! Đang chuyển thanh toán...', 'success');
                        const orderId = response.data.order_id;
                        const totalAmount = Math.round(parseFloat(response.data.total_amount));

                        // Gọi API MoMo
                        const redirectUrl = window.location.origin + '/pages/customer/qrcode.html'; // TỰ ĐỘNG LẤY DOMAIN
                        
                        const momoData = {
                            order: orderId,
                            amount: totalAmount,
                            order_info: `Thanh toán đơn hàng ${orderId}`,
                            redirect_url: redirectUrl, 
                            ipn_url: `${TUNNEL_URL}/api/orders/done-payment/`
                        };

                        const momoResponse = await fetch(`${BASE_URL}/api/orders/momo-payment/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(momoData),
                        }).then(res => res.json());

                        if (momoResponse.payUrl) {
                            localStorage.setItem('orderID', orderId);
                            window.location.href = momoResponse.payUrl;
                        } else {
                            showCusToast('Lỗi tạo link MoMo. Vui lòng thử lại.', 'danger');
                        }
                    } else {
                        let errorMsg = response.message || 'Lỗi khi đặt hàng.';
                        if(response.errors) errorMsg = JSON.stringify(response.errors);
                        showCusToast(errorMsg, 'danger');
                    }
                } catch (error) {
                    handleError(error, 'Lỗi kết nối server.');
                }
            });

        } else {
            ticketContainer.innerHTML = '<p>Không có vé nào khả dụng.</p>';
        }
    } catch (error) {
        handleError(error, 'Lỗi tải thông tin trận đấu.');
    }

    if (selectedMatchId) {
        connectWebSocket(selectedMatchId);
    }
}

// --- WEBSOCKET ---
function connectWebSocket(matchId) {
    // Tự động xác định ws:// hay wss:// và Host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Lấy host từ BASE_URL (ví dụ 127.0.0.1:8000)
    const apiHost = new URL(BASE_URL).host; 
    const socketUrl = `${protocol}//${apiHost}/ws/book/${matchId}/`; 
    
    console.log("Connecting WebSocket:", socketUrl);
    const bookingSocket = new WebSocket(socketUrl);

    bookingSocket.onopen = function(e) {
        console.log('✅ Kết nối WebSocket thành công!');
    };

    bookingSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log("📩 WebSocket:", data);

        if (data.status === 'success' && data.tickets) {
            data.tickets.forEach(ticket => updateSeatCount(ticket.section_id, ticket.available_seats));
        }

        if (data.status === 'update' && data.updated_sections) {
            if (typeof showCusToast === 'function') showCusToast(`⚠️ ${data.message}`, 'info');
            for (const [sectionId, newCount] of Object.entries(data.updated_sections)) {
                updateSeatCount(sectionId, newCount);
            }
        }
    };

    bookingSocket.onclose = function(e) {
        console.warn('WebSocket đóng. Thử lại sau 3s...');
        setTimeout(() => connectWebSocket(matchId), 3000);
    };
}

function updateSeatCount(sectionId, count) {
    const seatElement = document.getElementById(`available-seats-${sectionId}`);
    if (seatElement) {
        seatElement.textContent = count;
        seatElement.style.color = "red";
        seatElement.style.fontWeight = "bold";
        setTimeout(() => {
            seatElement.style.color = "";
            seatElement.style.fontWeight = "";
        }, 2000);

        // Logic ẩn nút mua khi hết vé
        const buyBtn = document.getElementById(`buy-btn-${sectionId}`);
        const currentQtySelect = document.getElementById(`quantity-${sectionId}`);
        
        // Nếu hết vé VÀ người dùng chưa chọn vé này (để tránh đang mua dở bị disable)
        if (count <= 0) {
             if (buyBtn) {
                buyBtn.disabled = true;
                buyBtn.textContent = "Hết vé";
                buyBtn.classList.add('disabled');
             }
             // Nếu đang chọn quá số lượng còn lại -> Reset về max
             if (currentQtySelect && parseInt(currentQtySelect.value) > count) {
                 currentQtySelect.value = count;
                 currentQtySelect.dispatchEvent(new Event('change')); // Trigger tính lại tiền
                 showCusToast('Số lượng vé vừa thay đổi do có người đặt trước.', 'warning');
             }
        }
    }
}

// --- TÍCH ĐIỂM ---
async function fetchCustomerPoints() {
    const customerId = localStorage.getItem('customer_id');
    if (!customerId) return 0;

    try {
        const response = await fetch(`${BASE_URL}/api/accounts/customer/profile/?id=${customerId}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            const userTier = data.data.tier || 'bronze';
            localStorage.setItem('customer_tier', userTier); // Cập nhật Tier mới nhất
            return data.data.points || 0;
        }
        return 0;
    } catch (error) {
        console.error("Lỗi lấy điểm:", error);
        return 0;
    }
}

// Initialize on page load
window.onload = initializeMatchDetails;