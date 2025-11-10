import CONFIG from "../../utils/settings.js";
import { showCusToast } from "../../components/toast.js";

const { BASE_URL, TUNNEL_URL } = CONFIG;
const MAX_TICKETS_PER_SECTION = 5;
const MAX_TOTAL_AMOUNT = 50000000; // 50,000,000 VND

// Utility to sanitize quantity input
function sanitizeQuantity(value, max) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return 0;
    return Math.min(num, max);
}

// Utility to calculate total price for a ticket
function calculateTotalPrice(ticket, quantity) {
    return ticket.price * quantity;
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

        promoSelect.innerHTML = '<option value="">--Chọn khuyến mãi--</option>';
        if (promotions.length > 0) {
            promoSelect.style.display = 'inline-block';
            promotions.forEach(promo => {
                const option = document.createElement('option');
                option.value = promo.promo_id;
                let optionText = '';
                if (promo.discount_type === 'amount') {
                    optionText = `${promo.promo_code} - Giảm ${promo.discount_value.toLocaleString()} VND`;
                } else if (promo.discount_type === 'percentage') {
                    const discountPercentage = Math.floor(promo.discount_value);
                    optionText = `${promo.promo_code} - Giảm ${discountPercentage}%`;
                }
                option.textContent = optionText;
                option.setAttribute('data-promo-id', promo.promo_id);
                option.setAttribute('data-promo-code', promo.promo_code);
                option.setAttribute('data-discount-type', promo.discount_type);
                option.setAttribute('data-discount-value', promo.discount_value);
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

// Main function to initialize the page
async function initializeMatchDetails() {
    const selectedMatchId = localStorage.getItem('selectedMatch');
    if (!selectedMatchId) {
        document.getElementById('match-detail-container').innerHTML = '<p>Không có thông tin chi tiết trận đấu.</p>';
        return;
    }

    try {
        const selectedMatch = await fetch(`${BASE_URL}/api/orders/matches/${selectedMatchId}/`)
            .then(res => res.json());

        // Validate match data
        if (!selectedMatch.team_1 || !selectedMatch.team_2) {
            throw new Error('Dữ liệu trận đấu không hợp lệ');
        }

        // Update match details
        document.getElementById('team1-logo').src = selectedMatch.team_1.logo || 'https://via.placeholder.com/50';
        document.getElementById('team2-logo').src = selectedMatch.team_2.logo || 'https://via.placeholder.com/50';
        document.getElementById('match-title').textContent = `${selectedMatch.team_1.team_name} vs ${selectedMatch.team_2.team_name}`;
        document.getElementById('league').textContent = selectedMatch.league.league_name;
        document.getElementById('round').textContent = selectedMatch.round;
        document.getElementById('match-time').textContent = new Date(selectedMatch.match_time).toLocaleString();
        document.getElementById('stadium').textContent = selectedMatch.stadium.stadium_name;
        document.getElementById('description').textContent = selectedMatch.description;

        // Update stadium layout
        const layoutImage = document.getElementById('stadium-layout-image');
        if (selectedMatch.stadium.stadium_layouts) {
            layoutImage.src = selectedMatch.stadium.stadium_layouts;
            layoutImage.alt = `Bố cục sân vận động cho ${selectedMatch.stadium.stadium_name}`;
        } else {
            layoutImage.style.display = 'none';
            document.getElementById('stadium-layout-container').innerHTML = '<p>Không có ảnh bố cục sân vận động.</p>';
        }

        // Initialize ticket selection
        const ticketContainer = document.getElementById('ticket-container');
        const totalOrderCostElement = document.getElementById('total-order-cost');
        const selectedTickets = [];

        // Update total order cost
        function updateTotalOrderCost() {
            let totalCost = 0;
            selectedTickets.forEach(ticket => {
                const totalPriceElement = document.getElementById(`total-price-${ticket.section}`);
                totalCost += parseFloat(totalPriceElement.textContent);
            });
            totalOrderCostElement.textContent = parseFloat(totalCost).toLocaleString('vi-VN');
            return totalCost;
        }

        // Render tickets
        if (selectedMatch.section_prices?.length > 0) {
            selectedMatch.section_prices.forEach(ticket => {
                if (ticket.is_closed || ticket.available_seats <= 0) return;

                // Determine the number of options for the quantity select (max 5, or available_seats if less)
                const maxQuantity = Math.min(ticket.available_seats, MAX_TICKETS_PER_SECTION);
                let quantityOptions = '<option value="0">Chọn số</option>';
                for (let i = 1; i <= maxQuantity; i++) {
                    quantityOptions += `<option value="${i}">${i}</option>`;
                }

                const ticketDiv = document.createElement('div');
                ticketDiv.classList.add('ticket-card');
                ticketDiv.innerHTML = `
                    <p><strong>Khu vực:</strong> ${ticket.section.section_name}</p>
                    <p><strong>Giá:</strong> ${parseFloat(ticket.price).toLocaleString('vi-VN')}VND</p>
                    <p><strong>Còn lại:</strong> ${ticket.available_seats} vé</p>
                    <button id="buy-btn-${ticket.section.section_id}" class="buy-btn">Mua vé</button>
                    <div id="quantity-div-${ticket.section.section_id}" style="display:none;">
                        <label for="quantity-${ticket.section.section_id}">Số lượng:</label>
                        <select id="quantity-${ticket.section.section_id}" name="quantity-${ticket.section.section_id}">
                            ${quantityOptions}
                        </select>
                        <label for="promo-code-${ticket.section.section_id}"></label>
                        <select id="promo-code-${ticket.section.section_id}" style="display:none;">
                            <option value="">--Chọn khuyến mãi--</option>
                        </select>
                        <button id="cancel-btn-${ticket.section.section_id}" class="cancel-btn">Hủy</button>
                        <div id="promo-message-${ticket.section.section_id}" class="promo-message"></div>
                        <p><strong>Số tiền:</strong> <span id="total-price-${ticket.section.section_id}">0</span> VND</p>
                    </div>
                `;
                ticketContainer.appendChild(ticketDiv);

                // Get DOM elements
                const buyButton = document.getElementById(`buy-btn-${ticket.section.section_id}`);
                const quantityDiv = document.getElementById(`quantity-div-${ticket.section.section_id}`);
                const quantitySelect = document.getElementById(`quantity-${ticket.section.section_id}`);
                const cancelButton = document.getElementById(`cancel-btn-${ticket.section.section_id}`);
                const promoSelect = document.getElementById(`promo-code-${ticket.section.section_id}`);
                const promoMessageDiv = document.getElementById(`promo-message-${ticket.section.section_id}`);

                // Handle buy button click
                buyButton.addEventListener('click', () => {
                    const accessToken = localStorage.getItem('access_token');
                    if (!accessToken) {
                        showCusToast('Vui lòng đăng nhập trước khi mua vé.', 'info');
                        setTimeout(() => {
                            window.location.href = '/pages/customer/login.html';
                        }, 1500);
                        return;
                    }

                    quantityDiv.style.display = 'inline-block';
                    buyButton.style.display = 'none';
                    quantitySelect.disabled = false;
                    fetchPromotions(selectedMatchId, ticket.section.section_id, promoSelect);
                });

                // Handle quantity selection
                quantitySelect.addEventListener('change', () => {
                    let quantity = sanitizeQuantity(quantitySelect.value, maxQuantity);

                    // Update selected tickets
                    const ticketInArray = selectedTickets.find(t => t.section === ticket.section.section_id);
                    if (quantity > 0) {
                        if (ticketInArray) {
                            ticketInArray.quantity = quantity;
                        } else {
                            selectedTickets.push({
                                section: ticket.section.section_id,
                                quantity: quantity
                            });
                        }
                    } else if (ticketInArray) {
                        selectedTickets.splice(selectedTickets.indexOf(ticketInArray), 1);
                    }

                    // Update total price
                    const totalPriceElement = document.getElementById(`total-price-${ticket.section.section_id}`);
                    totalPriceElement.textContent = calculateTotalPrice(ticket, quantity).toFixed(2);

                    // Check total order cost
                    const totalCost = updateTotalOrderCost();
                    if (totalCost > MAX_TOTAL_AMOUNT) {
                        quantitySelect.value = '0';
                        if (ticketInArray) {
                            selectedTickets.splice(selectedTickets.indexOf(ticketInArray), 1);
                        }
                        totalPriceElement.textContent = '0';
                        updateTotalOrderCost();
                        showCusToast(`Tổng số tiền không được vượt quá ${MAX_TOTAL_AMOUNT.toLocaleString()} VND.`, 'danger');
                    }
                });

                // Handle promo selection
                promoSelect.addEventListener('change', () => {
                    const quantity = parseInt(quantitySelect.value, 10) || 0;
                    const totalPriceElement = document.getElementById(`total-price-${ticket.section.section_id}`);
                    totalPriceElement.textContent = calculateTotalPrice(ticket, quantity).toFixed(2);

                    const totalCost = updateTotalOrderCost();
                    if (totalCost > MAX_TOTAL_AMOUNT) {
                        promoSelect.value = '';
                        totalPriceElement.textContent = calculateTotalPrice(ticket, quantity).toFixed(2);
                        updateTotalOrderCost();
                        showCusToast(`Tổng số tiền không được vượt quá ${MAX_TOTAL_AMOUNT.toLocaleString()} VND.`, 'danger');
                    }
                });

                // Handle cancel button
                cancelButton.addEventListener('click', () => {
                    quantityDiv.style.display = 'none';
                    buyButton.style.display = 'inline-block';
                    quantitySelect.value = '0';

                    const ticketIndex = selectedTickets.findIndex(t => t.section === ticket.section.section_id);
                    if (ticketIndex !== -1) {
                        selectedTickets.splice(ticketIndex, 1);
                    }

                    promoSelect.innerHTML = '<option value="">--Chọn khuyến mãi--</option>';
                    promoMessageDiv.innerHTML = '';
                    document.getElementById(`total-price-${ticket.section.section_id}`).textContent = '0.00';
                    updateTotalOrderCost();
                });
            });

            // Handle order submission
            const orderButton = document.getElementById('order-button');
            orderButton.style.display = 'inline-block';
            orderButton.addEventListener('click', async () => {
                const selectedTicketWithValidQuantity = selectedTickets.some(ticket => ticket.quantity > 0);
                if (!selectedTicketWithValidQuantity) {
                    showCusToast('Vui lòng chọn ít nhất một vé để đặt hàng.', 'danger');
                    return;
                }

                const totalCost = parseFloat(totalOrderCostElement.textContent);
                if (totalCost > MAX_TOTAL_AMOUNT) {
                    showCusToast(`Tổng số tiền không được vượt quá ${MAX_TOTAL_AMOUNT.toLocaleString()} VND.`, 'danger');
                    return;
                }

                const orderData = {
                    user: localStorage.getItem('customer_id'),
                    total_amount: totalCost,
                    order_status: 'pending',
                    order_method: 'online',
                    order_details: []
                };

                selectedTickets.forEach(ticket => {
                    for (let i = 0; i < ticket.quantity; i++) {
                        const promoSelect = document.getElementById(`promo-code-${ticket.section}`);
                        const promoID = promoSelect ? parseInt(promoSelect.value, 10) || null : null;
                        orderData.order_details.push({
                            pricing: selectedMatch.section_prices.find(t => t.section.section_id === ticket.section).pricing_id,
                            price: selectedMatch.section_prices.find(t => t.section.section_id === ticket.section).price,
                            promotion: promoID,
                            qr_code: null,
                            seat_id: null,
                        });
                    }
                });

                try {
                    const response = await fetch(`${BASE_URL}/api/orders/create-order/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(orderData)
                    }).then(res => res.json());

                    if (response.status === 'success') {
                        showCusToast('Đặt hàng thành công!', 'success');
                        const totalAmount = Math.round(parseFloat(response.data.total_amount));
                        const orderId = response.data.order_id;

                        const momoData = {
                            order: orderId,
                            amount: totalAmount,
                            order_info: `Thanh toán cho đơn hàng ${orderId}`,
                            redirect_url: 'http://127.0.0.1:5500/pages/customer/qrcode.html',
                            ipn_url: `${TUNNEL_URL}/api/orders/done-payment/`
                        };

                        const momoResponse = await fetch(`${BASE_URL}/api/orders/momo-payment/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(momoData),
                        }).then(res => res.json());

                        if (momoResponse.payUrl) {
                            localStorage.setItem('orderID', orderId);
                            window.location.href = momoResponse.payUrl;
                        } else {
                            showCusToast('Lỗi khi tạo liên kết thanh toán MoMo.', 'danger');
                        }
                    } else {
                        showCusToast(response.message || 'Lỗi khi đặt hàng.', 'danger');
                    }
                } catch (error) {
                    handleError(error, 'Có lỗi xảy ra khi đặt hàng, vui lòng thử lại.');
                }
            });
        } else {
            ticketContainer.innerHTML = '<p>Không có vé nào khả dụng cho trận đấu này.</p>';
        }
    } catch (error) {
        handleError(error, 'Có lỗi xảy ra khi tải thông tin trận đấu.');
    }
}

// Initialize on page load
window.onload = initializeMatchDetails;