const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// exam_data.json 파일 로드 안전 조치
const examDataPath = path.join(__dirname, 'exam_data.json');
let examData = {};
try {
    if (fs.existsSync(examDataPath)) {
        examData = JSON.parse(fs.readFileSync(examDataPath, 'utf8'));
        console.log("🚀 exam_data.json 로드 성공!");
    }
} catch (err) {
    console.error("❌ exam_data.json 읽기 실패:", err);
}

// 🌐 HTML 페이지 파일 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'endex.html')));
app.get('/endex', (req, res) => res.sendFile(path.join(__dirname, 'endex.html')));
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));

// 📊 프론트엔드 데이터 싱크 API
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// =======================================================
// 🖨 [활동지 PDF 다운로드 라우터]
// =======================================================
app.get('/download/activity/:target', (req, res) => {
    const target = req.params.target;
    let targetFileName = '';

    if (target === 'index') {
        targetFileName = 'index.html';
    } else if (target === 'endex') {
        targetFileName = 'endex.html';
    } else {
        return res.status(400).send("잘못된 요청입니다.");
    }

    const filePath = path.join(__dirname, targetFileName);

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    } else {
        const publicPath = path.join(__dirname, 'public', targetFileName);
        if (fs.existsSync(publicPath)) {
            return res.sendFile(publicPath);
        } else {
            return res.status(404).send(`해당 활동지 파일(${targetFileName})을 서버에서 찾을 수 없습니다.`);
        }
    }
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
