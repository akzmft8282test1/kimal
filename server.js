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
// [라우팅 경로 정의] - HTML 제공과 API 분리
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/moui', (req, res) => res.sendFile(path.join(__dirname, 'moui.html')));
app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'download.html')));

// 프론트엔드가 실시간으로 문제를 불러올 수 있도록 제공하는 API
app.get('/api/exam-data', (req, res) => {
    res.json(examData);
});

// ==========================================
// 📄 핵심: PDF 동적 다운로드 엔진 (경로 단순화: /download/:type)
// ==========================================
app.post('/download/:type', async (req, res) => {
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

        // exam_data.json의 한글 속성명("choice", "essay") 데이터 매핑 배열 추출
        const choiceList = targetExam.choice || [];
        const essayList = targetExam.essay || [];

        // 1. 선택형(객관식) 컴파일
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

        // 2. 서술형(주관식) 컴파일
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

        const isQ = (type === 'question');
        const docTitle = isQ ? `제 ${examNum}회 모의평가 문제지` : `제 ${examNum}회 모의평가 정답 및 해설지`;
        
        let bodyContent = isQ ? `
            <div class="info-box"><strong>학년/반/번호:</strong> 2학년 _____반 _____번 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>이름:</strong> _________________</div>
            <div class="section-title">I. 선택형 객관식 문항</div>
            ${choiceHtml || '<p style="color:#a0aec0; font-size:13px;">선택형 문항이 비어있습니다.</p>'}
            <div class="section-title">II. 서술형 주관식 문항</div>
            ${essayHtml || '<p style="color:#a0aec0; font-size:13px;">서술형 문항이 비어있습니다.</p>'}
        ` : `
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

        const htmlLayout = `<!DOCTYPE html><html><head><meta charset="UTF-8">${pdfStyle}</head><body>
            <div class="header ${isQ ? '' : 'ans-type'}">
                <h1 class="title ${isQ ? '' : 'ans-type'}">📝 2026학년도 1학기 정보 기말고사 완벽 대비 (${docTitle})</h1>
            </div>
            ${bodyContent}
            <div class="footer">2학년 정보과 기말고사 자동 출제 시스템 - ${docTitle}</div>
        </body></html>`;

        pdf.generatePdf({ content: htmlLayout }, pdfOptions).then(pdfBuffer => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Exam_Ch_0${examNum}_${type}.pdf`);
            res.send(pdfBuffer);
        }).catch(err => res.status(500).send("PDF 컴파일 에러"));

    } catch (error) {
        res.status(500).send("서버 에러: " + error.message);
    }
});
