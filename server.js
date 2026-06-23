const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit'); // 🚀 크롬 엔진 대신 안전한 pdfkit 활용
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
// 🖨 [비권한 환경 최적화] 리눅스 의존성 없는 pdfkit 기반 다운로드 라우터
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

    try {
        let htmlContent = fs.readFileSync(filePath, 'utf8');

        // 복잡한 HTML 태그와 CSS 스타일을 깔끔하게 제거하고 순수 텍스트 추출
        let cleanText = htmlContent
            .replace(/<style([\s\S]*?)<\/style>/gi, '') // CSS 스타일 정의 제거
            .replace(/<script([\s\S]*?)<\/script>/gi, '') // 내부 스크립트 제거
            .replace(/<\/p>|<\/div>|<\/tr>|<\/h1>|<\/h2>|<\/h3>/gi, '\n') // 주요 블록 단위 개행 보존
            .replace(/<th([\s\S]*?)>|<td([\s\S]*?)>/gi, '  |  ') // 표(Table) 가독성을 위한 칸 구분선 처리
            .replace(/<[^>]+>/g, '') // 나머지 하위 태그 완전 제거
            .replace(/&nbsp;/g, ' ')
            .replace(/\n\s*\n+/g, '\n\n') // 연속된 불필요한 공백 라인 정돈
            .trim();

        // PDF 인쇄용 문서 객체 생성 (A4, 기본 여백)
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const downloadName = target === 'index' ? 'Information_Base_Activity.pdf' : 'Information_Final_Activity.pdf';

        // HTTP 응답 헤더 설정 (한글 파일명 및 스트림 즉시 출력 전송)
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);

        // PDF 결과 스트림을 바로 브라우저 다운로드 파이프로 연결
        doc.pipe(res);

        // 💡 중요: 리눅스 기본 한글 폰트 시스템 연동을 통한 글자 깨짐 방지
        // 서버에 설치된 기본 맑은 고딕이나 나눔 폰트가 있는지 순서대로 스캔합니다.
        let fontPath = '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'; // 호스팅 서버 기본 나눔고딕
        if (!fs.existsSync(fontPath)) {
            fontPath = 'C:\\Windows\\Fonts\\malgun.ttf'; // 윈도우 로컬 테스트용 폴백
        }

        if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
        } else {
            // 폰트 파일이 운영체제 내에 아예 없는 비특권 환경인 경우, 
            // 프로젝트 루트 폴더에 'malgun.ttf' 폰트 파일을 하나 업로드해두고
            // doc.font(path.join(__dirname, 'malgun.ttf')); 형태로 연동하시는 것을 가장 추천합니다.
            doc.font('Helvetica'); 
        }

        // 문서 상단 대제목 추가
        const titleText = target === 'index' ? "📝 대단원 정보 복습활동지 (기본형)" : "📝 대단원 정보 복습활동지 (완성형 정답포함)";
        doc.fontSize(18).text(titleText, { align: 'center' });
        doc.moveDown(2);

        // 정제된 텍스트 전체 배치
        doc.fontSize(11).lineGap(5).text(cleanText, {
            align: 'left',
            width: 495
        });

        // 스트림 마감 처리 및 전송
        doc.end();

    } catch (err) {
        console.error("❌ PDFKit 빌더 치명적 에러:", err);
        res.status(500).send(`서버 내부 에러로 PDF를 생성하지 못했습니다: ${err.message}`);
    }
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
