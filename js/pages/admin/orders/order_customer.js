
import CONFIG from "../../../utils/settings.js";
import { showToast } from "../../../components/toast.js";
const BASE_URL = CONFIG.BASE_URL;

const TUNNEL_URL = CONFIG.TUNNEL_URL;

let allMatches = [];
let filteredMatches = [];
let selectedMatch = null;
let selectedSections = [];
let customers = [];
let promotions = [];


const cardsContainer = document.getElementById('match-cards');
const searchInput = document.getElementById('search-input');
const leagueFilter = document.getElementById('league-filter');
const customerDatalist = document.getElementById('customer-list');

const params = new URLSearchParams(window.location.search);
const customerId = params.get('customer_id');


function initiateMomoPayment(orderId, totalAmount) {
    const momoPayload = {
        order: orderId,
        amount: totalAmount,
        order_info: `Thanh toán cho đơn hàng ${orderId}`,
        redirect_url: `${window.location.origin}/pages/admin/orders/qrcode.html`,
        ipn_url: `https://soccer.miego.store/api/orders/done-payment/`
    };
    return fetch(`${BASE_URL}/api/orders/momo-payment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(momoPayload)
    })
        .then(res => res.json());
}


window.onload = () => {
    if (customerId) {
        const customerInput = document.getElementById('customer-input');
        customerInput.value = customerId;
        customerInput.removeAttribute('list');
        customerInput.setAttribute('readonly', true);
        if (customerDatalist) {
            customerDatalist.remove();
        }
    }
    loadMatches();
};

function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}

// 1. Load matches
function loadMatches() {
    fetch(`${BASE_URL}/api/orders/matches/`)
        .then(res => res.json())
        .then(data => {
            // nếu dùng pagination DRF:
            allMatches = data.results || data;
            filteredMatches = [...allMatches];
            populateLeagueFilter();
            renderMatches();
        })
        .catch(err => {
            console.error('Error loading matches:', err);
            cardsContainer.innerHTML = '<p class="text-danger">Không tải được danh sách trận đấu.</p>';
        });
}

// Populate league filter dropdown
function populateLeagueFilter() {
    const leagues = [...new Set(allMatches.map(m => m.league.league_name))];
    leagueFilter.innerHTML = `<option value="">Tất cả giải đấu</option>`;
    leagues.forEach(l => {
        const o = document.createElement('option');
        o.value = l; o.textContent = l;
        leagueFilter.appendChild(o);
    });
    searchInput.addEventListener('input', applyFilters);
    leagueFilter.addEventListener('change', applyFilters);
}

// Apply search & league filters
function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const lf = leagueFilter.value;
    filteredMatches = allMatches.filter(m => {
        const title = `${m.team_1.team_name} vs ${m.team_2.team_name}`.toLowerCase();
        const okTerm = title.includes(term);
        const okLeague = lf ? m.league.league_name === lf : true;
        return okTerm && okLeague;
    });
    renderMatches();
}

// Render match cards
function renderMatches() {
    cardsContainer.innerHTML = '';
    if (!filteredMatches.length) {
        cardsContainer.innerHTML = '<p>Không tìm thấy trận đấu phù hợp.</p>';
        return;
    }
    filteredMatches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'col';
        div.innerHTML = `
        <div class="card match-card h-100 p-2" data-id="${m.match_id}">
          <div><strong>${m.team_1.team_name} vs ${m.team_2.team_name}</strong></div>
          <div>${formatDateTime(m.match_time)}</div>
          <div>${m.league.league_name}</div>
        </div>`;
        cardsContainer.appendChild(div);
        div.querySelector('.match-card').addEventListener('click', () => selectMatch(m.match_id));
    });
}

// Chọn trận đấu -> hiển thị chi tiết và các khu vực
function selectMatch(id) {
    console.log('Match', id)

    // Khởi tạo lại các biến
    selectedSections = [];
    document.getElementById('subtotal-price').textContent = '0.00';
    document.getElementById('discount-amount').textContent = '0.00';
    document.getElementById('total-price').textContent = '0.00';

    selectedMatch = allMatches.find(x => x.match_id === id);
    document.getElementById('match-detail').style.display = 'block';
    document.getElementById('detail-teams').textContent = `${selectedMatch.team_1.team_name} vs ${selectedMatch.team_2.team_name}`;
    document.getElementById('detail-time').textContent = formatDateTime(selectedMatch.match_time) || '__';
    document.getElementById('detail-stadium').textContent = selectedMatch.stadium.stadium_name;

    // Sections
    const secDiv = document.getElementById('sections');
    secDiv.innerHTML = '';

    selectedMatch.section_prices
        .filter(s => !s.is_closed && s.available_seats > 0)
        .forEach(s => {
            const wrap = document.createElement('div');
            wrap.className = 'd-flex align-items-center mb-2';

            wrap.innerHTML = `
                        <div class="form-check me-3">
                            <input class="form-check-input section-checkbox" type="checkbox"
                                id="sec-${s.section.section_id}"
                                data-sec-id="${s.section.section_id}"
                                data-price="${s.price}">
                            <label class="form-check-label"
                                for="sec-${s.section.section_id}">
                            ${s.section.section_name} (${s.price} VND) ‒ Avl: ${s.available_seats}
                            </label>
                        </div>
                        <input type="number"
                                class="form-control quantity-input"
                                id="qty-${s.section.section_id}"
                                min="1"
                                max="${s.available_seats}"
                                value="1"
                                style="width: 80px; display: none; margin-right: 1rem;">
                        <select class="form-select promo-select"
                                id="promo-${s.section.section_id}"
                                style="width: 200px; display: none;">
                            <option value="">-- None --</option>
                        </select>`;
            secDiv.appendChild(wrap);

            // 1) Checkbox handler
            const cb = wrap.querySelector('.section-checkbox');
            const qtyInput = wrap.querySelector('.quantity-input');
            const promoSelect = wrap.querySelector('.promo-select');

            qtyInput.addEventListener('input', () => {
                const min = parseInt(qtyInput.min, 10) || 1;
                const available = s.available_seats;
                const max = available;

                // Lọc ký tự không phải số (tuỳ chọn)
                const filtered = qtyInput.value.replace(/\D+/g, '');
                if (filtered !== qtyInput.value) {
                    qtyInput.value = filtered;
                    showToast('Chỉ được nhập số.', 'warning');
                }

                let enteredQty = parseInt(qtyInput.value, 10);

                // Nếu không phải số hoặc nhỏ hơn min
                if (isNaN(enteredQty) || enteredQty < min) {
                    showToast(`Số lượng phải từ ${min} trở lên.`, 'danger');
                    enteredQty = min;
                }
                // Nếu vượt max
                else if (enteredQty > max) {
                    showToast(`Chỉ còn ${max} ghế trống.`, 'danger');
                    enteredQty = max;
                }

                // Cập nhật lại cả input và selectedSections
                qtyInput.value = enteredQty;
                const sel = selectedSections.find(x => x.section.section.section_id === s.section.section_id);
                if (sel) {
                    sel.qty = enteredQty;
                    updateTotal();
                }
            });


            cb.addEventListener('change', () => {
                if (cb.checked) {
                    // show qty + promo
                    qtyInput.style.display = 'inline-block';
                    promoSelect.style.display = 'inline-block';

                    // fetch promotions for this section
                    fetchPromotions(
                        selectedMatch.match_id,
                        s.section.section_id,
                        promoSelect
                    );

                    selectedSections.push({
                        section: s,
                        qty: parseInt(qtyInput.value, 10),
                        promo: promoSelect.value
                    });

                } else {
                    // hide & remove from selectedSections
                    qtyInput.style.display = 'none';
                    promoSelect.style.display = 'none';
                    selectedSections = selectedSections.filter(x =>
                        x.section.section.section_id !== s.section.section_id
                    );

                }
                updateTotal();
            });

            // 3) Promotion handler
            promoSelect.addEventListener('change', () => {
                const sel = selectedSections.find(x => x.section.section.section_id === s.section.section_id);
                if (sel) {
                    sel.promo = promoSelect.value || null;
                    // also store discount type/value if you need it later
                    sel.promoType = promoSelect.selectedOptions[0]?.dataset.type;
                    sel.promoValue = parseFloat(promoSelect.selectedOptions[0]?.dataset.value) || 0;
                    updateTotal();
                }
            });
        });
}

// Lấy danh sách khuyến mãi
function fetchPromotions(matchId, sectionId, promoSelect) {
    promoSelect.innerHTML = '<option value="">-- Không có khuyến mãi --</option>';
    fetch(`${BASE_URL}/api/orders/promotions/${matchId}/${sectionId}/`)
        .then(res => res.json())
        .then(data => {
            console.log('Promotions for', matchId, sectionId, data);
            const promos = data.results || data;
            if (promos.length) {
                promoSelect.style.display = 'inline-block';
                promos.forEach(p => {
                    const o = document.createElement('option');
                    o.value = p.promo_id;
                    o.textContent = p.discount_type === 'amount'
                        ? `${p.promo_code} – Giảm ${p.discount_value} VND`
                        : `${p.promo_code} – Giảm ${p.discount_value}%`;
                    o.dataset.type = p.discount_type;
                    o.dataset.value = p.discount_value;
                    promoSelect.appendChild(o);
                });
            } else {
                // promoSelect.style.display = 'none';
            }
        })
        .catch(err => console.error('Error loading promotions:', err));
}

// Tính subtotal, discount, total và cập nhật DOM
function updateTotal() {
    let subtotal = 0, discount = 0;

    selectedSections.forEach(sel => {
        const base = sel.section.price * sel.qty;
        subtotal += base;

        if (sel.promo) {
            if (sel.promoType === 'amount') {
                discount += sel.promoValue * sel.qty;
            } else {
                discount += base * (sel.promoValue / 100);
            }
        }
    });

    const total = Math.max(subtotal - discount, 0);

    document.getElementById('subtotal-price').textContent = subtotal.toFixed(2);
    document.getElementById('discount-amount').textContent = discount.toFixed(2);
    document.getElementById('total-price').textContent = total.toFixed(2);
}

const confirmBtn = document.getElementById('confirm-btn');

// Khi click thì build dữ liệu order, gọi API tạo order, rồi gọi MoMo
confirmBtn.addEventListener('click', () => {

    // --- validate đã chọn khách hàng, match, section, quantity ---

    const customerId = document.getElementById('customer-input').value;
    if (!customerId) {
        showToast('Vui lòng nhập ID hoặc số điện thoại khách hàng.', 'danger');
        return;
    }
    if (selectedSections.length === 0) {
        showToast('Vui lòng chọn ít nhất một trận đấu và một khu vực.', 'danger');
        return;
    }

    for (const sel of selectedSections) {
        if (!sel.qty || sel.qty < 1) {
            showToast(`Vui lòng nhập số lượng (tối thiểu 1) cho khu vực đã chọn hoặc bỏ chọn khu vực.`, 'danger');
            return;
        }
    }

    const subtotal = parseFloat(document.getElementById('total-price').textContent);
    const paymentMethod = document.getElementById('payment-method').value;

    showToast('Đang tạo đơn hàng, vui lòng chờ...', 'info');

    // Gửi orderData theo API backend
    const orderData = {
        user: customerId,
        total_amount: subtotal,
        order_status: 'pending',
        order_method: 'offline',
        order_details: []
    };

    // Thêm chi tiết vé
    orderData.order_details = [];
    selectedSections.forEach(sel => {
        for (let i = 0; i < sel.qty; i++) {
            orderData.order_details.push({
                pricing: sel.section.pricing_id,
                price: sel.section.price,
                promotion: sel.promo,
                qr_code: null,
                seat_id: null
            });
        }
    });

    // Gọi API tạo order
    fetch(`${BASE_URL}/api/orders/create-order/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                showToast('Đặt hàng thành công!', 'success');
                const orderId = data.data.order_id;
                const totalAmount = Math.round(parseFloat(data.data.total_amount));

                if (paymentMethod === 'transfer') {
                    initiateMomoPayment(orderId, totalAmount)
                        .then(momoResp => {
                            if (momoResp.payUrl) {
                                localStorage.setItem('orderId', orderId);
                                window.location.href = momoResp.payUrl;
                            } else {
                                showToast('Lỗi khi tạo liên kết thanh toán MoMo.', 'danger');
                            }
                        })
                        .catch(err => {
                            console.error('MoMo API error:', err);
                            showToast('Không thể kết nối MoMo.', 'danger');
                        });
                } else {
                    // Xử lý tiền mặt hoặc thẻ
                    fetch(`${BASE_URL}/api/orders/cash-card-payment/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: orderId,
                            payment_method: paymentMethod  // 'cash' hoặc 'card'
                        })
                    })
                        .then(async res => {
                            const data = await res.json();
                            if (!res.ok) {
                                throw new Error(data.error || data.message || 'Thanh toán thất bại');
                            }
                            return data;
                        })
                        .then(data => {
                            showToast('Thanh toán thành công!', 'success');
                            localStorage.setItem('orderId', orderId);

                            console.log('orderId', orderId)
                            // Điều hướng sang trang QR/ticket, truyền order_id qua query
                            window.location.href = `${window.location.origin}/pages/admin/orders/qrcode.html`;
                        })
                        .catch(err => {
                            console.error('Cash/Card payment error:', err);
                            showToast(err.message, 'danger');
                        });
                    // chuyển hướng đến trang in chi tiết vé
                    // window.location.href = `${window.location.origin}/pages/admin/orders/qrcode.html`;
                }
            } else {
                showToast(data.message || 'Đặt hàng thất bại.', 'danger');
            }
        })
        .catch(err => {
            console.error('Order API error:', err);
            showToast('Có lỗi xảy ra, vui lòng thử lại.', 'danger');
        });
});

document.getElementById('home-btn').onclick = () => {
    const role = localStorage.getItem("role");
    if (role === "staff") {
        window.location.href = "/pages/staff/base.html#orders/orders";
    } else {
        window.location.href = "/pages/admin/base.html#orders/orders";
    }
};

