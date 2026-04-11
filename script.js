// ĐIỀN LINK WEB APP SCRIPT TẠI ĐÂY ("https://script.google.com/macros/s/...")
const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyWT7NxnVrl4qbxJ7S7flGykGSVDnSTBAmQot5KFW6VUkiF9ov30ezD0bCcD5amOS8H/exec";

// CẤU HÌNH SEPAY
const SEPAY_API_KEY = "K2AJXHECOHBZJQDMNLSX0J36A7IS8BKWTCGRV11AIBQRO4DSG4YJFZ7PIK3Y5BFX";
const SEPAY_STK = "80002345939";
const SEPAY_BANK = "MSB";
const SEPAY_ACCOUNT_NAME = "QUACH THAI UYEN"; // Bạn có thể sửa đúng tên mình


// UI Tương tác Hình ảnh
const mainVideoContainer = document.getElementById('main-video');
const mainImageContainer = document.getElementById('main-image');
const thumbnails = document.querySelectorAll('.thumb-item');

function resetThumbnails() {
    thumbnails.forEach(t => t.classList.remove('active'));
}

window.showImage = function (imgSrc) {
    mainVideoContainer.style.display = 'none';
    mainImageContainer.style.display = 'block';
    mainImageContainer.src = imgSrc;
    resetThumbnails();
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

window.showVideo = function () {
    mainVideoContainer.style.display = 'block';
    mainImageContainer.style.display = 'none';
    resetThumbnails();
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

// Chỉnh Số Lượng
window.changeQty = function (amount) {
    const qtyInput = document.getElementById('qty-input');
    let currentVal = parseInt(qtyInput.value) || 1;
    currentVal += amount;
    if (currentVal < 1) currentVal = 1;
    qtyInput.value = currentVal;
};

// Quản lý GIỎ HÀNG (Cart Logic)
let cartQty = 0;
let PRICE = 959000; // Giá mặc định nếu không kết nối được server

// TỰ ĐỘNG ĐỒNG BỘ GIÁ TỪ CRM
async function syncPriceFromCRM() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            const products = await res.json();
            const mainProduct = products.find(p => p.id == 1);
            if (mainProduct && mainProduct.price) {
                PRICE = mainProduct.price;
                renderDynamicPrices();
            }
        }
    } catch (e) {
        console.warn("Không thể lấy giá từ CRM, dùng giá mặc định.");
    }
}

function renderDynamicPrices() {
    const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(PRICE);
    
    // Cập nhật giá chính trên trang
    const mainPriceEl = document.getElementById('price-main');
    if (mainPriceEl) mainPriceEl.innerText = formattedPrice;

    // Cập nhật giá trong Chatbot script
    const priceFaq = chatbotData.faqs.find(f => f.q.includes("Giá"));
    if (priceFaq) {
        priceFaq.a = `Hiện tại đệm Rulax đang có giá cực ưu đãi là ${formattedPrice} (giá gốc 1.355.000₫). Đây là mức giá quá hời cho một bộ đệm cao cấp có cả làm mát và massage. Anh em nên tranh thủ chốt sớm vì chương trình Flash Sale có hạn.`;
    }
}

// Chạy đồng bộ ngay khi tải trang
syncPriceFromCRM();

window.toggleCart = function () {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
    } else {
        sidebar.classList.add('open');
        overlay.style.display = 'block';
        renderCartUI();
    }
}

window.addToCart = function () {
    const addQty = parseInt(document.getElementById('qty-input').value) || 1;
    cartQty += addQty;

    // Nảy số trên icon giỏ hàng
    document.getElementById('cart-badge').innerText = cartQty;

    // Mở slide giỏ hàng
    toggleCart();
}

function renderCartUI() {
    const container = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');

    if (cartQty === 0) {
        container.innerHTML = "<p style='text-align:center; margin-top:20px; color:#888;'>Giỏ hàng trống</p>";
        totalPriceEl.innerText = "0₫";
        return;
    }

    // Render 1 item chung (vì chỉ có 1 model)
    container.innerHTML = `
        <div class="cart-item">
            <img src="anh1.jpg" alt="Đệm làm mát">
            <div class="cart-item-info">
                <div class="cart-item-title">Đệm Thông Gió Làm Mát Ghế Ô Tô Rulax</div>
                <div style="color:#ee4d2d; font-weight:bold; margin-top:5px;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(PRICE)}</div>
                <div style="color:#666; margin-top:2px;">Số lượng: x${cartQty}</div>
            </div>
        </div>
    `;

    let total = cartQty * PRICE;
    totalPriceEl.innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);
}

// Xử lý Popup Form Mua Hàng
const orderModal = document.getElementById('order-modal');

window.buyNow = function () {
    if (cartQty === 0) {
        cartQty = parseInt(document.getElementById('qty-input').value) || 1;
        document.getElementById('cart-badge').innerText = cartQty;
    }
    openOrderModal();
}

window.openOrderModal = function () {
    if (cartQty === 0) {
        alert("Vui lòng thêm sản phẩm vào giỏ hàng!");
        return;
    }
    toggleCart(); // Đóng giỏ hàng
    document.getElementById('form-total-qty').innerText = cartQty;
    const total = cartQty * PRICE;
    document.getElementById('form-total-price').innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);
    orderModal.style.display = 'flex';
}

window.closeOrderModal = function () {
    orderModal.style.display = 'none';
}

// Thông báo chung
window.showAlert = function (msg) {
    document.getElementById('alert-message').innerHTML = msg;
    document.getElementById('alert-modal').style.display = 'flex';
}
window.closeAlertModal = function () {
    document.getElementById('alert-modal').style.display = 'none';
}


// Biến lưu trữ data tạm chờ xác nhận
let pendingOrderData = null;

// XỬ LÝ GỬI FORM LÊN GOOGLE SHEET
window.submitForm = function (e) {
    e.preventDefault(); // chặn hành vi gửi form mặc định

    const phoneVal = document.getElementById('cphone').value;
    if (!/^[0-9]{10}$/.test(phoneVal)) {
        alert("❌ Lỗi: Số điện thoại không đúng định dạng. Vui lòng kiểm tra lại (yêu cầu điền đúng 10 chữ số)!");
        return;
    }
    // 1. Thu thập dữ liệu và chuyển sang bảng chờ xác nhận
    pendingOrderData = {
        form_type: "ORDER", // Đánh dấu đây là dữ liệu đặt hàng
        name: document.getElementById('cname').value,
        phone: phoneVal,
        address: document.getElementById('caddress').value,
        notes: document.getElementById('cnotes').value,
        product: "Đệm Thông Gió Làm Mát Rulax",
        quantity: cartQty,
        total_price: cartQty * PRICE,
        date: new Date().toLocaleString()
    };

    // Điền thông tin lên bảng Confirm
    document.getElementById('conf-name').innerText = pendingOrderData.name;
    document.getElementById('conf-phone').innerText = pendingOrderData.phone;
    document.getElementById('conf-address').innerText = pendingOrderData.address;

    // Tắt bảng Form đi, bật bảng Confirm lên
    closeOrderModal();
    document.getElementById('confirm-modal').style.display = 'flex';
}

window.editInfo = function () {
    // Tắt bảng Confirm đi, bật lại bảng Form (dữ liệu khách vẫn còn nguyên)
    document.getElementById('confirm-modal').style.display = 'none';
    document.getElementById('order-modal').style.display = 'flex';
}

window.executeOrder = function () {
    if (!pendingOrderData) return;

    const btnEdit = document.querySelector('#confirm-modal .btn-buy-now[onclick="editInfo()"]');
    const btnConfirm = document.querySelector('#confirm-modal .btn-buy-now[onclick="executeOrder()"]');
    const loadingText = document.getElementById('confirm-loading');

    btnEdit.style.display = 'none';
    btnConfirm.style.display = 'none';
    loadingText.style.display = 'block';

    // 1. Gửi lên Google Sheets và CRM với trạng thái mặc định là COD
    sendOrderToGoogle('COD').then((crmResponse) => {
        // Lưu ID từ CRM để cập nhật nếu thanh toán SePay thành công
        if (crmResponse && crmResponse.id) {
            pendingOrderData.crm_id = crmResponse.id;
        }
        
        // Lưu thông tin vào localStorage để trang thanks.html hiển thị
        localStorage.setItem('last_order_info', JSON.stringify({
            ...pendingOrderData,
            payment_status: 'COD'
        }));

        document.getElementById('confirm-modal').style.display = 'none';
        
        const totalToPay = pendingOrderData.total_price;

        // Reset giỏ hàng
        cartQty = 0;
        document.getElementById('cart-badge').innerText = 0;
        document.getElementById('checkout-form').reset();

        btnEdit.style.display = 'block';
        btnConfirm.style.display = 'block';
        loadingText.style.display = 'none';

        // 2. MỞ BẢNG THANH TOÁN QR
        openPaymentModal(totalToPay);
    });
}

window.sendOrderToGoogle = function (paymentStatus) {
    if (!pendingOrderData) return Promise.resolve(null);

    const dataToSend = {
        ...pendingOrderData,
        payment_status: paymentStatus
    };

    // Trả về promise để executeOrder có thể lấy được ID từ CRM
    return new Promise((resolve) => {
        Promise.all([
            fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            }),
            fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            }).then(res => res.json()).catch(err => console.error("Lỗi gửi CRM:", err))
        ])
        .then((results) => { 
            const crmData = results[1]; // Kết quả từ fetch('/api/orders')
            resolve(crmData);
        })
        .catch(err => {
            console.error("Lỗi gửi dữ liệu:", err);
            resolve(null);
        });
    });
}

// Tính năng đếm ngược Flash Sale 15 phút
let timeLeft = 15 * 60;
const fsM = document.getElementById('fs-m');
const fsS = document.getElementById('fs-s');

setInterval(() => {
    if (timeLeft > 0) {
        timeLeft--;
        let m = Math.floor(timeLeft / 60);
        let s = Math.floor(timeLeft % 60);
        fsM.innerText = m < 10 ? '0' + m : m;
        fsS.innerText = s < 10 ? '0' + s : s;
    }
}, 1000);

// Xử lý Gửi Form Waitlist
window.submitWaitlist = function (e) {
    e.preventDefault();

    // Kiểm tra đã gán Webhook chưa
    if (GOOGLE_APP_SCRIPT_URL === "HIỆN_TẠI_CHƯA_CÓ_LINK") {
        alert("CHƯA CẬP NHẬT LINK APP SCRIPT!\nBạn phải cài đặt code Google App Script như hướng dẫn và dán URL vào file script.js dòng trên cùng thì hệ thống mới chạy.");
        return;
    }

    // Thu thập dữ liệu
    const data = {
        form_type: "WAITLIST", // Thêm cờ phân biệt biểu mẫu
        name: document.getElementById('wl-name').value,
        phone: document.getElementById('wl-phone').value,
        drivingTime: document.querySelector('input[name="wl-time"]:checked').value,
        sweatingCondition: document.querySelector('input[name="wl-sweat"]:checked').value,
        carModel: document.getElementById('wl-car').value,
        date: new Date().toLocaleString()
    };

    // Gửi song song tới Server cục bộ (nếu có) và Google App Script Webhook
    Promise.all([
        fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(() => {/* Silent catch: bỏ qua nếu server lỗi/không tồn tại */ }),

        fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
    ])
        .then(() => {
            // Hiện thông báo cảm ơn (Luôn hiện vì Google Sheet thường sẽ thành công)
            showAlert("<b style='color:#28a745; font-size:20px;'>🎉 GỬI THÔNG TIN THÀNH CÔNG!</b><br><br>Cảm ơn Anh/Chị đã tham gia khảo sát. Dữ liệu đã được ghi nhận.");
            // Reset form
            document.getElementById('waitlist-form').reset();
        })
        .catch(err => {
            console.warn("Lỗi đồng bộ (có thể do thiếu server):", err);
            // Nếu Google Sheet cũng tèo thì mới báo lỗi mạng thực sự
            alert("Đã có lỗi xảy ra. Vui lòng kiểm tra lại kết nối mạng!");
        });
};

// ==========================================
// CHATBOT LOGIC
// ==========================================
const chatbotData = {
    greeting: "Chào anh em. Tôi thấy anh em đang quan tâm đến bộ đệm làm mát Rulax. Nói thật là thời tiết này mà ngồi ghế da ô tô không có cái này thì đúng là cực hình. Anh em cần tôi giải đáp vấn đề gì về kỹ thuật hay tính năng thì cứ nói, tôi sẽ trả lời thẳng vào vấn đề.",
    faqs: [
        { q: "Giá bán bao nhiêu?", a: "Hiện tại đệm Rulax đang có giá cực ưu đãi là 959.000₫ (giá gốc 1.355.000₫). Đây là mức giá quá hời cho một bộ đệm cao cấp có cả làm mát và massage. Anh em nên tranh thủ chốt sớm vì chương trình Flash Sale có hạn." },
        { q: "Có ồn không?", a: "Nói thẳng là có tiếng quạt, nhưng nó cực kỳ êm. Anh em bật nhạc hoặc đi trên đường thì tiếng ồn lốp còn to hơn nhiều. Tôi đã test kỹ, quạt thế hệ mới chạy rất đều, không gây đau đầu như mấy loại rẻ tiền trôi nổi đâu." },
        { q: "Lắp được cho xe gì?", a: "Vừa hết. Thiết kế của đệm Rulax là phom chuẩn cho các dòng ghế ô tô hiện nay. Từ sedan đến xe tải, anh em chỉ việc đặt lên, cài dây cố định là xong. Rõ ràng là tính linh hoạt rất cao." },
        { q: "Có hỏng điện xe không?", a: "Vấn đề này anh em yên tâm. Công suất của đệm đã được tính toán kỹ để không làm quá tải hệ thống. Nó chỉ hoạt động khi xe nổ máy, không hề ảnh hưởng đến ắc quy hay can thiệp vào dây điện zin của xe. Thực tế là cắm phát ăn ngay." },
        { q: "Bảo hành bao lâu?", a: "Rulax bảo hành 12 tháng. Trong 15 ngày đầu nếu có lỗi kỹ thuật, tôi đổi mới luôn. Làm ăn kinh doanh quan trọng nhất là uy tín, không lằng nhằng." },
        { q: "Lưới có xẹp không?", a: "Chất liệu này là lưới tổ ong 3D cao cấp, độ đàn hồi cực tốt. Anh em ngồi cả năm cũng không xẹp nổi. Vấn đề ở đâu? Vấn đề là nó tạo ra khe hở để gió lưu thông liên tục, không bao giờ có chuyện bí mồ hôi." },
        { q: "Giá có đắt không?", a: "Anh em nên hiểu câu 'tiền nào của nấy'. Đệm rẻ tiền dùng quạt yếu, vỏ nhựa nhanh giòn, ngồi vài bữa là xẹp. Rulax là hàng chính hãng, quạt mạnh, lưới bền, có cả massage. Đầu tư một lần dùng vài mùa nóng, tính ra là quá rẻ." },
        { q: "Có massage thật không?", a: "Chức năng massage của đệm là dùng sóng rung thư giãn, giúp lưu thông máu ở vùng thắt lưng. Nó không phải con lăn đấm bóp mạnh, nhưng thừa đủ để anh em không bị mỏi khi lái xe đường dài. Rất thực tế." },
        { q: "Ngồi có bị cao không?", a: "Đệm thiết kế mỏng nhưng chắc chắn, không làm thay đổi tư thế lái quá nhiều. Anh em ngồi vào sẽ thấy nó ôm sát cơ thể, thậm chí là nâng đỡ cột sống tốt hơn ghế zin." },
        { q: "Có hỏng ghế da không?", a: "Mặt dưới của đệm được thiết kế nhám chống trượt nhưng chất liệu rất mềm, không hề gây trầy xước hay để lại vết trên ghế da. Thực tế nó còn giúp bảo vệ ghế da khỏi mồ hôi trực tiếp." },
        { q: "Giao hàng bao lâu?", a: "Tôi xử lý đơn rất nhanh. Nếu anh em ở nội thành thì có thể giao hỏa tốc ngay. Ở tỉnh thì tầm 2-3 ngày là hàng đến tay. Nói tóm lại là anh em không phải chờ lâu." },
        { q: "Để mình nghĩ thêm đã...", a: "Anh em cứ thoải mái cân nhắc nhé. Vấn đề ở đâu anh em cứ nói tôi tư vấn thêm cho. Mà anh em cứ yên tâm, hàng Rulax cho phép kiểm tra hàng khi nhận, ưng ý đúng chất lượng mới thanh toán. Chẳng có gì phải lo cả." },
        { q: "Có phù hợp với tôi không?", a: "Nói tóm lại là cực kỳ đơn giản: chỉ cần xe anh em có nguồn điện tẩu sạc 12V (loại phổ biến nhất hiện nay) là đều dùng ngon lành nhé. Từ sedan, SUV đến xe tải đều lắp đẹp hết. Anh em yên tâm." }
    ],
    closing: "Nói tóm lại, nếu anh em đã quá mệt mỏi với việc lưng áo lúc nào cũng ướt nhẹp mồ hôi thì Rulax là giải pháp chất lượng nhất hiện giờ. Giá đang đợt Flash Sale cực tốt, anh em đặt luôn cho nóng.",
    formCTA: "Nếu anh em còn cần cân nhắc thêm thì cũng không sao. Nhưng tôi khuyên anh em nên điền trước thông tin vào cái form khảo sát này để tôi ưu tiên gửi khuyến mãi sau."
};

const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');
const closeChatbot = document.getElementById('close-chatbot');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotOptions = document.getElementById('chatbot-options');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSendBtn = document.getElementById('chatbot-send-btn');
const unreadDot = document.querySelector('.unread-dot');

// Bản đồ từ khóa để chatbot trả lời câu hỏi tự do
const keywordMap = [
    { keywords: ['giá', 'nhiêu', 'tiền', 'bao nhiêu'], index: 0 },
    { keywords: ['ồn', 'tiếng', 'âm thanh'], index: 1 },
    { keywords: ['xe gì', 'loại xe', 'vừa không', 'tương thích'], index: 2 },
    { keywords: ['điện', 'ắc quy', 'tẩu', 'cháy', 'hỏng xe'], index: 3 },
    { keywords: ['bảo hành', 'sửa', 'đổi trả'], index: 4 },
    { keywords: ['xẹp', 'lún', 'bền', 'bí'], index: 5 },
    { keywords: ['đắt', 'giá', 'bao nhiêu', 'tiền'], index: 6 },
    { keywords: ['massage', 'rung', 'đấm'], index: 7 },
    { keywords: ['cao', 'chông chênh', 'tư thế'], index: 8 },
    { keywords: ['ghế da', 'trầy', 'xước'], index: 9 },
    { keywords: ['giao', 'ship', 'bao lâu', 'nhận'], index: 10 },
    { keywords: ['nghĩ thêm', 'suy nghĩ', 'cân nhắc', 'để xem'], index: 11 },
    { keywords: ['phù hợp', 'dùng được', 'xe tôi', 'lái xe'], index: 12 }
];

let isChatOpen = false;
let hasGreeted = false;

chatbotToggle.onclick = () => {
    isChatOpen = !isChatOpen;
    chatbotWindow.style.display = isChatOpen ? 'flex' : 'none';
    unreadDot.style.display = 'none';
    if (isChatOpen && !hasGreeted) {
        startChat();
    }
};

closeChatbot.onclick = (e) => {
    e.stopPropagation();
    isChatOpen = false;
    chatbotWindow.style.display = 'none';
};

// Gửi tin nhắn khi nhấn nút hoặc nhấn Enter
chatbotSendBtn.onclick = () => handleCustomQuestion();
chatbotInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleCustomQuestion();
};

function addMessage(text, sender = 'bot') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerText = text;
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function startChat() {
    hasGreeted = true;
    setTimeout(() => {
        addMessage(chatbotData.greeting);
        renderOptions();
    }, 500);
}

function renderOptions() {
    chatbotOptions.innerHTML = '';
    // Chỉ hiện bớt 4 câu hỏi tiêu biểu để giao diện gọn gàng
    chatbotData.faqs.slice(0, 4).forEach((faq, index) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = faq.q;
        btn.onclick = () => handleFaq(index);
        chatbotOptions.appendChild(btn);
    });

    // Nút đặt mua nhanh
    const buyBtn = document.createElement('button');
    buyBtn.className = 'opt-btn';
    buyBtn.style.borderColor = '#28a745';
    buyBtn.style.color = '#28a745';
    buyBtn.innerText = "🛒 Đặt mua ngay";
    buyBtn.onclick = () => handleBuy();
    chatbotOptions.appendChild(buyBtn);
}

function handleFaq(index) {
    const faq = chatbotData.faqs[index];
    addMessage(faq.q, 'user');
    setTimeout(() => {
        addMessage(faq.a, 'bot');
    }, 400);
}

function handleCustomQuestion() {
    const text = chatbotInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatbotInput.value = '';

    setTimeout(() => {
        const lowerText = text.toLowerCase();
        let foundIndex = -1;

        // Kiểm tra nếu khách để lại số điện thoại (định dạng 10 chữ số)
        const phoneRegex = /(0[3|5|7|8|9][0-9]{8}|[0-9]{10})/g;
        if (phoneRegex.test(text)) {
            addMessage("Cảm ơn bạn đã để lại số điện thoại. Tôi đã ghi nhận và sẽ liên hệ lại cho bạn sớm nhất có thể để tư vấn kỹ hơn nhé!", 'bot');
            return;
        }

        // Tìm kiếm theo từ khóa
        for (const item of keywordMap) {
            if (item.keywords.some(k => lowerText.includes(k))) {
                foundIndex = item.index;
                break;
            }
        }

        if (foundIndex !== -1) {
            addMessage(chatbotData.faqs[foundIndex].a, 'bot');
        } else if (lowerText.includes('mua') || lowerText.includes('đặt hàng')) {
            handleBuy();
        } else {
            // Câu trả lời mặc định đúng giọng brand
            addMessage("Tôi chưa rõ ý anh em lắm. Hay là anh em cứ để lại Số điện thoại ở đây, tôi gọi điện giải thích trực tiếp cho nhanh, không lằng nhằng. Hoặc anh em chọn các câu hỏi bên dưới nhé.", 'bot');
            renderOptions();
        }
    }, 600);
}

function handleBuy() {
    addMessage("Tôi muốn đặt mua ngay!", 'user');
    setTimeout(() => {
        addMessage(chatbotData.closing, 'bot');
        const buyNowBtn = document.createElement('button');
        buyNowBtn.className = 'buy-now-chat';
        buyNowBtn.innerText = "BẤM VÀO ĐÂY ĐỂ ĐẶT HÀNG";
        buyNowBtn.onclick = () => {
            isChatOpen = false;
            chatbotWindow.style.display = 'none';
            window.buyNow();
        };
        chatbotMessages.appendChild(buyNowBtn);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

        setTimeout(() => {
            addMessage(chatbotData.formCTA, 'bot');
            const formBtn = document.createElement('button');
            formBtn.className = 'opt-btn';
            formBtn.innerText = "📝 Điền form khảo sát";
            formBtn.onclick = () => {
                isChatOpen = false;
                chatbotWindow.style.display = 'none';
                document.getElementById('waitlist-section').scrollIntoView({ behavior: 'smooth' });
            };
            chatbotMessages.appendChild(formBtn);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 1000);
    }, 600);
}

// ==========================================
// SEPAY AUTOMATION LOGIC
// ==========================================
let paymentCheckInterval = null;

window.openPaymentModal = function (amount) {
    // Sử dụng CRM ID để Webhook có thể đối soát chính xác đơn hàng trong database
    const orderCode = (pendingOrderData && pendingOrderData.crm_id) ? pendingOrderData.crm_id : Math.floor(Date.now() / 1000);
    const description = "DH" + orderCode;
    
    const qrUrl = `https://qr.sepay.vn/img?acc=${SEPAY_STK}&bank=${SEPAY_BANK}&amount=${amount}&des=${description}&template=compact`;

    document.getElementById('qr-image').src = qrUrl;
    document.getElementById('sepay-description').innerText = description;
    document.getElementById('payment-modal').style.display = 'flex';

    // Bắt đầu kiểm tra giao dịch (Polling fallback)
    startPaymentCheck(amount, description);
}

window.closePaymentModal = function () {
    document.getElementById('payment-modal').style.display = 'none';
    if (paymentCheckInterval) clearInterval(paymentCheckInterval);
    
    // Khi thoát bảng QR, chuyển hướng tới trang cảm ơn (vì đơn COD đã được tạo trước đó)
    window.location.href = 'thanks.html';
}

window.copySepayContent = function () {
    const content = document.getElementById('sepay-description').innerText;
    navigator.clipboard.writeText(content).then(() => {
        alert("Đã copy nội dung chuyển khoản!");
    });
}

function startPaymentCheck(amount, description) {
    if (paymentCheckInterval) clearInterval(paymentCheckInterval);

    // Kiểm tra mỗi 3 giây
    paymentCheckInterval = setInterval(() => {
        checkPaymentStatus(amount, description);
    }, 3000);
}

async function checkPaymentStatus() {
    // Chỉ kiểm tra nếu đã có ID đơn hàng từ CRM
    if (!pendingOrderData || !pendingOrderData.crm_id) return;

    try {
        // Kiểm tra trạng thái đơn hàng trực tiếp trên Server của bạn (đã được Webhook cập nhật)
        const response = await fetch(`/api/order-status?id=${pendingOrderData.crm_id}`);
        if (!response.ok) return;

        const data = await response.json();
        
        // Nếu trạng thái trong database đã đổi thành 'sepay' -> Thanh toán thành công!
        if (data.status === 'sepay') {
            clearInterval(paymentCheckInterval);
            handlePaymentSuccess();
        }
    } catch (error) {
        console.error("Lỗi kiểm tra trạng thái đơn hàng:", error);
    }
}

function handlePaymentSuccess() {
    document.getElementById('payment-spinner').style.display = 'none';
    document.getElementById('status-text').innerHTML = "<b style='color:#28a745;'>🎉 Đã nhận được thanh toán!</b>";
    document.getElementById('status-text').style.color = "#28a745";

    // Cập nhật trạng thái 'sepay' cho đơn hàng đã có trong CRM (Dùng ID đã lưu)
    if (pendingOrderData && pendingOrderData.crm_id) {
        fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: pendingOrderData.crm_id,
                status: 'sepay'
            })
        }).catch(err => console.error("Lỗi cập nhật trạng thái SePay:", err));
        
        // Cập nhật lại localStorage để trang thanks hiển thị đúng trạng thái
        const lastOrder = JSON.parse(localStorage.getItem('last_order_info') || '{}');
        lastOrder.payment_status = 'sepay';
        localStorage.setItem('last_order_info', JSON.stringify(lastOrder));
    }

    setTimeout(() => {
        window.location.href = 'thanks.html';
    }, 2000);
}
