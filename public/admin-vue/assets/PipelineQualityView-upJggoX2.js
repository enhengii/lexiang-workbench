import{G as l,j as v,k as r,v as c,l as n,c as k,o as h}from"./index-bs22lsbe.js";const u=`
<div class="page-header">
  <div>
    <div class="page-title">质量分析</div>
    <div class="page-desc">服务满意度 · 性能 · 对话质量 · 异常监控 · 用户评分</div>
  </div>
  <div class="filter-bar">
    <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
      <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">FROM</span>
      <input type="date" id="qDateFrom" onchange="qualityApplyFilter()">
    </div>
    <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
      <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">TO</span>
      <input type="date" id="qDateTo" onchange="qualityApplyFilter()">
    </div>
    <button class="btn btn-primary" onclick="qualityApplyFilter()">筛选</button>
    <button class="btn btn-secondary" onclick="qualityClearFilter()">清除</button>
    <button class="btn btn-secondary" onclick="qualityRefresh()">&#8635;</button>
  </div>
</div>

<!-- ====== 原生 ====== -->
<div class="ops-section-title">原生</div>
<div class="grid-4">
  <div class="ops-kpi highlight"><div class="ops-kpi-label">点踩率</div><div class="ops-kpi-val" id="qk-thumbdown-rate">--</div><div class="ops-kpi-sub">点踩case / 主动query</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">低满意率</div><div class="ops-kpi-val" id="qk-lowsat-rate">--</div><div class="ops-kpi-sub">低满意度case / 弹窗样本量</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">点踩case</div><div class="ops-kpi-val" id="qk-thumbdown-count">--</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">低满意度case</div><div class="ops-kpi-val" id="qk-lowsat-count">--</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card"><h3>乐享原生 Badcase 总数概况（堆积柱状图）</h3><div id="qChartSatisfactionTrend" style="height:280px"></div></div>
  <div class="ops-card"><h3>点踩率 + 低满意率</h3><div id="qChartRateTrend" style="height:280px"></div></div>
</div>

<!-- ====== 智能客服 ====== -->
<div class="ops-section-title">智能客服</div>
<div class="grid-4">
  <div class="ops-kpi highlight"><div class="ops-kpi-label">点踩率</div><div class="ops-kpi-val" id="qk-cs-thumbdown-rate">--</div><div class="ops-kpi-sub">点踩case / 智能客服总量</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">点踩case</div><div class="ops-kpi-val" id="qk-cs-thumbdown-count">--</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">智能客服总量</div><div class="ops-kpi-val" id="qk-cs-total">--</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">转人工率</div><div class="ops-kpi-val" id="qk-cs-transfer-rate">--</div><div class="ops-kpi-sub">转人工 / 智能客服</div></div>
</div>
<div class="ops-card" style="margin-top:12px"><h3>点踩 case 趋势</h3><div id="qChartCsThumbdownTrend" style="height:260px"></div></div>

<!-- ====== 性能 ====== -->
<div class="ops-section-title">性能</div>
<div class="grid-4">
  <div class="ops-kpi highlight"><div class="ops-kpi-label">首token avg</div><div class="ops-kpi-val" id="qk-first-token-avg">--</div><div class="ops-kpi-sub">T-1</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">首token p90</div><div class="ops-kpi-val" id="qk-first-token-p90">--</div><div class="ops-kpi-sub">T-1</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">首token p95</div><div class="ops-kpi-val" id="qk-first-token-p95">--</div><div class="ops-kpi-sub">T-1</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">首token p99</div><div class="ops-kpi-val" id="qk-first-token-p99">--</div><div class="ops-kpi-sub">T-1</div></div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card">
    <h3>分意图首token平均耗时</h3>
    <div style="display:flex;gap:4px;margin-bottom:8px;background:var(--bg);border-radius:6px;padding:2px;width:fit-content">
      <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06)" id="q-ft-tab-think" onclick="switchFirstTokenMode('think')">思考</span>
      <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="q-ft-tab-nothink" onclick="switchFirstTokenMode('nothink')">非思考</span>
    </div>
    <div id="qChartFirstTokenByIntent" style="height:300px"></div>
  </div>
  <div class="ops-card"><h3>问答类正文首token</h3><div id="qChartQaFirstToken" style="height:300px"></div></div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card"><h3>单次会话平均等待时长</h3><div id="qChartSessionWait" style="height:240px"></div></div>
  <div class="ops-card"><h3>首token性能趋势（avg/p90/p95/p99）</h3><div id="qChartFirstTokenTrend" style="height:300px"></div></div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card"><h3>首token(非缓存/非思考) 趋势</h3><div id="qChartFirstTokenNoCacheTrend" style="height:280px"></div></div>
  <div class="ops-card"><h3>单次回答平均等待时长</h3>
    <div style="display:flex;gap:4px;margin-bottom:8px;background:var(--bg);border-radius:6px;padding:2px;width:fit-content">
      <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06)" id="q-wait-tab-short" onclick="switchWaitLenMode('short')">&le;300字</span>
      <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="q-wait-tab-long" onclick="switchWaitLenMode('long')">&gt;300字</span>
    </div>
    <div id="qChartAnswerWaitTrend" style="height:260px"></div>
  </div>
</div>

<!-- ====== 对话质量 ====== -->
<div class="ops-section-title">对话质量</div>
<div class="grid-4">
  <div class="ops-kpi highlight"><div class="ops-kpi-label">平均对话轮数</div><div class="ops-kpi-val" id="qk-avg-turns">--</div><div class="ops-kpi-sub">轮</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">人均交互次数</div><div class="ops-kpi-val" id="qk-avg-interactions">--</div><div class="ops-kpi-sub">次</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">多轮对话占比</div><div class="ops-kpi-val" id="qk-multi-turn-pct">--</div><div class="ops-kpi-sub">&ge;2轮 / 总会话</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">单轮解决率</div><div class="ops-kpi-val" id="qk-single-turn-pct">--</div><div class="ops-kpi-sub">1轮 / 总会话</div></div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card"><h3>多轮对话深度分布</h3><div id="qChartTurnDepth" style="height:280px"></div></div>
  <div class="ops-card"><h3>人均交互次数趋势</h3><div id="qChartInteractionTrend" style="height:280px"></div></div>
</div>

<!-- ====== 异常 ====== -->
<div class="ops-section-title">异常</div>
<div class="grid-4">
  <div class="ops-kpi" style="border-color:var(--red)"><div class="ops-kpi-label">异常占比</div><div class="ops-kpi-val" style="color:var(--red)" id="qk-error-pct">--</div><div class="ops-kpi-sub">异常case / 总case</div></div>
  <div class="ops-kpi" style="border-color:var(--orange)"><div class="ops-kpi-label">MCP异常次数</div><div class="ops-kpi-val" style="color:var(--orange)" id="qk-mcp-error">--</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
  <div class="ops-kpi" style="border-color:var(--orange)"><div class="ops-kpi-label">用户中断率</div><div class="ops-kpi-val" style="color:var(--orange)" id="qk-interrupt-rate">--</div><div class="ops-kpi-sub">中断交互 / 总交互</div></div>
  <div class="ops-kpi" style="border-color:var(--red)"><div class="ops-kpi-label">回复空白率</div><div class="ops-kpi-val" style="color:var(--red)" id="qk-empty-resp-rate">--</div><div class="ops-kpi-sub">空response / 总response</div></div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card">
    <h3>各工具失败次数</h3>
    <div id="qToolFailureTable" style="max-height:400px;overflow-y:auto"></div>
  </div>
  <div class="ops-card">
    <h3>各场景工具失败次数</h3>
    <div id="qChartSceneFailure" style="height:300px"></div>
  </div>
</div>
<div class="grid-2" style="margin-top:12px">
  <div class="ops-card">
    <h3>Agent 异常次数统计</h3>
    <div id="qAgentErrorTable" style="max-height:400px;overflow-y:auto"></div>
  </div>
  <div class="ops-card">
    <h3>核心工具异常次数</h3>
    <div id="qCoreToolErrorTable" style="max-height:400px;overflow-y:auto"></div>
  </div>
</div>

<!-- ====== 用户评分 ====== -->
<div class="ops-section-title">用户评分</div>
<div class="grid-3">
  <div class="ops-kpi highlight"><div class="ops-kpi-label">OSAT</div><div class="ops-kpi-val" id="qk-osat">--</div><div class="ops-kpi-sub">满意度</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">NPS</div><div class="ops-kpi-val" id="qk-nps">--</div><div class="ops-kpi-sub">净推荐值</div></div>
  <div class="ops-kpi"><div class="ops-kpi-label">净评价值</div><div class="ops-kpi-val" id="qk-net-score">--</div><div class="ops-kpi-sub">(点赞-点踩)/(点赞+点踩)</div></div>
</div>
<div class="grid-3" style="margin-top:12px">
  <div class="ops-card"><h3>满意度 / OSAT 趋势</h3><div id="qChartOsatTrend" style="height:280px"></div></div>
  <div class="ops-card"><h3>NPS 趋势</h3><div id="qChartNpsTrend" style="height:280px"></div></div>
  <div class="ops-card"><h3>净评价值趋势</h3><div id="qChartNetScoreTrend" style="height:280px"></div></div>
</div>
`,y=l({__name:"PipelineQualityView",setup(b){const e=v();r(async()=>{var s;e.ensureStaticTab("pipeline.quality"),e.setActiveStaticTab("pipeline.quality"),document.title="联想门户工作台",await c(),await p(),await o(),(s=window.qualityRefresh)==null||s.call(window)}),n(()=>{document.querySelectorAll(".pipeline-quality-native [_echarts_instance_]").forEach(s=>{var d,a,i;try{const t=(a=(d=window.echarts)==null?void 0:d.getInstanceByDom)==null?void 0:a.call(d,s);(i=t==null?void 0:t.dispose)==null||i.call(t)}catch{}})});function p(){return window.echarts?Promise.resolve():new Promise((s,d)=>{const a=document.querySelector('script[data-echarts-runtime="true"]');if(a){a.addEventListener("load",()=>s(),{once:!0});return}const i=document.createElement("script");i.src="/admin-vue/assets/echarts.min.js",i.dataset.echartsRuntime="true",i.onload=()=>s(),i.onerror=()=>d(new Error("Failed to load ECharts")),document.head.appendChild(i)})}async function o(){typeof window.qualityRefresh!="function"&&await new Promise((s,d)=>{const a=document.querySelector('script[data-quality-runtime="true"]');if(a){a.addEventListener("load",()=>s(),{once:!0}),typeof window.qualityRefresh=="function"&&s();return}const i=document.createElement("script");i.src="/admin-vue/admin-runtime/workbench-quality.js",i.dataset.qualityRuntime="true",i.onload=()=>s(),i.onerror=()=>d(new Error("Failed to load quality runtime")),document.body.appendChild(i)})}return(s,d)=>(h(),k("div",{class:"pipeline-quality-native",innerHTML:u}))}});export{y as default};
