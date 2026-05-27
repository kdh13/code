require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

app.use(cors()); // 모든 도메인에서 내 서버에 접속하는 것을 허용합니다.
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB 클라우드 연결 성공!'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));
// 🛠️ Mongoose 모델 가져오기 (데이터베이스 조작용 스키마)
// (앞서 정의한 규칙을 코드 상단에 임시로 선언하여 연동합니다.)
const Building = mongoose.model('Building', new mongoose.Schema({
  building_code: String,
  name: String,
  name_en: String,
  lat: Number,
  lng: Number,
  entrance_lat: Number,
  entrance_lng: Number
}));

const Facility = mongoose.model('Facility', new mongoose.Schema({
  building_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
  category: String, // 'DEPARTMENT' 또는 'FACILITY'
  name: String
}));


// 📡 [API 1] 전체 건물 목록 조회 (이제 클라우드 DB에서 가져옵니다)
app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await Building.find({});
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ message: "데이터를 가져오는 중 오류가 발생했습니다." });
  }
});

// 📡 [API 2] 특정 건물 상세 조회 (건물 코드로 조회)
app.get('/api/buildings/:code', async (req, res) => {
  try {
    const building = await Building.findOne({ building_code: req.params.code });
    if (building) {
      res.json(building);
    } else {
      res.status(404).json({ message: "건물을 찾을 수 없습니다." });
    }
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
  }
});

// 📡 [API 3] 통합 검색 API (이름, 영문명, 학과/시설 종합 검색)
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q;
    if (!keyword) return res.json([]);

    // 1. 건물 이름이나 영문명에 검색어가 포함된 건물들 먼저 검색 (정규식 이용, 대소문자 무시)
    const matchedBuildings = await Building.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { name_en: { $regex: keyword, $options: 'i' } }
      ]
    });

    // 2. 학과/시설 테이블(Facility)에서 검색어가 포함된 항목들을 찾고, 해당 건물 ID 추출
    const matchedFacilities = await Facility.find({
      name: { $regex: keyword, $options: 'i' }
    }).populate('building_id');

    // 두 군데서 찾은 건물 정보들을 중복 없이 하나로 합치기
    const resultsMap = new Map();
    
    matchedBuildings.forEach(b => resultsMap.set(b._id.toString(), b));
    matchedFacilities.forEach(f => {
      if (f.building_id) {
        resultsMap.set(f.building_id._id.toString(), f.building_id);
      }
    });

    res.json(Array.from(resultsMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "검색 중 오류 발생" });
  }
});

// 서버 실행
app.listen(port, () => {
  console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});