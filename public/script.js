const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-chat-btn');
const welcomeState = document.getElementById('welcome-state');

// Otomatis arahkan ke port 3000 jika frontend dibuka via Live Server (port 5500/5501)
const API_URL = window.location.port === '3000' ? '/api/chat' : 'http://localhost:3000/api/chat';

// Menyimpan riwayat percakapan sesuai format Gemini API
let conversationHistory = [];

// Konfigurasi Marked.js untuk rendering markdown yang rapi
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true
  });
}

// 1. Submit Form Handler
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Sembunyikan welcome state saat chat pertama kali dikirim
  if (welcomeState) {
    welcomeState.style.display = 'none';
  }

  // Tampilkan pesan user
  appendMessage('user', userMessage, false);
  conversationHistory.push({ role: 'user', text: userMessage });

  // Kosongkan dan nonaktifkan input sementara
  input.value = '';
  setInputState(false);

  // Tampilkan typing indicator (animasi 3 titik berdenyut)
  const botBubble = appendMessage(
    'bot',
    '<div class="typing-dots"><span></span><span></span><span></span></div>',
    true
  );

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation: conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.result) {
      // Render markdown dari AI menjadi HTML yang rapi
      botBubble.innerHTML = renderMarkdown(data.result);
      conversationHistory.push({ role: 'model', text: data.result });
    } else {
      botBubble.classList.add('error-bubble');
      botBubble.textContent = 'Maaf, tidak ada respon yang diterima dari server.';
      conversationHistory.pop();
    }
  } catch (error) {
    console.error('Chat error:', error);
    botBubble.classList.add('error-bubble');
    botBubble.textContent = 'Gagal terhubung ke server. Pastikan backend Express berjalan di port 3000.';
    conversationHistory.pop();
  } finally {
    setInputState(true);
    input.focus();
    scrollToBottom();
  }
});

// 2. Klik Quick Suggestion Chips
document.addEventListener('click', function (e) {
  if (e.target && e.target.classList.contains('quick-chip')) {
    input.value = e.target.textContent.trim();
    form.dispatchEvent(new Event('submit'));
  }
});

// 3. Tombol Reset / Clear Percakapan
if (clearButton) {
  clearButton.addEventListener('click', function () {
    conversationHistory = [];
    chatBox.innerHTML = '';
    if (welcomeState) {
      welcomeState.style.display = 'block';
      chatBox.appendChild(welcomeState);
    }
    input.focus();
  });
}

/**
 * Menambahkan bubble pesan ke chat box
 * @param {'user' | 'bot'} sender
 * @param {string} content
 * @param {boolean} isHtml
 * @returns {HTMLDivElement}
 */
function appendMessage(sender, content, isHtml = false) {
  const row = document.createElement('div');
  row.classList.add('message-row', sender);

  const bubble = document.createElement('div');
  bubble.classList.add('message-bubble');

  if (isHtml) {
    bubble.innerHTML = content;
  } else {
    bubble.textContent = content;
  }

  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();

  return bubble;
}

/**
 * Parsing Markdown ke HTML dengan sanitasi DOMPurify
 * @param {string} text
 * @returns {string}
 */
function renderMarkdown(text) {
  if (window.marked && window.DOMPurify) {
    return DOMPurify.sanitize(marked.parse(text));
  }
  if (window.marked) {
    return marked.parse(text);
  }
  // Fallback sederhana jika CDN offline
  const temp = document.createElement('div');
  temp.textContent = text;
  return temp.innerHTML.replace(/\n/g, '<br>');
}

/**
 * Atur status input dan tombol kirim
 * @param {boolean} enabled
 */
function setInputState(enabled) {
  input.disabled = !enabled;
  if (sendButton) {
    sendButton.disabled = !enabled;
  }
}

/**
 * Scroll otomatis ke pesan terbawah
 */
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}
