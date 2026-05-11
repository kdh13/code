const express = require('express');
const cors = require('cors'); // 프론트와 통신을 위한 설정
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. 캠퍼스 데이터 (나중에는 MongoDB나 MySQL 같은 DB와 연결하면 더 좋아!)
let campusData = [
  {
    "id": 1,
    "name": "성토마스모어관",
    "abbr": "C1",
    "departments": ["법정대학", "행정학과"],
    "center_coords": { "lat": 35.9105, "lng": 128.8062 }
  },
  {
    "id": 2,
    "name": "성라이문도관",
    "abbr": "C2",
    "departments": ["외국어대학", "영어영문학"],
    "center_coords": { "lat": 35.9115, "lng": 128.8055 }
  }
];

/**
 * 2. API 엔드포인트: 모든 건물 정보 가져오기
 * 프론트엔드(app.js)에서 이 주소로 데이터를 요청하게 돼.
 */
app.get('/api/campus', (req, res) => {
    res.json(campusData);
});

/**
 * 3. 추가 점수 포인트: 즐겨찾기 저장 API (초안)
 * 사용자가 특정 건물을 즐겨찾기 했을 때 서버에 저장하는 로직이야.
 */
app.post('/api/favorites', (req, res) => {
    const { buildingId, userId } = req.body;
    console.log(`사용자 ${userId}가 건물 ${buildingId}를 즐겨찾기함`);
    res.status(200).send("즐겨찾기 저장 완료");
});

app.listen(port, () => {
    console.log(`대가대 스마트 가이드 서버가 http://localhost:${port} 에서 실행 중!`);
});