'use strict';
const release='tat-icon-border-r1';
let installPrompt=null;
const install=document.querySelector('#install');
const status=document.querySelector('#install-status');
const standalone=()=>matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
function reportMode(){
  document.querySelector('#mode').textContent=standalone()?'Aperta come app: controlla l’icona sulla Home.':'Aperta nel browser.';
  if(standalone()){install.hidden=true;status.textContent='Questa è l’app di prova. Osserva il bordo sulla Home e registra il risultato qui sotto.';}
}
reportMode();
matchMedia('(display-mode: standalone)').addEventListener('change',reportMode);
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installPrompt=event;
  if(!standalone()){install.hidden=false;status.textContent='Il browser propone l’installazione dell’app di prova.';}
});
install.addEventListener('click',async()=>{
  if(!installPrompt)return;
  install.disabled=true;
  try{
    await installPrompt.prompt();const choice=await installPrompt.userChoice;
    status.textContent=choice.outcome==='accepted'?'Richiesta accettata. Attendi la comparsa di TAT Bordo 1 sulla Home.':'Installazione annullata. Puoi riprovare dal menu del browser.';
    installPrompt=null;install.hidden=true;
  }catch{status.textContent='Il browser non ha completato la richiesta. Prova dal suo menu.';}
  finally{install.disabled=false;}
});
window.addEventListener('appinstalled',()=>{install.hidden=true;installPrompt=null;status.textContent='Installazione segnalata dal browser. Apri TAT Bordo 1 dalla Home.';});
async function diagnostics(){
  let worker='non disponibile';
  if('serviceWorker' in navigator){
    try{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;worker='pronto';}
    catch{worker='registrazione non riuscita';}
  }
  const response=await fetch('/manifest.webmanifest',{cache:'no-store'}).catch(()=>null);
  const manifest=response?.ok?await response.json():null;
  document.querySelector('#diagnostics').textContent=[`Versione: ${release}`,`Connessione sicura: ${isSecureContext?'sì':'no'}`,`Avvio: ${standalone()?'standalone':'browser'}`,`Worker: ${worker}`,`Manifest: ${manifest?.short_name||'non disponibile'}`,`Identità: ${manifest?.id||'non disponibile'}`].join('\n');
}
diagnostics().catch(()=>{document.querySelector('#diagnostics').textContent='Diagnostica non disponibile. Ricarica la pagina.';});
document.querySelector('#save').addEventListener('click',()=>{
  const device=document.querySelector('#device').value;
  if(!device){document.querySelector('#result-status').textContent='Seleziona prima il dispositivo.';document.querySelector('#device').focus();return;}
  const result={release,time:new Date().toISOString(),device,border:document.querySelector('[name=border]:checked').value,installation:document.querySelector('#installation').value,standalone:standalone(),userAgent:navigator.userAgent};
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='tat-prova-bordo-r1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  document.querySelector('#result-status').textContent='Resoconto preparato per il download. Nessun dato inviato.';
});
