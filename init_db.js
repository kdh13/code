require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI;

// 1. Mongoose 스키마 정의 (건물 정보 및 세부 시설 테이블 분리)
const buildingSchema = new mongoose.Schema({
  building_code: String,
  name: String,
  name_en: String,
  lat: Number,
  lng: Number,
  entrance_lat: Number,
  entrance_lng: Number
});

const facilitySchema = new mongoose.Schema({
  building_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
  category: String, // 'DEPARTMENT'(학과) 또는 'FACILITY'(편의시설)
  name: String
});

const Building = mongoose.model('Building', buildingSchema);
const Facility = mongoose.model('Facility', facilitySchema);

async function migrateData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("📡 클라우드 DB 연결 성공! 데이터 이관을 시작합니다...");

    // 기존에 혹시 들어있을지 모를 데이터를 깨끗이 초기화 (중복 방지)
    await Building.deleteMany({});
    await Facility.deleteMany({});

    // 2. buildings.json 파일 읽어오기
    const rawData = fs.readFileSync('./buildings.json', 'utf8');
    const buildingsList = JSON.parse(rawData);

    // 3. 데이터를 순회하며 DB에 쪼개서 저장하기
    for (const b of buildingsList) {
      // 건물 기본 정보 저장
      const newBuilding = new Building({
        building_code: b.id,
        name: b.name,
        name_en: b.name_en,
        lat: b.center_coords?.lat || 0,
        lng: b.center_coords?.lng || 0,
        entrance_lat: b.entrance_coords?.lat || 0,
        entrance_lng: b.entrance_coords?.lng || 0
      });

      const savedBuilding = await newBuilding.save();
      console.log(`🏢 건물 등록 완료: ${savedBuilding.name}`);

      // 학과(departments) 데이터 분리 저장
      if (b.departments && b.departments.length > 0) {
        for (const dept of b.departments) {
          await new Facility({
            building_id: savedBuilding._id,
            category: 'DEPARTMENT',
            name: dept
          }).save();
        }
      }

      // 편의시설(facilities) 데이터 분리 저장
      if (b.facilities && b.facilities.length > 0) {
        for (const fac of b.facilities) {
          await new Facility({
            building_id: savedBuilding._id,
            category: 'FACILITY',
            name: fac
          }).save();
        }
      }
    }

    console.log("🎉 [성공] 모든 데이터가 구조화되어 클라우드 DB에 무사히 저장되었습니다!");
  } catch (error) {
    console.error("❌ 이관 중 에러 발생:", error);
  } finally {
    // 작업이 끝나면 DB 연결 안전하게 닫기
    mongoose.connection.close();
  }
}

migrateData();
