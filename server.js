require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { SolapiMessageService } = require('solapi');
const nodemailer = require('nodemailer');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3000;

// 솔라피 서비스 초기화
const messageService = new SolapiMessageService(process.env.SOLAPI_API_KEY, process.env.SOLAPI_API_SECRET);

// 이메일 전송기 설정
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 이메일 발송 함수
const sendEmailNotification = async (newLead) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_RECEIVER,
            subject: `[매물 접수 알림] ${newLead.ownerName}님의 매물이 접수되었습니다.`,
            html: `
                <h3>새로운 매물 접수 상세 정보</h3>
                <p><strong>등록일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                <hr>
                <p><strong>소유자:</strong> ${newLead.ownerName} (${newLead.ownerPhone})</p>
                <p><strong>접수자:</strong> ${newLead.regName} (${newLead.regPhone})</p>
                <p><strong>매물종류:</strong> ${newLead.propertyType}</p>
                <p><strong>거래유형:</strong> ${newLead.transactionType}</p>
                <p><strong>주소:</strong> ${newLead.address}</p>
                <p><strong>가격:</strong> 매매 ${newLead.salePrice} / 보증금 ${newLead.deposit} / 월세 ${newLead.monthlyRent}</p>
                <p><strong>상세내용:</strong><br>${newLead.message.replace(/\n/g, '<br>')}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('이메일 알림 발송 완료');
    } catch (err) {
        console.error('이메일 발송 실패:', err);
    }
};

// 구글 시트 설정
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: SCOPES,
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 정적 파일 서빙 (HTML, CSS, JS, 이미지 등 현재 폴더의 파일들)
app.use(express.static(__dirname));

// 구글 시트 저장 함수
const saveToGoogleSheet = async (newLead) => {
    try {
        await doc.loadInfo(); // 시트 정보 로드
        const sheet = doc.sheetsByIndex[0]; // 첫 번째 탭 선택
        
        await sheet.addRow({
            '등록일시': new Date().toLocaleString('ko-KR'),
            '소유자': `${newLead.ownerName} (${newLead.ownerPhone})`,
            '접수자': `${newLead.regName} (${newLead.regPhone})`,
            '매물종류': newLead.propertyType,
            '거래유형': newLead.transactionType,
            '주소': newLead.address,
            '가격': `${newLead.salePrice}/${newLead.deposit}/${newLead.monthlyRent}`,
            '상세내용': newLead.message
        });
        console.log('구글 시트 저장 완료:', newLead.ownerName);
    } catch (err) {
        console.error('구글 시트 저장 실패:', err);
    }
};

// 메인 페이지 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 매물 접수 API 엔드포인트
app.post('/api/register', async (req, res) => {
    console.log('새로운 접수 요청 수신:', req.body.ownerName);
    try {
        const data = req.body;
        
        // 1. 구글 시트에 저장
        await saveToGoogleSheet(data);

        // 2. 이메일 알림 발송 (새로 추가)
        await sendEmailNotification(data);

        // 3. 메시지 내용 구성 (제공해주신 템플릿과 100% 일치해야 함)
        const text = `[매물 접수 완료] 소중한 매물, 책임지고 중개하겠습니다!

안녕하세요, [대방 현 부동산]입니다.
금일 접수하신 매물은 현재 저희가 관리 중인 네이버 부동산, 블로그, 지역 커뮤니티 등 주요 채널에 즉시 노출 작업을 진행할 예정입니다.

단순히 매물을 올리는 것에 그치지 않고, 매물의 가치가 돋보일 수 있도록 전략적으로 홍보하겠습니다. 빠른 시일 내에 좋은 소식으로 연락드리겠습니다. 감사합니다!`;

        // 4. 메시지 발송 (알림톡 우선)
        const messagePayload = {
            to: process.env.RECEIVER_NUMBER,
            from: process.env.SENDER_NUMBER,
            text: text,
            kakaoOptions: {
                pfId: process.env.KAKAOTALK_PFID,
                templateId: process.env.KAKAOTALK_TEMPLATE_ID
            }
        };

        const result = await messageService.sendOne(messagePayload);
        console.log('메시지 발송 성공:', result);

        res.status(200).json({ success: true, message: '접수 및 알림 발송 완료' });
    } catch (error) {
        // 상세 에러 출력
        console.error('처리 과정 중 에러 발생:', error.message);
        if (error.response) {
            console.error('상세 에러 내역:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ 
            success: false, 
            message: '처리에 실패했습니다.',
            error: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`========================================`);
    console.log(`서버가 정상적으로 시작되었습니다.`);
    console.log(`주소: http://localhost:${port}`);
    console.log(`========================================`);
});
