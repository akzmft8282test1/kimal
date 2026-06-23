const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer'); // html-pdf-node 대신 직접 puppeteer 로드
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
// 🖨 [안정성 최적화] index.html 및 endex.html 전용 서버 PDF 생성 라우터
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

        // 리눅스/우분투 서버 크래시를 원천 차단하는 브라우저 샌드박스 면제 옵션 집약
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // 정적 HTML 내용 주입 및 로딩 대기 타임아웃 방지
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // 원본 UI 테마 색상 및 CSS 규격을 고해상도로 컴파일 인쇄
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // 복습활동지 고유 배경 및 박스 라인 유지 필수
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });

        await browser.close();

        const downloadName = target === 'index' ? 'Information_Base_Activity.pdf' : 'Information_Final_Activity.pdf';
        
        // 클라이언트에 브라우저 다운로드 지침 전달 (한글 깨짐 차단)
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error("❌ Puppeteer PDF 컴파일러 치명적 에러:", err);
        if (browser) await browser.close();
        res.status(500).send(`서버 내부 에러로 PDF를 생성하지 못했습니다: ${err.message}`);
    }
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
