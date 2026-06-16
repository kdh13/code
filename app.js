// ==========================================
// 1. 지도 초기화 및 전역 변수 설정
// ==========================================
const container = document.getElementById('map'); // index.html의 <div id="map"> 요소를 참조하여 지도 영역 연결
const options = {
    center: new kakao.maps.LatLng(35.910519, 128.808062), // 대가대 캠퍼스 중심 좌표 지정
    level: 3 // 지도 확대 레벨 설정
};
const map = new kakao.maps.Map(container, options); // 카카오맵 SDK의 Map 생성자 사용
const infoWindow = new kakao.maps.InfoWindow({ zIndex: 1 }); // 마커 클릭 시 표시할 정보창 객체 생성

let campusData = []; // 서버에서 받아올 전체 건물 데이터 배열, 검색/마커 렌더링에 사용
let markers = [];    // 지도 위 마커들을 저장할 배열, 나중에 제거하거나 활성화 상태를 비교할 때 사용

let activeMarker = null; // 현재 클릭된 마커를 기억하는 변수, 같은 마커를 다시 클릭하면 정보창을 닫기 위해 사용
let myLocMarker = null;  // 현재 위치 마커 객체 저장, 위치가 변경되면 이전 마커를 제거하기 위해 사용

let currentUserLat = null; // 사용자의 위도 값 저장, 카카오맵 길찾기 링크 생성에 사용
let currentUserLng = null; // 사용자의 경도 값 저장, 카카오맵 길찾기 링크 생성에 사용

// 지도 배경을 클릭하면 열려 있는 정보창을 닫음
kakao.maps.event.addListener(map, 'click', function() {
    infoWindow.close(); // 활성 정보창 닫기
    activeMarker = null; // 활성 마커 상태 초기화
});

const toggleBtn = document.getElementById('use-myloc-start'); // index.html의 현재 위치 토글 체크박스 요소를 참조

function updateMyLocationMarker(lat, lng) {
    currentUserLat = lat; // 전역 위도 업데이트
    currentUserLng = lng; // 전역 경도 업데이트
    const locPosition = new kakao.maps.LatLng(lat, lng); // 카카오 LatLng 객체 생성

    if (myLocMarker) {
        myLocMarker.setMap(null); // 기존 위치 마커가 있으면 제거
    }

    // =======================
    // 네온 블루 GPS 마커 (SVG)
    // =======================
    const imageSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="rgba(0, 123, 255, 0.25)"/>
            <circle cx="18" cy="18" r="9" fill="rgb(0, 90, 200)" stroke="rgb(255, 255, 255)" stroke-width="2.5"/>
            <circle cx="18" cy="18" r="3.5" fill="rgb(255, 255, 255)"/>
        </svg>
    `); // SVG를 Data URI로 변환하여 마커 이미지로 사용
    const imageSize = new kakao.maps.Size(36, 36); // 마커 이미지 크기 설정
    const imageOption = { offset: new kakao.maps.Point(18, 18) }; // 마커 중심점 설정
    
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption); // 커스텀 마커 이미지 객체 생성

    myLocMarker = new kakao.maps.Marker({  
        map: map, // 지도를 표시할 대상
        position: locPosition, // 현재 위치 좌표
        image: markerImage // 커스텀 마커 이미지
    });
    
    infoWindow.setContent('<div style="padding:5px; font-size:13px; text-align:center;">📍 현재 내 위치</div>'); // 현재 위치 정보창 내용
    infoWindow.open(map, myLocMarker); // 현재 위치 마커 위에 정보창 표시
    activeMarker = myLocMarker; // 현재 위치 마커를 활성 마커로 설정

    map.setCenter(locPosition); // 지도를 현재 위치로 이동
    map.setLevel(3); // 확대 레벨을 3으로 설정
}

function displayMyLocationOnLoad() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                updateMyLocationMarker(position.coords.latitude, position.coords.longitude); // 위치가 허용되면 마커 표시
                toggleBtn.checked = true; // 토글 버튼 상태도 활성화
            }, 
            function(error) {
                console.log("위치 권한 거부: 기본 지도를 표출합니다."); // 위치 권한 거부 시 로그 출력
                toggleBtn.checked = false; // 토글 버튼 비활성화
            }
        );
    } else {
        toggleBtn.checked = false; // 브라우저가 위치 API를 지원하지 않으면 토글 비활성화
    }
}

toggleBtn.addEventListener('change', (e) => {
    if (e.target.checked) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    updateMyLocationMarker(position.coords.latitude, position.coords.longitude); // 토글 켜면 현재 위치 업데이트
                },
                function(error) {
                    alert("위치 권한을 허용해주세요."); // 위치 권한 없을 때 사용자 경고
                    e.target.checked = false; // 토글을 다시 끔
                }
            );
        } else {
            e.target.checked = false; // 위치 API 미지원 시 토글 되돌리기
        }
    } else {
        currentUserLat = null; // 토글 끌 때 사용 위치 정보 초기화
        currentUserLng = null; // 토글 끌 때 사용 위치 정보 초기화
    }
});

displayMyLocationOnLoad(); // 페이지 로드 시 자동으로 현재 위치 표시 시도


// ==========================================
// 2. 서버 데이터 호출 및 검색 필터링 (완벽 방어 코드)
// ==========================================
fetch('https://capstone-campus-api.onrender.com/api/buildings') // 외부 API에서 건물 데이터 JSON을 요청
    .then(res => res.json()) // API 응답을 JSON으로 파싱하여 자바스크립트 객체로 변환
    .then(data => {
        campusData = data; // 응답 데이터를 전역 변수에 저장하여 검색과 마커 생성에 사용
        renderMarkers(campusData, true); // 서버에서 가져온 전체 건물 데이터를 기반으로 지도에 마커 표시
        displaySearchResults(campusData); // 좌측 검색 결과 리스트에도 전체 건물 목록 표시
    })
    .catch(err => console.error("서버 연결 실패:", err)); // API 호출 오류나 네트워크 실패 시 콘솔에 에러 출력

const searchInput = document.getElementById('search-input'); // 검색 입력 필드 참조
const searchButton = document.getElementById('search-button'); // 검색 버튼 참조

function getKeyword() { return searchInput.value.trim().toLowerCase(); } // 검색어를 소문자로 정리

function searchBuildings() {
    const keyword = getKeyword(); // 사용자 입력 키워드 추출
    if (keyword === "") {
        renderMarkers(campusData, false); // 빈 검색어면 전체 마커를 다시 그림
        displaySearchResults(campusData); // 전체 건물 리스트를 표시
        const campusCenter = new kakao.maps.LatLng(35.910519, 128.808062); // 캠퍼스 중심 좌표
        map.setCenter(campusCenter); // 지도 중심 고정
        map.setLevel(3); // 적절한 확대 레벨 유지
        return; // 함수 종료
    }
    const filtered = campusData.filter(loc => {
        const nameMatch = loc.name && loc.name.toLowerCase().includes(keyword); // 건물명 검색
        const codeMatch = loc.building_code && loc.building_code.toLowerCase().includes(keyword); // 건물 코드 검색
        const abbrMatch = loc.abbr && loc.abbr.toLowerCase().includes(keyword); // 약어 검색
        const enMatch = loc.name_en && loc.name_en.toLowerCase().includes(keyword); // 영어명 검색
        const deptMatch = loc.departments && loc.departments.some(d => {
            const deptName = typeof d === 'object' ? d.name : d; // 학과 정보의 문자열/객체 분기
            return deptName && deptName.toLowerCase().includes(keyword); // 학과 이름 검색
        });
        const facilityMatch = loc.facilities && loc.facilities.some(f => {
            const facName = typeof f === 'object' ? f.name : f; // 편의시설 문자열/객체 분기
            return facName && facName.toLowerCase().includes(keyword); // 시설 이름 검색
        });
        return nameMatch || codeMatch || abbrMatch || enMatch || deptMatch || facilityMatch; // 어느 하나라도 일치하면 포함
    });
    const shouldFit = filtered.length > 0 && filtered.length <= 5; // 5개 이하 결과만 자동으로 바운즈 맞춤
    renderMarkers(filtered, shouldFit); // 필터된 건물 마커 표시
    displaySearchResults(filtered); // 검색 결과 리스트 표시
}

searchButton.addEventListener('click', searchBuildings); // 버튼 클릭으로 검색 실행
searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchBuildings(); }); // 엔터 입력으로 검색 실행

function displaySearchResults(data) {
    const resultsEl = document.getElementById('search-results'); // index.html의 검색 결과 <ul> 요소 참조
    resultsEl.innerHTML = ''; // 이전 검색 결과 목록을 초기화
    if (!data.length) {
        resultsEl.innerHTML = '<li class="no-result">검색 결과가 없습니다.</li>'; // 필터링 결과가 없으면 안내 텍스트 표시
        return; // 결과가 없으면 더 이상 처리하지 않음
    }
    data.forEach(loc => {
        if (!loc.center_coords) return; // 위치 정보가 없는 데이터는 화면에 표시하지 않음

        const item = document.createElement('li'); // 검색 결과 항목 li 생성
        item.className = 'search-item'; // CSS 스타일 클래스 지정
        item.innerHTML = `
            <div class="building-name">${loc.name} (${loc.building_code || loc.abbr || ''})</div>
            <div class="building-info">${loc.name_en || ''}</div>
        `; // 건물 이름과 영어 이름을 표시
        item.addEventListener('click', () => {
            const originalLng = Number(loc.center_coords.lng); // API에서 받은 문자열 경도를 숫자로 변환
            const correctedPosition = new kakao.maps.LatLng(loc.center_coords.lat, originalLng); // 클릭 시 지도의 중심 좌표 생성
            map.setCenter(correctedPosition); // 지도를 이 좌표로 이동
            map.setLevel(2); // 클릭한 결과를 크게 보기 위해 확대 레벨 조정
            const originalPosition = new kakao.maps.LatLng(loc.center_coords.lat, loc.center_coords.lng); // 정확한 마커 위치 생성
            const marker = markers.find(m => m.getTitle() === loc.name); // 기존에 생성된 마커 중 동일 이름 마커를 찾음
            showInfoWindow(loc, originalPosition, marker); // 정보창 내용을 채워서 표시
            activeMarker = marker; // 현재 활성화된 마커를 기억
        });
        resultsEl.appendChild(item); // 검색 결과 목록에 항목 추가
    });
}

function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; } // 기존 마커 모두 삭제

function renderMarkers(data, fitBounds = true) {
    clearMarkers(); // 이전 마커 제거
    if (!data.length) return; // 데이터 없으면 종료
    const bounds = new kakao.maps.LatLngBounds(); // 지도 바운즈 객체 생성

    data.forEach(loc => {
        if (!loc.center_coords) return; // 유효하지 않은 좌표 무시

        const position = new kakao.maps.LatLng(loc.center_coords.lat, loc.center_coords.lng); // 마커 위치 생성
        const marker = new kakao.maps.Marker({ map: map, position: position, title: loc.name }); // 마커 생성

        kakao.maps.event.addListener(marker, 'click', () => {
            if (activeMarker === marker) {
                infoWindow.close(); // 같은 마커를 다시 클릭하면 정보창 닫기
                activeMarker = null; // 활성 마커 해제
            } else {
                const originalLng = Number(loc.center_coords.lng); // 클릭 위치의 경도
                const correctedLng = originalLng - 0.0012; // 잠시 화면 위치 보정
                const correctedPosition = new kakao.maps.LatLng(loc.center_coords.lat, correctedLng); // 보정된 위치
                map.panTo(correctedPosition); // 지도 부드럽게 이동
                map.setLevel(2); // 더 확대된 상태로 설정
                showInfoWindow(loc, position, marker); // 정보창 표시
                activeMarker = marker; // 활성 마커 저장
            }
        });
        markers.push(marker); // 마커 목록에 추가
        bounds.extend(position); // 바운즈에 위치 확장
    });
    if (fitBounds && data.length > 0) map.setBounds(bounds); // 전체 마커가 보이도록 지도 범위 조정
}

// ==========================================
// 3. 마커 정보창 및 실시간 길찾기 로직
// ==========================================
function showInfoWindow(loc, position, marker) {
    if (!marker) return; // 마커가 없으면 처리 중단

    const depts = loc.departments && loc.departments.length > 0 ? loc.departments.join(', ') : '없음'; // 학과 목록 문자열 생성
    const facils = loc.facilities && loc.facilities.length > 0 ? loc.facilities.join(', ') : '없음'; // 편의시설 문자열 생성

    const safeName = encodeURIComponent(loc.name.replace(/,/g, ' ')); // 카카오맵 링크에 사용할 목적지 이름, 쉼표를 공백으로 변환하여 URL 안전성 확보
    const destLat = loc.center_coords?.lat; // 목적지 위도, API에서 제공되는 좌표
    const destLng = loc.center_coords?.lng; // 목적지 경도, API에서 제공되는 좌표
    const isToggleOn = document.getElementById('use-myloc-start')?.checked; // index.html의 토글 체크 상태를 다시 확인
    
    let routeUrl = ""; // 카카오맵 길찾기 링크 주소 초기화
    if (isToggleOn && typeof currentUserLat !== 'undefined' && typeof currentUserLng !== 'undefined') {
        const startName = encodeURIComponent("내 위치"); // 출발지 이름을 URL에 안전하게 인코딩
        routeUrl = `https://map.kakao.com/link/to/${safeName},${destLat},${destLng}/from/${startName},${currentUserLat},${currentUserLng}`; // 사용자의 현재 위치를 출발지로 포함한 길찾기 링크
    } else {
        routeUrl = `https://map.kakao.com/link/to/${safeName},${destLat},${destLng}`; // 출발지 정보 없이 목적지로만 가는 링크
    }

    const content = `
        <div style="padding:12px; min-width:220px; font-size:13px; line-height:1.6; font-family: sans-serif;">
            <h4 style="margin:0 0 8px 0; color:#007bff; font-size:15px;">${loc.name}</h4>
            <div style="margin-bottom: 4px;">
                <b style="color:#555;">🎓 소속 학과:</b> <span style="color:#333;">${depts}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <b style="color:#555;">🏪 편의 시설:</b> <span style="color:#333;">${facils}</span>
            </div>
            <a href="${routeUrl}" target="_blank" style="
                display:block; 
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
    `; // 정보창 내부 HTML 구성
    
    infoWindow.setContent(content); // 정보창 내용 설정
    infoWindow.open(map, marker); // 마커 위에 정보창 표시
}

document.getElementById('myloc-button').addEventListener('click', () => {
    if (currentUserLat && currentUserLng) {
        const myPosition = new kakao.maps.LatLng(currentUserLat, currentUserLng); // 현재 위치 좌표 생성
        map.panTo(myPosition); // 현재 위치로 지도 이동
        map.setLevel(3); // 적절한 확대 레벨 유지
    } else {
        alert("현재 위치 정보를 불러올 수 없습니다. 브라우저의 위치 권한 허용 상태를 확인해 주세요!"); // 위치 정보가 없을 때 알림
    }
});
