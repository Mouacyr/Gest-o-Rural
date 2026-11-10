const DB_KEY = "raiz_gestao_rural_demo_v1";
const defaultData = {
  financeiro: [], propriedades: [], familia: [], sucessao: [], tarefas: [], culturas: [], documentos: []
};
let db = loadData();
let currentPage = "dashboard";
let editingRecordId = null;
let currentUser = { nome: "Administrador da família", papel: "Administrador" };
let supabaseClient = null;
const config = window.RAIZ_CONFIG || {};

if (window.supabase && config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
  try { supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY); }
  catch (e) { console.warn("Supabase não foi inicializado:", e); }
}

function loadData() {
  try { return { ...structuredClone(defaultData), ...JSON.parse(localStorage.getItem(DB_KEY) || "{}") }; }
  catch { return structuredClone(defaultData); }
}
function saveData() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function id() { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); }
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }); }
function number(value) { return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits:2 }); }
function sum(list, key="valor") { return list.reduce((acc, x) => acc + Number(x[key] || 0), 0); }
function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message; node.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
}
function goLanding() {
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("landing").classList.remove("hidden");
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function goApp() {
  document.getElementById("landing").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  document.getElementById("user-name").textContent = currentUser.nome;
  document.getElementById("user-role").textContent = currentUser.papel;
  document.getElementById("family-name").textContent = "Minha família";
  render();
  window.scrollTo(0, 0);
}
function openLogin() { document.getElementById("login-dialog").showModal(); }
function goPage(page) {
  if (page !== currentPage) editingRecordId = null;
  currentPage = page;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  document.getElementById("sidebar").classList.remove("open");
  render();
}
function pageHeading(title, description, button="") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${button}</div>`;
}
function metric(label, value, icon, foot="Com base nos registros cadastrados") {
  return `<div class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></div>`;
}
function panelTitle(title, right="") { return `<div class="panel-title"><h2>${title}</h2>${right}</div>`; }
function statusBadge(status) {
  let cls = status === "Concluída" || status === "Pago" || status === "Recebido" ? "" : (status === "Vencido" ? "danger" : "pending");
  return `<span class="badge ${cls}">${esc(status || "Pendente")}</span>`;
}
function emptyRow(cols, message="Nenhum registro cadastrado ainda.") { return `<tr><td colspan="${cols}" class="empty">${message}</td></tr>`; }
function removeRecord(group, recordId) {
  if (!confirm("Deseja excluir este registro? Esta ação não pode ser desfeita.")) return;
  db[group] = db[group].filter(x => x.id !== recordId); if (editingRecordId === recordId) editingRecordId = null; saveData(); render(); toast("Registro excluído.");
}
function csvDownload(filename, rows) {
  const csv = rows.map(row => row.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function exportGroup(group, headers, values) {
  csvDownload(`raiz-${group}.csv`, [headers, ...db[group].map(values)]);
}
function render() {
  const content = document.getElementById("app-content");
  const titles = { dashboard:"Visão geral", culturas:"Culturas e produção", financeiro:"Financeiro", propriedades:"Propriedades e bens", documentos:"Documentos", familia:"Família e sucessores", sucessao:"Plano sucessório", tarefas:"Tarefas e reuniões", relatorios:"Relatórios", configuracoes:"Configurações" };
  document.getElementById("top-title").textContent = titles[currentPage] || "RAIZ";
  const pages = {
    dashboard, culturas: () => modulePage("culturas"), financeiro: () => modulePage("financeiro"),
    propriedades: () => modulePage("propriedades"), documentos: () => modulePage("documentos"),
    familia: () => modulePage("familia"), sucessao: successionPage, tarefas: () => modulePage("tarefas"),
    relatorios: reportsPage, configuracoes: settingsPage
  };
  content.innerHTML = (pages[currentPage] || dashboard)();
  bindPageEvents();
}
function dashboard() {
  const receita = sum(db.financeiro.filter(x => x.tipo === "Receita"));
  const despesa = sum(db.financeiro.filter(x => x.tipo === "Despesa"));
  const done = db.tarefas.filter(x => x.status === "Concluída").length;
  const progress = db.sucessao.length ? Math.round(db.sucessao.filter(x => x.status === "Concluída").length / db.sucessao.length * 100) : 0;
  const recent = [
    ...db.financeiro.map(x => ({ title:x.descricao, sub:`${x.tipo} · ${x.data || "Sem data"}`, icon:x.tipo==="Receita"?"＋":"−", date:x.data || "" })),
    ...db.tarefas.map(x => ({ title:x.titulo, sub:`Tarefa · ${x.status}`, icon:"✓", date:x.prazo || "" }))
  ].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,5);
  return pageHeading("Bom dia, " + esc(currentUser.nome.split(" ")[0]) + " 🌿", "Aqui está um resumo da sua gestão rural e familiar.",
  `<button class="btn btn-primary" data-action="new-finance">＋ Novo lançamento</button>`) +
  `<div class="cards">${metric("Receitas registradas",money(receita),"↗","Total acumulado")}${metric("Despesas registradas",money(despesa),"↘","Total acumulado")}${metric("Saldo registrado",money(receita-despesa),"R$","Receitas menos despesas")}${metric("Culturas cadastradas",db.culturas.length,"❧","Culturas acompanhadas")}</div>
  <div class="panel"><div class="panel-title"><h2>Acesso rápido</h2><small>O que deseja fazer agora?</small></div><div class="quick-grid">
  <button class="quick-action" data-action="new-cultura"><span>🌽</span><b>Registrar cultura</b><small>Plantio e produção</small></button>
  <button class="quick-action" data-action="new-finance"><span>R$</span><b>Lançar movimentação</b><small>Receita ou despesa</small></button>
  <button class="quick-action" data-action="new-documento"><span>▤</span><b>Adicionar documento</b><small>Organizar arquivos</small></button>
  <button class="quick-action" data-page="sucessao"><span>♧</span><b>Plano sucessório</b><small>Etapas da família</small></button></div></div>
  <div class="two-col"><div class="panel">${panelTitle("Atividade recente",`<button class="btn btn-sm btn-light" data-page="relatorios">Ver relatórios</button>`)}<div class="activity-list">${recent.length ? recent.map(a=>`<div class="activity"><span class="activity-icon">${a.icon}</span><div><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></div></div>`).join("") : `<div class="empty">Suas atividades recentes aparecerão aqui quando você começar a cadastrar informações.</div>`}</div></div>
  <div class="panel">${panelTitle("Planejamento sucessório",`<button class="btn btn-sm btn-light" data-page="sucessao">Abrir plano</button>`)}<div class="progress-row"><span>Progresso das etapas cadastradas</span><b>${progress}%</b></div><div class="progress"><span style="width:${progress}%"></span></div><p class="muted" style="margin-top:14px">${db.sucessao.filter(x=>x.status==="Concluída").length} de ${db.sucessao.length} etapas concluídas.</p><div class="notice">Organize documentos e conversas familiares. Decisões jurídicas e tributárias precisam de orientação profissional.</div></div></div>
  <div class="panel">${panelTitle("Sua propriedade em números")}<div class="cards" style="margin:0">${metric("Propriedades e bens",db.propriedades.length,"⌂")}${metric("Pessoas cadastradas",db.familia.length,"♧")}${metric("Documentos",db.documentos.length,"▤")}${metric("Tarefas pendentes",db.tarefas.filter(x=>x.status!=="Concluída").length,"✓")}</div></div>`;
}
const configs = {
  financeiro: { title:"Gestão financeira", desc:"Acompanhe entradas, saídas e contas da propriedade.", group:"financeiro",
    fields:[["descricao","Descrição","text",true],["tipo","Tipo de movimentação","select",true,["Receita","Despesa"]],["valor","Valor (R$)","number",true],["data","Data","date",true],["categoria","Categoria","select",true,["Venda agrícola","Venda de animais","Arrendamento","Sementes e insumos","Combustível","Máquinas e manutenção","Mão de obra","Energia elétrica","Impostos e taxas","Transporte","Serviços rurais","Outros"]],["situacao","Situação","select",true,["Pago","Pendente","Recebido"]],["propriedade","Propriedade relacionada","text",false],["observacoes","Observações","textarea",false]],
    headers:["Descrição","Tipo","Valor","Data","Categoria","Situação"], values:x=>[x.descricao,x.tipo,money(x.valor),x.data,x.categoria,x.situacao] },
  propriedades: { title:"Propriedades e bens", desc:"Organize propriedades rurais, áreas e patrimônio declarado.", group:"propriedades",
    fields:[["nome","Nome da propriedade ou bem","text",true],["tipo","Tipo de registro","select",true,["Fazenda","Terreno","Máquina","Veículo","Equipamento","Instalação","Animal","Outro"]],["area","Área (hectares)","number",false],["valor","Valor estimado (R$)","number",false],["local","Município / UF ou localização","text",false],["responsavel","Responsável","text",false],["foto","Foto da propriedade","image",false],["observacoes","Observações","textarea",false]],
    headers:["Foto","Nome","Tipo","Área (ha)","Valor estimado","Localização","Responsável"], values:x=>[x.foto?"__FOTO__":"Sem foto",x.nome,x.tipo,x.area||"—",money(x.valor),x.local||"—",x.responsavel||"—"] },
  familia: { title:"Família e sucessores", desc:"Registre participantes e responsabilidades na gestão familiar.", group:"familia",
    fields:[["nome","Nome completo","text",true],["parentesco","Vínculo familiar","text",true],["papel","Papel de acesso / participação","select",true,["Administrador","Financeiro","Familiar","Sucessor","Consultor"]],["contato","Contato","text",false],["responsabilidade","Responsabilidade ou observações","textarea",false]],
    headers:["Nome","Vínculo","Papel","Contato"], values:x=>[x.nome,x.parentesco,x.papel,x.contato||"—"] },
  tarefas: { title:"Tarefas e reuniões", desc:"Acompanhe pendências, reuniões familiares e atividades.", group:"tarefas",
    fields:[["titulo","Tarefa ou reunião","text",true],["tipo","Tipo","select",true,["Tarefa","Reunião familiar","Consulta profissional","Pendência documental"]],["responsavel","Responsável","text",false],["prazo","Data / prazo","date",false],["status","Status","select",true,["Pendente","Em andamento","Concluída"]],["detalhes","Detalhes e decisões","textarea",false]],
    headers:["Tarefa","Tipo","Responsável","Prazo","Status"], values:x=>[x.titulo,x.tipo,x.responsavel||"—",x.prazo||"—",x.status] },
  culturas: { title:"Culturas e produção", desc:"Registre o plantio, a produção e a rentabilidade das culturas.", group:"culturas",
    fields:[["nome","Nome da cultura","select",true,["Milho","Soja","Mandioca","Feijão","Arroz","Hortaliças","Outra"]],["area","Área plantada (ha)","number",true],["plantio","Data do plantio","date",false],["colheita","Previsão de colheita","date",false],["quantidade","Quantidade produzida","number",false],["unidade","Unidade de medida","select",true,["kg","toneladas","sacas","caixas","unidades"]],["custo","Custo de produção (R$)","number",false],["preco","Receita estimada/obtida (R$)","number",false],["observacoes","Observações","textarea",false]],
    headers:["Cultura","Área (ha)","Plantio","Colheita","Produção","Custo","Receita"], values:x=>[x.nome,x.area,x.plantio||"—",x.colheita||"—",`${number(x.quantidade)} ${x.unidade||""}`,money(x.custo),money(x.preco)] },
  documentos: { title:"Documentos da propriedade", desc:"Organize documentos e acompanhe suas datas importantes.", group:"documentos",
    fields:[["titulo","Nome do documento","text",true],["categoria","Categoria","select",true,["Propriedade rural","Pessoal e familiar","Contrato","Contábil","Ambiental","Fiscal","Patrimônio","Planejamento sucessório","Outro"]],["emissao","Data de emissão","date",false],["validade","Data de validade","date",false],["responsavel","Responsável","text",false],["arquivo","Nome do arquivo ou referência","text",false],["descricao","Descrição / observações","textarea",false]],
    headers:["Documento","Categoria","Emissão","Validade","Responsável","Arquivo / referência"], values:x=>[x.titulo,x.categoria,x.emissao||"—",x.validade||"—",x.responsavel||"—",x.arquivo||"Não anexado"] }
};
function formField(field, values = {}) {
  const [name,label,type,required,options] = field;
  const value = values[name] ?? "";
  let input = "";
  if (type === "image") {
    const preview = value ? `<img class="property-photo-preview" src="${value}" alt="Foto atual da propriedade">` : `<span class="property-photo-placeholder">⌂<small>Prévia da foto</small></span>`;
    input = `<div class="property-photo-uploader"><div id="property-photo-preview">${preview}</div><div class="photo-upload-controls"><input type="file" id="property-photo-file" accept="image/*" aria-label="Escolher foto da propriedade"><input type="hidden" name="foto" id="property-photo-value" value="${value}"><small>JPG, PNG ou WEBP. A imagem será reduzida para economizar espaço no navegador.</small>${value?'<button type="button" class="btn btn-sm btn-light" id="remove-property-photo">Remover foto</button>':""}</div></div>`;
  }
  else if (type === "select") input = `<select name="${name}" ${required?"required":""}>${options.map(o=>`<option value="${esc(o)}" ${String(value)===String(o)?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  else if (type === "textarea") input = `<textarea name="${name}" ${required?"required":""} placeholder="Adicione informações, se necessário">${esc(value)}</textarea>`;
  else input = `<input name="${name}" type="${type}" value="${esc(value)}" ${required?"required":""} ${type==="number"?'min="0" step="0.01"':''} ${type==="number"?'placeholder="0,00"':''}>`;
  return `<div class="field ${type==="textarea"?"full":""}"><label>${label}${required?" *":""}</label>${input}</div>`;
}
function modulePage(key) {
  const c = configs[key], list = db[c.group];
  const editing = list.find(x => x.id === editingRecordId);
  const form = `<div class="panel inline-form ${editing ? "" : "hidden"}" id="record-form-panel">${panelTitle(editing ? "Editar registro" : "Novo registro")}<form id="record-form"><div class="form-grid">${c.fields.map(f=>formField(f, editing || {})).join("")}</div><div class="form-actions"><button class="btn btn-primary" type="submit">${editing ? "Salvar alterações" : "Salvar registro"}</button><button class="btn btn-light" type="button" data-action="cancel-form">Cancelar</button></div></form></div>`;
  let rows = list.map(x=>`<tr>${c.values(x).map(v=>key==="propriedades" && v==="__FOTO__" ? `<td>${x.foto?`<img class="property-table-thumb" src="${x.foto}" alt="Foto de ${esc(x.nome)}">`:`<span class="no-photo">Sem foto</span>`}</td>` : `<td>${esc(v)}</td>`).join("")}<td class="row-actions"><button class="btn btn-sm btn-light" data-edit="${x.id}" data-group="${c.group}">Editar</button><button class="btn btn-sm btn-danger" data-delete="${x.id}" data-group="${c.group}">Excluir</button></td></tr>`).join("");
  let filters = `<div class="filters"><input id="table-search" placeholder="Pesquisar registros..." aria-label="Pesquisar registros"><select id="status-filter"><option value="">Todos os registros</option><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Pago</option><option>Recebido</option></select></div>`;
  let table = `<div class="panel"><div class="panel-title"><h2>Registros cadastrados (${list.length})</h2><button class="btn btn-sm btn-light" data-action="export-current" data-group="${c.group}">Exportar CSV</button></div>${filters}<div class="table-wrap"><table><thead><tr>${c.headers.map(h=>`<th>${h}</th>`).join("")}<th>Ações</th></tr></thead><tbody id="records-body">${rows || emptyRow(c.headers.length+1)}</tbody></table></div></div>`;
  let topButton = `<button class="btn btn-primary" data-action="show-form">＋ Novo registro</button>`;
  let intro = "";
  if (key==="financeiro") {
    const r=sum(list.filter(x=>x.tipo==="Receita")), d=sum(list.filter(x=>x.tipo==="Despesa"));
    intro=`<div class="cards">${metric("Receitas",money(r),"↗")}${metric("Despesas",money(d),"↘")}${metric("Saldo",money(r-d),"R$")}${metric("Contas pendentes",list.filter(x=>x.situacao==="Pendente").length,"◷")}</div>`;
  } else if (key==="culturas") {
    intro=`<div class="cards">${metric("Culturas registradas",list.length,"❧")}${metric("Área plantada",`${number(sum(list,"area"))} ha`,"⌂")}${metric("Custo registrado",money(sum(list,"custo")),"R$")}${metric("Receita estimada",money(sum(list,"preco")),"↗")}</div>`;
  } else if (key==="propriedades") intro=`<div class="cards">${metric("Registros patrimoniais",list.length,"⌂")}${metric("Valor estimado",money(sum(list,"valor")),"R$")}${metric("Área cadastrada",`${number(sum(list,"area"))} ha`,"↗")}${metric("Tipos de bens",new Set(list.map(x=>x.tipo)).size,"▤")}</div>`;
  else if (key==="documentos") intro=`<div class="cards">${metric("Documentos registrados",list.length,"▤")}${metric("Com arquivo/referência",list.filter(x=>x.arquivo).length,"↗")}${metric("Com validade",list.filter(x=>x.validade).length,"◷")}${metric("Categorias",new Set(list.map(x=>x.categoria)).size,"▤")}</div>`;
  else if (key==="familia") intro=`<div class="notice">Cadastre apenas as informações necessárias e compartilhe dados familiares somente com pessoas autorizadas.</div>`;
  return pageHeading(c.title,c.desc,topButton)+intro+form+table;
}
function successionPage() {
  const defaults = [
    ["Conversar com a família","Definir objetivos, ouvir os envolvidos e registrar decisões."],
    ["Organizar documentos","Reunir documentos da propriedade e da atividade rural."],
    ["Conhecer a situação financeira","Registrar receitas, despesas, dívidas e investimentos."],
    ["Preparar a próxima geração","Envolver e capacitar familiares para a continuidade."],
    ["Buscar orientação profissional","Consultar profissionais habilitados conforme as necessidades."]
  ];
  const hasDefaults = db.sucessao.length > 0;
  const completed = db.sucessao.filter(x=>x.status==="Concluída").length;
  const steps = hasDefaults ? db.sucessao : defaults.map((x,i)=>({id:"default-"+i,titulo:x[0],detalhes:x[1],status:"Pendente",responsavel:"",prazo:"",isDefault:true}));
  const editingStep = db.sucessao.find(x => x.id === editingRecordId);
  return pageHeading("Planejamento sucessório","Organize as etapas para preparar a continuidade da propriedade.",`<button class="btn btn-primary" data-action="init-succession">＋ Personalizar etapas</button>`)
  +`<div class="panel"><div class="panel-title"><h2>Seu plano de continuidade</h2><span class="badge">${hasDefaults?completed:0} de ${hasDefaults?db.sucessao.length:5} etapas concluídas</span></div><div class="progress-row"><span>Progresso geral</span><b>${hasDefaults?Math.round(completed/db.sucessao.length*100):0}%</b></div><div class="progress"><span style="width:${hasDefaults?Math.round(completed/db.sucessao.length*100):0}%"></span></div><div class="step-list" style="margin-top:20px">${steps.map((s,i)=>`<div class="succession-step"><div class="step-num">${i+1}</div><div><h3>${esc(s.titulo)}</h3><p>${esc(s.detalhes||s.observacao||"Defina as atividades e os responsáveis desta etapa.")}</p><p style="margin-top:6px">Responsável: ${esc(s.responsavel||"A definir")} · Prazo: ${esc(s.prazo||"A definir")}</p></div><div class="step-side">${statusBadge(s.status)}<small>${s.isDefault?"Etapa sugerida":`<button class="btn btn-sm btn-light" data-edit-step="${s.id}">Editar</button>`}</small></div></div>`).join("")}</div></div>
  <div class="panel" id="record-form-panel"><div class="panel-title"><h2>${editingStep ? "Editar etapa do plano" : "Registrar etapa ou decisão"}</h2></div><form id="record-form"><div class="form-grid">${formField(["titulo","Nome da etapa / decisão","text",true],editingStep||{})}${formField(["responsavel","Responsável","text",false],editingStep||{})}${formField(["prazo","Prazo","date",false],editingStep||{})}${formField(["status","Status","select",true,["Planejada","Em andamento","Concluída"]],editingStep||{})}${formField(["observacao","Observações e próximos passos","textarea",false],editingStep||{})}</div><div class="form-actions"><button class="btn btn-primary" type="submit">${editingStep ? "Salvar alterações" : "Adicionar ao plano"}</button>${editingStep?'<button class="btn btn-light" type="button" data-action="cancel-form">Cancelar edição</button>':""}</div></form></div>
  <div class="notice">O RAIZ é uma ferramenta de organização. A definição de herança, titularidade, regime tributário e demais decisões legais exige avaliação individual por profissionais habilitados.</div>`;
}
function reportsPage() {
  const r=sum(db.financeiro.filter(x=>x.tipo==="Receita")), d=sum(db.financeiro.filter(x=>x.tipo==="Despesa"));
  const max=Math.max(r,d,1);
  const monthLabels=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const monthly=monthLabels.map((m,i)=>({m,r:sum(db.financeiro.filter(x=>x.tipo==="Receita"&&x.data&&Number(x.data.slice(5,7))===i+1)),d:sum(db.financeiro.filter(x=>x.tipo==="Despesa"&&x.data&&Number(x.data.slice(5,7))===i+1))}));
  const currentMonth=monthly[new Date().getMonth()];
  return pageHeading("Relatórios e indicadores","Consulte os dados cadastrados e exporte cópias para análise.")
  +`<div class="cards">${metric("Receitas registradas",money(r),"↗")}${metric("Despesas registradas",money(d),"↘")}${metric("Saldo calculado",money(r-d),"R$")}${metric("Tarefas concluídas",db.tarefas.filter(x=>x.status==="Concluída").length,"✓")}</div>
  <div class="report-grid"><div class="panel">${panelTitle("Receitas e despesas","<small>Por mês, conforme datas cadastradas</small>")}<div class="bar-chart">${monthly.map(m=>`<div class="bar-group"><div style="display:flex;align-items:flex-end;gap:3px;height:100%;width:100%;justify-content:center"><div class="bar" title="Receitas ${money(m.r)}" style="height:${Math.max(2,m.r/max*100)}%"></div><div class="bar expense" title="Despesas ${money(m.d)}" style="height:${Math.max(2,m.d/max*100)}%"></div></div><small>${m.m}</small></div>`).join("")}</div><div class="legend" style="display:flex;gap:18px;margin-top:15px"><span>Receitas</span><span>Despesas</span></div></div>
  <div class="panel">${panelTitle("Visão dos registros")}<div class="donut-wrap"><div class="donut"></div><div class="legend"><span>${db.culturas.length} culturas cadastradas</span><span>${db.documentos.length} documentos registrados</span><span>${db.propriedades.length} bens/propriedades</span></div></div><p class="muted">O gráfico ilustrativo resume os tipos de registros; não representa avaliação patrimonial.</p></div></div>
  <div class="panel">${panelTitle("Exportar dados para Excel / CSV")}<p class="muted">Os arquivos CSV podem ser abertos no Excel. Confira os dados antes de usá-los em decisões contábeis ou jurídicas.</p><div class="quick-grid">${Object.keys(configs).map(k=>`<button class="quick-action" data-action="export-current" data-group="${k}"><span>⇩</span><b>${configs[k].title}</b><small>Baixar CSV</small></button>`).join("")}<button class="quick-action" data-action="export-backup"><span>▤</span><b>Cópia de segurança</b><small>Arquivo JSON</small></button></div><div class="form-actions"><button class="btn btn-primary" data-action="print-report">Imprimir / salvar PDF</button></div></div>`;
}
function settingsPage() {
  return pageHeading("Configurações","Preferências do aplicativo e gerenciamento dos dados.")
  +`<div class="panel"><h2>Perfil atual</h2><div class="settings-row"><div><b>Nome de exibição</b><small>${esc(currentUser.nome)}</small></div><button class="btn btn-sm btn-light" data-action="change-user">Alterar</button></div><div class="settings-row"><div><b>Perfil selecionado</b><small>${esc(currentUser.papel)} · modo de demonstração</small></div><button class="btn btn-sm btn-light" data-action="change-user">Alterar perfil</button></div></div>
  <div class="panel"><h2>Armazenamento local</h2><div class="settings-row"><div><b>Exportar cópia de segurança</b><small>Baixe seus registros em um arquivo JSON.</small></div><button class="btn btn-sm btn-light" data-action="export-backup">Baixar backup</button></div><div class="settings-row"><div><b>Apagar dados deste navegador</b><small>Esta ação remove todos os registros locais do RAIZ.</small></div><button class="btn btn-sm btn-danger" data-action="clear-data">Apagar dados</button></div></div>
  <div class="panel"><h2>Conectar banco de dados</h2><p class="muted">O projeto inclui uma estrutura SQL inicial. Para autenticação real, sincronização entre dispositivos e armazenamento privado, configure o Supabase seguindo o arquivo README.</p><div class="notice">Não use informações pessoais ou financeiras reais no modo local de demonstração. O armazenamento local não oferece autenticação, compartilhamento nem proteção adequada para dados confidenciais.</div><button class="btn btn-light" data-action="show-supabase">Ver status da integração</button></div>`;
}
function clearPropertyPhoto() {
  const hidden = document.getElementById("property-photo-value");
  if (hidden) hidden.value = "";
  const input = document.getElementById("property-photo-file");
  if (input) input.value = "";
  const preview = document.getElementById("property-photo-preview");
  if (preview) preview.innerHTML = '<span class="property-photo-placeholder">⌂<small>Prévia da foto</small></span>';
  document.getElementById("remove-property-photo")?.remove();
}
function compressPropertyPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Arquivo de imagem inválido"));
      image.onload = () => {
        const maxSide = 1200, scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function bindPageEvents() {
  const photoInput = document.getElementById("property-photo-file");
  if (photoInput) photoInput.addEventListener("change", async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Selecione um arquivo de imagem."); photoInput.value=""; return; }
    if (file.size > 12 * 1024 * 1024) { toast("A imagem deve ter no máximo 12 MB antes da compressão."); photoInput.value=""; return; }
    try {
      const dataUrl = await compressPropertyPhoto(file);
      document.getElementById("property-photo-value").value = dataUrl;
      document.getElementById("property-photo-preview").innerHTML = `<img class="property-photo-preview" src="${dataUrl}" alt="Prévia da foto selecionada">`;
      const removeButton = document.getElementById("remove-property-photo");
      if (!removeButton) {
        const button = document.createElement("button"); button.type="button"; button.id="remove-property-photo"; button.className="btn btn-sm btn-light"; button.textContent="Remover foto";
        document.querySelector(".photo-upload-controls").appendChild(button); button.addEventListener("click", clearPropertyPhoto);
      }
      toast("Foto adicionada. Salve o registro para guardar as alterações.");
    } catch (error) { console.error(error); toast("Não foi possível processar essa imagem."); }
  });
  document.getElementById("remove-property-photo")?.addEventListener("click", clearPropertyPhoto);
  const form = document.getElementById("record-form");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    const obj = Object.fromEntries(new FormData(form).entries());
    if (obj.valor !== undefined) obj.valor = Number(obj.valor || 0);
    ["area","quantidade","custo","preco"].forEach(k => { if (obj[k] !== undefined) obj[k] = Number(obj[k] || 0); });
    const group = currentPage === "sucessao" ? "sucessao" : configs[currentPage]?.group;
    if (!group) return;
    if (editingRecordId) {
      const index = db[group].findIndex(x => x.id === editingRecordId);
      if (index >= 0) db[group][index] = { ...db[group][index], ...obj, id: editingRecordId, atualizadoEm: new Date().toISOString() };
      editingRecordId = null;
      saveData(); render(); toast("Alterações salvas com sucesso.");
    } else {
      obj.id = id(); obj.criadoEm = new Date().toISOString();
      db[group].push(obj); saveData(); render(); toast("Registro salvo com sucesso.");
    }
  });
  document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => goPage(btn.dataset.page)));
  document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => removeRecord(btn.dataset.group,btn.dataset.delete)));
  document.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => {
    editingRecordId = btn.dataset.edit;
    const group = btn.dataset.group;
    const pageForGroup = Object.keys(configs).find(k => configs[k].group === group);
    if (pageForGroup && currentPage !== pageForGroup) currentPage = pageForGroup;
    render();
    document.getElementById("record-form-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  document.querySelectorAll("[data-edit-step]").forEach(btn => {
    btn.addEventListener("click", () => { editingRecordId = btn.dataset.editStep; render(); document.getElementById("record-form-panel")?.scrollIntoView({behavior:"smooth",block:"start"}); });
  });
  document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => handleAction(btn.dataset.action,btn.dataset.group)));
  const search = document.getElementById("table-search");
  if (search) search.addEventListener("input", () => {
    const q = search.value.toLocaleLowerCase("pt-BR");
    document.querySelectorAll("#records-body tr").forEach(row => row.style.display = row.textContent.toLocaleLowerCase("pt-BR").includes(q) ? "" : "none");
  });
}
function handleAction(action, group) {
  if (action === "show-form" || action.startsWith("new-")) {
    editingRecordId = null;
    const target = action.startsWith("new-") ? action.slice(4) : currentPage;
    if (target === "finance") goPage("financeiro");
    else if (target === "documento") goPage("documentos");
    else if (target === "cultura") goPage("culturas");
    setTimeout(() => { const formPanel = document.getElementById("record-form-panel"); if (formPanel) { formPanel.classList.remove("hidden"); formPanel.scrollIntoView({behavior:"smooth",block:"start"}); } else if (currentPage === "sucessao") document.getElementById("record-form")?.scrollIntoView({behavior:"smooth"}); }, 50);
  } else if (action === "cancel-form") { editingRecordId = null; render(); }
  else if (action === "export-current") exportConfiguredGroup(group);
  else if (action === "export-backup") {
    const blob = new Blob([JSON.stringify({data:db,exportadoEm:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="backup-raiz.json";a.click();URL.revokeObjectURL(url);toast("Cópia de segurança gerada.");
  } else if (action === "print-report") window.print();
  else if (action === "clear-data") {
    if (confirm("Apagar todos os registros locais deste navegador?")) { db=structuredClone(defaultData);saveData();render();toast("Dados locais apagados."); }
  } else if (action === "change-user") openLogin();
  else if (action === "show-supabase") toast(supabaseClient ? "Cliente Supabase configurado. Conecte as consultas e políticas antes de usar dados reais." : "Supabase ainda não configurado. Consulte README.md e js/config.js.");
  else if (action === "init-succession") {
    if (!db.sucessao.length) {
      [["Conversar com a família","Definir objetivos e registrar decisões."],["Organizar documentos","Reunir documentos da propriedade."],["Conhecer a situação financeira","Levantar receitas, despesas e patrimônio."],["Preparar a próxima geração","Definir responsabilidades e capacitação."],["Buscar orientação profissional","Organizar consultas e providências."]].forEach((s,i)=>db.sucessao.push({id:id(),titulo:s[0],detalhes:s[1],status:"Planejada",responsavel:"",prazo:"",observacao:"",ordem:i+1}));
      saveData();render();toast("Etapas iniciais adicionadas ao plano.");
    } else toast("Você já tem etapas cadastradas. Use o formulário para adicionar outras.");
  }
}
function exportConfiguredGroup(group) {
  const c = configs[group];
  if (!c) return;
  exportGroup(group,c.headers,x=>c.values(x)); toast("Arquivo CSV preparado para download.");
}
document.querySelectorAll("#open-login,#hero-login,#how-login,[data-login]").forEach(btn=>btn.addEventListener("click",openLogin));
document.getElementById("close-login").addEventListener("click",()=>document.getElementById("login-dialog").close());
document.getElementById("login-form").addEventListener("submit",e=>{
  e.preventDefault();const form=new FormData(e.currentTarget);
  currentUser={nome:String(form.get("nome")||"Usuário").trim(),papel:String(form.get("papel")||"Familiar")};
  document.getElementById("login-dialog").close();goApp();toast("Modo de demonstração iniciado.");
});
document.getElementById("back-home").addEventListener("click",goLanding);
document.getElementById("brand-home").addEventListener("click",e=>{e.preventDefault();goPage("dashboard")});
document.getElementById("user-button").addEventListener("click",openLogin);
document.getElementById("app-menu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("mobile-menu").addEventListener("click",()=>document.querySelector(".site-links").classList.toggle("open"));
document.getElementById("contact-form").addEventListener("submit",e=>{
  e.preventDefault();const form=new FormData(e.currentTarget);
  const subject=encodeURIComponent("Contato pelo site RAIZ");
  const body=encodeURIComponent(`Nome: ${form.get("nome")}\nE-mail: ${form.get("email")}\n\nMensagem:\n${form.get("mensagem")}`);
  toast("Mensagem preparada. Para envio real, conecte um serviço de backend.");
  const link=document.createElement("a");link.href=`mailto:?subject=${subject}&body=${body}`;link.click();
  e.currentTarget.reset();
});
document.getElementById("year").textContent = new Date().getFullYear();
