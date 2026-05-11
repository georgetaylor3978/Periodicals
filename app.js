/* Periodicals Dashboard — app.js */
const PALETTE=['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#6366f1','#14b8a6','#e11d48','#7c3aed'];
const PROV_COLORS={AB:'#ef4444',BC:'#3b82f6',MB:'#f59e0b',NB:'#8b5cf6',NL:'#06b6d4',NS:'#10b981',NT:'#f97316',NU:'#ec4899',ON:'#84cc16',PE:'#6366f1',QC:'#14b8a6',SK:'#e11d48',YT:'#7c3aed',Unknown:'#64748b'};
let charts={},selectedRecipients=new Set(),trendMetric='amount';

function gc(){const s=getComputedStyle(document.body);return{tick:s.getPropertyValue('--chart-tick').trim()||'#64748b',tickLight:s.getPropertyValue('--chart-tick-light').trim()||'#94a3b8',grid:s.getPropertyValue('--chart-grid').trim()||'rgba(255,255,255,0.04)'};}
function fmt$(v){if(v>=1e6)return'$'+(v/1e6).toFixed(1)+'M';if(v>=1e3)return'$'+(v/1e3).toFixed(0)+'K';return'$'+v.toLocaleString();}
function fmtN(v){return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v.toLocaleString();}

function getFiltered(){
  const prov=document.getElementById('provinceFilter').value;
  let d=rawData;
  if(prov!=='ALL')d=d.filter(r=>r.province===prov);
  if(selectedRecipients.size>0)d=d.filter(r=>selectedRecipients.has(r.recipient));
  return d;
}

function init(){
  if(typeof rawData==='undefined'||!rawData.length)return;
  document.getElementById('loader').classList.add('hidden');
  populateYears();populateProvinces();populateRecipients();
  setupListeners();initThemeToggle();initRecipientPicker();initTrendToggle();
  updateDashboard();
}

function populateYears(){
  const yrs=[...new Set(rawData.map(d=>d.year))].sort();
  const end=document.getElementById('yearFilter'),start=document.getElementById('startYearFilter');
  [...yrs].reverse().forEach(y=>{const o=document.createElement('option');o.value=y;o.text=y;end.appendChild(o);});
  end.value=yrs[yrs.length-1];
  yrs.forEach(y=>{const o=document.createElement('option');o.value=y;o.text=y;start.appendChild(o);});
  start.value=yrs[0];
}

function populateProvinces(){
  const provs=[...new Set(rawData.map(d=>d.province))].filter(p=>p!=='Unknown').sort();
  const sel=document.getElementById('provinceFilter');
  provs.forEach(p=>{const o=document.createElement('option');o.value=p;o.text=(typeof PROV_FULL_NAMES!=='undefined'&&PROV_FULL_NAMES[p])?PROV_FULL_NAMES[p]+' ('+p+')':p;sel.appendChild(o);});
}

function populateRecipients(){
  const list=document.getElementById('recipientList');
  const recips=[...new Set(rawData.map(d=>d.recipient))].sort((a,b)=>a.localeCompare(b));
  list.innerHTML='';
  recips.forEach(r=>{
    const el=document.createElement('div');
    el.className='picker-item'+(selectedRecipients.has(r)?' selected':'');
    el.innerHTML=`<span class="picker-checkbox">${selectedRecipients.has(r)?'✓':''}</span><span class="picker-label">${r}</span>`;
    el.addEventListener('click',()=>{if(selectedRecipients.has(r))selectedRecipients.delete(r);else selectedRecipients.add(r);populateRecipients();updatePickerLabel();updateDashboard();});
    list.appendChild(el);
  });
  document.getElementById('recipientFooter').textContent=selectedRecipients.size>0?selectedRecipients.size+' of '+recips.length+' selected':'Showing all '+recips.length+' recipients';
}

function updatePickerLabel(){
  const lbl=document.getElementById('recipientPickerLabel');
  if(selectedRecipients.size===0)lbl.textContent='All Recipients';
  else if(selectedRecipients.size===1)lbl.textContent=[...selectedRecipients][0];
  else if(selectedRecipients.size<=3)lbl.textContent=[...selectedRecipients].join(', ');
  else lbl.textContent=selectedRecipients.size+' Recipients Selected';
}

function initRecipientPicker(){
  const btn=document.getElementById('recipientPickerBtn'),dd=document.getElementById('recipientDropdown');
  btn.addEventListener('click',e=>{e.stopPropagation();const open=dd.classList.contains('open');if(!open){dd.classList.add('open');btn.setAttribute('aria-expanded','true');document.getElementById('recipientSearch').focus();}else{dd.classList.remove('open');btn.setAttribute('aria-expanded','false');}});
  document.addEventListener('click',e=>{if(!document.getElementById('recipientPicker').contains(e.target)){dd.classList.remove('open');btn.setAttribute('aria-expanded','false');}});
  document.getElementById('recipientSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#recipientList .picker-item').forEach(el=>{el.style.display=el.textContent.toLowerCase().includes(q)?'':'none';});});
  document.getElementById('selectAllBtn').addEventListener('click',()=>{rawData.forEach(d=>selectedRecipients.add(d.recipient));populateRecipients();updatePickerLabel();updateDashboard();});
  document.getElementById('selectNoneBtn').addEventListener('click',()=>{selectedRecipients.clear();populateRecipients();updatePickerLabel();updateDashboard();});
}

function initTrendToggle(){
  document.getElementById('trendMetricToggle').addEventListener('click',()=>{
    trendMetric=trendMetric==='amount'?'count':'amount';
    const btn=document.getElementById('trendMetricToggle');
    btn.innerHTML=trendMetric==='amount'?'<span class="toggle-icon">$</span> Amount':'<span class="toggle-icon">#</span> Count';
    if(trendMetric==='count')btn.classList.add('active');else btn.classList.remove('active');
    updateDashboard();
  });
}

function setupListeners(){
  ['yearFilter','startYearFilter','provinceFilter'].forEach(id=>document.getElementById(id).addEventListener('change',()=>updateDashboard()));
  ['tableSearch','tableSortField','tableSortDir'].forEach(id=>{const el=document.getElementById(id);el.addEventListener('input',renderTable);el.addEventListener('change',renderTable);});
}

function updateDashboard(){
  const yr=document.getElementById('yearFilter').value;
  const startYr=document.getElementById('startYearFilter').value;
  updateHeaderMeta(yr);renderKPIs(yr,startYr);renderTrendChart(yr,startYr);
  renderTrendSummary(startYr,yr);renderBarChart(yr);renderDonutChart(yr);
  renderYoYChart();renderMap(yr);renderTable();
}

function updateHeaderMeta(yr){
  const data=getFiltered();
  const curr=data.filter(d=>String(d.year)===String(yr)).reduce((s,d)=>s+d.amount,0);
  const prev=data.filter(d=>String(d.year)===String(parseInt(yr)-1)).reduce((s,d)=>s+d.amount,0);
  const pct=prev?((curr-prev)/prev*100).toFixed(1):'—';
  const sign=pct>0?'+':'';
  document.getElementById('headerMeta').innerHTML=`
    <div class="header-stat"><span class="val">${fmt$(curr)}</span><span class="lbl">Total Funding ${yr}</span></div>
    <div class="header-stat"><span class="val" style="color:${pct>0?'var(--success)':'var(--danger)'}">${sign}${pct}%</span><span class="lbl">vs Prior Year</span></div>`;
}

function renderKPIs(yr,startYr){
  const c=document.getElementById('kpiGrid');c.innerHTML='';
  const data=getFiltered();const prevYr=String(parseInt(yr)-1);
  const currAmt=data.filter(d=>String(d.year)===String(yr)).reduce((s,d)=>s+d.amount,0);
  const prevAmt=data.filter(d=>String(d.year)===prevYr).reduce((s,d)=>s+d.amount,0);
  const currCnt=data.filter(d=>String(d.year)===String(yr)).reduce((s,d)=>s+d.count,0);
  const prevCnt=data.filter(d=>String(d.year)===prevYr).reduce((s,d)=>s+d.count,0);
  const startAmt=data.filter(d=>String(d.year)===String(startYr)).reduce((s,d)=>s+d.amount,0);
  const recipCount=new Set(data.filter(d=>String(d.year)===String(yr)).map(d=>d.recipient)).size;
  const provCount=new Set(data.filter(d=>String(d.year)===String(yr)).map(d=>d.province)).size;

  const amtPct=prevAmt?((currAmt-prevAmt)/prevAmt*100).toFixed(1):null;
  const cntPct=prevCnt?((currCnt-prevCnt)/prevCnt*100).toFixed(1):null;
  const rangePct=startAmt?((currAmt-startAmt)/startAmt*100).toFixed(1):null;
  const nYrs=parseInt(yr)-parseInt(startYr);
  const cagr=startAmt&&nYrs>0?((Math.pow(currAmt/startAmt,1/nYrs)-1)*100).toFixed(2):null;

  function kpi(label,val,pct,color,extra){
    const card=document.createElement('div');card.className='kpi-card';card.style.setProperty('--kpi-color',color);
    const up=pct>0;
    card.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">${val}</div>
      <div class="kpi-footer-row">${pct!==null?`<div class="kpi-change ${up?'up':'down'}">${up?'▲':'▼'} ${Math.abs(pct)}%</div><div class="kpi-year-note">vs ${prevYr}</div>`:''}</div>${extra||''}`;
    c.appendChild(card);
  }
  kpi('Total Funding',fmt$(currAmt),amtPct,'#3b82f6');
  kpi('Payment Count',currCnt.toLocaleString(),cntPct,'#8b5cf6');
  kpi('Recipients',recipCount.toLocaleString(),null,'#10b981');
  kpi('Provinces',provCount.toLocaleString(),null,'#f59e0b');
  kpi('CAGR',cagr!==null?cagr+'%':'—',null,'#06b6d4',`<div class="kpi-year-note">${startYr} → ${yr} (${nYrs}yr)</div>`);
  kpi('Range Growth',rangePct!==null?(rangePct>0?'+':'')+rangePct+'%':'—',null,'#a78bfa',`<div class="kpi-year-note">${startYr} → ${yr}</div>`);
}

function renderTrendChart(yr,startYr){
  if(charts.line)charts.line.destroy();const cc=gc();
  const data=getFiltered();const metric=trendMetric;
  const hasSelection=selectedRecipients.size>0&&selectedRecipients.size<=8;
  const yrs=[...new Set(data.map(d=>d.year))].sort().filter(y=>y>=parseInt(startYr)&&y<=parseInt(yr));
  let datasets=[];
  if(hasSelection){
    let i=0;[...selectedRecipients].forEach(r=>{
      const pts=yrs.map(y=>{const sum=data.filter(d=>d.recipient===r&&d.year===y).reduce((s,d)=>s+d[metric],0);return{x:String(y),y:sum};});
      datasets.push({label:r.length>35?r.substring(0,35)+'…':r,data:pts,borderColor:PALETTE[i%PALETTE.length],backgroundColor:PALETTE[i%PALETTE.length]+'18',borderWidth:2.2,fill:false,tension:0.35,pointRadius:3,pointHoverRadius:6});i++;
    });
  }else{
    const pts=yrs.map(y=>{const sum=data.filter(d=>d.year===y).reduce((s,d)=>s+d[metric],0);return{x:String(y),y:sum};});
    datasets=[{label:metric==='amount'?'Total Funding ($)':'Payment Count',data:pts,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.15)',borderWidth:3,fill:true,tension:0.35,pointRadius:4,pointHoverRadius:7}];
  }
  document.getElementById('trendTitle').textContent=hasSelection?'Selected Recipients — Over Time':'Funding Over Time';
  charts.line=new Chart(document.getElementById('lineChart'),{type:'line',data:{labels:yrs.map(String),datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:hasSelection,position:'bottom',labels:{color:cc.tickLight,font:{size:11,family:"'Inter',system-ui,sans-serif"},padding:14,boxWidth:28,usePointStyle:true}},tooltip:{mode:'index',intersect:false,callbacks:{label:c=>'  '+c.dataset.label+': '+(metric==='amount'?fmt$(c.raw.y):Number(c.raw.y).toLocaleString())}}},scales:{y:{grid:{color:cc.grid},ticks:{color:cc.tick,font:{size:11},callback:v=>metric==='amount'?fmt$(v):fmtN(v)}},x:{grid:{display:false},ticks:{color:cc.tick,font:{size:10},maxRotation:45}}},interaction:{mode:'index',intersect:false}}});
}

function renderTrendSummary(startYr,endYr){
  const container=document.getElementById('trendSummary');if(!container)return;
  const data=getFiltered();const metric=trendMetric;
  const hasSelection=selectedRecipients.size>0&&selectedRecipients.size<=8;
  if(!hasSelection){container.innerHTML='';return;}
  const yrs=[...new Set(data.map(d=>d.year))].sort().filter(y=>y>=parseInt(startYr)&&y<=parseInt(endYr));
  if(yrs.length<2){container.innerHTML='';return;}
  const firstYr=String(yrs[0]),lastYr=String(yrs[yrs.length-1]),prevYr=String(yrs[yrs.length-2]);
  const rows=[...selectedRecipients].map((r,i)=>{
    const fv=data.filter(d=>d.recipient===r&&String(d.year)===firstYr).reduce((s,d)=>s+d[metric],0);
    const lv=data.filter(d=>d.recipient===r&&String(d.year)===lastYr).reduce((s,d)=>s+d[metric],0);
    const pv=data.filter(d=>d.recipient===r&&String(d.year)===prevYr).reduce((s,d)=>s+d[metric],0);
    const rng=fv>0?((lv-fv)/fv*100):null;const yoy=pv>0?((lv-pv)/pv*100):null;
    const fmt2=(v)=>v===null?'—':(v>=0?'+':'')+v.toFixed(1)+'%';
    const cls=v=>v===null?'ts-neutral':v>0?'ts-up':'ts-down';
    const color=PALETTE[i%PALETTE.length];
    const name=r.length>42?r.substring(0,42)+'…':r;
    return `<div class="ts-row"><span class="ts-name"><span class="ts-dot" style="background:${color}"></span>${name}</span><span class="ts-val">${metric==='amount'?fmt$(lv):lv.toLocaleString()}</span><span class="ts-badge ${cls(rng)}">${fmt2(rng)}</span><span class="ts-badge ${cls(yoy)}">${fmt2(yoy)}</span></div>`;
  });
  container.innerHTML=`<div class="ts-header"><span class="ts-name">Recipient</span><span class="ts-val">${lastYr} ${metric==='amount'?'($)':'(#)'}</span><span class="ts-badge">% ${firstYr}→${lastYr}</span><span class="ts-badge">YoY vs ${prevYr}</span></div>${rows.join('')}`;
}

function renderBarChart(yr){
  if(charts.bar)charts.bar.destroy();const cc=gc();
  document.getElementById('barYear').textContent=yr;
  const data=getFiltered().filter(d=>String(d.year)===String(yr));
  const agg={};data.forEach(d=>{agg[d.recipient]=(agg[d.recipient]||0)+d.amount;});
  const sorted=Object.entries(agg).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,20);
  charts.bar=new Chart(document.getElementById('barChart'),{type:'bar',data:{labels:sorted.map(([n])=>n.length>38?n.substring(0,38)+'…':n),datasets:[{data:sorted.map(([,v])=>v),backgroundColor:sorted.map((_,i)=>PALETTE[i%PALETTE.length]+'bb'),borderColor:sorted.map((_,i)=>PALETTE[i%PALETTE.length]),borderWidth:1,borderRadius:5,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'  '+fmt$(c.raw)}}},scales:{x:{grid:{color:cc.grid},ticks:{color:cc.tick,font:{size:10},callback:v=>fmt$(v)}},y:{grid:{display:false},ticks:{color:cc.tickLight,font:{size:10}}}}}});
}

function renderDonutChart(yr){
  if(charts.donut)charts.donut.destroy();const cc=gc();
  document.getElementById('donutYear').textContent=yr;
  const data=getFiltered().filter(d=>String(d.year)===String(yr));
  const byProv={};data.forEach(d=>{byProv[d.province]=(byProv[d.province]||0)+d.amount;});
  const sorted=Object.entries(byProv).sort((a,b)=>b[1]-a[1]);
  const labels=sorted.map(([p])=>(typeof PROV_FULL_NAMES!=='undefined'&&PROV_FULL_NAMES[p])||p);
  const colors=sorted.map(([p])=>PROV_COLORS[p]||'#64748b');
  charts.donut=new Chart(document.getElementById('donutChart'),{type:'doughnut',data:{labels,datasets:[{data:sorted.map(([,v])=>v),backgroundColor:colors.map(c=>c+'cc'),borderColor:colors,borderWidth:2,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:true,position:'right',labels:{color:cc.tickLight,font:{size:11,family:"'Inter',system-ui,sans-serif"},boxWidth:12,padding:10,generateLabels:chart=>{const ds=chart.data.datasets[0];const total=ds.data.reduce((a,b)=>a+b,0);return chart.data.labels.map((lbl,i)=>({text:lbl+' '+(ds.data[i]/total*100).toFixed(1)+'%',fillStyle:ds.backgroundColor[i],strokeStyle:ds.borderColor[i],lineWidth:1,hidden:false,index:i}));}}},tooltip:{callbacks:{label:c=>{const total=c.dataset.data.reduce((a,b)=>a+b,0);return'  '+fmt$(c.raw)+' ('+(c.raw/total*100).toFixed(1)+'%)';}}}}}});
}

function renderYoYChart(){
  if(charts.yoy)charts.yoy.destroy();const cc=gc();
  const data=getFiltered();const byYr={};
  data.forEach(d=>{byYr[d.year]=(byYr[d.year]||0)+d.amount;});
  const yrs=Object.keys(byYr).sort();const changes=[],labels=[];
  for(let i=1;i<yrs.length;i++){const p=byYr[yrs[i-1]],c=byYr[yrs[i]];if(p>0){changes.push(parseFloat(((c-p)/p*100).toFixed(1)));labels.push(yrs[i]);}}
  charts.yoy=new Chart(document.getElementById('yoyChart'),{type:'bar',data:{labels,datasets:[{data:changes,backgroundColor:changes.map(v=>v>=0?'rgba(16,185,129,0.7)':'rgba(239,68,68,0.7)'),borderColor:changes.map(v=>v>=0?'#10b981':'#ef4444'),borderWidth:1,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'  '+(c.raw>0?'+':'')+c.raw+'%'}}},scales:{y:{grid:{color:cc.grid},ticks:{color:cc.tick,font:{size:10},callback:v=>v+'%'}},x:{grid:{display:false},ticks:{color:cc.tick,font:{size:9},maxRotation:45}}}}});
}

function renderMap(yr){
  if(typeof CANADA_PATHS==='undefined')return;
  const svg=document.getElementById('canadaMap');if(!svg)return;svg.innerHTML='';
  const data=getFiltered().filter(d=>String(d.year)===String(yr));
  const byProv={};data.forEach(d=>{if(d.province!=='Unknown')byProv[d.province]=(byProv[d.province]||0)+d.amount;});
  const vals=Object.values(byProv);const maxVal=Math.max(...vals,1);
  document.getElementById('mapYear').textContent=yr;
  const tip=document.getElementById('mapTooltip');
  Object.entries(CANADA_PATHS).forEach(([prov,pathD])=>{
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',pathD);path.setAttribute('data-prov',prov);
    const val=byProv[prov]||0;const intensity=maxVal>0?Math.max(0.15,val/maxVal):0.15;
    const color=PROV_COLORS[prov]||'#64748b';
    path.style.fill=val>0?color:('var(--surface3)');path.style.opacity=val>0?Math.max(0.4,intensity):0.3;
    path.addEventListener('mouseenter',e=>{
      const name=(typeof PROV_FULL_NAMES!=='undefined'&&PROV_FULL_NAMES[prov])||prov;
      tip.innerHTML=`<strong>${name}</strong><br>Funding: ${fmt$(val)}<br>Share: ${vals.reduce((a,b)=>a+b,0)>0?(val/vals.reduce((a,b)=>a+b,0)*100).toFixed(1)+'%':'0%'}`;
      tip.classList.add('show');tip.style.left=e.offsetX+15+'px';tip.style.top=e.offsetY-10+'px';
    });
    path.addEventListener('mousemove',e=>{tip.style.left=e.offsetX+15+'px';tip.style.top=e.offsetY-10+'px';});
    path.addEventListener('mouseleave',()=>tip.classList.remove('show'));
    path.addEventListener('click',()=>{document.getElementById('provinceFilter').value=prov;updateDashboard();});
    svg.appendChild(path);
  });
  // Legend
  const legend=document.getElementById('mapLegend');
  legend.innerHTML=Object.entries(byProv).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([p,v])=>`<span><span class="legend-swatch" style="background:${PROV_COLORS[p]||'#64748b'}"></span>${p}: ${fmt$(v)}</span>`).join('');
}

let tableData=[];
function renderTable(){
  const data=getFiltered();const yr=document.getElementById('yearFilter').value;
  const search=(document.getElementById('tableSearch').value||'').toLowerCase();
  const sortF=document.getElementById('tableSortField').value;
  const sortDir=document.getElementById('tableSortDir').value;
  // Build YoY lookup
  const byYrRecip={};data.forEach(d=>{const k=d.year+'||'+d.recipient;byYrRecip[k]=(byYrRecip[k]||0)+d.amount;});
  let rows=data.map(d=>{
    const prevKey=(d.year-1)+'||'+d.recipient;const prev=byYrRecip[prevKey]||0;
    const yoy=prev>0?((d.amount-prev)/prev*100):null;
    return{...d,yoy:yoy!==null?Math.round(yoy*10)/10:null};
  });
  if(search)rows=rows.filter(d=>d.recipient.toLowerCase().includes(search)||String(d.year).includes(search)||d.province.toLowerCase().includes(search));
  rows.sort((a,b)=>{let va=a[sortF],vb=b[sortF];if(sortF==='amount'||sortF==='count'||sortF==='year'){va=Number(va);vb=Number(vb);}const cmp=String(va).localeCompare(String(vb),undefined,{numeric:true});return sortDir==='asc'?cmp:-cmp;});
  const LIMIT=200;const tbody=document.querySelector('#dataTable tbody');tbody.innerHTML='';
  rows.slice(0,LIMIT).forEach(d=>{
    const yoyHtml=d.yoy===null?'<span class="change-neutral">N/A</span>':d.yoy>0?`<span class="change-up">▲ +${d.yoy}%</span>`:d.yoy<0?`<span class="change-down">▼ ${d.yoy}%</span>`:'<span class="change-neutral">—</span>';
    const linkHtml=d.link?`<a href="${d.link}" target="_blank" rel="noopener" class="link-icon">🔗 Visit</a>`:'';
    const pc=PROV_COLORS[d.province]||'#64748b';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${d.year}</td><td><span class="prov-badge" style="background:${pc}22;color:${pc};border:1px solid ${pc}44">${d.province}</span></td><td>${d.recipient}</td><td>${d.count.toLocaleString()}</td><td>${fmt$(d.amount)}</td><td>${yoyHtml}</td><td>${linkHtml}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('tableFooter').textContent=`Showing ${Math.min(rows.length,LIMIT).toLocaleString()} of ${rows.length.toLocaleString()} rows`;
}

function initThemeToggle(){
  const btn=document.getElementById('themeToggle');if(!btn)return;
  if(localStorage.getItem('periodicalTheme')==='light')document.body.classList.add('light-mode');
  btn.addEventListener('click',()=>{document.body.classList.toggle('light-mode');localStorage.setItem('periodicalTheme',document.body.classList.contains('light-mode')?'light':'dark');updateDashboard();});
}

init();
