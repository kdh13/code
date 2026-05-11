// 1. 지도 초기화
const container = document.getElementById('map');
const options = {
    center: new kakao.maps.LatLng(35.911, 128.807), // 대가대 효성캠퍼스 중심점
    level: 3
};
const map = new kakao.maps.Map(container, options);

// 2. 데이터 불러오기 및 검색 기능
let campusData = [];

// 기존: fetch('data.json')
// 변경: 백엔드 API 서버 주소에서 데이터 가져오기
fetch('http://localhost:3000/api/campus')
    .then(res => res.json())
    .then(data => {
        campusData = data;
        displayMarkers(campusData);
    })
    .catch(err => console.error("서버 연결 실패:", err));

// 3. 검색 필터링 로직
document.getElementById('search-input').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = campusData.filter(item => 
        item.name.includes(keyword) || 
        item.abbr.toLowerCase().includes(keyword) ||
        item.departments.some(dept => dept.includes(keyword))
    );
    // 필터링된 결과로 지도 이동 및 마커 업데이트 로직 추가 가능
});

// 4. 마커 표시 함수
function renderMarkers(data) {
    data.forEach(loc => {
        const marker = new kakao.maps.Marker({
            map: map,
            position: new kakao.maps.LatLng(loc.center_coords.lat, loc.center_coords.lng),
            title: loc.name
        });
    });
}
