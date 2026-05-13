const express = require('express');
const app = express();
const port = 3000;

const buildings = require('./buildings.json'); 

app.get('/api/buildings', (req, res) => {
  res.json(buildings);
});

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

// 3. 검색 API (이름, 약칭, 학과 기반)
app.get('/api/search', (req, res) => {
  const keyword = req.query.q?.toLowerCase();
  if (!keyword) return res.json([]);

  const results = buildings.filter(b => 
    b.name.toLowerCase().includes(keyword) || 
    b.name_en.toLowerCase().includes(keyword) || 
    b.abbr.toLowerCase().includes(keyword) ||
    b.departments.some(d => d.toLowerCase().includes(keyword))
  );
  
  res.json(results);
});

app.listen(port, () => {
  console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});