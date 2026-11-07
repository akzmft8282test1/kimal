const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 1. 폰트 관리 대시보드 페이지 라우트
app.get('/fonts', (req, res) => {
    res.sendFile(path.join(__dirname, 'fonts.html'));
});

// 2. 루트 폴더의 폰트 파일 목록을 JSON으로 반환하는 API
app.get('/api/fonts-list', (req, res) => {
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    let fontsList = [];

    try {
        const files = fs.readdirSync(__dirname);
        files.forEach((file, index) => {
            const ext = path.extname(file).toLowerCase();
            if (fontExtensions.includes(ext)) {
                // 확장자를 제외한 순수 파일명을 폰트 이름으로 사용
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

// 3. 개별 폰트 파일 직접 서빙 (루트 경로에 있는 폰트 파일 매핑)
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
