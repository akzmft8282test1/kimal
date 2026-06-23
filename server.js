const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core'); // core 패키지 사용
const chromium = require('chromium');        // sudo 없이 설치된 독립 바이너리
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
// 🖨 [비권한 환경 최적화] index.html 및 endex.html 전용 서버 PDF 생성 라우터
// =======================================================
app.get('/download/activity/:target', async (req, res) => {
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

    let browser;
    try {
        let htmlContent = fs.readFileSync(filePath, 'utf8');

        // sudo 없이 설치된 로컬 chromium 경로 확인
        const executablePath = chromium.path;

        browser = await puppeteer.launch({
            executablePath: executablePath, // 🔥 핵심: 루트 권한 없는 로컬 바이너리 지정
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none' // 폰트 깨짐 예방
            ]
        });

        const page = await browser.newPage();
        
        // 원본 UI 스타일 및 테이블 구조 동기화 대기
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // PDF 인쇄 옵션 컴파일
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // 오리지널 CSS 스타일 배경색상 강제 적용
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });

        await browser.close();

        const downloadName = target === 'index' ? 'Information_Base_Activity.pdf' : 'Information_Final_Activity.pdf';
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error("❌ PDF 생성 엔진 에러 로그:", err);
        if (browser) await browser.close();
        res.status(500).send(`서버 내부 에러로 PDF를 생성하지 못했습니다: ${err.message}`);
    }
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
