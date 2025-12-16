// Simple chat widget (vanilla JS) based on your React App.js behaviour
import CONFIG from "../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
(function(){
  const API_URL = `${BASE_URL}/api/chat/send/`;
  const HISTORY_API_URL = `${BASE_URL}/api/chat/history/`;

  function el(tag, cls, attrs){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(attrs) Object.keys(attrs).forEach(k=>e.setAttribute(k, attrs[k]));
    return e;
  }

  function createWidget(){
    const wrapper = el('div','chatbot-wrapper');

    const toggle = el('button','chatbot-toggle');
    toggle.title = 'Chat với trợ lý';
    toggle.innerHTML = '🤖';

    const windowBox = el('div','chatbot-window');
    windowBox.style.display = 'none';

    const header = el('div','chatbot-header');
    header.innerHTML = '<span>🤖 Sport Ticket Chatbot</span>';
    // make header a flex container so controls inside align nicely
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    // reserve space on the right so the absolute close button doesn't overlap header content
    header.style.paddingRight = '48px';
    const closeBtn = el('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.background='transparent';
    closeBtn.style.border='none';

    closeBtn.style.color='#198754';

    // closeBtn.style.color='#fff';
    closeBtn.style.fontSize='18px';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.lineHeight = '1';
    // style as absolute positioned button so it's visually outside the header element
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', ()=>{ windowBox.style.display='none'; });

    const messages = el('div','chatbot-messages');

    const inputBar = el('div','chatbot-input');
    const input = el('input',null,{type:'text',placeholder:'Nhập tin nhắn...'});
    const sendBtn = el('button','send'); sendBtn.textContent = 'Gửi';
    inputBar.appendChild(input); inputBar.appendChild(sendBtn);

    // make windowBox a positioned container so closeBtn can be absolute inside it
    windowBox.style.position = 'relative';
    windowBox.appendChild(header);
    // append close button as a sibling inside windowBox (visually outside header)
    windowBox.appendChild(closeBtn);
    windowBox.appendChild(messages);
    windowBox.appendChild(inputBar);

    // initial greeting
    const initMsg = { sender: 'bot', text: 'Xin chào 👋! Tôi có thể giúp gì cho bạn hôm nay?' };
    addMessage(messages, initMsg);

    // current active session id (null => will try load latest from server)
    let currentSessionId = null;
    // Load chat history khi widget khởi tạo: cố gắng lấy phiên gần nhất
    loadChatHistory();

    // Thêm nút + để tạo session mới
    const newBtn = el('button','chatbot-new');
    newBtn.innerText = '+';
    newBtn.setAttribute('aria-label','Tạo cuộc trò chuyện mới');
    newBtn.title = 'Tạo cuộc trò chuyện mới';
    newBtn.style.background = 'transparent';
    newBtn.style.border = '1px solid rgba(255,255,255,0.2)';
    newBtn.style.color = '#198754';

    // newBtn.style.color = '#fff';
    newBtn.style.borderRadius = '6px';
    newBtn.style.width = '30px';
    newBtn.style.height = '30px';
    newBtn.style.display = 'inline-flex';
    newBtn.style.alignItems = 'center';
    newBtn.style.justifyContent = 'center';
    newBtn.style.cursor = 'pointer';
    newBtn.style.transition = 'all 120ms ease';
    newBtn.style.boxSizing = 'border-box';
    // hover effect
    newBtn.addEventListener('mouseenter', ()=>{
      newBtn.style.background = 'rgba(255,255,255,0.08)';
      newBtn.style.transform = 'translateY(-1px) scale(1.05)';
      newBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
    });
    newBtn.addEventListener('mouseleave', ()=>{
      newBtn.style.background = 'transparent';
      newBtn.style.transform = 'none';
      newBtn.style.boxShadow = 'none';
    });
    newBtn.addEventListener('click', ()=>{
      // tạo session mới, xoá nội dung hiển thị và thêm greeting
      currentSessionId = 'frontend-session-' + Date.now();
      localStorage.setItem('currentSessionId', currentSessionId);
      messages.innerHTML = '';
      addMessage(messages, initMsg);
    });
    header.appendChild(newBtn);

    // toggle behavior
    toggle.addEventListener('click', ()=>{
      if(windowBox.style.display === 'none') {
        windowBox.style.display = 'flex';
      } else {
        windowBox.style.display = 'none';
      }
    });

    sendBtn.addEventListener('click', ()=>{ sendMessage(); });
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMessage(); });

    let loading = false;

    async function loadChatHistory(sessionId){
      try {
        const customerId = localStorage.getItem('customer_id') || '1';
        let url = `${HISTORY_API_URL}?customer_id=${customerId}`;
        if(sessionId) url = `${HISTORY_API_URL}?session_id=${sessionId}&customer_id=${customerId}`;

        const resp = await fetch(url);

        if(!resp.ok) {
          console.warn('Load lịch sử chat thất bại, status:', resp.status);
          return;
        }

        const data = await resp.json();

        // server có thể trả session_id (phiên gần nhất)
        if(data.session_id) {
          currentSessionId = data.session_id;
          localStorage.setItem('currentSessionId', currentSessionId);
        }

        if(data.messages && data.messages.length > 0){
          // Xóa tin nhắn khởi tạo nếu có lịch sử
          const existingMsgs = messages.querySelectorAll('.chatbot-message');
          if(existingMsgs.length === 1) existingMsgs[0].remove();

          // Load lại lịch sử
          data.messages.forEach(msg => {
            addMessage(messages, {
              sender: 'user',
              text: msg.user_message
            });
            addMessage(messages, {
              sender: 'bot',
              text: msg.bot_response
            });
          });
        } else {
          // nếu server không có session, tạo mới và lưu
          if(!currentSessionId){
            currentSessionId = localStorage.getItem('currentSessionId') || 'frontend-session-' + Date.now();
            localStorage.setItem('currentSessionId', currentSessionId);
          }
        }
      } catch(err) {
        console.warn('Không thể load lịch sử chat:', err.message);
      }
    }

    async function sendMessage(){
      const text = input.value.trim();
      if(!text || loading) return;
      addMessage(messages,{sender:'user',text});
      input.value='';
      setLoading(messages,true);
      loading = true;

      // đảm bảo có session id
      if(!currentSessionId){
        currentSessionId = localStorage.getItem('currentSessionId') || 'frontend-session-' + Date.now();
        localStorage.setItem('currentSessionId', currentSessionId);
      }

      try{
        const resp = await fetch(API_URL,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ message: text, customer_id: parseInt(localStorage.getItem('customer_id')  || '1'), session_id: currentSessionId })
        });
        const data = await resp.json();
        if(resp.ok && data.reply){
          addMessage(messages,{sender:'bot',text: data.reply});
        } else {
          addMessage(messages,{sender:'bot',text: '❌ Lỗi khi nhận phản hồi từ máy chủ.'});
        }
      }catch(err){
        addMessage(messages,{sender:'bot',text: '⚠️ Không thể kết nối đến server.'});
      }finally{
        setLoading(messages,false);
        loading = false;
      }
    }

    function addMessage(container,msg){
      const row = el('div','chatbot-message ' + (msg.sender==='user'?'user':'bot'));
      if(msg.sender==='bot'){
        const avatar = el('div'); avatar.textContent='🤖'; avatar.style.width='32px'; avatar.style.height='32px'; avatar.style.display='flex'; avatar.style.alignItems='center'; avatar.style.justifyContent='center'; avatar.style.borderRadius='50%'; avatar.style.background='#4f46e5'; avatar.style.color='#198754'; avatar.style.fontSize='14px'; avatar.style.flex='0 0 32px'; row.appendChild(avatar);
        // const avatar = el('div'); avatar.textContent='🤖'; avatar.style.width='32px'; avatar.style.height='32px'; avatar.style.display='flex'; avatar.style.alignItems='center'; avatar.style.justifyContent='center'; avatar.style.borderRadius='50%'; avatar.style.background='#4f46e5'; avatar.style.color='#fff'; avatar.style.fontSize='14px'; avatar.style.flex='0 0 32px'; row.appendChild(avatar);
      }
      const bubble = el('div','bubble');
      // Xử lý các link /match_id
      let processedText = msg.text || '';
      const matchLinkRegex = /(https?:\/\/[^\s]+\/match\/\d+)|\/match\/(\d+)/g;

      processedText = processedText.replace(matchLinkRegex, (fullMatch, absLink, relId) => {
  const matchId = absLink ? absLink.split('/').pop() : relId;
  const href = absLink || `#`; // dùng # nếu là relative, hoặc tùy logic của bạn
  return `<a href="${href}" class="match-link" data-match-id="${matchId}">${fullMatch}</a>`;
});

      bubble.innerHTML = processedText;
      // row.appendChild(bubble);

      // Gắn event listener cho các link vừa tạo
      if (msg.sender === 'bot') {
        bubble.querySelectorAll('.match-link').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const matchId = e.target.dataset.matchId;
            if (matchId) {
              localStorage.setItem('selectedMatch', matchId);
              window.location.href = 'match_detail.html';
            }
          });
        });
      }
      row.appendChild(bubble);
      if(msg.sender==='user'){

        const avatar = el('div'); avatar.textContent='🧑'; avatar.style.width='32px'; avatar.style.height='32px'; avatar.style.display='flex'; avatar.style.alignItems='center'; avatar.style.justifyContent='center'; avatar.style.borderRadius='50%'; avatar.style.background='#9ca3af'; avatar.style.color='#198754'; avatar.style.fontSize='14px'; avatar.style.flex='0 0 32px'; row.appendChild(avatar);
        
      }
      container.appendChild(row);
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    function setLoading(container, state){
      if(state){
        const p = el('div','chatbot-loading'); p.textContent='🤔 Đang xử lý...'; p.setAttribute('data-chatbot-loading','true'); container.appendChild(p); container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        const elLoad = container.querySelector('[data-chatbot-loading]'); if(elLoad) elLoad.remove();
      }
    }

    wrapper.appendChild(windowBox);
    wrapper.appendChild(toggle);
    document.body.appendChild(wrapper);
  }

  // init on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createWidget);
  else createWidget();


})();

