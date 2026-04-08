    1 require('dotenv').config();
    2 const express = require('express');
    3 const cors = require('cors');
    4 const path = require('path');
    5 const { SolapiMessageService } = require('solapi');
    6 const { GoogleSpreadsheet } = require('google-spreadsheet');
    7 const { JWT } = require('google-auth-library');
    8
    9 const app = express();
   10 const port = process.env.PORT || 3000;
   11
   12 // 미들웨어 설정
   13 app.use(cors());
   14 app.use(express.json());
   15 app.use(express.static(__dirname));
   16
   17 // 솔라피 서비스 초기화
   18 const messageService = new SolapiMessageService(
   19     process.env.SOLAPI_API_KEY,
   20     process.env.SOLAPI_API_SECRET
   21 );
   22
   23 // 구글 시트 저장 함수 (v4.1.1 방식)
   24 const saveToGoogleSheet = async (newLead) => {
   25     try {
   26         const serviceAccountAuth = new JWT({
   27             email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
   28             key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
   29             scopes: ['https://www.googleapis.com/auth/spreadsheets'],
   30         });
   31
   32         const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
   33         await doc.loadInfo();
   34         const sheet = doc.sheetsByIndex[0];
   35
   36         await sheet.addRow({
   37             '등록일시': new Date().toLocaleString('ko-KR'),
   38             '소유자': `${newLead.ownerName} (${newLead.ownerPhone})`,
   39             '접수자': `${newLead.regName} (${newLead.regPhone})`,
   40             '매물종류': newLead.propertyType,
   41             '거래유형': newLead.transactionType,
   42             '주소': newLead.address,
   43             '가격': `${newLead.salePrice}/${newLead.deposit}/${newLead.monthlyRent}`,
   44             '상세내용': newLead.message
   45         });
   46         console.log('구글 시트 저장 완료');
   47     } catch (err) {
   48         console.error('구글 시트 저장 실패 상세:', err);
   49     }
   50 };
   51
   52 app.get('/', (req, res) => {
   53     res.sendFile(path.join(__dirname, 'index.html'));
   54 });
   55
   56 app.post('/api/register', async (req, res) => {
   57     try {
   58         const data = req.body;
   59
   60         // 1. 구글 시트 저장 시도 (비동기로 실행하여 실패해도 문자 발송은 진행)
   61         saveToGoogleSheet(data).catch(err => console.error("시트 저장 오류:", err));
   62
   63         // 2. 메시지 내용 구성 (템플릿 100% 일치)
   64         const text = `[매물 접수 완료] 소중한 매물, 책임지고 중개하겠습니다!
   65
   66 안녕하세요, [대방 현 부동산]입니다.
   67 금일 접수하신 매물은 현재 저희가 관리 중인 네이버 부동산, 블로그, 지역 커뮤니티 등 주요 채널에 즉시 노출   
      작업을 진행할 예정입니다.
   68
   69 단순히 매물을 올리는 것에 그치지 않고, 매물의 가치가 돋보일 수 있도록 전략적으로 홍보하겠습니다. 빠른 시일 
      내에 좋은 소식으로 연락드리겠습니다. 감사합니다!`;
   70
   71         const result = await messageService.sendOne({
   72             to: process.env.RECEIVER_NUMBER,
   73             from: process.env.SENDER_NUMBER,
   74             text: text,
   75             kakaoOptions: {
   76                 pfId: process.env.KAKAOTALK_PFID,
   77                 templateId: process.env.KAKAOTALK_TEMPLATE_ID
   78             }
   79         });
   80
   81         res.status(200).json({ success: true });
   82     } catch (error) {
   83         console.error('서버 에러:', error);
   84         res.status(500).json({ success: false, error: error.message });
   85     }
   86 });
   87
   88 module.exports = app; // Vercel용 내보내기
   89 app.listen(port);
