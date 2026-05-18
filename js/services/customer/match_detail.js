import CONFIG from "../../utils/settings.js";
import { showCusToast } from "../../components/toast.js";
import { getStadiumSections } from '/js/services/admin/stadiumService.js';




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

        promoSelect.innerHTML = '<option value="">--Chọn khuyến mãi(Chỉ áp dụng cho giá gốc)--</option>';
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
// Main function to initialize the page
async function initializeMatchDetails() {
    // --- GIỮ NGUYÊN PHẦN KHỞI TẠO ĐIỂM ---
    const pointsSection = document.getElementById('points-section');
    const availablePointsElem = document.getElementById('available-points');
    const usePointsInput = document.getElementById('use-points-input');
    const pointsDiscountElem = document.getElementById('points-discount-amount');
    
    let userPoints = 0;
    if (localStorage.getItem('access_token')) {
        userPoints = await fetchCustomerPoints();
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

        if (!selectedMatch.team_1 || !selectedMatch.team_2) {
            throw new Error('Dữ liệu trận đấu không hợp lệ');
        }

        // --- GIỮ NGUYÊN PHẦN HIỂN THỊ INFO TRẬN ĐẤU ---
        document.getElementById('team1-logo').src = selectedMatch.team_1.logo || 'https://via.placeholder.com/50';
        document.getElementById('team2-logo').src = selectedMatch.team_2.logo || 'https://via.placeholder.com/50';
        document.getElementById('match-title').textContent = `${selectedMatch.team_1.team_name} vs ${selectedMatch.team_2.team_name}`;
        document.getElementById('league').textContent = selectedMatch.league.league_name;
        document.getElementById('round').textContent = selectedMatch.round;
        document.getElementById('match-time').textContent = new Date(selectedMatch.match_time).toLocaleString();
        document.getElementById('stadium').textContent = selectedMatch.stadium.stadium_name;
        document.getElementById('description').textContent = selectedMatch.description;


        const layoutImage = document.getElementById('stadium-layout-image');

        // --- BẮT ĐẦU XỬ LÝ VÉ (LOGIC ĐƯỢC SỬA Ở ĐÂY) ---
        const ticketContainer = document.getElementById('ticket-container');
        const totalOrderCostElement = document.getElementById('total-order-cost');
        const selectedTickets = [];


        // ---- Interactive stadium map (syncs with ticket column) ----
        const stadiumMapContainer = document.getElementById('stadium-map-container');
        const shapesBySectionId = {}; // section_id -> { group, rect, text, closed }
        let konvaStage = null, konvaLayer = null;

        if (selectedMatch.stadium.stadium_layouts) {
            // hide static image (we will initialize map after tickets are rendered)
            const layoutImageEl = document.getElementById('stadium-layout-image');
            if (layoutImageEl) layoutImageEl.style.display = 'none';
            if (stadiumMapContainer) stadiumMapContainer.style.display = 'block';
        } else {
            if (stadiumMapContainer) stadiumMapContainer.innerHTML = '<p>Không có bố cục sân vận động.</p>';
        }

        async function initStadiumMap(stadiumId, selectedMatchLocal) {
            try {
                //const token = localStorage.getItem('access_token') || '';
                const sections = await getStadiumSections(stadiumId);
                // build lookup for section_price for current match
                const sectionPriceMap = {};
                (selectedMatchLocal.section_prices || []).forEach(sp => {
                    sectionPriceMap[sp.section.section_id] = sp;
                });

                // prepare stadium areas from sections (similar to admin page)
                const areas = sections.map(section => {
                    if (section.map_position) {
                        try {
                            const [rawType, shapeType, x, y, width, height] = section.map_position.split(',').map(s => s.trim());
                            const type = rawType ? rawType.toLowerCase() : (section.section_name && section.section_name.toLowerCase().includes('vip') ? 'vip' : 'stand');
                            return { id: section.section_name, type, shapeType, x: parseFloat(x), y: parseFloat(y), width: parseFloat(width), height: parseFloat(height), section_id: section.section_id };
                        } catch (e) {
                            const defaultType = section.section_name && section.section_name.toLowerCase().includes('vip') ? 'vip' : 'stand';
                            return { id: section.section_name, type: defaultType, shapeType: 'rect', x: Math.random() * 600, y: Math.random() * 300, width: 120, height: 60, section_id: section.section_id };
                        }
                    } else {
                        const type = section.section_name && section.section_name.toLowerCase().includes('vip') ? 'vip' : 'stand';
                        return { id: section.section_name, type, shapeType: 'rect', x: Math.random() * 600, y: Math.random() * 300, width: 120, height: 60, section_id: section.section_id };
                    }
                });

                // destroy any previous stage
                if (konvaStage) konvaStage.destroy();
                const containerWidth = stadiumMapContainer.clientWidth || 600;
                const containerHeight = 400;
                konvaStage = new Konva.Stage({
                    container: 'stadium-map-container',
                    width: containerWidth,
                    height: containerHeight
                });
                konvaLayer = new Konva.Layer();
                konvaStage.add(konvaLayer);

                // Draw background / pitch and compute uniform scaling so admin coordinates align and are centered
                const sourceWidth = 1000; // admin editor reference
                const sourceHeight = 700;
                const uniformScale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight);
                const scaledStageWidth = Math.round(sourceWidth * uniformScale);
                const scaledStageHeight = Math.round(sourceHeight * uniformScale);
                const offsetX = Math.round((containerWidth - scaledStageWidth) / 2);
                const offsetY = Math.round((containerHeight - scaledStageHeight) / 2);

                // subtle stadium background (full container) and stage area border to reflect admin editor
                const bg = new Konva.Rect({ x: 0, y: 0, width: containerWidth, height: containerHeight, fill: '#f6fff6', listening: false });
                konvaLayer.add(bg);

                // stage area (scaled admin stage) - gives precise coordinate mapping
                const stageArea = new Konva.Rect({ x: offsetX, y: offsetY, width: scaledStageWidth, height: scaledStageHeight, fill: '#ecf6ee', stroke: '#2c3e50', strokeWidth: 2, cornerRadius: 8, listening: false });
                konvaLayer.add(stageArea);

                // draw pitch exactly where admin placed it: admin pitch is at (300,200) size (400x300)
                const adminPitch = { x: 300, y: 200, width: 400, height: 300 };
                const pitchRect = new Konva.Rect({
                    x: offsetX + Math.round(adminPitch.x * uniformScale),
                    y: offsetY + Math.round(adminPitch.y * uniformScale),
                    width: Math.round(adminPitch.width * uniformScale),
                    height: Math.round(adminPitch.height * uniformScale),
                    fill: '#2ecc71',
                    stroke: 'black',
                    strokeWidth: Math.max(1, Math.round(2 * uniformScale)),
                    listening: false
                });
                konvaLayer.add(pitchRect);

                // Draw areas, applying uniform scaling and clamping so shapes match admin placement
                areas.forEach(a => {
                    const sp = sectionPriceMap[a.section_id];
                    const closed = (!sp || sp.is_closed || sp.available_seats <= 0);
                    const fill = a.type === 'vip' ? '#f1c40f' : '#3498db';

                    const xScaled = offsetX + Math.round((a.x || 0) * uniformScale);
                    const yScaled = offsetY + Math.round((a.y || 0) * uniformScale);
                    const widthScaled = Math.max(8, Math.round((a.width || 40) * uniformScale));
                    const heightScaled = Math.max(8, Math.round((a.height || 40) * uniformScale));

                    // clamp to the stage area (not entire container)
                    const xClamped = Math.min(Math.max(xScaled, offsetX), offsetX + scaledStageWidth - widthScaled);
                    const yClamped = Math.min(Math.max(yScaled, offsetY), offsetY + scaledStageHeight - heightScaled);

                    const group = new Konva.Group({
                        x: xClamped,
                        y: yClamped,
                        id: String(a.section_id),
                        name: 'section',
                        draggable: false
                    });

                    const rect = new Konva.Rect({
                        width: widthScaled,
                        height: heightScaled,
                        fill: fill,
                        stroke: closed ? '#7f8c8d' : 'black',
                        strokeWidth: Math.max(1, Math.round(2 * uniformScale)),
                        opacity: closed ? 0.25 : 1,
                    });

                    const fontSize = Math.max(10, Math.round(heightScaled * 0.2));
                    const text = new Konva.Text({
                        text: a.id,
                        width: widthScaled,
                        height: heightScaled,
                        align: 'center',
                        verticalAlign: 'middle',
                        fill: 'white',
                        fontSize: fontSize
                    });

                    // center text
                    text.position({ x: widthScaled / 2, y: heightScaled / 2 });
                    text.offsetX(text.width() / 2);
                    text.offsetY(text.height() / 2);

                    group.add(rect);
                    group.add(text);
                    konvaLayer.add(group);

                    shapesBySectionId[a.section_id] = { group, rect, text, closed };

                    group.on('click', async (e) => {
                        e.cancelBubble = true;
                        if (closed) {
                            showCusToast('Khu vực không thể mua', 'info');
                            return;
                        }
                        // open quantity modal
                        const spLocal = sectionPriceMap[a.section_id];
                        const maxQuantity = Math.min(spLocal.available_seats, MAX_TICKETS_PER_SECTION);
                        const current = (selectedTickets.find(t => t.section === a.section_id) || {}).quantity || 0;

                        let optionsHtml = `<select id="swal-quantity" class="swal2-select">`;
                        optionsHtml += `<option value="0">0 (Hủy chọn)</option>`;
                        for (let i = 1; i <= maxQuantity; i++) optionsHtml += `<option value="${i}" ${i === current ? 'selected' : ''}>${i}</option>`;
                        optionsHtml += `</select>`;

                        const { value: qty } = await Swal.fire({
                            title: `Chọn số lượng cho ${a.id}`,
                            html: optionsHtml,
                            showCancelButton: true,
                            confirmButtonText: 'Xác nhận',
                            preConfirm: () => {
                                const val = document.getElementById('swal-quantity').value;
                                return parseInt(val, 10) || 0;
                            }
                        });

                        if (typeof qty === 'number') {
                            setQuantityForSection(a.section_id, qty);
                        }
                    });

                    group.on('mouseover', () => { 
                        try { group.getStage().container().style.cursor = closed ? 'not-allowed' : 'pointer'; } catch (e) {}
                    });
                    group.on('mouseout', () => { 
                        try { group.getStage().container().style.cursor = 'default'; } catch (e) {}
                    });
                });

                konvaLayer.draw();
            } catch (err) {
                console.error('Lỗi khi khởi tạo bản đồ sân:', err);
            }
        }

        // Set quantity for a section and sync UI (ticket column and map highlight)
        function setQuantityForSection(sectionId, quantity) {
            const ticketIndex = selectedTickets.findIndex(t => t.section === sectionId);
            const quantitySelect = document.getElementById(`quantity-${sectionId}`);
            const buyButton = document.getElementById(`buy-btn-${sectionId}`);
            const quantityDiv = document.getElementById(`quantity-div-${sectionId}`);
            const totalPriceElement = document.getElementById(`total-price-${sectionId}`);

            const sp = selectedMatch.section_prices.find(t => t.section.section_id === sectionId);
            const maxQuantity = sp ? Math.min(sp.available_seats, MAX_TICKETS_PER_SECTION) : MAX_TICKETS_PER_SECTION;

            if (quantity > 0) {
                if (quantitySelect) {
                    quantitySelect.value = String(Math.min(quantity, maxQuantity));
                    quantityDiv.style.display = 'inline-block';
                    if (buyButton) buyButton.style.display = 'none';
                }                // fetch promotions for this section when selection is made via map
                const promoSelectEl = document.getElementById(`promo-code-${sectionId}`);
                if (promoSelectEl) {
                    fetchPromotions(selectedMatchId, sectionId, promoSelectEl);
                }                if (ticketIndex === -1) {
                    selectedTickets.push({ section: sectionId, quantity: Math.min(quantity, maxQuantity) });
                } else {
                    selectedTickets[ticketIndex].quantity = Math.min(quantity, maxQuantity);
                }
                if (totalPriceElement && sp) {
                    const ticketObj = sp;
                    totalPriceElement.textContent = calculateTotalPrice(ticketObj, Math.min(quantity, maxQuantity)).toFixed(2);
                }
            } else {
                if (quantitySelect) {
                    quantitySelect.value = '0';
                    quantityDiv.style.display = 'none';
                    if (buyButton) buyButton.style.display = 'inline-block';
                }
                if (ticketIndex !== -1) selectedTickets.splice(ticketIndex, 1);
                if (totalPriceElement) totalPriceElement.textContent = '0.00';
            }

            // Update totals and highlight on map
            updateTotalOrderCost();
            updateMapHighlight(sectionId, quantity);
        }

        // Update map highlight for a section based on quantity
        function updateMapHighlight(sectionId, quantity) {
            const s = shapesBySectionId[sectionId];
            if (!s) return;
            if (quantity > 0) {
                s.rect.stroke('#2ecc71'); s.rect.strokeWidth(4);
            } else {
                s.rect.stroke(s.closed ? '#7f8c8d' : 'black'); s.rect.strokeWidth(2);
            }
            konvaLayer.draw();
        }

        // Expose a function to update section availability (used by WebSocket updates)
        window.updateStadiumMapAvailability = function(sectionId, availableCount, isClosedFlag) {
            const s = shapesBySectionId[sectionId];
            if (!s) return;
            const closed = !!isClosedFlag || (typeof availableCount === 'number' && availableCount <= 0);
            s.closed = closed;
            s.rect.opacity(closed ? 0.4 : 1);
            s.rect.stroke(closed ? '#7f8c8d' : 'black');
            konvaLayer.draw();
        };

        // Update total order cost
        function updateTotalOrderCost() {
    let totalTicketCost = 0;
    
    // 1. Cộng dồn tiền vé (đã trừ khuyến mãi Promotion)
    selectedTickets.forEach(ticket => {
        const totalPriceElement = document.getElementById(`total-price-${ticket.section}`);
        // Parse số từ text (loại bỏ dấu chấm phân cách hàng nghìn)
        const priceValue = totalPriceElement ? parseFloat(totalPriceElement.textContent.replace(/\./g, '').replace(/,/g, '')) : 0;
        totalTicketCost += priceValue;
    });

    // 2. LOGIC MỚI: TÍNH GIỚI HẠN ĐIỂM
    let pointsToUse = 0;
    
    if (usePointsInput) {
        // Lấy giá trị khách nhập
        let rawInput = parseInt(usePointsInput.value) || 0;
        
        // a. Giới hạn bởi số điểm khách đang có
        const maxUserPoints = parseInt(usePointsInput.max) || 0;
        
        // b. Giới hạn bởi giá trị đơn hàng (Logic trần điểm)
        // Ví dụ: Đơn 900k -> Cần tối đa 900 điểm. 
        // Đơn 0đ (do Promotion 100%) -> Cần 0 điểm.
        const maxPointsNeeded = Math.ceil(totalTicketCost / 1000);

        // Số điểm thực tế tối đa có thể dùng cho đơn này
        // Là số nhỏ nhất giữa: (Điểm khách có) và (Điểm cần thiết để trả đơn này)
        const realLimit = Math.min(maxUserPoints, maxPointsNeeded);

        // XỬ LÝ GIAO DIỆN:
        if (rawInput > realLimit) {
            // Nếu khách nhập lố, tự động đưa về mức trần
            pointsToUse = realLimit;
            usePointsInput.value = realLimit; // Cập nhật lại số trên ô input

            // Thông báo cho khách hiểu tại sao số lại nhảy
            if (rawInput > maxUserPoints) {
                showCusToast(`Bạn chỉ có tối đa ${maxUserPoints} điểm.`, 'warning');
            } else if (rawInput > maxPointsNeeded) {
                // Đây là cái bạn cần: Thông báo đơn hàng này chỉ cần nhiêu đó điểm
                showCusToast(`Đơn hàng này chỉ cần tối đa ${maxPointsNeeded} điểm để thanh toán 0đ.`, 'info');
            }
        } else {
            pointsToUse = rawInput;
        }
    }
    
    // 3. Tính toán tiền giảm
    const discountFromPoints = pointsToUse * 1000;
    const finalAmount = Math.max(0, totalTicketCost - discountFromPoints);

    // 4. Update hiển thị
    if (pointsDiscountElem) {
        pointsDiscountElem.textContent = discountFromPoints.toLocaleString('vi-VN');
    }
    
    if (totalOrderCostElement) {
        totalOrderCostElement.textContent = finalAmount.toLocaleString('vi-VN');
    }
    const earningContainer = document.getElementById('earning-points-display');
    const earningValue = document.getElementById('earning-points-value');

    if (earningValue) {
            // 1. Lấy hạng từ Storage
            const userTier = localStorage.getItem('customer_tier') || 'bronze';
            
            // --- THÊM DÒNG NÀY ĐỂ DEBUG (Xem F12 Console) ---
            console.log("🔍 Debug Hạng thành viên:", userTier); 
            // ------------------------------------------------

            // 2. Xác định hệ số nhân
            let multiplier = 1.0;
            if (userTier === 'silver') multiplier = 1.1;
            if (userTier === 'gold') multiplier = 1.2;
            if (userTier === 'diamond') multiplier = 1.5;

            console.log("✖️ Hệ số nhân:", multiplier); // Kiểm tra xem hệ số có nhảy không

            // 3. Tính điểm
            const basePoints = Math.floor(finalAmount / 10000);
            const pointsEarned = Math.floor(basePoints * multiplier);

        // 4. Hiển thị
        if (pointsEarned > 0) {
            earningContainer.style.display = 'inline-block';
            earningValue.textContent = pointsEarned.toLocaleString('vi-VN');
            
            // Tooltip để giải thích tại sao được điểm này
            earningContainer.title = `Hạng ${userTier.toUpperCase()}: Nhân ${multiplier} lần điểm thưởng`;
        } else {
            earningContainer.style.display = 'none';
        }
    }
    // -------------------------------------------------

    // Update hiển thị giá tiền (Code cũ)
    if (pointsDiscountElem) pointsDiscountElem.textContent = discountFromPoints.toLocaleString('vi-VN');
    if (totalOrderCostElement) totalOrderCostElement.textContent = finalAmount.toLocaleString('vi-VN');
    return finalAmount;
}

        // Lắng nghe sự kiện nhập điểm
        if(usePointsInput){
            usePointsInput.addEventListener('input', updateTotalOrderCost);
        }

        if (selectedMatch.section_prices?.length > 0) {
            selectedMatch.section_prices.forEach(ticket => {
                if (ticket.is_closed || ticket.available_seats <= 0) return;

                const maxQuantity = Math.min(ticket.available_seats, MAX_TICKETS_PER_SECTION);
                let quantityOptions = '<option value="0">Chọn số</option>';
                for (let i = 1; i <= maxQuantity; i++) {
                    quantityOptions += `<option value="${i}">${i}</option>`;
                }

                const ticketDiv = document.createElement('div');
                ticketDiv.classList.add('ticket-card');
                // GIỮ NGUYÊN HTML CỦA BẠN
                ticketDiv.innerHTML = `
                    <p><strong>Khu vực:</strong> ${ticket.section.section_name}</p>
                    <p><strong>Giá:</strong> ${parseFloat(ticket.price).toLocaleString('vi-VN')}VND</p>
                    <p><strong>Còn lại:</strong> <span id="available-seats-${ticket.section.section_id}">${ticket.available_seats} vé</p>
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
                const sectionId = ticket.section.section_id;
                const buyButton = document.getElementById(`buy-btn-${sectionId}`);
                const quantityDiv = document.getElementById(`quantity-div-${sectionId}`);
                const quantitySelect = document.getElementById(`quantity-${sectionId}`);
                const cancelButton = document.getElementById(`cancel-btn-${sectionId}`);
                const promoSelect = document.getElementById(`promo-code-${sectionId}`);
                const promoMessageDiv = document.getElementById(`promo-message-${sectionId}`);
                const sectionTotalPriceElem = document.getElementById(`total-price-${sectionId}`);

                // --- HÀM TÍNH TIỀN CHO TỪNG SECTION (QUAN TRỌNG) ---
                function calculateSectionTotal() {
                    const quantity = parseInt(quantitySelect.value, 10) || 0;
                    const unitPrice = parseFloat(ticket.price);
                    
                    // Tính giá giảm trên mỗi vé
                    let discountPerUnit = 0;
                    const selectedOption = promoSelect.options[promoSelect.selectedIndex];
                    
                    if (selectedOption && selectedOption.value) {
                        const type = selectedOption.getAttribute('data-discount-type');
                        const value = parseFloat(selectedOption.getAttribute('data-discount-value'));

                        if (type === 'amount') {
                            discountPerUnit = value;
                        } else if (type === 'percentage') {
                            discountPerUnit = (value / 100) * unitPrice;
                        }
                    }

                    // Giá vé sau giảm (không âm)
                    const finalUnitPrice = Math.max(0, unitPrice - discountPerUnit);
                    
                    // Tổng tiền Section = Giá vé sau giảm * Số lượng
                    const sectionTotal = finalUnitPrice * quantity;

                    // Cập nhật giao diện Section
                    sectionTotalPriceElem.textContent = sectionTotal.toLocaleString('vi-VN'); // Hiển thị số đẹp
                    
                    // Cập nhật tổng đơn hàng
                    updateTotalOrderCost();
                }

                // Handle buy button click
                buyButton.addEventListener('click', () => {
                    const accessToken = localStorage.getItem('access_token');
                    if (!accessToken) {
                        showCusToast('Vui lòng đăng nhập trước khi mua vé.', 'info');
                        setTimeout(() => { window.location.href = '/pages/customer/login.html'; }, 1500);
                        return;
                    }

                    quantityDiv.style.display = 'inline-block';
                    buyButton.style.display = 'none';
                    quantitySelect.disabled = false;
                    fetchPromotions(selectedMatchId, sectionId, promoSelect);
                });

                // Handle quantity selection
                quantitySelect.addEventListener('change', () => {
                    let quantity = sanitizeQuantity(quantitySelect.value, maxQuantity);

                    // Update selected tickets array
                    const ticketInArray = selectedTickets.find(t => t.section === sectionId);
                    if (quantity > 0) {
                        if (ticketInArray) ticketInArray.quantity = quantity;
                        else selectedTickets.push({ section: sectionId, quantity: quantity });
                    } else if (ticketInArray) {
                        selectedTickets.splice(selectedTickets.indexOf(ticketInArray), 1);
                    }

                    // TÍNH TOÁN LẠI TIỀN
                    calculateSectionTotal();
                    
                    // Check max amount
                    const totalCost = updateTotalOrderCost();
                    if (totalCost > MAX_TOTAL_AMOUNT) {
                        quantitySelect.value = '0';
                        if (ticketInArray) selectedTickets.splice(selectedTickets.indexOf(ticketInArray), 1);
                        calculateSectionTotal(); // Reset về 0
                        showCusToast(`Tổng số tiền không được vượt quá ${MAX_TOTAL_AMOUNT.toLocaleString()} VND.`, 'danger');
                    }

                    // Sync map highlight
                    if (typeof updateMapHighlight === 'function') {
                        updateMapHighlight(ticket.section.section_id, quantity);
                    }
                });

                // Handle promo selection (MỚI: Thêm sự kiện này để cập nhật giá khi chọn mã)
                promoSelect.addEventListener('change', () => {
                    calculateSectionTotal();
                });

                // Handle cancel button
                cancelButton.addEventListener('click', () => {
                    quantityDiv.style.display = 'none';
                    buyButton.style.display = 'inline-block';
                    quantitySelect.value = '0';
                    promoSelect.value = ''; // Reset promo
                    sectionTotalPriceElem.textContent = '0'; // Reset giá hiển thị

                    const ticketIndex = selectedTickets.findIndex(t => t.section === sectionId);
                    if (ticketIndex !== -1) {
                        selectedTickets.splice(ticketIndex, 1);
                    }

                    promoSelect.innerHTML = '<option value="">--Chọn khuyến mãi--</option>';
                    promoMessageDiv.innerHTML = '';
                    updateTotalOrderCost();

                    // Sync map highlight off
                    if (typeof updateMapHighlight === 'function') {
                        updateMapHighlight(ticket.section.section_id, 0);
                    }
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

                // Lấy giá trị cuối cùng từ hàm tính toán chuẩn
                const finalAmount = updateTotalOrderCost();
                
                if (finalAmount > MAX_TOTAL_AMOUNT) {
                    showCusToast(`Tổng số tiền không được vượt quá ${MAX_TOTAL_AMOUNT.toLocaleString()} VND.`, 'danger');
                    return;
                }

                const orderData = {
                    user: localStorage.getItem('customer_id'),
                    total_amount: finalAmount, // Đã trừ điểm
                    use_points: parseInt(document.getElementById('use-points-input')?.value) || 0,
                    order_status: 'pending',
                    order_method: 'online',
                    order_details: []
                };

                selectedTickets.forEach(ticket => {
                     // Lấy Promo ID hiện tại trên giao diện
                    const pSelect = document.getElementById(`promo-code-${ticket.section}`);
                    const promoID = pSelect && pSelect.value ? parseInt(pSelect.value) : null;

                    for (let i = 0; i < ticket.quantity; i++) {
                        orderData.order_details.push({
                            pricing: selectedMatch.section_prices.find(t => t.section.section_id === ticket.section).pricing_id,
                            price: selectedMatch.section_prices.find(t => t.section.section_id === ticket.section).price,
                            promotion: promoID, // Gửi kèm promotion ID
                            qr_code: null,
                            seat_id: null,
                        });
                    }
                });

                // ... (Phần gọi API giữ nguyên như cũ) ...
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
                            redirect_url: `${window.location.origin}/pages/customer/qrcode.html`,
                            ipn_url: `${BASE_URL}/api/orders/done-payment/`
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
                            sessionStorage.setItem('pendingMomoOrderId', orderId);
                            window.location.href = momoResponse.payUrl;
                        } else {
                            const momoErr = momoResponse.error || momoResponse.message || 'Lỗi khi tạo liên kết thanh toán MoMo.';
                            showCusToast(momoErr, 'danger');

                            // Nếu backend trả payment_id (do gateway timeout), lưu lại để người dùng có thể thử lại
                            if (momoResponse.payment_id) {
                                localStorage.setItem('last_momo_payment_id', momoResponse.payment_id);
                                showCusToast(`Giao dịch đang chờ. Thử lại thanh toán (Mã: ${momoResponse.payment_id}).`, 'info');
                            }

                            console.error('MoMo payment error:', momoResponse);
                        }
                    } else {
                        // Hiển thị lỗi chi tiết hơn nếu có
                        let errorMsg = response.message || 'Lỗi khi đặt hàng.';
                        if (response.errors) {
                            if (typeof response.errors === 'string') {
                                errorMsg = response.errors;
                            } else if (response.errors.message) {
                                errorMsg = response.errors.message;
                            } else if (response.errors.non_field_errors) {
                                errorMsg = Array.isArray(response.errors.non_field_errors) ? response.errors.non_field_errors[0] : JSON.stringify(response.errors.non_field_errors);
                            } else {
                                errorMsg = JSON.stringify(response.errors);
                            }
                        }
                        showCusToast(errorMsg, 'danger');
                    }
                } catch (error) {
                    handleError(error, 'Có lỗi xảy ra khi đặt hàng, vui lòng thử lại.');
                }
            });
        } else {
            ticketContainer.innerHTML = '<p>Không có vé nào khả dụng cho trận đấu này.</p>';
        }

        // initialize interactive stadium map after ticket DOMs rendered
        if (selectedMatch.stadium.stadium_layouts) {
            if (stadiumMapContainer) stadiumMapContainer.style.display = 'block';
            initStadiumMap(selectedMatch.stadium.stadium_id, selectedMatch);
        }
    } catch (error) {
        handleError(error, 'Có lỗi xảy ra khi tải thông tin trận đấu.');
    }
    if (selectedMatchId) {
        connectWebSocket(selectedMatchId);
    }
}

//websocket
// ... (Code cũ của bạn) ...

// --- TÍCH HỢP WEBSOCKET ---
function connectWebSocket(matchId) {
    // 1. Tạo kết nối (Lưu ý: thay đổi ws:// hoặc wss:// tùy môi trường)
    // Nếu bạn đang chạy local thì dùng ws://127.0.0.1:8000
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//127.0.0.1:8000/ws/book/${matchId}/`; 
    
    const bookingSocket = new WebSocket(socketUrl);

    bookingSocket.onopen = function(e) {
        console.log('✅ Kết nối WebSocket thành công!');
    };

    bookingSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log("📩 WebSocket nhận tin:", data);

        // Trường hợp 1: Nhận danh sách vé ban đầu (khi vừa vào trang)
        if (data.status === 'success' && data.tickets) {
            data.tickets.forEach(ticket => {
                updateSeatCount(ticket.section_id, ticket.available_seats);
            });
        }

        // Trường hợp 2: Cập nhật thời gian thực (khi có ai đó mua vé)
        if (data.status === 'update' && data.updated_sections) {
            
            // Hiển thị thông báo nhỏ (Toast)
            if (typeof showCusToast === 'function') {
                showCusToast(`⚠️ ${data.message}`, 'info');
            }

            // Cập nhật số lượng trên giao diện
            for (const [sectionId, newCount] of Object.entries(data.updated_sections)) {
                updateSeatCount(sectionId, newCount);
            }
        }
    };

    bookingSocket.onclose = function(e) {
        console.error('❌ WebSocket bị ngắt kết nối. Đang thử lại...');
        // Tự động kết nối lại sau 3 giây (nếu muốn)
        setTimeout(() => connectWebSocket(matchId), 3000);
    };
    
    bookingSocket.onerror = function(e) {
        console.error('WebSocket lỗi:', e);
    };
}

// Hàm cập nhật giao diện
function updateSeatCount(sectionId, count) {
    const seatElement = document.getElementById(`available-seats-${sectionId}`);
    if (seatElement) {
        // Cập nhật số
        seatElement.textContent = count;
        
        // Hiệu ứng nhấp nháy màu đỏ để gây chú ý
        seatElement.style.color = "red";
        seatElement.style.fontWeight = "bold";
        setTimeout(() => {
            seatElement.style.color = ""; // Trả về màu cũ
            seatElement.style.fontWeight = "";
        }, 2000);

        // (Tùy chọn) Nếu hết vé (count <= 0), ẩn nút mua
        const buyBtn = document.getElementById(`buy-btn-${sectionId}`);
        if (count <= 0) {
            if (buyBtn) {
                buyBtn.disabled = true;
                buyBtn.textContent = "Hết vé";
                buyBtn.classList.add('disabled');
            }
        } else {
            if (buyBtn) {
                buyBtn.disabled = false;
                buyBtn.textContent = "Mua vé";
                buyBtn.classList.remove('disabled');
            }
        }

        // Update map availability if map exists
        if (typeof window.updateStadiumMapAvailability === 'function') {
            window.updateStadiumMapAvailability(sectionId, count, count <= 0);
        }
    }
}
// tích điểm
async function fetchCustomerPoints() {
    const customerId = localStorage.getItem('customer_id');
    if (!customerId) return 0;

    try {
        const response = await fetch(`${BASE_URL}/api/accounts/customer/profile/?id=${customerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
                // Nếu API profile yêu cầu token thì bỏ comment dòng dưới
                // 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            console.log("✅ API trả về Tier:", data.data.tier); // Debug xem API trả về gì

            // --- QUAN TRỌNG: LƯU TIER MỚI VÀO STORAGE ---
            const userTier = data.data.tier || 'bronze';
            localStorage.setItem('customer_tier', userTier); 
            // ---------------------------------------------
            
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
