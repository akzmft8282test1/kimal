const express = require('express');
const path = require('path');
const pdf = require('html-pdf-node');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/endex', (req, res) => { res.sendFile(path.join(__dirname, 'endex.html')); });
app.get('/moui', (req, res) => { res.sendFile(path.join(__dirname, 'moui.html')); });

// 🗂️ 데이터 동기화를 위해 서버 사이드에 모의고사 데이터셋 배치
const backendExamData = {
    1: [
        { id: 1, type: "choice", question: "다음 중 우리가 처리하고자 하는 목적 과제를 컴퓨터를 활용하여 일련의 데이터 처리 및 가공 과정을 거치는 개념을 가장 적절하게 정의한 단어는 무엇인가?", options: ["피지컬 시스템", "알고리즘 설계", "컴퓨팅", "소프트웨어 가속화"], answer: 3, feedback: "컴퓨팅" },
        { id: 2, type: "choice", question: "하드웨어 장치 중 성격이 다른 하나를 고르시오.", options: ["키보드", "마우스", "스피커", "터치스크린"], answer: 3, feedback: "스피커 - 출력장치이며 나머지는 입력 기능 포함" },
        { id: 3, type: "choice", question: "다음 하드웨어 종류와 역할의 연결 중 잘못된 것은?", options: ["통신 장치 - 다른 컴퓨팅 시스템과 데이터를 송수신한다.", "처리 장치 - 데이터와 응용 프로그램을 영구 저장한다.", "출력 장치 - 처리된 연산 결과를 사용자에게 시각/청각 등으로 전달한다.", "입력 장치 - 외부 환경 데이터나 명령을 시스템에 전달한다."], answer: 2, feedback: "처리 장치 - 저장 기능이 아니라 연산 및 제어가 주 임무입니다." },
        { id: 4, type: "choice", question: "다음 중 [윈도(Windows), macOS, iOS, 안드로이드]가 공통으로 속하는 소프트웨어 분류 유형은?", options: ["응용 소프트웨어", "시스템 소프트웨어", "오픈소스 패키지", "셰어웨어 프로그램"], answer: 2, feedback: "시스템 소프트웨어" },
        { id: 19, type: "essay", question: "시스템 소프트웨어의 핵심인 '운영체제(OS)'가 수행하는 실질적인 주요 관리 자원 및 핵심 기능에 대하여 상세히 설명하시오.", keywords: ["하드웨어", "제어", "사용자 인터페이스", "시스템 자원", "효율적 관리"] },
        { id: 20, type: "essay", question: "피지컬 컴퓨팅의 작동 구조를 입력, 처리, 출력 단계의 상호작용 메커니즘을 엮어서 서술하시오.", keywords: ["센서", "감지", "마이크로컨트롤러", "연산", "액추에이터"] }
    ],
    2: [
        { id: 1, type: "choice", question: "컴퓨팅 시스템을 지탱하는 두 가지 양대 축 중 물리적 형체가 없어 만질 수 없으나 하드웨어 작동을 전담하는 명령어의 집합체 구조는?", options: ["펌웨어 칩셋", "하드웨어 섀시", "소프트웨어", "통신 매체 인터페이스"], answer: 3, feedback: "소프트웨어" }
    ],
    3: [
        { id: 1, type: "choice", question: "제 3회 모의고사 테스트 문항입니다.", options: ["보기 1", "보기 2", "보기 3", "보기 4"], answer: 1, feedback: "보기 1" }
    ]
};

const pdfStyle = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; color: #2D3748; line-height: 1.6; padding: 40px; background-color: #ffffff; }
    .header { border-bottom: 3px solid #4A5568; padding-bottom: 15px; margin-bottom: 25px; }
    .title { font-size: 22px; font-weight: 700; color: #1A202C; margin: 0 0 8px 0; }
    .subtitle { font-size: 13px; color: #718096; margin: 0; }
    .info-box { background-color: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 15px; margin-bottom: 25px; font-size: 14px; }
    .section-title { font-size: 16px; font-weight: 700; color: #2B6CB0; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #2B6CB0; padding-left: 10px; }
    .question-block { margin-bottom: 25px; page-break-inside: avoid; }
    .question-text { font-size: 14px; font-weight: 500; margin-bottom: 8px; }
    .options { list-style: none; padding-left: 5px; margin: 8px 0; font-size: 13px; }
    .options li { margin-bottom: 6px; }
    .answer-text { color: #E53E3E; font-weight: 700; }
    .desc-answer-box { border: 1px solid #CBD5E0; background-color: #FAFAFA; min-height: 90px; padding: 12px; margin-top: 8px; border-radius: 4px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
    th, td { border: 1px solid #CBD5E0; padding: 10px; text-align: center; }
    th { background-color: #EDF2F7; font-weight: 600; }
    .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 11px; color: #A0AEC0; }
</style>
`;

const pdfOptions = { format: 'A4', margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' } };

// 📄 [수정 완료] 순수 백지 문제지 발급 모듈
app.get('/download/question', (req, res) => {
    const examNum = req.query.exam || '1';
    const questions = backendExamData[examNum] || [];
    const numMap = ["①", "②", "③", "④", "⑤"];

    let choiceContent = '';
    let essayContent = '';

    questions.forEach(q => {
        if(q.type === 'choice') {
            let opts = q.options.map((o, i) => `${numMap[i]} ${o}`).join('&nbsp;&nbsp;&nbsp;&nbsp;');
            choiceContent += `
                <div class="question-block">
                    <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                    <ul class="options"><li>${opts}</li></ul>
                </div>
            `;
        } else if(q.type === 'essay') {
            essayContent += `
                <div class="question-block">
                    <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                    <div class="desc-answer-box" style="background: #fff; height: 120px;"></div>
                </div>
            `;
        }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header">
            <h1 class="title">📝 2학년 정보 기말평가 모의고사 (제 ${examNum}회 문제지)</h1>
            <p class="subtitle">교과목: 정보 | 평가 유형: 지필 동형 모의고사 | 시스템 보안 및 피지컬 컴퓨팅 단원</p>
        </div>
        <div class="info-box">
            <strong>학년 / 반 / 번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________
        </div>
        ${choiceContent ? `<div class="section-title">I. 선택형 문항</div>${choiceContent}` : ''}
        ${essayContent ? `<div class="section-title">II. 서술형 문항</div>${essayContent}` : ''}
        <div class="footer">2학년 정보 기말대비 모의평가 제 ${examNum}회 - 문제지</div>
    </body>
    </html>`;

    pdf.generatePdf({ content: htmlContent }, pdfOptions).then(pdfBuffer => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Information_Exam_Moui_Ch_0${examNum}_Question.pdf`);
        res.send(pdfBuffer);
    }).catch(err => res.status(500).send("오류 발생: " + err.message));
});

// ✨ [수정 완료] 완벽 정답 및 채점지 발급 모듈
app.get('/download/answer', (req, res) => {
    const examNum = req.query.exam || '1';
    const questions = backendExamData[examNum] || [];
    const numMap = ["①", "②", "③", "④", "⑤"];

    let tableRows = '';
    let essayAnswerContent = '';

    questions.forEach(q => {
        if(q.type === 'choice') {
            tableRows += `
                <tr>
                    <td><strong>${q.id}</strong></td>
                    <td class="answer-text">${numMap[q.answer - 1]}</td>
                    <td style="text-align:left;">${q.feedback}</td>
                </tr>
            `;
        } else if(q.type === 'essay') {
            essayAnswerContent += `
                <div class="question-block">
                    <div class="question-text"><strong>${q.id}. ${q.question}</strong></div>
                    <div class="desc-answer-box">
                        <span class="answer-text">[필수 키워드 채점 기준]</span><br>
                        검색 대상 단어: <code style="background:#eef; padding:2px 4px;">${q.keywords.join(', ')}</code><br><br>
                        <span class="answer-text">[교사 모범 답안 예시]</span><br>
                        해당 핵심 개념어가 2개 이상 유기적으로 포함되었을 시 정답으로 인정합니다.
                    </div>
                </div>
            `;
        }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">${pdfStyle}</head>
    <body>
        <div class="header" style="border-bottom-color: #E53E3E;">
            <h1 class="title" style="color: #E53E3E;">✨ 2학년 정보 기말평가 모의고사 (제 ${examNum}회 정답지)</h1>
            <p class="subtitle">교과목: 정보 | 정답 확인 및 서술형 평가 교사 채점 가이드라인</p>
        </div>
        
        <div class="section-title" style="color: #E53E3E; border-left-color: #E53E3E;">I. 선택형 정답 리스트</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">문항 번호</th>
                    <th style="width: 20%;">정답</th>
                    <th style="width: 65%;">해설 및 오답 피드백</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>

        ${essayAnswerContent ? `<div class="section-title" style="color: #E53E3E; border-left-color: #E53E3E;">II. 서술형 문항 채점 기준표</div>${essayAnswerContent}` : ''}
        <div class="footer">2학년 정보 기말대비 모의평가 제 ${examNum}회 - 정답 및 해설지</div>
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
