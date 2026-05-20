// 1. 지도 초기화
const container = document.getElementById('map');
const options = {
    center: new kakao.maps.LatLng(35.910519, 128.808062), // 초기 지도 중심점
    level: 3
};
const map = new kakao.maps.Map(container, options);
const infoWindow = new kakao.maps.InfoWindow({ zIndex: 1 });

// 2. 데이터 불러오기 및 검색 기능
let campusData = []; // 서버에서 불러온 전체 캠퍼스 건물 데이터를 저장
let markers = []; // 지도에 표시된 마커를 추적하기 위한 배열

fetch('http://localhost:3000/api/buildings')
    .then(res => res.json())
    .then(data => {
        campusData = data;
        // 초기 화면에서는 전체 건물을 지도에 표시하고 검색 결과 목록도 함께 보여줌
        renderMarkers(campusData, false);
        displaySearchResults(campusData);
    })
    .catch(err => {
        console.error("서버 연결 실패:", err);
        document.getElementById('search-results').innerHTML = '<li>데이터를 불러오지 못했습니다.</li>';
    });

// 3. 검색 필터링 로직
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

function getKeyword() {
    // 입력값 양쪽 공백 제거 후 소문자로 변환하여 검색 일관성을 유지
    return searchInput.value.trim().toLowerCase();
}

function searchBuildings() {
    const keyword = getKeyword();
    const filtered = filterBuildings(keyword);
    renderMarkers(filtered, true);
    displaySearchResults(filtered);
}

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchBuildings();
    }
});

searchButton.addEventListener('click', searchBuildings);

function filterBuildings(keyword) {
    if (!keyword) return campusData;

    // 복합 검색에서 숫자 앞의 0을 제거하여 더 유연한 검색이 가능하게 함
    const normalizedKeyword = keyword.replace(/([a-z])0+(\d+)/g, '$1$2');

    return campusData.filter(item => {
        const searchable = [
            item.id,
            item.abbr,
            item.name,
            item.name_en,
            ...(item.departments || []),
            ...(item.facilities || []),
            ...(item.keywords || [])
        ]
        .filter(Boolean) // null/undefined 값을 제거
        .join(' ')
        .toLowerCase();

        const normalizedSearchable = searchable.replace(/([a-z])0+(\d+)/g, '$1$2');
        return searchable.includes(keyword) || normalizedSearchable.includes(normalizedKeyword);
    });
}

function displaySearchResults(data) {
    const resultsEl = document.getElementById('search-results');
    resultsEl.innerHTML = '';

    if (!data.length) {
        resultsEl.innerHTML = '<li>검색 결과가 없습니다.</li>';
        return;
    }

    data.forEach(loc => {
        const item = document.createElement('li');
        item.className = 'search-item';
        item.innerHTML = `
            <div class="search-title">${loc.name} (${loc.abbr})</div>
            <div class="search-detail">${loc.departments?.join(', ') || '학과 정보 없음'}</div>
            <div class="search-detail">${loc.facilities?.join(', ') || '시설 정보 없음'}</div>
        `;
        item.addEventListener('click', () => {
            const position = new kakao.maps.LatLng(loc.center_coords.lat, loc.center_coords.lng);
            map.panTo(position);
            const marker = markers.find(m => m.getTitle() === loc.name);
            showInfoWindow(loc, position, marker);
        });
        resultsEl.appendChild(item);
    });
}

function clearMarkers() {
    // 기존에 표시된 마커를 모두 제거하고 초기 상태로 만든다
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function renderMarkers(data, fitBounds = true) {
    clearMarkers();

    if (!data.length) {
        return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    data.forEach(loc => {
        const position = new kakao.maps.LatLng(loc.center_coords.lat, loc.center_coords.lng);
        const marker = new kakao.maps.Marker({
            map: map,
            position: position,
            title: loc.name
        });

        kakao.maps.event.addListener(marker, 'click', () => {
            showInfoWindow(loc, position, marker);
        });

        markers.push(marker);
        bounds.extend(position);
    });

    if (fitBounds) {
        // 검색된 건물 위치에 맞춰 지도 영역을 자동으로 조정
        map.setBounds(bounds);
    }
}

function showInfoWindow(loc, position, marker) {
    const content = `
        <div style="padding:10px; font-size:14px;">
            <strong>${loc.name}</strong><br>
            ${loc.abbr}<br>
            ${loc.departments?.join(', ') || ''}
        </div>`;
    infoWindow.setContent(content);
    if (marker) {
        infoWindow.open(map, marker);
    } else {
        infoWindow.open(map, position);
    }
}
