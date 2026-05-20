const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors()); // 모든 도메인에서 내 서버에 접속하는 것을 허용합니다.

// buildings.json 파일 불러오기
const buildings = require('./buildings.json'); 

// 1. 전체 건물 목록 조회 API
app.get('/api/buildings', (req, res) => {
  res.json(buildings);
});

// 2. 특정 건물 상세 조회 API (ID 기반)
app.get('/api/buildings/:id', (req, res) => {
  const building = buildings.find(b => b.id === req.params.id);
  if (building) {
    res.json(building);
  } else {
    res.status(404).json({ message: "건물을 찾을 수 없습니다." });
  }
});

// 3. 검색 API (이름, 영문명, 약칭, 학과 기반) 
app.get('/api/search', (req, res) => {
  const keyword = req.query.q?.toLowerCase();
  
  // 검색어가 없으면 빈 배열([]) 반환
  if (!keyword) return res.json([]);

  // 데이터베이스(JSON)를 순회하며 검색어와 매칭되는 건물 필터링
  // (에러 방지를 위해 b.name 등이 존재하는지 먼저 확인하는 로직 추가)
  const results = buildings.filter(b => 
    (b.name && b.name.toLowerCase().includes(keyword)) || 
    (b.name_en && b.name_en.toLowerCase().includes(keyword)) || 
    (b.abbr && b.abbr.toLowerCase().includes(keyword)) ||
    (b.departments && b.departments.some(d => d.toLowerCase().includes(keyword)))
  );
  
  res.json(results);
});

// 서버 실행
app.listen(port, () => {
  console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});