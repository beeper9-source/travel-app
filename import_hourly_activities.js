const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');
console.log('Connecting to database at:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
});

const tripId = 'trip_guam';

const hourlyActivities = [
  // Day 1: 2026.08.20 (목) - 인천/괌
  {
    id: 'act_h1_1', day: 1, time: '18:00',
    title: '인천공항 제2여객터미널 이동',
    note: '공항 버스 또는 철도 이용.\n출발 3~4시간 전에는 공항 도착 필요.'
  },
  {
    id: 'act_h1_2', day: 1, time: '19:05',
    title: '진에어 카운터 수속 및 수하물 위탁',
    note: '진에어 단체 항공권은 사전 좌석 지정이 불가능해 선착순 배정됩니다.\n위탁수하물 인당 23kg 2개 무료.\n필수 지참: 여권, 이티켓, 전자 세관신고서, ETA 확인.'
  },
  {
    id: 'act_h1_3', day: 1, time: '20:30',
    title: '보안검색 및 면세점 인도장 방문',
    note: '인도장에서 면세품 수령 후 탑승동으로 이동.\n기내식이 가벼운 스낵이므로 공항 내 푸드코트에서 늦은 저녁식사 권장.'
  },
  {
    id: 'act_h1_4', day: 1, time: '21:30',
    title: '탑승 게이트 이동 및 대기',
    note: '출발 30분 전 탑승 시작.\n휴대 수하물 규정(인당 12kg) 재점검.'
  },
  {
    id: 'act_h1_5', day: 1, time: '22:05',
    title: '인천공항 출발 (진에어 LJ917)',
    note: '괌까지 비행 소요시간: 약 4시간 20분.\n석식: 진에어 기본 기내식(간단한 스낵류) 제공.'
  },

  // Day 2: 2026.08.21 (금) - 괌 도착 및 투어
  {
    id: 'act_h2_1', day: 2, time: '03:35',
    title: '괌 국제 공항 도착',
    note: '비행기 하하기 및 입국 심사대로 이동.'
  },
  {
    id: 'act_h2_2', day: 2, time: '03:50',
    title: '괌 입국 수속 및 수하물 수령',
    note: '입국 심사(지문 등록 등) 진행 후 수하물 벨트에서 가방 찾기.'
  },
  {
    id: 'act_h2_3', day: 2, time: '04:20',
    title: '노랑풍선 현지 가이드 미팅',
    note: '공항 입국장에서 나와 우측(East Arrivals) 투어 데스크 모니터 "노랑풍선" 표시 확인.\n미팅 완료 후 차량 승차 대기.'
  },
  {
    id: 'act_h2_4', day: 2, time: '04:40',
    title: '호텔 이동 (웨스틴 리조트)',
    note: '가이드 차량으로 이동 (다른 호텔 투숙 고객들과 10~15인 공동 승차).'
  },
  {
    id: 'act_h2_5', day: 2, time: '05:00',
    title: '웨스틴 리조트 괌 체크인',
    note: '별도 바우처 필요 없이 여권만 제시하여 체크인 진행.'
  },
  {
    id: 'act_h2_6', day: 2, time: '05:30',
    title: '객실 입실 후 취침 및 오전 휴식',
    note: '새벽 비행에 따른 피로 해소를 위해 오전 동안 충분히 수면 취하기.'
  },
  {
    id: 'act_h2_7', day: 2, time: '09:00',
    title: '호텔 조식 뷔페 식사',
    note: '웨스틴 리조트 조식 레스토랑 이용 (호텔식).'
  },
  {
    id: 'act_h2_8', day: 2, time: '10:00',
    title: '오전 자유 시간 및 가벼운 산책',
    note: '호텔 전경 감상 및 수영장 경로 파악.'
  },
  {
    id: 'act_h2_9', day: 2, time: '12:00',
    title: '중식 식사 (자유식)',
    note: '호텔 근처 수제버거 또는 로컬 레스토랑 방문.'
  },
  {
    id: 'act_h2_10', day: 2, time: '13:30',
    title: '로비 대기 및 투어 가이드 미팅',
    note: '아일랜드 투어 출발을 위해 로비에 집결.'
  },
  {
    id: 'act_h2_11', day: 2, time: '14:00',
    title: '괌 아일랜드 시티 투어 (2시간 소요)',
    note: '1) 스페인광장 (초콜릿 하우스, 괌 역사 유적지)\n2) 사랑의 절벽 (선셋 감상 명소 및 사랑의 종 타종)\n3) 아가나 (전망 좋은 탁 트인 바다 감상)'
  },
  {
    id: 'act_h2_12', day: 2, time: '16:30',
    title: '호텔 복귀 및 투몬 비치 선셋 산책',
    note: '괌의 첫 일몰 감상 및 사진 촬영.'
  },
  {
    id: 'act_h2_13', day: 2, time: '18:30',
    title: '석식 (투몬 맛집 - 비치인쉬림프)',
    note: '괌의 유명한 새우 요리(코코넛 쉬림프, 감바스 등) 맛보기.'
  },
  {
    id: 'act_h2_14', day: 2, time: '20:30',
    title: 'K-mart 야간 쇼핑 (1차 털이)',
    note: '괌 최대 할인 매장이자 24시간 운영하는 K마트 첫 방문.\n물놀이용 선크림(SPF110), 아쿠아 슈즈, 비치웨어 및 맥주/음료/스낵 1차 구매.'
  },
  {
    id: 'act_h2_15', day: 2, time: '22:00',
    title: '하루 일정 정리 및 취침',
    note: '내일 물놀이 준비를 위해 수영복 및 방수팩 점검.'
  },

  // Day 3: 2026.08.22 (토) - 괌 전일 자유일정
  {
    id: 'act_h3_1', day: 3, time: '08:30',
    title: '호텔 조식 뷔페 식사',
    note: '든든하게 호텔식으로 아침 식사 완료.'
  },
  {
    id: 'act_h3_2', day: 3, time: '10:00',
    title: '투몬 비치 물놀이 및 스노클링',
    note: '호텔 앞 투몬 비치에서 맑은 바다와 열대어 스노클링 감상.\n선크림 필수 도포!'
  },
  {
    id: 'act_h3_3', day: 3, time: '12:30',
    title: '중식 (자유식 - 도스버거)',
    note: '괌의 대표 수제버거 맛집 도스버거에서 햄버거 식사.'
  },
  {
    id: 'act_h3_4', day: 3, time: '14:30',
    title: '호텔 복귀 후 샤워 및 낮잠',
    note: '뜨거운 태양 아래 물놀이 후 가장 더운 시간대에 호텔에서 꿀맛 같은 낮잠.'
  },
  {
    id: 'act_h3_5', day: 3, time: '17:00',
    title: '더 비치바 선셋 드링크',
    note: '석양이 아름답게 보이는 선셋 비치 바에서 시원한 칵테일 또는 음료 감상.'
  },
  {
    id: 'act_h3_6', day: 3, time: '18:30',
    title: '석식 (바베큐 플래터 또는 스테이크)',
    note: '선셋과 함께 즐기는 바베큐 식사 또는 괌 특산 스테이크 하우스 이용.'
  },
  {
    id: 'act_h3_7', day: 3, time: '21:00',
    title: 'K-mart 2차 야간 쇼핑 (영양제 & 기념품)',
    note: '선물용으로 인기인 센트룸 영양제, 리치 바나나칩, 건망고, 스팸 괌 에디션 등 기념품 대량 구매.'
  },
  {
    id: 'act_h3_8', day: 3, time: '22:30',
    title: '호텔 복귀 및 취침',
    note: '충분한 수면으로 힐링 충전.'
  },

  // Day 4: 2026.08.23 (일) - 쇼핑 및 체크아웃
  {
    id: 'act_h4_1', day: 4, time: '08:30',
    title: '호텔 조식 뷔페 식사',
    note: '마지막 아침 조식 뷔페 식사.'
  },
  {
    id: 'act_h4_2', day: 4, time: '10:00',
    title: '오전 해변 산책 및 마지막 수영',
    note: '아침 투몬 비치를 가볍게 산책하고 사진 촬영 남기기.'
  },
  {
    id: 'act_h4_3', day: 4, time: '11:30',
    title: '객실 복귀 및 짐 1차 꾸리기',
    note: '공항으로 보낼 캐리어 정리 및 기내 반입품 분류.'
  },
  {
    id: 'act_h4_4', day: 4, time: '13:00',
    title: '중식 (자유식 - 카프리초사)',
    note: '이탈리안 레스토랑에서 푸짐한 파스타/피자 식사.'
  },
  {
    id: 'act_h4_5', day: 4, time: '14:30',
    title: '쇼핑몰 쇼핑 투어 (T갤러리아 & GPO)',
    note: '1) T갤러리아 (명품, 화장품, 초콜릿 면세 쇼핑)\n2) GPO (타미힐피거, 로스 등 의류 할인 아울렛 득템 쇼핑)'
  },
  {
    id: 'act_h4_6', day: 4, time: '18:30',
    title: '석식 (로컬 비비큐)',
    note: '마지막 날 밤 분위기를 낼 수 있는 괌 로컬 바베큐 플레이트.'
  },
  {
    id: 'act_h4_7', day: 4, time: '20:30',
    title: 'K-mart 최종 털이 쇼핑',
    note: '이지치즈(캔치즈), 괌 맥주, 미처 사지 못한 기념품 최종 싹쓸이 쇼핑.'
  },
  {
    id: 'act_h4_7_pack', day: 4, time: '22:00',
    title: '호텔 복귀 및 최종 캐리어 패킹',
    note: 'K마트 구매품 정돈 및 위탁 수하물 무게 체크(인당 23kg 제한).'
  },
  {
    id: 'act_h4_8', day: 4, time: '23:00',
    title: '웨스틴 리조트 레이트 체크아웃',
    note: '밤 23:00 - 00:00 사이 프론트에서 레이트 체크아웃 정산 완료.'
  },
  {
    id: 'act_h4_9', day: 4, time: '23:30',
    title: '공항 샌딩 차량 가이드 미팅',
    note: '호텔 로비에서 노랑풍선 샌딩 가이드 미팅 후 공항으로 단체 이동.'
  },

  // Day 5: 2026.08.24 (월) - 귀국
  {
    id: 'act_h5_1', day: 5, time: '00:30',
    title: '괌 국제 공항 도착 및 카운터 대기',
    note: '공항 카운터에서 귀국편(진에어 LJ918) 수하물 위탁 및 출국 심사 진행.'
  },
  {
    id: 'act_h5_2', day: 5, time: '01:30',
    title: '괌 공항 면세 구역 대기',
    note: '출국장 면세 구역 내 라운지 또는 의자에서 비행기 탑승 시간까지 휴식.'
  },
  {
    id: 'act_h5_3', day: 5, time: '04:40',
    title: '괌 공항 출발 (진에어 LJ918)',
    note: '비행 소요시간: 약 4시간 30분.\n기내에서 충분히 수면 취하기.'
  },
  {
    id: 'act_h5_4', day: 5, time: '08:20',
    title: '인천 국제 공항 도착 및 귀가',
    note: '인천공항 제2여객터미널 도착, 위탁 수하물 수령 후 세관 통과 및 여행 종료 해산.'
  }
];

db.serialize(() => {
  // Clear old activities for Guam trip
  db.run('DELETE FROM activities WHERE trip_id = ?', [tripId], function(err) {
    if (err) {
      console.error('Delete error:', err);
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} existing activities for ${tripId}.`);

    // Insert new hourly activities
    const stmt = db.prepare('INSERT INTO activities (id, day, time, title, note, trip_id) VALUES (?, ?, ?, ?, ?, ?)');
    hourlyActivities.forEach((act) => {
      stmt.run(act.id, act.day, act.time, act.title, act.note, tripId, (err2) => {
        if (err2) {
          console.error(`Insert failed for ${act.id}:`, err2);
        }
      });
    });
    stmt.finalize(() => {
      console.log('Successfully imported all hourly activities!');
      db.close();
    });
  });
});
