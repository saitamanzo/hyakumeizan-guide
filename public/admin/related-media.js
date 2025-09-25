(async function(){
  const root = document.getElementById('related-media-admin-root');
  if(!root) return;
  root.innerHTML = `<div class="max-w-3xl"><div id="status" class="mb-4"></div><div class="mb-4"><label class="block text-sm font-medium text-gray-700">山名</label><input id="mountainName" class="mt-1 block w-full rounded border-gray-300 p-2" /></div><div class="mb-4"><button id="loadBtn" class="px-3 py-2 bg-blue-600 text-white rounded">読み込み</button></div><div id="listArea"></div><hr class="my-4" /><h3 class="text-lg font-semibold">新規アイテム追加</h3><div class="space-y-2"><input id="newTitle" placeholder="タイトル" class="mt-1 block w-full rounded border-gray-300 p-2" /><input id="newUrl" placeholder="URL" class="mt-1 block w-full rounded border-gray-300 p-2" /><select id="newType" class="mt-1 block w-full rounded border-gray-300 p-2"><option value="book">book</option><option value="movie">movie</option><option value="drama">drama</option><option value="other">other</option></select><div><button id="addBtn" class="px-3 py-2 bg-green-600 text-white rounded">追加</button></div></div></div>`;

  const status = document.getElementById('status');
  const mountInp = document.getElementById('mountainName');
  const loadBtn = document.getElementById('loadBtn');
  const listArea = document.getElementById('listArea');
  const addBtn = document.getElementById('addBtn');

  function setStatus(s){ if(status) status.textContent = s; }

  loadBtn.addEventListener('click', async ()=>{
    const name = (mountInp).value.trim();
    if(!name) return setStatus('山名を入力してください');
    setStatus('読み込み中...');
    try{
      const res = await fetch('/api/related-media');
      const json = await res.json();
      const data = json.data || {};
      const items = data[name] || [];
      listArea.innerHTML = `<h3 class="text-lg font-semibold">${name} のアイテム (${items.length})</h3>` + items.map(i=>`<div class="p-2 border my-2"><a href="${i.url}" target="_blank">${i.title}</a> <span class="text-xs text-gray-500">${i.type}</span></div>`).join('');
      setStatus('読み込み完了');
    }catch(e){ console.error(e); setStatus('エラー'); }
  });

  addBtn.addEventListener('click', async ()=>{
    const name = (mountInp).value.trim();
    const title = (document.getElementById('newTitle')).value.trim();
    const url = (document.getElementById('newUrl')).value.trim();
    const type = (document.getElementById('newType')).value;
    if(!name || !title || !url) return setStatus('必須項目を入力してください');
    const item = { id: `${Date.now()}`, type, title, url };
    setStatus('追加中...');
    try{
      const res = await fetch('/api/related-media', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ mountainName: name, item }) });
      const json = await res.json();
      if(json.ok) { setStatus('追加しました'); loadBtn.click(); }
      else setStatus('追加失敗');
    }catch(e){ console.error(e); setStatus('エラー'); }
  });
})();
