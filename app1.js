/*************************************************
 PHASE 0 + 1 + 2 + 3 + 4 – FINAL STABLE (FIXED)
 FILE: app1.js
*************************************************/
/* ================= SHORTCUT ================= */
const $ = id => document.getElementById(id);

/* ================= GLOBAL ================= */
let screens = {};
let breadcrumb, popup, userInfo;
let pendingLL = { truckNo: null, bay: null };

const SESSION_TIMEOUT = 10 * 60 * 1000;

/* ================= INIT ================= */
window.onload = () => {

  screens = {
  login: $("loginScreen"),
  signup: $("signupScreen"),
  reset: $("resetScreen"),
  home: $("homeScreen"),

  entry: $("entryScreen"),
  calibration: $("calibrationScreen"),

  llConfirm: $("llConfirmScreen"),
  localLoading: $("localLoadingScreen"),

  /* ===== PHASE 5 ===== */
analysisHome: $("analysisHomeScreen"),
  truckAnalysis: $("truckAnalysisScreen"),
  bayAnalysis: $("bayAnalysisScreen"),
  alert: $("alertScreen")
};


  breadcrumb = $("breadcrumb");
  popup = $("popup");
  userInfo = $("userInfo");

  attachLocalLoadingAutoCalc();

  getCurrentUser() ? showHome() : openLogin();
};

/* ================= COMMON ================= */
function hideAllScreens() {
  Object.values(screens).forEach(s => {
    if (s) s.classList.add("hidden");
  });
}

function popupMsg(msg) {
  popup.innerText = msg;
  popup.style.display = "block";
  setTimeout(() => popup.style.display = "none", 3000);
}

/* ================= USERS ================= */
function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "{}");
}
function saveUsers(u) {
  localStorage.setItem("users", JSON.stringify(u));
}
function setSession(u) {
  localStorage.setItem("currentUser", u);
  localStorage.setItem("lastActivity", Date.now());
}
function getCurrentUser() {
  return localStorage.getItem("currentUser");
}
function clearSession() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("lastActivity");
}

/* ================= AUTH ================= */
function openLogin() {
  hideAllScreens();
  screens.login.classList.remove("hidden");
  breadcrumb.innerText = "Login";
}
function openSignup() {
  hideAllScreens();
  screens.signup.classList.remove("hidden");
  breadcrumb.innerText = "Sign Up";
}
function openReset() {
  hideAllScreens();
  screens.reset.classList.remove("hidden");
  breadcrumb.innerText = "Reset Password";
}

function login() {
  const u = $("loginUser").value.trim().toUpperCase();
  const p = $("loginPass").value;
  const users = getUsers();
  if (!users[u] || users[u] !== p) return popupMsg("Invalid credentials");
  setSession(u);
  showHome();
}

function signup() {
  const u = $("signupUser").value.trim().toUpperCase();
  const p = $("signupPass").value;
  const users = getUsers();
  if (!u || !p) return popupMsg("All fields required");
  if (users[u]) return popupMsg("User already exists");
  users[u] = p;
  saveUsers(users);
  popupMsg("Account created");
  openLogin();
}

function resetPassword() {
  const u = $("resetUser").value.trim().toUpperCase();
  const p = $("resetPass").value;
  const users = getUsers();
  if (!users[u]) return popupMsg("User not found");
  users[u] = p;
  saveUsers(users);
  popupMsg("Password reset successful");
  openLogin();
}

/* ================= HOME ================= */
function showHome() {
  hideAllScreens();
  screens.home.classList.remove("hidden");
  breadcrumb.innerText = "Home";
  userInfo.innerHTML = `Logged in as <b>${getCurrentUser()}</b>`;
}
function goHome() { showHome(); }
function logout() { clearSession(); location.reload(); }

/* ================= PHASE 5 – ANALYSIS NAVIGATION ================= */

function openAnalysisHome(){
  hideAllScreens();
  $("analysisHomeScreen").classList.remove("hidden");
  breadcrumb.innerText = "Home > Analysis";
}

function openTruckAnalysis() {
  hideAllScreens();
  screens.truckAnalysis.classList.remove("hidden");
  breadcrumb.innerText = "Home > Analysis > Truck";
}

function openBayAnalysis() {
  hideAllScreens();
  screens.bayAnalysis.classList.remove("hidden");
  breadcrumb.innerText = "Home > Analysis > Bay";
}

function openAlertAnalysis() {
  hideAllScreens();
  screens.alert.classList.remove("hidden");
  breadcrumb.innerText = "Home > Analysis > Alerts";
}


/* ================= AUTO LOGOUT ================= */
setInterval(() => {
  const last = Number(localStorage.getItem("lastActivity"));
  if (getCurrentUser() && last && Date.now() - last > SESSION_TIMEOUT) {
    alert("Session expired");
    logout();
  }
}, 30000);

["click","keypress","touchstart"].forEach(evt =>
  document.addEventListener(evt, () => {
    if (getCurrentUser())
      localStorage.setItem("lastActivity", Date.now());
  })
);

/* ================= PHASE 2 – TRUCK ENTRY ================= */
function openEntry() {
  hideAllScreens();
  screens.entry.classList.remove("hidden");
  breadcrumb.innerText = "Home > Truck Entry";
}

function getTruckData() {
  return JSON.parse(localStorage.getItem("truckData") || "[]");
}
function saveTruckData(d) {
  localStorage.setItem("truckData", JSON.stringify(d));
}

function saveTruck() {
  const date = $("date").value;
  const truckNo = $("truckNo").value.trim().toUpperCase();
  const bay = Number($("bayNo").value);

  if (!date || !truckNo || bay < 1 || bay > 8)
    return popupMsg("Invalid input");

  const comps = [1,2,3,4,5].map(i => Number($("comp"+i).value || 0));
  const abnormal = comps.some(v => Math.abs(v) >= 3);
  const needLL = comps.some(v => Math.abs(v) >= 4);

  const data = getTruckData();
  const count = data.filter(x => x.truckNo === truckNo).length;

  data.push({ date, truckNo, bay, comps, abnormal, enteredBy: getCurrentUser() });
  saveTruckData(data);

  popupMsg(`Truck checked ${count+1} time(s)` + (abnormal ? " | Abnormal" : ""));

  if (needLL) {
    pendingLL = { truckNo, bay };
    openLLConfirm(truckNo);
  }

  screens.entry.querySelectorAll("input").forEach(i => i.value = "");
}

function downloadTruckCSV() {
  const d = getTruckData();
  if (!d.length) return popupMsg("No data");

  let csv = "Date,Truck,Bay,C1,C2,C3,C4,C5,Abnormal,EnteredBy\n";
  d.forEach(r => {
    csv += `${r.date},${r.truckNo},${r.bay},${r.comps.join(",")},${r.abnormal?"YES":"NO"},${r.enteredBy}\n`;
  });
  downloadFile(csv, "Truck_Data.csv");
}

/* ================= PHASE 3 – CALIBRATION ================= */
function openCalibration() {
  hideAllScreens();
  screens.calibration.classList.remove("hidden");
  breadcrumb.innerText = "Home > Calibration";
}

function getCalibrationData() {
  return JSON.parse(localStorage.getItem("calibrationData") || "{}");
}

function saveCalibration() {
  const t = $("calTruckNo").value.trim().toUpperCase();
  const d = $("calDate").value;
  if (!t || !d) return popupMsg("Enter Truck & Date");

  const c = getCalibrationData();
  c[t] = { date: d, enteredBy: getCurrentUser() };
  localStorage.setItem("calibrationData", JSON.stringify(c));
  popupMsg("Calibration saved");
}

function showCalibrations() {
  const c = getCalibrationData();
  const t = getTruckData();
  if (!Object.keys(c).length) {
    $("calibrationTable").innerHTML = "No data";
    return;
  }

  let html = "<table><tr><th>Truck</th><th>Date</th><th>Check1</th><th>Check2</th><th>Check3</th></tr>";
  Object.keys(c).forEach(k => {
    const cd = new Date(c[k].date);
    const cnt = t.filter(x => x.truckNo === k && new Date(x.date) >= cd).length;
    html += `<tr>
      <td>${k}</td>
      <td>${c[k].date}</td>
      <td>${cnt>=1?"DONE":""}</td>
      <td>${cnt>=2?"DONE":""}</td>
      <td>${cnt>=3?"DONE":""}</td>
    </tr>`;
  });
  $("calibrationTable").innerHTML = html + "</table>";
}

function downloadCalibrationCSV() {
  const c = getCalibrationData();
  const t = getTruckData();
  let csv = "Truck,Calibration Date,Check1,Check2,Check3,EnteredBy\n";
  Object.keys(c).forEach(k => {
    const cd = new Date(c[k].date);
    const cnt = t.filter(x => x.truckNo === k && new Date(x.date) >= cd).length;
    csv += `${k},${c[k].date},${cnt>=1?"DONE":""},${cnt>=2?"DONE":""},${cnt>=3?"DONE":""},${c[k].enteredBy}\n`;
  });
  downloadFile(csv, "Calibration_Data.csv");
}

/* ================= PHASE 4 – LOCAL LOADING ================= */
function openLLConfirm(truckNo) {
  hideAllScreens();
  screens.llConfirm.classList.remove("hidden");
  breadcrumb.innerText = "Local Loading Confirmation";
  $("llConfirmText").innerText =
    `Variation ≥ 4 mm observed for TT ${truckNo}.\nWas local loading given?`;
}
function llConfirmYes() {
  openLocalLoadingAuto(pendingLL.truckNo, pendingLL.bay);
}
function llConfirmNo() {
  pendingLL = { truckNo:null, bay:null };
  goHome();
}

function openLocalLoading() {
  hideAllScreens();
  screens.localLoading.classList.remove("hidden");
  breadcrumb.innerText = "Home > Local Loading";
}

function openLocalLoadingAuto(truckNo, bay) {
  openLocalLoading();
  $("llType").value = "TANKER";
  toggleLocalLoadingType();
  $("llTruckNo").value = truckNo;
  $("llBay").value = bay;
}

function toggleLocalLoadingType() {
  $("llTanker").classList.add("hidden");
  $("llOther").classList.add("hidden");
  if ($("llType").value === "TANKER") $("llTanker").classList.remove("hidden");
  if (["OWN_USE","OTHERS"].includes($("llType").value))
    $("llOther").classList.remove("hidden");
}

function attachLocalLoadingAutoCalc() {
  [1,2,3,4,5].forEach(i => {
    $("ll"+i)?.addEventListener("input", () => {
      const total = [1,2,3,4,5].reduce((s,j)=>s+Number($("ll"+j).value||0),0);
      $("llTotal").value = total;
    });
  });
}

function getLocalLoadingData() {
  return JSON.parse(localStorage.getItem("localLoading") || "[]");
}

function saveLocalLoading() {
  const type = $("llType").value;
  if (!type) return popupMsg("Select type");

  const d = getLocalLoadingData();
const llDate = $("llDate").value || new Date().toISOString().slice(0,10);

let e = {
  date: llDate,
  type,
  enteredBy:getCurrentUser()
};


  if (type === "TANKER") {
    e.truckNo = $("llTruckNo").value;
    e.bay = $("llBay").value;
    e.total = $("llTotal").value;
  } else {
    e.bay = $("llBayOther").value;
    e.total = $("llQtyOther").value;
    e.details = $("llDetails").value;
  }

  d.push(e);
  localStorage.setItem("localLoading", JSON.stringify(d));
popupMsg("Local loading saved");
clearLocalLoadingForm();

}

function clearLocalLoadingForm(){

  $("llDate").value="";
  $("llType").value="";

  $("llTruckNo").value="";
  $("llBay").value="";
  $("ll1").value="";
  $("ll2").value="";
  $("ll3").value="";
  $("ll4").value="";
  $("ll5").value="";
  $("llTotal").value="";

  $("llBayOther").value="";
  $("llQtyOther").value="";
  $("llDetails").value="";

  $("llTanker").classList.add("hidden");
  $("llOther").classList.add("hidden");
}

function downloadLocalLoadingCSV() {
  const d = getLocalLoadingData();
  let csv = "Date,Type,Truck,Bay,Total,Details,EnteredBy\n";
  d.forEach(x => {
    csv += `${x.date},${x.type},${x.truckNo||""},${x.bay||""},${x.total||""},${x.details||""},${x.enteredBy}\n`;
  });
  downloadFile(csv, "Local_Loading.csv");
}

/* ================= UTIL ================= */
function downloadFile(content, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], {type:"text/csv"}));
  a.download = filename;
  a.click();
}

/* ================= PHASE 5 – ANALYSIS NAVIGATION ================= */

function openAnalysisHome(){
  hideAllScreens();
  screens.analysisHome.classList.remove("hidden");
  breadcrumb.innerText="Home > Analysis";
}

function openTruckAnalysis(){
  hideAllScreens();
  screens.truckAnalysis.classList.remove("hidden");
  breadcrumb.innerText="Home > Analysis > Truck";
}

function openBayAnalysis(){
  hideAllScreens();
  screens.bayAnalysis.classList.remove("hidden");
  breadcrumb.innerText="Home > Analysis > Bay";
}

function openAlertAnalysis(){
  hideAllScreens();
  screens.alert.classList.remove("hidden");
  breadcrumb.innerText="Home > Analysis > Alerts";
}

/*************************************************
 PHASE 5 – FINAL ANALYSIS ENGINE (STABLE)
*************************************************/

/* ===== DATE FILTER ENGINE ===== */

function getFilteredTruckData(type){

  const all=getTruckData();
  const filter=$(type+"DateFilter")?.value;
  const from=$(type+"FromDate")?.value;
  const to=$(type+"ToDate")?.value;

  let startDate=null,endDate=new Date();

  if(filter==="30"){
    startDate=new Date();
    startDate.setDate(endDate.getDate()-30);
  }
  else if(filter==="60"){
    startDate=new Date();
    startDate.setDate(endDate.getDate()-60);
  }
  else if(filter==="custom" && from && to){
    startDate=new Date(from);
    endDate=new Date(to);
  }

  if(!startDate) return all;

  return all.filter(x=>{
    const d=new Date(x.date);
    return d>=startDate && d<=endDate;
  });
}

function getFilteredLocalLoading(){

  const ll=getLocalLoadingData();
  const filter=$("truckDateFilter")?.value;
  const from=$("truckFromDate")?.value;
  const to=$("truckToDate")?.value;

  let startDate=null,endDate=new Date();

  if(filter==="30"){
    startDate=new Date();
    startDate.setDate(endDate.getDate()-30);
  }
  else if(filter==="60"){
    startDate=new Date();
    startDate.setDate(endDate.getDate()-60);
  }
  else if(filter==="custom" && from && to){
    startDate=new Date(from);
    endDate=new Date(to);
  }

  if(!startDate) return ll;

  return ll.filter(x=>{
    const d=new Date(x.date);
    return d>=startDate && d<=endDate;
  });
}
/* ===== LOCAL LOADING FILTER FOR BAY ANALYSIS ===== */
function getFilteredLocalLoadingBay(){

  const ll = getLocalLoadingData();

  const filter = $("bayDateFilter")?.value;
  const from = $("bayFromDate")?.value;
  const to = $("bayToDate")?.value;

  let startDate=null,endDate=new Date();

  if(filter==="30"){
    startDate=new Date();
    startDate.setDate(endDate.getDate()-30);
  }
  else if(filter==="60"){
    startDate=new Date();
    startDate.setDate(endDate.getDate()-60);
  }
  else if(filter==="custom" && from && to){
    startDate=new Date(from);
    endDate=new Date(to);
  }

  if(!startDate) return ll;

  return ll.filter(x=>{
    const d=new Date(x.date);
    return d>=startDate && d<=endDate;
  });
}


/* ===== DATE INPUT VISIBILITY ===== */

function toggleTruckCustomDate(){
  const show=$("truckDateFilter").value==="custom";
  $("truckFromDate").style.display=show?"block":"none";
  $("truckToDate").style.display=show?"block":"none";
}

function toggleBayCustomDate(){
  const show=$("bayDateFilter").value==="custom";
  $("bayFromDate").style.display=show?"block":"none";
  $("bayToDate").style.display=show?"block":"none";
}

function toggleAlertCustomDate(){
  const show=$("alertDateFilter").value==="custom";
  $("alertFromDate").style.display=show?"block":"none";
  $("alertToDate").style.display=show?"block":"none";
}

/* ===== TRUCK ANALYSIS ===== */

function buildTruckAnalysis(){

  const trucks=getFilteredTruckData("truck");
  const ll=getFilteredLocalLoading();

  const totalEntries=trucks.length;
  const abnormal=trucks.filter(x=>x.abnormal).length;
  const tankerLL = ll.filter(x =>
  x.type==="TANKER" &&
  x.truckNo && x.truckNo.trim() !== ""
).length;


  $("truckSummary").innerHTML=
    `<b>Total Entries:</b> ${totalEntries}<br>
     <b>Abnormal Variations:</b> ${abnormal}<br>
     <b>Tanker Local Loading:</b> ${tankerLL}`;

  drawTruckPie(totalEntries,abnormal,tankerLL);
}

function drawTruckPie(total,abnormal,ll){

  const ctx=$("truckPieChart").getContext("2d");
  if(window.truckChart) window.truckChart.destroy();

  window.truckChart=new Chart(ctx,{
    type:'pie',
    data:{
      labels:["Normal","Abnormal","Local Loading"],
      datasets:[{data:[total-abnormal,abnormal,ll]}]
    }
  });
}

function searchTruckAnalysis(){

  const truckNo=$("searchTruckNo").value.trim().toUpperCase();
  if(!truckNo) return popupMsg("Enter Truck Number");

  const trucks=getFilteredTruckData("truck").filter(x=>x.truckNo===truckNo);
  const ll=getFilteredLocalLoading().filter(x=>x.truckNo===truckNo);

  let html=`<b>Checked:</b> ${trucks.length}<br>
            <b>Abnormal Count:</b> ${trucks.filter(x=>x.abnormal).length}<br>
            <b>Local Loading:</b> ${ll.length}<hr>`;

  const abnormalRows=trucks.filter(x=>x.abnormal);

  if(abnormalRows.length){
    html+="<table><tr><th>Date</th><th>Bay</th><th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th><th>User</th></tr>";

    abnormalRows.forEach(r=>{
      html+=`<tr>
      <td>${r.date}</td>
      <td>${r.bay}</td>
      <td>${r.comps[0]}</td>
      <td>${r.comps[1]}</td>
      <td>${r.comps[2]}</td>
      <td>${r.comps[3]}</td>
      <td>${r.comps[4]}</td>
      <td>${r.enteredBy}</td>
      </tr>`;
    });

    html+="</table>";
  }

  $("truckDetailResult").innerHTML=html;
}

function clearTruckSearch(){
  $("searchTruckNo").value="";
  $("truckDetailResult").innerHTML="";
}

/* ===== BAY ANALYSIS ===== */

function buildBayAnalysis(){

  const bay=$("baySelect").value;
  const allData=getFilteredTruckData("bay");

  const trucks = bay==="ALL"
    ? allData
    : allData.filter(x=>String(x.bay)===bay);

  const ll = getFilteredLocalLoadingBay().filter(x =>
  x.type==="TANKER" &&
  x.truckNo &&
  (bay==="ALL" || String(x.bay)===bay)
);


  const abnormal=trucks.filter(x=>x.abnormal).length;

  $("baySummary").innerHTML=
    `<b>Total Trucks:</b> ${trucks.length}<br>
     <b>Abnormal:</b> ${abnormal}<br>
     <b>Tanker Local Loading:</b> ${ll.length}`;

  drawBayBar(trucks.length,abnormal,ll.length);
}

function drawBayBar(total,abnormal,ll){

  const ctx=$("bayBarChart").getContext("2d");
  if(window.bayChart) window.bayChart.destroy();

  window.bayChart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:["Total","Abnormal","Local Loading"],
      datasets:[{data:[total,abnormal,ll]}]
    }
  });
}
/* ===== ALERT ANALYSIS ===== */

/* ===== FINAL ALERT ANALYSIS ===== */

function buildAlertAnalysis(){

  const trucks = getFilteredTruckData("alert");
  const llAll = getLocalLoadingData().filter(x=>x.type==="TANKER");

  let html = "";

  /* =====================================================
     1️⃣ ABNORMAL TRUCK VARIATION TABLE
  ===================================================== */

  const abnormalRows = trucks.filter(r => r.abnormal);

  html += `<h4>🚨 Abnormal Truck Variations</h4>`;
  html += `<b>Total Trucks with Abnormal Variation :</b> ${abnormalRows.length}<br>`;

  if(abnormalRows.length){

    html += `<table>
      <tr>
        <th>Date</th><th>TT Number</th><th>Bay</th>
        <th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th>
        <th>User</th>
      </tr>`;

    abnormalRows.forEach(r=>{
      html+=`<tr>
        <td>${r.date}</td>
        <td>${r.truckNo}</td>
        <td>${r.bay}</td>
        <td>${r.comps[0]}</td>
        <td>${r.comps[1]}</td>
        <td>${r.comps[2]}</td>
        <td>${r.comps[3]}</td>
        <td>${r.comps[4]}</td>
        <td>${r.enteredBy}</td>
      </tr>`;
    });

    html+="</table>";
  }

  /* =====================================================
     2️⃣ BAY ALERT — LOCAL LOADING ≥3 WITHIN 8 DAYS
  ===================================================== */

  html += `<h4>🅿️ Bay Alerts</h4>`;

  const bayMap = {};
  const now = new Date();

  llAll.forEach(e=>{
    const d = new Date(e.date);
    const diff = (now-d)/(1000*60*60*24);
    if(diff<=8){
      if(!bayMap[e.bay]) bayMap[e.bay]=[];
      bayMap[e.bay].push(e);
    }
  });

  let bayAlertFound=false;

  Object.keys(bayMap).forEach(bay=>{
    const list = bayMap[bay];

    if(list.length>=3){

      bayAlertFound=true;

      const firstDate = new Date(list[0].date);
      const days = Math.round((now-firstDate)/(1000*60*60*24));

      html += `<p style="color:red"><b>Bay No ${bay} FLAGGED — Local loading ${list.length} times in last ${days} days</b></p>`;

      html += `<table>
        <tr><th>Date</th><th>TT Number</th><th>Bay</th><th>Total</th><th>User</th></tr>`;

      list.forEach(x=>{
        html+=`<tr>
          <td>${x.date}</td>
          <td>${x.truckNo||""}</td>
          <td>${x.bay}</td>
          <td>${x.total||""}</td>
          <td>${x.enteredBy}</td>
        </tr>`;
      });

      html+="</table>";
    }
  });

  if(!bayAlertFound){
    html+=`<p>No Alerts for Bay</p>`;
  }

  /* =====================================================
     3️⃣ TRUCK CALIBRATION ALERT ≥2 LOCAL LOADING IN 15 DAYS
  ===================================================== */

  html += `<h4>🚛 Truck Calibration Alerts</h4>`;

  const truckLLMap={};

  llAll.forEach(e=>{
    const d=new Date(e.date);
    const diff=(now-d)/(1000*60*60*24);

    if(diff<=15){
      if(!truckLLMap[e.truckNo]) truckLLMap[e.truckNo]=[];
      truckLLMap[e.truckNo].push(e);
    }
  });

  Object.keys(truckLLMap).forEach(tt=>{

    const list = truckLLMap[tt];

    if(list.length>=2){

      const firstDate=new Date(list[0].date);
      const days=Math.round((now-firstDate)/(1000*60*60*24));

      html+=`<p style="color:red"><b>
        TT ${tt} received local loading ${list.length} times in last ${days} days.
        Please check calibration.
      </b></p>`;

      html+=`<table>
        <tr><th>Date</th><th>TT Number</th><th>Bay</th><th>Total</th><th>User</th></tr>`;

      list.forEach(x=>{
        html+=`<tr>
          <td>${x.date}</td>
          <td>${x.truckNo}</td>
          <td>${x.bay}</td>
          <td>${x.total}</td>
          <td>${x.enteredBy}</td>
        </tr>`;
      });

      html+="</table>";
    }
  });

  $("alertTable").innerHTML = html;
}
/* ===== SHOW ALL LOCAL LOADING (BAY ANALYSIS) ===== */

function showAllLocalLoading(){

 const data = getFilteredLocalLoadingBay();

  if(!data.length){
    $("bayAlertResult").innerHTML = "No Local Loading Data";
    return;
  }

  let html = "<h4>Local Loading Details</h4>";
  html += "<table><tr><th>Date</th><th>Type</th><th>TT Number</th><th>Bay</th><th>Total</th><th>Details</th><th>User</th></tr>";

  data.forEach(x=>{
html += `<tr>
  <td>${x.date}</td>
  <td>${x.type}</td>
  <td>${x.truckNo||""}</td>
  <td>${x.bay||""}</td>
  <td>${x.total||""}</td>
  <td>${x.details||""}</td>
  <td>${x.enteredBy}</td>
</tr>`;
  });

  html += "</table>";

  $("bayAlertResult").innerHTML = html;
}

