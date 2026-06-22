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
        margin-bottom: 20px;
    }
    .question-text {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
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

// 📄 문제지 PDF 다운로드 API (/download/question)
app.get('/download/question', (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header">
            <h1 class="title">📝 2학년 정보 1학기 1차 정기시험 대비 복습 활동지</h1>
            <p class="subtitle">교과목: 정보 | 대상: 2학년 | 작성자: 전원기</p>
        </div>
        <div class="info-box">
            <strong>학년/반/번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________
        </div>
        <div class="section-title">Part 1. 컴퓨팅 시스템의 구성과 동작</div>
        <div class="question-block">
            <div class="question-text"><strong>[01] 핵심 개념 빈칸 채우기</strong></div>
            <p>1. (<span class="blank"></span>) : 우리가 수행하고자 하는 일을 컴퓨터를 이용하여 처리하는 과정이다.</p>
            <p>2. (<span class="blank"></span>) : 컴퓨팅 작업을 수행하기 위한 하드웨어와 소프트웨어의 모음이다.</p>
            <p>3. (<span class="blank"></span>) : 눈에 보이거나 손으로 직접 만질 수 있는 물리적인 전자 장치이다.</p>
            <p>4. (<span class="blank"></span>) : 하드웨어를 활용하여 정보를 처리하고, 특정 작업을 수행하는 프로그램의 모음이다.</p>
        </div>
        <div class="question-block">
            <div class="question-text"><strong>[02] 하드웨어 종류 분류하기</strong></div>
            <div class="box-container">
                <strong>[ 보기 ]</strong><br>
                키보드 / 모니터 / CPU / RAM / SSD / 마우스 / 스피커 / 와이파이 / 마이크 / 프린터 / 터치스크린 / GPU / 블루투스 / HDD / 카메라
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">입력 장치</th>
                        <th style="width: 20%;">처리 장치</th>
                        <th style="width: 20%;">기억 장치</th>
                        <th style="width: 20%;">출력 장치</th>
                        <th style="width: 20%;">통신 장치</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="height:50px;"></td><td></td><td></td><td></td><td></td></tr>
                </tbody>
            </table>
        </div>
        <div class="footer">2학년 정보 정기시험 복습 활동지 - 문제지</div>
    </body>
    </html>
    `;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Question_Sheet.pdf');
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

// ✨ 정답지 PDF 다운로드 API (/download/answer)
app.get('/download/answer', (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header" style="border-bottom-color: #E53E3E;">
            <h1 class="title" style="color: #E53E3E;">✨ 2학년 정보 1학기 1차 정기시험 대비 복습 활동지 (정답지)</h1>
            <p class="subtitle">교과목: 정보 | 대상: 2학년 | 작성자: 전원기</p>
        </div>
        <div class="section-title" style="color: #E53E3E; border-left-color: #E53E3E;">Part 1. 컴퓨팅 시스템의 구성과 동작</div>
        <div class="question-block">
            <div class="question-text"><strong>[01] 핵심 개념 빈칸 채우기</strong></div>
            <p>1. (<span class="blank answer-text">컴퓨팅</span>) : 우리가 수행하고자 하는 일을 컴퓨터를 이용하여 처리하는 과정이다.</p>
            <p>2. (<span class="blank answer-text">컴퓨팅 시스템</span>) : 컴퓨팅 작업을 수행하기 위한 하드웨어와 소프트웨어의 모음이다.</p>
            <p>3. (<span class="blank answer-text">하드웨어</span>) : 눈에 보이거나 손으로 직접 만질 수 있는 물리적인 전자 장치이다.</p>
            <p>4. (<span class="blank answer-text">소프트웨어</span>) : 하드웨어를 활용하여 정보를 처리하고, 특정 작업을 수행하는 프로그램의 모음이다.</p>
        </div>
        <div class="question-block">
            <div class="question-text"><strong>[02] 하드웨어 종류 분류하기</strong></div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">입력 장치</th>
                        <th style="width: 20%;">처리 장치</th>
                        <th style="width: 20%;">기억 장치</th>
                        <th style="width: 20%;">출력 장치</th>
                        <th style="width: 20%;">통신 장치</th>
                    </tr>
                </thead>
                <tbody class="answer-text">
                    <tr>
                        <td>키보드, 마우스,<br>마이크, 카메라,<br>터치스크린</td>
                        <td>CPU,<br>GPU</td>
                        <td>RAM,<br>SSD,<br>HDD</td>
                        <td>모니터, 스피커,<br>프린터,<br>터치스크린</td>
                        <td>와이파이,<br>블루투스</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="footer">2학년 정보 정기시험 복습 활동지 - 정답지</div>
    </body>
    </html>
    `;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Answer_Sheet.pdf');
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

// 서버 실행 확인
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
