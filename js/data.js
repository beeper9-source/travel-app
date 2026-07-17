const travelData = {
  destinations: [
    {
      id: "tokyo",
      name: "도쿄, 일본",
      description: "현대적인 마천루와 전통 사찰이 공존하는 매력적인 도시",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80",
      currency: "JPY",
      currencyName: "엔화 (JPY)"
    },
    {
      id: "paris",
      name: "파리, 프랑스",
      description: "에펠탑과 예술, 낭만이 가득한 세계 문화의 중심지",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80",
      currency: "EUR",
      currencyName: "유로 (EUR)"
    },
    {
      id: "hawaii",
      name: "하와이, 미국",
      description: "푸른 바다와 활기찬 해변, 완벽한 휴양이 기다리는 낙원",
      image: "https://images.unsplash.com/photo-1542082855-e13e56236b28?auto=format&fit=crop&w=600&q=80",
      currency: "USD",
      currencyName: "미국 달러 (USD)"
    },
    {
      id: "bangkok",
      name: "방콕, 태국",
      description: "화려한 왕궁과 맛있는 길거리 음식, 활기찬 야시장의 도시",
      image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80",
      currency: "THB",
      currencyName: "태국 바트 (THB)"
    },
    {
      id: "sydney",
      name: "시드니, 호주",
      description: "오페라 하우스와 하버 브릿지, 청정 자연이 펼쳐진 곳",
      image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80",
      currency: "AUD",
      currencyName: "호주 달러 (AUD)"
    },
    {
      id: "rome",
      name: "로마, 이탈리아",
      description: "콜로세움과 역사 유적이 가득한 살아서 가봐야 할 박물관 도시",
      image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80",
      currency: "EUR",
      currencyName: "유로 (EUR)"
    },
    {
      id: "guam",
      name: "괌, 미국",
      description: "에메랄드빛 투몬 해변과 쇼핑의 즐거움이 가득한 따뜻한 휴양지",
      image: "https://images.unsplash.com/photo-1579294800821-694d95e86143?auto=format&fit=crop&w=600&q=80",
      currency: "USD",
      currencyName: "미국 달러 (USD)"
    },
    {
      id: "singapore",
      name: "싱가포르",
      description: "마리나 베이 샌즈와 미래적인 가든스 바이 더 베이의 청정 도시",
      image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80",
      currency: "SGD",
      currencyName: "싱가포르 달러 (SGD)"
    },
    {
      id: "london",
      name: "런던, 영국",
      description: "빅벤과 템스강, 깊은 역사와 현대 예술이 공존하는 문화 수도",
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80",
      currency: "GBP",
      currencyName: "영국 파운드 (GBP)"
    },
    {
      id: "danang",
      name: "다낭, 베트남",
      description: "미케 비치의 따뜻한 모래사장과 화려한 골든 브릿지의 힐링 휴양지",
      image: "https://images.unsplash.com/photo-1559592442-741e6b873859?auto=format&fit=crop&w=600&q=80",
      currency: "VND",
      currencyName: "베트남 동 (VND)"
    },
    {
      id: "bali",
      name: "발리, 인도네시아",
      description: "푸른 정글 속 우붓 사원과 에메랄드빛 해변이 반겨주는 신들의 섬",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80",
      currency: "IDR",
      currencyName: "인도네시아 루피아 (IDR)"
    }
  ],
  defaultChecklist: [
    { id: "c1", category: "essential", name: "여권 & 여권 사본", checked: false },
    { id: "c2", category: "essential", name: "항공권 및 호텔 바우처", checked: false },
    { id: "c3", category: "essential", name: "환전한 현금 & 신용카드", checked: false },
    { id: "c4", category: "essential", name: "해외 여행자 보험 가입 확인서", checked: false },
    { id: "c5", category: "essential", name: "비자 (필요 국가인 경우)", checked: false },
    
    { id: "c6", category: "electronics", name: "스마트폰 & 충전 케이블", checked: false },
    { id: "c7", category: "electronics", name: "보조 배터리 (기내 수하물)", checked: false },
    { id: "c8", category: "electronics", name: "멀티 어댑터 (돼지코)", checked: false },
    { id: "c9", category: "electronics", name: "이어폰 / 헤드폰", checked: false },
    
    { id: "c10", category: "toiletries", name: "칫솔 & 치약", checked: false },
    { id: "c11", category: "toiletries", name: "샴푸 & 린스 (여행용)", checked: false },
    { id: "c12", category: "toiletries", name: "스킨케어 & 바디 로션", checked: false },
    { id: "c13", category: "toiletries", name: "자외선 차단제 (선크림)", checked: false },
    { id: "c14", category: "toiletries", name: "면도기 / 여성용품", checked: false },
    
    { id: "c15", category: "clothing", name: "여벌 옷 (상의/하의)", checked: false },
    { id: "c16", category: "clothing", name: "속옷 & 양말", checked: false },
    { id: "c17", category: "clothing", name: "편한 신발 / 슬리퍼", checked: false },
    { id: "c18", category: "clothing", name: "선글라스 / 모자", checked: false },
    { id: "c19", category: "clothing", name: "외투 (일교차 대비)", checked: false },
    
    { id: "c20", category: "medicine", name: "종합 감기약", checked: false },
    { id: "c21", category: "medicine", name: "진통제 / 해열제", checked: false },
    { id: "c22", category: "medicine", name: "소화제 / 지사제", checked: false },
    { id: "c23", category: "medicine", name: "상처 연고 & 대역 밴드", checked: false },
    { id: "c24", category: "medicine", name: "개인 복용 약", checked: false }
  ],
  phrases: [
    {
      id: "p1",
      category: "airport",
      situation: "체크인할 때",
      kr: "창가 쪽 좌석으로 주실 수 있나요?",
      en: "Could I have a window seat, please?",
      en_pron: "쿠드 아이 해브 어 윈도우 시트, 플리즈?",
      jp: "窓側の席にしていただけますか？",
      jp_pron: "마도가와노 세키니 시테 이타다케마스카?"
    },
    {
      id: "p2",
      category: "airport",
      situation: "수하물 위탁할 때",
      kr: "이 짐을 부치고 싶습니다.",
      en: "I'd like to check this bag, please.",
      en_pron: "아이드 라이크 투 체크 디스 백, 플리즈.",
      jp: "この荷物を預けたいです。",
      jp_pron: "코노 니모츠오 아즈케타이데스."
    },
    {
      id: "p3",
      category: "airport",
      situation: "기내에서",
      kr: "담요 한 장 더 받을 수 있을까요?",
      en: "Can I get another blanket, please?",
      en_pron: "캔 아이 겟 어나더 블랭킷, 플리즈?",
      jp: "毛布をもう一枚いただけますか？",
      jp_pron: "모오후오 모오 이치마이 이타다케마스카?"
    },
    {
      id: "p4",
      category: "hotel",
      situation: "체크인",
      kr: "체크인하고 싶습니다. 예약자명은 김민수입니다.",
      en: "I'd like to check in. The reservation is under Minsu Kim.",
      en_pron: "아이드 라이크 투 체크 인. 더 레저베이션 이즈 언더 민수 킴.",
      jp: "チェックインをお願いします。予約名はキム・ミンスです。",
      jp_pron: "첵쿠인오 오네가이시마스. 요야쿠메이와 키무 민스데스."
    },
    {
      id: "p5",
      category: "hotel",
      situation: "짐 보관 요청",
      kr: "체크아웃 후에 짐을 보관해 주실 수 있나요?",
      en: "Can you keep my luggage after check-out?",
      en_pron: "캔 유 킵 마이 러기지 애프터 체크아웃?",
      jp: "チェックアウト後に荷物を預かっていただけますか？",
      jp_pron: "첵쿠아우토고니 니모츠오 아즈캇테 이타다케마스카?"
    },
    {
      id: "p6",
      category: "hotel",
      situation: "문제 발생 시",
      kr: "방의 온수가 나오지 않아요.",
      en: "There's no hot water in my room.",
      en_pron: "데어즈 노 핫 워터 인 마이 룸.",
      jp: "お湯が出ません。",
      jp_pron: "오유가 데마센."
    },
    {
      id: "p7",
      category: "restaurant",
      situation: "주문할 때",
      kr: "이것으로 주세요. (메뉴판을 가리키며)",
      en: "I'd like this one, please.",
      en_pron: "아이드 라이크 디스 원, 플리즈.",
      jp: "これをお願いします。",
      jp_pron: "코레오 오네가이시마스."
    },
    {
      id: "p8",
      category: "restaurant",
      situation: "추천 요청",
      kr: "이 가게에서 가장 인기 있는 메뉴는 무엇인가요?",
      en: "What is the most popular dish here?",
      en_pron: "왓 이즈 더 모스트 파퓰러 디쉬 히어?",
      jp: "一番人気のメニューは何ですか？",
      jp_pron: "이치반 닌키노 메뉘-와 난데스카?"
    },
    {
      id: "p9",
      category: "restaurant",
      situation: "계산할 때",
      kr: "계산서 좀 주시겠어요?",
      en: "Could we have the bill, please?",
      en_pron: "쿠드 위 해브 더 빌, 플리즈?",
      jp: "お会計をお願いします。",
      jp_pron: "오카이케오 오네가이시마스."
    },
    {
      id: "p10",
      category: "emergency",
      situation: "길을 잃었을 때",
      kr: "길을 잃었습니다. 지도로 현 위치를 보여주실 수 있나요?",
      en: "I'm lost. Can you show me where I am on the map?",
      en_pron: "아임 로스트. 캔 유 쇼 미 웨어 아이 앰 온 더 맵?",
      jp: "道に迷いました。地図で現在地を教えていただけますか？",
      jp_pron: "미치니 마요이마시타. 치즈데 겐자이치오 오시에테 이타다케마스카?"
    },
    {
      id: "p11",
      category: "emergency",
      situation: "위급 상황",
      kr: "도와주세요! 가장 가까운 병원이 어디인가요?",
      en: "Help me! Where is the nearest hospital?",
      en_pron: "헬프 미! 웨어 이즈 더 니어리스트 하스피털?",
      jp: "助けてください！一番近い病院はどこですか？",
      jp_pron: "타스케테 쿠다사이! 이치반 치카이 뵤오인와 도코데스카?"
    },
    {
      id: "p12",
      category: "emergency",
      situation: "분실 시",
      kr: "지갑을 잃어버렸습니다.",
      en: "I lost my wallet.",
      en_pron: "아이 로스트 마이 월릿.",
      jp: "財布をなくしました。",
      jp_pron: "사이후오 나쿠시마시타."
    }
  ],
  currencies: [
    { code: "KRW", symbol: "₩", name: "대한민국 원", rate: 1.0 },
    { code: "USD", symbol: "$", name: "미국 달러", rate: 1385.0 },
    { code: "JPY", symbol: "¥", name: "일본 엔 (100엔)", rate: 8.85 }, // rate relative to KRW for 1 JPY is 8.85
    { code: "EUR", symbol: "€", name: "유로", rate: 1505.0 },
    { code: "CNY", symbol: "¥", name: "중국 위안", rate: 191.0 },
    { code: "THB", symbol: "฿", name: "태국 바트", rate: 38.2 },
    { code: "AUD", symbol: "$", name: "호주 달러", rate: 928.0 },
    { code: "GBP", symbol: "£", name: "영국 파운드", rate: 1795.0 },
    { code: "SGD", symbol: "S$", name: "싱가포르 달러", rate: 1025.0 },
    { code: "VND", symbol: "₫", name: "베트남 동 (1동)", rate: 0.054 },
    { code: "IDR", symbol: "Rp", name: "인도네시아 루피아 (1동)", rate: 0.085 }
  ]
};
