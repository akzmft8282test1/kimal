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
app.get('/fonts', (req, res) => res.sendFile(path.join(__dirname, 'fonts.html')));

// 📊 프론트엔드 데이터 싱크 API
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// =======================================================
// 📁 [추가] ./downpdf 폴더 내 복습활동지 PDF 목록 API
// =======================================================
app.get('/api/downpdf-list', (req, res) => {
    const downpdfDir = path.join(__dirname, 'downpdf');
    let pdfList = [];
    try {
        if (fs.existsSync(downpdfDir)) {
            const files = fs.readdirSync(downpdfDir);
            files.forEach(file => {
                if (path.extname(file).toLowerCase() === '.pdf') {
                    pdfList.push({
                        name: file,
                        url: `/downpdf/${encodeURIComponent(file)}`
                    });
                }
            });
        }
    } catch (e) {
        console.error("downpdf 폴더 읽기 오류:", e);
    }
    res.json(pdfList);
});

// downpdf 폴더 정적 서빙
app.use('/downpdf', express.static(path.join(__dirname, 'downpdf')));

// =======================================================
// 🎨 [확실하게 작동하는 폰트 스캔 API]
// =======================================================
app.get('/api/fonts-list', (req, res) => {
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let fontsList = [];

    try {
        if (fs.existsSync(__dirname)) {
            const files = fs.readdirSync(__dirname);
            files.forEach((file, index) => {
                const ext = path.extname(file).toLowerCase();
                if (fontExtensions.includes(ext)) {
                    const cleanName = path.basename(file, ext).replace(/[_.-]/g, ' ').trim();
                    let formatStr = 'truetype';
                    if (ext === '.otf') formatStr = 'opentype';
                    else if (ext === '.woff2') formatStr = 'woff2';
                    else if (ext === '.woff') formatStr = 'woff';

                    fontsList.push({
                        id: `font_${index}`,
                        name: cleanName || `Font_${index}`,
                        filename: file,
                        ext: ext.replace('.', ''),
                        format: formatStr,
                        url: `/font-file/${encodeURIComponent(file)}`
                    });
                }
            });
        }
    } catch (e) {
        console.error("❌ 폰트 스캔 에러:", e);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(fontsList);
});

// 전역 폰트 CSS 라우트
app.get('/global-font.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let css = '';

    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                const fontName = path.basename(file, ext).replace(/[_.-]/g, ' ').trim();
                let formatStr = 'truetype';
                if (ext === '.otf') formatStr = 'opentype';
                else if (ext === '.woff2') formatStr = 'woff2';
                else if (ext === '.woff') formatStr = 'woff';

                css += `
                @font-face {
                    font-family: '${fontName}';
                    src: url('/font-file/${encodeURIComponent(file)}') format('${formatStr}');
                    font-weight: normal;
                    font-style: normal;
                }
                `;
            }
        });
    } catch (err) {}

    res.send(css);
});

app.get('/font-file/:fileName', (req, res) => {
    try {
        const fileName = decodeURIComponent(req.params.fileName);
        const targetPath = path.join(__dirname, fileName);
        if (fs.existsSync(targetPath)) {
            return res.sendFile(targetPath);
        }
        res.status(404).send("폰트 파일을 찾을 수 없습니다.");
    } catch (err) {
        res.status(500).send("서버 오류 발생");
    }
});

// 활동지 PDF 다운로드 라우터
app.get('/download/activity/:target', (req, res) => {
    const target = req.params.target;
    let targetFileName = (target === 'index') ? 'index.html' : 'endex.html';
    const filePath = path.join(__dirname, targetFileName);

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    } else {
        const publicPath = path.join(__dirname, 'public', targetFileName);
        if (fs.existsSync(publicPath)) return res.sendFile(publicPath);
        return res.status(404).send("파일 없음");
    }
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
