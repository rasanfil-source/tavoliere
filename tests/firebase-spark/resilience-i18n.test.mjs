import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CORE_FALLBACKS, KEY_ALIASES, SUPPORTED_LOCALES} from '../../prototypes/firebase-spark-pwa/public/i18n/i18n.mjs';
const root=new URL('../../prototypes/firebase-spark-pwa/public/',import.meta.url);
const app=readFileSync(new URL('app.js',root),'utf8');
const extract=name=>app.match(new RegExp(`function ${name}\\([^]*?\\n}`))[0];
test('all six languages have exact catalog fallbacks for personal and kitchen freshness',()=>{
 for(const locale of SUPPORTED_LOCALES){
  const catalog=JSON.parse(readFileSync(new URL(`i18n/${locale}.json`,root),'utf8'));
  for (const key of Object.keys(catalog).filter(key => key.startsWith('week.operations.'))) {
    assert.equal(CORE_FALLBACKS[locale][key], catalog[key], `${locale}: ${key}`);
  }
  for (const key of Object.keys(catalog).filter(key => key.startsWith('common.actions.'))) {
    assert.equal(CORE_FALLBACKS[locale][key], catalog[key]);
    assert.equal(KEY_ALIASES[key.replace('actions.', 'action.')], key);
  }
  for(const key of ['meal.type.breakfast','meal.type.lunch','meal.type.dinner','summary.view.todayTitle','app.title','app.title.kitchen','time.today','time.tomorrow','status.weekUpdated','status.monthUpdated','status.updatedAt','status.dataUpdatedAt','common.status.saved','calendar.status.extrasUnavailable']){
   assert.equal(CORE_FALLBACKS[locale][key],catalog[key],`${locale}: ${key}`);
   assert.equal(typeof CORE_FALLBACKS[locale][key],'string');
  }
 }
});
test('recovery retries are bounded, deduplicated and cancelled on navigation or pending writes',()=>{
 const timers=new Map(), delays=[], state={mode:'week'}, calls=[];let key='week:one',id=0;
 const context=vm.createContext({state,window:{setTimeout(fn,delay){timers.set(++id,fn);delays.push(delay);return id;},clearTimeout(id){timers.delete(id);}},
  buildRefreshContextKey:()=>key,getCurrentUser:()=>({uid:'same-user'}),isConnectionAvailable:()=>true,isResidentEntryGateClosed:()=>false,
  hasStrongAdministratorIdentity:()=>false,refreshNow:source=>calls.push(source)});
 vm.runInContext(extract('resetRecoveryRefresh')+'\n'+extract('scheduleRecoveryRefresh'),context);
 const fire=()=>{const fn=timers.get(id);timers.delete(id);fn();};
 for(let i=0;i<3;i++){context.scheduleRecoveryRefresh();context.scheduleRecoveryRefresh();fire();}
 context.scheduleRecoveryRefresh();assert.deepEqual(delays,[3000,10000,30000]);assert.equal(calls.length,3);
 context.resetRecoveryRefresh();context.scheduleRecoveryRefresh();key='week:two';fire();assert.equal(calls.length,3);
 context.scheduleRecoveryRefresh();state.pendingMealKeys=new Set(['meal']);fire();assert.equal(calls.length,3);
 context.resetRecoveryRefresh();assert.equal(state.recoveryRefreshAttempt,0);
});
test('watchdog works without modules, preserves storage and disappears after boot',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 const script=html.match(/<script data-startup-watchdog>([^]*?)<\/script>/)[1];
 for(const locale of SUPPORTED_LOCALES){
  const panels=[];let timer,reloads=0;
  const context={navigator:{language:locale},localStorage:{getItem:()=>locale},window:{setTimeout:fn=>{timer=fn;},location:{reload:()=>reloads++}},
   document:{body:{appendChild:node=>panels.push(node)},createElement:()=>({setAttribute(){},appendChild(child){this.child=child;}})}};
  vm.runInNewContext(script,context);timer();timer();assert.equal(panels.length,1);assert.ok(panels[0].textContent);
  panels[0].child.onclick();assert.equal(reloads,1);
  panels.length=0;context.window.__booted=true;timer();assert.equal(panels.length,0);
 }
});
