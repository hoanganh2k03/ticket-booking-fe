import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

let allMatches = [];
let allTeams = [];
let allLeagues = [];
let allStadiums = [];
let currentSelectedLeague = "";
// Hàm hiển thị danh sách trận đấu
function displayMatches(matches) {
  const matchCardsContainer = document.getElementById('match-cards');
  matchCardsContainer.innerHTML = '';

  if (matches.length > 0) {
    matches.forEach(match => {
      const card = document.createElement('div');
      card.classList.add('event-card');

      const team1Logo = match.team_1.logo ? match.team_1.logo : 'https://via.placeholder.com/50';
      const team2Logo = match.team_2.logo ? match.team_2.logo : 'https://via.placeholder.com/50';

      // 1. Xử lý Badge HOT (Góc Trái)
      const hotBadge = match.is_hot_match 
        ? `<div class="hot-badge"><i class="fas fa-fire"></i> Hot</div>` 
        : '';

      // 2. Xử lý Badge SALE (Góc Phải) - MỚI THÊM
      // API trả về số (vd: 30.00), ta dùng parseFloat để bỏ số 0 thừa (thành 30)
      let saleBadge = '';
      if (match.discount_percent && match.discount_percent > 0) {
         saleBadge = `<div class="sale-badge"><i class="fas fa-bolt"></i> Siêu Sale ${parseFloat(match.discount_percent)}%</div>`;
      }

      card.innerHTML = `
        ${hotBadge}   ${saleBadge}  <div class="logos">
          <img src="${team1Logo}" alt="${match.team_1.team_name} Logo" class="team-logo">
          <span class="vs">VS</span>
          <img src="${team2Logo}" alt="${match.team_2.team_name} Logo" class="team-logo">
        </div>
        <div class="event-info">
          <h3>${match.team_1.team_name} vs ${match.team_2.team_name}</h3>
          <div class="info-row">
            <div class="left">
              <p>🏆 <strong>Giải ${match.league.league_name}</strong></p>
              <p>🔄 <strong>Vòng ${match.round}</strong></p>
            </div>
            <div class="right">
              <p>📅 <strong>${new Date(match.match_time).toLocaleString('vi-VN')}</strong></p>
              <p>🏟️ <strong>${match.stadium.stadium_name}</strong></p>
            </div>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        localStorage.setItem('selectedMatch', match.match_id);
        window.location.href = 'match_detail.html';
      });

      matchCardsContainer.appendChild(card);
    });
  } else {
    matchCardsContainer.innerHTML = '<p>Không tìm thấy trận đấu phù hợp.</p>';
  }
}

function loadMatches() {
  fetch(`${BASE_URL}/api/orders/matches/`)
    .then(response => response.json())
    .then(data => {
      let rawMatches = data.results || data; 

      // 1. Sắp xếp dữ liệu gốc
      allMatches = defaultSortMatches(rawMatches);
      
      // 2. Logic Recommend mới: Lọc từ allMatches (Không gọi API riêng)
      handleLocalRecommendations(allMatches);

      // --- Các logic xử lý League/Filter giữ nguyên của bạn ---
      const leagueMap = new Map();
      allMatches.forEach(match => {
          if (!leagueMap.has(match.league.league_name)) {
              leagueMap.set(match.league.league_name, {
                  name: match.league.league_name,
                  sport: match.league.sport_name || 'Thể thao',
                  start: match.league.start_date,
                  end: match.league.end_date
              });
          }
      });
      const uniqueLeagues = Array.from(leagueMap.values());
      allLeagues = uniqueLeagues.map(l => l.name);

      renderLeagueQuickFilter(uniqueLeagues);
      renderLeagueDropdown(allLeagues); 
      
      displayMatches(allMatches);
      setupCarouselNavigation();
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}

// --- THÊM MỚI: Hàm render danh sách giải đấu dạng Card ---
function renderLeagueQuickFilter(leagues) {
    const container = document.getElementById('league-quick-filter');
    if (!container) return; // Nếu chưa thêm HTML thì bỏ qua
    
    container.innerHTML = '';

    // Thêm nút "Tất cả" đầu tiên
    const allBtn = document.createElement('div');
    
    allBtn.addEventListener('click', () => handleLeagueClick('', allBtn));
    container.appendChild(allBtn);

    // Thêm các giải đấu
    leagues.forEach(league => {
        const card = document.createElement('div');
        card.classList.add('league-card');
        card.setAttribute('data-league', league.name);
        
        card.innerHTML = `
            <div class="league-header">
                <span class="sport-tag">${league.sport}</span>
                
            </div>
            
            <div class="card-content">
                <h4 class="league-name" title="${league.name}">${league.name}</h4>
                
                <div class="league-time">
                    <p>📅 TỪ ${formatDateVN(league.start)}</p>
                    <p> ĐẾN ➝ ${formatDateVN(league.end)}</p>
                </div>

                <button class="find-btn">Tìm sự kiện</button>
            </div>
        `;
        
        card.addEventListener('click', () => handleLeagueClick(league.name, card));
        container.appendChild(card);
    });
}
function formatDateVN(dateString) {
    if (!dateString) return '...';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}
// --- THÊM MỚI: Hàm xử lý khi click vào Card giải đấu ---
function handleLeagueClick(leagueName, cardElement) {
    // 1. Xử lý UI: Đổi class active
    const allCards = document.querySelectorAll('.league-quick-filter .league-card'); // Lưu ý selector phải đúng
    // Cách an toàn hơn: tìm trong container
    const container = document.getElementById('league-quick-filter');
    Array.from(container.children).forEach(c => c.classList.remove('active'));
    
    cardElement.classList.add('active');

    // 2. Cập nhật giá trị vào biến hoặc thẻ select ẩn (để đồng bộ logic)
    currentSelectedLeague = leagueName;
    
    // Đồng bộ với thẻ select cũ (nếu bạn vẫn muốn giữ form filter cũ hoạt động cùng)
    const oldSelect = document.getElementById('filter-league');
    if(oldSelect) oldSelect.value = leagueName;

    // 3. Gọi hàm applyFilter để lọc dữ liệu
    applyFilter();
}
function renderLeagueDropdown(leagueNames) {
    const leagueSelect = document.getElementById('filter-league');
    if (!leagueSelect) return;
    leagueSelect.innerHTML = '<option value="">All Leagues</option>';
    leagueNames.forEach(league => {
        const option = document.createElement('option');
        option.value = league;
        option.textContent = league;
        leagueSelect.appendChild(option);
    });
}
// Hàm lọc dữ liệu dựa trên từ khóa tìm kiếm
function filterMatches(query) {
  query = query.toLowerCase().trim();
  const filteredMatches = allMatches.filter(match => {
    return (
      match.team_1.team_name.toLowerCase().includes(query) ||
      match.team_2.team_name.toLowerCase().includes(query) ||
      match.description.toLowerCase().includes(query) ||
      match.stadium.stadium_name.toLowerCase().includes(query) ||
      match.league.league_name.toLowerCase().includes(query) ||
      match.round.toLowerCase().includes(query)
    );
  });
  displayMatches(filteredMatches);
}

function applyFilter() {
  const dateFilter = document.getElementById('filter-date').value;
  const teamFilter = document.getElementById('filter-team').value.toLowerCase().trim();
  // const leagueFilter = document.getElementById('filter-league').value;
  const leagueFilter = document.getElementById('filter-league').value || currentSelectedLeague;
  const stadiumFilter = document.getElementById('filter-stadium').value;
  const timeSortFilter = document.getElementById('filter-time-sort').value;
  
  let filteredMatches = allMatches.filter(match => {
    const matchDate = new Date(match.match_time).toISOString().split('T')[0];
    const teamMatch = teamFilter ? (
      match.team_1.team_name.toLowerCase().includes(teamFilter) ||
      match.team_2.team_name.toLowerCase().includes(teamFilter)
    ) : true;
    const dateMatch = dateFilter ? matchDate === dateFilter : true;
    // const leagueMatch = leagueFilter ? match.league.league_name === leagueFilter : true;
    const leagueMatch = leagueFilter ? match.league.league_name === leagueFilter : true;
    const stadiumMatch = stadiumFilter ? match.stadium.stadium_name === stadiumFilter : true;

    return teamMatch && dateMatch && leagueMatch && stadiumMatch;
  });
  displayMatches(filteredMatches);
  toggleFilterForm();
  // Sort by time if a sort option is selected
  if (timeSortFilter === 'asc') {
    filteredMatches.sort((a, b) => new Date(a.match_time) - new Date(b.match_time));
  } else if (timeSortFilter === 'desc') {
    filteredMatches.sort((a, b) => new Date(b.match_time) - new Date(a.match_time));
  }

  displayMatches(filteredMatches);
  toggleFilterForm();
}

// Hàm xóa bộ lọc
function clearFilter() {
  document.getElementById('filter-date').value = '';
  document.getElementById('filter-team').value = '';
  document.getElementById('filter-league').value = '';
  document.getElementById('filter-stadium').value = '';
  document.getElementById('filter-time-sort').value = '';
  
  // Sắp xếp lại danh sách gốc trước khi hiển thị
  const sortedMatches = defaultSortMatches([...allMatches]);
  displayMatches(sortedMatches);
  
  toggleFilterForm();
}

// Hàm hiển thị/ẩn form lọc
function toggleFilterForm() {
  const filterForm = document.getElementById('filter-form');
  filterForm.classList.toggle('active');
}

// Lắng nghe sự kiện nhập vào thanh search
document.getElementById('search-input').addEventListener('input', (event) => {
  const query = event.target.value;
  filterMatches(query);
});

// Lắng nghe sự kiện click nút filter
document.getElementById('filter-btn').addEventListener('click', toggleFilterForm);

// Lắng nghe sự kiện click nút apply filter
document.getElementById('apply-filter').addEventListener('click', applyFilter);

// Lắng nghe sự kiện click nút clear filter
document.getElementById('clear-filter').addEventListener('click', clearFilter);



// Hàm sắp xếp mặc định: Ưu tiên HOT -> Thời gian gần nhất -> Importance
function defaultSortMatches(matches) {
  return matches.sort((a, b) => {
    // 1. Ưu tiên trận đấu HOT (is_hot_match = true lên đầu)
    if (a.is_hot_match && !b.is_hot_match) return -1;
    if (!a.is_hot_match && b.is_hot_match) return 1;

    // 2. Nếu cùng độ HOT, sắp xếp theo thời gian (Gần nhất lên đầu)
    const timeA = new Date(a.match_time);
    const timeB = new Date(b.match_time);
    if (timeA - timeB !== 0) return timeA - timeB;

    // 3. (Tùy chọn) Nếu cùng thời gian, ưu tiên Importance cao hơn
    return b.importance - a.importance;
  });
}
allMatches = defaultSortMatches(allMatches);

// --- THÊM LOGIC CUỘN CAROUSEL ---

function setupCarouselNavigation() {
    const container = document.getElementById('league-quick-filter');
    const leftBtn = document.getElementById('scroll-left');
    const rightBtn = document.getElementById('scroll-right');

    if (!container || !leftBtn || !rightBtn) return;

    // Khoảng cách cuộn mỗi lần nhấn (200px hoặc bằng chiều rộng card)
    const SCROLL_AMOUNT = 300; 

    leftBtn.addEventListener('click', () => {
        container.scrollBy({
            left: -SCROLL_AMOUNT,
            behavior: 'smooth'
        });
    });

    rightBtn.addEventListener('click', () => {
        container.scrollBy({
            left: SCROLL_AMOUNT,
            behavior: 'smooth'
        });
    });

    // (Tùy chọn) Ẩn hiện nút dựa trên vị trí cuộn
    // Gọi hàm này mỗi khi cuộn để kiểm tra
    container.addEventListener('scroll', () => checkScrollButtons(container, leftBtn, rightBtn));
    
    // Kiểm tra lần đầu tiên
    checkScrollButtons(container, leftBtn, rightBtn);
}

// Hàm ẩn hiện nút khi cuộn đến đầu hoặc cuối
function checkScrollButtons(container, leftBtn, rightBtn) {
    // Ẩn nút trái nếu đang ở đầu
    if (container.scrollLeft <= 0) {
        leftBtn.style.display = 'none';
    } else {
        leftBtn.style.display = 'flex';
    }

    // Ẩn nút phải nếu đã cuộn hết
    // (scrollLeft + clientWidth) xấp xỉ scrollWidth
    if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 1) {
        rightBtn.style.display = 'none';
    } else {
        rightBtn.style.display = 'flex';
    }
}


// recommend
function handleLocalRecommendations(matches) {
    const recommendSection = document.getElementById('recommendation-section');
    const recommendContainer = document.getElementById('recommend-cards');
    const recommendTitle = document.getElementById('recommend-title');

    if (!recommendSection || !recommendContainer) return;

    // Lọc: Trận đấu là HOT HOẶC có Discount > 0
    const recommendedMatches = matches.filter(match => {
        const hasDiscount = match.discount_percent && parseFloat(match.discount_percent) > 0;
        return match.is_hot_match || hasDiscount;
    });

    // Nếu có trận thỏa mãn thì hiện section, không thì ẩn
    if (recommendedMatches.length > 0) {
        recommendSection.style.display = 'block';
        
        // Cập nhật tiêu đề đẹp hơn
        if (recommendTitle) {
            recommendTitle.innerHTML = '<i class="fas fa-fire"></i> Trận cầu tâm điểm & Ưu đãi hấp dẫn';
        }

        // Chỉ lấy tối đa 4 trận để khu vực này không quá dài
        const topRecommended = recommendedMatches.slice(0, 4);
        
        // Sử dụng lại hàm hiển thị (viết riêng cho Recommend nhưng style giống hệt)
        renderRecommendedCards(topRecommended);
    } else {
        recommendSection.style.display = 'none';
    }
}

function renderRecommendedCards(matches) {
    const container = document.getElementById('recommend-cards');
    container.innerHTML = '';

    matches.forEach(match => {
        const card = document.createElement('div');
        card.classList.add('event-card');

        // Logic Badge giống hệt displayMatches của bạn
        const hotBadge = match.is_hot_match 
            ? `<div class="hot-badge"><i class="fas fa-fire"></i> Hot</div>` 
            : '';
        let saleBadge = '';
        if (match.discount_percent && match.discount_percent > 0) {
            saleBadge = `<div class="sale-badge"><i class="fas fa-bolt"></i> Siêu Sale ${parseFloat(match.discount_percent)}%</div>`;
        }

        card.innerHTML = `
            ${hotBadge} ${saleBadge}
            <div class="logos">
                <img src="${match.team_1.logo || 'https://via.placeholder.com/50'}" class="team-logo">
                <span class="vs">VS</span>
                <img src="${match.team_2.logo || 'https://via.placeholder.com/50'}" class="team-logo">
            </div>
            <div class="event-info">
                <h3>${match.team_1.team_name} vs ${match.team_2.team_name}</h3>
                <div class="info-row">
                    <div class="left">
                        <p>🏆 <strong>${match.league.league_name}</strong></p>
                        <p>🔄 <strong>Vòng ${match.round}</strong></p>
                    </div>
                    <div class="right">
                        <p>📅 <strong>${new Date(match.match_time).toLocaleString('vi-VN')}</strong></p>
                        <p>🏟️ <strong>${match.stadium.stadium_name}</strong></p>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            localStorage.setItem('selectedMatch', match.match_id);
            window.location.href = 'match_detail.html';
        });

        container.appendChild(card);
    });
}
// Tìm đến cuối file của bạn và sửa lại dòng này:
window.onload = function() {
    loadMatches();            // Tải toàn bộ trận đấu (như cũ)
};