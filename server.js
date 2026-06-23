const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('html-pdf-node'); // 백엔드 PDF 변환 라이브러리 추가
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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));

// 📊 프론트엔드 데이터 싱크 API
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// =======================================================
// 🖨 [새로 추가] index.html 및 endex.html 전용 서버 PDF 생성 라우터
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

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("해당 활동지 파일을 서버에서 찾을 수 없습니다.");
    }

    // 파일 로드 및 원본 레이아웃/CSS 유실 없는 렌더링 옵션 세팅
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    // PDF 생성 기본 옵션 명시 (A4 크기, 인쇄 여백 최적화)
    const options = {
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true // CSS 테마 배경색상, 테이블 헤더 색상 보존 강제 활성화
    };

    const file = { content: htmlContent };

    pdf.generatePdf(file, options)
        .then(pdfBuffer => {
            const downloadName = target === 'index' ? 'Information_Base_Activity.pdf' : 'Information_Final_Activity.pdf';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${downloadName}`);
            res.send(pdfBuffer);
        })
        .catch(err => {
            console.error("PDF 생성 에러:", err);
            res.status(500).send("서버 내부 에러로 PDF를 생성하지 못했습니다.");
        });
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
