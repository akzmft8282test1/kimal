const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));
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
// 🎨 [전체 폴더 폰트 자동 적용 라우트 (/fonts)]
// =======================================================
app.get('/fonts', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let fontCss = '';
    
    // 서버 루트 디렉토리 스캔
    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                const fontName = path.basename(file, ext);
                // URL 엔코딩 처리
                const fontUrl = `/${encodeURIComponent(file)}`;
                
                fontCss += `
                @font-face {
                    font-family: 'CustomFont';
                    src: url('${fontUrl}') format('${ext === '.otf' ? 'opentype' : ext === '.woff2' ? 'woff2' : ext === '.woff' ? 'woff' : 'truetype'}');
                    font-weight: normal;
                    font-style: normal;
                }
                `;
            }
        });
    } catch (e) {
        console.error("폰트 디렉토리 스캔 오류:", e);
    }

    // 전체 문서에 폰트 일괄 적용
    fontCss += `
    body, html, button, input, select, textarea, th, td {
        font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif !important;
    }
    `;

    res.send(fontCss);
});

// 개별 폰트 파일 직접 서빙 라우트 (루트 디렉토리 폰트 파일 매핑)
app.get('/:fontFile', (req, res, next) => {
    const fontFile = req.params.fontFile;
    const ext = path.extname(fontFile).toLowerCase();
    if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        const targetPath = path.join(__dirname, fontFile);
        if (fs.existsSync(targetPath)) {
            return res.sendFile(targetPath);
        }
    }
    next();
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
