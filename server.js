require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3000;

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
app.use(express.static(__dirname));

// 구글 시트 저장 함수
const saveToGoogleSheet = async (newLead) => {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
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

        // 2. 이메일 알림 발송
        await sendEmailNotification(data);

        res.status(200).json({ success: true, message: '접수 및 이메일 발송 완료' });
    } catch (error) {
        console.error('처리 과정 중 에러 발생:', error.message);
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
    console.log(`이메일 알림 모드 활성화`);
    console.log(`주소: http://localhost:${port}`);
    console.log(`========================================`);
});
