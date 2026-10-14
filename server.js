import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Đọc và ghi dữ liệu JSON an toàn
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initData = {
      users: [
        { id: 'u_admin', username: 'amuro', pass: 'amuro123', name: 'Thầy Amuro', role: 'teacher' }
      ],
      classes: [{ id: 'c1', name: 'Lớp IELTS Chuyên Sâu' }],
      readingExams: [],
      writingExams: [],
      readingResults: [],
      writingSubmissions: [],
      studentVocab: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initData, null, 2));
    return initData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API Xác thực
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role, classId: user.classId });
});

// API Lấy dữ liệu tổng quan
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json(db);
});

// API Lưu đề Reading / Writing
app.post('/api/exams/reading', (req, res) => {
  const db = readDB();
  const exam = { ...req.body, id: req.body.id || 're_' + Date.now() };
  const idx = db.readingExams.findIndex(e => e.id === exam.id);
  if (idx >= 0) db.readingExams[idx] = exam;
  else db.readingExams.push(exam);
  writeDB(db);
  res.json({ success: true, exam });
});

app.post('/api/exams/writing', (req, res) => {
  const db = readDB();
  const exam = { ...req.body, id: req.body.id || 'we_' + Date.now() };
  const idx = db.writingExams.findIndex(e => e.id === exam.id);
  if (idx >= 0) db.writingExams[idx] = exam;
  else db.writingExams.push(exam);
  writeDB(db);
  res.json({ success: true, exam });
});

// API Nộp bài Reading
app.post('/api/reading/submit', (req, res) => {
  const db = readDB();
  const result = { ...req.body, id: 'res_' + Date.now(), timestamp: new Date().toLocaleString('vi-VN') };
  db.readingResults.push(result);
  writeDB(db);
  res.json({ success: true, result });
});

// API Nộp & Chấm bài Writing (có nhận xét dạng Doc)
app.post('/api/writing/submit', (req, res) => {
  const db = readDB();
  const sub = { ...req.body, id: 'wsub_' + Date.now(), comments: [], score: null, timestamp: new Date().toLocaleString('vi-VN') };
  db.writingSubmissions.push(sub);
  writeDB(db);
  res.json({ success: true, sub });
});

app.post('/api/writing/grade', (req, res) => {
  const { submissionId, comments, score, teacherFeedback } = req.body;
  const db = readDB();
  const sub = db.writingSubmissions.find(s => s.id === submissionId);
  if (!sub) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
  sub.comments = comments;
  sub.score = score;
  sub.teacherFeedback = teacherFeedback;
  writeDB(db);
  res.json({ success: true, sub });
});

// Chạy server
app.listen(PORT, () => {
  console.log(`IELTS WITH AMURO Server running on port ${PORT}`);
});