// ==========================================
// 1. 지도 초기화 및 전역 변수 설정
// ==========================================
const container = document.getElementById('map');
const options = {
    center: new kakao.maps.LatLng(35.910519, 128.808062), // GPS 거부 시 초기 중심점
    level: 3
};
const map = new kakao.maps.Map(container, options);
const infoWindow = new kakao.maps.InfoWindow({ zIndex: 1 });

let campusData = []; // 서버에서 불러온 전체 건물 데이터
let markers = [];    // 건물 마커 배열

let activeMarker = null; // 현재 열려있는 마커 기억
let myLocMarker = null;  // 현재 위치 마커

// 🚀 [새로 추가] 사용자의 최신 위도, 경도 좌표를 실시간으로 저장해둘 변수
let currentUserLat = null;
let currentUserLng = null;


// ==========================================
// 2. 지도 여백 및 실시간 내 위치 파악 로직 (스위치 연동)
// ==========================================

// 지도 배경 클릭 시 정보창 닫기
kakao.maps.event.addListener(map, 'click', function() {
    infoWindow.close();
    activeMarker = null;
});

const toggleBtn = document.getElementById('use-myloc-start');

// 🚀 위치 마커를 지도에 찍는 공통 함수
function updateMyLocationMarker(lat, lng) {
    currentUserLat = lat;
    currentUserLng = lng;
    const locPosition = new kakao.maps.LatLng(lat, lng); 

    if (myLocMarker) {
        myLocMarker.setMap(null); // 기존 마커 지우기
    }

    myLocMarker = new kakao.maps.Marker({  
        map: map, 
        position: locPosition
    }); 
    
    infoWindow.setContent('<div style="padding:5px; font-size:13px; text-align:center;">📍 현재 내 위치</div>');
    infoWindow.open(map, myLocMarker);
    activeMarker = myLocMarker;

    map.setCenter(locPosition);
    map.setLevel(3);
}

// 🚀 사이트 접속 시 자동 GPS 위치 파악 함수
function displayMyLocationOnLoad() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // 권한 허용 시: 위치 업데이트 및 스위치를 ON으로 자동 변경
                updateMyLocationMarker(position.coords.latitude, position.coords.longitude);
                toggleBtn.checked = true; 
            }, 
            function(error) {
                // 권한 거부 시: 스위치를 OFF로 자동 변경
                console.log("위치 권한 거부 또는 GPS 에러: 기본 지도를 표출합니다.");
                toggleBtn.checked = false; 
            }
        );
    } else {
        console.log("이 브라우저에서는 GPS를 지원하지 않습니다.");
        toggleBtn.checked = false;
    }
}

// 🚀 스위치를 수동으로 클릭했을 때 이벤트
toggleBtn.addEventListener('change', (e) => {
    if (e.target.checked) {
        // 스위치를 ON으로 켰을 때 위치 권한 재요청
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    // 권한 재허용 성공!
                    updateMyLocationMarker(position.coords.latitude, position.coords.longitude);
                },
                function(error) {
                    // 또다시 거부하거나 브라우저에서 차단한 경우
                    alert("위치 권한이 거부되어 있습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 눌러 위치 권한을 '허용'으로 변경해주세요.");
                    e.target.checked = false; // 다시 OFF로 되돌림
                }
            );
        } else {
            alert("GPS를 지원하지 않는 브라우저입니다.");
            e.target.checked = false;
        }
    } else {
        // 사용자가 스위치를 OFF로 껐을 때의 동작 (원한다면 내 위치 마커를 지우는 등의 처리 가능)
        currentUserLat = null;
        currentUserLng = null;
    }
});

// 페이지 로드 시 최초 1회 실행
displayMyLocationOnLoad();


// ==========================================
// 3. 서버 데이터 호출 및 4. 검색 필터링 (최종 최적화본)
// ==========================================
fetch('https://capstone-campus-api.onrender.com/api/buildings')
    .then(res => res.json())
    .then(data => {
        campusData = data;
        renderMarkers(campusData, false);
        displaySearchResults(campusData);
    })
    .catch(err => console.error("서버 연결 실패:", err));

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

function getKeyword() { return searchInput.value.trim().toLowerCase(); }

function searchBuildings() {
    const keyword = getKeyword();
    const filtered = campusData.filter(loc => {
        // 정규화된 DB 구조(building_code, name, name_en)에 맞춰 검색 필터 최적화
        return (loc.name && loc.name.toLowerCase().includes(keyword)) ||
               (loc.building_code && loc.building_code.toLowerCase().includes(keyword)) ||
               (loc.name_en && loc.name_en.toLowerCase().includes(keyword));
    });
    renderMarkers(filtered, true);
    displaySearchResults(filtered);
}

searchButton.addEventListener('click', searchBuildings);
searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchBuildings(); });

function displaySearchResults(data) {
    const resultsEl = document.getElementById('search-results');
    resultsEl.innerHTML = '';
    if (!data.length) {
        resultsEl.innerHTML = '<li class="no-result">검색 결과가 없습니다.</li>';
        return;
    }
    data.forEach(loc => {
        const item = document.createElement('li');
        item.className = 'search-item';
        // loc.abbr 대신 정규화된 loc.building_code 사용
        item.innerHTML = `
            <div class="building-name">${loc.name} (${loc.building_code || ''})</div>
            <div class="building-info">${loc.name_en || ''}</div>
        `;
        item.addEventListener('click', () => {
            // 🚨 핵심 수정: loc.center_coords.lat -> loc.lat으로 다이렉트 접근
            const position = new kakao.maps.LatLng(loc.lat, loc.lng);
            map.panTo(position);
            const marker = markers.find(m => m.getTitle() === loc.name);
            showInfoWindow(loc, position, marker);
            activeMarker = marker; 
        });
        resultsEl.appendChild(item);
    });
}

function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }

function renderMarkers(data, fitBounds = true) {
    clearMarkers();
    if (!data.length) return;
    const bounds = new kakao.maps.LatLngBounds();

    data.forEach(loc => {
        // 🚨 핵심 수정: loc.center_coords.lat -> loc.lat으로 다이렉트 접근
        const position = new kakao.maps.LatLng(loc.lat, loc.lng);
        const marker = new kakao.maps.Marker({ map: map, position: position, title: loc.name });

        kakao.maps.event.addListener(marker, 'click', () => {
            if (activeMarker === marker) {
                infoWindow.close();
                activeMarker = null;
            } else {
                showInfoWindow(loc, position, marker);
                activeMarker = marker;
            }
        });
        markers.push(marker);
        bounds.extend(position);
    });
    if (fitBounds) map.setBounds(bounds);
}

// ==========================================
// 🚀 5. 마커 정보창 및 실시간 길찾기 로직 개조
// ==========================================
function showInfoWindow(loc, position, marker) {
    // 💡 정규식을 사용해 이름 안의 쉼표(,)를 모두 띄어쓰기로 치환한 뒤 인코딩합니다.
    const safeName = loc.name.replace(/,/g, ' ');
    const destName = encodeURIComponent(safeName);
    const destLat = loc.lat ?? loc.center_coords?.lat;
    const destLng = loc.lng ?? loc.center_coords?.lng;

    // 🚀 [핵심 추가] 토글 버튼의 체크 여부 확인
    const isToggleOn = document.getElementById('use-myloc-start').checked;
    let routeUrl = "";

    // 🚀 버튼이 ON이고 현재 위치 정보(GPS)가 성공적으로 수집되었을 때
    if (isToggleOn && currentUserLat && currentUserLng) {
        const startName = encodeURIComponent("내 위치");
        // 출발지 정보까지 포함한 카카오맵 복합 길찾기 URL 생성
        routeUrl = `https://map.kakao.com/link/to/${destName},${destLat},${destLng}/from/${startName},${currentUserLat},${currentUserLng}`;
    } else {
        // 버튼이 OFF이거나 내 위치 정보가 없을 때는 도착지만 지정하는 기본 URL 사용
        routeUrl = `https://map.kakao.com/link/to/${destName},${destLat},${destLng}`;
    }

    const deptInfo = loc.departments && loc.departments.length > 0 
        ? `<div style="margin: 8px 0; color:#555; font-size:12px;">📚 ${loc.departments.join(', ')}</div>` 
        : '';

    const content = `
        <div style="padding:15px; font-size:14px; min-width:220px; border-radius: 8px; font-family: sans-serif;">
            <strong style="font-size:16px; color:#333;">${loc.name}</strong> 
            <span style="color:#888; font-size:12px;">(${loc.abbr})</span>
            ${deptInfo}
            
            <a href="${routeUrl}" target="_blank" style="
                display:block; 
                margin-top:10px; 
                padding:8px; 
                background-color:#FEE500; 
                color:#000; 
                text-decoration:none; 
                text-align:center; 
                border-radius:6px; 
                font-weight:bold;
                font-size:13px;">
                🚗 카카오맵 길찾기
            </a>
        </div>
    `;
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
}