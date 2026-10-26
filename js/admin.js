/* Staff dashboard: access is validated from trusted app_metadata.role and enforced again by RLS. */
(() => {
  "use strict";
  const config = window.TSHWANE_CONFIG || {};
  const alertBox = document.getElementById("adminAlert");
  const app = document.getElementById("adminApp");
  const caseList = document.getElementById("caseList");
  const noticeList = document.getElementById("noticeList");
  const noticeMessage = document.getElementById("noticeMessage");
  let supabase = null;
  let user = null;
  let categories = [];
  let areas = [];
  let cases = [];
  let notices = [];
  const statuses = ["submitted","acknowledged","assigned","in_progress","awaiting_parts","resolved","closed","rejected"];
  const statusLabels = {submitted:"Submitted",acknowledged:"Acknowledged",assigned:"Assigned",in_progress:"In progress",awaiting_parts:"Awaiting parts",resolved:"Resolved",closed:"Closed",rejected:"Rejected"};
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; };
  const label = (s) => statusLabels[s] || String(s || "").replaceAll("_"," ");
  const dateLabel = (s) => { if(!s)return "Not specified"; const d=new Date(s); return Number.isNaN(d.getTime())?"Not specified":d.toLocaleString("en-ZA",{dateStyle:"medium",timeStyle:"short"}); };
  const message = (node, text, error=false) => { node.textContent=text; node.classList.toggle("text-danger",error); node.classList.toggle("text-success",!error && Boolean(text)); };
  const roleOf = (u) => u?.app_metadata?.role || "";
  const isStaff = (u) => ["staff","admin"].includes(roleOf(u));

  async function loadReferences(){
    const [c,a]=await Promise.all([
      supabase.from("service_categories").select("code,name").order("name"),
      supabase.from("service_areas").select("id,name").eq("active",true).order("name")
    ]);
    if(c.error)throw c.error;if(a.error)throw a.error;
    categories=c.data||[];areas=a.data||[];
    const categorySelect=document.getElementById("noticeCategory");
    categorySelect.replaceChildren(new Option("Choose category",""));
    categories.forEach(x=>categorySelect.add(new Option(x.name,x.code)));
    const areaSelect=document.getElementById("noticeArea");
    areaSelect.replaceChildren(new Option("All areas",""));
    areas.forEach(x=>areaSelect.add(new Option(x.name,x.id)));
  }

  function renderCase(item){
    const category=categories.find(x=>x.code===item.category_code)?.name||item.category_code;
    const area=areas.find(x=>x.id===item.area_id)?.name||"Area not specified";
    const card=el("article","border rounded-3 p-3 bg-white");
    const head=el("div","d-flex align-items-start justify-content-between gap-2 flex-wrap");
    const title=el("div","");
    title.append(el("h3","h6 fw-bold mb-1",category+" · "+item.reference_no));
    title.append(el("p","small text-muted mb-2",area+" · "+item.location_description+" · "+dateLabel(item.created_at)));
    head.append(title);
    const badges=el("div","d-flex gap-2 flex-wrap");
    badges.append(el("span","badge text-bg-secondary",label(item.status)));
    badges.append(el("span","badge "+(item.is_demo?"text-bg-warning":"text-bg-success"),item.is_demo?"DEMO RECORD":"RESIDENT REPORT"));
    head.append(badges);card.append(head);
    card.append(el("p","mb-3",item.description));
    const form=el("form","row g-2 align-items-end");
    const statusWrap=el("div","col-sm-4");
    statusWrap.append(el("label","form-label","Update status"));
    const select=el("select","form-select");select.setAttribute("aria-label","Status for "+item.reference_no);
    statuses.forEach(s=>select.add(new Option(label(s),s,s===item.status,s===item.status)));
    statusWrap.append(select);
    const noteWrap=el("div","col-sm-5");
    noteWrap.append(el("label","form-label","Progress note"));
    const note=el("input","form-control");note.maxLength=1500;note.placeholder="What changed?";note.setAttribute("aria-label","Progress note for "+item.reference_no);noteWrap.append(note);
    const internalWrap=el("div","col-sm-3 form-check pb-2");
    const internal=el("input","form-check-input");internal.type="checkbox";internal.id="internal-"+item.id;
    const internalLabel=el("label","form-check-label","Internal staff note");internalLabel.htmlFor=internal.id;internalWrap.append(internal,internalLabel);
    const btnWrap=el("div","col-12 d-flex gap-2 flex-wrap");
    const save=el("button","btn btn-green btn-sm","Save case update");save.type="submit";
    const noteResult=el("span","small align-self-center","");
    btnWrap.append(save,noteResult);form.append(statusWrap,noteWrap,internalWrap,btnWrap);card.append(form);
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      if(item.is_demo){noteResult.textContent="Demo cases are read-only in this dashboard.";return;}
      const next=select.value;const noteText=note.value.trim();
      if(next===item.status&&!noteText){noteResult.textContent="Choose a new status or enter a progress note.";return;}
      save.disabled=true;noteResult.textContent="Saving…";
      const patch={status:next,updated_at:new Date().toISOString()};
      if(next==="resolved"||next==="closed")patch.resolved_at=new Date().toISOString();
      else if(next!==item.status)patch.resolved_at=null;
      const upd=await supabase.from("service_requests").update(patch).eq("id",item.id).eq("is_demo",false);
      if(upd.error){save.disabled=false;noteResult.textContent="Update failed: "+upd.error.message;return;}
      if(noteText||next!==item.status){
        const ins=await supabase.from("service_request_updates").insert({
          request_id:item.id,author_id:user.id,message:noteText||("Case status changed to "+label(next)+"."),
          old_status:item.status,new_status:next===item.status?null:next,is_internal:internal.checked,is_demo:false
        });
        if(ins.error){save.disabled=false;noteResult.textContent="Status saved, but progress note failed: "+ins.error.message;await loadCases();return;}
      }
      noteResult.textContent="Saved.";await loadCases();
    });
    return card;
  }

  function renderCases(){
    const q=document.getElementById("caseSearch").value.trim().toLowerCase();
    const status=document.getElementById("statusFilter").value;
    const demo=document.getElementById("demoFilter").value;
    const filtered=cases.filter(x=>(!status||x.status===status)&&(demo==="all"||(demo==="demo"?x.is_demo:!x.is_demo))&&(!q||[x.reference_no,x.location_description,x.description,x.reporter_name,x.reporter_email].some(v=>String(v||"").toLowerCase().includes(q))));
    document.getElementById("openCount").textContent=cases.filter(x=>!["resolved","closed","rejected"].includes(x.status)).length;
    document.getElementById("highCount").textContent=cases.filter(x=>["high","emergency"].includes(x.priority)&&!["resolved","closed","rejected"].includes(x.status)).length;
    caseList.replaceChildren();
    if(!filtered.length){caseList.append(el("p","text-muted","No cases match this filter."));return;}
    filtered.forEach(x=>caseList.append(renderCase(x)));
  }

  async function loadCases(){
    caseList.replaceChildren(el("p","text-muted","Loading cases…"));
    const {data,error}=await supabase.from("service_requests").select("id,reference_no,submitted_by,category_code,area_id,location_description,description,priority,status,reporter_name,reporter_email,is_demo,created_at,updated_at").order("created_at",{ascending:false}).limit(200);
    if(error){caseList.replaceChildren(el("p","text-danger","Could not load cases: "+error.message));return;}
    cases=data||[];renderCases();
  }

  function renderNotice(item){
    const card=el("article","border rounded-3 p-3 bg-white");
    const head=el("div","d-flex justify-content-between align-items-start gap-2 flex-wrap");
    head.append(el("h3","h6 fw-bold mb-1",item.title));
    const badges=el("div","d-flex gap-2 flex-wrap");
    badges.append(el("span","badge text-bg-secondary",label(item.status)));
    badges.append(el("span","badge "+(item.is_demo?"text-bg-warning":"text-bg-info"),item.is_demo?"DEMO":"NOTICE"));
    head.append(badges);card.append(head);
    const cat=categories.find(x=>x.code===item.category_code)?.name||item.category_code;
    const area=areas.find(x=>x.id===item.area_id)?.name||"All areas";
    card.append(el("p","small text-muted mb-2",cat+" · "+area+" · "+item.notice_type+" · Starts "+dateLabel(item.starts_at)));
    card.append(el("p","mb-3",item.details));
    const controls=el("div","d-flex flex-wrap gap-2 align-items-center");
    const statusSelect=el("select","form-select form-select-sm");statusSelect.style.maxWidth="180px";
    ["draft","active","resolved","cancelled"].forEach(s=>statusSelect.add(new Option(label(s),s,s===item.status,s===item.status)));
    const publishedWrap=el("div","form-check");
    const pub=el("input","form-check-input");pub.type="checkbox";pub.checked=item.published;pub.id="pub-"+item.id;
    const pubLabel=el("label","form-check-label","Published");pubLabel.htmlFor=pub.id;publishedWrap.append(pub,pubLabel);
    const save=el("button","btn btn-outline-success btn-sm","Save notice");
    const result=el("span","small","");
    save.addEventListener("click",async()=>{
      save.disabled=true;result.textContent="Saving…";
      const upd=await supabase.from("service_notices").update({status:statusSelect.value,published:pub.checked,updated_at:new Date().toISOString()}).eq("id",item.id);
      save.disabled=false;
      if(upd.error){result.textContent="Failed: "+upd.error.message;return;}
      result.textContent="Saved.";await loadNotices();
    });
    controls.append(statusSelect,publishedWrap,save,result);card.append(controls);return card;
  }

  async function loadNotices(){
    noticeList.replaceChildren(el("p","text-muted","Loading notices…"));
    const {data,error}=await supabase.from("service_notices").select("id,title,category_code,notice_type,area_id,details,starts_at,expected_end_at,status,published,is_demo,created_by,created_at").order("created_at",{ascending:false}).limit(100);
    if(error){noticeList.replaceChildren(el("p","text-danger","Could not load notices: "+error.message));return;}
    notices=data||[];document.getElementById("noticeCount").textContent=notices.filter(n=>n.published&&n.status==="active").length;
    noticeList.replaceChildren();
    if(!notices.length)noticeList.append(el("p","text-muted","No notices found."));
    notices.forEach(n=>noticeList.append(renderNotice(n)));
  }

  function toIso(id){const value=document.getElementById(id).value;return value?new Date(value).toISOString():null;}
  async function createNotice(event){
    event.preventDefault();
    const action=event.submitter?.value||"draft";
    const title=document.getElementById("noticeTitle").value.trim();
    const details=document.getElementById("noticeDetails").value.trim();
    const starts=toIso("noticeStarts");const ends=toIso("noticeEnds");
    if(starts&&ends&&new Date(ends)<new Date(starts)){message(noticeMessage,"Expected end must be after the start time.",true);return;}
    const isDemo=document.getElementById("noticeDemo").checked;
    if(action==="publish"&&isDemo&&!/\bdemo\b/i.test(title)&&!/\bdemo\b/i.test(details)){
      message(noticeMessage,"Add the word DEMO to the title or details, or untick the demo checkbox only if the notice is verified.",true);return;
    }
    const payload={
      title,details,category_code:document.getElementById("noticeCategory").value,
      notice_type:document.getElementById("noticeType").value,
      area_id:document.getElementById("noticeArea").value||null,
      starts_at:starts,expected_end_at:ends,status:action==="publish"?"active":"draft",
      published:action==="publish",is_demo:isDemo,created_by:user.id
    };
    const buttons=Array.from(document.getElementById("noticeForm").querySelectorAll("button[type=submit]"));
    buttons.forEach(b=>b.disabled=true);message(noticeMessage,"Saving notice…");
    const {error}=await supabase.from("service_notices").insert(payload);
    buttons.forEach(b=>b.disabled=false);
    if(error){message(noticeMessage,"Could not save notice: "+error.message,true);return;}
    document.getElementById("noticeForm").reset();message(noticeMessage,action==="publish"?"Notice published.":"Draft saved.");
    await loadNotices();
  }

  async function init(){
    if(!window.supabase||!config.supabaseUrl||!config.supabasePublishableKey){
      alertBox.className="alert alert-warning";alertBox.textContent="Supabase configuration is missing. This page will not grant access without a valid project configuration.";return;
    }
    supabase=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);
    const {data,error}=await supabase.auth.getSession();
    if(error){alertBox.className="alert alert-danger";alertBox.textContent="Could not verify session: "+error.message;return;}
    user=data.session?.user||null;
    if(!user){alertBox.className="alert alert-warning";alertBox.textContent="Sign in through the resident portal first, then return here. A trusted staff/admin role is required.";return;}
    if(!isStaff(user)){alertBox.className="alert alert-danger";alertBox.textContent="Access denied. Your account does not have a trusted staff/admin role. Ask the project administrator to grant app_metadata.role through a secure administrative process.";return;}
    try{
      await loadReferences();app.classList.remove("d-none");
      alertBox.className="alert alert-success";alertBox.textContent="Staff access verified for "+user.email+". Database policies remain the final access-control boundary.";
      await Promise.all([loadCases(),loadNotices()]);
    }catch(e){alertBox.className="alert alert-danger";alertBox.textContent="Dashboard setup failed: "+e.message;}
    supabase.auth.onAuthStateChange((_event,session)=>{
      user=session?.user||null;
      if(!isStaff(user)){app.classList.add("d-none");alertBox.className="alert alert-danger";alertBox.textContent="Session ended or staff access is no longer available.";return;}
    });
  }
  document.getElementById("signOutButton").addEventListener("click",async()=>{if(supabase)await supabase.auth.signOut();window.location.href="municipal-services.html";});
  document.getElementById("refreshCases").addEventListener("click",loadCases);
  document.getElementById("refreshNotices").addEventListener("click",loadNotices);
  document.getElementById("caseSearch").addEventListener("input",renderCases);
  document.getElementById("statusFilter").addEventListener("change",renderCases);
  document.getElementById("demoFilter").addEventListener("change",renderCases);
  document.getElementById("noticeForm").addEventListener("submit",createNotice);
  init();
})();