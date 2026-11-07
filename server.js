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
// 🎨 [루트 폴더 폰트 자동 스캔 및 /fonts 라우트]
// =======================================================
app.get('/fonts', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let fontCss = '';
    
    try {
        // 서버 루트 폴더 내의 파일들을 읽어들임
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                // 확장자를 제외한 파일명을 폰트 패밀리 이름으로 사용 (예: NanumGothic.ttf -> 'NanumGothic')
                const fontName = path.basename(file, ext);
                const fontUrl = `/${encodeURIComponent(file)}`;
                
                let formatStr = 'truetype';
                if (ext === '.otf') formatStr = 'opentype';
                else if (ext === '.woff2') formatStr = 'woff2';
                else if (ext === '.woff') formatStr = 'woff';

                // 각 폰트마다 개별 @font-face 생성 (원하는 폰트명으로 지정 가능)
                fontCss += `
                @font-face {
                    font-family: '${fontName}';
                    src: url('${fontUrl}') format('${formatStr}');
                    font-weight: normal;
                    font-style: normal;
                }
                `;
            }
        });
    } catch (e) {
        console.error("폰트 디렉토리 스캔 오류:", e);
    }

    // 기본 전체 적용 및 유틸리티 클래스 제공
    fontCss += `
    /* 기본 바디에 첫 번째로 스캔된 폰트 자동 지정 (원하는 경우 아래에서 수정 가능) */
    body, html, button, input, select, textarea, th, td {
        font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
    }
    `;

    res.send(fontCss);
});

// 개별 폰트 파일 직접 서빙 라우트
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
