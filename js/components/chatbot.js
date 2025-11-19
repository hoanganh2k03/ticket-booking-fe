// Simple chat widget (vanilla JS) based on your React App.js behaviour
import CONFIG from "../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
(function(){
  const API_URL = `${BASE_URL}/api/chat/`;

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
    const closeBtn = el('button'); closeBtn.innerHTML = '✕'; closeBtn.style.background='transparent'; closeBtn.style.border='none'; closeBtn.style.color='#fff'; closeBtn.style.fontSize='16px';
    closeBtn.addEventListener('click', ()=>{ windowBox.style.display='none'; });
    header.appendChild(closeBtn);

    const messages = el('div','chatbot-messages');

    const inputBar = el('div','chatbot-input');
    const input = el('input',null,{type:'text',placeholder:'Nhập tin nhắn...'});
    const sendBtn = el('button','send'); sendBtn.textContent = 'Gửi';
    inputBar.appendChild(input); inputBar.appendChild(sendBtn);

    windowBox.appendChild(header);
    windowBox.appendChild(messages);
    windowBox.appendChild(inputBar);

    // initial greeting
    const initMsg = { sender: 'bot', text: 'Xin chào 👋! Tôi có thể giúp gì cho bạn hôm nay?' };
    addMessage(messages, initMsg);

    // toggle behavior
    toggle.addEventListener('click', ()=>{
      if(windowBox.style.display === 'none') windowBox.style.display = 'flex';
      else windowBox.style.display = 'none';
    });

    sendBtn.addEventListener('click', ()=>{ sendMessage(); });
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMessage(); });

    let loading = false;

    async function sendMessage(){
      const text = input.value.trim();
      if(!text || loading) return;
      addMessage(messages,{sender:'user',text});
      input.value='';
      setLoading(messages,true);
      loading = true;

      try{
        const resp = await fetch(API_URL,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ message: text, customer_id: 1, session_id: 'frontend-test' })
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
        const avatar = el('div'); avatar.textContent='🤖'; avatar.style.width='32px'; avatar.style.height='32px'; avatar.style.display='flex'; avatar.style.alignItems='center'; avatar.style.justifyContent='center'; avatar.style.borderRadius='50%'; avatar.style.background='#4f46e5'; avatar.style.color='#fff'; avatar.style.fontSize='14px'; avatar.style.flex='0 0 32px'; row.appendChild(avatar);
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
      row.appendChild(bubble);

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
        const avatar = el('div'); avatar.textContent='🧑'; avatar.style.width='32px'; avatar.style.height='32px'; avatar.style.display='flex'; avatar.style.alignItems='center'; avatar.style.justifyContent='center'; avatar.style.borderRadius='50%'; avatar.style.background='#9ca3af'; avatar.style.color='#fff'; avatar.style.fontSize='14px'; avatar.style.flex='0 0 32px'; row.appendChild(avatar);
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
