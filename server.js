 require('dotenv').config();
 const express = require('express');
 const cors = require('cors');
 const path = require('path');
 const { SolapiMessageService } = require('solapi');

 const app = express();

 app.use(cors());
 app.use(express.json());
 app.use(express.static(__dirname));

 const messageService = new SolapiMessageService(
     process.env.SOLAPI_API_KEY,
     process.env.SOLAPI_API_SECRET
 );

 // 메인 페이지
 app.get('/', (req, res) => {
     res.sendFile(path.join(__dirname, 'index.html'));
 });

 // 매물 접수 API
 app.post('/api/register', async (req, res) => {
     try {
         const data = req.body;
         const text = `[매물 접수 완료] 소중한 매물, 책임지고 중개하겠습니다!

 안녕하세요, [대방 현 부동산]입니다.
 금일 접수하신 매물은 현재 저희가 관리 중인 네이버 부동산, 블로그, 지역 커뮤니티 등 주요 채널에 즉시 노출
 작업을 진행할 예정입니다.

 단순히 매물을 올리는 것에 그치지 않고, 매물의 가치가 돋보일 수 있도록 전략적으로 홍보하겠습니다. 빠른 시일 
 내에 좋은 소식으로 연락드리겠습니다. 감사합니다!`;

         const result = await messageService.sendOne({
             to: process.env.RECEIVER_NUMBER,
             from: process.env.SENDER_NUMBER,
             text: text,
             kakaoOptions: {
                 pfId: process.env.KAKAOTALK_PFID,
                 templateId: process.env.KAKAOTALK_TEMPLATE_ID
             }
         });

         res.status(200).json({ success: true });
     } catch (error) {
         console.error('발송 에러:', error);
         res.status(500).json({ success: false, message: error.message });
     }
 });

 module.exports = app; // Vercel을 위해 필수
