import{G as ie,j as oe,f as b,k as se,_ as ne,v as q,l as le,c as re,o as de}from"./index-loCdx6bW.js";import{u as ce}from"./ai-B8kmDPzJ.js";import{r as g,O as d,a as pe,b as ue,c as L,s as M,f as c,d as r,e as ve}from"./opsData-kyn-tTzR.js";const me=["innerHTML"],ye=ie({__name:"OpsTrafficView",setup(fe){const R=oe(),D=ce();let p=null;const T={pv:{label:"PV",field:"pv"},uv:{label:"UV",field:"uv"},login:{label:"登录",field:"login"},inter:{label:"互动",field:"inter"}},U=[{name:"百度搜索",weight:22},{name:"微信生态",weight:18},{name:"抖音",weight:14},{name:"小红书",weight:11},{name:"今日头条",weight:9},{name:"B站",weight:8},{name:"知乎",weight:6},{name:"微博",weight:5},{name:"腾讯广告",weight:4},{name:"自然外链",weight:3}],G=["APP端","PC端","WAP端","微信小程序","联想小程序","服务号","活动页","其他"],N=[r.slate,r.blue,r.purple,r.greenSoft,r.amber,r.green,r.blueSoft,r.neutral],v=b("30d"),l=b("uv"),m=b(g(d[0].d)),f=b(g(d[d.length-1].d)),B=b(H()),_=b(null),k=[];let y=null;se(async()=>{R.ensureStaticTab("ops.traffic"),R.setActiveStaticTab("ops.traffic"),document.title="联想门户工作台",Q(),p=await ne(()=>import("./index-BzBQJFYZ.js"),[]),await q(),V(),_.value&&typeof ResizeObserver<"u"&&(y=new ResizeObserver(()=>requestAnimationFrame(()=>k.forEach(e=>e.resize()))),y.observe(_.value))}),le(()=>{y==null||y.disconnect(),j(),delete window.opsAskTraffic,delete window.opsCustomTimeChanged,delete window.opsSetTrafficMetric,delete window.opsTimeChanged});function H(){return`
    <div class="page-header">
      <div><div class="page-title">流量分析</div><div class="page-desc">核心活跃趋势 · 监测入口 · 分端口 · 分业务 · 默认近30天 · 口径同日报</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        ${J()}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="opsAskTraffic('overview')">AI 解读</button>
      </div>
    </div>
    <div class="ops-section-title">核心流量指标</div>
    <div class="grid-4">
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-dau">-</div><div class="ops-kpi-label">DAU（日活）</div><div class="ops-kpi-sub">日均登录 <span id="ops-t-dau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-mau">-</div><div class="ops-kpi-label">MAU（月活）</div><div class="ops-kpi-sub">月登录均值 <span id="ops-t-mau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-login">-</div><div class="ops-kpi-label">登录用户</div><div class="ops-kpi-sub" id="ops-t-login-sub">选期排重</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-inter">-</div><div class="ops-kpi-label">互动用户</div><div class="ops-kpi-sub" id="ops-t-inter-sub">选期排重</div></div>
    </div>

    <div class="ops-section-title">DAU / MAU 趋势</div>
    <div class="ops-card"><div class="chart-wrap"><div id="ops-t-user-trend" class="ops-chart"></div></div></div>

    <div class="ops-section-title">监测媒体流量</div>
    <div class="grid-2 ops-media-flow-grid">
      <div class="ops-card ops-media-table-card">
        <div class="ops-card-head">
          <h3>TOP10 媒体排行</h3>
          <div class="dash-filter-bar">${K()}</div>
        </div>
        <table class="data-table">
          <thead><tr><th style="text-align:left">媒体</th><th>PV</th><th>UV</th><th>登录</th><th>互动</th><th>占比</th></tr></thead>
          <tbody id="ops-t-media-table"></tbody>
        </table>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">按选中指标在统计周期内降序排行 · PV 按 UV 比例估算 · 媒体来源待接入日报「流量来源监测」字段，当前按固定权重估算</div>
      </div>
      <div class="ops-card ops-media-chart-card">
        <h3>媒体流量占比分布</h3>
        <div class="chart-wrap ops-media-chart-wrap"><div id="ops-t-media-chart" class="ops-chart"></div></div>
      </div>
    </div>

    <div class="ops-section-title">分端口流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>端口占比</h3><div class="chart-wrap-sm"><div id="ops-t-port-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>分端口趋势</h3><div class="chart-wrap"><div id="ops-t-port-trend" class="ops-chart"></div></div></div>
    </div>

    <div class="ops-section-title">分业务流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务占比</h3><div class="chart-wrap-sm"><div id="ops-t-biz-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>分业务趋势</h3><div class="chart-wrap"><div id="ops-t-biz-trend" class="ops-chart"></div></div></div>
    </div>
  `}function J(){const e=v.value==="custom"?`<span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${g(d[0].d)}" max="${g(d[d.length-1].d)}" value="${m.value}" onchange="opsCustomTimeChanged('traffic-time','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${g(d[0].d)}" max="${g(d[d.length-1].d)}" value="${f.value}" onchange="opsCustomTimeChanged('traffic-time','end',this.value)">
    </span>`:"";return`<div class="ops-time-filter" id="traffic-time">
    <div class="dash-filter-bar">
      ${["1d","7d","14d","30d","custom"].map(a=>`<button class="dash-pill ${v.value===a?"active":""}" onclick="opsTimeChanged('traffic-time','${a}')">${pe(a)}</button>`).join("")}
    </div>
    ${e}
    <span class="ops-date-range" id="traffic-time-range"></span>
  </div>`}function K(){return Object.keys(T).map(e=>`<button class="dash-pill ${l.value===e?"active":""}" onclick="opsSetTrafficMetric('${e}')">${T[e].label}</button>`).join("")}function Q(){window.opsTimeChanged=async(e,a)=>{v.value=a,a==="custom"&&(m.value||(m.value=g(d[0].d)),f.value||(f.value=g(d[d.length-1].d))),await C()},window.opsCustomTimeChanged=async(e,a,t)=>{v.value="custom",a==="start"&&(m.value=t),a==="end"&&(f.value=t),m.value>f.value&&(a==="start"?f.value=m.value:m.value=f.value),await C()},window.opsSetTrafficMetric=async e=>{l.value=e,await C()},window.opsAskTraffic=()=>{D.toggleOpen(!0),D.quickSend("基于当前流量分析看板，分析流量趋势、入口结构、媒体贡献、异常波动和下一步动作。","ops.traffic")}}async function C(){B.value=H(),await q(),V()}function V(){j();const e=ue(d,v.value,m.value,f.value),a=e.map(i=>i.d),t={dau:L(e,"dau"),mau:L(e,"mau"),login:M(e,"login"),inter:M(e,"inter"),loginAvg:L(e,"login"),loginM:L(e,"loginM")},s=Math.round(t.login*(v.value==="1d"?1:.72)),n=Math.round(t.inter*(v.value==="1d"?1:.78));h("ops-t-dau",c(t.dau)),h("ops-t-mau",c(t.mau)),h("ops-t-dau-login",c(t.loginAvg)),h("ops-t-mau-login",c(t.loginM)),h("ops-t-login",c(s)),h("ops-t-inter",c(n)),h("ops-t-login-sub",`选期排重${v.value==="1d"?"":"·估算"} · 累计 ${c(t.login)}`),h("ops-t-inter-sub",`选期排重${v.value==="1d"?"":"·估算"} · 累计 ${c(t.inter)}`),z("ops-t-user-trend",a,[{name:"DAU",data:e.map(i=>i.dau),color:r.blue,fill:!0},{name:"登录",data:e.map(i=>i.login),color:r.green},{name:"MAU",data:e.map(i=>i.mau),color:r.purple,yAxisIndex:1}],!0);const o=X(e),u=o.reduce((i,$)=>i+$.value,0),w=document.getElementById("ops-t-media-table");w&&(w.innerHTML=o.slice(0,10).map(i=>`<tr>
      <td style="text-align:left;font-weight:500">${i.name}</td>
      <td class="${l.value==="pv"?"ops-primary-cell":""}">${c(i.pv)}</td>
      <td class="${l.value==="uv"?"ops-primary-cell":""}">${c(i.uv)}</td>
      <td class="${l.value==="login"?"ops-primary-cell":""}">${c(i.login)}</td>
      <td class="${l.value==="inter"?"ops-primary-cell":""}">${c(i.inter)}</td>
      <td>${ve(i.value,u)}</td>
    </tr>`).join("")),Z("ops-t-media-chart",o.slice(0,10).map(i=>i.name),[{name:`${T[l.value].label}占比%`,data:o.slice(0,10).map(i=>u?Number((i.value/u*100).toFixed(1)):0),color:r.blue}],!0);const x=Y(e);E("ops-t-port-chart",x.slice(0,8).map(i=>({name:i.name,value:i.value,color:i.color}))),z("ops-t-port-trend",a,x.slice(0,5).map((i,$)=>({name:`${i.name}${T[l.value].label}`,data:e.map(A=>Math.round(W(A)*i.weights[$%i.weights.length])),color:i.color})));const S=[{name:"消费",value:Math.round((l.value==="inter"?t.inter:t.login)*.58),color:r.blue},{name:"SMB",value:Math.round((l.value==="inter"?t.inter:t.login)*.28),color:r.amber},{name:"政企",value:Math.round((l.value==="inter"?t.inter:t.login)*.14),color:r.purple}];E("ops-t-biz-chart",S),z("ops-t-biz-trend",a,S.map((i,$)=>({name:`${i.name}${l.value==="inter"?"互动":"登录"}`,data:e.map(A=>Math.round((l.value==="inter"?A.inter:A.login)*[.58,.28,.14][$])),color:i.color})))}function W(e){return l.value==="pv"?Math.round(e.dau*1.46):l.value==="uv"?e.dau:e[l.value]}function X(e){const a=Math.round(M(e,"dau")*1.22),t=M(e,"login"),s=M(e,"inter"),n=U.reduce((o,u)=>o+u.weight,0);return U.map(o=>{const u=Math.round(a*o.weight/n),w=Math.round(t*o.weight/n),x=Math.round(s*o.weight/n),S=Math.round(u*1.46);return{...o,pv:S,uv:u,login:w,inter:x,value:{pv:S,uv:u,login:w,inter:x}[l.value]}}).sort((o,u)=>u.value-o.value)}function Y(e){const a=e.reduce((s,n)=>s+W(n),0),t=[.34,.22,.16,.12,.07,.04,.03,.02];return G.map((s,n)=>({name:s,value:Math.round(a*t[n]),color:N[n],weights:t}))}function z(e,a,t,s=!1){const n=I(e);n&&(n.setOption({...O(),color:t.map(o=>o.color),tooltip:{trigger:"axis"},legend:{top:0,textStyle:{fontSize:11,color:"#6b7280"}},grid:{left:46,right:s?46:18,top:36,bottom:28,containLabel:!0},xAxis:{type:"category",data:a,axisLabel:{fontSize:10,color:"#6b7280"},axisTick:{alignWithLabel:!0}},yAxis:s?[{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{show:!1}}]:{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},series:t.map(o=>({name:o.name,type:"line",smooth:!0,data:o.data,yAxisIndex:o.yAxisIndex||0,areaStyle:o.fill?{color:te(o.color)}:void 0,lineStyle:{color:o.color,width:2},itemStyle:{color:o.color,borderColor:"#fff",borderWidth:1.5},symbol:"circle",symbolSize:5,animationDelay:F}))}),requestAnimationFrame(()=>n.resize()))}function Z(e,a,t,s=!1){const n=I(e);n&&(n.setOption({...O(),color:t.map(o=>o.color),tooltip:{trigger:"axis"},legend:{top:0,textStyle:{fontSize:11,color:"#6b7280"}},grid:{left:s?92:46,right:18,top:36,bottom:28,containLabel:!0},xAxis:s?{type:"value",axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}}:{type:"category",data:a,axisLabel:{fontSize:10,color:"#6b7280"},axisTick:{alignWithLabel:!0}},yAxis:s?{type:"category",data:a,axisLabel:{fontSize:10,color:"#6b7280"}}:{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},series:t.map(o=>({name:o.name,type:"bar",data:o.data,itemStyle:{color:ae(o.color),borderRadius:s?[0,3,3,0]:[3,3,0,0]},barMaxWidth:s?18:26,animationDelay:F}))}),requestAnimationFrame(()=>n.resize()))}function E(e,a){const t=I(e);t&&(t.setOption({...O(),color:a.map(s=>s.color),tooltip:{trigger:"item"},legend:{type:"scroll",bottom:0,textStyle:{fontSize:11,color:"#6b7280"}},series:[{type:"pie",radius:["42%","66%"],center:["50%","44%"],avoidLabelOverlap:!0,itemStyle:{borderRadius:4,borderColor:"#fff",borderWidth:2},label:{show:!0,color:"#6b7280",fontSize:10,formatter:"{b}\\n{d}%"},labelLine:{length:14,length2:10,lineStyle:{width:1}},data:a.map(s=>({name:s.name,value:s.value,itemStyle:{color:s.color}})),animationDelay:ee}]}),requestAnimationFrame(()=>t.resize()))}function O(){return{animation:!0,animationDuration:720,animationEasing:"cubicOut",animationDurationUpdate:360,animationEasingUpdate:"cubicOut"}}function F(e){return Math.min(e*22,260)}function ee(e){return Math.min(e*70,360)}function te(e){return p!=null&&p.graphic?new p.graphic.LinearGradient(0,0,0,1,[{offset:0,color:P(e,.14)},{offset:1,color:P(e,.02)}]):e}function ae(e){return p!=null&&p.graphic?new p.graphic.LinearGradient(0,0,1,0,[{offset:0,color:P(e,.72)},{offset:1,color:e}]):e}function P(e,a){const t=e.replace("#",""),s=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),o=parseInt(t.slice(4,6),16);return`rgba(${s},${n},${o},${a})`}function I(e){const a=document.getElementById(e);if(!a||!p)return null;const t=p.init(a);return k.push(t),t}function j(){var e;for(;k.length;)(e=k.pop())==null||e.dispose()}function h(e,a){const t=document.getElementById(e);t&&(t.textContent=a)}return(e,a)=>(de(),re("div",{ref_key:"trafficRoot",ref:_,class:"ops-traffic-native",innerHTML:B.value},null,8,me))}});export{ye as default};
