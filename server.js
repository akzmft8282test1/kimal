const express = require('express');
const path = require('path');
const pdf = require('html-pdf-node');
const app = express();
const PORT = process.env.PORT || 3000;

// POST 요청으로 들어오는 JSON 데이터 파싱을 위한 설정
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// [1] 페이지 라우팅 설정 (HTML 연동)
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/endex', (req, res) => {
    res.sendFile(path.join(__dirname, 'endex.html'));
});

app.get('/moui', (req, res) => {
    res.sendFile(path.join(__dirname, 'moui.html'));
});


// ==========================================
// [2] PDF 디자인 및 생성 로직
// ==========================================

const pdfStyle = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    body {
        font-family: 'Noto Sans KR', sans-serif;
        color: #2D3748;
        line-height: 1.6;
        padding: 40px;
        background-color: #ffffff;
    }
    .header {
        border-bottom: 3px solid #4A5568;
        padding-bottom: 15px;
        margin-bottom: 25px;
    }
    .title {
        font-size: 24px;
        font-weight: 700;
        color: #1A202C;
        margin: 0 0 8px 0;
    }
    .subtitle {
        font-size: 13px;
        color: #718096;
        margin: 0;
    }
    .info-box {
        background-color: #F7FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 12px 15px;
        margin-bottom: 25px;
        font-size: 14px;
    }
    .section-title {
        font-size: 17px;
        font-weight: 700;
        color: #2B6CB0;
        margin-top: 25px;
        margin-bottom: 15px;
        border-left: 4px solid #2B6CB0;
        padding-left: 10px;
    }
    .question-block {
        margin-bottom: 25px;
        page-break-inside: avoid;
    }
    .question-text {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
    }
    .options {
        list-style: none;
        padding-left: 10px;
        margin: 8px 0;
        font-size: 13px;
    }
    .options li {
        margin-bottom: 6px;
    }
    .blank {
        display: inline-block;
        border-bottom: 1px solid #A0AEC0;
        width: 110px;
        text-align: center;
        margin: 0 5px;
    }
    .answer-text {
        color: #E53E3E;
        font-weight: 700;
    }
    .desc-answer-box {
        border: 1px solid #CBD5E0;
        background-color: #FAFAFA;
        min-height: 60px;
        padding: 10px;
        margin-top: 5px;
        border-radius: 4px;
        font-size: 13px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 13px;
    }
    th, td {
        border: 1px solid #CBD5E0;
        padding: 10px;
        text-align: center;
    }
    th {
        background-color: #EDF2F7;
        font-weight: 600;
    }
    .box-container {
        border: 1px dashed #4A5568;
        background-color: #FAFAFA;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 13px;
    }
    .footer {
        position: fixed;
        bottom: 20px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 11px;
        color: #A0AEC0;
    }
</style>
`;

const pdfOptions = { 
    format: 'A4', 
    margin: { top: '25px', bottom: '25px', left: '25px', right: '25px' } 
};

// 📄 [수정] 프론트엔드의 현재 데이터 전체를 받아 "문제지" PDF 빌드
app.post('/download/question', (req, res) => {
    const { examNum, questions } = req.body;
    
    let choiceContent = '';
    let essayContent = '';

    questions.forEach(q => {
        if (q.type === 'choice') {
            const optsLine = q.options.map((opt, i) => `<li>${['①','②','③','④','⑤'][i]} ${opt}</li>`).join('&nbsp;&nbsp;&nbsp;&nbsp;');
            choiceContent += `
                <div class="question-block">
                    <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                    <ul class="options"><li>${optsLine}</li></ul>
                </div>`;
        } else if (q.type === 'essay') {
            essayContent += `
                <div class="question-block">
                    <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                    <div class="desc-answer-box" style="height: 120px; background: #fff;"></div>
                </div>`;
        }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header">
            <h1 class="title">📝 2학년 정보 1학기 기말고사대비 모의평가 (제 ${examNum}회 문제지)</h1>
            <p class="subtitle">교과목: 정보 | 대상: 2학년 | 구조화 및 자동 출제 시스템</p>
        </div>
        <div class="info-box">
            <strong>학년/반/번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________
        </div>
        <div class="section-title">I. 선택형 문항</div>
        ${choiceContent}
        <div class="section-title">II. 서술형 문항</div>
        ${essayContent}
        <div class="footer">2학년 정보 기말대비 모의평가 제 ${examNum}회 - 문제지</div>
    </body>
    </html>`;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Information_Exam_Moui_Ch_0${examNum}_Question.pdf`);
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

// ✨ [수정] 프론트엔드의 현재 데이터 전체를 받아 "정답지" PDF 빌드
app.post('/download/answer', (req, res) => {
    const { examNum, questions } = req.body;

    let tableRows = '';
    let essayAnswerContent = '';

    questions.forEach(q => {
        if (q.type === 'choice') {
            const mark = ['①','②','③','④','⑤'][q.answer - 1] || q.answer;
            tableRows += `
                <tr>
                    <td>${q.id}</td>
                    <td class="answer-text">${mark}</td>
                    <td style="text-align:left;">${q.feedback || ''}</td>
                </tr>`;
        } else if (q.type === 'essay') {
            const kwText = q.keywords ? q.keywords.join(', ') : '';
            essayAnswerContent += `
                <div class="question-block">
                    <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                    <div class="desc-answer-box">
                        <span class="answer-text">[채점 기준 핵심 키워드]</span><br>
                        ${kwText ? `필수 포함 단어: <strong>${kwText}</strong>` : '출제 오류 혹은 지정 키워드 없음'}
                    </div>
                </div>`;
        }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header" style="border-bottom-color: #E53E3E;">
            <h1 class="title" style="color: #E53E3E;">✨ 2학년 정보 1학기 기말고사대비 모의평가 (제 ${examNum}회 정답지)</h1>
            <p class="subtitle">교과목: 정보 | 대상: 2학년 | 정답 및 서술형 평가 채점 기준안</p>
        </div>
        <div class="section-title" style="color: #E53E3E; border-left-color: #E53E3E;">I. 선택형 정답 리스트</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 20%;">문항 번호</th>
                    <th style="width: 20%;">정답</th>
                    <th style="width: 60%;">비고 / 해설</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <div class="section-title" style="color: #E53E3E; border-left-color: #E53E3E;">II. 서술형 예시 답안 및 핵심 키워드</div>
        ${essayAnswerContent}
        <div class="footer">2학년 정보 기말대비 모의평가 제 ${examNum}회 - 정답지</div>
    </body>
    </html>`;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Information_Exam_Moui_Ch_0${examNum}_Answer.pdf`);
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
