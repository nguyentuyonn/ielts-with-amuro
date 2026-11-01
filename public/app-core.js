/* ============================================================================
   FILE 2/3: app-core.js
   HỆ THỐNG LÕI: FIREBASE SHARDING (ZERO-QUOTA LEAK), AUTH, DASHBOARD,
   PHÂN TRANG, QUẢN LÝ LỚP/HỌC SINH PRO, AI WRITING GRADER & VOCABULARY ENGINE
   ============================================================================ */

/* 1. CẤU HÌNH FIREBASE & KHÓA CHẶT LỖI ĐỐT HẠN MỨC (ZERO SNAPSHOT LISTENER) */
const firebaseConfig = {
  apiKey: "AIzaSyCy9f9_9p_wwz-wUusAlujBcU83zuku-6Y",
  authDomain: "ielts-amuro.firebaseapp.com",
  projectId: "ielts-amuro",
  storageBucket: "ielts-amuro.firebasestorage.app",
  messagingSenderId: "907191420166",
  appId: "1:907191420166:web:788bc5c41a7223aa464a87",
  measurementId: "G-SNSN7PNPWX"
};

let CLOUD_DB = null;
let CLOUD_DOC = null;
let CLOUD_STORAGE = null;
window.__AMURO_FETCHED_COLLECTIONS = new Set();
window.__AMURO_LAST_META_WRITE = 0;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    CLOUD_DB = firebase.firestore();
    CLOUD_DOC = CLOUD_DB.collection('suite').doc('main_database');
    if (firebase.storage) {
      CLOUD_STORAGE = firebase.storage();
    }

    // Khóa chặt .onSnapshot() ở cấp độ Prototype: chuyển thành .get() 1 lần duy nhất
    const ColProto = firebase.firestore.CollectionReference.prototype;
    const DocProto = firebase.firestore.DocumentReference.prototype;
    if (ColProto && !ColProto.__amuroZeroQuotaPatched) {
      ColProto.__amuroZeroQuotaPatched = true;
      ColProto.onSnapshot = function(onNext, onError) {
        const key = 'col_' + this.path;
        if (window.__AMURO_FETCHED_COLLECTIONS.has(key)) return function() {};
        window.__AMURO_FETCHED_COLLECTIONS.add(key);
        this.get().then(snap => { if (typeof onNext === 'function') onNext(snap); })
                  .catch(err => { if (typeof onError === 'function') onError(err); });
        return function() {};
      };
    }
    if (DocProto && !DocProto.__amuroZeroQuotaPatched) {
      DocProto.__amuroZeroQuotaPatched = true;
      DocProto.onSnapshot = function(onNext, onError) {
        const key = 'doc_' + this.path;
        if (window.__AMURO_FETCHED_COLLECTIONS.has(key)) return function() {};
        window.__AMURO_FETCHED_COLLECTIONS.add(key);
        this.get().then(doc => { if (typeof onNext === 'function') onNext(doc); })
                  .catch(err => { if (typeof onError === 'function') onError(err); });
        return function() {};
      };
    }
  }
} catch (err) {
  console.warn('Firebase initialization warning:', err);
}

function getActiveFirestore() {
  if (CLOUD_DB) return CLOUD_DB;
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    CLOUD_DB = firebase.firestore();
    return CLOUD_DB;
  }
  return null;
}

function cleanForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

/* 2. BỘ ĐỀ MẪU MẶC ĐỊNH & CẤU TRÚC NGỮ PHÁP MẪU */
const DEFAULT_SHOPPING_SYNTAX = {
  q27: "S: they | V: are all well-versed | O/C: in the science of persuading people to buy things",
  q28: "S: People | V: need to make | O/C: a gentle start and take stock of the surroundings",
  q29: "S: selecting wholesome fresh food | V: is | O/C: an uplifting way to start shopping | M: and it makes people feel less guilty",
  q30: "S: Shoppers | V: have worked out | O/C: that everyday items, like milk, will invariably be placed | M: in an aisle towards the back of a store",
  q31: "S: stores | V: encourage | O/C: customers to buy expensive branded products | M: by arranging them at eye-level, with cheaper ones lower down",
  q32: "M: Often | S: head offices | V: specify | O/C: where everything has to be placed",
  q33: "M: Despite all the academic papers written on how best to stack shelves | S: retailers | V: have | O/C: their own views",
  q34: "S: Pictures showing shoppers | M: while they are making their selections | V: can now be analysed",
  q35: "S: This low-tech approach | V: has become | O/C: widespread | M: following comments from stores that data collected electronically tells them little",
  q36: "S: People | V: tell | O/C: market researchers that they make decisions about what to buy | M: based on logic and common sense",
  q37: "S: other factors | V: play | O/C: a role | M: such as certain feelings and memories which individuals are not fully aware of",
  q38: "S: scanners | V: reveal | O/C: their brain activity | M: as they respond",
  q39: "S: major contradictions | V: are | O/C: apparent | M: between what they say and what they are thinking",
  q40: "S: Eight out of ten new consumer products | M: launched on the market | V: do not succeed"
};

const defaultShoppingExam = {
  id: 'reading_science_of_shopping',
  title: 'Passage: The Science of Shopping (Questions 27-40)',
  duration: 20,
  category: 'Passage 3',
  topic: 'Consumer Psychology',
  difficulty: 'Standard',
  assignedClasses: [],
  syntaxStructures: { ...DEFAULT_SHOPPING_SYNTAX },
  correctAnswers: {
    q27: 'B', q28: 'D', q29: 'A', q30: 'C',
    q31: 'YES', q32: 'YES', q33: 'NO', q34: 'NOT GIVEN', q35: 'NO',
    q36: 'G', q37: 'C', q38: 'A', q39: 'H', q40: 'E'
  },
  explanations: {
    q27: 'Supermarkets share a similar understanding of consumer psychology ("the science of persuading people to buy things").',
    q28: 'The chill zone helps customers make a gentle start and prepare themselves to go shopping.',
    q29: 'Selecting wholesome fresh food is an uplifting way to start shopping and makes people feel less guilty.',
    q30: 'The phrase "Shoppers have worked out that..." shows shoppers are aware of store techniques.',
    q31: 'Stores encourage customers to buy expensive products at eye-level while placing cheaper ones lower down.',
    q32: 'Head office specifications are controversial and retailers have their own views.',
    q33: 'Shelf-positioning is extremely controversial with no widespread agreement.',
    q34: 'Security cameras are mentioned for behaviour analysis, not privacy threats.',
    q35: 'Electronic data tells little about why customers leave; face-to-face interviews yield better insights.',
    q36: 'People claim they make decisions based on logic and common sense (G. rational decisions).',
    q37: 'Feelings and memories individuals are not fully aware of also play a role (C. unconscious factors).',
    q38: 'Studies use fMRI scanners to reveal brain activity (A. brain scans).',
    q39: 'Scanners reveal major contradictions between what people say and think (H. emotional reaction).',
    q40: 'Eight out of ten new consumer products launched on the market do not succeed (E. failures).'
  },
  evidences: {
    q27: 'It is more that they are all well-versed in the science of persuading people to buy things',
    q28: 'It takes a while for the mind to get into a shopping mode. People need to make a gentle start and take stock of the surroundings',
    q29: 'selecting wholesome fresh food is an uplifting way to start shopping, and it makes people feel less guilty',
    q30: 'Shoppers have worked out that everyday items, like milk, will invariably be placed in an aisle towards the back of a store',
    q31: 'stores encourage customers to buy expensive branded products by arranging them at eye-level, with cheaper ones lower down',
    q32: 'Often head offices specify where everything has to be placed and spot-checks are carried out to make sure instructions are followed to the letter. But shelf-positioning is extremely controversial.',
    q33: 'Despite all the academic papers written on how best to stack shelves, retailers have their own views. While many stores consider eye-level to be the top spot, others think a little higher is better.',
    q34: 'Pictures showing shoppers while they are making their selections can now be analysed',
    q35: 'This low-tech approach has become widespread following comments from stores that data collected electronically tells them little about why so many customers leave without making a purchase',
    q36: 'People tell market researchers that they make decisions about what to buy based on logic and common sense',
    q37: 'there are clearly other factors which play a role, such as certain feelings and memories which individuals are not fully aware of',
    q38: 'scanners reveal their brain activity as they respond',
    q39: 'major contradictions are apparent between what they say and what they are thinking',
    q40: 'Eight out of ten new consumer products launched on the market do not succeed'
  },
  passages: [
    {
      partNum: 1,
      title: 'Passage: The Science of Shopping',
      passageHtml: `
        <p>You may have wondered why so many supermarkets are virtually indistinguishable from each other. It is not, as some might suspect, that the companies operating them lack imagination. It is more that they are all well-versed in the science of persuading people to buy things - a science that, thanks to technological advances, is beginning to understand what motivates consumers when they make decisions on what to purchase.</p>
        <p>It takes a while for the mind to get into a shopping mode. People need to make a gentle start and take stock of the surroundings. This is why some supermarkets have a so-called chill zone for browsing magazines, books and DVDs, an area which is also designed to catch the customer's eye and tempt them to make impulsive purchases. But many will ignore it, in which case the first thing they encounter is the fresh fruit and vegetables section. For shoppers, this makes no sense. Fruit in particular can be easily bruised, so ideally should be bought at the end, not the beginning, of a shopping trip. But psychology is at work here: selecting wholesome fresh food is an uplifting way to start shopping, and it makes people feel less guilty about reaching for the less nutritious stuff later on.</p>
        <p>Shoppers have worked out that everyday items, like milk, will invariably be placed in an aisle towards the back of a store to provide more opportunity to tempt customers on their way there. This is also why pharmacies are generally at the rear, even in convenience stores. But supermarkets know shoppers know this, so they use other tricks, like placing popular items halfway along a section, thereby forcing people to walk along the aisle looking for them. The idea is to boost the length of time shoppers spend in a store.</p>
        <p>Having walked to the end of the fruit and vegetable aisle, shoppers arrive at counters of prepared food, the fishmonger and the butcher. Then there is the in-store bakery, which can be smelt before being seen. Even small supermarkets now use in-store bakeries. Mostly these bake pre-prepared items, and they have boomed, although central bakeries that deliver to many stores are more efficient. The smell of freshly baked bread can make people hungry, encouraging them to buy not just bread but other food.</p>
        <p>There are also numerous ways stores get shoppers to choose particular products. For example, stores encourage customers to buy expensive branded products by arranging them at eye-level, with cheaper ones lower down. Often head offices specify where everything has to be placed and spot-checks are carried out to make sure instructions are followed to the letter. But shelf-positioning is extremely controversial. Despite all the academic papers written on how best to stack shelves, retailers have their own views. While many stores consider eye-level to be the top spot, others think a little higher is better.</p>
        <p>Technology is making the process of monitoring shopper behaviour easier, which is why the security cameras in stores may be doing considerably more than watching out for theft. Pictures showing shoppers while they are making their selections can now be analysed. It is possible to see how many shoppers went straight to one brand, the number that hesitated, and those that compared several brands. However, despite the availability of sophisticated technology, researchers have found that simply talking to consumers as they exit the store can yield valuable insights. This low-tech approach has become widespread following comments from stores that data collected electronically tells them little about why so many customers leave without making a purchase. Face-to-face interviews reveal that customers leave shops empty-handed more often because they are unable to decide than because prices are too high.</p>
        <p>People tell market researchers that they make decisions about what to buy based on logic and common sense, considering issues such as price, quality or convenience. But there are clearly other factors which play a role, such as certain feelings and memories which individuals are not fully aware of. Researchers hired by big stores are now conducting studies using functional magnetic resonance imaging (fMRI), which detects changes in the brain corresponding to increases or decreases in mental activity. Research participants are shown different products and asked questions about them, while scanners reveal their brain activity as they respond. Often, major contradictions are apparent between what they say and what they are thinking. This is immensely valuable information. Eight out of ten new consumer products launched on the market do not succeed, despite having been tested on people who insist they would buy them but who, deep down, may have reservations about the desirability of these products.</p>
        <p>This shopping science probably has its limits, however. Dr Eric Spangenberg of the University of Washington argues that while it is unlikely that someone could be persuaded to buy something they do not need, they might be convinced to choose one brand in preference to another without being aware that this is happening. This claim is also borne out by numerous research findings. But if consumers were to realise quite how much research is being done into the many psychological factors influencing their choices, they might be much more wary of making purchases in the future.</p>
      `,
      questionsHtml: `
        <div class="question-group">
          <div class="question-group-title">Questions 27-30</div>
          <p>Choose the correct letter, <strong>A, B, C</strong> or <strong>D</strong>.</p>
          <div class="question" data-question="27">
            <div class="question-text"><span class="q-badge">27</span> What does the writer suggest about supermarkets in the first paragraph?</div>
            <div class="options">
              <label><input type="radio" name="q27" value="A"> A They need to try harder to be different from one another.</label>
              <label><input type="radio" name="q27" value="B"> B They share a similar understanding of consumer psychology.</label>
              <label><input type="radio" name="q27" value="C"> C They depend too much on the latest technology.</label>
              <label><input type="radio" name="q27" value="D"> D They should do more to analyse how consumers think.</label>
            </div>
          </div>
          <div class="question" data-question="28">
            <div class="question-text"><span class="q-badge">28</span> The writer says the function of the chill zone in supermarkets is</div>
            <div class="options">
              <label><input type="radio" name="q28" value="A"> A to give customers time to decide what they want to buy.</label>
              <label><input type="radio" name="q28" value="B"> B to present customers with a range of interesting bargains.</label>
              <label><input type="radio" name="q28" value="C"> C to ensure customers feel under no pressure to buy anything.</label>
              <label><input type="radio" name="q28" value="D"> D to help customers slowly prepare themselves to go shopping.</label>
            </div>
          </div>
          <div class="question" data-question="29">
            <div class="question-text"><span class="q-badge">29</span> According to the writer, placing fruit and vegetables near the front of the store</div>
            <div class="options">
              <label><input type="radio" name="q29" value="A"> A ensures the customers will feel good about the first products they buy.</label>
              <label><input type="radio" name="q29" value="B"> B reduces the risk of customers damaging these products later on.</label>
              <label><input type="radio" name="q29" value="C"> C encourages customers to buy more of these products than they intended.</label>
              <label><input type="radio" name="q29" value="D"> D makes customers consider healthier options in other sections they visit.</label>
            </div>
          </div>
          <div class="question" data-question="30">
            <div class="question-text"><span class="q-badge">30</span> What point does the writer make about shoppers in the third paragraph?</div>
            <div class="options">
              <label><input type="radio" name="q30" value="A"> A They spend more time in stores than they realise.</label>
              <label><input type="radio" name="q30" value="B"> B They believe stores make life unnecessarily difficult for them.</label>
              <label><input type="radio" name="q30" value="C"> C They are aware of some of the techniques used by stores.</label>
              <label><input type="radio" name="q30" value="D"> D They are confused by frequent changes in the layout of stores.</label>
            </div>
          </div>
        </div>
        <div class="question-group">
          <div class="question-group-title">Questions 31-35</div>
          <p>Choose <strong>YES</strong>, <strong>NO</strong> or <strong>NOT GIVEN</strong>.</p>
          <div class="question" data-question="31">
            <div class="question-text"><span class="q-badge">31</span> Cheaper products are placed on lower shelves to minimise the likelihood that they will be bought.</div>
            <div class="options">
              <label><input type="radio" name="q31" value="YES"> YES</label>
              <label><input type="radio" name="q31" value="NO"> NO</label>
              <label><input type="radio" name="q31" value="NOT GIVEN"> NOT GIVEN</label>
            </div>
          </div>
          <div class="question" data-question="32">
            <div class="question-text"><span class="q-badge">32</span> Head offices should be more flexible about how products are arranged by supermarkets.</div>
            <div class="options">
              <label><input type="radio" name="q32" value="YES"> YES</label>
              <label><input type="radio" name="q32" value="NO"> NO</label>
              <label><input type="radio" name="q32" value="NOT GIVEN"> NOT GIVEN</label>
            </div>
          </div>
          <div class="question" data-question="33">
            <div class="question-text"><span class="q-badge">33</span> There is widespread agreement on how products should be arranged on shelves.</div>
            <div class="options">
              <label><input type="radio" name="q33" value="YES"> YES</label>
              <label><input type="radio" name="q33" value="NO"> NO</label>
              <label><input type="radio" name="q33" value="NOT GIVEN"> NOT GIVEN</label>
            </div>
          </div>
          <div class="question" data-question="34">
            <div class="question-text"><span class="q-badge">34</span> Security cameras are a serious threat to customers' privacy.</div>
            <div class="options">
              <label><input type="radio" name="q34" value="YES"> YES</label>
              <label><input type="radio" name="q34" value="NO"> NO</label>
              <label><input type="radio" name="q34" value="NOT GIVEN"> NOT GIVEN</label>
            </div>
          </div>
          <div class="question" data-question="35">
            <div class="question-text"><span class="q-badge">35</span> Technology is the best tool for determining why shoppers fail to make purchases.</div>
            <div class="options">
              <label><input type="radio" name="q35" value="YES"> YES</label>
              <label><input type="radio" name="q35" value="NO"> NO</label>
              <label><input type="radio" name="q35" value="NOT GIVEN"> NOT GIVEN</label>
            </div>
          </div>
        </div>
        <div class="question-group">
          <div class="question-group-title">Questions 36-40</div>
          <p>Complete the summary using the list of words and phrases, <strong>A-I</strong>, below.</p>
          <div class="drag-options">
            <div class="drag-item" draggable="true" data-answer="A">A brain scans</div>
            <div class="drag-item" draggable="true" data-answer="B">B purpose</div>
            <div class="drag-item" draggable="true" data-answer="C">C unconscious factors</div>
            <div class="drag-item" draggable="true" data-answer="D">D shelf placement</div>
            <div class="drag-item" draggable="true" data-answer="E">E failures</div>
            <div class="drag-item" draggable="true" data-answer="F">F social pressure</div>
            <div class="drag-item" draggable="true" data-answer="G">G rational decisions</div>
            <div class="drag-item" draggable="true" data-answer="H">H emotional reaction</div>
            <div class="drag-item" draggable="true" data-answer="I">I shopping habits</div>
          </div>
          <p style="line-height: 2.3; margin-top: 10px;">
            Research is providing insights into what makes people purchase particular products. Most shoppers believe that their choices are the result of 
            <span class="drop-zone" data-target="q36" data-placeholder="36">36</span>. 
            Research involving fMRI scanners, however, has revealed that certain 
            <span class="drop-zone" data-target="q37" data-placeholder="37">37</span> 
            influence shoppers' decisions to a significant extent. In the research, a comparison was made between participants' stated opinions of a product and data from 
            <span class="drop-zone" data-target="q38" data-placeholder="38">38</span>, 
            which often indicated a radically different 
            <span class="drop-zone" data-target="q39" data-placeholder="39">39</span>. 
            As most new products are 
            <span class="drop-zone" data-target="q40" data-placeholder="40">40</span>, 
            this data could be extremely valuable for marketing departments.
          </p>
        </div>
      `,
      vocab: [
        { word: 'indistinguishable', type: 'adj', mean: 'Identical in appearance; impossible to tell apart', syn: 'identical, similar, alike' },
        { word: 'well-versed', type: 'adj', mean: 'Highly experienced and skilled in a subject', syn: 'knowledgeable, proficient' },
        { word: 'motivate', type: 'verb', mean: 'Provide someone with a reason for doing something', syn: 'encourage, stimulate' },
        { word: 'impulsive', type: 'adj', mean: 'Acting or done without forethought', syn: 'spontaneous, rash' },
        { word: 'bruised', type: 'adj', mean: 'Damaged or discolored by impact', syn: 'damaged, harmed' },
        { word: 'wholesome', type: 'adj', mean: 'Conducive to good health and physical well-being', syn: 'healthy, nourishing' },
        { word: 'controversial', type: 'adj', mean: 'Giving rise to public disagreement', syn: 'debatable, contentious' },
        { word: 'sophisticated', type: 'adj', mean: 'Developed to a high degree of complexity', syn: 'advanced, complex' },
        { word: 'contradiction', type: 'noun', mean: 'A combination of statements that are opposed to one another', syn: 'inconsistency, discrepancy' }
      ]
    }
  ]
};

/* 3. BIẾN TRẠNG THÁI TOÀN CỤC */
let db = {
  users: [
    { id: 'u_admin', username: 'amuro', pass: 'amuro123', name: 'Teacher Amuro', role: 'teacher' },
    { id: 'u_s1', username: 'student1', pass: '123456', name: 'Alex Johnson', role: 'student', classId: 'c1' },
    { id: 'u_s2', username: 'hocsinh1', pass: '123456', name: 'Nguyen Van A', role: 'student', classId: 'c1' }
  ],
  classes: [
    { id: 'c1', name: 'IELTS Intensive 7.5+' },
    { id: 'c2', name: 'Foundation Morning' }
  ],
  savedVocab: {},
  aiConfig: { apiKey: '', autoGrade: false, customPrompt: '' },
  milestoneProgress: {},
  passedMilestones: {},
  deletedExamIds: [],
  readingExams: [defaultShoppingExam],
  listeningExams: [],
  writingExams: [],
  results: []
};

let activeUser = null;
try {
  activeUser = JSON.parse(sessionStorage.getItem('AMURO_CURRENT_USER'));
} catch (e) {}

let activeExam = null;
let activePartNum = 1;
let activeExamType = 'reading';
let userAnswers = {};
let writingAnswers = { task1: '', task2: '' };
let isReviewMode = false;
let isTeacherEditMode = false;
let examTimer = null;
let secondsRemaining = 3600;
let selectedDragItem = null;
let analyticsViewMode = 'student';
let expandedAnalyticsStudent = null;
let currentHomeSkillFilter = 'all';

// Phân trang bảng đề (10 đề / trang)
let examPageTrackers = { reading: 1, listening: 1, writing: 1 };
const EXAM_PAGE_SIZE = 10;

// Trạng thái soạn thảo đề
let passageDrafts = { 1: {}, 2: {}, 3: {} };
let currentDraftTab = 1;
let listeningPartDrafts = { 1: {}, 2: {}, 3: {}, 4: {} };
let currentListeningDraftTab = 1;

/* 4. ĐỒNG BỘ FIREBASE SHARDING (CHỈ ĐỌC 1 LẦN KHI MỞ WEB - KHÔNG ĐỐT QUOTA) */
function setSyncStatus(statusText, isOnline) {
  const dot = document.getElementById('realtimeSyncDot');
  const txt = document.getElementById('realtimeSyncText');
  if (dot && txt) {
    dot.style.background = isOnline ? '#10b981' : '#f59e0b';
    txt.textContent = statusText;
  }
}

function ensureArraysExist() {
  if (!db.users || !db.users.length) {
    db.users = [{ id: 'u_admin', username: 'amuro', pass: 'amuro123', name: 'Teacher Amuro', role: 'teacher' }];
  }
  if (!db.classes) db.classes = [];
  if (!db.readingExams) db.readingExams = [];
  if (!db.listeningExams) db.listeningExams = [];
  if (!db.writingExams) db.writingExams = [];
  if (!db.results) db.results = [];
  if (!db.savedVocab) db.savedVocab = {};
  if (!db.aiConfig) db.aiConfig = { apiKey: '', autoGrade: false, customPrompt: '' };
  if (!db.milestoneProgress) db.milestoneProgress = {};
  if (!db.passedMilestones) db.passedMilestones = {};
  if (!db.deletedExamIds) db.deletedExamIds = [];
}

function mergeRecordsById(legacyList = [], shardList = [], deletedIds = []) {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map();
  (legacyList || []).forEach(item => {
    if (item && item.id && !deletedSet.has(item.id)) map.set(item.id, item);
  });
  (shardList || []).forEach(item => {
    if (item && item.id && !deletedSet.has(item.id)) {
      const oldItem = map.get(item.id) || {};
      map.set(item.id, { ...oldItem, ...item });
    }
  });
  return Array.from(map.values());
}

let __hasInitializedCloudDB = false;
async function initDatabaseListener() {
  if (__hasInitializedCloudDB) return;
  __hasInitializedCloudDB = true;

  // 1. Nạp ngay từ LocalStorage để giao diện hiển thị tức thì (0ms)
  try {
    const cached = localStorage.getItem('AMURO_IELTS_DB_BACKUP');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.users) db = parsed;
    }
  } catch (e) {}
  ensureArraysExist();
  if (activeUser) renderDashboard();

  window.addEventListener('storage', (e) => {
    if (e.key === 'AMURO_IELTS_DB_BACKUP' && e.newValue) {
      try {
        db = JSON.parse(e.newValue);
        ensureArraysExist();
        if (activeUser) renderDashboard();
      } catch (err) {}
    }
  });

  const firestore = getActiveFirestore();
  if (!firestore) {
    setSyncStatus('Local Active', true);
    return;
  }

  try {
    setSyncStatus('Loading Cloud Data...', false);

    // 2. Chỉ gọi .get() ĐÚNG 1 LẦN DUY NHẤT khi mở trang (Không dùng onSnapshot lặp)
    const [legacySnap, metaSnap, rSnap, lSnap, wSnap, resSnap] = await Promise.allSettled([
      firestore.collection('suite').doc('main_database').get(),
      firestore.collection('suite_meta').doc('core').get(),
      firestore.collection('suite_readingExams').get(),
      firestore.collection('suite_listeningExams').get(),
      firestore.collection('suite_writingExams').get(),
      firestore.collection('suite_results').get()
    ]);

    const legacyData = (legacySnap.status === 'fulfilled' && legacySnap.value.exists) ? (legacySnap.value.data() || {}) : {};
    const metaData   = (metaSnap.status === 'fulfilled' && metaSnap.value.exists) ? (metaSnap.value.data() || {}) : {};

    const deletedIds = metaData.deletedExamIds || legacyData.deletedExamIds || db.deletedExamIds || [];
    db.deletedExamIds = deletedIds;

    db.users = mergeRecordsById(legacyData.users || db.users, metaData.users || []);
    db.classes = mergeRecordsById(legacyData.classes || db.classes, metaData.classes || []);
    db.savedVocab = { ...(legacyData.savedVocab || {}), ...(db.savedVocab || {}), ...(metaData.savedVocab || {}) };
    db.aiConfig = (metaData.aiConfig && metaData.aiConfig.apiKey) ? metaData.aiConfig : (legacyData.aiConfig || db.aiConfig);
    db.milestoneProgress = { ...(legacyData.milestoneProgress || {}), ...(db.milestoneProgress || {}), ...(metaData.milestoneProgress || {}) };
    db.passedMilestones = { ...(legacyData.passedMilestones || {}), ...(db.passedMilestones || {}), ...(metaData.passedMilestones || {}) };

    const shardReading   = rSnap.status === 'fulfilled' ? rSnap.value.docs.map(d => d.data()) : [];
    const shardListening = lSnap.status === 'fulfilled' ? lSnap.value.docs.map(d => d.data()) : [];
    const shardWriting   = wSnap.status === 'fulfilled' ? wSnap.value.docs.map(d => d.data()) : [];
    const shardResults   = resSnap.status === 'fulfilled' ? resSnap.value.docs.map(d => d.data()) : [];

    db.readingExams   = mergeRecordsById(legacyData.readingExams || db.readingExams || [], shardReading, deletedIds);
    if (!db.readingExams.length) db.readingExams = [defaultShoppingExam];

    db.listeningExams = mergeRecordsById(legacyData.listeningExams || db.listeningExams || [], shardListening, deletedIds);
    db.writingExams   = mergeRecordsById(legacyData.writingExams || db.writingExams || [], shardWriting, deletedIds);
    db.results        = mergeRecordsById(legacyData.results || db.results || [], shardResults, []).sort((a, b) => {
      const ta = Number(String(a.id || '').replace(/\D/g, '')) || 0;
      const tb = Number(String(b.id || '').replace(/\D/g, '')) || 0;
      return ta - tb;
    });

    ensureArraysExist();
    try { localStorage.setItem('AMURO_IELTS_DB_BACKUP', JSON.stringify(db)); } catch (e) {}
    setSyncStatus('Cloud Real-Time Active', true);
    if (activeUser) renderDashboard();
  } catch (err) {
    console.warn('Cloud fetch fallback to local cache:', err);
    setSyncStatus('Local Cache Active', true);
  }
}

function isStudentInActiveExamRoom() {
  const shell = document.getElementById('examShell');
  return Boolean(shell && shell.style.display === 'flex' && !isReviewMode);
}

function saveProgressToLocalOnly() {
  try {
    if (activeExam && activeUser) {
      const draftKey = `AMURO_EXAM_DRAFT_${activeUser.username}_${activeExam.id}`;
      localStorage.setItem(draftKey, JSON.stringify({
        userAnswers: userAnswers || {},
        writingAnswers: writingAnswers || {},
        secondsRemaining: secondsRemaining,
        timestamp: Date.now()
      }));
    }
    localStorage.setItem('AMURO_IELTS_DB_BACKUP', JSON.stringify(db));
  } catch (e) {}
}

// Hàm persist() chuẩn: Không ghi vào main_database cũ bị đầy 1MB, và chặn ghi lên Cloud khi học sinh đang làm bài
async function persist(allowCloudWrite = false) {
  ensureArraysExist();
  saveProgressToLocalOnly();

  // Nếu học sinh đang trong phòng thi và chưa bấm Submit -> chỉ lưu LocalStorage, không gọi Firebase!
  if (isStudentInActiveExamRoom() && !allowCloudWrite && (!activeUser || activeUser.role === 'student')) {
    return;
  }

  const now = Date.now();
  if (!allowCloudWrite && (now - window.__AMURO_LAST_META_WRITE < 2000)) {
    return;
  }
  window.__AMURO_LAST_META_WRITE = now;

  const fs = getActiveFirestore();
  if (!fs) {
    setSyncStatus('Local Active', true);
    return;
  }

  try {
    await Promise.race([
      fs.collection('suite_meta').doc('core').set(cleanForFirestore({
        users: db.users || [],
        classes: db.classes || [],
        savedVocab: db.savedVocab || {},
        aiConfig: db.aiConfig || {},
        milestoneProgress: db.milestoneProgress || {},
        passedMilestones: db.passedMilestones || {},
        deletedExamIds: db.deletedExamIds || [],
        updatedAt: Date.now()
      }), { merge: true }),
      new Promise(res => setTimeout(res, 2500))
    ]);
    setSyncStatus('Cloud Real-Time Active', true);
  } catch (err) {
    console.warn('Meta sync warning:', err);
    setSyncStatus('Cloud Real-Time Active', true);
  }
}

/* 5. ĐĂNG NHẬP, PROFILE & DANH XƯNG TÙY CHỈNH (CUSTOM TITLE) */
function getDisplayRoleTitle(userObj) {
  if (!userObj) return '';
  const inDb = (db.users || []).find(u => u.id === userObj.id || u.username === userObj.username) || userObj;
  if (inDb.customTitle && String(inDb.customTitle).trim()) {
    return String(inDb.customTitle).trim();
  }
  return (inDb.role || 'student').toUpperCase();
}

function checkSession() {
  if (activeUser) {
    const latest = (db.users || []).find(u => u.id === activeUser.id || u.username === activeUser.username);
    if (latest) activeUser = latest;

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardApp').style.display = 'flex';
    document.getElementById('userProfileLabel').textContent = `👤 ${activeUser.name} (${getDisplayRoleTitle(activeUser)})`;
    document.querySelectorAll('.teacher-item').forEach(el => el.style.display = activeUser.role === 'teacher' ? '' : 'none');

    // Chỉ hiện 5 thẻ thống kê tổng quan cho Giáo viên
    const statGrid = document.querySelector('#tab-home .stat-grid');
    if (statGrid) statGrid.style.display = activeUser.role === 'teacher' ? 'grid' : 'none';

    renderDashboard();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardApp').style.display = 'none';
  }
}

function execLogin() {
  const u = document.getElementById('logUser').value.trim();
  const p = document.getElementById('logPass').value.trim();
  if (!u || !p) return alert('Please enter both username and password!');

  ensureArraysExist();
  let user = (db.users || []).find(x => x.username.toLowerCase() === u.toLowerCase() && String(x.pass).trim() === p);
  if (!user && u.toLowerCase() === 'amuro' && p === 'amuro123') {
    user = { id: 'u_admin', username: 'amuro', pass: 'amuro123', name: 'Teacher Amuro', role: 'teacher' };
    db.users.push(user);
    persist(true);
  }
  if (!user) return alert('Invalid username or password!');

  activeUser = user;
  sessionStorage.setItem('AMURO_CURRENT_USER', JSON.stringify(activeUser));
  document.getElementById('logUser').value = '';
  document.getElementById('logPass').value = '';
  switchDashTab('home');
  checkSession();
}

function execLogout() {
  activeUser = null;
  sessionStorage.removeItem('AMURO_CURRENT_USER');
  checkSession();
}

function openProfileModal() {
  const passGroup = document.getElementById('profPassInput')?.parentElement;
  if (passGroup && !document.getElementById('profCustomTitleInput')) {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `<label>Danh xưng hiển thị (Custom Title / Role)</label><input type="text" id="profCustomTitleInput" class="form-input" placeholder="VD: IELTS Fighter 8.0, Senior Examiner...">`;
    passGroup.parentNode.insertBefore(div, passGroup);
  }
  document.getElementById('profNameInput').value = activeUser.name || '';
  document.getElementById('profPassInput').value = '';
  if (document.getElementById('profCustomTitleInput')) {
    document.getElementById('profCustomTitleInput').value = activeUser.customTitle || '';
  }
  openModal('profileModal');
}

function saveProfileChanges() {
  const n = document.getElementById('profNameInput').value.trim();
  const p = document.getElementById('profPassInput').value.trim();
  const titleVal = document.getElementById('profCustomTitleInput') ? document.getElementById('profCustomTitleInput').value.trim() : '';
  if (!n) return alert('Name is required!');
  activeUser.name = n;
  if (p) activeUser.pass = p;
  activeUser.customTitle = titleVal;

  const target = (db.users || []).find(u => u.id === activeUser.id || u.username === activeUser.username);
  if (target) {
    target.name = n;
    if (p) target.pass = p;
    target.customTitle = titleVal;
  }
  persist(true);
  sessionStorage.setItem('AMURO_CURRENT_USER', JSON.stringify(activeUser));
  closeModal('profileModal');
  checkSession();
  alert('Profile updated!');
}

/* 6. GEMINI AI WRITING GRADER & XUẤT FILE WORD (.DOC) */
function getEffectiveGeminiKey() {
  return (db.aiConfig && db.aiConfig.apiKey) || localStorage.getItem('AMURO_GEMINI_API_KEY') || '';
}

function openAiConfigModal() {
  ensureArraysExist();
  document.getElementById('aiApiKeyInput').value = getEffectiveGeminiKey();
  document.getElementById('aiAutoGradeOnSubmit').checked = Boolean(db.aiConfig && db.aiConfig.autoGrade);
  document.getElementById('aiCustomInstructions').value = (db.aiConfig && db.aiConfig.customPrompt) || '';
  openModal('aiConfigModal');
}

function saveAiConfig() {
  ensureArraysExist();
  const key = document.getElementById('aiApiKeyInput').value.trim();
  const autoG = document.getElementById('aiAutoGradeOnSubmit').checked;
  const customP = document.getElementById('aiCustomInstructions').value.trim();

  db.aiConfig = { apiKey: key, autoGrade: autoG, customPrompt: customP };
  if (key) localStorage.setItem('AMURO_GEMINI_API_KEY', key);
  persist(true);
  closeModal('aiConfigModal');
  alert('AI Grader configuration saved!');
}

function buildIeltsExaminerPrompt(wExam, submission) {
  const hasT1 = Boolean(submission.task1 && submission.task1.trim());
  const hasT2 = Boolean(submission.task2 && submission.task2.trim());
  const t1Prompt = (wExam && wExam.task1 && wExam.task1.prompt) || 'Task 1 Academic Writing';
  const t2Prompt = (wExam && wExam.task2 && wExam.task2.prompt) || 'Task 2 Academic Essay';
  const customRule = (db.aiConfig && db.aiConfig.customPrompt) ? `\nAdditional Teacher Instructions: ${db.aiConfig.customPrompt}\n` : '';

  return `You are a certified Senior IELTS Writing Examiner. Evaluate the following student writing submission strictly according to the official IELTS Writing Band Descriptors (Task Achievement / Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
${customRule}
${hasT1 ? `--- WRITING TASK 1 ---\nPrompt: ${t1Prompt}\nStudent Response:\n${submission.task1}\n` : ''}
${hasT2 ? `--- WRITING TASK 2 ---\nPrompt: ${t2Prompt}\nStudent Response:\n${submission.task2}\n` : ''}

IMPORTANT FORMATTING RULE: Write the feedback in clean, readable PLAIN TEXT only. DO NOT use any Markdown symbols such as **, *, ###, ##, or ---. Use simple numbered lists (1., 2.), bullet points (•), and uppercase section headers (e.g., [1. TASK RESPONSE], [2. COHERENCE & COHESION], [3. LEXICAL RESOURCE], [4. GRAMMATICAL RANGE & ACCURACY], [5. KEY CORRECTIONS & UPGRADES]).

Return your evaluation in JSON format with two fields:
1. "band": string (e.g. "6.5" or "7.0" - overall band score rounded to nearest 0.5)
2. "feedback": string (Clean plain-text breakdown of the 4 criteria with individual band scores, specific grammar/lexical corrections using arrows like "old people" -> "the senior generation", and improvement tips).`;
}

function cleanMarkdownSymbols(text) {
  if (!text) return '';
  return String(text)
    .replace(/^#{1,6}\s*(.+)$/gm, '[$1]')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^-{3,}$/gm, '────────────────────────────────────────')
    .replace(/^\s*-\s+/gm, '• ');
}

function formatSmartFeedbackHtml(rawText) {
  if (!rawText) return '<span style="color:#94a3b8; font-style:italic;">Chưa có nhận xét cho bài viết này.</span>';
  let safe = String(rawText)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  safe = safe.replace(/\[([^\]]+)\]/g, '<div style="font-weight:800; color:#0f172a; margin-top:12px; margin-bottom:4px; font-size:14px;">[$1]</div>');
  safe = safe.replace(/([a-zA-Z0-9\s,.'"-]+)\s*(?:->|➔|➜|-->)\s*([a-zA-Z0-9\s,.'"-]+)/g, '<span class="smart-err-bad">$1</span> ➔ <span class="smart-err-good">$2</span>');
  return safe.replace(/\r?\n/g, '<br>');
}

async function callGeminiWritingEvaluator(wExam, submission) {
  const rawKeyStr = getEffectiveGeminiKey();
  if (!rawKeyStr) throw new Error('Missing Gemini API Key. Click "🤖 AI Grader Config" in the top header to add your key.');

  const apiKeys = rawKeyStr.split(/[,;\r\n]+/).map(k => k.trim()).filter(Boolean);
  const promptText = buildIeltsExaminerPrompt(wExam, submission);
  let activeModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKeys[0])}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const serverModels = (listData.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace('models/', ''))
        .filter(name => !name.includes('2.0') && !name.includes('vision'));
      const priority = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
      const matched = [];
      priority.forEach(p => { if (serverModels.includes(p)) matched.push(p); });
      serverModels.forEach(m => { if (m.includes('flash') && !matched.includes(m)) matched.push(m); });
      if (matched.length > 0) activeModels = matched;
    }
  } catch (e) {}

  let lastError = '';
  for (const currentKey of apiKeys) {
    for (const modelName of activeModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(currentKey)}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          lastError = `[${modelName}] ${await response.text()}`;
          continue;
        }
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
        return {
          band: String(parsed.band || parsed.overallBand || '6.0').replace('Band', '').trim(),
          feedback: cleanMarkdownSymbols(parsed.feedback || rawText)
        };
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err.name === 'AbortError' ? `Timeout on ${modelName}` : err.message;
      }
    }
  }
  throw new Error(`Gemini API Error: ${lastError}`);
}

async function runAiWritingEvaluation() {
  const resId = document.getElementById('gradeSubmissionId').value;
  const res = (db.results || []).find(r => r.id === resId);
  if (!res || !res.writingSubmission) return;

  const btn = document.getElementById('btnRunAiGrade');
  const origText = btn.innerHTML;
  btn.innerHTML = '⏳ AI Grading...';
  btn.disabled = true;

  try {
    const wExam = (db.writingExams || []).find(w => w.id === res.examId) || {};
    const evaluation = await callGeminiWritingEvaluator(wExam, res.writingSubmission);
    document.getElementById('gradeBandInput').value = `Band ${evaluation.band}`;
    document.getElementById('gradeFeedbackInput').value = evaluation.feedback;
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

function copyEssayPromptForGemini() {
  const resId = document.getElementById('gradeSubmissionId').value;
  const res = (db.results || []).find(r => r.id === resId);
  if (!res || !res.writingSubmission) return;
  const wExam = (db.writingExams || []).find(w => w.id === res.examId) || {};
  const text = buildIeltsExaminerPrompt(wExam, res.writingSubmission);
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied full IELTS Examiner prompt & student essay to clipboard!');
  });
}

window.exportWritingFeedbackToDoc = function(resId) {
  const targetId = resId || document.getElementById('gradeSubmissionId')?.value;
  const res = (db.results || []).find(r => r.id === targetId);
  if (!res) return alert('Không tìm thấy dữ liệu bài viết!');
  const wExam = (db.writingExams || []).find(w => w.id === res.examId) || {};

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${res.examTitle}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color:#064e3b; border-bottom:2px solid #059669; padding-bottom:6px;">IELTS WITH AMURO - WRITING EVALUATION REPORT</h2>
      <p><b>Student:</b> ${res.userName} &nbsp;|&nbsp; <b>Date:</b> ${res.timestamp}</p>
      <p><b>Assessment:</b> ${res.examTitle} &nbsp;|&nbsp; <b>Overall Score:</b> <span style="color:#059669; font-weight:bold;">${res.band}</span> (${res.score})</p>
      <hr>
      ${res.writingSubmission?.task1 ? `<h3>WRITING TASK 1</h3><p><i>Prompt: ${(wExam.task1 && wExam.task1.prompt) || ''}</i></p><div style="background:#f8fafc; padding:12px; border:1px solid #cbd5e1; white-space:pre-wrap;">${res.writingSubmission.task1}</div>` : ''}
      ${res.writingSubmission?.task2 ? `<h3>WRITING TASK 2</h3><p><i>Prompt: ${(wExam.task2 && wExam.task2.prompt) || ''}</i></p><div style="background:#f8fafc; padding:12px; border:1px solid #cbd5e1; white-space:pre-wrap;">${res.writingSubmission.task2}</div>` : ''}
      <h3>EXAMINER / AI FEEDBACK</h3>
      <div style="background:#f0fdf4; padding:14px; border:1px solid #86efac;">${formatSmartFeedbackHtml(res.teacherFeedback || '')}</div>
    </body></html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `IELTS_Writing_${String(res.userName || 'Student').replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* 7. QUẢN LÝ DASHBOARD, BẢNG ĐỀ THI & PHÂN TRANG 10 ĐỀ/TRANG */
function switchDashTab(tab) {
  document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.dash-pane').forEach(p => p.style.display = 'none');

  const targetBtn = document.getElementById('tabbtn-' + tab);
  const targetPane = document.getElementById('tab-' + tab);
  if (targetBtn) targetBtn.classList.add('active');
  if (targetPane) targetPane.style.display = 'block';

  renderDashboard();
}

function getVisibleExams(examList) {
  if (!activeUser) return [];
  if (activeUser.role === 'teacher') return examList || [];
  return (examList || []).filter(e => {
    if (!e.assignedClasses || e.assignedClasses.length === 0) return true;
    return e.assignedClasses.includes(activeUser.classId);
  });
}

function getExamTimestamp(exam, index = 0) {
  if (exam.createdAt) return Number(exam.createdAt);
  const match = String(exam.id || '').match(/(\d{13})/);
  if (match) return Number(match[1]);
  return 1700000000000 + index;
}

function getExamSubmissionCount(examId, examTitle) {
  return (db.results || []).filter(r => r.examId === examId || r.examTitle === examTitle).length;
}

function getDifficultyWeight(diff) {
  if (diff === 'Easy') return 1;
  if (diff === 'Hard') return 3;
  return 2;
}

function sortExamList(list, sortMode) {
  const arr = list.slice();
  if (sortMode === 'newest') return arr.sort((a, b) => getExamTimestamp(b, arr.indexOf(b)) - getExamTimestamp(a, arr.indexOf(a)));
  if (sortMode === 'popular') return arr.sort((a, b) => getExamSubmissionCount(b.id, b.title) - getExamSubmissionCount(a.id, a.title));
  if (sortMode === 'diff_asc') return arr.sort((a, b) => getDifficultyWeight(a.difficulty) - getDifficultyWeight(b.difficulty));
  if (sortMode === 'diff_desc') return arr.sort((a, b) => getDifficultyWeight(b.difficulty) - getDifficultyWeight(a.difficulty));
  if (sortMode === 'az') return arr.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  return arr;
}

function renderSmartBadges(exam, isNewestItem) {
  const subCount = getExamSubmissionCount(exam.id, exam.title);
  const diff = exam.difficulty || 'Standard';
  const isRecent = (Date.now() - getExamTimestamp(exam)) < 7 * 24 * 3600 * 1000;
  const newBadge = (isNewestItem || isRecent) ? `<span class="badge-new">🆕 NEW</span>` : '';
  const popBadge = `<span class="badge-pop">👥 ${subCount} lượt làm</span>`;
  const diffIcon = diff === 'Easy' ? '🟢' : (diff === 'Hard' ? '🔴' : '🔵');
  const diffBadge = `<span class="badge-diff-${diff}">${diffIcon} ${diff}</span>`;
  return `${newBadge}${diffBadge}${popBadge}`;
}

window.setExamCatalogPage = function(skillKey, pageNum) {
  examPageTrackers[skillKey] = pageNum;
  if (skillKey === 'reading') renderReadingTable();
  else if (skillKey === 'listening') renderListeningTable();
  else if (skillKey === 'writing') renderWritingTable();
};

function renderPaginationControls(skillKey, totalItems, tbodyEl) {
  const tableEl = tbodyEl ? tbodyEl.closest('table') : null;
  if (!tableEl || !tableEl.parentElement) return;
  let pagerBox = document.getElementById(`pager_${skillKey}`);
  if (!pagerBox) {
    pagerBox = document.createElement('div');
    pagerBox.id = `pager_${skillKey}`;
    pagerBox.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:10px;';
    tableEl.parentElement.appendChild(pagerBox);
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / EXAM_PAGE_SIZE));
  if (examPageTrackers[skillKey] > totalPages) examPageTrackers[skillKey] = totalPages;
  const curPage = examPageTrackers[skillKey] || 1;

  if (totalItems <= EXAM_PAGE_SIZE) {
    pagerBox.innerHTML = `<span style="font-size:12.5px; color:#64748b; font-weight:600;">Hiển thị toàn bộ ${totalItems} đề thi</span>`;
    return;
  }

  let btnsHtml = '';
  for (let p = 1; p <= totalPages; p++) {
    const active = p === curPage;
    btnsHtml += `<button type="button" class="btn ${active ? 'btn-emerald' : 'btn-secondary'}" style="padding:5px 12px; font-size:12px;" onclick="setExamCatalogPage('${skillKey}', ${p})">${p}</button>`;
  }
  pagerBox.innerHTML = `
    <span style="font-size:12.5px; color:#64748b; font-weight:600;">Trang <b>${curPage} / ${totalPages}</b> (Tổng ${totalItems} đề)</span>
    <div style="display:flex; gap:6px; flex-wrap:wrap;">${btnsHtml}</div>
  `;
}

function renderDashboard() {
  if (!activeUser) return;
  ensureArraysExist();
  renderHomeTab();
  renderReadingTable();
  renderListeningTable();
  renderWritingTable();
  renderMySavedVocab();
  if (activeUser.role === 'teacher') {
    renderClassTable();
    renderStudentTable();
    renderAnalyticsTable();
  }
}

function detectResultSkillType(res) {
  if (!res) return 'reading';
  if (String(res.examId || '').startsWith('vq_') || String(res.examTitle || '').includes('Vocabulary Review')) return 'quiz';
  if (res.writingSubmission || String(res.id || '').startsWith('res_w_') || (db.writingExams || []).some(w => w.id === res.examId)) return 'writing';
  if ((db.listeningExams || []).some(l => l.id === res.examId) || String(res.examId || '').startsWith('le_')) return 'listening';
  return 'reading';
}

window.setHomeSkillFilter = function(skillKey) {
  currentHomeSkillFilter = skillKey;
  renderHomeTab();
};

function renderHomeTab() {
  if (!activeUser) return;
  const elWelcome = document.getElementById('homeWelcomeTitle');
  if (elWelcome) elWelcome.textContent = `Welcome back, ${activeUser.name}!`;

  const elRead = document.getElementById('statReadingCount');
  if (elRead) elRead.textContent = getVisibleExams(db.readingExams).length;
  const elLis = document.getElementById('statListeningCount');
  if (elLis) elLis.textContent = getVisibleExams(db.listeningExams).length;
  const elWrite = document.getElementById('statWritingCount');
  if (elWrite) elWrite.textContent = getVisibleExams(db.writingExams).length;
  const savedCount = (db.savedVocab && db.savedVocab[activeUser.username]) ? db.savedVocab[activeUser.username].length : 0;
  const elVocab = document.getElementById('statVocabCount');
  if (elVocab) elVocab.textContent = savedCount;
  const elSub = document.getElementById('statSubmissionsCount');
  if (elSub) elSub.textContent = (db.results || []).length;

  renderStudentSkillTrackerAndMilestone();

  const tbody = document.getElementById('homeRecentActivityTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let userRecents = (db.results || []).slice().reverse();
  if (activeUser.role === 'student') {
    userRecents = userRecents.filter(r => String(r.userName || '').toLowerCase() === String(activeUser.name || '').toLowerCase());
  }
  const counts = { all: userRecents.length, reading: 0, listening: 0, writing: 0, quiz: 0 };
  userRecents.forEach(r => {
    const k = detectResultSkillType(r);
    if (counts[k] !== undefined) counts[k]++;
  });

  const tableEl = tbody.closest('table');
  if (tableEl && tableEl.parentElement) {
    let filterBar = document.getElementById('homeSubmissionFilterBar');
    if (!filterBar) {
      filterBar = document.createElement('div');
      filterBar.id = 'homeSubmissionFilterBar';
      filterBar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;';
      tableEl.parentElement.insertBefore(filterBar, tableEl);
    }
    const tabs = [
      { key: 'all', label: `📋 Tất cả (${counts.all})` },
      { key: 'reading', label: `📖 Reading (${counts.reading})` },
      { key: 'listening', label: `🎧 Listening (${counts.listening})` },
      { key: 'writing', label: `✍️ Writing (${counts.writing})` },
      { key: 'quiz', label: `🎯 Vocab Quiz (${counts.quiz})` }
    ];
    filterBar.innerHTML = tabs.map(t => {
      const active = currentHomeSkillFilter === t.key;
      return `<button type="button" onclick="setHomeSkillFilter('${t.key}')"
        style="border:1px solid ${active ? '#2d4a3e' : '#cbd5e1'}; background:${active ? '#2d4a3e' : '#f8fafc'};
        color:${active ? '#ffffff' : '#334155'}; padding:6px 14px; border-radius:999px; font-size:12.5px; font-weight:700; cursor:pointer; transition:0.15s;">
        ${t.label}
      </button>`;
    }).join('');
  }

  const filteredList = userRecents.filter(r => currentHomeSkillFilter === 'all' || detectResultSkillType(r) === currentHomeSkillFilter).slice(0, 15);
  if (!filteredList.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Chưa có bài làm nào trong mục này.</td></tr>`;
    return;
  }

  filteredList.forEach(r => {
    const skillType = detectResultSkillType(r);
    const isWriting = (skillType === 'writing');
    const isQuiz = (skillType === 'quiz');
    let actionBtn = '';
    if (isWriting) {
      if (activeUser.role === 'teacher') {
        actionBtn = `<button class="btn btn-emerald" onclick="openGradeWritingModal('${r.id}')">✏️ Evaluate</button>`;
      } else {
        const hasFb = r.teacherFeedback && r.teacherFeedback.trim() !== '';
        actionBtn = `<button class="btn ${hasFb ? 'btn-emerald' : 'btn-secondary'}" onclick="openStudentViewWritingModal('${r.id}')">${hasFb ? '💬 View Feedback' : '👁️ View Essay'}</button>`;
      }
    } else if (isQuiz) {
      actionBtn = `<span style="color:#64748b; font-size:12px; font-weight:700;">🎯 Milestone Quiz</span>`;
    } else {
      actionBtn = `<button class="btn btn-secondary" onclick="reopenReviewFromHistory('${r.id}')">🔍 Review Keys</button>`;
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${r.userName}</b></td>
      <td>${r.examTitle}</td>
      <td>${r.score}</td>
      <td><b style="color:var(--emerald-accent);">${String(r.band).startsWith('Band') || r.band === 'PASSED' || r.band === 'RETRY' ? r.band : 'Band ' + r.band}</b></td>
      <td><span style="color:#64748b; font-size:12px;">${r.timestamp}</span></td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReadingTable() {
  renderStudentSkillTrackerAndMilestone();
  const tbody = document.getElementById('readingTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchKw = (document.getElementById('filterReadingSearch')?.value || '').toLowerCase().trim();
  const partFilter = document.getElementById('filterReadingPart')?.value || 'ALL';
  const topicKw = (document.getElementById('filterReadingTopic')?.value || '').toLowerCase().trim();
  const sortMode = document.getElementById('sortReadingSelect')?.value || 'newest';

  let list = getVisibleExams(db.readingExams || []).filter(e => {
    const hay = `${e.title || ''} ${e.topic || ''} ${e.category || ''}`.toLowerCase();
    const matchSearch = !searchKw || hay.includes(searchKw);
    const matchTopic = !topicKw || hay.includes(topicKw);
    const matchPart = !partFilter || partFilter === 'ALL' || (e.category || 'Full Test') === partFilter;
    return matchSearch && matchTopic && matchPart;
  });

  list = sortExamList(list, sortMode);
  renderPaginationControls('reading', list.length, tbody);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:18px;">No matching reading tests found.</td></tr>`;
    return;
  }

  const curPage = examPageTrackers.reading || 1;
  const pagedList = list.slice((curPage - 1) * EXAM_PAGE_SIZE, curPage * EXAM_PAGE_SIZE);
  const completedIds = getStudentCompletedExamIds('reading');
  const st = getMilestoneQuizStatus();

  pagedList.forEach((e, idx) => {
    const clsNames = (!e.assignedClasses || e.assignedClasses.length === 0)
      ? 'All Classes'
      : e.assignedClasses.map(cid => (db.classes.find(c => c.id === cid) || {}).name).filter(Boolean).join(', ');
    const catBadge = e.category ? `<span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin-right:6px;">${e.category}</span>` : '';
    const topBadge = e.topic ? `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">🏷️ ${e.topic}</span>` : '';
    const smartBadges = renderSmartBadges(e, sortMode === 'newest' && curPage === 1 && idx === 0);
    const isDone = completedIds.includes(e.id);
    const isLockedForStudent = st.locked && !isDone;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="margin-bottom:4px;"><b>${e.title}</b> ${isDone ? '<span style="color:#059669; font-size:12px; font-weight:800;">✓ Done</span>' : ''}</div>
        <div>${smartBadges}${catBadge}${topBadge}</div>
      </td>
      <td>${e.duration} mins</td>
      <td>${e.passages ? e.passages.length : 1} Passage(s)</td>
      <td><span style="color: #64748b; font-weight:600;">${clsNames}</span></td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn ${isLockedForStudent ? 'btn-locked' : 'btn-emerald'}" onclick="launchExam('${e.id}')">
          ${isLockedForStudent ? '🔒 Locked (Làm Vocab Quiz)' : 'Start Test'}
        </button>
        <button class="btn btn-secondary" onclick="openStudyVocabModal('${e.id}')">Vocabulary</button>
        ${activeUser && activeUser.role === 'teacher' ? `
          <button class="btn btn-secondary" onclick="openEditExamModal('${e.id}')">Edit</button>
          <button class="btn btn-secondary" onclick="openAssignModal('${e.id}', 'reading')">Assign</button>
          <button class="btn btn-danger" onclick="deleteExam('${e.id}', 'reading')">Delete</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderListeningTable() {
  const tbody = document.getElementById('listeningTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchKw = (document.getElementById('filterListeningSearch')?.value || '').toLowerCase().trim();
  const partFilter = document.getElementById('filterListeningPart')?.value || 'ALL';
  const topicKw = (document.getElementById('filterListeningTopic')?.value || '').toLowerCase().trim();
  const sortMode = document.getElementById('sortListeningSelect')?.value || 'newest';

  let list = getVisibleExams(db.listeningExams || []).filter(e => {
    const hay = `${e.title || ''} ${e.topic || ''} ${e.category || ''}`.toLowerCase();
    const matchSearch = !searchKw || hay.includes(searchKw);
    const matchTopic = !topicKw || hay.includes(topicKw);
    const matchPart = !partFilter || partFilter === 'ALL' || (e.category || 'Listening Full') === partFilter;
    return matchSearch && matchTopic && matchPart;
  });

  list = sortExamList(list, sortMode);
  renderPaginationControls('listening', list.length, tbody);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:18px;">No listening tests available.</td></tr>`;
    return;
  }

  const curPage = examPageTrackers.listening || 1;
  const pagedList = list.slice((curPage - 1) * EXAM_PAGE_SIZE, curPage * EXAM_PAGE_SIZE);
  const completedIds = getStudentCompletedExamIds('listening');

  pagedList.forEach((e, idx) => {
    const clsNames = (!e.assignedClasses || e.assignedClasses.length === 0) ? 'All Classes' : e.assignedClasses.map(cid => (db.classes.find(c => c.id === cid) || {}).name).filter(Boolean).join(', ');
    const catBadge = `<span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin-right:6px;">${e.category || 'Listening'}</span>`;
    const topBadge = e.topic ? `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin-right:6px;">🏷️ ${e.topic}</span>` : '';
    const smartBadges = renderSmartBadges(e, sortMode === 'newest' && curPage === 1 && idx === 0);
    const partCount = e.passages ? e.passages.length : 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <b>${e.title}</b> ${completedIds.includes(e.id) ? '<span style="color:#059669; font-size:12px; font-weight:800;">✓ Done</span>' : ''}
        <div style="margin-top:4px;">${smartBadges}${catBadge}${topBadge}</div>
      </td>
      <td>${e.duration} mins</td>
      <td>${partCount} Part(s)</td>
      <td><span style="color: #64748b; font-weight:600;">${clsNames}</span></td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-emerald" onclick="launchListeningExam('${e.id}')">Start Listening</button>
        ${activeUser && activeUser.role === 'teacher' ? `
          <button class="btn btn-secondary" onclick="openEditListeningModal('${e.id}')">Edit</button>
          <button class="btn btn-secondary" onclick="openAssignModal('${e.id}', 'listening')">Assign</button>
          <button class="btn btn-danger" onclick="deleteExam('${e.id}', 'listening')">Delete</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWritingTable() {
  const tbody = document.getElementById('writingTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchKw = (document.getElementById('filterWritingSearch')?.value || '').toLowerCase().trim();
  const partFilter = document.getElementById('filterWritingPart')?.value || 'ALL';
  const topicKw = (document.getElementById('filterWritingTopic')?.value || '').toLowerCase().trim();
  const sortMode = document.getElementById('sortWritingSelect')?.value || 'newest';

  let list = getVisibleExams(db.writingExams || []).filter(w => {
    const hasT1 = Boolean(w.task1 && w.task1.prompt);
    const hasT2 = Boolean(w.task2 && w.task2.prompt);
    const wType = (hasT1 && hasT2) ? 'Full Writing' : (hasT1 ? 'Task 1 Only' : 'Task 2 Only');
    const hay = `${w.title || ''} ${w.topic || ''} ${w.task1?.prompt || ''} ${w.task2?.prompt || ''}`.toLowerCase();
    const matchSearch = !searchKw || hay.includes(searchKw);
    const matchTopic = !topicKw || hay.includes(topicKw);
    const matchPart = !partFilter || partFilter === 'ALL' || wType === partFilter;
    return matchSearch && matchTopic && matchPart;
  });

  list = sortExamList(list, sortMode);
  renderPaginationControls('writing', list.length, tbody);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:18px;">No matching writing tests found.</td></tr>`;
    return;
  }

  const curPage = examPageTrackers.writing || 1;
  const pagedList = list.slice((curPage - 1) * EXAM_PAGE_SIZE, curPage * EXAM_PAGE_SIZE);
  const completedIds = getStudentCompletedExamIds('writing');

  pagedList.forEach((w, idx) => {
    const hasT1 = Boolean(w.task1 && w.task1.prompt);
    const hasT2 = Boolean(w.task2 && w.task2.prompt);
    const taskLabel = (hasT1 && hasT2) ? 'Task 1 & Task 2' : (hasT1 ? 'Task 1 Only' : 'Task 2 Only');
    const topBadge = w.topic ? `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin-right:6px;">🏷️ ${w.topic}</span>` : '';
    const smartBadges = renderSmartBadges(w, sortMode === 'newest' && curPage === 1 && idx === 0);
    const clsNames = (!w.assignedClasses || w.assignedClasses.length === 0)
      ? 'All Classes'
      : w.assignedClasses.map(cid => (db.classes.find(c => c.id === cid) || {}).name).filter(Boolean).join(', ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <b>${w.title}</b> ${completedIds.includes(w.id) ? '<span style="color:#059669; font-size:12px; font-weight:800;">✓ Done</span>' : ''}
        <div style="margin-top:4px;">${smartBadges}${topBadge}</div>
      </td>
      <td>${w.duration} mins</td>
      <td><span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:700;">${taskLabel}</span></td>
      <td><span style="color: #64748b; font-weight:600;">${clsNames}</span></td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-emerald" onclick="launchWritingExam('${w.id}')">Start Writing</button>
        ${activeUser && activeUser.role === 'teacher' ? `
          <button class="btn btn-secondary" onclick="openEditWritingModal('${w.id}')">Edit</button>
          <button class="btn btn-secondary" onclick="openAssignModal('${w.id}', 'writing')">Assign</button>
          <button class="btn btn-danger" onclick="deleteExam('${w.id}', 'writing')">Delete</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* 8. HỆ THỐNG HỌC TỪ VỰNG (HIGHLIGHT THÔNG MINH & PHÁT ÂM BẢN XỨ) */
function escapeRegex(string) {
  return String(string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

window.speakVocabWord = function(rawWordText, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  if (!('speechSynthesis' in window)) return;
  const cleanWord = String(rawWordText || '').replace(/\([^)]*\)/g, '').trim();
  if (!cleanWord) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(cleanWord);
  utter.lang = 'en-GB';
  utter.rate = 0.92;
  window.speechSynthesis.speak(utter);
};

let currentVocabStudyExam = null;
let currentVocabStudyPassageIdx = 0;

function openStudyVocabModal(examId, passageIdx = 0) {
  const exam = (db.readingExams || []).find(e => e.id === examId);
  if (!exam || !exam.passages || !exam.passages.length) return alert('No passage data found.');
  currentVocabStudyExam = exam;
  currentVocabStudyPassageIdx = passageIdx;
  renderStudyVocabPassageByIndex(passageIdx);
  openModal('studyVocabModal');
}

function renderStudyVocabPassageByIndex(pIdx) {
  if (!currentVocabStudyExam) return;
  currentVocabStudyPassageIdx = pIdx;
  const passages = currentVocabStudyExam.passages || [];
  const p = passages[pIdx] || passages[0];

  const titleEl = document.getElementById('studyVocabModalTitle');
  if (titleEl) {
    titleEl.style.display = 'flex';
    titleEl.style.alignItems = 'center';
    titleEl.style.gap = '14px';
    titleEl.style.flexWrap = 'wrap';
    titleEl.innerHTML = `
      <span>Vocabulary Study: ${currentVocabStudyExam.title}</span>
      ${passages.length > 1 ? `
        <div style="display:inline-flex; gap:6px; background:#e2e8f0; padding:4px; border-radius:8px;">
          ${passages.map((item, idx) => {
            const active = idx === pIdx;
            const vCount = (item.vocab || []).length;
            return `<button type="button" onclick="renderStudyVocabPassageByIndex(${idx})" 
              style="border:none; padding:5px 12px; border-radius:6px; font-size:12px; font-weight:800; cursor:pointer;
              background:${active ? '#2d4a3e' : '#ffffff'}; color:${active ? '#ffffff' : '#334155'};">
              Passage ${item.partNum || (idx + 1)} (${vCount} từ)
            </button>`;
          }).join('')}
        </div>
      ` : ''}
    `;
  }

  const passagePane = document.getElementById('modalVocabPassagePane');
  if (passagePane) {
    passagePane.innerHTML = p.passageHtml || '<p style="color:#94a3b8;">No passage text recorded.</p>';
    passagePane.scrollTop = 0;
  }

  const cardsPane = document.getElementById('modalVocabCardsPane');
  if (cardsPane) {
    const vocabList = p.vocab || [];
    if (!vocabList.length) {
      cardsPane.innerHTML = `<p style="color:#64748b; font-style:italic; padding:12px;">Chưa có từ vựng nào cho Passage ${p.partNum || (pIdx + 1)}.</p>`;
    } else {
      cardsPane.innerHTML = vocabList.map(v => {
        const safeW = (v.word || '').replace(/'/g, "");
        return `
          <div style="background:#fff; border:1px solid var(--inspera-border); border-radius:10px; padding:12px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:var(--emerald-accent); font-size:15px;">
                ${v.word} <small style="color:#64748b;">(${v.type || 'vocab'})</small>
                <button type="button" onclick="speakVocabWord('${safeW}', event)" style="border:none; background:#eef2eb; color:#2d4a3e; border-radius:50%; width:24px; height:24px; cursor:pointer; margin-left:4px;" title="Phát âm">🔊</button>
              </span>
              <button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="saveToMyVault('${safeW}', '${(v.mean || '').replace(/'/g,"")}', '${(v.syn || '').replace(/'/g,"")}', '${(currentVocabStudyExam.title || '').replace(/'/g,"")} (P${pIdx + 1})')">⭐ Save</button>
            </div>
            <div style="font-size:13px; margin:4px 0;">${v.mean || ''}</div>
            <div style="font-size:11.5px; color:#64748b;">Synonyms: <b>${v.syn || 'N/A'}</b></div>
            <button class="btn btn-emerald" style="margin-top:6px; padding:4px 8px; font-size:11px; width:100%;" onclick="spotVocabWordInModal('${safeW}')">🔍 Highlight in Passage</button>
          </div>
        `;
      }).join('');
    }
    cardsPane.scrollTop = 0;
  }
}

function buildStemVocabPattern(rawWord) {
  const clean = String(rawWord || '').replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/[^a-zA-Z0-9\s'-]/g, ' ').trim();
  if (!clean) return null;
  const tokens = clean.split(/\s+/).filter(Boolean);
  const stopWords = new Set(['a', 'an', 'the', 'to', 'be', 'sb', 'sth', 'one', 'ones', 'someone', 'something']);
  const coreTokens = tokens.filter(t => !stopWords.has(t.toLowerCase()));
  const targetTokens = coreTokens.length ? coreTokens : tokens;

  const tokenRegexes = targetTokens.map(tok => {
    const low = tok.toLowerCase();
    let root = low;
    if (low.length >= 6) {
      if (low.endsWith('ation') || low.endsWith('ition')) root = low.slice(0, -3);
      else if (low.endsWith('ment') || low.endsWith('ness') || low.endsWith('able') || low.endsWith('ible')) root = low.slice(0, -4);
      else if (low.endsWith('ing') || low.endsWith('ied') || low.endsWith('ies')) root = low.slice(0, -3);
      else if (low.endsWith('ed') || low.endsWith('es') || low.endsWith('er') || low.endsWith('ly')) root = low.slice(0, -2);
      else if (low.endsWith('e') || low.endsWith('y') || low.endsWith('s')) root = low.slice(0, -1);
    }
    return `${escapeRegex(root)}[a-zA-Z']*`;
  });

  const gap = '(?:\\s+|\\s*<[^>]+>\\s*|\\s+[a-zA-Z0-9\'-]+\\s+){1,4}?';
  return new RegExp(`(${tokenRegexes.join(gap)})`, 'i');
}

function spotVocabWordInModal(word) {
  const pPane = document.getElementById('modalVocabPassagePane');
  if (!pPane) return;
  pPane.querySelectorAll('.evidence-highlight-active').forEach(el => { el.outerHTML = el.innerHTML; });

  const rx = buildStemVocabPattern(word);
  if (rx && rx.test(pPane.innerHTML)) {
    pPane.innerHTML = pPane.innerHTML.replace(rx, `<span class="evidence-highlight-active" id="activeModalVocabSpot">$1</span>`);
    document.getElementById('activeModalVocabSpot')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    alert(`Không tìm thấy trực tiếp cụm "${word}" trong Passage này.`);
  }
}

function saveToMyVault(word, mean, syn, passageTitle) {
  if (!db.savedVocab) db.savedVocab = {};
  if (!db.savedVocab[activeUser.username]) db.savedVocab[activeUser.username] = [];
  const list = db.savedVocab[activeUser.username];
  if (list.some(x => x.word.toLowerCase() === word.toLowerCase())) return alert('Word already in your Vault!');
  list.push({ word, mean, syn, passageTitle });
  persist(true);
  renderHomeTab();
  alert(`Word "${word}" saved to your vault!`);
}

function renderMySavedVocab() {
  const box = document.getElementById('mySavedVocabList');
  if (!box || !activeUser) return;
  const list = (db.savedVocab && db.savedVocab[activeUser.username]) || [];
  if (!list.length) {
    box.innerHTML = `<p style="color:#64748b; font-style:italic;">No saved words yet.</p>`;
    return;
  }
  box.innerHTML = list.map((item, idx) => `
    <div style="background:#fff; border:1px solid var(--inspera-border); border-radius:12px; padding:14px; position:relative;">
      <div style="font-weight:700; color:var(--emerald-accent); font-size:16px;">
        ${item.word}
        <button type="button" onclick="speakVocabWord('${String(item.word || '').replace(/'/g, "")}', event)" style="border:none; background:#eef2eb; color:#2d4a3e; border-radius:50%; width:24px; height:24px; cursor:pointer; margin-left:4px;">🔊</button>
      </div>
      <div style="font-size:13px; margin:6px 0;">${item.mean}</div>
      <div style="font-size:12px; color:#64748b; margin-bottom:6px;">Synonyms: <b>${item.syn || 'N/A'}</b></div>
      <button class="btn btn-danger" style="padding:2px 8px; font-size:10px; position:absolute; top:12px; right:12px;" onclick="db.savedVocab['${activeUser.username}'].splice(${idx},1); persist(true); renderMySavedVocab(); renderHomeTab();">Delete</button>
    </div>
  `).join('');
}

/* 9. QUẢN LÝ LỚP HỌC, HỌC SINH PRO & ANALYTICS */
function isStudentPro(userObj = activeUser) {
  if (!userObj) return false;
  if (userObj.role === 'teacher') return true;
  const latestInDb = (db.users || []).find(u => u.id === userObj.id || u.username === userObj.username);
  return Boolean((latestInDb && latestInDb.isPro) || userObj.isPro);
}

window.toggleStudentProStatus = function(userId) {
  const stu = (db.users || []).find(u => u.id === userId);
  if (!stu) return;
  stu.isPro = !stu.isPro;
  persist(true);
  renderStudentTable();
  alert(`Đã chuyển tài khoản "${stu.name}" sang chế độ: ${stu.isPro ? '👑 PRO (Mở khóa toàn bộ tính năng VIP)' : '👤 Standard'}!`);
};

window.openClassProgressModal = function(classId) {
  const cls = (db.classes || []).find(c => c.id === classId);
  if (!cls) return;
  let modal = document.getElementById('classProgressDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'classProgressDetailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-window" style="width:940px; max-height:88vh;">
        <div class="modal-header">
          <span id="classProgressModalTitle">👥 Danh sách & Tiến độ Lớp</span>
          <button class="btn btn-secondary" onclick="closeModal('classProgressDetailModal')">✕ Đóng</button>
        </div>
        <div class="modal-body" id="classProgressModalBody" style="padding:20px; overflow-y:auto;"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const students = (db.users || []).filter(u => u.role === 'student' && u.classId === classId);
  const rTotal = (db.readingExams || []).filter(e => !e.assignedClasses || !e.assignedClasses.length || e.assignedClasses.includes(classId)).length;
  const lTotal = (db.listeningExams || []).filter(e => !e.assignedClasses || !e.assignedClasses.length || e.assignedClasses.includes(classId)).length;
  const wTotal = (db.writingExams || []).filter(e => !e.assignedClasses || !e.assignedClasses.length || e.assignedClasses.includes(classId)).length;
  document.getElementById('classProgressModalTitle').innerHTML = `🏫 Lớp: <span style="color:var(--emerald-accent);">${cls.name}</span> (${students.length} học sinh)`;
  const body = document.getElementById('classProgressModalBody');
  if (!students.length) {
    body.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-weight:600;">Lớp này hiện chưa có học sinh nào.</div>`;
  } else {
    body.innerHTML = `
      <div style="margin-bottom:14px; font-size:13px; color:#475569; background:#f8fafc; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0;">
        Tổng số đề giao cho lớp: <b>📖 ${rTotal} Reading</b> &nbsp;•&nbsp; <b>🎧 ${lTotal} Listening</b> &nbsp;•&nbsp; <b>✍️ ${wTotal} Writing</b>
      </div>
      <table>
        <thead>
          <tr><th>Học sinh</th><th>Username</th><th>📖 Reading</th><th>🎧 Listening</th><th>✍️ Writing</th><th>Tổng bài nộp</th><th>Hoạt động gần nhất</th></tr>
        </thead>
        <tbody>
          ${students.map(st => {
            const stuRes = (db.results || []).filter(r => String(r.userName || '').toLowerCase() === String(st.name || '').toLowerCase());
            const rDone = new Set(stuRes.filter(r => detectResultSkillType(r) === 'reading').map(r => r.examId)).size;
            const lDone = new Set(stuRes.filter(r => detectResultSkillType(r) === 'listening').map(r => r.examId)).size;
            const wDone = new Set(stuRes.filter(r => detectResultSkillType(r) === 'writing').map(r => r.examId)).size;
            const latest = stuRes.length ? stuRes[stuRes.length - 1] : null;
            return `
              <tr>
                <td><b>${st.name}</b> ${st.isPro ? '<span style="color:#d97706; font-size:11px; font-weight:800;">👑 PRO</span>' : ''}</td>
                <td><code>${st.username}</code></td>
                <td><b style="color:#059669;">${rDone}/${rTotal}</b></td>
                <td><b style="color:#2563eb;">${lDone}/${lTotal}</b></td>
                <td><b style="color:#d97706;">${wDone}/${wTotal}</b></td>
                <td><span style="background:#ecfdf5; color:#047857; padding:2px 8px; border-radius:99px; font-weight:700; font-size:12px;">${stuRes.length} lượt</span></td>
                <td style="font-size:12px; color:#64748b;">${latest ? `${latest.examTitle} (<b>${latest.band}</b>)` : 'Chưa làm bài'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }
  openModal('classProgressDetailModal');
};

function renderClassTable() {
  const tbody = document.getElementById('classTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  (db.classes || []).forEach(c => {
    const count = (db.users || []).filter(u => u.role === 'student' && u.classId === c.id).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${c.name}</b></td>
      <td><span style="background:#ecfdf5; color:#059669; padding:4px 12px; border-radius:999px; font-weight:700; font-size:12.5px;">👥 ${count} học sinh</span></td>
      <td style="display:flex; gap:8px;">
        <button class="btn btn-emerald" onclick="openClassProgressModal('${c.id}')">📊 Xem DS & Tiến độ</button>
        <button class="btn btn-danger" onclick="deleteClass('${c.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStudentTable() {
  const tbody = document.getElementById('studentTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const stuList = (db.users || []).filter(u => u.role === 'student');
  if (!stuList.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:18px;">No student accounts registered yet.</td></tr>`;
    return;
  }
  stuList.forEach(u => {
    const c = (db.classes || []).find(cl => cl.id === u.classId);
    const proBadge = u.isPro
      ? `<span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:800; margin-left:6px;">👑 PRO</span>`
      : `<span style="background:#e2e8f0; color:#475569; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; margin-left:6px;">Standard</span>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${u.name}</b> ${proBadge}</td>
      <td><code>${u.username}</code></td>
      <td><code>${u.pass}</code></td>
      <td><span style="background:#f1f5f9; padding:3px 10px; border-radius:999px; font-weight:600; font-size:12px;">${c ? c.name : 'Unassigned'}</span></td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn ${u.isPro ? 'btn-emerald' : 'btn-secondary'}" style="${u.isPro ? 'background:#d97706;' : ''}" onclick="toggleStudentProStatus('${u.id}')">
          ${u.isPro ? '👑 Hủy PRO' : '⭐ Cấp PRO'}
        </button>
        <button class="btn btn-secondary" onclick="openEditStudentModal('${u.id}')">✏️ Edit</button>
        <button class="btn btn-danger" onclick="deleteUser('${u.id}')">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setAnalyticsViewMode(mode) {
  analyticsViewMode = mode;
  document.getElementById('btnAnalyticsGroupStu').className = mode === 'student' ? 'btn btn-emerald' : 'btn btn-secondary';
  document.getElementById('btnAnalyticsAllSub').className = mode === 'all' ? 'btn btn-emerald' : 'btn btn-secondary';
  renderAnalyticsTable();
}

function clearAnalyticsFilters() {
  const s = document.getElementById('filterAnalyticsSearch');
  const c = document.getElementById('filterAnalyticsClass');
  const d = document.getElementById('filterAnalyticsDate');
  if (s) s.value = '';
  if (c) c.value = 'ALL';
  if (d) d.value = '';
  renderAnalyticsTable();
}

function matchesDateFilter(resultItem, selectedDateStr) {
  if (!selectedDateStr) return true;
  if (resultItem.isoDate) return resultItem.isoDate === selectedDateStr;
  const idMatch = String(resultItem.id || '').match(/(\d{13})/);
  if (idMatch) {
    const dt = new Date(Number(idMatch[1]));
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}` === selectedDateStr;
  }
  return String(resultItem.timestamp || '').includes(selectedDateStr);
}

function toggleExpandStudentHistory(studentName) {
  expandedAnalyticsStudent = (expandedAnalyticsStudent === studentName) ? null : studentName;
  renderAnalyticsTable();
}

function renderAnalyticsTable() {
  const tbody = document.getElementById('analyticsTbody');
  const thead = document.getElementById('analyticsThead');
  if (!tbody || !thead) return;

  const classSelect = document.getElementById('filterAnalyticsClass');
  if (classSelect) {
    const currentVal = classSelect.value || 'ALL';
    classSelect.innerHTML = `<option value="ALL">🏫 All Classes</option>` +
      (db.classes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    classSelect.value = currentVal;
  }

  const searchKw = (document.getElementById('filterAnalyticsSearch')?.value || '').toLowerCase().trim();
  const classFilter = document.getElementById('filterAnalyticsClass')?.value || 'ALL';
  const dateFilter = document.getElementById('filterAnalyticsDate')?.value || '';

  tbody.innerHTML = '';

  const allResults = (db.results || []).slice().reverse().filter(r => {
    if (!matchesDateFilter(r, dateFilter)) return false;
    const stuObj = (db.users || []).find(u => u.name.toLowerCase() === String(r.userName || '').toLowerCase());
    if (classFilter !== 'ALL') {
      if (!stuObj || stuObj.classId !== classFilter) return false;
    }
    if (searchKw) {
      const hay = `${r.userName || ''} ${r.examTitle || ''}`.toLowerCase();
      if (!hay.includes(searchKw)) return false;
    }
    return true;
  });

  if (analyticsViewMode === 'all') {
    thead.innerHTML = `<tr><th>Student Name</th><th>Class</th><th>Assessment Title</th><th>Score / Word Count</th><th>Band</th><th>Submission Date</th><th>Action</th></tr>`;
    if (!allResults.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:20px;">No submissions match the selected filters.</td></tr>`;
      return;
    }
    allResults.forEach(r => {
      const isWriting = Boolean(r.writingSubmission);
      const stuObj = (db.users || []).find(u => u.name.toLowerCase() === String(r.userName || '').toLowerCase());
      const clsObj = stuObj ? (db.classes || []).find(c => c.id === stuObj.classId) : null;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${r.userName}</b></td>
        <td><span style="color:#64748b; font-size:12px;">${clsObj ? clsObj.name : '—'}</span></td>
        <td>${r.examTitle}</td>
        <td>${r.score}</td>
        <td><b style="color: var(--emerald-accent);">${String(r.band).startsWith('Band') ? r.band : 'Band ' + r.band}</b></td>
        <td>${r.timestamp}</td>
        <td>
          ${isWriting ? `
            <button class="btn btn-emerald" onclick="openGradeWritingModal('${r.id}')">Review & Grade</button>
          ` : `
            <button class="btn btn-secondary" onclick="reopenReviewFromHistory('${r.id}')">Review Keys</button>
          `}
        </td>
      `;
      tbody.appendChild(tr);
    });
    return;
  }

  thead.innerHTML = `<tr><th>Student Name (Click to view submissions)</th><th>Class</th><th>Submissions</th><th>Average / Latest Band</th><th>Latest Activity</th><th>Action</th></tr>`;

  const studentMap = new Map();
  (db.users || []).filter(u => u.role === 'student').forEach(u => {
    if (classFilter !== 'ALL' && u.classId !== classFilter) return;
    studentMap.set(u.name, { userObj: u, submissions: [] });
  });

  allResults.forEach(r => {
    if (!studentMap.has(r.userName)) {
      const uObj = (db.users || []).find(u => u.name === r.userName);
      studentMap.set(r.userName, { userObj: uObj, submissions: [] });
    }
    studentMap.get(r.userName).submissions.push(r);
  });

  const entries = Array.from(studentMap.entries()).filter(([stuName, data]) => {
    if (dateFilter && data.submissions.length === 0) return false;
    if (searchKw) {
      const matchName = stuName.toLowerCase().includes(searchKw);
      const matchSub = data.submissions.some(s => (s.examTitle || '').toLowerCase().includes(searchKw));
      return matchName || matchSub;
    }
    return true;
  });

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No students or submissions match the current filter.</td></tr>`;
    return;
  }

  entries.forEach(([stuName, data]) => {
    const subs = data.submissions;
    const clsObj = data.userObj ? (db.classes || []).find(c => c.id === data.userObj.classId) : null;
    const isExpanded = (expandedAnalyticsStudent === stuName);

    const numericBands = subs.map(s => parseFloat(String(s.band).replace('Band', '').trim())).filter(n => !isNaN(n));
    const avgBand = numericBands.length ? `Band ${(numericBands.reduce((a, b) => a + b, 0) / numericBands.length).toFixed(1)}` : (subs[0] ? subs[0].band : '—');
    const latestDate = subs[0] ? subs[0].timestamp : 'No submissions yet';

    const tr = document.createElement('tr');
    tr.className = 'student-group-row';
    tr.onclick = () => toggleExpandStudentHistory(stuName);
    tr.innerHTML = `
      <td><div style="display:flex; align-items:center; gap:8px;"><i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}" style="color:var(--emerald-accent); width:14px;"></i><b>👤 ${stuName}</b></div></td>
      <td><span style="background:#f1f5f9; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600;">${clsObj ? clsObj.name : 'Unassigned'}</span></td>
      <td><span style="background:#ecfdf5; color:#047857; padding:3px 10px; border-radius:999px; font-weight:800; font-size:12px;">${subs.length} test(s)</span></td>
      <td><b style="color:var(--emerald-accent);">${avgBand}</b></td>
      <td><span style="color:#64748b; font-size:12px;">${latestDate}</span></td>
      <td>
        <button class="btn btn-secondary" style="padding:5px 12px; font-size:12px;" onclick="event.stopPropagation(); toggleExpandStudentHistory('${stuName.replace(/'/g, "\\'")}')">
          ${isExpanded ? 'Hide History' : 'View Tests (' + subs.length + ')'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    if (isExpanded) {
      const detailTr = document.createElement('tr');
      detailTr.innerHTML = `
        <td colspan="6" style="padding: 8px 18px 18px 18px; background: #ffffff;">
          <div class="student-history-drawer">
            <div style="font-weight:800; color:#0f172a; margin-bottom:10px; font-size:13px;">📋 All Completed Tests for <span style="color:var(--emerald-accent);">${stuName}</span></div>
            ${!subs.length ? `<div style="color:#64748b; font-style:italic;">No test submissions recorded.</div>` : `
              <table style="background:#fff; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">
                <thead><tr><th>Assessment Title</th><th>Score / Word Count</th><th>Band</th><th>Date & Time</th><th>Action</th></tr></thead>
                <tbody>
                  ${subs.map(s => {
                    const isW = Boolean(s.writingSubmission);
                    return `
                      <tr>
                        <td><b>${s.examTitle}</b></td>
                        <td>${s.score}</td>
                        <td><b style="color:var(--emerald-accent);">${String(s.band).startsWith('Band') ? s.band : 'Band ' + s.band}</b></td>
                        <td><span style="color:#64748b; font-size:12px;">${s.timestamp}</span></td>
                        <td>
                          ${isW ? `<button class="btn btn-emerald" style="padding:5px 12px; font-size:12px;" onclick="openGradeWritingModal('${s.id}')">Review & Grade</button>`
                                : `<button class="btn btn-secondary" style="padding:5px 12px; font-size:12px;" onclick="reopenReviewFromHistory('${s.id}')">Review Keys</button>`}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(detailTr);
    }
  });
}

/* 10. CHẤM BÀI WRITING, HIỂN THỊ BÀI MẪU PRO & LƯU VĨNH VIỄN LÊN FIREBASE */
function renderProSampleSectionInModal(res) {
  const container = document.getElementById('proSampleViewerContainer');
  if (!container) return;
  const wExam = (db.writingExams || []).find(w => w.id === res.examId) || {};
  const t1Out = wExam.task1?.outline || '';
  const t1Sam = wExam.task1?.sample || '';
  const t2Out = wExam.task2?.outline || '';
  const t2Sam = wExam.task2?.sample || '';

  if (!t1Out && !t1Sam && !t2Out && !t2Sam) {
    container.innerHTML = '';
    return;
  }

  if (isStudentPro(activeUser)) {
    container.innerHTML = `
      <div class="pro-sample-box">
        <div style="font-weight:800; color:#065f46; font-size:14.5px; margin-bottom:10px;">👑 Đặc quyền Học sinh PRO: Dàn ý & Bài mẫu Band 8.0+</div>
        ${(t1Out || t1Sam) ? `
          <div style="margin-bottom:12px; background:#fff; padding:12px; border-radius:8px; border:1px solid #a7f3d0;">
            <b style="color:#059669;">📌 Task 1 Outline & Sample:</b>
            ${t1Out ? `<div style="margin-top:6px; white-space:pre-wrap; font-size:13px;"><b>Outline:</b>\n${t1Out}</div>` : ''}
            ${t1Sam ? `<div style="margin-top:8px; white-space:pre-wrap; font-size:13.5px; border-top:1px dashed #cbd5e1; padding-top:8px;"><b>Band 8.0+ Sample:</b>\n${t1Sam}</div>` : ''}
          </div>
        ` : ''}
        ${(t2Out || t2Sam) ? `
          <div style="background:#fff; padding:12px; border-radius:8px; border:1px solid #a7f3d0;">
            <b style="color:#059669;">📌 Task 2 Outline & Sample:</b>
            ${t2Out ? `<div style="margin-top:6px; white-space:pre-wrap; font-size:13px;"><b>Outline:</b>\n${t2Out}</div>` : ''}
            ${t2Sam ? `<div style="margin-top:8px; white-space:pre-wrap; font-size:13.5px; border-top:1px dashed #cbd5e1; padding-top:8px;"><b>Band 8.0+ Sample:</b>\n${t2Sam}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="pro-locked-card">
        <div style="font-size:15px; font-weight:800;">🔒 Dàn ý chi tiết & Bài mẫu Band 8.0+ (Dành riêng cho tài khoản 👑 PRO)</div>
        <div style="font-size:12.5px; margin-top:4px;">Liên hệ Giáo viên để nâng cấp tài khoản PRO và mở khóa toàn bộ bài mẫu cùng tính năng AI chấm bài tự động!</div>
      </div>
    `;
  }
}

function openGradeWritingModal(resId) {
  const res = (db.results || []).find(r => r.id === resId);
  if (!res || !res.writingSubmission) return;
  document.getElementById('gradeSubmissionId').value = res.id;
  document.getElementById('gradeStudentName').textContent = res.userName;
  document.getElementById('gradeExamTitle').textContent = res.examTitle;
  document.getElementById('gradeTask1Text').textContent = res.writingSubmission.task1 || '(No response)';
  document.getElementById('gradeTask2Text').textContent = res.writingSubmission.task2 || '(No response)';
  document.getElementById('gradeBandInput').value = res.band === 'Submitted' ? '' : res.band;
  document.getElementById('gradeFeedbackInput').value = res.teacherFeedback || '';

  document.getElementById('gradeWritingTitle').textContent = 'Review & Grade Student Writing';
  document.getElementById('gradeBandInput').readOnly = false;
  document.getElementById('gradeFeedbackInput').readOnly = false;
  const saveBtn = document.getElementById('btnSaveWritingEval');
  if (saveBtn) saveBtn.style.display = 'block';
  const aiTools = document.getElementById('teacherAiToolsBox');
  if (aiTools) {
    aiTools.style.display = 'flex';
    if (!document.getElementById('btnExportDocWriting')) {
      const expBtn = document.createElement('button');
      expBtn.type = 'button';
      expBtn.id = 'btnExportDocWriting';
      expBtn.className = 'btn btn-secondary';
      expBtn.innerHTML = '📄 Xuất Word (.doc)';
      expBtn.onclick = () => exportWritingFeedbackToDoc();
      aiTools.appendChild(expBtn);
    }
  }

  renderProSampleSectionInModal(res);
  openModal('gradeWritingModal');
}

function openStudentViewWritingModal(resId) {
  openGradeWritingModal(resId);
  const isTeacher = activeUser && activeUser.role === 'teacher';
  document.getElementById('gradeWritingTitle').textContent = isTeacher ? 'Review & Grade Student Writing' : 'Writing Submission & Examiner Feedback';
  document.getElementById('gradeBandInput').readOnly = !isTeacher;
  document.getElementById('gradeFeedbackInput').readOnly = !isTeacher;
  const saveBtn = document.getElementById('btnSaveWritingEval');
  if (saveBtn) saveBtn.style.display = isTeacher ? 'block' : 'none';
  const aiTools = document.getElementById('teacherAiToolsBox');
  if (aiTools) aiTools.style.display = isTeacher ? 'flex' : 'none';
}

async function saveWritingEvaluation() {
  const resId = document.getElementById('gradeSubmissionId').value;
  const res = (db.results || []).find(r => r.id === resId);
  if (!res) return;
  const bandVal = document.getElementById('gradeBandInput').value.trim();
  const fbVal = document.getElementById('gradeFeedbackInput').value.trim();
  if (bandVal !== '') {
    res.band = bandVal.startsWith('Band') ? bandVal : `Band ${bandVal}`;
  }
  res.teacherFeedback = fbVal;

  const fs = getActiveFirestore();
  if (fs) {
    try {
      await fs.collection('suite_results').doc(String(res.id)).set(cleanForFirestore(res));
    } catch (e) {}
  }
  await persist(true);
  closeModal('gradeWritingModal');
  renderAnalyticsTable();
  renderHomeTab();
  alert('Đã lưu điểm và nhận xét Writing lên Firebase thành công!');
}

/* 11. BUILDER TẠO ĐỀ & LƯU ĐỘC LẬP LÊN CLOUD SHARD (READING, LISTENING, WRITING) */
function insertQuestionTemplate(type, mode = 're') {
  const qBox = document.getElementById(mode === 'le' ? 'leQuestions' : 'rePQuestionsHtml');
  const pBox = document.getElementById(mode === 'le' ? 'leTranscript' : 'rePText');
  let snippet = '';

  if (type === 'tfng') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 1–3</div>
  <p>Do the following statements agree with the information given in the reading passage? Choose <strong>TRUE</strong>, <strong>FALSE</strong> or <strong>NOT GIVEN</strong>.</p>
  <div class="question" data-question="1">
    <div class="question-text"><span class="q-badge">1</span> Statement 1 text goes here.</div>
    <div class="options">
      <label><input type="radio" name="q1" value="TRUE"> TRUE</label>
      <label><input type="radio" name="q1" value="FALSE"> FALSE</label>
      <label><input type="radio" name="q1" value="NOT GIVEN"> NOT GIVEN</label>
    </div>
  </div>
</div>\n`;
  } else if (type === 'mcq1') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 21–22</div>
  <p>Choose the correct letter, <strong>A, B</strong> or <strong>C</strong>.</p>
  <div class="question" data-question="21">
    <div class="question-text"><span class="q-badge">21</span> Question stem goes here?</div>
    <div class="options">
      <label><input type="radio" name="q21" value="A"> A Option A</label>
      <label><input type="radio" name="q21" value="B"> B Option B</label>
      <label><input type="radio" name="q21" value="C"> C Option C</label>
    </div>
  </div>
</div>\n`;
  } else if (type === 'mcq2') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 23–24</div>
  <p>Choose <strong>TWO</strong> letters, <strong>A–E</strong>.</p>
  <div class="question" data-question="23" data-multi-pair="q23,q24">
    <div class="question-text"><span class="q-badge">23–24</span> Which TWO points are mentioned?</div>
    <div class="options">
      <label><input type="checkbox" data-pair-group="q23_q24" value="A"> A First option</label>
      <label><input type="checkbox" data-pair-group="q23_q24" value="B"> B Second option</label>
      <label><input type="checkbox" data-pair-group="q23_q24" value="C"> C Third option</label>
      <label><input type="checkbox" data-pair-group="q23_q24" value="D"> D Fourth option</label>
      <label><input type="checkbox" data-pair-group="q23_q24" value="E"> E Fifth option</label>
    </div>
  </div>
</div>\n`;
  } else if (type === 'gapfill') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 1–5</div>
  <p>Complete the notes below. Write <strong>ONE WORD AND/OR A NUMBER</strong> for each answer.</p>
  <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:16px; line-height:2.2;">
    <p>• First note with blank <input type="text" class="input-field inline-input" name="q1" placeholder="1" autocomplete="off"> inside the sentence.</p>
    <p>• Second note with blank <input type="text" class="input-field inline-input" name="q2" placeholder="2" autocomplete="off"> inside the sentence.</p>
  </div>
</div>\n`;
  } else if (type === 'summary_drag') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 21–25</div>
  <p>Choose FIVE letters from the box and drag them into spaces 21–25 below.</p>
  <div class="drag-options">
    <div class="drag-item" draggable="true" data-answer="A">A Option A</div>
    <div class="drag-item" draggable="true" data-answer="B">B Option B</div>
    <div class="drag-item" draggable="true" data-answer="C">C Option C</div>
  </div>
  <div style="line-height:2.4;">
    <div><b>21</b> Item 1: <span class="drop-zone" data-target="q21" data-placeholder="21">21</span></div>
    <div><b>22</b> Item 2: <span class="drop-zone" data-target="q22" data-placeholder="22">22</span></div>
  </div>
</div>\n`;
  } else if (type === 'headings') {
    if (pBox) pBox.value += `\n<div class="drop-zone heading-drop" data-target="q1" data-placeholder="1. Drop Heading for Paragraph A here">1. Drop Heading for Paragraph A here</div>\n<p><strong>Paragraph A</strong><br>Paragraph text here...</p>\n`;
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 1–2: Matching Headings</div>
  <div class="drag-options headings-bank">
    <div class="drag-item" draggable="true" data-answer="i">i. First heading option</div>
    <div class="drag-item" draggable="true" data-answer="ii">ii. Second heading option</div>
  </div>
</div>\n`;
  } else if (type === 'matrix') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 13–14</div>
  <table class="matrix-table">
    <thead><tr><th>Statement</th><th>A</th><th>B</th><th>C</th></tr></thead>
    <tbody>
      <tr class="question" data-question="13">
        <td class="matrix-statement"><span class="q-badge">13</span> First statement</td>
        <td><input type="radio" name="q13" value="A"></td>
        <td><input type="radio" name="q13" value="B"></td>
        <td><input type="radio" name="q13" value="C"></td>
      </tr>
    </tbody>
  </table>
</div>\n`;
  } else if (type === 'diagram') {
    snippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 15–17: Map / Diagram Labelling</div>
  <div style="margin: 14px 0; text-align: center;">
    <img src="PASTE_IMAGE_URL_HERE" style="max-width: 100%; max-height: 420px; border: 1px solid #cbd5e1; border-radius: 4px;" alt="Diagram">
  </div>
  <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:16px; line-height:2.4;">
    <div><span class="q-badge">15</span> Label 1: <input type="text" class="input-field inline-input" name="q15" placeholder="15" autocomplete="off"></div>
  </div>
</div>\n`;
  }
  if (qBox) qBox.value += snippet;
}

function autoGenerateKeysFromHtml(mode = 're') {
  const foundKeys = new Set();
  let combinedHtml = '';
  if (mode === 'le') {
    saveActiveListeningDraftCard(currentListeningDraftTab);
    [1, 2, 3, 4].forEach(pNum => {
      combinedHtml += (listeningPartDrafts[pNum]?.passageHtml || '') + '\n' + (listeningPartDrafts[pNum]?.questionsHtml || '');
    });
  } else {
    saveActiveDraftCards(currentDraftTab);
    [1, 2, 3].forEach(pNum => {
      combinedHtml += (passageDrafts[pNum]?.passageHtml || '') + '\n' + (passageDrafts[pNum]?.questionsHtml || '');
    });
  }

  const regexName = /name=["'](q\d+)["']/gi;
  const regexTarget = /data-target=["'](q\d+)["']/gi;
  const regexPair = /data-multi-pair=["']([^"']+)["']/gi;
  let m;
  while ((m = regexName.exec(combinedHtml)) !== null) foundKeys.add(m[1]);
  while ((m = regexTarget.exec(combinedHtml)) !== null) foundKeys.add(m[1]);
  while ((m = regexPair.exec(combinedHtml)) !== null) {
    m[1].split(',').forEach(k => foundKeys.add(k.trim()));
  }

  const sorted = Array.from(foundKeys).sort((a, b) => parseInt(a.replace('q', '')) - parseInt(b.replace('q', '')));
  if (!sorted.length) return alert('No question attributes (name="q1" or data-target="q1") detected yet.');

  const keyBox = document.getElementById(mode === 'le' ? 'leKeys' : 'rePKeys');
  const existing = {};
  keyBox.value.split('\n').forEach(line => {
    const p = line.split('=');
    if (p.length >= 2) existing[p[0].trim()] = p.slice(1).join('=').trim();
  });

  keyBox.value = sorted.map(k => `${k}=${existing[k] || ''}`).join('\n');
  alert(`Detected ${sorted.length} questions (${sorted[0]} to ${sorted[sorted.length - 1]})!`);
}

function openReadingEditorModal() {
  document.getElementById('editingExamId').value = '';
  passageDrafts = { 1: {}, 2: {}, 3: {} };
  document.getElementById('reTitle').value = '';
  document.getElementById('reDuration').value = 60;
  document.getElementById('reCategory').value = 'Full Test';
  document.getElementById('reTopic').value = '';
  if (document.getElementById('reDifficulty')) document.getElementById('reDifficulty').value = 'Standard';
  document.getElementById('rePKeys').value = '';
  document.getElementById('rePExps').value = '';
  document.getElementById('rePEvis').value = '';
  if (document.getElementById('rePSyntax')) document.getElementById('rePSyntax').value = '';
  document.getElementById('rePVocab').value = '';
  currentDraftTab = 1;
  [1, 2, 3].forEach(n => document.getElementById(`subtab-p${n}`).classList.toggle('active-subtab', n === 1));
  loadDraftToEditor(1);
  openModal('readingEditorModal');
}

function openEditExamModal(examId) {
  const exam = (db.readingExams || []).find(e => e.id === examId);
  if (!exam) return;
  document.getElementById('editingExamId').value = exam.id;
  document.getElementById('reTitle').value = exam.title;
  document.getElementById('reDuration').value = exam.duration;
  document.getElementById('reCategory').value = exam.category || 'Full Test';
  document.getElementById('reTopic').value = exam.topic || '';
  if (document.getElementById('reDifficulty')) document.getElementById('reDifficulty').value = exam.difficulty || 'Standard';

  passageDrafts = { 1: {}, 2: {}, 3: {} };
  (exam.passages || []).forEach(p => {
    const vocabStr = (p.vocab || []).map(v => `${v.word} | ${v.type} | ${v.mean} | ${v.syn || ''}`).join('\n');
    passageDrafts[p.partNum] = {
      title: p.title,
      passageHtml: p.passageHtml,
      questionsHtml: p.questionsHtml,
      vocabText: vocabStr
    };
  });

  document.getElementById('rePKeys').value = Object.keys(exam.correctAnswers || {}).map(k => `${k}=${exam.correctAnswers[k]}`).join('\n');
  document.getElementById('rePExps').value = Object.keys(exam.explanations || {}).map(k => `${k}=${exam.explanations[k]}`).join('\n');
  document.getElementById('rePEvis').value = Object.keys(exam.evidences || {}).map(k => `${k}=${exam.evidences[k]}`).join('\n');
  if (document.getElementById('rePSyntax')) {
    const synObj = exam.syntaxStructures || {};
    document.getElementById('rePSyntax').value = Object.keys(synObj).map(k => `${k}=${synObj[k]}`).join('\n');
  }

  currentDraftTab = 1;
  [1, 2, 3].forEach(n => document.getElementById(`subtab-p${n}`).classList.toggle('active-subtab', n === 1));
  loadDraftToEditor(1);
  openModal('readingEditorModal');
}

function switchPassageEditor(pNum) {
  saveActiveDraftCards(currentDraftTab);
  currentDraftTab = pNum;
  [1, 2, 3].forEach(n => document.getElementById(`subtab-p${n}`).classList.toggle('active-subtab', n === pNum));
  loadDraftToEditor(pNum);
}

function saveActiveDraftCards(pNum) {
  passageDrafts[pNum] = {
    title: document.getElementById('rePTitle').value.trim(),
    passageHtml: document.getElementById('rePText').value.trim(),
    questionsHtml: document.getElementById('rePQuestionsHtml').value.trim(),
    vocabText: document.getElementById('rePVocab').value.trim()
  };
}

function loadDraftToEditor(pNum) {
  const d = passageDrafts[pNum] || {};
  document.getElementById('rePTitle').value = d.title || `Passage ${pNum}`;
  document.getElementById('rePText').value = d.passageHtml || '';
  document.getElementById('rePQuestionsHtml').value = d.questionsHtml || '';
  document.getElementById('rePVocab').value = d.vocabText || '';
}

function parseVocabText(text) {
  if (!text || !text.trim()) return [];
  const list = [];
  text.trim().split(/\r?\n/).forEach(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      list.push({ word: parts[0], type: parts[1], mean: parts[2], syn: parts[3] || '' });
    }
  });
  return list;
}

async function saveActiveExamFromEditor() {
  saveActiveDraftCards(currentDraftTab);
  const editingId = document.getElementById('editingExamId').value;
  const title = document.getElementById('reTitle').value.trim();
  const duration = Number(document.getElementById('reDuration').value) || 60;
  const category = document.getElementById('reCategory').value || 'Full Test';
  const topic = document.getElementById('reTopic').value.trim();
  const diff = document.getElementById('reDifficulty') ? document.getElementById('reDifficulty').value : 'Standard';
  const rawKeys = document.getElementById('rePKeys').value.trim();
  const rawExps = document.getElementById('rePExps').value.trim();
  const rawEvis = document.getElementById('rePEvis').value.trim();
  const rawSyntax = document.getElementById('rePSyntax') ? document.getElementById('rePSyntax').value.trim() : '';

  if (!title) return alert('Exam Title is required!');

  const correctAnswers = {}, explanations = {}, evidences = {}, syntaxStructures = {};
  rawKeys.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) correctAnswers[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });
  rawExps.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) explanations[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });
  rawEvis.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) evidences[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });
  rawSyntax.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) syntaxStructures[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });

  const passages = [];
  [1, 2, 3].forEach(pNum => {
    const d = passageDrafts[pNum];
    if (d && (d.passageHtml || d.questionsHtml)) {
      passages.push({
        partNum: pNum,
        title: d.title || `Passage ${pNum}`,
        passageHtml: d.passageHtml,
        questionsHtml: d.questionsHtml,
        vocab: parseVocabText(d.vocabText)
      });
    }
  });

  if (!passages.length) return alert('Please enter at least one passage!');

  if (!db.readingExams) db.readingExams = [];
  const examId = editingId || ('re_' + Date.now());
  const existingIdx = db.readingExams.findIndex(e => e.id === examId);

  const examObj = cleanForFirestore({
    id: examId,
    title,
    duration,
    category,
    topic,
    difficulty: diff,
    createdAt: existingIdx >= 0 ? (db.readingExams[existingIdx].createdAt || Date.now()) : Date.now(),
    assignedClasses: existingIdx >= 0 ? (db.readingExams[existingIdx].assignedClasses || []) : [],
    correctAnswers,
    explanations,
    evidences,
    syntaxStructures,
    passages
  });

  if (existingIdx >= 0) db.readingExams[existingIdx] = examObj;
  else db.readingExams.push(examObj);

  closeModal('readingEditorModal');
  renderReadingTable();
  renderHomeTab();

  const fs = getActiveFirestore();
  if (fs) {
    setSyncStatus('Saving Reading Test...', false);
    try {
      await fs.collection('suite_readingExams').doc(String(examObj.id)).set(examObj);
      await persist(true);
      setSyncStatus('Cloud Real-Time Active', true);
      alert(`✅ Đã lưu và đồng bộ đề Reading "${title}" lên Firebase thành công!`);
    } catch (err) {
      setSyncStatus('⚠️ Cloud Save Error', false);
      alert('Lỗi khi lưu đề Reading lên Firebase: ' + err.message);
    }
  }
}

/* LISTENING CRUD */
function switchListeningPartEditor(pNum) {
  saveActiveListeningDraftCard(currentListeningDraftTab);
  currentListeningDraftTab = pNum;
  [1, 2, 3, 4].forEach(n => {
    const btn = document.getElementById(`subtab-lp${n}`);
    if (btn) btn.classList.toggle('active-subtab', n === pNum);
  });
  loadListeningDraftToEditor(pNum);
}

function saveActiveListeningDraftCard(pNum) {
  listeningPartDrafts[pNum] = {
    title: document.getElementById('lePTitle').value.trim(),
    passageHtml: document.getElementById('leTranscript').value.trim(),
    questionsHtml: document.getElementById('leQuestions').value.trim()
  };
}

function loadListeningDraftToEditor(pNum) {
  const d = listeningPartDrafts[pNum] || {};
  document.getElementById('lePTitle').value = d.title || `Part ${pNum}`;
  document.getElementById('leTranscript').value = d.passageHtml || '';
  document.getElementById('leQuestions').value = d.questionsHtml || '';
}

function openListeningEditorModal() {
  document.getElementById('editingListeningId').value = '';
  listeningPartDrafts = { 1: {}, 2: {}, 3: {}, 4: {} };
  document.getElementById('leTitle').value = '';
  document.getElementById('leDuration').value = 30;
  document.getElementById('leAudioUrl').value = '';
  document.getElementById('leCategory').value = 'Listening Full';
  document.getElementById('leTopic').value = '';
  if (document.getElementById('leDifficulty')) document.getElementById('leDifficulty').value = 'Standard';
  document.getElementById('leKeys').value = '';
  document.getElementById('leExps').value = '';
  document.getElementById('leEvis').value = '';
  currentListeningDraftTab = 1;
  [1, 2, 3, 4].forEach(n => document.getElementById(`subtab-lp${n}`)?.classList.toggle('active-subtab', n === 1));
  loadListeningDraftToEditor(1);
  openModal('listeningEditorModal');
}

function openEditListeningModal(examId) {
  const exam = (db.listeningExams || []).find(e => e.id === examId);
  if (!exam) return;
  document.getElementById('editingListeningId').value = exam.id;
  document.getElementById('leTitle').value = exam.title;
  document.getElementById('leDuration').value = exam.duration || 30;
  document.getElementById('leAudioUrl').value = exam.audioUrl || '';
  document.getElementById('leCategory').value = exam.category || 'Listening Full';
  document.getElementById('leTopic').value = exam.topic || '';
  if (document.getElementById('leDifficulty')) document.getElementById('leDifficulty').value = exam.difficulty || 'Standard';

  listeningPartDrafts = { 1: {}, 2: {}, 3: {}, 4: {} };
  (exam.passages || []).forEach(p => {
    const pNum = p.partNum || 1;
    listeningPartDrafts[pNum] = {
      title: p.title || `Part ${pNum}`,
      passageHtml: p.passageHtml || '',
      questionsHtml: p.questionsHtml || ''
    };
  });

  document.getElementById('leKeys').value = Object.keys(exam.correctAnswers || {}).map(k => `${k}=${exam.correctAnswers[k]}`).join('\n');
  document.getElementById('leExps').value = Object.keys(exam.explanations || {}).map(k => `${k}=${exam.explanations[k]}`).join('\n');
  document.getElementById('leEvis').value = Object.keys(exam.evidences || {}).map(k => `${k}=${exam.evidences[k]}`).join('\n');

  currentListeningDraftTab = 1;
  [1, 2, 3, 4].forEach(n => document.getElementById(`subtab-lp${n}`)?.classList.toggle('active-subtab', n === 1));
  loadListeningDraftToEditor(1);
  openModal('listeningEditorModal');
}

async function saveListeningExam() {
  saveActiveListeningDraftCard(currentListeningDraftTab);
  const editId = document.getElementById('editingListeningId').value;
  const title = document.getElementById('leTitle').value.trim();
  const duration = Number(document.getElementById('leDuration').value) || 30;
  const audioUrl = document.getElementById('leAudioUrl').value.trim();
  const category = document.getElementById('leCategory').value;
  const topic = document.getElementById('leTopic').value.trim();
  const diff = document.getElementById('leDifficulty') ? document.getElementById('leDifficulty').value : 'Standard';
  const rawKeys = document.getElementById('leKeys').value.trim();
  const rawExps = document.getElementById('leExps').value.trim();
  const rawEvis = document.getElementById('leEvis').value.trim();

  if (!title || !audioUrl) return alert('Vui lòng nhập Tên đề và Link Audio!');

  const correctAnswers = {}, explanations = {}, evidences = {};
  rawKeys.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) correctAnswers[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });
  rawExps.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) explanations[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });
  rawEvis.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) evidences[line.substring(0, i).trim()] = line.substring(i + 1).trim(); });

  const passages = [];
  [1, 2, 3, 4].forEach(pNum => {
    const d = listeningPartDrafts[pNum];
    if (d && (d.questionsHtml || d.passageHtml)) {
      passages.push({
        partNum: pNum,
        title: d.title || `Part ${pNum}`,
        passageHtml: d.passageHtml || '<p>No transcript provided for this part.</p>',
        questionsHtml: d.questionsHtml || ''
      });
    }
  });

  if (!passages.length) return alert('Vui lòng nhập câu hỏi cho ít nhất 1 Part!');

  if (!db.listeningExams) db.listeningExams = [];
  const examId = editId || ('le_' + Date.now());
  const existingIdx = db.listeningExams.findIndex(e => e.id === examId);

  const examObj = cleanForFirestore({
    id: examId,
    title,
    duration,
    audioUrl,
    category,
    topic,
    difficulty: diff,
    createdAt: existingIdx >= 0 ? (db.listeningExams[existingIdx].createdAt || Date.now()) : Date.now(),
    assignedClasses: existingIdx >= 0 ? (db.listeningExams[existingIdx].assignedClasses || []) : [],
    correctAnswers,
    explanations,
    evidences,
    passages
  });

  if (existingIdx >= 0) db.listeningExams[existingIdx] = examObj;
  else db.listeningExams.push(examObj);

  closeModal('listeningEditorModal');
  renderListeningTable();
  renderHomeTab();

  const fs = getActiveFirestore();
  if (fs) {
    setSyncStatus('Saving Listening Test...', false);
    try {
      await fs.collection('suite_listeningExams').doc(String(examObj.id)).set(examObj);
      await persist(true);
      setSyncStatus('Cloud Real-Time Active', true);
      alert(`✅ Đã lưu và đồng bộ đề Listening "${title}" lên Firebase thành công!`);
    } catch (err) {
      setSyncStatus('⚠️ Cloud Save Error', false);
      alert('Lỗi khi lưu đề Listening lên Firebase: ' + err.message);
    }
  }
}

/* WRITING CRUD */
function openWritingEditorModal() {
  document.getElementById('editingWritingId').value = '';
  document.getElementById('weTitle').value = '';
  document.getElementById('weDuration').value = 60;
  document.getElementById('weTopic').value = '';
  if (document.getElementById('weDifficulty')) document.getElementById('weDifficulty').value = 'Standard';
  document.getElementById('weT1Prompt').value = '';
  document.getElementById('weT1Image').value = '';
  if (document.getElementById('weT1Outline')) document.getElementById('weT1Outline').value = '';
  if (document.getElementById('weT1Sample')) document.getElementById('weT1Sample').value = '';
  document.getElementById('weT2Prompt').value = '';
  if (document.getElementById('weT2Outline')) document.getElementById('weT2Outline').value = '';
  if (document.getElementById('weT2Sample')) document.getElementById('weT2Sample').value = '';
  openModal('writingEditorModal');
}

function openEditWritingModal(wId) {
  const w = (db.writingExams || []).find(x => x.id === wId);
  if (!w) return;
  document.getElementById('editingWritingId').value = w.id;
  document.getElementById('weTitle').value = w.title;
  document.getElementById('weDuration').value = w.duration || 60;
  document.getElementById('weTopic').value = w.topic || '';
  if (document.getElementById('weDifficulty')) document.getElementById('weDifficulty').value = w.difficulty || 'Standard';
  document.getElementById('weT1Prompt').value = (w.task1 && w.task1.prompt) || '';
  document.getElementById('weT1Image').value = (w.task1 && w.task1.image) || '';
  if (document.getElementById('weT1Outline')) document.getElementById('weT1Outline').value = (w.task1 && w.task1.outline) || '';
  if (document.getElementById('weT1Sample')) document.getElementById('weT1Sample').value = (w.task1 && w.task1.sample) || '';
  document.getElementById('weT2Prompt').value = (w.task2 && w.task2.prompt) || '';
  if (document.getElementById('weT2Outline')) document.getElementById('weT2Outline').value = (w.task2 && w.task2.outline) || '';
  if (document.getElementById('weT2Sample')) document.getElementById('weT2Sample').value = (w.task2 && w.task2.sample) || '';
  openModal('writingEditorModal');
}

async function saveWritingExam() {
  const editId = document.getElementById('editingWritingId').value;
  const title = document.getElementById('weTitle').value.trim();
  const duration = Number(document.getElementById('weDuration').value) || 60;
  const topic = document.getElementById('weTopic').value.trim();
  const t1Prompt = document.getElementById('weT1Prompt').value.trim();
  const t1Image = document.getElementById('weT1Image').value.trim();
  const t1Outline = document.getElementById('weT1Outline') ? document.getElementById('weT1Outline').value.trim() : '';
  const t1Sample = document.getElementById('weT1Sample') ? document.getElementById('weT1Sample').value.trim() : '';
  const t2Prompt = document.getElementById('weT2Prompt').value.trim();
  const t2Outline = document.getElementById('weT2Outline') ? document.getElementById('weT2Outline').value.trim() : '';
  const t2Sample = document.getElementById('weT2Sample') ? document.getElementById('weT2Sample').value.trim() : '';
  const diff = document.getElementById('weDifficulty') ? document.getElementById('weDifficulty').value : 'Standard';

  if (!title || (!t1Prompt && !t2Prompt)) {
    return alert('Vui lòng nhập Tên đề thi và ít nhất một Task prompt (Task 1 hoặc Task 2)!');
  }

  if (!db.writingExams) db.writingExams = [];
  const examId = editId || ('we_' + Date.now());
  const existingIndex = db.writingExams.findIndex(x => x.id === examId);

  const examObj = cleanForFirestore({
    id: examId,
    title,
    duration,
    topic,
    difficulty: diff,
    createdAt: existingIndex >= 0 ? (db.writingExams[existingIndex].createdAt || Date.now()) : Date.now(),
    assignedClasses: existingIndex >= 0 ? (db.writingExams[existingIndex].assignedClasses || []) : [],
    task1: { prompt: t1Prompt, image: t1Image, outline: t1Outline, sample: t1Sample },
    task2: { prompt: t2Prompt, outline: t2Outline, sample: t2Sample }
  });

  if (existingIndex >= 0) db.writingExams[existingIndex] = examObj;
  else db.writingExams.push(examObj);

  closeModal('writingEditorModal');
  renderWritingTable();
  renderHomeTab();

  const fs = getActiveFirestore();
  if (fs) {
    setSyncStatus('Saving Writing Test...', false);
    try {
      await fs.collection('suite_writingExams').doc(String(examObj.id)).set(examObj);
      await persist(true);
      setSyncStatus('Cloud Real-Time Active', true);
      alert(`✅ Đã lưu và đồng bộ đề Writing "${title}" lên Firebase thành công!`);
    } catch (err) {
      setSyncStatus('⚠️ Cloud Save Error', false);
      alert('Lỗi khi lưu lên Firebase: ' + err.message);
    }
  }
}

/* 12. QUẢN LÝ LỚP HỌC, TÀI KHOẢN HỌC SINH & PHÂN PHỐI ĐỀ */
function openCreateClassModal() {
  document.getElementById('newClassName').value = '';
  openModal('classModal');
}

function saveNewClass() {
  const name = document.getElementById('newClassName').value.trim();
  if (!name) return alert('Please enter a class name!');
  if (!db.classes) db.classes = [];
  db.classes.push({ id: 'c_' + Date.now(), name });
  persist(true);
  closeModal('classModal');
  renderDashboard();
}

function deleteClass(classId) {
  if (!confirm('Delete this class?')) return;
  db.classes = (db.classes || []).filter(c => c.id !== classId);
  persist(true);
  renderDashboard();
}

function populateClassSelect(selectId, includeAllOption = false) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  if (includeAllOption) sel.innerHTML += `<option value="ALL">All Classes (Public to all students)</option>`;
  (db.classes || []).forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.name}</option>`; });
}

function openCreateStudentModal() {
  document.getElementById('editingStudentId').value = '';
  document.getElementById('studentModalTitle').textContent = 'Register Student Account';
  document.getElementById('studentModalSaveBtn').textContent = 'Create Account';
  document.getElementById('newStuFullName').value = '';
  document.getElementById('newStuUsername').value = '';
  document.getElementById('newStuPassword').value = '123456';
  populateClassSelect('newStuClassSelect');
  openModal('studentModal');
}

function openEditStudentModal(stuId) {
  const stu = (db.users || []).find(u => u.id === stuId);
  if (!stu) return;
  document.getElementById('editingStudentId').value = stu.id;
  document.getElementById('studentModalTitle').textContent = 'Edit Student Information';
  document.getElementById('studentModalSaveBtn').textContent = 'Save Changes';
  document.getElementById('newStuFullName').value = stu.name || '';
  document.getElementById('newStuUsername').value = stu.username || '';
  document.getElementById('newStuPassword').value = stu.pass || '';
  populateClassSelect('newStuClassSelect');
  if (stu.classId) document.getElementById('newStuClassSelect').value = stu.classId;
  openModal('studentModal');
}

async function saveNewStudent() {
  const editId = document.getElementById('editingStudentId').value;
  const name = document.getElementById('newStuFullName').value.trim();
  const username = document.getElementById('newStuUsername').value.trim();
  const pass = document.getElementById('newStuPassword').value.trim() || '123456';
  const classId = document.getElementById('newStuClassSelect').value;

  if (!name || !username) return alert('Full Name and Username are required!');
  ensureArraysExist();

  if (editId) {
    const stu = db.users.find(u => u.id === editId);
    if (!stu) return;
    if (db.users.some(u => u.id !== editId && u.username.toLowerCase() === username.toLowerCase())) {
      return alert('Username is already taken!');
    }
    const oldName = stu.name;
    stu.name = name;
    stu.username = username;
    stu.pass = pass;
    stu.classId = classId;
    if (oldName && oldName !== name) {
      (db.results || []).forEach(r => { if (r.userName === oldName) r.userName = name; });
    }
    await persist(true);
    closeModal('studentModal');
    renderDashboard();
    alert(`Updated information for "${name}"!`);
    return;
  }

  if ((db.users || []).some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return alert('Username already exists!');
  }

  db.users.push({ id: 'u_' + Date.now(), username, pass, name, role: 'student', classId });
  await persist(true);
  closeModal('studentModal');
  renderDashboard();
  alert(`Student account "${username}" created!`);
}

function openBulkStudentModal() {
  document.getElementById('bulkStuTextarea').value = '';
  document.getElementById('bulkStuDefaultPass').value = '123456';
  populateClassSelect('bulkStuClassSelect');
  openModal('bulkStudentModal');
}

function slugifyUsername(fullName) {
  return fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function saveBulkStudents() {
  const raw = document.getElementById('bulkStuTextarea').value.trim();
  const classId = document.getElementById('bulkStuClassSelect').value;
  const defaultPass = document.getElementById('bulkStuDefaultPass').value.trim() || '123456';
  if (!raw) return alert('Please paste at least one student line!');

  ensureArraysExist();
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let createdCount = 0;

  lines.forEach((line, idx) => {
    const parts = line.split('|').map(p => p.trim());
    const fullName = parts[0];
    if (!fullName) return;
    let username = parts[1] || slugifyUsername(fullName);
    const pass = parts[2] || defaultPass;
    if ((db.users || []).some(u => u.username.toLowerCase() === username.toLowerCase())) {
      username = `${username}${Math.floor(10 + Math.random() * 89)}`;
    }
    db.users.push({ id: 'u_' + Date.now() + '_' + idx, username, pass, name: fullName, role: 'student', classId });
    createdCount++;
  });

  await persist(true);
  closeModal('bulkStudentModal');
  renderDashboard();
  alert(`Generated and synced ${createdCount} student accounts!`);
}

function deleteUser(userId) {
  if (!confirm('Remove this student account?')) return;
  db.users = (db.users || []).filter(u => u.id !== userId);
  persist(true);
  renderDashboard();
}

function openAssignModal(examId, type = 'reading') {
  document.getElementById('assignExamId').value = examId;
  document.getElementById('assignExamType').value = type;
  populateClassSelect('assignCohortSelect', true);
  openModal('assignModal');
}

async function executeAssign() {
  const examId = document.getElementById('assignExamId').value;
  const type = document.getElementById('assignExamType').value;
  const cohort = document.getElementById('assignCohortSelect').value;
  const list = type === 'writing' ? db.writingExams : (type === 'listening' ? db.listeningExams : db.readingExams);
  const target = (list || []).find(e => e.id === examId);
  if (!target) return;

  if (cohort === 'ALL') target.assignedClasses = [];
  else {
    if (!target.assignedClasses) target.assignedClasses = [];
    if (!target.assignedClasses.includes(cohort)) target.assignedClasses.push(cohort);
  }

  const fs = getActiveFirestore();
  if (fs && target.id) {
    const colName = type === 'writing' ? 'suite_writingExams' : (type === 'listening' ? 'suite_listeningExams' : 'suite_readingExams');
    try { await fs.collection(colName).doc(String(target.id)).set(cleanForFirestore(target)); } catch (e) {}
  }

  await persist(true);
  closeModal('assignModal');
  renderDashboard();
  alert('Class assignment updated!');
}

async function deleteExam(examId, type = 'reading') {
  if (!confirm('Are you sure you want to delete this test?')) return;
  ensureArraysExist();
  if (!db.deletedExamIds.includes(examId)) db.deletedExamIds.push(examId);

  const fs = getActiveFirestore();
  if (type === 'writing') {
    db.writingExams = (db.writingExams || []).filter(e => e.id !== examId);
    if (fs) try { await fs.collection('suite_writingExams').doc(String(examId)).delete(); } catch (e) {}
  } else if (type === 'listening') {
    db.listeningExams = (db.listeningExams || []).filter(e => e.id !== examId);
    if (fs) try { await fs.collection('suite_listeningExams').doc(String(examId)).delete(); } catch (e) {}
  } else {
    db.readingExams = (db.readingExams || []).filter(e => e.id !== examId);
    if (fs) try { await fs.collection('suite_readingExams').doc(String(examId)).delete(); } catch (e) {}
  }
  await persist(true);
  renderDashboard();
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

/* 13. TIẾN ĐỘ MILESTONE & BÀI KIỂM TRA TỪ VỰNG 40 CÂU (VOCAB QUIZ) */
let currentVocabQuizQuestions = [];
let currentActiveMilestoneNum = 5;
let isVocabQuizReviewed = false;

function getStudentCompletedExamIds(skillType) {
  if (!activeUser) return [];
  const examPool = skillType === 'reading' ? (db.readingExams || [])
    : (skillType === 'listening' ? (db.listeningExams || []) : (db.writingExams || []));
  const poolIds = new Set(examPool.map(e => e.id));
  const completed = [];
  (db.results || []).forEach(r => {
    if (String(r.userName || '').toLowerCase() === String(activeUser.name || '').toLowerCase() && poolIds.has(r.examId)) {
      if (!completed.includes(r.examId)) completed.push(r.examId);
    }
  });
  return completed;
}

function getStudentReadingCompletedCount() {
  return getStudentCompletedExamIds('reading').length;
}

function getPassedMilestonesList() {
  if (!activeUser) return [];
  try {
    const raw = localStorage.getItem(`AMURO_PASSED_MILESTONES_${activeUser.username}`);
    const localList = raw ? JSON.parse(raw) : [];
    const cloudList = (db.passedMilestones && db.passedMilestones[activeUser.username]) || [];
    return Array.from(new Set([...localList, ...cloudList]));
  } catch (e) {
    return [];
  }
}

function markMilestoneAsPassed(milestoneNum) {
  if (!activeUser) return;
  const list = getPassedMilestonesList();
  if (!list.includes(milestoneNum)) list.push(milestoneNum);
  localStorage.setItem(`AMURO_PASSED_MILESTONES_${activeUser.username}`, JSON.stringify(list));
  if (!db.passedMilestones) db.passedMilestones = {};
  db.passedMilestones[activeUser.username] = list;
  persist(true);
}

function getMilestoneQuizStatus() {
  if (!activeUser || activeUser.role === 'teacher') return { locked: false, isPro: true, milestoneNum: 0, completedCount: 0 };
  const completed = getStudentReadingCompletedCount();
  const passedList = getPassedMilestonesList();
  const proStatus = isStudentPro(activeUser);
  for (let m = 5; m <= completed; m += 5) {
    if (!passedList.includes(m)) {
      return { locked: !proStatus, hasOptionalQuiz: proStatus, isPro: proStatus, milestoneNum: m, completedCount: completed };
    }
  }
  return { locked: false, isPro: proStatus, milestoneNum: Math.floor(completed / 5) * 5, completedCount: completed };
}

function renderStudentSkillTrackerAndMilestone() {
  const progBox = document.getElementById('studentSkillProgressBox');
  const bannerBox = document.getElementById('readingMilestoneBannerBox');
  if (!activeUser) return;
  const rTotal = getVisibleExams(db.readingExams).length;
  const lTotal = getVisibleExams(db.listeningExams).length;
  const wTotal = getVisibleExams(db.writingExams).length;
  const rDone = getStudentCompletedExamIds('reading').length;
  const lDone = getStudentCompletedExamIds('listening').length;
  const wDone = getStudentCompletedExamIds('writing').length;
  const rPct = rTotal > 0 ? Math.min(100, Math.round((rDone / rTotal) * 100)) : 0;
  const lPct = lTotal > 0 ? Math.min(100, Math.round((lDone / lTotal) * 100)) : 0;
  const wPct = wTotal > 0 ? Math.min(100, Math.round((wDone / wTotal) * 100)) : 0;
  const st = getMilestoneQuizStatus();

  if (progBox) {
    progBox.innerHTML = `
      ${st.locked ? `
        <div class="milestone-banner">
          <div>
            <div style="font-weight:800; font-size:15px; color:#92400e;">🔒 Milestone Vocabulary Quiz Required (Chặng ${st.milestoneNum} bài Reading)</div>
            <div style="font-size:13px; color:#b45309; margin-top:4px;">Bạn đã hoàn thành ${st.completedCount} đề Reading! Hãy hoàn thành bài Quiz 40 câu từ vựng để mở khóa đề tiếp theo.</div>
          </div>
          <button class="btn btn-emerald" style="background:#d97706;" onclick="triggerVocabMilestoneQuiz(${st.milestoneNum})">🎯 Làm Quiz Mở Khóa Ngay</button>
        </div>
      ` : (st.isPro && rDone >= 5 ? `
        <div class="milestone-banner" style="background:linear-gradient(135deg,#ecfdf5,#eff6ff); border-color:#10b981;">
          <div>
            <div style="font-weight:800; font-size:15px; color:#065f46;">👑 Đặc quyền Học sinh PRO: Không bắt buộc làm Vocab Quiz!</div>
            <div style="font-size:13px; color:#047857; margin-top:4px;">Tài khoản PRO được mở khóa toàn bộ đề Reading, hoặc bấm bên phải nếu bạn muốn ôn tập từ vựng 5 bài vừa qua.</div>
          </div>
          <button class="btn btn-emerald" onclick="triggerVocabMilestoneQuiz(${st.milestoneNum || 5})">🤖 Tự Chọn Làm Vocab Quiz</button>
        </div>
      ` : '')}
      <div class="skill-progress-grid">
        <div class="skill-progress-card">
          <div class="skill-progress-header">
            <span>📖 Reading Progress ${st.isPro && activeUser.role === 'student' ? '<span style="background:#f59e0b; color:#fff; padding:1px 7px; border-radius:99px; font-size:10px; margin-left:6px;">👑 PRO</span>' : ''}</span>
            <span style="color:#059669;">${rPct}%</span>
          </div>
          <div class="skill-progress-bar-bg"><div class="skill-progress-bar-fill" style="width:${rPct}%; background:#059669;"></div></div>
          <div class="skill-progress-meta"><span>Completed: <b>${rDone} / ${rTotal}</b> tests</span><span>${st.isPro ? '👑 PRO Unlocked' : `Milestone: ${rDone % 5}/5`}</span></div>
        </div>
        <div class="skill-progress-card">
          <div class="skill-progress-header"><span>🎧 Listening Progress</span><span style="color:#2563eb;">${lPct}%</span></div>
          <div class="skill-progress-bar-bg"><div class="skill-progress-bar-fill" style="width:${lPct}%; background:#2563eb;"></div></div>
          <div class="skill-progress-meta"><span>Completed: <b>${lDone} / ${lTotal}</b> tests</span><span>Target: 100%</span></div>
        </div>
        <div class="skill-progress-card">
          <div class="skill-progress-header"><span>✍️ Writing Progress</span><span style="color:#d97706;">${wPct}%</span></div>
          <div class="skill-progress-bar-bg"><div class="skill-progress-bar-fill" style="width:${wPct}%; background:#d97706;"></div></div>
          <div class="skill-progress-meta"><span>Completed: <b>${wDone} / ${wTotal}</b> tests</span><span>AI Auto-Grader Ready</span></div>
        </div>
      </div>
    `;
  }

  if (bannerBox) {
    bannerBox.innerHTML = st.locked ? `
      <div class="milestone-banner">
        <div>
          <div style="font-weight:800; font-size:15px; color:#92400e;">🔒 Chặng ${st.milestoneNum} bài Reading: Mở khóa đề tiếp theo</div>
          <div style="font-size:13px; color:#b45309; margin-top:4px;">Bạn cần vượt qua bài Quiz 40 câu từ vựng (>= 60%) để tiếp tục làm đề mới.</div>
        </div>
        <button class="btn btn-emerald" style="background:#d97706;" onclick="triggerVocabMilestoneQuiz(${st.milestoneNum})">🎯 Start Milestone Vocab Quiz</button>
      </div>
    ` : '';
  }
}

const MASTER_VOCAB_QUIZ_BANK = [
  { sec: 'A', type: 'word_form', stem: 'Many stepwells were __________ for decades and are now in poor condition. (NEGLECT)', answer: 'neglected', word: 'neglected', pos: 'adj/v', mean: 'Bị bỏ mặc, không được chăm sóc', syn: 'abandoned, ignored' },
  { sec: 'A', type: 'word_form', stem: 'The __________ of the old stepwell took more than ten years. (RESTORE)', answer: 'restoration', word: 'restoration', pos: 'noun', mean: 'Sự trùng tu, khôi phục lại', syn: 'renovation, reconstruction' },
  { sec: 'A', type: 'word_form', stem: 'Visitors are amazed by the __________ of the people who designed the stepwells. (INGENIOUS)', answer: 'ingenuity', word: 'ingenuity', pos: 'noun', mean: 'Sự khéo léo, tài tình, sáng tạo', syn: 'creativeness, inventiveness' },
  { sec: 'A', type: 'word_form', stem: 'Wildfires today spread more __________ than in the past. (ERRATIC)', answer: 'erratically', word: 'erratically', pos: 'adv', mean: 'Một cách thất thường, khó đoán', syn: 'unpredictably, irregularly' },
  { sec: 'A', type: 'word_form', stem: 'California has greatly improved its __________ for fighting fires. (PREPARE)', answer: 'preparedness', word: 'preparedness', pos: 'noun', mean: 'Sự sẵn sàng ứng phó', syn: 'readiness' },
  { sec: 'A', type: 'word_form', stem: 'Some people have a greater __________ to heart disease than others. (VULNERABLE)', answer: 'vulnerability', word: 'vulnerability', pos: 'noun', mean: 'Tính dễ bị tổn thương', syn: 'susceptibility, weakness' },
  { sec: 'A', type: 'word_form', stem: 'In ancient China, silk was a highly __________ material. (PRIZE)', answer: 'prized', word: 'prized', pos: 'adj', mean: 'Được trân quý, đánh giá rất cao', syn: 'valued, cherished' },
  { sec: 'A', type: 'word_form', stem: 'Supporters say vertical farming is more __________ than traditional farming. (SUSTAIN)', answer: 'sustainable', word: 'sustainable', pos: 'adj', mean: 'Bền vững lâu dài', syn: 'eco-friendly, viable' },
  { sec: 'B', type: 'bank_fill', stem: 'Many stepwells are now __________ and full of rubbish.', answer: 'derelict', word: 'derelict', pos: 'adj', mean: 'Hoang phế, đổ nát', syn: 'dilapidated, ruined' },
  { sec: 'B', type: 'bank_fill', stem: 'Every winter, thousands of tourists __________ the famous stepwells.', answer: 'flock to', word: 'flock to', pos: 'phr.v', mean: 'Đổ xô, kéo đến đông đảo', syn: 'gather at, swarm to' },
  { sec: 'B', type: 'bank_fill', stem: 'Chand Baori is __________ its hundreds of zigzagging steps.', answer: 'renowned for', word: 'renowned for', pos: 'adj', mean: 'Nổi tiếng, lừng danh về', syn: 'famous for' },
  { sec: 'B', type: 'bank_fill', stem: 'Firefighters worked all night to __________ the fire.', answer: 'contain', word: 'contain', pos: 'verb', mean: 'Kiểm soát, ngăn chặn lan rộng', syn: 'control, restrain' },
  { sec: 'B', type: 'bank_fill', stem: 'The state has __________ new rules to protect homes.', answer: 'put in place', word: 'put in place', pos: 'phrase', mean: 'Thiết lập, ban hành', syn: 'establish, implement' },
  { sec: 'B', type: 'bank_fill', stem: 'It is difficult to __________ the exact cause of the disease.', answer: 'pinpoint', word: 'pinpoint', pos: 'verb', mean: 'Chỉ ra, xác định chính xác', syn: 'identify, locate precisely' },
  { sec: 'B', type: 'bank_fill', stem: 'A child’s personality is shaped by both __________.', answer: 'nature and nurture', word: 'nature and nurture', pos: 'phrase', mean: 'Bẩm sinh và môi trường nuôi dưỡng', syn: 'genetics and environment' },
  { sec: 'B', type: 'bank_fill', stem: 'Industry did not really __________ in Britain until the 18th century.', answer: 'take off', word: 'take off', pos: 'phr.v', mean: 'Phát triển bùng nổ', syn: 'boom, flourish' },
  { sec: 'C', type: 'mcq', stem: 'The walls of the stepwell are covered in __________ carvings.', options: ['far-flung', 'derelict', 'relentless', 'intricate'], answer: 'intricate', word: 'intricate', pos: 'adj', mean: 'Tinh xảo, nhiều chi tiết', syn: 'complex, elaborate' },
  { sec: 'C', type: 'mcq', stem: 'The pavilions sheltered visitors from the __________ heat.', options: ['utilitarian', 'pristine', 'relentless', 'colonnaded'], answer: 'relentless', word: 'relentless', pos: 'adj', mean: 'Khắc nghiệt, không ngừng nghỉ', syn: 'unrelenting, harsh' },
  { sec: 'C', type: 'mcq', stem: 'A long __________ caused the water level to drop.', options: ['hallmark', 'marvel', 'dry spell', 'heyday'], answer: 'dry spell', word: 'dry spell', pos: 'noun', mean: 'Đợt khô hạn kéo dài', syn: 'drought' },
  { sec: 'C', type: 'mcq', stem: 'Building homes in fire-__________ areas is very risky.', options: ['proof', 'blaze', 'front', 'prone'], answer: 'prone', word: 'fire-prone', pos: 'adj', mean: 'Dễ xảy ra hỏa hoạn', syn: 'vulnerable to fire' },
  { sec: 'C', type: 'mcq', stem: 'Fire engines have to __________ the huge state on winding roads.', options: ['endure', 'scorch', 'traverse', 'revamp'], answer: 'traverse', word: 'traverse', pos: 'verb', mean: 'Băng qua, đi ngang qua', syn: 'cross' },
  { sec: 'C', type: 'mcq', stem: 'Scientists study twins to __________ the effects of genes and environment.', options: ['rear', 'coin', 'symbolize', 'untangle'], answer: 'untangle', word: 'untangle', pos: 'verb', mean: 'Gỡ rối, phân tách làm rõ', syn: 'unravel, clarify' },
  { sec: 'C', type: 'mcq', stem: 'Some personality __________ seem to be passed from parents to children.', options: ['traits', 'surges', 'ailments', 'segments'], answer: 'traits', word: 'traits', pos: 'noun', mean: 'Đặc điểm tính cách', syn: 'characteristics' },
  { sec: 'C', type: 'mcq', stem: 'For centuries, China had a __________ on silk production.', options: ['monopoly', 'merchandise', 'middleman', 'fabric'], answer: 'monopoly', word: 'monopoly', pos: 'noun', mean: 'Sự độc quyền', syn: 'exclusive control' },
  { sec: 'D', type: 'collocation', stem: 'Firefighters are trying to __________ the blaze before it spreads.', options: ['hold', 'keep', 'contain', 'stop up'], answer: 'contain', word: 'contain the blaze', pos: 'collocation', mean: 'Khống chế ngọn lửa', syn: 'control the fire' },
  { sec: 'D', type: 'collocation', stem: 'Experts give California high __________ for its preparedness.', options: ['points', 'scores', 'grades', 'marks'], answer: 'marks', word: 'give high marks for', pos: 'collocation', mean: 'Đánh giá cao, khen ngợi', syn: 'praise highly' },
  { sec: 'D', type: 'collocation', stem: 'Silk became a __________ of status in ancient China.', options: ['symbol', 'logo', 'label', 'badge'], answer: 'symbol', word: 'symbol of status', pos: 'collocation', mean: 'Biểu tượng địa vị', syn: 'status symbol' },
  { sec: 'D', type: 'collocation', stem: 'Many stepwells have fallen into __________ over the centuries.', options: ['misuse', 'disuse', 'overuse', 'unuse'], answer: 'disuse', word: 'fall into disuse', pos: 'collocation', mean: 'Rơi vào cảnh bị bỏ không', syn: 'become obsolete' },
  { sec: 'D', type: 'collocation', stem: 'Too much dry tinder __________ for bigger, hotter fires.', options: ['makes', 'does', 'takes', 'gets'], answer: 'makes', word: 'make for', pos: 'collocation', mean: 'Góp phần tạo ra', syn: 'contribute to' },
  { sec: 'D', type: 'collocation', stem: 'Which word does NOT collocate naturally with "pose"?', options: ['a threat', 'a danger', 'a challenge', 'an effort'], answer: 'an effort', word: 'pose a threat/challenge', pos: 'collocation', mean: 'Đặt ra mối đe dọa / thách thức', syn: 'present a risk' },
  { sec: 'E', type: 'pair', stem: 'The (prevalent / prevalence) of water-borne diseases fell after tea became popular.', options: ['prevalent', 'prevalence'], answer: 'prevalence', word: 'prevalence', pos: 'noun', mean: 'Sự phổ biến', syn: 'widespread occurrence' },
  { sec: 'E', type: 'pair', stem: 'The roof had collapsed, but the walls were still (intact / pristine).', options: ['intact', 'pristine'], answer: 'intact', word: 'intact', pos: 'adj', mean: 'Còn nguyên vẹn', syn: 'undamaged' },
  { sec: 'E', type: 'pair', stem: 'A dry summer can (affect / effect) how often wildfires start.', options: ['affect', 'effect'], answer: 'affect', word: 'affect', pos: 'verb', mean: 'Ảnh hưởng đến', syn: 'influence' },
  { sec: 'E', type: 'pair', stem: 'The twins were (reared / risen) by different adoptive families.', options: ['reared', 'risen'], answer: 'reared', word: 'rear', pos: 'verb', mean: 'Nuôi dưỡng', syn: 'bring up' },
  { sec: 'E', type: 'pair', stem: 'Francis Galton (coined / invented) the phrase "nature and nurture".', options: ['coined', 'invented'], answer: 'coined', word: 'coin a phrase', pos: 'verb', mean: 'Đặt ra thuật ngữ mới', syn: 'create a term' },
  { sec: 'F', type: 'error', stem: 'At first, only royalty were entitled FOR wear silk. (Sửa từ in hoa)', answer: 'to', word: 'be entitled to', pos: 'phrase', mean: 'Có quyền làm gì', syn: 'have the right to' },
  { sec: 'F', type: 'error', stem: 'Thousands of tourists flock AT the stepwells every winter. (Sửa từ in hoa)', answer: 'to', word: 'flock to', pos: 'phr.v', mean: 'Đổ xô đến đâu', syn: 'stream to' },
  { sec: 'F', type: 'error', stem: 'Tea drinkers could drink boiled water without succumbing WITH dysentery. (Sửa từ in hoa)', answer: 'to', word: 'succumb to', pos: 'verb', mean: 'Mắc phải / khuất phục trước', syn: 'fall victim to' },
  { sec: 'F', type: 'error', stem: 'The state has put ON place new rules for building in forests. (Sửa từ in hoa)', answer: 'in', word: 'put in place', pos: 'phrase', mean: 'Thiết lập, áp dụng', syn: 'establish' },
  { sec: 'F', type: 'error', stem: 'Many stepwells were neglected and fell into MISUSE. (Sửa từ in hoa)', answer: 'disuse', word: 'fall into disuse', pos: 'collocation', mean: 'Bị bỏ hoang không dùng đến', syn: 'abandonment' }
];

function getStageReadingExamsForMilestone(milestoneNum) {
  const completedIds = getStudentCompletedExamIds('reading');
  const startIndex = Math.max(0, milestoneNum - 5);
  const stageIds = completedIds.slice(startIndex, milestoneNum);
  const targetExams = stageIds.length ? (db.readingExams || []).filter(e => stageIds.includes(e.id)) : (db.readingExams || []).slice(0, 5);
  return targetExams.length ? targetExams : (db.readingExams || []);
}

function buildDynamic40VocabQuestions(aiItems = null, milestoneNum = 5) {
  const questions = [];
  const customVocabList = [];
  const stageExams = getStageReadingExamsForMilestone(milestoneNum);

  stageExams.forEach(exam => {
    (exam.passages || []).forEach(p => {
      (p.vocab || []).forEach(v => {
        if (v && v.word && v.mean) customVocabList.push({ ...v, examTitle: exam.title });
      });
    });
  });

  const shuffledBank = JSON.parse(JSON.stringify(MASTER_VOCAB_QUIZ_BANK)).sort(() => Math.random() - 0.5);
  const dynamicFromPassages = [];

  if (customVocabList.length > 0) {
    customVocabList.slice().sort(() => Math.random() - 0.5).forEach((cv, idx) => {
      const distractors = shuffledBank.filter(x => x.word !== cv.word).map(x => x.word).slice(0, 3);
      const opts = [cv.word, ...distractors].sort(() => Math.random() - 0.5);
      dynamicFromPassages.push({
        sec: idx % 2 === 0 ? 'B' : 'C',
        type: idx % 2 === 0 ? 'bank_fill' : 'mcq',
        stem: `[${cv.examTitle || 'Reading'}] Academic word (${cv.type || 'vocab'}) meaning "${cv.mean}":`,
        options: idx % 2 === 0 ? null : opts,
        answer: cv.word,
        word: cv.word,
        pos: cv.type || 'vocab',
        mean: cv.mean,
        syn: cv.syn || ''
      });
    });
  }

  const combinedPool = Array.isArray(aiItems) && aiItems.length ? [...aiItems, ...dynamicFromPassages, ...shuffledBank] : [...dynamicFromPassages, ...shuffledBank];
  const limits = { A: 8, B: 8, C: 8, D: 6, E: 5, F: 5 };
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(secKey => {
    combinedPool.filter(x => String(x.sec || '').toUpperCase() === secKey).slice(0, limits[secKey]).forEach(it => {
      questions.push({ ...it, sec: secKey, id: 'vq_' + (questions.length + 1), qNum: questions.length + 1 });
    });
  });
  return questions;
}

function renderVocabQuizDOM(userResMap = null) {
  const body = document.getElementById('vocabQuizBody');
  if (!body) return;
  const sectionMeta = {
    A: { title: 'A. Word Formation', desc: 'Điền dạng từ đúng của từ trong ngoặc.' },
    B: { title: 'B. Fill in the Blanks', desc: 'Chọn từ phù hợp trong Word Bank để điền vào chỗ trống.' },
    C: { title: 'C. Multiple Choice', desc: 'Chọn đáp án đúng A, B, C hoặc D.' },
    D: { title: 'D. Collocations', desc: 'Chọn từ kết hợp tự nhiên nhất.' },
    E: { title: 'E. Confusable Words', desc: 'Chọn từ đúng trong cặp từ gợi ý.' },
    F: { title: 'F. Error Correction', desc: 'Gõ từ đúng thay thế cho từ viết hoa bị sai.' }
  };

  const bankWordsB = currentVocabQuizQuestions.filter(q => q.sec === 'B').map(q => q.answer).sort(() => Math.random() - 0.5);
  let html = '';

  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(secKey => {
    const secQuestions = currentVocabQuizQuestions.filter(q => q.sec === secKey);
    if (!secQuestions.length) return;
    html += `
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
        <div style="font-size:15px; font-weight:800; color:#0f172a; margin-bottom:4px;">${sectionMeta[secKey].title}</div>
        <div style="font-size:12.5px; color:#64748b; margin-bottom:14px;">${sectionMeta[secKey].desc}</div>
        ${secKey === 'B' ? `<div style="background:#f0fdf4; border:1px dashed #059669; border-radius:8px; padding:10px 14px; margin-bottom:16px; display:flex; flex-wrap:wrap; gap:8px;">
          ${bankWordsB.map(w => `<span style="background:#fff; border:1px solid #a7f3d0; padding:3px 10px; border-radius:6px; font-weight:700; font-size:12.5px;">${w}</span>`).join('')}
        </div>` : ''}
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${secQuestions.map(q => {
            const uVal = userResMap ? (userResMap[q.id] || '') : '';
            const isCorrect = userResMap ? (uVal.trim().toLowerCase() === String(q.answer).trim().toLowerCase()) : false;
            const borderStyle = !userResMap ? '1px solid #e2e8f0' : (isCorrect ? '2px solid #16a34a' : '2px solid #dc2626');
            const bgStyle = !userResMap ? '#f8fafc' : (isCorrect ? '#f0fdf4' : '#fef2f2');
            const inputHtml = (!q.options || !q.options.length)
              ? `<input type="text" id="input_${q.id}" value="${uVal.replace(/"/g, '&quot;')}" ${userResMap ? 'readonly' : ''} class="form-input" style="max-width:260px; font-weight:700; margin-top:6px; background:#fff;" placeholder="Nhập đáp án...">`
              : `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:8px; margin-top:8px;">
                  ${q.options.map((opt, oIdx) => {
                    const checked = (uVal.trim().toLowerCase() === String(opt).trim().toLowerCase()) ? 'checked' : '';
                    return `<label style="display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #cbd5e1; padding:7px 10px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px;">
                      <input type="radio" name="radio_${q.id}" value="${String(opt).replace(/"/g, '&quot;')}" ${checked} ${userResMap ? 'disabled' : ''}>
                      <span><b>${String.fromCharCode(65 + oIdx)}.</b> ${opt}</span>
                    </label>`;
                  }).join('')}
                </div>`;
            const reviewHtml = userResMap ? `
              <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #cbd5e1; font-size:12.5px;">
                ${isCorrect ? `<span style="color:#15803d; font-weight:800;">✅ Chính xác!</span>` : `<span style="color:#dc2626; font-weight:800;">❌ Sai! Đáp án đúng: "${q.answer}" (Đã lưu vào Vocabulary Vault ⭐)</span>`}
                <div style="color:#334155; margin-top:4px;">📖 <b>${q.word || q.answer}</b> (${q.pos || 'vocab'}) — ${q.mean || ''}</div>
              </div>` : '';
            return `<div style="background:${bgStyle}; border:${borderStyle}; border-radius:8px; padding:12px 14px;">
              <div style="font-weight:700; color:#0f172a; font-size:13.5px;"><span class="q-badge">${q.qNum}</span> ${q.stem}</div>
              ${inputHtml}${reviewHtml}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  });
  body.innerHTML = html;
}

async function triggerVocabMilestoneQuiz(milestoneNum = 5) {
  currentActiveMilestoneNum = milestoneNum;
  isVocabQuizReviewed = false;
  openModal('vocabQuizModal');
  document.getElementById('vocabQuizModalTitle').textContent = `🎯 Milestone Vocabulary Review - Chặng ${milestoneNum} Bài Reading (40 Câu)`;
  currentVocabQuizQuestions = buildDynamic40VocabQuestions(null, milestoneNum);
  document.getElementById('btnSubmitVocabQuiz').style.display = 'inline-flex';
  document.getElementById('btnRetryVocabQuiz').style.display = 'none';
  document.getElementById('vocabQuizResultSummary').textContent = `Tổng số: ${currentVocabQuizQuestions.length} câu hỏi (Đạt >= 60% để mở khóa)`;
  renderVocabQuizDOM();
}

function retryCurrentVocabQuiz() {
  triggerVocabMilestoneQuiz(currentActiveMilestoneNum);
}

function autoSaveWrongWordToVault(qItem) {
  if (!activeUser || !qItem || !qItem.word) return false;
  if (!db.savedVocab) db.savedVocab = {};
  if (!db.savedVocab[activeUser.username]) db.savedVocab[activeUser.username] = [];
  const vault = db.savedVocab[activeUser.username];
  if (!vault.some(x => String(x.word || '').toLowerCase() === String(qItem.word).toLowerCase())) {
    vault.push({
      word: `${qItem.word} (${qItem.pos || 'vocab'})`,
      mean: qItem.mean || qItem.stem,
      syn: qItem.syn || 'N/A',
      passageTitle: `Milestone Vocab Quiz #${currentActiveMilestoneNum}`
    });
    return true;
  }
  return false;
}

async function submitVocabQuizAnswers() {
  if (isVocabQuizReviewed) return;
  const userResMap = {};
  let correctCount = 0;
  let newlySavedWordsCount = 0;

  currentVocabQuizQuestions.forEach(q => {
    let val = '';
    if (!q.options || !q.options.length) {
      const inp = document.getElementById(`input_${q.id}`);
      val = inp ? inp.value.trim() : '';
    } else {
      const checked = document.querySelector(`input[name="radio_${q.id}"]:checked`);
      val = checked ? checked.value.trim() : '';
    }
    userResMap[q.id] = val;
    if (val.toLowerCase() === String(q.answer).trim().toLowerCase()) correctCount++;
    else if (autoSaveWrongWordToVault(q)) newlySavedWordsCount++;
  });

  const total = currentVocabQuizQuestions.length;
  const pct = Math.round((correctCount / total) * 100);
  const passed = pct >= 60;
  isVocabQuizReviewed = true;
  renderVocabQuizDOM(userResMap);
  document.getElementById('btnSubmitVocabQuiz').style.display = 'none';
  document.getElementById('btnRetryVocabQuiz').style.display = 'inline-flex';
  document.getElementById('vocabQuizBody').scrollTop = 0;

  const quizRes = cleanForFirestore({
    id: 'vq_res_' + Date.now(),
    examId: `vq_milestone_${currentActiveMilestoneNum}`,
    userName: activeUser.name,
    examTitle: `Milestone Vocabulary Review (Chặng ${currentActiveMilestoneNum} bài Reading)`,
    score: `${correctCount}/${total} (${pct}%)`,
    band: passed ? 'PASSED' : 'RETRY',
    isoDate: new Date().toISOString().split('T')[0],
    timestamp: new Date().toLocaleString()
  });

  if (!db.results) db.results = [];
  db.results.push(quizRes);
  const fs = getActiveFirestore();
  if (fs) try { await fs.collection('suite_results').doc(String(quizRes.id)).set(quizRes); } catch (e) {}

  if (passed) {
    markMilestoneAsPassed(currentActiveMilestoneNum);
    document.getElementById('vocabQuizResultSummary').innerHTML = `<span style="color:#15803d;">🎉 ĐẠT: ${correctCount}/${total} (${pct}%) — Đã mở khóa Reading!</span>`;
    alert(`🎉 Chúc mừng! Bạn đạt ${correctCount}/${total} câu (${pct}%).\n• Đã mở khóa các bài Reading tiếp theo!\n• Đã lưu ${newlySavedWordsCount} từ sai vào Vocabulary Vault.`);
  } else {
    await persist(true);
    document.getElementById('vocabQuizResultSummary').innerHTML = `<span style="color:#dc2626;">⚠️ CHƯA ĐẠT: ${correctCount}/${total} (${pct}%) — Cần >= 60%</span>`;
    alert(`⚠️ Kết quả: ${correctCount}/${total} câu (${pct}%). Cần đạt >= 60% để mở khóa.`);
  }
  renderDashboard();
}

/* KHỞI ĐỘNG HỆ THỐNG KHI TẢI TRANG */
window.addEventListener('DOMContentLoaded', () => {
  initDatabaseListener();
  checkSession();
});