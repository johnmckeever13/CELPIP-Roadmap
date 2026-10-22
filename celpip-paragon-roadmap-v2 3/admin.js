"use strict";
const STATUSES=["Backlog","Discovery","Planned","In Progress","At Risk","On Hold","Complete"], PRIORITIES=["Strategic","High","Medium","Low"];
const CATEGORIES=["Item Management","Business Operations","Marketing","Security","CAEL","Scoring","Test Enhancements","AI Projects"];
const COLLAPSED_KEY="cpRoadmap.collapsed", THEME_KEY="cpRoadmap.theme";
let projects=[], parkingLot=[], collapsed=new Set(), fileHandle=null; const $=id=>document.getElementById(id);
function loadCollapsed(){try{collapsed=new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY)||"[]"))}catch{collapsed=new Set()}}
function saveCollapsed(){localStorage.setItem(COLLAPSED_KEY,JSON.stringify([...collapsed]))}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeUrl(u){return /^https?:\/\//i.test(u||"")?u:""}
function d(s){let [y,m]=s.split("-").map(Number);return new Date(y,m-1,1)}
function addMonth(x,n){return new Date(x.getFullYear(),x.getMonth()+n,1)}
function diff(a,z){return(z.getFullYear()-a.getFullYear())*12+z.getMonth()-a.getMonth()}
function fy(x){return x.getMonth()>=9?x.getFullYear()+1:x.getFullYear()} // Oct 1 fiscal-year start
function options(el,vals,all){let v=el.value;el.innerHTML=(all?`<option value="">${all}</option>`:"")+vals.map(x=>`<option>${esc(x)}</option>`).join("");if([...el.options].some(o=>o.value===v))el.value=v}
function init(){options($("categoryFilter"),CATEGORIES,"All categories");options($("statusFilter"),STATUSES,"All statuses");options($("pCategory"),CATEGORIES);options($("pStatus"),STATUSES);options($("priority"),PRIORITIES);options($("ideaCategory"),CATEGORIES,"No category")}
function applyData(data){projects=Array.isArray(data.projects)?data.projects:[];parkingLot=Array.isArray(data.parkingLot)?data.parkingLot:[]}
function visible(){let q=$("search").value.toLowerCase(),c=$("categoryFilter").value,s=$("statusFilter").value;return projects.filter(x=>(!q||Object.values(x).join(" ").toLowerCase().includes(q))&&(!c||x.category===c)&&(!s||x.status===s))}
function color(s){return {Backlog:"#97a6b6",Discovery:"#b76b00",Planned:"#7553c7","In Progress":"#2f80ed","At Risk":"#bd3545","On Hold":"#788897",Complete:"#20875a"}[s]||"#66788a"}
function hasProgress(s){return ["In Progress","At Risk","On Hold","Complete"].includes(s)} // only statuses that imply work has started
function hexToRgba(hex,a){let h=hex.replace("#","");if(h.length===3)h=[...h].map(c=>c+c).join("");let n=parseInt(h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function categoryColor(c){return {"Item Management":"#678FEF","Business Operations":"#6967CE",Marketing:"#6F0E49",Security:"#014746",CAEL:"#C9A227",Scoring:"#16DFA5","Test Enhancements":"#88D9D0","AI Projects":"#D96BA0"}[c]||"#97a6b6"}
function pieChart(catCounts,total,activeCategory){
  let r=40,cx=50,cy=50,circumference=2*Math.PI*r,strokeWidth=18,offset=0;
  let arcs=catCounts.map(c=>{
    let dash=total?(c.count/total)*circumference:0;
    let dimmed=activeCategory&&activeCategory!==c.cat;
    let circle=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.tint}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${circumference-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" data-cat="${esc(c.cat)}" data-count="${c.count}" style="opacity:${dimmed?.35:1};cursor:pointer"></circle>`;
    offset+=dash;
    return circle;
  }).join("");
  if(!arcs)arcs=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${strokeWidth}"/>`;
  return `<div class="pieCard"><div class="pieWrap"><svg viewBox="0 0 100 100" class="pieSvg">${arcs}</svg><div class="pieTotal"><b>${total}</b><small>Projects</small></div><div class="pieTooltip" id="pieTooltip" hidden></div></div></div>`;
}
function ideaCard(x){
  let meta=[];
  if(x.category)meta.push(`<span><i style="background:${categoryColor(x.category)}"></i>${esc(x.category)}</span>`);
  if(x.jira)meta.push(`<a href="${esc(x.jira)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Jira</a>`);
  return `<div class="idea editable" data-idea="${esc(x.id)}" tabindex="0" role="button"><h3>${esc(x.name)}</h3>${x.objective?`<p>${esc(x.objective)}</p>`:""}${meta.length?`<div class="meta">${meta.join("")}</div>`:""}</div>`;
}
function renderParking(){
  let q=$("search").value.toLowerCase(),c=$("categoryFilter").value;
  let list=parkingLot.filter(x=>(!q||Object.values(x).join(" ").toLowerCase().includes(q))&&(!c||x.category===c));
  $("parkingCount").textContent=`${list.length} of ${parkingLot.length} ideas`;
  $("parking").innerHTML=list.length?`<div class="parkingGrid">${list.map(ideaCard).join("")}</div>`:`<div class="empty">${parkingLot.length?"No matching ideas.":"No ideas parked yet."}</div>`;
  document.querySelectorAll("[data-idea]").forEach(x=>{x.onclick=()=>openIdea(x.dataset.idea);x.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openIdea(x.dataset.idea)}}});
}
const PAST_BUFFER_MONTHS=6, FUTURE_BUFFER_MONTHS=18; // guarantees scroll room both directions even when items cluster around today
function range(items){let now=new Date();let today=new Date(now.getFullYear(),now.getMonth(),1);let starts=items.map(x=>d(x.start)).concat([addMonth(today,-PAST_BUFFER_MONTHS)]),ends=items.map(x=>d(x.end)).concat([addMonth(today,FUTURE_BUFFER_MONTHS)]);let min=new Date(Math.min(...starts)),max=new Date(Math.max(...ends));let first=new Date(fy(min)-1,9,1);let last=new Date(fy(max),8,1);return {first,months:diff(first,last)+1}}
function render(){
  let items=visible();
  $("count").textContent=`${items.length} of ${projects.length} projects`;
  renderParking();
  let activeStatus=$("statusFilter").value, activeCategory=$("categoryFilter").value;
  let tiles=[{label:"Projects",count:items.length,tint:"var(--navy)",status:""}].concat(STATUSES.map(s=>({label:s,count:items.filter(x=>x.status===s).length,tint:color(s),status:s})));
  let catCounts=CATEGORIES.map(c=>({cat:c,count:items.filter(x=>x.category===c).length,tint:categoryColor(c)})).filter(c=>c.count);
  $("metrics").innerHTML=`<div class="metrics">${tiles.map(t=>`<div class="metric${t.status===activeStatus?" active":""}" data-status="${esc(t.status)}" style="border-left-color:${t.tint}"><small>${esc(t.label)}</small><b>${t.count}</b></div>`).join("")}</div>${pieChart(catCounts,items.length,activeCategory)}`;
  document.querySelectorAll(".metric").forEach(x=>x.onclick=()=>{let s=x.dataset.status;if(s===""){$("statusFilter").value="";$("categoryFilter").value=""}else{$("statusFilter").value=($("statusFilter").value===s)?"":s}render()});
  let pieTip=$("pieTooltip");
  document.querySelectorAll(".pieSvg circle[data-cat]").forEach(c=>{
    let wrap=c.closest(".pieWrap");
    c.addEventListener("mouseenter",()=>{pieTip.hidden=false;c.style.opacity=1});
    c.addEventListener("mousemove",e=>{
      let box=wrap.getBoundingClientRect();
      pieTip.textContent=`${c.dataset.cat} - ${c.dataset.count}`;
      pieTip.style.left=(e.clientX-box.left+12)+"px";
      pieTip.style.top=(e.clientY-box.top+12)+"px";
    });
    c.addEventListener("mouseleave",()=>{pieTip.hidden=true;c.style.opacity=(activeCategory&&activeCategory!==c.dataset.cat)?.35:1});
    c.onclick=()=>{let cat=c.dataset.cat;$("categoryFilter").value=($("categoryFilter").value===cat)?"":cat;render()};
  });
  if(!items.length){$("timeline").innerHTML='<div class="empty">No matching projects.</div>';return}
  let r=range(items),months=Array.from({length:r.months},(_,i)=>addMonth(r.first,i));
  let yGroups=[],i=0;while(i<months.length){let year=fy(months[i]),span=1;while(i+span<months.length&&fy(months[i+span])===year)span++;yGroups.push({year,span,start:i});i+=span}
  let fyRow=`<div class="fyRow"><div class="fyLabel sticky">Fiscal year</div>${yGroups.map(g=>`<div class="fyGroup" style="grid-column:${g.start+2}/span ${g.span}">FY${String(g.year).slice(-2)}</div>`).join("")}</div>`;
  let mRow=`<div class="monthRow"><div class="monthLabel sticky">Project</div>${months.map(m=>`<div class="monthLabel">${m.toLocaleString("en",{month:"short"})}${m.getMonth()===9?` '${String(fy(m)).slice(-2)}`:""}</div>`).join("")}</div>`;
  let byCat=CATEGORIES.map(cat=>({cat,items:items.filter(x=>x.category===cat).sort((a,b)=>a.start.localeCompare(b.start))})).filter(g=>g.items.length);
  let body=byCat.map(g=>{
    let isCollapsed=collapsed.has(g.cat);
    let header=`<div class="categoryRow"><div class="catLabel" data-cat="${esc(g.cat)}"><span class="catArrow${isCollapsed?" collapsed":""}">&#9660;</span>${esc(g.cat)} <span class="catCount">(${g.items.length})</span></div><div class="catBar"></div></div>`;
    let rows=isCollapsed?"":g.items.map(p=>{
      let s=Math.max(0,diff(r.first,d(p.start))),e=Math.min(r.months-1,diff(r.first,d(p.end))),left=`calc(var(--label) + ${s} * var(--month) + 5px)`,width=`calc(${e-s+1} * var(--month) - 10px)`;
      let jiraLink=p.jira?` &middot; <a href="${esc(p.jira)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Jira</a>`:"";
      let protoUrl=safeUrl(p.prototypeUrl),protoLink=protoUrl?` &middot; <a href="${esc(protoUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Prototype</a>`:"";
      let barColor=color(p.status),pct=Math.max(0,Math.min(100,Number(p.percent)||0));
      let barFill=hasProgress(p.status)?`<div class="barFill" style="width:${pct}%;background:${barColor}"></div>`:`<div class="barFill" style="width:100%;background:${barColor}"></div>`;
      let barBg=hasProgress(p.status)?hexToRgba(barColor,.28):barColor;
      return `<div class="projectRow"><div class="projectInfo sticky"><div><button data-id="${p.id}">${esc(p.name)}</button><span>${esc(p.owner)} &middot; ${esc(p.status)}${jiraLink}${protoLink}</span></div></div>${months.map(()=>'<div class="cell"></div>').join("")}<div class="bar" data-id="${p.id}" style="left:${left};width:${width};background:${barBg}">${barFill}<span class="barLabel">${esc(p.name)}</span></div></div>`
    }).join("");
    return header+rows;
  }).join("");
  $("timeline").innerHTML=`<div class="timelineScroll"><div class="timelineGrid" style="--months:${r.months}">${fyRow}${mRow}${body}</div></div>`;
  document.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>open(x.dataset.id));
  document.querySelectorAll(".catLabel").forEach(x=>x.onclick=()=>{let c=x.dataset.cat;collapsed.has(c)?collapsed.delete(c):collapsed.add(c);saveCollapsed();render()});
  let scroller=$("timeline").querySelector(".timelineScroll");
  let monthPx=parseInt(getComputedStyle($("timeline").querySelector(".timelineGrid")).getPropertyValue("--month"))||92;
  let todayIndex=Math.max(0,diff(r.first,new Date(new Date().getFullYear(),new Date().getMonth(),1)));
  scroller.scrollLeft=todayIndex*monthPx;
}
function open(id){
  $("form").reset();$("error").textContent="";$("id").value=id||"";$("delete").style.visibility=id?"visible":"hidden";
  if(id){let p=projects.find(x=>x.id===id);["name","owner","start","end","objective","jira","prototypeUrl"].forEach(k=>$(k).value=p[k]||"");$("pCategory").value=p.category;$("pStatus").value=p.status;$("priority").value=p.priority;$("percent").value=p.percent||0}
  else{$("pCategory").value=CATEGORIES[0];$("pStatus").value="Discovery";$("priority").value="Medium";$("percent").value=0}
  $("dialog").showModal();
}
function close(){$("dialog").close()}
$("form").onsubmit=e=>{
  e.preventDefault();
  if($("end").value<$("start").value){$("error").textContent="End month must be on or after start month.";return}
  let id=$("id").value||String(Date.now());
  let p={id,category:$("pCategory").value,name:$("name").value.trim(),owner:$("owner").value.trim(),status:$("pStatus").value,priority:$("priority").value,start:$("start").value,end:$("end").value,jira:$("jira").value.trim(),prototypeUrl:$("prototypeUrl").value.trim(),objective:$("objective").value.trim(),percent:Math.max(0,Math.min(100,Number($("percent").value)||0))};
  let n=projects.findIndex(x=>x.id===id);n<0?projects.push(p):projects[n]=p;
  init();render();close();
  writeLinkedFile();
};
$("delete").onclick=()=>{
  let id=$("id").value;
  if(confirm("Delete this project?")){
    projects=projects.filter(x=>x.id!==id);
    init();render();close();
    writeLinkedFile();
  }
};
$("add").onclick=()=>open();
function openIdea(id){
  $("ideaForm").reset();$("ideaId").value=id||"";$("ideaDelete").style.visibility=id?"visible":"hidden";
  if(id){let x=parkingLot.find(i=>i.id===id);if(!x)return;$("ideaName").value=x.name||"";$("ideaCategory").value=x.category||"";$("ideaJira").value=x.jira||"";$("ideaNotes").value=x.objective||""}
  $("ideaDialog").showModal();
}
function closeIdea(){$("ideaDialog").close()}
$("addIdea").onclick=()=>openIdea();
$("ideaClose").onclick=closeIdea;
$("ideaCancel").onclick=closeIdea;
$("ideaForm").onsubmit=e=>{
  e.preventDefault();
  let id=$("ideaId").value||"i"+Date.now();
  let it={id,name:$("ideaName").value.trim(),category:$("ideaCategory").value,jira:$("ideaJira").value.trim(),objective:$("ideaNotes").value.trim()};
  let n=parkingLot.findIndex(x=>x.id===id);n<0?parkingLot.push(it):parkingLot[n]=it;
  renderParking();closeIdea();
  writeLinkedFile();
};
$("ideaDelete").onclick=()=>{
  let id=$("ideaId").value;
  if(confirm("Delete this idea?")){
    parkingLot=parkingLot.filter(x=>x.id!==id);
    renderParking();closeIdea();
    writeLinkedFile();
  }
};
$("close").onclick=close;
$("cancel").onclick=close;
["search","categoryFilter","statusFilter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
$("clear").onclick=()=>{$("search").value=$("categoryFilter").value=$("statusFilter").value="";render()};

// --- Link to a local roadmap-data.json so every add/edit/delete writes straight to disk ---
const FS_KEY="dataFile", FS_SUPPORTED="showSaveFilePicker" in window;
function idbOpen(){return new Promise((res,rej)=>{let r=indexedDB.open("cpRoadmapFS",1);r.onupgradeneeded=()=>r.result.createObjectStore("handles");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbGet(key){let db=await idbOpen();return new Promise((res,rej)=>{let rq=db.transaction("handles","readonly").objectStore("handles").get(key);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error)})}
async function idbSet(key,val){let db=await idbOpen();return new Promise((res,rej)=>{let tx=db.transaction("handles","readwrite");tx.objectStore("handles").put(val,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function verifyPermission(handle,mode){let opts={mode};try{if((await handle.queryPermission(opts))==="granted")return true}catch{}try{if((await handle.requestPermission(opts))==="granted")return true}catch{}return false}
function setDevUI(state,name,msg){
  let bar=$("devBar"),status=$("devStatus");
  bar.className="devBar";
  ["devLink","devCreate","devReconnect","devRelink"].forEach(id=>$(id).hidden=true);
  $("add").disabled=true;$("addIdea").disabled=true;
  $("add").title=$("addIdea").title="Link roadmap-data.json first (see the bar above)";
  if(state==="unsupported"){status.textContent="This dev tool needs Chrome or Edge (the file-linking feature isn't available in this browser).";}
  else if(state==="idle"){status.textContent=msg||"Not linked to roadmap-data.json yet.";$("devLink").hidden=false;$("devCreate").hidden=false}
  else if(state==="linked"){status.textContent=`Linked to ${name} — every change saves here automatically.`;$("devRelink").hidden=false;$("add").disabled=false;$("addIdea").disabled=false;$("add").title=$("addIdea").title=""}
  else if(state==="needs-permission"){bar.classList.add("warn");status.textContent=`Reconnect to ${name} to resume editing`;$("devReconnect").hidden=false}
  else if(state==="error"){bar.classList.add("err");status.textContent=msg||`Couldn't read/write ${name||"the linked file"}.`;$("devLink").hidden=false;$("devCreate").hidden=false}
}
async function tryAutoLoadLinkedFile(){
  if(!FS_SUPPORTED){setDevUI("unsupported");return}
  let handle;
  try{handle=await idbGet(FS_KEY)}catch{handle=null}
  if(!handle){setDevUI("idle");return}
  fileHandle=handle;
  if(!(await verifyPermission(handle,"readwrite"))){setDevUI("needs-permission",handle.name);return}
  try{
    let text=await(await handle.getFile()).text();
    let data=text.trim()?JSON.parse(text):{projects:[]};
    applyData(data);
    setDevUI("linked",handle.name);init();render();
  }catch(e){setDevUI("error",handle.name)}
}
async function writeLinkedFile(){
  if(!fileHandle)return;
  if(!(await verifyPermission(fileHandle,"readwrite"))){setDevUI("needs-permission",fileHandle.name);return}
  try{
    let w=await fileHandle.createWritable();
    await w.write(JSON.stringify({projects,parkingLot,collapsed:[]},null,2));
    await w.close();
    setDevUI("linked",fileHandle.name);
  }catch(e){setDevUI("error",fileHandle.name)}
}
$("devLink").onclick=async()=>{
  try{
    let[handle]=await window.showOpenFilePicker({excludeAcceptAllOption:false});
    if(!(await verifyPermission(handle,"readwrite")))return;
    fileHandle=handle;await idbSet(FS_KEY,handle);
    let text=await(await handle.getFile()).text();
    let data=text.trim()?JSON.parse(text):{projects:[]};
    applyData(data);
    setDevUI("linked",handle.name);init();render();
  }catch(e){}
};
$("devCreate").onclick=async()=>{
  try{
    let handle=await window.showSaveFilePicker({suggestedName:"roadmap-data.json"});
    fileHandle=handle;await idbSet(FS_KEY,handle);
    setDevUI("linked",handle.name);
    await writeLinkedFile();
  }catch(e){}
};
$("devReconnect").onclick=()=>tryAutoLoadLinkedFile();
$("devRelink").onclick=()=>setDevUI("idle","Choose a different file to link.");

function currentTheme(){let attr=document.documentElement.getAttribute("data-theme");if(attr)return attr;return matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
function updateToggleIcon(t){$("themeToggle").textContent=t==="dark"?"☀":"☾";$("themeToggle").title=t==="dark"?"Switch to light mode":"Switch to dark mode"}
$("themeToggle").onclick=()=>{let next=currentTheme()==="dark"?"light":"dark";localStorage.setItem(THEME_KEY,next);document.documentElement.setAttribute("data-theme",next);updateToggleIcon(next)};
let savedTheme=localStorage.getItem(THEME_KEY);
if(savedTheme)document.documentElement.setAttribute("data-theme",savedTheme);
updateToggleIcon(currentTheme());
loadCollapsed();init();render();
tryAutoLoadLinkedFile();
