const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('html-pdf-node');
const app = express();
const PORT = process.env.PORT || 3000;

// 대용량 및 JSON 파싱 한도 설정
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// exam_data.json 안정적 로드 (경로 에러 방지)
const examDataPath = path.join(__dirname, 'exam_data.json');
let examData = {};
try {
    if (fs.existsSync(examDataPath)) {
        examData = JSON.parse(fs.readFileSync(examDataPath, 'utf8'));
        console.log("🚀 exam_data.json 로드 성공!");
    } else {
        console.error("❌ exam_data.json 파일이 존재하지 않습니다.");
    }
} catch (err) {
    console.error("❌ exam_data.json 읽기 실패:", err);
}

// ==========================================
// [1] 페이지 라우팅 (경로가 겹쳐서 발생하는 간섭 차단)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));

// 프론트엔드 연동용 API
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// ==========================================
// [2] PDF 컴파일용 UI/CSS 스타일시트 (A4 맞춤 가이드라인 적용)
// ==========================================
const pdfStyle = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; color: #2D3748; line-height: 1.6; padding: 35px; background: #ffffff; }
    .header { border-bottom: 3px solid #2B6CB0; padding-bottom: 12px; margin-bottom: 22px; text-align: center; }
    .header.ans-type { border-bottom-color: #E53E3E; }
    .title { font-size: 22px; font-weight: 700; color: #2B6CB0; margin: 0 0 6px 0; }
    .title.ans-type { color: #E53E3E; }
    .info-box { background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 15px; margin-bottom: 22px; font-size: 14px; }
    .section-title { font-size: 16px; font-weight: 700; color: #2B6CB0; margin-top: 25px; margin-bottom: 12px; border-left: 4px solid #2B6CB0; padding-left: 10px; }
    .section-title.ans-type { color: #E53E3E; border-left-color: #E53E3E; }
    .question-block { margin-bottom: 22px; page-break-inside: avoid; }
    .question-text { font-size: 14px; font-weight: 500; margin-bottom: 8px; }
    .options { list-style: none; padding-left: 10px; margin: 6px 0; font-size: 13px; }
    .options li { margin-bottom: 5px; }
    .desc-box { border: 1px solid #CBD5E0; min-height: 100px; margin-top: 6px; border-radius: 4px; background: #ffffff; }
    .ans-box { border: 1px solid #E2E8F0; background: #FFF5F5; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 6px; }
    .alert-text { color: #E53E3E; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; page-break-inside: avoid; }
    th, td { border: 1px solid #CBD5E0; padding: 9px; text-align: center; }
    th { background: #EDF2F7; font-weight: 600; }
    .footer { position: fixed; bottom: 15px; left: 0; right: 0; text-align: center; font-size: 11px; color: #A0AEC0; }
</style>
`;

const pdfOptions = { 
    format: 'A4', 
    margin: { top: '20px', bottom: '25px', left: '20px', right: '20px' } 
};

// ==========================================
// [3] 핵심: PDF 동적 생성 및 다운로드 라우터 (POST)
// ==========================================
app.post('/api/download/:type', async (req, res) => {
    try {
        const { type } = req.params; // 'question' 또는 'answer'
        const { examNum } = req.body;

        if (!examNum || !examData[examNum]) {
            return res.status(442).send(`요청하신 회차(${examNum}) 데이터가 존재하지 않습니다.`);
        }

        const targetExam = examData[examNum];
        let choiceHtml = '';
        let essayHtml = '';
        let tableRows = '';

        // [데이터 정밀 매핑] 한글 속성('선택형' / '서술형') 및 영문 배열 구조 모두 안전하게 예외처리 대응
        const choiceList = targetExam.choice || [];
        const essayList = targetExam.essay || [];

        // 1. 선택형(객관식) 처리
        choiceList.forEach(q => {
            if (type === 'question') {
                const opts = (q.options || []).map(o => `<li>${o}</li>`).join('');
                choiceHtml += `
                    <div class="question-block">
                        <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                        <ul class="options">${opts}</ul>
                    </div>`;
            } else {
                tableRows += `
                    <tr>
                        <td>${q.id}</td>
                        <td class="alert-text">${q.answer || '확인 필요'}번</td>
                        <td style="text-align:left; padding-left:12px;">${q.feedback || '정답 해설이 제공되지 않습니다.'}</td>
                    </tr>`;
            }
        });

        // 2. 서술형(주관식) 처리
        essayList.forEach(q => {
            if (type === 'question') {
                essayHtml += `
                    <div class="question-block">
                        <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                        <div class="desc-box"></div>
                    </div>`;
            } else {
                const kw = q.keywords ? q.keywords.join(', ') : '인정 문맥 채점';
                essayHtml += `
                    <div class="question-block">
                        <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                        <div class="ans-box">
                            <span class="alert-text">[채점 핵심인정 키워드 가이드라인]</span><br>
                            필수 포함 자원: <strong>${kw}</strong><br>
                            <span style="color: #4A5568;">💡 문제 해설: ${q.feedback || '지정 피드백 없음'}</span>
                        </div>
                    </div>`;
            }
        });

        // 3. 컴포넌트 뼈대 HTML 조립
        const isQ = (type === 'question');
        const docTitle = isQ ? `제 ${examNum}회 모의평가 문제지` : `제 ${examNum}회 모의평가 정답 및 해설지`;
        
        let bodyContent = '';
        if (isQ) {
            bodyContent = `
                <div class="info-box"><strong>학년/반/번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________</div>
                <div class="section-title">I. 선택형 객관식 문항</div>
                ${choiceHtml || '<p style="color:#a0aec0; font-size:13px;">선택형 문항이 비어있습니다.</p>'}
                <div class="section-title">II. 서술형 주관식 문항</div>
                ${essayHtml || '<p style="color:#a0aec0; font-size:13px;">서술형 문항이 비어있습니다.</p>'}
            `;
        } else {
            bodyContent = `
                <div class="section-title ans-type">I. 선택형 정답 및 문항별 해설 리스트</div>
                <table>
                    <thead>
                        <tr><th style="width:12%">번호</th><th style="width:18%">정답</th><th style="width:70%">정답 해설 / 오답 피드백</th></tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="3">선택형 문항 정답 정보가 없습니다.</td></tr>'}
                    </tbody>
                </table>
                <div class="section-title ans-type">II. 서술형 예시 답안 및 기준 가이드라인</div>
                ${essayHtml || '<p style="color:#a0aec0; font-size:13px;">서술형 정답 가이드가 존재하지 않습니다.</p>'}
            `;
        }

        const htmlLayout = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            ${pdfStyle}
        </head>
        <body>
            <div class="header ${isQ ? '' : 'ans-type'}">
                <h1 class="title ${isQ ? '' : 'ans-type'}">📝 2026학년도 1학기 정보 기말고사 완벽 대비 (${docTitle})</h1>
            </div>
            ${bodyContent}
            <div class="footer">2학년 정보과 기말고사 자동 출제 시스템 - ${docTitle}</div>
        </body>
        </html>`;

        // 4. pdf 생성 엔진 구동 및 바이너리 스트림 반환
        pdf.generatePdf({ content: htmlLayout }, pdfOptions).then(pdfBuffer => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Exam_Ch_0${examNum}_${type}.pdf`);
            res.send(pdfBuffer);
        }).catch(err => {
            console.error("PDF 생성 엔진 예외:", err);
            res.status(500).send("PDF 컴파일 오류가 발생했습니다.");
        });

    } catch (error) {
        console.error("서버 내부 제어 예외:", error);
        res.status(500).send("서버 내부 시스템 오류: " + error.message);
    }
});

app.listen(PORT, () => console.log(`🚀 Server is perfectly running on port ${PORT}`));
