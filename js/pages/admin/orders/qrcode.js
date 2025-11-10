import CONFIG from '../../../utils/settings.js';
const BASE_URL = CONFIG.BASE_URL;

function formatDateTime(dt) {
    const d = new Date(dt);
    return d.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

async function loadOrder(orderId) {
    try {
        const res = await fetch(`${BASE_URL}/api/reports/orders/${orderId}/`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Lỗi tải đơn');

        // Đơn hàng
        document.getElementById('order-id').textContent = data.order_id;
        document.getElementById('user-name').textContent = data.user;
        document.getElementById('created-at').textContent = formatDateTime(data.created_at);
        document.getElementById('order-method').textContent = data.order_method_display;
        document.getElementById('order-status').textContent = data.order_status_display;
        document.getElementById('total-amount').textContent = Math.round(data.total_amount);

        // Trận đấu
        const m = data.match;
        document.getElementById('match-desc').textContent = m.description;
        document.getElementById('match-league').textContent = m.league;
        document.getElementById('match-stadium').textContent = m.stadium;
        document.getElementById('match-teams').textContent = `${m.team_1} vs ${m.team_2}`;
        document.getElementById('match-round').textContent = m.round;
        document.getElementById('match-time').textContent = formatDateTime(m.match_time);

        // Chi tiết vé
        const list = document.getElementById('ticket-list'); list.innerHTML = '';
        data.details.forEach(t => {
            const itm = document.createElement('div'); itm.className = 'ticket-item';
            itm.className = 'col-md-4 ticket-item card p-3 me-2';
            itm.innerHTML = `
                <div class="ticket-info" style="line-height: 1.6; gap: .75rem;">
                <div style="margin-bottom: .5rem;"><strong>ID:</strong> ${t.detail_id}</div>
                <div style="margin-bottom: .5rem;"><strong>Khu vực:</strong> ${t.section || 'Không xác định'}</div>
                <div style="margin-bottom: .5rem;"><strong>Ghế:</strong> ${t.seat || 'N/A'}</div>
                <div style="margin-bottom: .5rem;"><strong>Giá:</strong> ${Math.round(t.price)} VND</div>
                <div style="margin-bottom: .5rem;"><strong>Khuyến mãi:</strong> ${t.promotion || 'Không'}</div>
                <div><strong>Cập nhật:</strong> ${formatDateTime(t.updated_at)}</div>
                </div>
                <div class="ticket-qr">
                ${t.qr_code
                            ? `<img src="data:image/png;base64,${t.qr_code}" alt="QR Code">`
                            : '<i class="fas fa-ticket-alt fa-2x text-muted"></i>'}
                </div>`;

            list.appendChild(itm);
        });

    } catch (err) {
        console.error(err);
        // alert('Không thể tải thông tin đơn: ' + err.message);
    }
}

document.getElementById('home-btn').onclick = () => {
    const role = localStorage.getItem("role");
    if (role === "staff") {
        window.location.href = "/pages/staff/base.html#orders/orders";
    } else {
        window.location.href = "/pages/admin/base.html#orders/orders"; 
    }
};
document.getElementById('print-btn').onclick = () => window.print();

const orderId = localStorage.getItem('orderId') || 0;
if (orderId) loadOrder(orderId);