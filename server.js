const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('html-pdf-node');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// JSON 데이터 로드 전역 변수
const examDataPath = path.join(__dirname, 'exam_data.json');
let examData = {};
try {
    examData = JSON.parse(fs.readFileSync(examDataPath, 'utf8'));
} catch (err) {
    console.error("exam_data.json 로드 실패:", err);
}

// ==========================================
// [1] 페이지 라우팅
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));

// API: client에서 JSON 데이터를 원할 때 제공
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// ==========================================
// [2] PDF 공통 스타일 및 옵션
// ==========================================
const pdfStyle = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; color: #2C3E50; line-height: 1.6; padding: 30px; background: #fff; }
    .header { border-bottom: 3px solid #2C3E50; padding-bottom: 10px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 700; color: #2C3E50; margin: 0 0 5px 0; text-align: center; }
    .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 14px; }
    .section-title { font-size: 16px; font-weight: 700; color: #3498DB; margin: 25px 0 10px 0; border-left: 4px solid #3498DB; padding-left: 8px; }
    .question-block { margin-bottom: 20px; page-break-inside: avoid; }
    .question-text { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
    .options { list-style: none; padding-left: 5px; margin: 5px 0; font-size: 13px; }
    .options li { margin-bottom: 4px; }
    .desc-box { border: 1px solid #CBD5E0; min-height: 90px; margin-top: 5px; border-radius: 4px; background: #FFF; }
    .ans-box { border: 1px solid #E2E8F0; background: #F8FAFC; padding: 10px; border-radius: 5px; font-size: 13px; margin-top: 5px; }
    .alert-text { color: #E74C3C; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
    th, td { border: 1px solid #CBD5E0; padding: 8px; text-align: center; }
    th { background: #F1F5F9; font-weight: 600; }
    .footer { position: fixed; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 11px; color: #94A3B8; }
</style>
`;

const pdfOptions = { format: 'A4', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } };

// ==========================================
// [3] 동적 PDF 빌드 파이프라인
// ==========================================
app.post('/download/:type', async (req, res) => {
    try {
        const { type } = req.params; // 'question' 또는 'answer'
        const { examNum } = req.body;
        
        const targetExam = examData[examNum];
        if (!targetExam) return res.status(404).send("해당 회차를 찾을 수 없습니다.");

        let choiceHtml = '';
        let essayHtml = '';
        let tableRows = '';

        // 1. 선택형 처리
        if (targetExam.choice && Array.isArray(targetExam.choice)) {
            targetExam.choice.forEach(q => {
                if (type === 'question') {
                    const opts = (q.options || []).map(o => `<li>${o}</li>`).join('');
                    choiceHtml += `
                        <div class="question-block">
                            <div class="question-text"><strong>${q.id}. ${q.question.replace(/^\d+\.\s*/, '')}</strong></div>
                            <ul class="options">${opts}</ul>
                        </div>`;
                } else {
                    tableRows += `
                        <tr>
                            <td>${q.id}</td>
                            <td class="alert-text">정답: ${q.answer}번</td>
                            <td style="text-align:left; padding-left:10px;">${q.feedback || ''}</td>
                        </tr>`;
                }
            });
        }

        // 2. 서술형 처리
        if (targetExam.essay && Array.isArray(targetExam.essay)) {
            targetExam.essay.forEach(q => {
                if (type === 'question') {
                    essayHtml += `
                        <div class="question-block">
                            <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                            <div class="desc-box"></div>
                        </div>`;
                } else {
                    const kw = q.keywords ? q.keywords.join(', ') : '없음';
                    essayHtml += `
                        <div class="question-block">
                            <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                            <div class="ans-box">
                                <span class="alert-text">[채점 기준 핵심 키워드]</span><br>
                                필수 포함 단어: <strong>${kw}</strong><br>
                                <span style="color:#64748B;">* 해설: ${q.feedback || '자유 서술형 채점'}</span>
                            </div>
                        </div>`;
                }
            });
        }

        // 3. HTML 템플릿 완성
        const docTitle = type === 'question' ? `제 ${examNum}회 모의평가 문제지` : `제 ${examNum}회 모의평가 정답 및 해설지`;
        const borderStyle = type === 'question' ? 'border-bottom-color: #2C3E50;' : 'border-bottom-color: #E74C3C;';
        const mainTitleColor = type === 'question' ? 'color: #2C3E50;' : 'color: #E74C3C;';

        let bodyContent = '';
        if (type === 'question') {
            bodyContent = `
                <div class="info-box"><strong>학년/반/번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________</div>
                <div class="section-title">I. 선택형 문항</div>
                ${choiceHtml}
                <div class="section-title">II. 서술형 문항</div>
                ${essayHtml}
            `;
        } else {
            bodyContent = `
                <div class="section-title" style="color:#E74C3C; border-left-color:#E74C3C;">I. 선택형 정답 및 해설</div>
                <table>
                    <thead><tr><th style="width:15%">번호</th><th style="width:20%">정답</th><th style="width:65%">문항 해설</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="section-title" style="color:#E74C3C; border-left-color:#E74C3C;">II. 서술형 채점 가이드라인</div>
                ${essayHtml}
            `;
        }

        const htmlLayout = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8">${pdfStyle}</head>
        <body>
            <div class="header" style="${borderStyle}">
                <h1 class="title" style="${mainTitleColor}">📝 2026학년도 1학기 정보 기말고사 대비 (${docTitle})</h1>
            </div>
            ${bodyContent}
            <div class="footer">2학년 정보과 기말고사 시스템 - ${docTitle}</div>
        </body>
        </html>`;

        // 4. PDF 바이너리 전송
        pdf.generatePdf({ content: htmlLayout }, pdfOptions).then(pdfBuffer => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Exam_Ch_${examNum}_${type}.pdf`);
            res.send(pdfBuffer);
        }).catch(err => res.status(500).send("PDF 변환 내부 오류: " + err.message));

    } catch (error) {
        res.status(500).send("서버 처리 실패: " + error.message);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
