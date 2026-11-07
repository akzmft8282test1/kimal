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

// 🎛️ [/fonts 접속시 폰트 대시보드 GUI 페이지 반환]
app.get('/fonts', (req, res) => {
    const fontsHtmlPath = path.join(__dirname, 'fonts.html');
    if (fs.existsSync(fontsHtmlPath)) {
        res.sendFile(fontsHtmlPath);
    } else {
        res.status(404).send("fonts.html 대시보드 파일이 서버 루트 폴더에 존재하지 않습니다.");
    }
});

// 📊 프론트엔드 데이터 싱크 API
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// =======================================================
// 🎨 [개선된 루트 폴더 폰트 자동 스캔 API (/api/fonts-list)]
// =======================================================
app.get('/api/fonts-list', (req, res) => {
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let fontsList = [];

    try {
        const files = fs.readdirSync(__dirname);
        files.forEach((file, index) => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                // 보기 좋게 파일명 정리 (확장자 제거 및 특수문자 정돈)
                const cleanName = path.basename(file, ext).replace(/[_._]/g, ' ');
                let formatStr = 'truetype';
                if (ext === '.otf') formatStr = 'opentype';
                else if (ext === '.woff2') formatStr = 'woff2';
                else if (ext === '.woff') formatStr = 'woff';

                fontsList.push({
                    id: `font_${index}`,
                    name: cleanName,
                    filename: file,
                    ext: ext.replace('.', ''),
                    format: formatStr,
                    url: `/font-file/${encodeURIComponent(file)}`
                });
            }
        });
    } catch (e) {
        console.error("폰트 디렉토리 스캔 오류:", e);
    }

    res.json(fontsList);
});

// 💡 안전한 개별 폰트 파일 전용 서빙 라우트
app.get('/font-file/:fileName', (req, res) => {
    const fileName = decodeURIComponent(req.params.fileName);
    const targetPath = path.join(__dirname, fileName);
    
    if (fs.existsSync(targetPath)) {
        const ext = path.extname(fileName).toLowerCase();
        if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
            return res.sendFile(targetPath);
        }
    }
    res.status(404).send("폰트 파일을 찾을 수 없습니다.");
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
