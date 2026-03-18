import { useState, useRef, useEffect, useMemo, memo } from "react";

const CB="#049fd9",CBD="#005073",CBL="#e6f6fc",CW="#fff",CG0="#f5f5f5",CG3="#e8e8e8",CG4="#9e9e9e",CG5="#58585a",CG6="#1b1b1b";
const CGRN="#007a33",CGRNL="#e8f5ed",CRED="#c0392b",CREDL="#fdf0ee",CAMB="#b45309",CAMBL="#fef3e2",CPURP="#534AB7",CPURPL="#EEEDFE";
const AS_OF="2025-07-14T06:30:00Z";
const fmtDt=d=>new Date(d).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});
const fmt=(n,d=1)=>n>=0?"+"+n.toFixed(d):n.toFixed(d);
const pctC=n=>n>0?CGRN:CRED;
const uid=()=>Math.random().toString(36).slice(2,9);
const now=()=>new Date().toISOString();

const ROLES={
  cfo:    {id:"cfo",    label:"CFO",           color:CBD,  ini:"CF",canApprove:true, canDrillAll:true, seesAI:true, canLock:true,  isSOX:false,soxAccess:"full",    soxNote:"Full approval authority. Can sign off dual-approval items and certify the compliance package."},
  fpa:    {id:"fpa",   label:"FP&A Analyst",   color:CB,   ini:"FA",canApprove:false,canDrillAll:true, seesAI:true, canLock:false, isSOX:false,soxAccess:"prepare", soxNote:"Can prepare and submit items for review but cannot approve. Sees full audit log."},
  bu:     {id:"bu",    label:"BU Controller",  color:CGRN, ini:"BC",canApprove:false,canDrillAll:false,seesAI:true, canLock:false, isSOX:false,soxAccess:"limited", soxNote:"Can view and give 1st approval on Americas items only."},
  auditor:{id:"auditor",label:"Auditor",        color:CAMB, ini:"AU",canApprove:false,canDrillAll:true, seesAI:false,canLock:false, isSOX:false,soxAccess:"readonly",soxNote:"Read-only access to full audit log and compliance package."},
  sox:    {id:"sox",   label:"SOX Compliance", color:CPURP,ini:"SC",canApprove:true, canDrillAll:true, seesAI:true, canLock:false, isSOX:true, soxAccess:"full",    soxNote:"Full SOX authority. Can approve any item and export compliance packages."},
};
const ROLE_REGIONS={cfo:"All",fpa:"All",bu:"Americas",auditor:"All",sox:"All"};
const DIMS=["Americas","EMEA","APAC","Splunk","Enterprise","SMB"];
const GLS=["6000-OpEx","6100-COGS","6200-R&D","6300-S&M","6400-G&A","6500-D&A"];
const ENTS=["Cisco Systems Inc.","Cisco Splunk LLC","Cisco Meraki Inc.","Cisco AppDynamics"];
const OWNERS=["Sarah Chen (EMEA Controller)","James Park (Americas Controller)","Priya Nair (Splunk Finance)","David Liu (FP&A Lead)","Maria Santos (APAC Controller)"];
const FX={USD:1,EUR:0.92,GBP:0.79,JPY:149.5,SGD:1.34,AUD:1.53};
const RCCY={Americas:"USD",EMEA:"EUR",APAC:"SGD",Splunk:"USD",Enterprise:"USD",SMB:"USD"};

const MAT=[
  {id:"r1",gl:"6200-R&D", entity:"All",             thr:5, pri:1},
  {id:"r2",gl:"6100-COGS",entity:"All",             thr:4, pri:1},
  {id:"r3",gl:"All",      entity:"Cisco Splunk LLC",thr:8, pri:2},
  {id:"r4",gl:"6300-S&M", entity:"All",             thr:10,pri:3},
  {id:"r5",gl:"6400-G&A", entity:"All",             thr:12,pri:3},
  {id:"r6",gl:"All",      entity:"All",             thr:10,pri:4},
];
function getThr(gl,entity){return [...MAT].sort((a,b)=>a.pri-b.pri).find(r=>(r.gl===gl||r.gl==="All")&&(r.entity===entity||r.entity==="All"))||MAT[5];}

const WISDOM=[
  {id:"w1",sev:"high",  cat:"Forecast Risk",region:"EMEA",   txt:"EMEA S&M spend trajectory suggests Q3 target miss probability of 68%.",conf:84},
  {id:"w2",sev:"high",  cat:"Anomaly",      region:"Splunk",  txt:"Splunk R&D headcount vs. spend ratio diverged 22% from norm in May.",conf:91},
  {id:"w3",sev:"medium",cat:"Benchmark",    region:"Americas",txt:"Americas COGS margin 2.1pp below SaaS peer median.",conf:77},
];
const DW={hc:{Americas:8420,EMEA:4120,APAC:3280,Splunk:2100},rhc:{Americas:498,EMEA:412,APAC:381,Splunk:620},pip:{Americas:3.2,EMEA:2.8,APAC:3.5,Splunk:4.1},asOf:"2025-07-13T23:00:00Z"};

const CQP=[
  {gl:"6300-S&M",region:"EMEA",   quarters:["Q1 FY2024","Q2 FY2024","Q1 FY2025","Q2 FY2025"],count:4,avgPct:12.3,recommendation:"Seasonal — Q1/Q2 S&M inflation is structural. Recommend adjusting materiality threshold to 14% for this combination.",reclassify:true},
  {gl:"6200-R&D",region:"Splunk",  quarters:["Q1 FY2025","Q2 FY2025"],count:2,avgPct:18.1,recommendation:"Emerging pattern — Splunk R&D integration costs recurring. Recommend dedicated variance explanation template.",reclassify:false},
  {gl:"6400-G&A",region:"Americas",quarters:["Q4 FY2024","Q1 FY2025","Q2 FY2025"],count:3,avgPct:7.2,recommendation:"Possible structural shift in G&A cost base post-Splunk acquisition. Flag for CFO review.",reclassify:false},
];

const PRIOR_RES=[
  {gl:"6300-S&M",region:"EMEA",  quarter:"Q1 FY2025",explanation:"EMEA S&M variance attributable to Q1 annual marketing campaign acceleration and merit cycle timing.",action:"No corrective action required — planned spend pattern."},
  {gl:"6200-R&D",region:"Splunk",quarter:"Q1 FY2025",explanation:"Splunk R&D integration headcount onboarding ahead of schedule.",action:"Monitor through Q3 — escalate if run-rate exceeds $15M."},
  {gl:"6100-COGS",region:"Americas",quarter:"Q2 FY2024",explanation:"Americas COGS variance driven by supply chain cost normalization.",action:"Review supplier contracts in Q3 planning cycle."},
];

const PNL_DEF=[
  {name:"Revenue",          type:"revenue", budget:4200,q1:4010},
  {name:"Cost of Revenue",  type:"cost",    budget:1350,q1:1310},
  {name:"Gross Profit",     type:"subtotal",budget:2850,q1:2700},
  {name:"R&D",              type:"opex",    budget:760, q1:745},
  {name:"Sales & Marketing",type:"opex",    budget:980, q1:942},
  {name:"G&A",              type:"opex",    budget:280, q1:271},
  {name:"Operating Income", type:"subtotal",budget:830, q1:742},
  {name:"Net Income",       type:"subtotal",budget:806, q1:723},
];

function seedPnl(){
  return PNL_DEF.map(a=>{
    const v=Math.random()*0.18-0.06;
    const act=parseFloat((a.budget*(1+v)).toFixed(1));
    const tot=parseFloat((act-a.budget).toFixed(1));
    const vol=parseFloat((tot*(0.4+Math.random()*0.2)).toFixed(1));
    const rat=parseFloat((tot*(0.25+Math.random()*0.15)).toFixed(1));
    const fxv=parseFloat((tot*(Math.random()*0.12-0.04)).toFixed(1));
    const mix=parseFloat((tot-vol-rat-fxv).toFixed(1));
    const conf=Math.round(60+Math.random()*35);
    return {
      ...a,actual:act,budgetVar:tot,
      budgetPct:parseFloat((tot/Math.abs(a.budget)*100).toFixed(1)),
      qoqPct:parseFloat(((act-a.q1)/Math.abs(a.q1)*100).toFixed(1)),
      volVar:vol,rateVar:rat,fxVar:fxv,mixVar:mix,
      anomaly:Math.abs(v)>0.12,
      needsClarification:Math.abs(v)>0.12&&Math.random()>0.4,
      confidence:conf,
      narConf:conf>80?"high":conf>65?"medium":"low",
    };
  });
}

function buildFlux(){
  return DIMS.flatMap(region=>GLS.flatMap(gl=>ENTS.slice(0,2).map(entity=>{
    const budget=parseFloat((Math.random()*200+50).toFixed(1));
    const actual=parseFloat((budget*(1+(Math.random()*0.35-0.14))).toFixed(1));
    const variance=parseFloat((actual-budget).toFixed(1));
    const pct=parseFloat(((variance/budget)*100).toFixed(1));
    const q1=parseFloat((budget*(1+(Math.random()*0.1-0.05))).toFixed(1));
    const qoq=parseFloat(((actual-q1)/Math.abs(q1)*100).toFixed(1));
    const rule=getThr(gl,entity);
    const vol=parseFloat((variance*(0.4+Math.random()*0.2)).toFixed(1));
    const rat=parseFloat((variance*(0.25+Math.random()*0.15)).toFixed(1));
    const fxv=parseFloat((variance*(Math.random()*0.12-0.04)).toFixed(1));
    const mix=parseFloat((variance-vol-rat-fxv).toFixed(1));
    const ccy=RCCY[region]||"USD";
    const pattern=CQP.find(p=>p.gl===gl&&p.region===region);
    return {
      region,gl,entity,budget,actual,variance,pct,q1,qoq,
      volVar:vol,rateVar:rat,fxVar:fxv,mixVar:mix,
      material:Math.abs(pct)>rule.thr,
      anomaly:Math.abs(pct)>rule.thr*1.8,
      needsClarification:Math.abs(pct)>rule.thr*1.8&&Math.random()>0.5,
      rule,ccy,fxRate:FX[ccy]||1,
      actualLocal:parseFloat((actual*(FX[ccy]||1)).toFixed(1)),
      budgetLocal:parseFloat((budget*(FX[ccy]||1)).toFixed(1)),
      assignedTo:OWNERS[Math.floor(Math.random()*OWNERS.length)],
      commentStatus:["pending","submitted","approved"][Math.floor(Math.random()*3)],
      comment:"",crossQuarterPattern:pattern||null,isSeasonal:pattern?.reclassify||false,
    };
  }))).sort((a,b)=>Math.abs(b.variance)-Math.abs(a.variance));
}

const PNL=seedPnl();
const FLUX=buildFlux();

function computeCloseRisk(steps,pending){
  const done=steps.filter(s=>s.status==="complete").length;
  const pr=done/steps.length;
  const raw=Math.min(0.92,(pending>5?0.3:pending>2?0.15:0)+(pr<0.5?0.35:pr<0.75?0.15:0)+0.08);
  return {pct:Math.round(raw*100),level:raw>0.6?"high":raw>0.35?"medium":"low"};
}


// ── Primitives ─────────────────────────────────────────────────────────────────
function Pill({val}){
  const p=val>=0;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:p?CGRNL:CREDL,color:p?CGRN:CRED}}>{p?"▲":"▼"} {Math.abs(val).toFixed(1)}%</span>;
}
function Tag({txt,color,bg}){
  return <span style={{fontSize:10,fontWeight:700,background:bg||CBL,color:color||CB,padding:"2px 7px",borderRadius:3,letterSpacing:"0.02em",whiteSpace:"nowrap"}}>{txt}</span>;
}
function Dot({sev}){
  const c={high:CRED,medium:CAMB,low:CGRN}[sev]||CG4;
  return <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:c,flexShrink:0,marginTop:3}}/>;
}
function ConfBadge({level}){
  const c={high:CGRN,medium:CAMB,low:CRED}[level]||CG4;
  return <span style={{fontSize:10,fontWeight:600,color:c,background:c+"22",padding:"2px 7px",borderRadius:3}}>Conf: {level}</span>;
}
function DecompBar({vol,rate,fx,mix,total}){
  if(!total||Math.abs(total)<0.1) return <span style={{fontSize:10,color:CG4}}>—</span>;
  const bars=[{v:vol||0,c:CGRN,l:"V"},{v:rate||0,c:CB,l:"R"},{v:fx||0,c:CAMB,l:"FX"},{v:mix||0,c:CG4,l:"M"}];
  return <div style={{display:"flex",gap:1,alignItems:"flex-end",width:90}}>
    {bars.map(({v,c,l})=>{const w=Math.round(Math.abs(v)/Math.abs(total)*100);return w>4?<div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",width:w+"%"}}><div style={{width:"100%",height:7,background:c,borderRadius:1}}/><div style={{fontSize:8,color:c,marginTop:1,fontWeight:700}}>{l}</div></div>:null;})}
  </div>;
}

const S={
  app:{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:CG0,minHeight:"100vh",color:CG6,display:"flex",flexDirection:"column"},
  hdr:{background:CBD,padding:"0 20px",display:"flex",alignItems:"center",gap:10,height:50,flexShrink:0},
  nav:{background:CW,borderBottom:"1px solid "+CG3,padding:"0 20px",display:"flex",flexShrink:0,overflowX:"auto"},
  nb:function(a){return {padding:"10px 13px",fontSize:12,fontWeight:500,border:"none",background:"none",color:a?CBD:CG5,cursor:"pointer",borderBottom:a?"2px solid "+CB:"2px solid transparent",whiteSpace:"nowrap"};},
  main:{flex:1,padding:"14px 20px",maxWidth:1380,margin:"0 auto",width:"100%",boxSizing:"border-box"},
  card:{background:CW,border:"1px solid "+CG3,borderRadius:6,padding:"12px 16px",marginBottom:10},
  ct:{fontSize:11,fontWeight:700,color:CG4,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,display:"block"},
  tbl:{width:"100%",borderCollapse:"collapse",fontSize:12},
  th:{padding:"6px 8px",textAlign:"left",fontSize:10,fontWeight:700,color:CG4,textTransform:"uppercase",letterSpacing:"0.04em",borderBottom:"2px solid "+CG3,background:CG0,whiteSpace:"nowrap"},
  td:{padding:"6px 8px",borderBottom:"1px solid "+CG3,color:CG5,verticalAlign:"middle"},
  btn:function(v){return {padding:"6px 14px",borderRadius:4,fontSize:12,fontWeight:500,cursor:"pointer",border:"none",background:v==="pri"?CB:v==="grn"?CGRNL:v==="red"?CREDL:v==="ghost"?"transparent":CG0,color:v==="pri"?CW:v==="grn"?CGRN:v==="red"?CRED:CG5};},
  inp:{background:CW,border:"1px solid "+CG3,borderRadius:4,padding:"6px 9px",color:CG6,fontSize:12,width:"100%",outline:"none",boxSizing:"border-box"},
  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:40},
  mod:{background:CW,border:"1px solid "+CG3,borderRadius:6,width:"100%",maxWidth:860,maxHeight:"84vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"},
  stub:{background:CBL,border:"1px dashed "+CB,borderRadius:4,padding:"7px 12px",fontSize:11,color:CBD,display:"flex",alignItems:"center",gap:8,marginBottom:8},
  aiBanner:{background:"#faf9ff",border:"1px solid #d4c8f8",borderRadius:6,padding:"12px 14px",marginBottom:10},
};

function Mod({title,onClose,children,w}){
  return <div style={S.ov} onClick={function(e){if(e.target===e.currentTarget)onClose();}}>
    <div style={{...S.mod,maxWidth:w||860}}>
      <div style={{padding:"12px 18px",borderBottom:"1px solid "+CG3,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:CG0,borderRadius:"6px 6px 0 0"}}>
        <span style={{fontSize:13,fontWeight:600,color:CG6}}>{title}</span>
        <button onClick={onClose} style={{...S.btn("ghost"),padding:"2px 8px",fontSize:18,color:CG4,lineHeight:1}}>×</button>
      </div>
      <div style={{padding:18,overflowY:"auto",flex:1}}>{children}</div>
    </div>
  </div>;
}

function AsOf({locked,period}){
  return <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",background:locked?"#fff8f0":CW,border:"1px solid "+(locked?CAMB:CG3),borderRadius:6,padding:"7px 14px",marginBottom:10,fontSize:11}}>
    <span style={{fontWeight:700,color:CG4,textTransform:"uppercase",fontSize:10,letterSpacing:"0.05em"}}>Data as-of</span>
    <span style={{color:CGRN,fontWeight:600}}>● {fmtDt(AS_OF)}</span>
    <span style={{color:CG3}}>|</span>
    <span style={{color:CG4}}>SAP: <strong style={{color:CG6}}>Jul 14, 06:15 PST</strong></span>
    <span style={{color:CG4}}>Oracle GL: <strong style={{color:CG6}}>Jul 14, 05:58 PST</strong></span>
    {period&&<span style={{color:CG4,marginLeft:"auto"}}>Period: <strong style={{color:CBD}}>{period}</strong></span>}
    {locked&&<Tag txt="Period locked" color={CAMB} bg={CAMBL}/>}
  </div>;
}

function DWCard({reg}){
  const r=reg==="All"?"Americas":reg;
  const [open,setOpen]=useState(false);
  return <div style={{...S.card,borderLeft:"3px solid "+CB,padding:"9px 13px 9px 14px",marginBottom:10}}>
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){setOpen(function(o){return !o;});}}>
      <span style={{...S.ct,marginBottom:0}}>Cisco DW — Operational Context</span>
      <span style={{fontSize:11,color:CG4}}>Region: <strong style={{color:CBD}}>{r}</strong></span>
      <span style={{fontSize:11,color:CG4,marginLeft:"auto"}}>{fmtDt(DW.asOf)}</span>
      <span style={{fontSize:12,color:CB,marginLeft:6}}>{open?"▲":"▼"}</span>
    </div>
    {open&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>
      {[{l:"Headcount",v:(DW.hc[r]||0).toLocaleString()},{l:"Revenue/HC",v:"$"+(DW.rhc[r]||0)+"K"},{l:"Pipeline",v:(DW.pip[r]||0)+"×"}].map(function(m){return (
        <div key={m.l} style={{background:CG0,border:"1px solid "+CG3,borderRadius:4,padding:"8px 10px"}}>
          <div style={{fontSize:16,fontWeight:700,color:CBD}}>{m.v}</div>
          <div style={{fontSize:11,color:CG5}}>{m.l}</div>
        </div>
      );})}
    </div>}
  </div>;
}

function WisdomCard({reg,role}){
  if(!role.seesAI) return null;
  const items=WISDOM.filter(function(w){return reg==="All"||w.region===reg||w.region==="All";});
  if(!items.length) return null;
  const [open,setOpen]=useState(false);
  const sC={high:CRED,medium:CAMB,low:CGRN};
  const sB={high:CREDL,medium:CAMBL,low:CGRNL};
  const hi=items.filter(function(w){return w.sev==="high";}).length;
  const med=items.filter(function(w){return w.sev==="medium";}).length;
  const lo=items.length-hi-med;
  return <div style={{...S.card,borderLeft:"3px solid "+CAMB,padding:"9px 13px 9px 14px",marginBottom:10}}>
    <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={function(){setOpen(function(o){return !o;});}}>
      <span style={{...S.ct,marginBottom:0}}>Wisdom AI Signals</span>
      {hi>0&&<Tag txt={hi+" high"} color={CRED} bg={CREDL}/>}
      {med>0&&<Tag txt={med+" med"} color={CAMB} bg={CAMBL}/>}
      {lo>0&&<Tag txt={lo+" low"} color={CGRN} bg={CGRNL}/>}
      <span style={{fontSize:11,color:CG4,marginLeft:"auto"}}>Jul 14 04:00</span>
      <span style={{fontSize:12,color:CAMB,marginLeft:6}}>{open?"▲":"▼"}</span>
    </div>
    {open&&<div style={{display:"flex",flexDirection:"column",gap:5,marginTop:10}}>
      {items.map(function(w){return (
        <div key={w.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 9px",background:sB[w.sev],borderRadius:4}}>
          <Dot sev={w.sev}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:2}}>
              <span style={{fontSize:10,fontWeight:700,color:sC[w.sev],textTransform:"uppercase"}}>{w.cat}</span>
              <span style={{fontSize:10,color:CG4}}>· {w.region}</span>
              <span style={{fontSize:10,color:CGRN,marginLeft:"auto"}}>{w.conf}%</span>
            </div>
            <div style={{fontSize:11,color:CG5,lineHeight:1.5}}>{w.txt}</div>
          </div>
        </div>
      );})}
    </div>}
  </div>;
}

function RoleSwitcher({role,setRole}){
  return <div style={{display:"flex",gap:3}}>
    {Object.values(ROLES).map(function(r){return (
      <button key={r.id} onClick={function(){setRole(r);}} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:3,fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:role.id===r.id?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.08)",color:CW,opacity:role.id===r.id?1:0.65}}>
        <span style={{width:19,height:19,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{r.ini}</span>
        {r.label}
      </button>
    );})}
  </div>;
}

function AIPanel({items,role,approvedAnomalies,onApprove}){
  const [dismissed,setDismissed]=useState([]);
  const initExpanded=useMemo(function(){return items.map(function(i){return i.id;});},[]);
  const [expanded,setExpanded]=useState(initExpanded);
  const [panelCollapsed,setPanelCollapsed]=useState(false);
  const [notes,setNotes]=useState({});
  const [approvingId,setApprovingId]=useState(null);
  if(!role.seesAI||!items.length) return null;
  const visible=items.filter(function(i){return !dismissed.includes(i.id);});
  if(!visible.length) return null;
  const pending=visible.filter(function(i){return !approvedAnomalies[i.id];}).length;
  const sC={high:CRED,medium:CAMB,low:CGRN};
  const sB={high:CREDL,medium:CAMBL,low:CGRNL};
  function toggleCard(id){setExpanded(function(e){return e.includes(id)?e.filter(function(x){return x!==id;}):[...e,id];});}
  function confirmApprove(it){
    const note=notes[it.id]?.trim();
    if(!note) return;
    onApprove(it.id,{...it,note,at:now()});
    setApprovingId(null);
    setTimeout(function(){setDismissed(function(d){return [...d,it.id];});},300);
  }
  return <div style={S.aiBanner}>
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:panelCollapsed?0:8}}>
      <span style={{fontSize:11,fontWeight:700,color:CPURP,textTransform:"uppercase",letterSpacing:"0.05em"}}>AI Anomaly Detection</span>
      <Tag txt={visible.length+" signals"} color={CPURP} bg={CPURPL}/>
      {pending>0?<Tag txt={pending+" pending"} color={CAMB} bg={CAMBL}/>:<Tag txt="Cleared" color={CGRN} bg={CGRNL}/>}
      <button onClick={function(){setPanelCollapsed(function(c){return !c;});}} style={{marginLeft:"auto",padding:"2px 8px",fontSize:11,border:"1px solid #d4c8f8",borderRadius:3,background:"rgba(83,74,183,0.08)",color:CPURP,cursor:"pointer"}}>{panelCollapsed?"▼ Show":"▲ Collapse"}</button>
    </div>
    {!panelCollapsed&&<div style={{display:"flex",flexDirection:"column",gap:5}}>
      {visible.map(function(it){
        const sc=sC[it.severity]||CG4;
        const sb=sB[it.severity]||CG0;
        const isExp=expanded.includes(it.id);
        const isApp=approvingId===it.id;
        return <div key={it.id} style={{border:"1px solid "+CG3,borderLeft:"3px solid "+sc,borderRadius:4,background:CW,overflow:"hidden"}}>
          <div style={{display:"flex",gap:8,padding:"7px 10px",alignItems:"flex-start"}}>
            <Dot sev={it.severity}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
                <span style={{fontSize:10,fontWeight:700,color:sc,textTransform:"uppercase"}}>{it.category}</span>
                {it.region&&<span style={{fontSize:10,color:CG4}}>· {it.region}</span>}
                {it.confidence&&<span style={{fontSize:10,color:CGRN,marginLeft:"auto"}}>AI: {it.confidence}%</span>}
              </div>
              <div style={{fontSize:11,color:CG5,lineHeight:1.5}}>{it.text}</div>
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button onClick={function(){toggleCard(it.id);}} style={{padding:"3px 7px",fontSize:11,border:"1px solid "+CG3,borderRadius:3,background:CW,color:CG5,cursor:"pointer"}}>{isExp?"▲":"▼"}</button>
              {!approvedAnomalies[it.id]&&role.canApprove&&<button onClick={function(){setApprovingId(it.id);setExpanded(function(e){return e.includes(it.id)?e:[...e,it.id];});}} style={{padding:"3px 7px",fontSize:11,border:"1px solid "+CGRN,borderRadius:3,background:CGRNL,color:CGRN,cursor:"pointer"}}>Approve</button>}
              {!approvedAnomalies[it.id]&&!role.canApprove&&<span style={{fontSize:10,color:CG4,alignSelf:"center"}}>Escalate</span>}
              <button onClick={function(){setDismissed(function(d){return [...d,it.id];});}} style={{padding:"3px 5px",fontSize:14,border:"none",background:"none",color:CG4,cursor:"pointer",lineHeight:1}}>×</button>
            </div>
          </div>
          {isExp&&<div style={{borderTop:"1px solid "+CG3,padding:"7px 10px",background:sb}}>
            <div style={{fontSize:11,fontWeight:700,color:CPURP,textTransform:"uppercase",marginBottom:4}}>Detection rationale</div>
            <div style={{fontSize:11,color:CG5,lineHeight:1.55}}>Variance deviates from the 4-quarter rolling average by more than 2 standard deviations. The spend-to-headcount ratio from Cisco DW does not corroborate the magnitude.</div>
            {isApp&&!approvedAnomalies[it.id]&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed "+CG3}}>
              <div style={{fontSize:11,fontWeight:600,color:CAMB,marginBottom:4}}>Approval note required</div>
              <textarea autoFocus value={notes[it.id]||""} onChange={function(e){setNotes(function(n){return {...n,[it.id]:e.target.value};});}} placeholder="Explain why this is acceptable…" style={{...S.inp,minHeight:48,fontSize:11,resize:"vertical",marginBottom:6}}/>
              <div style={{display:"flex",gap:6}}>
                <button onClick={function(){confirmApprove(it);}} disabled={!notes[it.id]?.trim()} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CGRN,borderRadius:3,background:notes[it.id]?.trim()?CGRNL:CG0,color:notes[it.id]?.trim()?CGRN:CG4,cursor:notes[it.id]?.trim()?"pointer":"not-allowed"}}>Confirm & dismiss</button>
                <button onClick={function(){setApprovingId(null);}} style={{padding:"4px 9px",fontSize:11,border:"1px solid "+CG3,borderRadius:3,background:CW,color:CG5,cursor:"pointer"}}>Cancel</button>
              </div>
            </div>}
          </div>}
        </div>;
      })}
    </div>}
  </div>;
}

// Confidence modal — outside VarianceTab so slider never remounts it
const CONF_FACTORS=[
  {label:"Data completeness",   offset:4,  desc:"Checks whether all sub-ledger entries reconcile with the GL balance. Missing or late-posted journals reduce this score."},
  {label:"Driver corroboration",offset:-10,desc:"Compares the financial variance against operational drivers from Cisco DW. Low score = financial and operational data are inconsistent."},
  {label:"Historical consistency",offset:5,desc:"Evaluates whether this variance pattern matches 8 quarters of history. Unusual breaks reduce confidence."},
  {label:"Decomposition quality",offset:-5,desc:"Assesses whether Vol/Rate/FX/Mix attribution sums cleanly. Residual mix above 40% indicates unexplained variance."},
];
function ConfModal({row,onClose}){
  if(!row) return null;
  return <Mod title={"AI Confidence — "+row.name} onClose={onClose} w={520}>
    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,padding:"10px 12px",background:CG0,borderRadius:4,border:"1px solid "+CG3}}>
      <ConfBadge level={row.narConf}/>
      <span style={{fontSize:13,fontWeight:600,color:CG6}}>{row.confidence}% overall confidence</span>
      <span style={{fontSize:11,color:CG4,marginLeft:"auto"}}>Q2 FY2025</span>
    </div>
    {CONF_FACTORS.map(function(f){
      const pct=Math.min(99,Math.max(30,row.confidence+f.offset));
      const lvl=pct>80?"high":pct>65?"medium":"low";
      const c={high:CGRN,medium:CAMB,low:CRED}[lvl];
      return <div key={f.label} style={{marginBottom:10,padding:"10px 12px",background:CW,border:"1px solid "+CG3,borderLeft:"3px solid "+c,borderRadius:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:12,fontWeight:600,color:CG6}}>{f.label}</span>
          <span style={{fontSize:13,fontWeight:700,color:c}}>{pct}%</span>
        </div>
        <div style={{height:6,background:CG3,borderRadius:3,marginBottom:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:c,borderRadius:3}}/>
        </div>
        <div style={{fontSize:11,color:CG5,lineHeight:1.5}}>{f.desc}</div>
      </div>;
    })}
    <div style={{padding:"8px 12px",background:CPURPL,border:"1px solid "+CPURP,borderRadius:4,fontSize:11,color:CPURP,lineHeight:1.5}}>
      <strong>Recommendation:</strong> {row.narConf==="low"?"Manual FP&A review required before inclusion in executive commentary.":row.narConf==="medium"?"Review driver corroboration before sign-off.":"Data is well-corroborated. Standard review process applies."}
    </div>
  </Mod>;
}

// PnlTable — memo + outside VarianceTab so slider never causes remount
const PnlTable=memo(function PnlTable({rows,onConfClick}){
  return <div style={{overflowX:"auto"}}>
    <table style={S.tbl}>
      <thead>
        <tr>{["Line item","Actual","Budget","$ var","% var","QoQ","V/R/FX/M","AI Confidence"].map(function(h){return <th key={h} style={S.th}>{h}</th>;})}</tr>
      </thead>
      <tbody>
        {rows.map(function(r){
          const sub=r.type==="subtotal";
          return <tr key={r.name} style={{background:r.narConf==="low"&&!sub?CREDL:sub?CBL:"transparent",fontWeight:sub?600:400}}>
            <td style={{...S.td,paddingLeft:sub?9:18,borderLeft:sub?"3px solid "+CB:"none",color:CG6}}>{r.name}</td>
            <td style={{...S.td,fontFamily:"monospace"}}>${r.actual}M</td>
            <td style={{...S.td,fontFamily:"monospace",color:CG4}}>${r.budget}M</td>
            <td style={{...S.td,fontFamily:"monospace",color:pctC(r.budgetVar)}}>{fmt(r.budgetVar)}M</td>
            <td style={S.td}><Pill val={r.budgetPct}/></td>
            <td style={{...S.td,fontFamily:"monospace",color:pctC(r.qoqPct||0),fontSize:11}}>{fmt(r.qoqPct||0)}%</td>
            <td style={S.td}>{!sub&&<DecompBar vol={r.volVar} rate={r.rateVar} fx={r.fxVar} mix={r.mixVar} total={r.budgetVar}/>}</td>
            <td style={S.td}>{!sub&&r.confidence&&<span onClick={function(){onConfClick(r);}} style={{cursor:"pointer",textDecoration:"underline dotted"}}><ConfBadge level={r.narConf}/></span>}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
});

// ═══ TAB 1: VARIANCE NARRATIVE ════════════════════════════════════════════════
function VarianceTab({role,approvedAnomalies,onApprove}){
  const [thr,setThr]=useState(5);
  const [loading,setLoading]=useState(false);
  const [narrative,setNarrative]=useState("");
  const [checking,setChecking]=useState(false);
  const [contradictions,setContradictions]=useState([]);
  const [period,setPeriod]=useState("Q2 FY2025 vs Budget");
  const [confModal,setConfModal]=useState(null);
  const reg=ROLE_REGIONS[role.id];
  const rev=PNL.find(function(r){return r.name==="Revenue";});
  const ni=PNL.find(function(r){return r.name==="Net Income";});
  const oi=PNL.find(function(r){return r.name==="Operating Income";});
  const cogs=PNL.find(function(r){return r.name==="Cost of Revenue";});
  const gm=rev&&cogs?parseFloat(((1-cogs.actual/rev.actual)*100).toFixed(1)):0;
  const gmB=rev&&cogs?parseFloat(((1-cogs.budget/rev.budget)*100).toFixed(1)):0;
  const sigs=PNL.filter(function(r){return r.anomaly||r.needsClarification;}).map(function(r){return {id:r.name,severity:Math.abs(r.budgetPct)>15?"high":Math.abs(r.budgetPct)>10?"medium":"low",category:r.needsClarification?"Needs Clarification":"Large Variance",region:"All",text:r.name+": "+fmt(r.budgetPct)+"% vs budget, QoQ "+fmt(r.qoqPct)+"%.",confidence:r.needsClarification?78:88,needsClarification:r.needsClarification,qoq:r.qoqPct};});
  const visibleRows=useMemo(function(){return PNL.filter(function(r){return r.type==="subtotal"||Math.abs(r.budgetPct)>=thr;});},[thr]);
  const mat=useMemo(function(){return PNL.filter(function(r){return Math.abs(r.budgetPct)>=thr&&r.type!=="subtotal";});},[thr]);

  function generate(){
    setLoading(true);setNarrative("");setContradictions([]);
    setTimeout(function(){
      setNarrative("Q2 FY2025 performance came in broadly in line with plan, with Revenue of $4,183M representing a -0.4% miss versus budget. The shortfall was concentrated in EMEA, where FX translation headwinds of -$18M offset solid volume performance. Americas delivered Revenue in line with plan (+0.3%), while APAC contributed $6M of upside driven by a favorable rate mix in Enterprise licensing.\n\nGross Margin contracted 40bps versus budget to 64.1%, reflecting Cost of Revenue absorption pressure in the Splunk segment. R&D spend of $748M was $12M (1.6%) favorable to budget, as planned headcount additions in the Splunk integration cohort were partially offset by open requisitions in APAC. Sales & Marketing of $944M came in $36M (3.7%) favorable, primarily due to campaign timing shifts from Q2 into Q3 — this creates a Q3 budget pressure the team should proactively flag. [LOW CONFIDENCE: S&M driver corroboration with DW data is weak.]\n\nOperating Income of $745M was $85M (10.2%) unfavorable to budget. The primary drivers are: (1) gross margin compression noted above (-$38M impact), (2) higher-than-planned data center infrastructure costs in the 6000-OpEx pool (+$27M), and (3) merit cycle accruals posted ahead of the July payroll cycle (+$20M). The team has confidence in the Q3 forecast given pipeline visibility of 4.98×, though the EMEA FX sensitivity remains a key risk if EUR/USD moves below 0.90.");
      setLoading(false);
    },900);
  }

  function checkContradictions(){
    if(!narrative) return;
    setChecking(true);setContradictions([]);
    setTimeout(function(){
      setContradictions([
        {line:"S&M campaign timing shift to Q3",issue:"Q1 FY2025 earnings call explicitly committed to 'no further campaign deferrals' in response to an analyst question about revenue visibility.",severity:"high"},
        {line:"Splunk R&D headcount delays",issue:"Q1 CFO letter stated Splunk integration headcount would be 'fully ramped by Q2'. Open requisitions in APAC directly contradict this commitment.",severity:"high"},
        {line:"APAC Enterprise licensing upside",issue:"Q1 commentary attributed APAC upside to the same licensing cohort. Recurring attribution without a new driver explanation may draw auditor scrutiny.",severity:"medium"},
      ]);
      setChecking(false);
    },1100);
  }

  return <div>
    <AsOf period="Q2 FY2025"/>
    <DWCard reg={reg}/>
    <AIPanel items={sigs} role={role} approvedAnomalies={approvedAnomalies} onApprove={onApprove}/>
    <WisdomCard reg={reg} role={role}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
      {[{l:"Revenue",v:"$"+(rev?.actual||0)+"M",d:rev?.budgetPct||0},{l:"Gross Margin",v:gm+"%",d:gm-gmB},{l:"Op. Income",v:"$"+(oi?.actual||0)+"M",d:oi?.budgetPct||0},{l:"Net Income",v:"$"+(ni?.actual||0)+"M",d:ni?.budgetPct||0}].map(function(m){return (
        <div key={m.l} style={{background:CW,border:"1px solid "+CG3,borderRadius:6,padding:"12px 14px"}}>
          <div style={{fontSize:20,fontWeight:700,color:CG6,marginBottom:3}}>{m.v}</div>
          <div style={{fontSize:11,color:CG4,marginBottom:5}}>{m.l}</div>
          <Pill val={m.d}/>
        </div>
      );})}
    </div>
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
        <span style={S.ct}>P&L with Narrative Confidence Scores</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:CG4}}>Threshold: <strong>{thr}%</strong></span>
          <input type="range" min={2} max={20} step={1} value={thr} onChange={function(e){setThr(+e.target.value);}} style={{width:70,cursor:"pointer"}}/>
          <select value={period} onChange={function(e){setPeriod(e.target.value);}} style={{...S.inp,width:"auto",padding:"4px 8px",fontSize:11}}>
            <option>Q2 FY2025 vs Budget</option>
            <option>Q2 FY2025 vs Prior Year</option>
          </select>
        </div>
      </div>
      <PnlTable rows={visibleRows} onConfClick={setConfModal}/>
      <div style={{marginTop:8,fontSize:11,color:CG4}}>Showing lines ≥{thr}% variance + subtotals. Red rows = low AI confidence — require additional verification.</div>
    </div>
    <ConfModal row={confModal} onClose={function(){setConfModal(null);}}/>
    {role.seesAI&&<div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <span style={S.ct}>AI Commentary with Document Intelligence</span>
        <div style={{display:"flex",gap:8}}>
          <button style={S.btn("pri")} onClick={generate} disabled={loading}>{loading?"Generating…":"Generate commentary"}</button>
          {narrative&&<button style={{...S.btn("ghost"),border:"1px solid "+CPURP,color:CPURP,fontSize:12}} onClick={checkContradictions} disabled={checking}>{checking?"Checking…":"Check contradictions"}</button>}
        </div>
      </div>
      {narrative?<div style={{fontSize:12,lineHeight:1.85,color:CG5,whiteSpace:"pre-wrap",padding:"10px 12px",background:CG0,borderRadius:4,border:"1px solid "+CG3,marginBottom:contradictions.length?10:0}}>{narrative}</div>:<div style={{color:CG4,fontSize:12,fontStyle:"italic",padding:"10px 12px",background:CG0,borderRadius:4,border:"1px dashed "+CG3}}>Narrative will include confidence scores per line.</div>}
      {contradictions.length>0&&<div style={{background:CAMBL,border:"1px solid "+CAMB,borderRadius:4,padding:12}}>
        <div style={{fontSize:11,fontWeight:700,color:CAMB,marginBottom:8}}>Document Intelligence — Contradictions Detected ({contradictions.length})</div>
        {contradictions.map(function(c,i){return (
          <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid "+CG3,alignItems:"flex-start"}}>
            <Dot sev={c.severity||"medium"}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:CG6,marginBottom:2}}>{c.line}</div>
              <div style={{fontSize:11,color:CG5}}>{c.issue}</div>
            </div>
            <Tag txt={c.severity||"medium"} color={{high:CRED,medium:CAMB,low:CGRN}[c.severity]||CAMB} bg={CAMBL}/>
          </div>
        );})}
      </div>}
    </div>}
  </div>;
}

// ═══ TAB 2: FLUX REPORT ═══════════════════════════════════════════════════════
function FluxTab({role,approvedAnomalies,onApprove}){
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(false);
  const [draft,setDraft]=useState("");
  const [glFilter,setGlFilter]=useState("All");
  const [regFilter,setRegFilter]=useState(ROLE_REGIONS[role.id]);
  const [drillModal,setDrillModal]=useState(null);
  const [decompRow,setDecompRow]=useState(null);
  const [interrogating,setInterrogating]=useState(null);
  const [interrogationQ,setInterrogationQ]=useState("");
  useEffect(function(){setRegFilter(ROLE_REGIONS[role.id]);setStep(0);setDraft("");},[role.id]);
  const filtered=FLUX.filter(function(r){
    if(regFilter!=="All"&&r.region!==regFilter) return false;
    if(glFilter!=="All"&&r.gl!==glFilter) return false;
    return r.material;
  }).slice(0,30);
  const anomFlux=filtered.filter(function(r){return r.anomaly||r.needsClarification;});
  const appCount=Object.keys(approvedAnomalies).length;
  const aiSigs=anomFlux.slice(0,6).map(function(r){return {id:r.region+"-"+r.gl+"-"+r.entity,severity:Math.abs(r.pct)>20?"high":Math.abs(r.pct)>15?"medium":"low",category:r.needsClarification?"Needs Clarification":"QoQ Anomaly",region:r.region,text:r.region+"/"+r.gl+": "+fmt(r.pct)+"% vs budget, QoQ "+fmt(r.qoq||0)+"%.",confidence:r.needsClarification?75:89,needsClarification:r.needsClarification,qoq:r.qoq};});
  const byReg=DIMS.map(function(reg){return {reg,count:filtered.filter(function(r){return r.region===reg;}).length,total:parseFloat(filtered.filter(function(r){return r.region===reg;}).reduce(function(a,r){return a+Math.abs(r.variance);},0).toFixed(1)),anom:filtered.filter(function(r){return r.region===reg&&r.anomaly;}).length};}).filter(function(r){return r.count>0;});
  const steps=["Ingest data","Identify variances","Draft narrative","Review & approve","Format report"];
  function runInterrogation(r){
    const k=r.region+"-"+r.gl;
    setInterrogating(k);setInterrogationQ("Generating clarifying question…");
    const QUESTIONS={
      "EMEA-6300-S&M":"EMEA S&M is +14.2% vs budget for the second consecutive quarter. Can you confirm whether the variance is concentrated in direct sales compensation or deferred campaign spend, and provide the Q3 phasing plan for the deferred campaigns?",
      "Splunk-6200-R&D":"Splunk R&D headcount onboarding is running 22% above the DW ratio norm. What is the projected full-year R&D run-rate if this hiring pace continues, and does this require a budget revision before Q3?",
      "Americas-6400-G&A":"Americas G&A has exceeded budget for 3 consecutive quarters (avg +7.2%). Is this a structural cost shift post-acquisition that should be reflected in the FY2026 base budget, or is management expecting reversion to prior run-rate?",
      "Americas-6300-S&M":"Americas S&M variance exceeds budget by "+fmt(r.pct)+"%. DW pipeline coverage is 4.98× — is the overspend aligned with elevated pipeline activity, or does it include unplanned discretionary spend?",
      "EMEA-6200-R&D":"EMEA R&D variance carries a high mix component. Can you confirm whether this is driven by contractor-to-FTE conversion costs or net new headcount above plan?",
      "APAC-6100-COGS":"APAC COGS pressure of "+fmt(r.variance)+"M vs budget: is this attributable to data center infrastructure cost step-up or to unfavorable SGD/USD rate movement in vendor contracts?",
    };
    const q=QUESTIONS[k]||("For the "+r.region+" "+r.gl+" variance of "+fmt(r.variance)+"M ("+fmt(r.pct)+"%), can you confirm the primary driver split between volume and rate, and whether this is consistent with the Cisco DW headcount data ("+(DW.hc[r.region]||"N/A")+" HC)?");
    setTimeout(function(){setInterrogationQ(q);},700);
  }
  function run(){
    setStep(1);setDraft("");setLoading(true);
    setTimeout(function(){
      setStep(2);
      setTimeout(function(){
        setDraft("Cisco Finance — Flux Report Q2 FY2025 (DRAFT)\n\nMaterial variances for Q2 FY2025 total $284M in absolute gross exposure across 14 flagged line items, with EMEA and Splunk contributing 62% of the total. The three largest drivers are: (1) EMEA 6300-S&M at +$47M (14.2% above budget), attributable to merit cycle acceleration and annual marketing campaign spend; (2) Splunk 6200-R&D at +$38M (18.6%), driven by integration headcount onboarding ahead of the original schedule; and (3) Americas 6400-G&A at +$22M (7.8%), reflecting a post-acquisition structural cost step-up that the team recommends reviewing in the Q3 plan.\n\nVolume variance was the dominant driver at +$112M gross, primarily in EMEA and Americas commercial segments where deal volume exceeded plan. Rate variance of +$68M reflects merit cycle timing and inflationary vendor contract renewals. FX translation contributed -$42M net headwind across non-USD entities, with EUR and JPY as the primary exposures. Mix variance of +$14M reflects favorable product mix in Enterprise versus SMB channels.\n\nThree items have been flagged as recurring cross-quarter patterns requiring threshold review: EMEA 6300-S&M (4 of last 8 quarters above threshold, avg +12.3%), Splunk 6200-R&D (2 of last 2 quarters, avg +18.1%), and Americas 6400-G&A (3 of last 3 quarters, avg +7.2%). The FP&A team recommends adjusting the materiality threshold for EMEA S&M to 14% for the Q3 cycle and establishing a dedicated Splunk R&D integration variance commentary template.");
        setStep(3);setLoading(false);
      },700);
    },600);
  }
  function getPrior(r){return PRIOR_RES.find(function(p){return p.gl===r.gl&&p.region===r.region;})||null;}

  return <div>
    <AsOf period="Q2 FY2025"/>
    <DWCard reg={regFilter}/>
    <AIPanel items={aiSigs} role={role} approvedAnomalies={approvedAnomalies} onApprove={onApprove}/>
    {appCount>0&&<div style={{background:CGRNL,border:"1px solid "+CGRN,borderLeft:"3px solid "+CGRN,borderRadius:4,padding:"9px 13px",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:600,color:CGRN,marginBottom:4}}>Running with {appCount} approved {appCount===1?"anomaly":"anomalies"}</div>
      {Object.values(approvedAnomalies).map(function(a){return (
        <div key={a.id} style={{display:"flex",gap:8,alignItems:"baseline",fontSize:11,marginBottom:2}}>
          <span style={{color:CGRN}}>✓</span><span style={{color:CBD,fontWeight:500}}>{a.category} · {a.region}</span>
          <span style={{color:CG4}}>— {a.note}</span>
          <span style={{marginLeft:"auto",color:CG4,fontSize:10}}>{new Date(a.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      );})}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
      {[{label:"Dimensions analyzed",val:FLUX.length,sub:"total combinations",onClick:function(){setDrillModal({title:"All dimensions",rows:FLUX.slice(0,50)});}},{label:"Material variances",val:filtered.length,sub:"flagged by rules engine",onClick:function(){setDrillModal({title:"Material variances",rows:filtered});}},{label:"AI anomalies flagged",val:anomFlux.length,sub:appCount>0?appCount+" approved, "+Math.max(0,anomFlux.length-appCount)+" pending":"requiring review",alert:anomFlux.length>appCount,onClick:function(){setDrillModal({title:"Anomalies",rows:anomFlux});}}].map(function(m,i){return (
        <div key={i} style={{background:CW,border:"1px solid "+(m.alert?CRED+"66":CG3),borderRadius:6,padding:"12px 14px",cursor:"pointer",position:"relative"}} onClick={m.onClick}>
          <div style={{position:"absolute",top:8,right:10,fontSize:14,color:CB,opacity:0.5}}>↗</div>
          <div style={{fontSize:20,fontWeight:700,color:m.alert?CRED:CBD,marginBottom:3}}>{m.val}</div>
          <div style={{fontSize:11,color:CG4,marginBottom:2}}>{m.label}</div>
          <div style={{fontSize:10,color:CG4}}>{m.sub}</div>
        </div>
      );})}
    </div>
    {drillModal&&<Mod title={drillModal.title} onClose={function(){setDrillModal(null);}}>
      <div style={{overflowX:"auto"}}><table style={S.tbl}>
        <thead><tr>{["Region","GL","Entity","Actual","Budget","Var","% var","QoQ","V/R/FX/M","Flags"].map(function(h){return <th key={h} style={S.th}>{h}</th>;})}</tr></thead>
        <tbody>{drillModal.rows.map(function(r,i){return (
          <tr key={i} style={{background:r.anomaly?CREDL:r.isSeasonal?"#fffbf0":"transparent",cursor:"pointer"}} onClick={function(){setDrillModal(null);setDecompRow(r);}}>
            <td style={S.td}>{r.region}</td><td style={{...S.td,fontFamily:"monospace",fontSize:10}}>{r.gl}</td>
            <td style={{...S.td,color:CG4,fontSize:10}}>{r.entity}</td>
            <td style={{...S.td,fontFamily:"monospace"}}>${r.actual}M</td><td style={{...S.td,fontFamily:"monospace",color:CG4}}>${r.budget}M</td>
            <td style={{...S.td,fontFamily:"monospace",color:pctC(r.variance)}}>{fmt(r.variance)}M</td>
            <td style={S.td}><Pill val={r.pct}/></td>
            <td style={{...S.td,fontFamily:"monospace",color:pctC(r.qoq||0),fontSize:10}}>{fmt(r.qoq||0)}%</td>
            <td style={S.td}><DecompBar vol={r.volVar} rate={r.rateVar} fx={r.fxVar} mix={r.mixVar} total={r.variance}/></td>
            <td style={S.td}>{r.anomaly&&<Tag txt="⚠" color={CRED} bg={CREDL}/>}{r.needsClarification&&<span style={{marginLeft:2}}><Tag txt="❓" color={CAMB} bg={CAMBL}/></span>}</td>
          </tr>
        );})}
        </tbody>
      </table></div>
    </Mod>}
    {decompRow&&<Mod title={"Decomposition — "+decompRow.region+" / "+decompRow.gl} onClose={function(){setDecompRow(null);}} w={600}>
      <div style={{marginBottom:12,padding:"10px 12px",background:CG0,borderRadius:4,border:"1px solid "+CG3}}>
        <div style={{fontSize:11,color:CG4,marginBottom:2}}>Total variance vs budget</div>
        <div style={{fontSize:20,fontWeight:700,color:pctC(decompRow.variance)}}>{fmt(decompRow.variance)}M <span style={{fontSize:12,fontWeight:400,color:CG4}}>({fmt(decompRow.pct)}%)</span></div>
      </div>
      {[{l:"Volume",v:decompRow.volVar,c:CGRN,d:"Changes in transaction volume, headcount, or units."},{l:"Rate / Price",v:decompRow.rateVar,c:CB,d:"Changes in unit price, wage rate, or vendor rate."},{l:"FX Translation",v:decompRow.fxVar,c:CAMB,d:"Currency translation effect from exchange rate movement."},{l:"Mix",v:decompRow.mixVar,c:CG4,d:"Changes in the composition of activity."}].map(function(b){return (
        <div key={b.l} style={{marginBottom:8,padding:"10px 12px",background:CW,border:"1px solid "+CG3,borderLeft:"3px solid "+b.c,borderRadius:4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:600,color:CG6}}>{b.l}</span>
            <span style={{fontSize:13,fontWeight:700,color:b.c,fontFamily:"monospace"}}>{fmt(b.v)}M <span style={{fontSize:10,color:CG4,fontWeight:400}}>({decompRow.variance?Math.round(Math.abs(b.v)/Math.abs(decompRow.variance)*100):0}%)</span></span>
          </div>
          <div style={{height:7,background:CG3,borderRadius:3,marginBottom:5,overflow:"hidden"}}><div style={{height:"100%",width:(decompRow.variance?Math.min(Math.abs(b.v)/Math.abs(decompRow.variance)*100,100):0)+"%",background:b.c,borderRadius:3}}/></div>
          <div style={{fontSize:11,color:CG5,lineHeight:1.5}}>{b.d}</div>
        </div>
      );})}
      {getPrior(decompRow)&&<div style={{marginTop:10,padding:"10px 12px",background:CPURPL,border:"1px solid "+CPURP,borderRadius:4}}>
        <div style={{fontSize:11,fontWeight:700,color:CPURP,marginBottom:4}}>Prior Resolution ({getPrior(decompRow).quarter})</div>
        <div style={{fontSize:11,color:CG5,marginBottom:4,lineHeight:1.5}}>{getPrior(decompRow).explanation}</div>
        <div style={{fontSize:11,color:CAMB,fontWeight:500}}>Action: {getPrior(decompRow).action}</div>
      </div>}
    </Mod>}
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <span style={S.ct}>Flux Pipeline — {role.label}</span>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {role.canDrillAll&&<select value={regFilter} onChange={function(e){setRegFilter(e.target.value);}} style={{...S.inp,width:"auto",padding:"4px 7px",fontSize:11}}><option>All</option>{DIMS.map(function(d){return <option key={d}>{d}</option>;})}</select>}
          <select value={glFilter} onChange={function(e){setGlFilter(e.target.value);}} style={{...S.inp,width:"auto",padding:"4px 7px",fontSize:11}}><option>All</option>{GLS.map(function(d){return <option key={d}>{d}</option>;})}</select>
          {step===0?<button style={S.btn("pri")} onClick={run} disabled={loading}>▶ Run pipeline</button>:<button style={{padding:"6px 12px",fontSize:12,fontWeight:500,border:"1px solid "+CG3,borderRadius:4,background:CW,color:CG5,cursor:"pointer"}} onClick={function(){setStep(0);setDraft("");}}>↺ Reset</button>}
        </div>
      </div>
      <div style={{display:"flex",marginBottom:12,border:"1px solid "+CG3,borderRadius:4,overflow:"hidden"}}>
        {steps.map(function(s,i){return (
          <div key={s} style={{flex:1,padding:"7px 5px",textAlign:"center",fontSize:11,fontWeight:step>i?600:400,background:step>i?CBL:step===i?CG0:CW,borderRight:i<steps.length-1?"1px solid "+CG3:"none",borderTop:"2px solid "+(step>i?CB:step===i?"rgba(4,159,217,0.4)":CG3),color:step>i?CBD:step===i?CB:CG4,transition:"all 0.3s"}}>
            {step>i?"✓ ":step===i&&loading?"… ":""}{s}
          </div>
        );})}
      </div>
      {step>=2&&<div style={{display:"grid",gridTemplateColumns:"1fr 190px",gap:10,marginBottom:10}}>
        <div style={{overflowX:"auto"}}><table style={S.tbl}>
          <thead><tr>{["Region","GL","Actual","Var%","QoQ","V/R/FX/M","Pattern","Interrogate"].map(function(h){return <th key={h} style={S.th}>{h}</th>;})}</tr></thead>
          <tbody>{filtered.slice(0,14).map(function(r,i){
            const k=r.region+"-"+r.gl;
            return <tr key={i} style={{background:r.anomaly?CREDL:r.isSeasonal?"#fffbf0":"transparent"}}>
              <td style={S.td}>{r.region}</td><td style={{...S.td,fontFamily:"monospace",fontSize:10}}>{r.gl}</td>
              <td style={{...S.td,fontFamily:"monospace"}}>${r.actual}M</td>
              <td style={S.td}><Pill val={r.pct}/></td>
              <td style={{...S.td,fontFamily:"monospace",color:pctC(r.qoq||0),fontSize:10}}>{fmt(r.qoq||0)}%</td>
              <td style={S.td}><DecompBar vol={r.volVar} rate={r.rateVar} fx={r.fxVar} mix={r.mixVar} total={r.variance}/></td>
              <td style={S.td}>{r.isSeasonal?<Tag txt="Seasonal" color={CAMB} bg={CAMBL}/>:r.crossQuarterPattern?<Tag txt={r.crossQuarterPattern.count+"× flagged"} color={CPURP} bg={CPURPL}/>:null}</td>
              <td style={S.td}><button onClick={function(){runInterrogation(r);}} style={{padding:"2px 7px",fontSize:10,border:"1px solid "+CPURP,borderRadius:3,background:CPURPL,color:CPURP,cursor:"pointer"}}>{interrogating===k?"…":"Ask AI"}</button></td>
            </tr>;
          })}</tbody>
        </table></div>
        <div>{byReg.map(function(r){return (
          <div key={r.reg} onClick={function(){var rows=filtered.filter(function(f){return f.region===r.reg;});setDrillModal({title:r.reg+" variances",rows:rows});}} style={{padding:"7px 9px",borderBottom:"1px solid "+CG3,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:CG6,fontWeight:500}}>{r.reg}</span><span style={{color:CBD,fontFamily:"monospace",fontWeight:600}}>${r.total}M</span></div>
            <div style={{display:"flex",gap:8,fontSize:10,color:CG4,marginTop:2}}><span>{r.count} items</span>{r.anom>0&&<span style={{color:CRED,fontWeight:500}}>{r.anom} anomalies</span>}<span style={{marginLeft:"auto",color:CB}}>↗</span></div>
          </div>
        );})}
        </div>
      </div>}
      {interrogating&&interrogationQ&&<div style={{background:CPURPL,border:"1px solid "+CPURP,borderRadius:4,padding:"10px 14px",marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:CPURP,marginBottom:5}}>AI Commentary Interrogation</div>
        <div style={{fontSize:12,color:CG6,marginBottom:8,fontWeight:500}}>{interrogationQ}</div>
        <button onClick={function(){setInterrogating(null);setInterrogationQ("");}} style={{...S.btn("ghost"),border:"1px solid "+CG3,fontSize:11}}>Dismiss</button>
      </div>}
      {step===3&&<div style={{background:CW,border:"1px solid "+CAMB,borderLeft:"3px solid "+CAMB,borderRadius:4,padding:12,marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:600,color:CAMB,textTransform:"uppercase",marginBottom:8}}>Draft — pending {role.canApprove?"your":"supervisor"} approval</div>
        <textarea style={{...S.inp,minHeight:160,lineHeight:1.7,fontSize:12,resize:"vertical"}} value={draft} onChange={function(e){setDraft(e.target.value);}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {role.canApprove?<button style={S.btn("pri")} onClick={function(){setStep(4);}}>Approve & format</button>:<span style={{fontSize:11,color:CAMB}}>Escalate to CFO or FP&A lead.</span>}
          <button style={{padding:"6px 12px",fontSize:11,border:"1px solid "+CG3,borderRadius:4,background:CW,color:CG5,cursor:"pointer"}} onClick={run} disabled={loading}>Regenerate</button>
        </div>
      </div>}
      {step===4&&<div style={{background:CGRNL,border:"1px solid "+CGRN,borderLeft:"3px solid "+CGRN,borderRadius:4,padding:12,marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:600,color:CGRN,marginBottom:8}}>Approved — ready to format</div>
        <div style={{fontSize:12,lineHeight:1.8,color:CG5,whiteSpace:"pre-wrap",marginBottom:8}}>{draft}</div>
        <button style={S.btn("pri")} onClick={function(){setLoading(true);setTimeout(function(){setLoading(false);setStep(5);},500);}} disabled={loading}>{loading?"Formatting…":"Format final report"}</button>
      </div>}
      {step===5&&<div style={{background:CW,border:"1px solid "+CG3,borderRadius:4,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",paddingBottom:10,borderBottom:"1px solid "+CG3,marginBottom:12}}>
          <div><div style={{fontSize:14,fontWeight:700,color:CG6}}>Cisco Finance — Flux Report Q2 FY2025</div><div style={{fontSize:11,color:CG4,marginTop:2}}>Finance Intelligence Platform · {role.label} · {new Date().toLocaleDateString()}</div></div>
          <Tag txt="Final · Approved" color={CGRN} bg={CGRNL}/>
        </div>
        <div style={{fontSize:12,lineHeight:1.9,color:CG5,whiteSpace:"pre-wrap",marginBottom:12}}>{draft}</div>
        <div style={{display:"flex",gap:8}}><button style={{padding:"6px 12px",fontSize:11,border:"1px solid "+CG3,borderRadius:4,background:CW,color:CG4,cursor:"not-allowed",opacity:0.5}}>Export PDF</button><button style={{padding:"6px 12px",fontSize:11,border:"1px solid "+CG3,borderRadius:4,background:CW,color:CG4,cursor:"not-allowed",opacity:0.5}}>Export PPT</button></div>
      </div>}
    </div>
  </div>;
}

// ═══ TAB 3: AI INTELLIGENCE HUB ═══════════════════════════════════════════════
function AIHubTab({role}){
  const [loadingPred,setLoadingPred]=useState(false);
  const [predictions,setPredictions]=useState("");
  const [loadingRemed,setLoadingRemed]=useState(null);
  const [remediations,setRemediations]=useState({});
  const [patternActions,setPatternActions]=useState({});
  const fixedSteps=[{status:"complete"},{status:"complete"},{status:"complete"},{status:"in_progress"},{status:"pending"},{status:"pending"},{status:"pending"}];
  const pendingCommentary=FLUX.filter(function(r){return r.material&&r.commentStatus==="pending";}).length;
  const closeRisk=computeCloseRisk(fixedSteps,pendingCommentary);
  const riskC={high:CRED,medium:CAMB,low:CGRN};

  function generatePredictions(){
    setLoadingPred(true);setPredictions("");
    setTimeout(function(){
      setPredictions("Based on Q2 FY2025 Vol/Rate/FX/Mix decomposition trends, Q3 FY2025 is projected to carry forward three significant headwinds. First, the S&M campaign deferral from Q2 will inflate Q3 Sales & Marketing spend by an estimated $30–40M above budget, creating a known unfavorable variance before the quarter begins. The team should proactively reforecast the Q3 S&M budget or request an offset from another OpEx pool. Second, Splunk R&D integration costs show no sign of deceleration — the rate variance component (+$24M in Q2) is expected to persist as the majority of new hires onboarded in Q2 will reach full productivity spend in Q3.\n\nFX translation risk is the primary macro wildcard for Q3. With 38% of revenue denominated in EUR, GBP, and JPY, a further 2% USD strengthening from current levels would generate approximately -$55M in additional translation headwind versus the current Q3 budget assumption. The FX sensitivity model suggests the budget was set at EUR/USD 0.94 — current spot of 0.92 already implies a -$18M Q3 drag before any further movement.\n\nOn the positive side, Americas volume variance (+$61M in Q2) is supported by DW pipeline coverage of 4.98× at the start of Q3, suggesting Revenue is likely to remain near or above budget. G&A structural costs are expected to plateau as the post-Splunk integration vendor consolidation program delivers estimated savings of $8–12M in Q3. Net-net, Operating Income in Q3 is projected at $720–760M versus a budget of $830M, implying continued pressure on the full-year operating income target.");
      setLoadingPred(false);
    },1200);
  }

  function getRemediation(r){
    const k=r.region+"-"+r.gl;
    setLoadingRemed(k);
    const REMEDIATIONS={
      "EMEA-6300-S&M":{explanation:"EMEA S&M variance is attributable to the Q1/Q2 annual marketing campaign cycle — a structural seasonal pattern appearing in 4 of the last 8 quarters. Merit accruals for EMEA sales compensation were posted in June ahead of the July payroll cycle.",action:"No corrective action required for Q2. For Q3, recommend pre-loading campaign budget into the July forecast to eliminate surprise variance."},
      "Splunk-6200-R&D":{explanation:"Splunk R&D variance driven by integration headcount onboarding ahead of the original schedule. 47 engineers onboarded in May vs. plan of 35, generating approximately $14M in unplanned payroll and benefits cost.",action:"Monitor through Q3 FY2025. Escalate to CFO if Q3 R&D run-rate exceeds $800M annualized. Recommend a budget amendment of +$38M for full-year R&D."},
      "Americas-6400-G&A":{explanation:"Americas G&A reflects a post-Splunk acquisition structural cost step-up in legal, compliance, and shared services. Vendor consolidation savings are expected in Q4 but have not yet materialized.",action:"Flag for CFO review in Q3 planning cycle. Consider revising the FY2026 G&A base budget upward by $25–30M to reflect the new Cisco+Splunk combined structure."},
      "Americas-6100-COGS":{explanation:"Americas COGS variance driven by data center infrastructure cost normalization following the cloud optimization program pause in Q1. Hosting and compute costs returned to the pre-optimization run-rate.",action:"Reinstate cloud optimization program milestones. Review supplier contracts in Q3 — target $15M in savings from reserved instance renegotiations."},
      "EMEA-6200-R&D":{explanation:"EMEA R&D variance reflects contractor-to-FTE conversion costs for 12 engineering roles in Dublin and Amsterdam, partially offset by reduced contractor spend in the same period.",action:"Conversion program is on track. No corrective action required. Contractor spend reduction of $8M in Q3 will partially offset the FTE cost increase."},
      "APAC-6100-COGS":{explanation:"APAC COGS pressure driven by unfavorable SGD/USD rate movement (-3.2% vs. budget assumption) and higher cloud infrastructure costs for APAC data residency compliance requirements.",action:"Hedge SGD exposure for Q3 and Q4 through treasury. Review data residency architecture with infrastructure team for cost reduction opportunities."},
    };
    const prior=PRIOR_RES.find(function(p){return p.gl===r.gl&&p.region===r.region;});
    const rem=REMEDIATIONS[k]||{explanation:r.region+" "+r.gl+" variance of "+fmt(r.variance)+"M ("+fmt(r.pct)+"%) — primary driver is "+(Math.abs(r.volVar)>=Math.abs(r.rateVar)?"volume":"rate")+". "+(prior?"Consistent with prior resolution ("+prior.quarter+"): "+prior.explanation:"No prior resolution on record."),action:prior?prior.action:"Review with regional controller. Verify against DW headcount and pipeline data before including in CFO commentary."};
    setTimeout(function(){
      setRemediations(function(prev){return {...prev,[k]:rem};});
      setLoadingRemed(null);
    },800);
  }

  return <div>
    <AsOf period="Q2 FY2025"/>
    <div style={{...S.card,borderLeft:"3px solid "+riskC[closeRisk.level],padding:"12px 15px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <span style={S.ct}>Close Risk Predictor</span>
        <Tag txt={closeRisk.level.toUpperCase()+" RISK"} color={riskC[closeRisk.level]} bg={riskC[closeRisk.level]+"22"}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:16,alignItems:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:36,fontWeight:700,color:riskC[closeRisk.level],lineHeight:1}}>{closeRisk.pct}%</div>
          <div style={{fontSize:11,color:CG4}}>miss probability</div>
        </div>
        <div>
          <div style={{height:10,background:CG3,borderRadius:5,marginBottom:8,overflow:"hidden"}}><div style={{height:"100%",width:closeRisk.pct+"%",background:riskC[closeRisk.level],borderRadius:5}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[{l:"Steps complete",v:fixedSteps.filter(function(s){return s.status==="complete";}).length+"/"+fixedSteps.length},{l:"Commentary pending",v:pendingCommentary,alert:pendingCommentary>3},{l:"Days to sign-off",v:"2"}].map(function(m){return (
              <div key={m.l} style={{background:m.alert?CREDL:CG0,border:"1px solid "+(m.alert?CRED:CG3),borderRadius:4,padding:"6px 10px"}}>
                <div style={{fontSize:14,fontWeight:700,color:m.alert?CRED:CBD}}>{m.v}</div>
                <div style={{fontSize:10,color:CG4}}>{m.l}</div>
              </div>
            );})}
          </div>
        </div>
        <div style={{fontSize:11,color:CG5,maxWidth:180,lineHeight:1.5}}>{closeRisk.level==="high"?"Action required: escalate overdue items immediately.":closeRisk.level==="medium"?"Monitor: assign pending items today.":"On track for CFO sign-off by July 16."}</div>
      </div>
    </div>

    {role.seesAI&&<div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={S.ct}>Predictive Variance Forecasting — Q3 FY2025</span>
        <button style={S.btn("pri")} onClick={generatePredictions} disabled={loadingPred}>{loadingPred?"Generating…":"Generate Q3 predictions"}</button>
      </div>
      {predictions?<div style={{fontSize:12,lineHeight:1.8,color:CG5,whiteSpace:"pre-wrap",padding:"10px 12px",background:CG0,borderRadius:4,border:"1px solid "+CG3}}>{predictions}</div>:<div style={{color:CG4,fontSize:12,fontStyle:"italic",padding:"10px 12px",background:CG0,borderRadius:4,border:"1px dashed "+CG3}}>AI will project Q3 variance direction and estimated magnitude for each driver based on Q2 Vol/Rate/FX/Mix trends.</div>}
    </div>}

    <div style={S.card}>
      <span style={S.ct}>Cross-Quarter Anomaly Pattern Recognition</span>
      <div style={{marginBottom:8,padding:"7px 10px",background:CPURPL,borderRadius:4,fontSize:11,color:CPURP,border:"1px solid "+CPURP}}>AI has analyzed 8 quarters of variance history. Patterns appearing 3+ times are candidates for threshold reclassification.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {CQP.map(function(p,i){
          const isActioned=!!patternActions[i];
          return <div key={i} style={{border:"1px solid "+CG3,borderLeft:"3px solid "+(isActioned?CGRN:p.reclassify?CGRN:CAMB),borderRadius:4,padding:"10px 14px",background:isActioned?CGRNL:CW}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:600,color:CG6}}>{p.region} / {p.gl}</span>
              <Tag txt={p.count+" of last 8 quarters"} color={CPURP} bg={CPURPL}/>
              <Tag txt={"Avg "+fmt(p.avgPct)+"%"} color={CAMB} bg={CAMBL}/>
              {p.reclassify&&!isActioned&&<Tag txt="Recommend threshold adjustment" color={CGRN} bg={CGRNL}/>}
              {isActioned&&<Tag txt={"✓ "+patternActions[i]} color={CGRN} bg={CGRNL}/>}
              <span style={{fontSize:10,color:CG4,marginLeft:"auto"}}>Quarters: {p.quarters.join(", ")}</span>
            </div>
            <div style={{fontSize:11,color:CG5,lineHeight:1.5,marginBottom:8}}>{p.recommendation}</div>
            {!isActioned&&role.seesAI&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {p.reclassify&&<button onClick={function(){setPatternActions(function(a){return {...a,[i]:"Threshold adjusted to "+Math.round(p.avgPct*1.15)+"% for this combination"};});}} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CGRN,borderRadius:3,background:CGRNL,color:CGRN,cursor:"pointer",fontWeight:500}}>Adjust threshold</button>}
              <button onClick={function(){setPatternActions(function(a){return {...a,[i]:"Flagged as seasonal — monitoring only"};});}} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CAMB,borderRadius:3,background:CAMBL,color:CAMB,cursor:"pointer",fontWeight:500}}>Mark as seasonal</button>
              <button onClick={function(){setPatternActions(function(a){return {...a,[i]:"Escalated to CFO for structural review"};});}} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CPURP,borderRadius:3,background:CPURPL,color:CPURP,cursor:"pointer",fontWeight:500}}>Escalate to CFO</button>
              <button onClick={function(){setPatternActions(function(a){return {...a,[i]:"Dismissed — analyst reviewed"};});}} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CG3,borderRadius:3,background:CW,color:CG5,cursor:"pointer"}}>Dismiss</button>
            </div>}
          </div>;
        })}
      </div>
    </div>

    {role.seesAI&&<div style={S.card}>
      <span style={S.ct}>Auto-Remediation Suggestions</span>
      <div style={{marginBottom:8,fontSize:11,color:CG4}}>AI generates commentary templates based on prior approved resolutions.</div>
      <div style={{overflowX:"auto"}}><table style={S.tbl}>
        <thead><tr>{["Region","GL","Variance","Prior?","AI Suggestion",""].map(function(h){return <th key={h} style={S.th}>{h}</th>;})}</tr></thead>
        <tbody>{FLUX.filter(function(r){return r.material;}).slice(0,8).map(function(r,i){
          const k=r.region+"-"+r.gl;
          const prior=PRIOR_RES.find(function(p){return p.gl===r.gl&&p.region===r.region;});
          const rem=remediations[k];
          return <tr key={i} style={{background:rem?CGRNL:"transparent"}}>
            <td style={S.td}>{r.region}</td>
            <td style={{...S.td,fontFamily:"monospace",fontSize:10}}>{r.gl}</td>
            <td style={{...S.td,fontFamily:"monospace",color:pctC(r.variance)}}>{fmt(r.variance)}M ({fmt(r.pct)}%)</td>
            <td style={S.td}>{prior?<Tag txt={prior.quarter} color={CGRN} bg={CGRNL}/>:<span style={{fontSize:10,color:CG4}}>None</span>}</td>
            <td style={{...S.td,fontSize:11}}>{rem?<div><div style={{color:CG6,marginBottom:2}}>{rem.explanation}</div><div style={{color:CAMB,fontWeight:500,fontSize:10}}>Action: {rem.action}</div></div>:<span style={{color:CG4,fontStyle:"italic",fontSize:11}}>Not generated</span>}</td>
            <td style={S.td}><button onClick={function(){getRemediation(r);}} disabled={loadingRemed===k} style={{padding:"3px 8px",fontSize:10,border:"1px solid "+CPURP,borderRadius:3,background:CPURPL,color:CPURP,cursor:"pointer"}}>{loadingRemed===k?"…":"Suggest"}</button></td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>}
  </div>;
}

// ═══ TAB 4: SCENARIO ══════════════════════════════════════════════════════════
function ScenarioTab({role}){
  const [sc,setSc]=useState({fx:0,hc:0,rev:0,opex:0});
  const [saved,setSaved]=useState([{id:"s1",name:"Bear Case — FX headwind",p:{fx:-5,hc:0,rev:-3,opex:0},at:"2025-07-12T09:00:00Z"},{id:"s2",name:"Bull Case — APAC upside",p:{fx:2,hc:5,rev:4,opex:2},at:"2025-07-13T14:00:00Z"}]);
  const [loading,setLoading]=useState(false);
  const [narrative,setNarrative]=useState("");
  const [scName,setScName]=useState("");
  const [activeSc,setActiveSc]=useState(null);
  const hasAny=Object.values(sc).some(function(v){return v!==0;});
  function applyRow(r){let a=r.actual;if(sc.fx!==0)a*=(1+sc.fx/100);if(sc.hc!==0&&r.type==="opex")a*=(1+sc.hc/100*0.3);if(sc.rev!==0&&r.type==="revenue")a*=(1+sc.rev/100);if(sc.opex!==0&&r.type==="opex")a*=(1+sc.opex/100);return parseFloat(a.toFixed(1));}
  const adj=PNL.map(function(r){const adjA=applyRow(r);const adjV=parseFloat((adjA-r.budget).toFixed(1));return {...r,adjA,adjV,adjPct:parseFloat((adjV/Math.abs(r.budget)*100).toFixed(1)),delta:parseFloat((adjA-r.actual).toFixed(1))};});
  function gen(){
    setLoading(true);setNarrative("");
    setTimeout(function(){
      const oiDelta=adj.find(function(r){return r.name==="Operating Income";})?.delta||0;
      const niDelta=adj.find(function(r){return r.name==="Net Income";})?.delta||0;
      const fxDesc=sc.fx!==0?(sc.fx>0?"a +"+sc.fx+"% FX tailwind":"a "+sc.fx+"% FX headwind"):"no FX movement";
      const hcDesc=sc.hc!==0?(sc.hc>0?"headcount growth of +"+sc.hc+"%":"a headcount reduction of "+Math.abs(sc.hc)+"%"):"flat headcount";
      const revDesc=sc.rev!==0?(sc.rev>0?"a Revenue uplift of +"+sc.rev+"%":"a Revenue decline of "+Math.abs(sc.rev)+"%"):"flat Revenue";
      const domDriver=Math.abs(sc.fx)>=Math.abs(sc.rev)
        ?"FX translation, which affects all non-USD entities representing approximately 38% of total revenue. Each 1% movement in the blended FX rate generates roughly $27M of Operating Income impact at the current revenue scale. EMEA EUR exposure is partially naturally hedged (~40% offset) through EUR-denominated vendor contracts, so the net FX sensitivity is lower than the gross figure."
        :"Revenue, where a "+sc.rev+"% change flows through at approximately 72% gross margin contribution, generating significant Operating Income leverage. DW pipeline coverage of 4.98× supports the revenue scenario assumption, though deal close-rate risk remains if macro conditions deteriorate in EMEA or APAC.";
      setNarrative("Scenario analysis reflects the combined impact of "+fxDesc+", "+hcDesc+", "+revDesc+", and an OpEx adjustment of "+fmt(sc.opex,0)+"%. Applied to the Q2 FY2025 actuals base, this scenario shifts Operating Income by an estimated "+fmt(oiDelta)+"M and Net Income by "+fmt(niDelta)+"M relative to the as-reported position.\n\nThe dominant sensitivity driver in this scenario is "+domDriver+"\n\nKey risks and caveats: (1) The headcount adjustment applies a 30% OpEx pass-through ratio reflecting Cisco's fixed/variable compensation mix — actual sensitivity may be higher for regions with lower fixed-cost ratios. (2) OpEx adjustments exclude restructuring and one-time items, which should be modeled separately if this scenario is used in CFO reporting. (3) For a Bear Case build, the FX headwind should be stress-tested at EUR/USD 0.88 (-6.4% vs. budget) to capture tail risk. Recommend validating this scenario through the treasury FX hedging model before presenting to the Board.");
      setLoading(false);
    },900);
  }
  const sliders=[{k:"fx",l:"FX Movement",range:[-15,15],c:CAMB},{k:"hc",l:"Headcount Change",range:[-20,20],c:CB},{k:"rev",l:"Revenue Uplift/Decline",range:[-15,15],c:CGRN},{k:"opex",l:"OpEx Adjustment",range:[-10,10],c:CPURP}];
  return <div>
    <AsOf period="Q2 FY2025"/>
    <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14}}>
      <div>
        <div style={S.card}>
          <span style={S.ct}>Sensitivity Controls</span>
          {sliders.map(function(sl){return (
            <div key={sl.k} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:500,color:CG6}}>{sl.l}</span>
                <span style={{fontSize:12,fontWeight:700,color:sc[sl.k]===0?CG4:sl.c}}>{fmt(sc[sl.k],0)}%</span>
              </div>
              <input type="range" min={sl.range[0]} max={sl.range[1]} step={1} value={sc[sl.k]} onChange={function(e){setSc(function(s){return {...s,[sl.k]:+e.target.value};});}} style={{width:"100%"}}/>
            </div>
          );})}
          <button onClick={function(){setSc({fx:0,hc:0,rev:0,opex:0});}} style={{...S.btn("ghost"),border:"1px solid "+CG3,fontSize:11,width:"100%",marginBottom:8}}>Reset</button>
          <div style={{borderTop:"1px solid "+CG3,paddingTop:10}}>
            <input style={{...S.inp,fontSize:11,marginBottom:6}} placeholder="Scenario name…" value={scName} onChange={function(e){setScName(e.target.value);}}/>
            <button onClick={function(){if(!scName.trim()||!hasAny)return;setSaved(function(p){return [...p,{id:uid(),name:scName,p:{...sc},at:now()}];});setScName("");}} disabled={!scName.trim()||!hasAny} style={{...S.btn("pri"),fontSize:11,width:"100%",opacity:scName.trim()&&hasAny?1:0.4}}>Save scenario</button>
          </div>
        </div>
        <div style={S.card}>
          <span style={S.ct}>Saved Scenarios</span>
          {saved.map(function(s){return (
            <div key={s.id} onClick={function(){setSc(s.p);setActiveSc(s.id);}} style={{padding:"7px 9px",border:"1px solid "+(activeSc===s.id?CB:CG3),borderRadius:4,marginBottom:6,cursor:"pointer",background:activeSc===s.id?CBL:CW}}>
              <div style={{fontSize:12,fontWeight:500,color:activeSc===s.id?CBD:CG6,marginBottom:2}}>{s.name}</div>
              <div style={{fontSize:10,color:CG4}}>FX {fmt(s.p.fx,0)}% · HC {fmt(s.p.hc,0)}% · Rev {fmt(s.p.rev,0)}%</div>
            </div>
          );})}
        </div>
      </div>
      <div>
        {hasAny&&<div style={{marginBottom:8,padding:"7px 12px",background:CAMBL,borderRadius:4,border:"1px solid "+CAMB,fontSize:11,color:CAMB}}>Scenario active: FX {fmt(sc.fx,0)}%, HC {fmt(sc.hc,0)}%, Rev {fmt(sc.rev,0)}%, OpEx {fmt(sc.opex,0)}%</div>}
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={S.ct}>Scenario vs Actuals vs Budget</span>
            {role.seesAI&&<button style={S.btn("pri")} onClick={gen} disabled={loading||!hasAny}>{loading?"Generating…":"Generate scenario narrative"}</button>}
          </div>
          <div style={{overflowX:"auto"}}><table style={S.tbl}>
            <thead><tr>{["Line item","Actual","Scenario","Delta","Scenario var%","Exposure"].map(function(h){return <th key={h} style={S.th}>{h}</th>;})}</tr></thead>
            <tbody>{adj.map(function(r,i){const sub=r.type==="subtotal";return (
              <tr key={i} style={{background:sub?CBL:Math.abs(r.delta)>10?CAMBL:"transparent",fontWeight:sub?600:400}}>
                <td style={{...S.td,paddingLeft:sub?9:18,borderLeft:sub?"3px solid "+CB:"none",color:CG6}}>{r.name}</td>
                <td style={{...S.td,fontFamily:"monospace"}}>${r.actual}M</td>
                <td style={{...S.td,fontFamily:"monospace",fontWeight:500,color:hasAny?CBD:CG4}}>${r.adjA}M</td>
                <td style={{...S.td,fontFamily:"monospace",color:pctC(r.delta)}}>{hasAny?fmt(r.delta)+"M":"—"}</td>
                <td style={S.td}>{hasAny?<Pill val={r.adjPct}/>:<Pill val={r.budgetPct}/>}</td>
                <td style={S.td}>{!sub&&hasAny&&<div style={{height:6,width:70,background:CG3,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(Math.abs(r.delta/r.actual*100)*3,100)+"%",background:Math.abs(r.delta)>5?CAMB:CB,borderRadius:3}}/></div>}</td>
              </tr>
            );})}
            </tbody>
          </table></div>
        </div>
        {narrative&&<div style={S.card}><span style={{...S.ct,color:CPURP}}>AI Scenario Narrative</span><div style={{fontSize:12,lineHeight:1.8,color:CG5,whiteSpace:"pre-wrap",padding:"10px 12px",background:CG0,borderRadius:4,border:"1px solid "+CG3}}>{narrative}</div></div>}
      </div>
    </div>
  </div>;
}

// ═══ TAB 5: SOX ═══════════════════════════════════════════════════════════════
function SOXTab({role}){
  const SOX_THR=50;
  const canApproveSOX=role.canApprove||role.isSOX;
  const isReadOnly=role.soxAccess==="readonly";
  const isLimited=role.soxAccess==="limited";
  const [log,setLog]=useState([{id:uid(),action:"Report generated",actor:"David Liu (FP&A Lead)",roleId:"fpa",at:"2025-07-14T05:30:00Z",detail:"Initial flux report generated — Q2 FY2025"},{id:uid(),action:"Anomaly approved",actor:"Sarah Chen (EMEA Controller)",roleId:"bu",at:"2025-07-14T06:00:00Z",detail:"EMEA 6300-S&M anomaly — merit cycle accrual confirmed"},{id:uid(),action:"Draft approved (1st)",actor:"David Liu (FP&A Lead)",roleId:"fpa",at:"2025-07-14T06:15:00Z",detail:"Flux draft narrative — first approver sign-off"}]);
  const allDuals=FLUX.filter(function(r){return Math.abs(r.variance)>=SOX_THR;}).slice(0,8).map(function(r,i){return {id:"sox-"+i,region:r.region,gl:r.gl,entity:r.entity,variance:r.variance,pct:r.pct,a1:null,a1at:null,a2:null,a2at:null,status:"pending"};});
  const [duals,setDuals]=useState(allDuals);
  const [appId,setAppId]=useState(null);
  const [note,setNote]=useState("");
  const [showExp,setShowExp]=useState(false);
  const visibleDuals=isLimited?duals.filter(function(d){return d.region==="Americas";}):duals;
  function addLog(action,detail){setLog(function(l){return [...l,{id:uid(),action,actor:role.label,roleId:role.id,at:now(),detail}];});}
  function doApprove(item){if(!note.trim())return;let upd;if(!item.a1){upd={...item,a1:role.label,a1at:now(),status:"partial"};}else if(!item.a2&&item.a1!==role.label){upd={...item,a2:role.label,a2at:now(),status:"approved"};}else return;setDuals(function(prev){return prev.map(function(d){return d.id===item.id?upd:d;});});addLog((upd.status==="approved"?"Final":"First")+" approval — "+item.region+"/"+item.gl,note+" | Variance: "+fmt(item.variance)+"M");setAppId(null);setNote("");}
  const pending=visibleDuals.filter(function(d){return d.status==="pending";}).length;
  const partial=visibleDuals.filter(function(d){return d.status==="partial";}).length;
  const approved=visibleDuals.filter(function(d){return d.status==="approved";}).length;
  const sc={pending:CRED,partial:CAMB,approved:CGRN};
  return <div>
    <AsOf period="Q2 FY2025"/>
    <div style={{marginBottom:10,padding:"10px 14px",background:CPURPL,border:"1px solid "+CPURP,borderRadius:6,display:"flex",gap:12,alignItems:"flex-start"}}>
      <span style={{fontSize:18,flexShrink:0}}>⚖</span>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><span style={{fontSize:12,fontWeight:700,color:CPURP}}>SOX 404 Compliance — {role.label} View</span><Tag txt={role.soxAccess==="full"?"Full authority":role.soxAccess==="prepare"?"Prepare only":role.soxAccess==="limited"?"Americas scope":"Read-only"} color={CPURP} bg={CPURPL}/></div>
        <div style={{fontSize:11,color:CPURP,opacity:0.85,lineHeight:1.5}}>{role.soxNote}</div>
        {isLimited&&<div style={{marginTop:4,fontSize:11,color:CAMB,fontWeight:500}}>Viewing Americas items only.</div>}
      </div>
      {(canApproveSOX||role.id==="auditor")&&<button onClick={function(){setShowExp(true);}} style={{...S.btn("pri"),fontSize:11,flexShrink:0}}>Export package</button>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
      {[{l:"Dual approval items",v:visibleDuals.length,c:CBD},{l:"Pending (0/2)",v:pending,c:CRED},{l:"Partial (1/2)",v:partial,c:CAMB},{l:"Approved (2/2)",v:approved,c:CGRN}].map(function(m){return <div key={m.l} style={{background:CW,border:"1px solid "+CG3,borderRadius:6,padding:"12px 14px"}}><div style={{fontSize:20,fontWeight:700,color:m.c,marginBottom:3}}>{m.v}</div><div style={{fontSize:11,color:CG4}}>{m.l}</div></div>;})}</div>
    {!isReadOnly&&<div style={S.card}>
      <span style={S.ct}>{isLimited?"Americas Dual Approval Queue":"Dual Approval Queue"} — Items &gt;${SOX_THR}M</span>
      {visibleDuals.map(function(item){
        const canFirst=!item.a1&&canApproveSOX;
        const canSecond=item.a1&&!item.a2&&item.a1!==role.label&&canApproveSOX;
        return <div key={item.id} style={{border:"1px solid "+CG3,borderLeft:"3px solid "+sc[item.status],borderRadius:4,background:CW,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}><span style={{fontSize:12,fontWeight:600,color:CG6}}>{item.region} / {item.gl}</span><span style={{fontSize:11,color:CG4}}>{item.entity}</span><span style={{marginLeft:"auto",fontFamily:"monospace",fontSize:12,fontWeight:700,color:pctC(item.variance)}}>{fmt(item.variance)}M</span><Tag txt={item.status==="approved"?"✓ 2/2":item.status==="partial"?"1/2":"0/2"} color={sc[item.status]} bg={sc[item.status]+"22"}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[{l:"1st Approver",a:item.a1,at:item.a1at},{l:"2nd Approver",a:item.a2,at:item.a2at}].map(function(ap,idx){return <div key={idx} style={{padding:"6px 8px",background:ap.a?CGRNL:CG0,border:"1px solid "+(ap.a?CGRN:CG3),borderRadius:3}}><div style={{fontSize:10,fontWeight:700,color:CG4,marginBottom:2}}>{ap.l}</div>{ap.a?<><div style={{fontSize:11,color:CGRN,fontWeight:500}}>✓ {ap.a}</div><div style={{fontSize:10,color:CG4}}>{new Date(ap.at).toLocaleString()}</div></>:<div style={{fontSize:11,color:CG4,fontStyle:"italic"}}>Awaiting</div>}</div>;})}
              </div>
              {appId===item.id&&<div style={{marginTop:8}}><textarea value={note} onChange={function(e){setNote(e.target.value);}} placeholder="Approval rationale (required)…" style={{...S.inp,minHeight:48,fontSize:11,resize:"vertical",marginBottom:6}}/><div style={{display:"flex",gap:6}}><button onClick={function(){doApprove(item);}} disabled={!note.trim()} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CGRN,borderRadius:3,background:note.trim()?CGRNL:CG0,color:note.trim()?CGRN:CG4,cursor:note.trim()?"pointer":"not-allowed"}}>Confirm</button><button onClick={function(){setAppId(null);}} style={{padding:"4px 9px",fontSize:11,border:"1px solid "+CG3,borderRadius:3,background:CW,color:CG5,cursor:"pointer"}}>Cancel</button></div></div>}
            </div>
            {appId!==item.id&&item.status!=="approved"&&(canFirst||canSecond)&&<button onClick={function(){setAppId(item.id);}} style={{padding:"4px 10px",fontSize:11,border:"1px solid "+CGRN,borderRadius:3,background:CGRNL,color:CGRN,cursor:"pointer",fontWeight:500,flexShrink:0}}>{canFirst?"Give 1st approval":"Give 2nd approval"}</button>}
            {appId!==item.id&&item.status!=="approved"&&!canFirst&&!canSecond&&<span style={{fontSize:10,color:CG4,alignSelf:"center",flexShrink:0}}>Cannot approve</span>}
          </div>
        </div>;
      })}
    </div>}
    <div style={S.card}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={S.ct}>Immutable Audit Log</span><span style={{fontSize:10,fontWeight:600,background:CPURPL,color:CPURP,padding:"2px 8px",borderRadius:3}}>🔒 Tamper-evident</span>{isReadOnly&&<Tag txt="Your primary view" color={CAMB} bg={CAMBL}/>}</div>
      <div style={{overflowX:"auto"}}><table style={S.tbl}>
        <thead><tr>{["Timestamp","Action","Actor","Role","Detail","ID"].map(function(h){return <th key={h} style={S.th}>{h}</th>;})}</tr></thead>
        <tbody>{[...log].reverse().map(function(e,i){return <tr key={i} style={{background:i%2===0?CG0:"transparent"}}><td style={{...S.td,fontFamily:"monospace",fontSize:10,whiteSpace:"nowrap"}}>{new Date(e.at).toLocaleString()}</td><td style={{...S.td,fontWeight:500,color:CG6,fontSize:11}}>{e.action}</td><td style={{...S.td,fontSize:11}}>{e.actor}</td><td style={S.td}><Tag txt={e.roleId||"—"} color={CBD} bg={CBL}/></td><td style={{...S.td,fontSize:11,color:CG4}}>{e.detail}</td><td style={{...S.td,fontFamily:"monospace",fontSize:9,color:CG4}}>{e.id}</td></tr>;})}
        </tbody>
      </table></div>
    </div>
    {showExp&&<Mod title="SOX Compliance Package — Q2 FY2025" onClose={function(){setShowExp(false);}} w={580}>
      <div style={{marginBottom:12,padding:"10px 12px",background:CPURPL,border:"1px solid "+CPURP,borderRadius:6}}><div style={{fontSize:12,fontWeight:700,color:CPURP,marginBottom:3}}>Compliance Package — Q2 FY2025</div><div style={{fontSize:11,color:CPURP,opacity:0.8}}>Generated: {fmtDt(now())} · By: {role.label}</div></div>
      {[["Period","Q2 FY2025"],["SOX threshold","$"+SOX_THR+"M"],["Dual approval items",duals.length],["Fully approved",approved],["Audit entries",log.length]].map(function(kv){return <div key={kv[0]} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+CG3,fontSize:12}}><span style={{color:CG4}}>{kv[0]}</span><span style={{color:CG6,fontWeight:500}}>{kv[1]}</span></div>;})}
      <div style={{marginTop:12,padding:"10px 12px",background:CGRNL,border:"1px solid "+CGRN,borderRadius:6}}><div style={{fontSize:11,fontWeight:700,color:CGRN,marginBottom:5}}>CFO Certification Statement</div><div style={{fontSize:11,color:CG5,lineHeight:1.6}}>I certify that the flux report for Q2 FY2025 has been prepared in accordance with Cisco's SOX 404 internal control procedures. All material variances above ${SOX_THR}M have received dual approval from authorized personnel.</div></div>
      <div style={{marginTop:12,display:"flex",gap:8}}><button style={S.btn("pri")}>Download PDF</button><button style={{...S.btn("ghost"),border:"1px solid "+CG3}} onClick={function(){setShowExp(false);}}>Close</button></div>
    </Mod>}
  </div>;
}

// ═══ TAB 6: PERIOD LOCKING ════════════════════════════════════════════════════
function PeriodTab({role}){
  const [calStatus,setCalStatus]=useState("preliminary");
  const [steps,setSteps]=useState([{id:"s1",name:"Sub-ledger close",owner:"Controllers",due:"2025-07-10",status:"complete",at:"2025-07-10T17:00:00Z"},{id:"s2",name:"Intercompany elimination",owner:"FP&A Lead",due:"2025-07-11",status:"complete",at:"2025-07-11T14:30:00Z"},{id:"s3",name:"Accruals review",owner:"Sarah Chen",due:"2025-07-12",status:"complete",at:"2025-07-12T16:00:00Z"},{id:"s4",name:"Flux variance review",owner:"David Liu",due:"2025-07-14",status:"in_progress",at:null},{id:"s5",name:"CFO sign-off",owner:"CFO",due:"2025-07-16",status:"pending",at:null},{id:"s6",name:"External audit review",owner:"Auditors",due:"2025-07-18",status:"pending",at:null},{id:"s7",name:"Period lock",owner:"Controller",due:"2025-07-19",status:"pending",at:null}]);
  const [lockModal,setLockModal]=useState(false);
  const [lockNote,setLockNote]=useState("");
  const [locked,setLocked]=useState(false);
  const [lockedBy,setLockedBy]=useState(null);
  const [lockedAt,setLockedAt]=useState(null);
  const done=steps.filter(function(s){return s.status==="complete";}).length;
  const pct=Math.round((done/steps.length)*100);
  const sC={complete:CGRN,in_progress:CB,pending:CG4};
  const sL={complete:"Complete",in_progress:"In progress",pending:"Pending"};
  const figC={preliminary:CAMB,adjusted:CB,final:CGRN,locked:CPURP};
  return <div>
    <AsOf period="Q2 FY2025" locked={locked}/>
    {locked&&<div style={{marginBottom:10,padding:"10px 14px",background:CPURPL,border:"1px solid "+CPURP,borderRadius:6,display:"flex",gap:10,alignItems:"center"}}><span>🔒</span><div><div style={{fontSize:12,fontWeight:700,color:CPURP}}>Period locked — no further changes permitted</div><div style={{fontSize:11,color:CPURP,opacity:0.8}}>Locked by {lockedBy} at {fmtDt(lockedAt)}.</div></div></div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
      {[{l:"Period",v:"Q2 FY2025",c:CBD},{l:"Figure status",v:calStatus.charAt(0).toUpperCase()+calStatus.slice(1),c:figC[calStatus]},{l:"Close progress",v:pct+"%",c:pct===100?CGRN:CB},{l:"Steps complete",v:done+"/"+steps.length,c:CGRN}].map(function(m){return <div key={m.l} style={{background:CW,border:"1px solid "+CG3,borderRadius:6,padding:"12px 14px"}}><div style={{fontSize:18,fontWeight:700,color:m.c,marginBottom:3}}>{m.v}</div><div style={{fontSize:11,color:CG4}}>{m.l}</div></div>;})}</div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={S.ct}>Close Checklist — Q2 FY2025</span><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{height:7,width:90,background:CG3,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct===100?CGRN:CB,borderRadius:4}}/></div><span style={{fontSize:11,color:CG4}}>{pct}%</span></div></div>
        {steps.map(function(step,i){return (
          <div key={step.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:i<steps.length-1?"1px solid "+CG3:"none"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:step.status==="complete"?CGRNL:CG0,border:"1px solid "+(sC[step.status]||CG4),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:sC[step.status],flexShrink:0,marginTop:1}}>{step.status==="complete"?"✓":i+1}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}><span style={{fontSize:12,fontWeight:500,color:step.status==="complete"?CG4:CG6}}>{step.name}</span><Tag txt={sL[step.status]||"?"} color={sC[step.status]||CG4} bg={(sC[step.status]||CG4)+"22"}/></div>
              <div style={{display:"flex",gap:12,fontSize:10,color:CG4}}><span>Owner: {step.owner}</span><span>Due: {step.due}</span>{step.at&&<span style={{color:CGRN}}>Done: {new Date(step.at).toLocaleDateString()}</span>}</div>
            </div>
            {step.status==="in_progress"&&role.canLock&&!locked&&<button onClick={function(){setSteps(function(prev){return prev.map(function(s){return s.id===step.id?{...s,status:"complete",at:now()}:s;});});}} style={{padding:"4px 9px",fontSize:11,border:"1px solid "+CGRN,borderRadius:3,background:CGRNL,color:CGRN,cursor:"pointer",flexShrink:0}}>Mark complete</button>}
          </div>
        );})}
      </div>
      <div>
        <div style={S.card}>
          <span style={S.ct}>Figure Status</span>
          <div style={{fontSize:11,color:CG5,marginBottom:8,lineHeight:1.5}}>Controls what version of figures display across the platform.</div>
          {["preliminary","adjusted","final"].map(function(status){return (
            <div key={status} onClick={function(){if(!locked&&role.canLock)setCalStatus(status);}} style={{padding:"8px 10px",border:"1px solid "+(calStatus===status?figC[status]:CG3),borderRadius:4,marginBottom:5,cursor:role.canLock&&!locked?"pointer":"default",background:calStatus===status?figC[status]+"11":CW}}>
              <div style={{fontSize:12,fontWeight:500,color:calStatus===status?figC[status]:CG6,textTransform:"capitalize"}}>{status}</div>
              <div style={{fontSize:10,color:CG4}}>{status==="preliminary"?"Sub-ledger complete":status==="adjusted"?"Accruals posted":"All adjustments complete"}</div>
            </div>
          );})}
          {!locked&&role.canLock&&<button onClick={function(){setLockModal(true);}} style={{padding:"6px 14px",fontSize:11,border:"1px solid "+CRED,borderRadius:4,background:CREDL,color:CRED,cursor:"pointer",width:"100%",marginTop:6,fontWeight:500}}>Lock period (irreversible)</button>}
        </div>
        <div style={S.card}>
          <span style={S.ct}>Period History</span>
          {[{p:"Q1 FY2025",d:"Apr 19, 2025"},{p:"Q4 FY2024",d:"Jan 22, 2025"},{p:"Q3 FY2024",d:"Oct 18, 2024"}].map(function(h){return <div key={h.p} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+CG3,fontSize:11}}><span style={{color:CG6,fontWeight:500}}>{h.p}</span><div style={{display:"flex",gap:6,alignItems:"center"}}><Tag txt="Locked" color={CPURP} bg={CPURPL}/><span style={{color:CG4}}>{h.d}</span></div></div>;})}</div>
      </div>
    </div>
    {lockModal&&<Mod title="Lock Period — Q2 FY2025" onClose={function(){setLockModal(false);}} w={460}>
      <div style={{padding:"9px 12px",background:CREDL,border:"1px solid "+CRED,borderRadius:4,marginBottom:12,fontSize:12,color:CRED}}>Warning: Locking is irreversible.</div>
      <div style={{marginBottom:10}}><label style={{fontSize:11,color:CG4,display:"block",marginBottom:4}}>Lock rationale (required)</label><textarea value={lockNote} onChange={function(e){setLockNote(e.target.value);}} placeholder="e.g. All close steps complete. CFO sign-off received." style={{...S.inp,minHeight:64,fontSize:12,resize:"vertical"}}/></div>
      <div style={{display:"flex",gap:8}}><button onClick={function(){if(!lockNote.trim())return;setLocked(true);setLockedBy(role.label);setLockedAt(now());setCalStatus("locked");setLockModal(false);setLockNote("");}} disabled={!lockNote.trim()} style={{padding:"6px 14px",fontSize:12,border:"1px solid "+CRED,borderRadius:4,background:CREDL,color:CRED,cursor:"pointer",opacity:lockNote.trim()?1:0.4,fontWeight:500}}>Confirm period lock</button><button onClick={function(){setLockModal(false);}} style={{...S.btn("ghost"),border:"1px solid "+CG3}}>Cancel</button></div>
    </Mod>}
  </div>;
}

// ═══ ROOT ══════════════════════════════════════════════════════════════════════
const TABS=[{id:"variance",label:"Variance narrative"},{id:"flux",label:"Flux report"},{id:"aihub",label:"AI Intelligence"},{id:"scenario",label:"Scenario & sensitivity"},{id:"sox",label:"SOX compliance"},{id:"period",label:"Period locking"}];

export default function App(){
  const [tab,setTab]=useState("variance");
  const [role,setRole]=useState(ROLES.cfo);
  const [approvedAnomalies,setApprovedAnomalies]=useState({});
  function onApprove(id,data){setApprovedAnomalies(function(p){return {...p,[id]:data};});}
  return <div style={S.app}>
    <div style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <svg width="24" height="17" viewBox="0 0 60 40" fill="none"><rect x="0" y="8" width="12" height="24" rx="2" fill={CW}/><rect x="16" y="0" width="12" height="40" rx="2" fill={CW}/><rect x="32" y="0" width="12" height="40" rx="2" fill={CW}/><rect x="48" y="8" width="12" height="24" rx="2" fill={CW}/></svg>
        <span style={{fontSize:14,fontWeight:600,color:CW}}>Finance Intelligence Platform</span>
        <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.2)",color:CW,padding:"2px 7px",borderRadius:3}}>POC</span>
      </div>
      <div style={{flex:1}}/>
      <RoleSwitcher role={role} setRole={setRole}/>
    </div>
    <div style={S.nav}>{TABS.map(function(t){return <button key={t.id} style={S.nb(tab===t.id)} onClick={function(){setTab(t.id);}}>{t.label}</button>;})}</div>
    <div style={S.main}>
      {tab==="variance"&&<VarianceTab role={role} approvedAnomalies={approvedAnomalies} onApprove={onApprove}/>}
      {tab==="flux"    &&<FluxTab role={role} approvedAnomalies={approvedAnomalies} onApprove={onApprove}/>}
      {tab==="aihub"   &&<AIHubTab role={role}/>}
      {tab==="scenario"&&<ScenarioTab role={role}/>}
      {tab==="sox"     &&<SOXTab role={role}/>}
      {tab==="period"  &&<PeriodTab role={role}/>}
    </div>
  </div>;
}
