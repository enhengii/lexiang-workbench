import{G as j,j as q,f as u,k as W,_ as U,v as A,l as Y,c as J,o as K}from"./index-BGmc_mea.js";import{u as N}from"./ai-CZhM1Stg.js";import{r as m,O as i,a as Q,b as X,s as g,g as r,d as l,e as Z}from"./opsData-kyn-tTzR.js";const tt=["innerHTML"],it=j({__name:"OpsGmvView",setup(et){const w=q(),M=N();let d=null;const b=u("30d"),p=u(m(i[0].d)),v=u(m(i[i.length-1].d)),f=u("all"),$=u(x()),S=u(null),y=[];let h=null;const G=[{name:"消费",key:"consumer",color:l.blue,weight:.66},{name:"SMB",key:"smb",color:l.amber,weight:.3},{name:"政企",key:"gov",color:l.purple,weight:.04}];W(async()=>{w.ensureStaticTab("ops.gmv"),w.setActiveStaticTab("ops.gmv"),document.title="联想门户工作台",R(),d=await U(()=>import("./index-BzBQJFYZ.js"),[]),await A(),k(),S.value&&typeof ResizeObserver<"u"&&(h=new ResizeObserver(()=>requestAnimationFrame(()=>y.forEach(t=>t.resize()))),h.observe(S.value))}),Y(()=>{h==null||h.disconnect(),B(),delete window.opsAskGmv,delete window.opsCustomTimeChanged,delete window.opsSetGmvTrendScope,delete window.opsTimeChanged});function x(){return`
    <div class="page-header">
      <div><div class="page-title">GMV 分析</div><div class="page-desc">整体趋势 · 分业务 · 官网/非官网 · 业务GMV=登录口径+平台交易回算 · 口径同日报指标定义</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        ${O()}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="opsAskGmv('overview')">AI 解读</button>
      </div>
    </div>
    <div class="ops-section-title">GMV 核心指标</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-val" id="ops-g-total">-</div><div class="ops-kpi-label">整体 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-consumer">-</div><div class="ops-kpi-label">消费业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-consumer-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-smb">-</div><div class="ops-kpi-label">SMB 业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-smb-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-gov">-</div><div class="ops-kpi-label">政企业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-gov-buy">-</span>人</div></div>
    </div>

    <div class="ops-section-title">GMV 趋势</div>
    <div class="ops-card">
      <div class="dash-filter-bar" style="justify-content:flex-end;margin-bottom:8px">
        <button class="dash-pill" id="gmv-scope-all" onclick="opsSetGmvTrendScope('all')">整体</button>
        <button class="dash-pill" id="gmv-scope-consumer" onclick="opsSetGmvTrendScope('consumer')">消费</button>
        <button class="dash-pill" id="gmv-scope-smb" onclick="opsSetGmvTrendScope('smb')">SMB</button>
        <button class="dash-pill" id="gmv-scope-gov" onclick="opsSetGmvTrendScope('gov')">政企</button>
      </div>
      <div class="chart-wrap"><div id="ops-g-trend-chart" class="ops-chart"></div></div>
    </div>

    <div class="ops-section-title">分业务 GMV</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务GMV占比</h3><div class="chart-wrap-sm"><div id="ops-g-biz-pie" class="ops-chart"></div></div></div>
      <div class="ops-card">
        <div class="ops-card-head">
          <h3>业务贡献明细</h3>
          <div class="dash-card-note">登录口径 + 平台交易回算 · 口径同日报</div>
        </div>
        <table class="data-table">
          <thead><tr><th style="text-align:left">业务</th><th>GMV</th><th>登录口径</th><th>平台回算</th><th>购买人数</th><th>占比</th></tr></thead>
          <tbody id="ops-g-biz-table"></tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">分平台 GMV（官网/非官网）</div>
    <div class="grid-2">
      <div class="ops-card"><h3>官网 vs 非官网</h3><div class="chart-wrap-sm"><div id="ops-g-platform-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>平台趋势</h3><div class="chart-wrap"><div id="ops-g-platform-trend" class="ops-chart"></div></div></div>
    </div>
  `}function O(){const t=b.value==="custom"?`<span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${m(i[0].d)}" max="${m(i[i.length-1].d)}" value="${p.value}" onchange="opsCustomTimeChanged('gmv-time','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${m(i[0].d)}" max="${m(i[i.length-1].d)}" value="${v.value}" onchange="opsCustomTimeChanged('gmv-time','end',this.value)">
    </span>`:"";return`<div class="ops-time-filter" id="gmv-time">
    <div class="dash-filter-bar">
      ${["1d","7d","14d","30d","custom"].map(o=>`<button class="dash-pill ${b.value===o?"active":""}" onclick="opsTimeChanged('gmv-time','${o}')">${Q(o)}</button>`).join("")}
    </div>
    ${t}
    <span class="ops-date-range" id="gmv-time-range"></span>
  </div>`}function R(){window.opsTimeChanged=async(t,o)=>{b.value=o,await T()},window.opsCustomTimeChanged=async(t,o,e)=>{b.value="custom",o==="start"&&(p.value=e),o==="end"&&(v.value=e),p.value>v.value&&(o==="start"?v.value=p.value:p.value=v.value),await T()},window.opsSetGmvTrendScope=async t=>{f.value=t,k()},window.opsAskGmv=()=>{M.toggleOpen(!0),M.quickSend("基于当前GMV分析看板，分析GMV趋势、分业务贡献、平台结构、风险和优先动作。","ops.gmv")}}async function T(){$.value=x(),await A(),k()}function k(){B();const t=X(i,b.value,p.value,v.value),o=t.map(a=>a.d),e={gmv:g(t,"gmv"),buy:g(t,"buy"),offGmv:g(t,"offGmv"),nonGmv:g(t,"nonGmv"),offBuy:g(t,"offBuy"),nonBuy:g(t,"nonBuy")},s=E(e.gmv,e.buy);n("ops-g-total",r(e.gmv)),n("ops-g-buy",e.buy.toLocaleString()),n("ops-g-consumer",r(s[0].value)),n("ops-g-smb",r(s[1].value)),n("ops-g-gov",r(s[2].value)),n("ops-g-consumer-buy",s[0].buy.toLocaleString()),n("ops-g-smb-buy",s[1].buy.toLocaleString()),n("ops-g-gov-buy",s[2].buy.toLocaleString()),["all","consumer","smb","gov"].forEach(a=>{var c;(c=document.getElementById(`gmv-scope-${a}`))==null||c.classList.toggle("active",f.value===a)}),_("ops-g-trend-chart",o,I(t)),L("ops-g-biz-pie",s.map(a=>({name:a.name,value:a.value,color:a.color}))),D(s,e.gmv),L("ops-g-platform-chart",[{name:"官网",value:e.offGmv,color:l.blue},{name:"非官网",value:e.nonGmv,color:l.slate}]),_("ops-g-platform-trend",o,[{name:"官网",data:t.map(a=>a.offGmv),color:l.blue},{name:"非官网",data:t.map(a=>a.nonGmv),color:l.slate}])}function E(t,o){return G.map(e=>{const s=Math.round(t*e.weight),a=Math.round(o*e.weight),c=Math.round(s*.72);return{...e,value:s,buy:a,loginGmv:c,platformGmv:s-c}})}function I(t){if(f.value==="all")return[{name:"整体GMV",data:t.map(e=>e.gmv),color:l.blue,fill:!0}];const o=G.find(e=>e.key===f.value)||G[0];return[{name:`${o.name}GMV`,data:t.map(e=>Math.round(e.gmv*o.weight)),color:o.color,fill:!0}]}function D(t,o){const e=document.getElementById("ops-g-biz-table");e&&(e.innerHTML=t.map(s=>`<tr>
    <td style="text-align:left;font-weight:500"><span class="ops-dot" style="background:${s.color}"></span>${s.name}</td>
    <td>${r(s.value)}</td>
    <td>${r(s.loginGmv)}</td>
    <td>${r(s.platformGmv)}</td>
    <td>${s.buy.toLocaleString()}</td>
    <td>${Z(s.value,o)}</td>
  </tr>`).join(""))}function _(t,o,e){const s=V(t);s&&(s.setOption({...C(),color:e.map(a=>a.color),tooltip:{trigger:"axis"},legend:{top:0,textStyle:{fontSize:11,color:"#6b7280"}},grid:{left:46,right:18,top:36,bottom:28,containLabel:!0},xAxis:{type:"category",data:o,axisLabel:{fontSize:10,color:"#6b7280"},axisTick:{alignWithLabel:!0}},yAxis:{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},series:e.map(a=>({name:a.name,type:"line",smooth:!0,data:a.data,areaStyle:a.fill?{color:P(a.color)}:void 0,lineStyle:{color:a.color,width:2},itemStyle:{color:a.color,borderColor:"#fff",borderWidth:1.5},symbol:"circle",symbolSize:5,animationDelay:H}))}),requestAnimationFrame(()=>s.resize()))}function L(t,o){const e=V(t);e&&(e.setOption({...C(),color:o.map(s=>s.color),tooltip:{trigger:"item"},legend:{type:"scroll",bottom:0,textStyle:{fontSize:11,color:"#6b7280"}},series:[{type:"pie",radius:["42%","66%"],center:["50%","44%"],avoidLabelOverlap:!0,itemStyle:{borderRadius:4,borderColor:"#fff",borderWidth:2},label:{show:!0,color:"#6b7280",fontSize:10,formatter:"{b}\\n{d}%"},labelLine:{length:14,length2:10,lineStyle:{width:1}},data:o.map(s=>({name:s.name,value:s.value,itemStyle:{color:s.color}})),animationDelay:F}]}),requestAnimationFrame(()=>e.resize()))}function C(){return{animation:!0,animationDuration:720,animationEasing:"cubicOut",animationDurationUpdate:360,animationEasingUpdate:"cubicOut"}}function H(t){return Math.min(t*22,260)}function F(t){return Math.min(t*70,360)}function P(t){return d!=null&&d.graphic?new d.graphic.LinearGradient(0,0,0,1,[{offset:0,color:z(t,.14)},{offset:1,color:z(t,.02)}]):t}function z(t,o){const e=t.replace("#",""),s=parseInt(e.slice(0,2),16),a=parseInt(e.slice(2,4),16),c=parseInt(e.slice(4,6),16);return`rgba(${s},${a},${c},${o})`}function V(t){const o=document.getElementById(t);if(!o||!d)return null;const e=d.init(o);return y.push(e),e}function B(){var t;for(;y.length;)(t=y.pop())==null||t.dispose()}function n(t,o){const e=document.getElementById(t);e&&(e.textContent=o)}return(t,o)=>(K(),J("div",{ref_key:"gmvRoot",ref:S,class:"ops-gmv-native",innerHTML:$.value},null,8,tt))}});export{it as default};
