const els = {
  chat: document.getElementById("chat"),
  input: document.getElementById("input"),
  btnSend: document.getElementById("btnSend"),
  btnSystem: document.getElementById("btnSystem"),
  modalSystem: document.getElementById("modalSystem"),
  modalKey: document.getElementById("modalKey"),
  systemPrompt: document.getElementById("systemPrompt"),
  saveSystem: document.getElementById("saveSystem"),
  closeSystem: document.getElementById("closeSystem"),
  cfgKey: document.getElementById("cfgKey"),
  saveKey: document.getElementById("saveKey"),
  btnBg: document.getElementById("btnBg"),
  bgFile: document.getElementById("bgFile"),
}

const state = {
  messages: [],
  config: {
    endpoint: localStorage.getItem("dq_endpoint") || "https://hidden-sun-2634.junweiren98.workers.dev",
    apiKey: localStorage.getItem("dq_apikey") || "",
    model: localStorage.getItem("dq_model") || "cm-20251119171455-cr8rq",
    system: localStorage.getItem("dq_system") || "你是堂吉诃德，使用英雄史诗的口吻与用户交谈。",
  },
  bg: localStorage.getItem("dq_bg_image") || "",
}

function renderMessage(role, content){
  const msg = document.createElement("div")
  msg.className = "message" + (role === "user" ? " user" : "")
  const bubble = document.createElement("div")
  bubble.className = "bubble"
  bubble.textContent = content
  msg.appendChild(bubble)
  els.chat.appendChild(msg)
  els.chat.scrollTop = els.chat.scrollHeight
}

function openModal(el){ el.classList.remove("hidden") }
function closeModal(el){ el.classList.add("hidden") }

function loadConfigUI(){
  els.cfgKey.value = state.config.apiKey
  els.systemPrompt.value = state.config.system
}

function applyBackground(){
  if (state.bg){
    document.documentElement.style.setProperty("--chat-bg", `url('${state.bg}')`)
    els.chat.classList.add("has-bg")
  } else {
    document.documentElement.style.removeProperty("--chat-bg")
    els.chat.classList.remove("has-bg")
  }
}

async function callAPI(){
  const payload = { model: state.config.model, messages: [] }
  if (state.config.system) payload.messages.push({ role: "system", content: state.config.system })
  for (const m of state.messages) payload.messages.push(m)
  let base = state.config.endpoint.trim()
  if (base.endsWith("/")) base = base.slice(0, -1)
  const isArk = /ark\.cn-beijing\.volces\.com/.test(base)
  const url = isArk ? (base + "/chat/completions") : (base + "/chat")
  const headers = { "Content-Type": "application/json" }
  if (isArk && state.config.apiKey) headers["Authorization"] = `Bearer ${state.config.apiKey}`
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
  if (!res.ok){
    const t = await res.text()
    throw new Error(t || "请求失败")
  }
  const data = await res.json()
  let content = ""
  if (data.choices && data.choices[0] && data.choices[0].message) content = data.choices[0].message.content || ""
  else if (data.output && data.output.text) content = data.output.text
  else if (typeof data === "string") content = data
  return content
}

els.btnSend.addEventListener("click", async ()=>{
  const text = els.input.value.trim()
  if (!text) return
  els.input.value = ""
  const userMsg = { role: "user", content: text }
  state.messages.push(userMsg)
  renderMessage("user", text)
  try{
    const reply = await callAPI()
    const asstMsg = { role: "assistant", content: reply }
    state.messages.push(asstMsg)
    renderMessage("assistant", reply)
  }catch(e){
    renderMessage("assistant", `错误：${e.message}`)
  }
})

els.btnSystem.addEventListener("click", ()=>{ loadConfigUI(); openModal(els.modalSystem) })
els.closeSystem.addEventListener("click", ()=> closeModal(els.modalSystem))

els.saveSystem.addEventListener("click", ()=>{
  state.config.system = els.systemPrompt.value.trim()
  localStorage.setItem("dq_system", state.config.system)
  closeModal(els.modalSystem)
})

els.saveKey.addEventListener("click", ()=>{
  state.config.apiKey = els.cfgKey.value.trim()
  localStorage.setItem("dq_apikey", state.config.apiKey)
  closeModal(els.modalKey)
})

els.btnBg.addEventListener("click", ()=>{ els.bgFile.click() })
els.bgFile.addEventListener("change", ()=>{
  const f = els.bgFile.files && els.bgFile.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = ()=>{
    state.bg = reader.result
    localStorage.setItem("dq_bg_image", state.bg)
    applyBackground()
  }
  reader.readAsDataURL(f)
})

renderMessage("assistant","勇敢的旅行者，欢迎来到堂吉诃德的对话大厅。")
applyBackground()

const defaultWorker = "https://hidden-sun-2634.junweiren98.workers.dev"
if (!state.config.endpoint || /ark\.cn-beijing\.volces\.com/.test(state.config.endpoint)){
  state.config.endpoint = defaultWorker
}

localStorage.setItem("dq_endpoint", state.config.endpoint)
localStorage.setItem("dq_model", state.config.model)

const isArkEndpoint = /ark\.cn-beijing\.volces\.com/.test(state.config.endpoint)
if (isArkEndpoint && !state.config.apiKey){
  loadConfigUI();
  openModal(els.modalKey)
}