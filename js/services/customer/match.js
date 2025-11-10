import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

let allMatches = [];
let allTeams = [];
let allLeagues = [];
let allStadiums = [];

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
      const matchDate = new Date(match.match_time).toLocaleDateString();
      const matchTime = new Date(match.match_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      card.innerHTML = `
        <div class="logos">
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
              <p>📅 <strong>${new Date(match.match_time).toLocaleString()}</strong></p>
              <p>🏟️ <strong>Sân vận động ${match.stadium.stadium_name}</strong></p>
            </div>
          </div>
          <div style="display: none" class="description">
            <p>${match.description}</p>
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

// Hàm gọi API và lưu trữ dữ liệu
function loadMatches() {
  fetch(`${BASE_URL}/api/orders/matches/`)
    .then(response => response.json())
    .then(data => {
      allMatches = data.results;

      const teams = [
        ...new Set(
          allMatches.flatMap(match => [match.team_1.team_name, match.team_2.team_name])
        )
      ];
      allTeams = teams;

      const leagues = [
        ...new Set(
          allMatches.map(match => match.league.league_name)
        )
      ];
      allLeagues = leagues;

      const stadiums = [
        ...new Set(
          allMatches.map(match => match.stadium.stadium_name)
        )
      ];
      allStadiums = stadiums;

      const teamSelect = document.getElementById('filter-team');
      const leagueSelect = document.getElementById('filter-league');
      const stadiumSelect = document.getElementById('filter-stadium');

      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
      });

      leagues.forEach(league => {
        const option = document.createElement('option');
        option.value = league;
        option.textContent = league;
        leagueSelect.appendChild(option);
      });

      stadiums.forEach(stadium => {
        const option = document.createElement('option');
        option.value = stadium;
        option.textContent = stadium;
        stadiumSelect.appendChild(option);
      });

      displayMatches(allMatches);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      const matchCardsContainer = document.getElementById('match-cards');
      matchCardsContainer.innerHTML = '<p>Tải thông tin trận đấu không thành công.</p>';
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
  const leagueFilter = document.getElementById('filter-league').value;
  const stadiumFilter = document.getElementById('filter-stadium').value;
  const timeSortFilter = document.getElementById('filter-time-sort').value;

  let filteredMatches = allMatches.filter(match => {
    const matchDate = new Date(match.match_time).toISOString().split('T')[0];
    const teamMatch = teamFilter ? (
      match.team_1.team_name.toLowerCase().includes(teamFilter) ||
      match.team_2.team_name.toLowerCase().includes(teamFilter)
    ) : true;
    const dateMatch = dateFilter ? matchDate === dateFilter : true;
    const leagueMatch = leagueFilter ? match.league.league_name === leagueFilter : true;
    const stadiumMatch = stadiumFilter ? match.stadium.stadium_name === stadiumFilter : true;

    return teamMatch && dateMatch && leagueMatch && stadiumMatch;
  });

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
  displayMatches(allMatches);
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

// Gọi hàm khi trang tải xong
window.onload = loadMatches;