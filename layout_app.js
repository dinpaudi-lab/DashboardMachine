// Layout mesin app - Fixed Real-time Sync
const $ = id => document.getElementById(id)

const TOTAL_MACHINES = 640

// ============ STORAGE KEYS ============
const STORAGE_KEY = 'layout_machines_v1'
const HISTORY_KEY = 'layout_history_v1'
const CONSTS_KEY = 'layout_constructions_v1'
const SESSION_KEY = 'app_session_token'
const CURRENT_USER_KEY = 'current_user'

// Block definition
const BLOCKS = {
  A: [{start: 1, end: 160}],
  B: [
    {start: 201, end: 220}, {start: 261, end: 280}, {start: 321, end: 340},
    {start: 381, end: 400}, {start: 441, end: 460}, {start: 501, end: 520},
    {start: 561, end: 580}, {start: 621, end: 640}
  ],
  C: [
    {start: 181, end: 200}, {start: 241, end: 260}, {start: 301, end: 320},
    {start: 361, end: 380}, {start: 421, end: 440}, {start: 481, end: 500},
    {start: 541, end: 560}, {start: 601, end: 620}
  ],
  D: [
    {start: 161, end: 180}, {start: 221, end: 240}, {start: 281, end: 300},
    {start: 341, end: 360}, {start: 401, end: 420}, {start: 461, end: 480},
    {start: 521, end: 540}, {start: 581, end: 600}
  ]
}

function getMachineBlock(machineNum){
  for(const [blockName, ranges] of Object.entries(BLOCKS)){
    for(const range of ranges){
      if(machineNum >= range.start && machineNum <= range.end){
        return blockName
      }
    }
  }
  return '?'
}

// Initial constructions
let constructions = [
  {id:'R84-56-125', name:'R84 56 125', color:'#ff6ec7'},
  {id:'R84-60-125', name:'R84 60 125', color:'#7c5cff'},
  {id:'R72-38-125', name:'R72 38 125', color:'#00ffe1'},
]

function loadConstructions(){
  try{
    const raw = localStorage.getItem(CONSTS_KEY)
    if(!raw) return constructions
    const parsed = JSON.parse(raw)
    if(Array.isArray(parsed) && parsed.length) return parsed
    return constructions
  }catch(e){ return constructions }
}

function saveConstructions(){ 
  localStorage.setItem(CONSTS_KEY, JSON.stringify(constructions))
  
  // Sync to cloud if available
  if(typeof saveConstructionToCloud !== 'undefined' && window.isCloudAvailable){
    constructions.forEach(c => {
      saveConstructionToCloud(c, getCurrentUserId()).catch(e => 
        console.warn('Cloud sync failed for construction:', e)
      )
    })
  }
}

constructions = loadConstructions()

function loadMachines(){
  const raw = localStorage.getItem(STORAGE_KEY)
  if(raw) return JSON.parse(raw)
  const arr = []
  for(let i=1;i<=TOTAL_MACHINES;i++){
    const c = constructions[(i-1) % constructions.length]
    arr.push({id:i, constructId:c.id})
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  return arr
}

let machines = loadMachines()

function saveMachines(){ 
  localStorage.setItem(STORAGE_KEY, JSON.stringify(machines)) 
}

// ============ CLOUD HISTORY ============
let cloudHistory = []
let isCloudSyncEnabled = false

function getHistory() { 
  try {
    if (isCloudSyncEnabled && cloudHistory.length > 0) {
      return cloudHistory
    }
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch(e) { 
    return [] 
  } 
}

async function addHistory(entry) { 
  const h = getHistory()
  h.unshift(entry)
  if(h.length > 1000) h.length = 1000
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
  
  if (isCloudSyncEnabled) {
    cloudHistory = h
  }
  
  // Save to cloud
  if (typeof saveHistoryToCloud !== 'undefined' && window.isCloudAvailable) {
    try {
      await saveHistoryToCloud({
        type: entry.type || 'general',
        action: entry.action || 'update',
        details: entry,
        device_id: getDeviceId(),
        device_name: getDeviceName()
      })
    } catch (e) {
      console.warn('Cloud history sync failed:', e)
    }
  }
  
  renderHistory() 
}

function getCurrentUserId(){
  return localStorage.getItem('currentUserId') || 'unknown'
}

function getDeviceId() {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

function getDeviceName() {
  let deviceName = localStorage.getItem('device_name')
  if (!deviceName) {
    const ua = navigator.userAgent
    let osName = 'Unknown'
    if (ua.indexOf('Windows') > -1) osName = 'Windows PC'
    else if (ua.indexOf('Mac') > -1) osName = 'Mac'
    else if (ua.indexOf('Linux') > -1) osName = 'Linux'
    else if (ua.indexOf('Android') > -1) osName = 'Android'
    else if (ua.indexOf('iPhone') > -1) osName = 'iPhone'
    else if (ua.indexOf('iPad') > -1) osName = 'iPad'
    deviceName = `${osName} (${new Date().toLocaleDateString()})`
    localStorage.setItem('device_name', deviceName)
  }
  return deviceName
}

// ============ UI RENDER ============
function renderLegend(){ 
  const el = $('legend')
  if(!el) return
  el.innerHTML=''
  constructions.forEach(c=>{ 
    const item = document.createElement('div')
    item.className='legend-item'
    item.innerHTML = `<div class="legend-color" style="background:${c.color}"></div><div>${c.name}</div>`
    el.appendChild(item) 
  }) 
}

function renderConstructList(){
  const el = $('construct-list')
  if(!el) return
  el.innerHTML = ''
  constructions.forEach(c=>{
    const row = document.createElement('div')
    row.className = 'construct-row'
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px;'
    row.innerHTML = `<div style="width:14px;height:14px;border-radius:4px;background:${c.color}"></div><div style="flex:1">${c.name}</div><button class="edit-const" data-id="${c.id}" title="Edit warna">✏️</button><button class="delete-const" data-id="${c.id}">Hapus</button>`
    el.appendChild(row)
  })
  
  el.querySelectorAll('.edit-const').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id')
      const c = constructions.find(x=> x.id === id)
      if(c) openConstModal(c)
    })
  })
  
  el.querySelectorAll('.delete-const').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-id')
      const constName = constructions.find(x=> x.id === id)?.name || id
      
      if(!confirm(`Hapus konstruksi "${constName}"?`)) return
      
      constructions = constructions.filter(x=> x.id !== id)
      machines.forEach(m=>{ if(m.constructId === id) m.constructId = null })
      
      saveConstructions()
      saveMachines()
      
      // Delete from cloud
      if(typeof deleteConstructionFromCloud !== 'undefined' && window.isCloudAvailable){
        try{
          await deleteConstructionFromCloud(id, getCurrentUserId())
        }catch(e){
          console.warn('Cloud delete failed:', e)
        }
      }
      
      renderLegend()
      renderConstructList()
      populateModalConstruct()
      renderGrid()
      updateChart()
      showToast(`Konstruksi "${constName}" dihapus`, 'warn')
    })
  })
}

function attachEventListeners(){
  const elLogout = $('logout-btn')
  if(elLogout){
    elLogout.addEventListener('click', ()=>{
      if(confirm('Anda yakin ingin logout?')){
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(CURRENT_USER_KEY)
        window.location.href = 'login.html'
      }
    })
  }
  
  const elClose = $('close-modal')
  if(elClose) elClose.addEventListener('click', closeModal)
  
  const elSave = $('save-edit')
  if(elSave) elSave.addEventListener('click', async ()=>{
    const id = Number($('modal-machine-id').textContent)
    const newC = $('modal-construct').value
    const editor = $('modal-editor').value || 'Unknown'
    const old = machines[id-1] && machines[id-1].constructId
    
    if(machines[id-1]) machines[id-1].constructId = newC
    saveMachines()
    
    // Save to cloud
    if (typeof saveMachineToCloud !== 'undefined' && window.isCloudAvailable) {
      try {
        await saveMachineToCloud(id, newC, getCurrentUserId(), old)
        console.log('✅ Machine saved to cloud')
      } catch (e) {
        console.error('❌ Cloud save error:', e)
      }
    }
    
    await addHistory({
      machine:id, 
      from:old, 
      to:newC, 
      editor:editor, 
      date:new Date().toISOString()
    })
    
    closeModal()
    renderGrid()
    renderLegend()
    updateChart()
    showToast('Mesin diperbarui ☁️', 'success')
  })
  
  const elConstClose = $('close-const-modal')
  if(elConstClose) elConstClose.addEventListener('click', closeConstModal)
  
  const elConstSave = $('save-const')
  if(elConstSave) elConstSave.addEventListener('click', async ()=>{
    const modal = $('const-modal')
    const constructId = modal.dataset.constructId
    const c = constructions.find(x=> x.id === constructId)
    
    if(c){
      const newName = $('const-modal-name-input').value.trim() || c.name
      let newColor = $('const-modal-color').value
      
      if(!newColor.startsWith('#')) newColor = '#' + newColor
      newColor = newColor.toLowerCase()
      
      c.name = newName
      c.color = newColor
      saveConstructions()
      
      // Save to cloud
      if(typeof saveConstructionToCloud !== 'undefined' && window.isCloudAvailable){
        try{
          await saveConstructionToCloud(c, getCurrentUserId())
        }catch(e){
          console.warn('Cloud save failed:', e)
        }
      }
      
      renderLegend()
      renderConstructList()
      renderGrid()
      populateModalConstruct()
      updateChart()
      closeConstModal()
      showToast('Konstruksi diperbarui', 'success')
    }
  })
  
  const elAdd = $('add-const')
  if(elAdd) elAdd.addEventListener('click', async ()=>{
    const name = $('new-const-name').value.trim()
    if(!name){ alert('Isi nama konstruksi'); return }
    
    const id = name.replace(/\s+/g,'-') + '-' + Math.floor(Math.random()*9999)
    let color = $('new-const-color').value
    
    if(!color.startsWith('#')) color = '#' + color
    color = color.toLowerCase()
    
    const newConstruct = {id:id, name:name, color:color}
    constructions.push(newConstruct)
    
    const nameEl = $('new-const-name')
    if(nameEl) nameEl.value=''
    
    saveConstructions()
    
    // Save to cloud
    if(typeof saveConstructionToCloud !== 'undefined' && window.isCloudAvailable){
      try{
        await saveConstructionToCloud(newConstruct, getCurrentUserId(), true)
      }catch(e){
        console.warn('Cloud save failed:', e)
      }
    }
    
    renderLegend()
    renderConstructList()
    populateModalConstruct()
    updateChart()
    showToast('Konstruksi ditambahkan ☁️', 'success')
  })
  
  const searchEl = $('search')
  if(searchEl) searchEl.addEventListener('input', ()=> renderGrid())
  
  const clearBtn = $('clear-search')
  if(clearBtn){
    clearBtn.addEventListener('click', ()=>{
      const searchEl = $('search')
      if(searchEl) searchEl.value = ''
      renderGrid()
      showToast('Pencarian direset', 'success')
    })
  }
  
  const clearStorageBtn = $('clear-storage')
  if(clearStorageBtn){
    clearStorageBtn.addEventListener('click', ()=>{
      if(confirm('Yakin ingin menghapus semua data tersimpan?')){
        try{
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(CONSTS_KEY)
          localStorage.removeItem(HISTORY_KEY)
          location.reload()
        }catch(e){
          showToast('Gagal hapus data', 'warn')
        }
      }
    })
  }
  
  const xlsBtn = $('export-excel')
  if(xlsBtn) xlsBtn.addEventListener('click', exportExcel)
}

function populateModalConstruct(){ 
  const sel = $('modal-construct')
  if(!sel) return
  sel.innerHTML=''
  constructions.forEach(c=>{ 
    const opt=document.createElement('option')
    opt.value=c.id
    opt.textContent=c.name
    sel.appendChild(opt) 
  }) 
}

function renderHistory(){ 
  const list = window.cloudHistory && window.cloudHistory.length > 0 
    ? window.cloudHistory 
    : getHistory()
  
  const el = $('history-list')
  if(!el) return
  el.innerHTML=''
  
  if(list.length===0){ 
    el.innerHTML='<div>Tidak ada riwayat.</div>'
    return 
  }
  
  list.slice(0, 50).forEach(h=>{ 
    const div=document.createElement('div')
    div.className='history-row'
    const machineId = h.machine || h.machine_id
    const timestamp = h.date || h.timestamp
    const dateStr = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'
    
    div.innerHTML = `<div><strong>Mesin ${machineId}</strong> : ${h.from} → ${h.to}</div><div>${h.editor} — ${dateStr}</div>`
    el.appendChild(div) 
  })
}

function getConstructById(id){ 
  if(!id) return null
  return constructions.find(c=> c.id === id) || null 
}

function renderGrid(){ 
  const grid = $('machine-grid')
  if(!grid) return
  
  const q = $('search')
  const filter = q ? q.value.trim() : ''
  const counter = $('search-counter')
  
  let matchCount = 0
  grid.innerHTML = ''
  
  function renderBlock(blockName, ranges) {
    const blockLabel = document.createElement('div')
    blockLabel.style.cssText = 'grid-column:1/-1;padding:12px 0 6px 0;font-weight:700;color:#ff6ec7;font-size:13px;text-transform:uppercase;border-top:1px solid rgba(255,255,255,0.1);margin-top:8px'
    blockLabel.textContent = `🏭 Blok ${blockName}`
    grid.appendChild(blockLabel)
    
    const allMachines = []
    for(const range of ranges){
      for(let i = range.start; i <= range.end; i++){
        allMachines.push(i)
      }
    }
    allMachines.sort((a,b) => a - b)
    
    for(let sectionIdx = 0; sectionIdx < allMachines.length; sectionIdx += 20) {
      const section = allMachines.slice(sectionIdx, sectionIdx + 20)
      if(section.length === 0) continue
      
      const sectionDiv = document.createElement('div')
      sectionDiv.style.cssText = 'display:grid;grid-template-columns:repeat(10,1fr);gap:4px;grid-column:1/-1;margin-bottom:8px'
      
      for(let i = 0; i < 10; i++) {
        const topMachine = section[i * 2]
        const bottomMachine = section[i * 2 + 1]
        
        const subCol = document.createElement('div')
        subCol.style.cssText = 'display:grid;grid-template-rows:1fr 1fr;gap:2px'
        
        if(topMachine) {
          const box = createMachineBox(topMachine, blockName, filter)
          if(box.matches) matchCount++
          subCol.appendChild(box.element)
        }
        
        if(bottomMachine) {
          const box = createMachineBox(bottomMachine, blockName, filter)
          if(box.matches) matchCount++
          subCol.appendChild(box.element)
        }
        
        sectionDiv.appendChild(subCol)
      }
      
      grid.appendChild(sectionDiv)
    }
  }
  
  function createMachineBox(machineNum, blockName, filter) {
    const m = machines[machineNum-1] || {id:machineNum, constructId:null}
    const box = document.createElement('div')
    box.className = 'machine-box'
    box.style.fontSize = '11px'
    box.style.padding = '4px'
    box.style.minHeight = '24px'
    box.style.display = 'flex'
    box.style.alignItems = 'center'
    box.style.justifyContent = 'center'
    box.title = `Mesin ${machineNum} - Blok ${blockName}`
    box.textContent = machineNum
    
    const c = constructions.find(x=> x.id === m.constructId)
    box.style.background = c ? c.color : '#262626'
    
    const isMachine = String(machineNum)
    const matches = !filter || isMachine === filter
    
    if(!matches){
      box.style.opacity = '0.15'
      box.style.pointerEvents = 'none'
    } else {
      box.style.opacity = '1'
      box.style.cursor = 'pointer'
      box.style.border = filter ? '2px solid #ffd166' : '1px solid rgba(255,255,255,0.04)'
      const constructName = c ? c.name : 'Belum ditugaskan'
      box.title = `Mesin ${machineNum} - Blok ${blockName}\nKonstruksi: ${constructName}`
      box.addEventListener('click', ()=>{ openModal(machineNum) })
    }
    
    return { element: box, matches: matches }
  }
  
  renderBlock('A', BLOCKS.A)
  renderBlock('B', BLOCKS.B)
  renderBlock('C', BLOCKS.C)
  renderBlock('D', BLOCKS.D)
  
  if(counter){
    if(filter){
      counter.textContent = `${matchCount} hasil`
      counter.style.color = matchCount > 0 ? '#34d399' : '#f97316'
    } else {
      counter.textContent = ''
    }
  }
  
  const searchResultDiv = $('search-result')
  const searchResultText = $('search-result-text')
  if(filter && matchCount > 0){
    const machineNum = parseInt(filter)
    const m = machines[machineNum-1]
    const c = constructions.find(x=> x.id === m?.constructId)
    const block = getMachineBlock(machineNum)
    const constructName = c ? c.name : 'Belum ditugaskan'
    
    searchResultText.innerHTML = `
      <div style="display:grid;gap:8px">
        <div>🔍 <strong>Mesin ${machineNum}</strong></div>
        <div>📍 Blok: <strong>${block}</strong></div>
        <div>🏗️ Konstruksi: <strong style="color:${c?.color || '#999'}">${constructName}</strong></div>
      </div>
    `
    searchResultDiv.style.display = 'block'
  } else {
    searchResultDiv.style.display = 'none'
  }
}

function openModal(id){ 
  const modal = $('modal')
  if(!modal) return
  
  const mid = $('modal-machine-id')
  if(mid){
    const block = getMachineBlock(id)
    mid.textContent = id
    mid.title = `Blok ${block}`
  }
  
  populateModalConstruct()
  
  const sel = $('modal-construct')
  const m = machines[id-1] || {constructId:''}
  if(sel) sel.value = m.constructId || ''
  
  const editor = $('modal-editor')
  if(editor) editor.value=''
  
  modal.classList.remove('hidden')
}

function closeModal(){ 
  const modal = $('modal')
  if(modal) modal.classList.add('hidden') 
}

function openConstModal(construct){ 
  const modal = $('const-modal')
  if(!modal) return
  
  const nameSpan = $('const-modal-name')
  const nameInput = $('const-modal-name-input')
  const colorInput = $('const-modal-color')
  
  if(nameSpan) nameSpan.textContent = construct.name
  if(nameInput) nameInput.value = construct.name
  
  let displayColor = construct.color
  if(!displayColor.startsWith('#')) displayColor = '#' + displayColor
  displayColor = displayColor.toLowerCase()
  
  if(colorInput) colorInput.value = displayColor
  
  modal.dataset.constructId = construct.id
  modal.classList.remove('hidden')
}

function closeConstModal(){ 
  const modal = $('const-modal')
  if(modal) modal.classList.add('hidden') 
}

// Chart
let barChart = null
function updateChart(){ 
  const canvasEl = $('barChart')
  if(!canvasEl) return
  
  const ctx = canvasEl.getContext('2d')
  
  const map = {}
  constructions.forEach(c=> map[c.id] = 0)
  machines.forEach(m=>{
    if(map[m.constructId] !== undefined){
      map[m.constructId]++
    }
  })
  
  const constructIds = Object.keys(map)
  const labels = constructIds.map(k=> {
    const c = getConstructById(k)
    return c ? c.name : k
  })
  const data = constructIds.map(k=> map[k])
  const colors = constructIds.map(k=> {
    const c = getConstructById(k)
    return c ? c.color : '#999999'
  })
  
  if(barChart){
    barChart.destroy()
    barChart = null
  }
  
  barChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: labels,
      datasets:[{
        label:'Jumlah Mesin',
        data: data,
        backgroundColor: colors
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#cbd5e1'}},
        y:{beginAtZero:true, ticks:{color:'#cbd5e1'}}
      }
    }
  })
}

function updateGreeting(){ 
  const h = new Date().getHours()
  const g = $('greeting')
  if(!g) return
  if(h<12) g.textContent='Selamat Pagi'
  else if(h<17) g.textContent='Selamat Sore'
  else g.textContent='Selamat Malam' 
}

function updateClock(){
  const el = $('clock')
  const de = $('date')
  if(!el) return
  
  const now = new Date()
  const hh = String(now.getHours()).padStart(2,'0')
  const mm = String(now.getMinutes()).padStart(2,'0')
  const ss = String(now.getSeconds()).padStart(2,'0')
  el.textContent = `${hh}:${mm}:${ss}`
  
  if(de) {
    try{
      de.textContent = now.toLocaleDateString('id-ID', { 
        weekday:'long', day:'numeric', month:'long', year:'numeric' 
      })
    }catch(e){
      de.textContent = now.toLocaleDateString()
    }
  }
}

// ============ INITIALIZATION ============
async function initializeApp() {
  try {
    console.log('🚀 Initializing app...')
    
    // Wait for Supabase to be available
    if (typeof supabaseInit !== 'undefined') {
      console.log('📡 Initializing Supabase...')
      const cloudReady = await supabaseInit()
      window.isCloudAvailable = cloudReady
      
      if (cloudReady) {
        console.log('✅ Cloud connected')
        
        // Load from cloud
        if (typeof loadMachinesFromCloud !== 'undefined') {
          const cloudMachines = await loadMachinesFromCloud()
          if (cloudMachines && cloudMachines.length > 0) {
            machines = cloudMachines
            saveMachines()
            console.log('✅ Loaded machines from cloud')
          }
        }
        
        if (typeof loadConstructionsFromCloud !== 'undefined') {
          const cloudConstructs = await loadConstructionsFromCloud()
          if (cloudConstructs && cloudConstructs.length > 0) {
            constructions = cloudConstructs
            saveConstructions()
            console.log('✅ Loaded constructions from cloud')
          }
        }
        
        if (typeof loadHistoryFromCloud !== 'undefined') {
          const cloudHist = await loadHistoryFromCloud(500)
          if (cloudHist && cloudHist.length > 0) {
            window.cloudHistory = cloudHist
            isCloudSyncEnabled = true
            console.log('✅ Loaded history from cloud')
          }
        }
        
        // Setup real-time listeners
        if (typeof setupRealtimeListeners !== 'undefined') {
          setupRealtimeListeners(
            (newMachines) => {
              console.log('🔄 Real-time: machines updated')
              machines = newMachines
              saveMachines()
              renderGrid()
              updateChart()
              showToast('Mesin disinkronkan dari cloud', 'success')
            },
            (newConstructs) => {
              console.log('🔄 Real-time: constructions updated')
              constructions = newConstructs
              saveConstructions()
              renderLegend()
              renderConstructList()
              populateModalConstruct()
              renderGrid()
              updateChart()
              showToast('Konstruksi disinkronkan dari cloud', 'success')
            },
            (newHistory) => {
              console.log('🔄 Real-time: history updated')
              window.cloudHistory = newHistory
              renderHistory()
              showToast('History disinkronkan dari cloud', 'success')
            }
          )
          console.log('✅ Real-time listeners active')
        }
        
        showToast('✅ Connected to Cloud - Real-time Sync Active!', 'success')
      } else {
        console.log('⚠️ Cloud unavailable, using local storage')
        showToast('Mode Offline - Data tersimpan lokal', 'warn')
      }
    } else {
      console.log('⚠️ Supabase not loaded')
      window.isCloudAvailable = false
    }
  } catch (e) {
    console.error('❌ Init error:', e)
    window.isCloudAvailable = false
    showToast('Mode Offline', 'warn')
  }
  
  // Render UI
  renderLegend()
  renderGrid()
  renderConstructList()
  populateModalConstruct()
  renderHistory()
  updateChart()
  updateGreeting()
  updateClock()
  attachEventListeners()
  
  console.log('✅ App initialized')
}

// Start app
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}

setInterval(updateClock, 1000)

// ============ EXCEL EXPORT ============
async function exportExcel(){
  const pad = n=> String(n).padStart(2,'0')
  const now = new Date()
  const fname = `layout_export_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`

  if(window.ExcelJS){
    try{
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Didin'
      wb.created = now

      const ws1 = wb.addWorksheet('Machines')
      ws1.columns = [
        {header:'Machine', key:'machine', width:10},
        {header:'Construct ID', key:'cid', width:22},
        {header:'Construct Name', key:'cname', width:40},
        {header:'Block', key:'block', width:10},
        {header:'Assigned', key:'assigned', width:12}
      ]
      ws1.getRow(1).font = {bold:true}
      
      machines.forEach(m=>{
        const c = getConstructById(m.constructId) || {name:'UNASSIGNED'}
        const block = getMachineBlock(m.id)
        ws1.addRow({
          machine:m.id, 
          cid: m.constructId||'', 
          cname: c.name, 
          block: block,
          assigned: m.constructId? 'Yes':'No'
        })
      })

      const ws2 = wb.addWorksheet('Constructions')
      ws2.columns = [
        {header:'Construct ID', key:'id', width:26}, 
        {header:'Name', key:'name', width:40}, 
        {header:'Color', key:'color', width:14}, 
        {header:'Machines Using', key:'count', width:16}
      ]
      ws2.getRow(1).font = {bold:true}
      
      const counts = {}
      machines.forEach(m=>{ counts[m.constructId] = (counts[m.constructId]||0)+1 })
      constructions.forEach(c=> ws2.addRow({
        id:c.id, 
        name:c.name, 
        color:c.color, 
        count: counts[c.id]||0
      }))

      const ws3 = wb.addWorksheet('History')
      ws3.columns = [
        {header:'Machine',key:'machine',width:10},
        {header:'From',key:'from',width:18},
        {header:'To',key:'to',width:18},
        {header:'Editor',key:'editor',width:24},
        {header:'Date',key:'date',width:22}
      ]
      ws3.getRow(1).font = {bold:true}
      
      getHistory().forEach(h=>{
        const d = h.date ? new Date(h.date) : null
        const row = ws3.addRow({ 
          machine:h.machine||'', 
          from:h.from||'', 
          to:h.to||'', 
          editor:h.editor||'', 
          date: d || '' 
        })
        if(d && !isNaN(d)) row.getCell('date').numFmt = 'dd/mm/yyyy hh:mm:ss'
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fname
      a.click()
      URL.revokeObjectURL(url)
      showToast(`Excel exported: ${fname}`, 'success')
      return
    }catch(err){ 
      console.error('ExcelJS export failed', err)
      showToast('Export failed', 'warn') 
    }
  }

  if(typeof XLSX === 'undefined'){ 
    showToast('XLSX library not available', 'warn')
    return 
  }
  
  const wb = XLSX.utils.book_new()
  const machinesData = [['Machine','Construct ID','Construct Name','Block','Assigned']]
  machines.forEach(m=>{
    const c = getConstructById(m.constructId) || {name:'UNASSIGNED'}
    const block = getMachineBlock(m.id)
    machinesData.push([m.id, m.constructId || '', c.name, block, m.constructId? 'Yes' : 'No'])
  })
  
  const ws1 = XLSX.utils.aoa_to_sheet(machinesData)
  XLSX.utils.book_append_sheet(wb, ws1, 'Machines')

  try{
    XLSX.writeFile(wb, fname)
    showToast(`Excel exported: ${fname}`, 'success')
  }catch(e){ 
    console.error(e)
    showToast('Export failed', 'warn') 
  }
}

// ============ TOAST NOTIFICATIONS ============
function ensureToastRoot(){ 
  let r = document.querySelector('.toast-root')
  if(!r){ 
    r = document.createElement('div')
    r.className = 'toast-root'
    r.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px'
    document.body.appendChild(r) 
  } 
  return r 
}

function showToast(text, type=''){
  const root = ensureToastRoot()
  const t = document.createElement('div')
  t.className = 'toast' + (type? ' '+type : '')
  t.style.cssText = `
    padding:12px 20px;
    background:rgba(15,23,42,0.95);
    border:1px solid rgba(255,255,255,0.1);
    border-radius:8px;
    color:#fff;
    font-size:13px;
    box-shadow:0 10px 30px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `
  
  if(type === 'success'){
    t.style.borderColor = 'rgba(34,197,94,0.3)'
    t.style.background = 'rgba(34,197,94,0.1)'
  } else if(type === 'warn'){
    t.style.borderColor = 'rgba(251,146,60,0.3)'
    t.style.background = 'rgba(251,146,60,0.1)'
  }
  
  t.textContent = text
  root.appendChild(t)
  
  setTimeout(()=>{ 
    t.style.transition='opacity .3s, transform .3s'
    t.style.opacity='0'
    t.style.transform='translateX(20px)'
    setTimeout(()=> t.remove(),350) 
  }, 3500)
  
  return t
}

window._layout = {
  machines, 
  constructions, 
  updateChart,
  isCloudAvailable: () => window.isCloudAvailable
}
