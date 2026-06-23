const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit'); // 👈 pdfkit으로 변경
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));
app.get('/api/exam-data', (req, res) => res.json(examData));

// ==========================================
// 📄 PDFKIT 기반 순수 JS PDF 생성 라우터
// ==========================================
app.post('/download/:type', (req, res) => {
    try {
        const { type } = req.params;
        const { examNum } = req.body;

        if (!examNum || !examData[examNum]) {
            return res.status(442).send("데이터가 존재하지 않습니다.");
        }

        const targetExam = examData[examNum];
        
        // PDF 문서 생성 (기본 폰트는 한글 깨짐 방지를 위해 시스템 폰트나 나눔고딕 경로 지정 필요)
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        
        // 브라우저 다운로드 스트림 설정
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Exam_0${examNum}_${type}.pdf`);
        doc.pipe(res);

        // 폰트 설정 (서버에 한글 폰트 파일(.ttf)을 배치하고 그 경로를 적어주어야 한글이 깨지지 않습니다)
        // 예: 프로젝트 루트에 'NanumGothic.ttf'를 넣었을 때
        const fontPath = path.join(__dirname, 'NanumGothic.ttf');
        if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
        }

        // --- PDF 내용 작성 ---
        const isQ = (type === 'question');
        doc.fontSize(18).text(`📝 2026학년도 1학기 정보 기말고사 대비 (제 ${examNum}회 모의평가 ${isQ ? '문제지' : '정답지'})`, { align: 'center' });
        doc.moveDown();

        if (isQ) {
            doc.fontSize(12).text("학년/반/번호: 2학년 _____반 _____번      이름: _________________");
            doc.moveDown();
            doc.fontSize(14).text("I. 선택형 객관식 문항", { underline: true });
            doc.moveDown();
            
            (targetExam.choice || []).forEach(q => {
                doc.fontSize(11).text(`${q.id}. ${q.question}`);
                (q.options || []).forEach((opt, idx) => {
                    doc.text(`   ${idx + 1} ${opt}`);
                });
                doc.moveDown();
            });
        } else {
            doc.fontSize(14).text("I. 정답 및 해설 가이드라인", { underline: true });
            doc.moveDown();
            
            (targetExam.choice || []).forEach(q => {
                doc.fontSize(11).text(`[${q.id}번 정답]: ${q.answer}번`);
                doc.fillColor('#666666').text(` 해설: ${q.feedback}`).fillColor('#000000');
                doc.moveDown();
            });
        }

        // PDF 생성 완료 및 전송
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send("PDF킷 엔진 에러");
    }
});

app.listen(PORT, () => console.log(`🚀 서버가 안전하게 가동되었습니다. 포트: ${PORT}`));
