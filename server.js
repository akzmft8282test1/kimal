const express = require('express');
const path = require('path');
const pdf = require('html-pdf-node');
const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일(HTML, CSS 등)을 public 폴더에 넣을 경우를 대비한 설정
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// [1] 페이지 라우팅 설정 (HTML 연동)
// ==========================================

// 루트 경로 (/) -> index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// /endex -> endex.html
app.get('/endex', (req, res) => {
    res.sendFile(path.join(__dirname, 'endex.html'));
});

// /moui -> moui.html
app.get('/moui', (req, res) => {
    res.sendFile(path.join(__dirname, 'moui.html'));
});


// ==========================================
// [2] PDF 디자인 및 생성 로직
// ==========================================

// 사이트 테마처럼 단정하고 부드러운 톤의 PDF 스타일시트
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
        margin-bottom: 4px;
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

// [공통] PDF 생성기 옵션 설정 (A4 크기 및 부드러운 여백)
const pdfOptions = { 
    format: 'A4', 
    margin: { top: '25px', bottom: '25px', left: '25px', right: '25px' } 
};

// 📄 [수정] 모의고사 회차별 문제지 PDF 동적 다운로드 API
app.get('/download/question', (req, res) => {
    // 💡 URL 파라미터(?exam=1)에서 회차 정보 추출 (기본값 1회)
    const examNum = req.query.exam || '1'; 

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header">
            <h1 class="title">📝 2학년 정보 1학기 기말고사비 모의평가 (제 ${examNum}회 문제지)</h1>
            <p class="subtitle">교과목: 정보 | 대상: 2학년 | 구조화 및 자동 출제 시스템</p>
        </div>
        <div class="info-box">
            <strong>학년/반/번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________
        </div>
        
        <div class="section-title">I. 선택형 문항</div>
        
        <div class="question-block">
            <div class="question-text"><strong>1. 다음 중 컴퓨팅 시스템의 소프트웨어 요소 중 성격이 다른 하나를 고르시오.</strong></div>
            <ul class="options">
                <li>① 리눅스 (Linux) &nbsp;&nbsp;&nbsp; ② 웹 브라우저 &nbsp;&nbsp;&nbsp; ③ 윈도우 11 (Windows 11) &nbsp;&nbsp;&nbsp; ④ 안드로이드 (Android)</li>
            </ul>
        </div>

        <div class="question-block">
            <div class="question-text"><strong>2. 데이터 전송 시 발생할 수 있는 보안 위협 중, 전송 중인 데이터를 불법으로 가로채어 엿보는 행위를 뜻하는 단어를 고르시오.</strong></div>
            <ul class="options">
                <li>① 가로막기 (Interruption) &nbsp;&nbsp;&nbsp; ② 변조 (Modification) &nbsp;&nbsp;&nbsp; ③ 도청/가로채기 (Interception) &nbsp;&nbsp;&nbsp; ④ 위조 (Fabrication)</li>
            </ul>
        </div>

        <div class="section-title">II. 서술형 문항</div>

        <div class="question-block">
            <div class="question-text"><strong>3. 분산 서비스 거부 공격(DDoS)의 발생 원리와 이를 일상에서 예방하기 위한 시스템 보안 수칙 1가지를 서술해 보세요.</strong></div>
            <div class="desc-answer-box" style="height: 100px; background: #fff;"></div>
        </div>

        <div class="footer">2학년 정보 기말대비 모의평가 제 ${examNum}회 - 문제지</div>
    </body>
    </html>
    `;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Information_Exam_Moui_Ch_0${examNum}_Question.pdf`);
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

// ✨ [수정] 모의고사 회차별 정답지 PDF 동적 다운로드 API
app.get('/download/answer', (req, res) => {
    // 💡 URL 파라미터(?exam=1)에서 회차 정보 추출
    const examNum = req.query.exam || '1'; 

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
                    <th style="width: 40%;">정답</th>
                    <th style="width: 40%;">비고 / 해설</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td class="answer-text">② 웹 브라우저</td>
                    <td>나머지는 모두 하드웨어를 제어하는 운영체제(OS) 응용군입니다.</td>
                </tr>
                <tr>
                    <td>2</td>
                    <td class="answer-text">③ 도청/가로채기</td>
                    <td>기밀성을 해치는 대표적인 수동적 공격 형태입니다.</td>
                </tr>
            </tbody>
        </table>

        <div class="section-title" style="color: #E53E3E; border-left-color: #E53E3E;">II. 서술형 예시 답안 및 핵심 키워드</div>

        <div class="question-block">
            <div class="question-text"><strong>3. 분산 서비스 거부 공격(DDoS) 예방책 및 원리</strong></div>
            <div class="desc-answer-box">
                <span class="answer-text">[모범 답안]</span><br>
                수많은 감염된 좀비 PC들을 원격 조종하여 특정 사이트에 동시 접속을 유도해 시스템 과부하를 일으키는 원리이다.<br>
                이를 예방하기 위해 일상에서 <strong>백신 프로그램을 설치하고 최신 상태로 실시간 감시 기능을 활성화</strong>해야 한다.
            </div>
        </div>

        <div class="footer">2학년 정보 기말대비 모의평가 제 ${examNum}회 - 정답지</div>
    </body>
    </html>
    `;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Information_Exam_Moui_Ch_0${examNum}_Answer.pdf`);
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

// 서버 실행 확인
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
