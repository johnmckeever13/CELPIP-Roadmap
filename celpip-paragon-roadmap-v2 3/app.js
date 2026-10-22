"use strict";
const STATUSES=["Backlog","Discovery","Planned","In Progress","At Risk","On Hold","Complete"], PRIORITIES=["Strategic","High","Medium","Low"];
const CATEGORIES=["Item Management","Business Operations","Marketing","Security","CAEL","Scoring","Test Enhancements","AI Projects"];
const COLLAPSED_KEY="cpRoadmap.collapsed", THEME_KEY="cpRoadmap.theme";
let projects=[], parkingLot=[], collapsed=new Set(); const $=id=>document.getElementById(id);
function loadCollapsed(){try{collapsed=new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY)||"[]"))}catch{collapsed=new Set()}}
function saveCollapsed(){localStorage.setItem(COLLAPSED_KEY,JSON.stringify([...collapsed]))}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeUrl(u){return /^https?:\/\//i.test(u||"")?u:""}
function d(s){let [y,m]=s.split("-").map(Number);return new Date(y,m-1,1)}
function addMonth(x,n){return new Date(x.getFullYear(),x.getMonth()+n,1)}
function diff(a,z){return(z.getFullYear()-a.getFullYear())*12+z.getMonth()-a.getMonth()}
function fy(x){return x.getMonth()>=9?x.getFullYear()+1:x.getFullYear()} // Oct 1 fiscal-year start
function monthLabel(s){let[y,m]=s.split("-");return new Date(Number(y),Number(m)-1,1).toLocaleString("en",{month:"short",year:"numeric"})}
function options(el,vals,all){let v=el.value;el.innerHTML=(all?`<option value="">${all}</option>`:"")+vals.map(x=>`<option>${esc(x)}</option>`).join("");if([...el.options].some(o=>o.value===v))el.value=v}
function init(){options($("categoryFilter"),CATEGORIES,"All categories");options($("statusFilter"),STATUSES,"All statuses")}
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
  if(x.jira)meta.push(`<a href="${esc(x.jira)}" target="_blank" rel="noopener noreferrer">Jira</a>`);
  return `<div class="idea"><h3>${esc(x.name)}</h3>${x.objective?`<p>${esc(x.objective)}</p>`:""}${meta.length?`<div class="meta">${meta.join("")}</div>`:""}</div>`;
}
function renderParking(){
  $("parkingPanel").hidden=!parkingLot.length;
  if(!parkingLot.length)return;
  let q=$("search").value.toLowerCase(),c=$("categoryFilter").value;
  let list=parkingLot.filter(x=>(!q||Object.values(x).join(" ").toLowerCase().includes(q))&&(!c||x.category===c));
  $("parkingCount").textContent=`${list.length} of ${parkingLot.length} ideas`;
  $("parking").innerHTML=list.length?`<div class="parkingGrid">${list.map(ideaCard).join("")}</div>`:'<div class="empty">No matching ideas.</div>';
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
      return `<div class="projectRow"><div class="projectInfo sticky" data-id="${p.id}"><div><button data-id="${p.id}">${esc(p.name)}</button><span>${esc(p.owner)} &middot; ${esc(p.status)}${jiraLink}${protoLink}</span></div></div>${months.map(()=>'<div class="cell"></div>').join("")}<div class="bar" data-id="${p.id}" style="left:${left};width:${width};background:${barBg}">${barFill}<span class="barLabel">${esc(p.name)}</span></div></div>`
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
  let p=projects.find(x=>x.id===id);
  if(!p)return;
  $("dialogTitle").textContent=p.name;
  let rows=[
    ["Category",esc(p.category)],
    ["Owner",esc(p.owner)],
    ["Status",esc(p.status)],
    ["Priority",esc(p.priority)],
  ];
  if(hasProgress(p.status))rows.push(["% Complete",`${Math.max(0,Math.min(100,Number(p.percent)||0))}%`]);
  rows.push(["Timeline",`${esc(monthLabel(p.start))} &ndash; ${esc(monthLabel(p.end))}`]);
  if(p.jira)rows.push(["Jira",`<a href="${esc(p.jira)}" target="_blank" rel="noopener noreferrer">${esc(p.jira)}</a>`]);
  if(safeUrl(p.prototypeUrl))rows.push(["Prototype",`<a href="${esc(p.prototypeUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.prototypeUrl)}</a>`]);
  let notesHtml=p.objective?`<div class="detailNotes"><small>Notes</small><p>${esc(p.objective)}</p></div>`:"";
  $("dialogBody").innerHTML=rows.map(([k,v])=>`<div><small>${k}</small><div>${v}</div></div>`).join("")+notesHtml;
  $("dialog").showModal();
}
function close(){$("dialog").close()}
$("close").onclick=close;
["search","categoryFilter","statusFilter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
$("clear").onclick=()=>{$("search").value=$("categoryFilter").value=$("statusFilter").value="";render()};
function currentTheme(){let attr=document.documentElement.getAttribute("data-theme");if(attr)return attr;return matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
function updateToggleIcon(t){$("themeToggle").textContent=t==="dark"?"☀":"☾";$("themeToggle").title=t==="dark"?"Switch to light mode":"Switch to dark mode"}
$("themeToggle").onclick=()=>{let next=currentTheme()==="dark"?"light":"dark";localStorage.setItem(THEME_KEY,next);document.documentElement.setAttribute("data-theme",next);updateToggleIcon(next)};
let savedTheme=localStorage.getItem(THEME_KEY);
if(savedTheme)document.documentElement.setAttribute("data-theme",savedTheme);
updateToggleIcon(currentTheme());
loadCollapsed();init();render();
fetch("roadmap-data.json",{cache:"no-store"})
  .then(r=>r.json())
  .then(data=>{projects=Array.isArray(data.projects)?data.projects:[];parkingLot=Array.isArray(data.parkingLot)?data.parkingLot:[];render()})
  .catch(()=>{$("timeline").innerHTML='<div class="empty">Couldn\'t load roadmap data.</div>'});
