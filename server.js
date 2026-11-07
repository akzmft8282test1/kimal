const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 🌐 페이지 라우트 설정 (404 방지)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'endex.html')));
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));
app.get('/fonts', (req, res) => res.sendFile(path.join(__dirname, 'fonts.html')));

// 📊 루트 폴더 폰트 목록 JSON 반환 API
app.get('/api/fonts-list', (req, res) => {
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let fontsList = [];

    try {
        const files = fs.readdirSync(__dirname);
        files.forEach((file) => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                const fontName = path.basename(file, ext).replace(/[_.-]/g, ' ').trim();
                let format = 'truetype';
                if (ext === '.otf') format = 'opentype';
                else if (ext === '.woff2') format = 'woff2';
                else if (ext === '.woff') format = 'woff';

                fontsList.push({
                    name: fontName,
                    url: `/${encodeURIComponent(file)}`,
                    format: format
                });
            }
        });
    } catch (err) {
        console.error("폰트 스캔 오류:", err);
    }

    res.json(fontsList);
});

// 🎨 모든 페이지에서 공통으로 로드할 전역 폰트 CSS 라우트
app.get('/global-font.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let css = '';

    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                const fontName = path.basename(file, ext).replace(/[_.-]/g, ' ').trim();
                let format = 'truetype';
                if (ext === '.otf') format = 'opentype';
                else if (ext === '.woff2') format = 'woff2';
                else if (ext === '.woff') format = 'woff';

                css += `
                @font-face {
                    font-family: '${fontName}';
                    src: url('/${encodeURIComponent(file)}') format('${format}');
                    font-weight: normal;
                    font-style: normal;
                }
                `;
            }
        });
    } catch (err) {
        console.error("전역 폰트 CSS 생성 오류:", err);
    }

    res.send(css);
});

// 개별 폰트 파일 직접 서빙
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

app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
