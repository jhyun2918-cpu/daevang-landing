document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.querySelector('main > section:not(#registration-section)');
    const heroSection = document.querySelector('.hero');
    const featuresSection = document.querySelector('.features');
    const registrationSection = document.getElementById('registration-section');
    const footer = document.querySelector('footer');
    const showListingBtn = document.getElementById('show-listing-btn');
    const backToMainBtn = document.getElementById('back-to-main');
    const logoLink = document.getElementById('logo-link');
    const listingForm = document.getElementById('listingForm');

    // 화면 전환 함수
    function toggleView(showRegistration) {
        if (showRegistration) {
            heroSection.style.display = 'none';
            featuresSection.style.display = 'none';
            registrationSection.style.display = 'block';
            if (footer) footer.style.display = 'none'; // 매물접수 페이지에서 푸터 삭제
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            heroSection.style.display = 'block';
            featuresSection.style.display = 'block';
            registrationSection.style.display = 'none';
            if (footer) footer.style.display = 'block'; // 메인 페이지에서 푸터 노출
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // 로고 클릭 시 메인으로 이동
    if (logoLink) {
        logoLink.addEventListener('click', function(e) {
            e.preventDefault();
            toggleView(false);
        });
    }

    // 간편 매물 접수 버튼 클릭
    if (showListingBtn) {
        showListingBtn.addEventListener('click', function() {
            toggleView(true);
        });
    }

    // 뒤로가기 버튼 클릭
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', function() {
            toggleView(false);
        });
    }

    // 폼 제출 로직
    if (listingForm) {
        listingForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 폼 데이터 수집
            const formData = new FormData(listingForm);
            const data = {
                ownerName: formData.get('owner-name') || '(미입력)',
                ownerTelecom: formData.get('owner-telecom') || '(미입력)',
                ownerPhone: formData.get('owner-phone') || '(미입력)',
                regName: formData.get('reg-name') || '(미입력)',
                regPhone: formData.get('reg-phone') || '(미입력)',
                address: formData.get('address'),
                propertyType: formData.get('property-type'),
                transactionType: formData.get('transaction-type'),
                salePrice: formData.get('sale-price') || '-',
                deposit: formData.get('deposit') || '-',
                monthlyRent: formData.get('monthly-rent') || '-',
                message: formData.get('message') || '(없음)'
            };

            // 기본 유효성 검사
            if (!data.address || !data.propertyType || !data.transactionType) {
                alert('필수 매물 정보를 모두 입력해주세요.');
                return;
            }

            try {
                // 백엔드 API 호출 (상대 경로 사용)
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (result.success) {
                    const successName = data.ownerName !== '(미입력)' ? data.ownerName : data.regName;
                    alert(`${successName}님, 매물 접수가 완료되었습니다.\n빠른 시일 내에 연락드리겠습니다.`);
                    
                    // 폼 초기화 및 메인으로 복구
                    listingForm.reset();
                    toggleView(false);
                } else {
                    alert('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('서버와 통신할 수 없습니다. 관리자에게 문의해주세요.');
            }
        });
    }
});
