import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import * as journalModule from '../../prototypes/firebase-spark-pwa/public/core/pending-meal-journal.mjs';
import * as trackerModule from '../../prototypes/firebase-spark-pwa/public/core/pending-meals.mjs';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

function storage() {
  const values = new Map();
  return { values, get length() { return values.size; }, key: i => [...values.keys()][i],
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
const scope = { uid: 'user', centerId: 'center', participantId: 'person' };
const meal = { mealDate: '2030-01-02', mealTypeId: 'lunch', mealWindowId: '2030-01-02_lunch', effect: 'ABSENT' };
function record(store, changes = {}) {
  const journal = journalModule.createPendingMealJournal({ storage: store });
  const value = { ...journal.create(scope, meal, 'PRESENT'), ...changes };
  journal.put(value); return value;
}

test('journal survives a new instance, isolates scope and stores only the permitted fields', () => {
  const store = storage(), value = record(store);
  const journal = journalModule.createPendingMealJournal({ storage: store });
  journal.put({ ...value, password: 'excluded', token: 'excluded', profile: { name: 'excluded' } });
  assert.deepEqual(journal.list(scope), [value]);
  for (const key of ['uid','centerId','participantId']) assert.deepEqual(journal.list({ ...scope, [key]: 'other' }), []);
  assert.ok(![...store.values.values()].join('').includes('excluded'));
  const other = record(store);
  journal.remove(value);
  assert.deepEqual(journal.list(scope), [other], 'completion cannot delete another request');
});

test('corrupt data and unavailable storage neither affect identity nor throw', () => {
  const store = storage(); store.setItem('auth', 'unchanged');
  const value = record(store);
  store.setItem(journalModule.mealJournalScope(scope)+'corrupt', '{bad');
  const journal = journalModule.createPendingMealJournal({ storage: store });
  assert.deepEqual(journal.list(scope), [value]);
  const denied = journalModule.createPendingMealJournal({ storage: { setItem() { throw Error('quota'); }, get length() { throw Error('denied'); } } });
  assert.equal(denied.put(value), false); assert.deepEqual(denied.list(scope), []);
  assert.equal(store.getItem('auth'), 'unchanged');
});

test('server verification requires exact request, identity, effect and confirmed metadata', async () => {
  const value = record(storage()); let currentUser = scope.uid, exists = true, reads = 0;
  let data = { ...value, actorUid: value.uid }, metadata = { fromCache: false, hasPendingWrites: false };
  const api = await loadBrowserModule('participant-data.js', { db: {}, getCurrentUser: () => ({ uid: currentUser }),
    getActiveCenterId: () => scope.centerId, doc: (...parts) => parts,
    getDocFromServer: async () => { reads++; return { exists: () => exists, data: () => data, metadata }; }
  }, ['verifyPendingMeal']);
  assert.equal((await api.verifyPendingMeal(value)).status, 'confirmed');
  for (const field of ['requestId','actorUid','effect','centerId','participantId','mealWindowId']) {
    data = { ...value, actorUid: value.uid, [field]: 'different' };
    assert.equal((await api.verifyPendingMeal(value)).status, 'unknown', field);
  }
  data = { ...value, actorUid: value.uid }; exists = false;
  assert.equal((await api.verifyPendingMeal(value)).status, 'unknown');
  exists = true;
  for (const flags of [{ fromCache: true, hasPendingWrites: false }, { fromCache: false, hasPendingWrites: true }, {}]) {
    metadata = flags; assert.equal((await api.verifyPendingMeal(value)).status, 'unknown');
  }
  const before = reads; currentUser = 'other';
  assert.equal((await api.verifyPendingMeal(value)).status, 'stale'); assert.equal(reads, before);
});

test('the single request ID survives retry and transaction fallback', async () => {
  for (const fallback of [false,true]) {
    const ids=[]; let attempts=0;
    const batch = { set: (_, data) => ids.push(data.requestId), update: (_, data) => ids.push(data.requestId),
      commit: async () => { attempts++; if (attempts===1) throw Object.assign(Error('retry'), { code: fallback?'permission-denied':'unavailable' }); } };
    const api = await loadBrowserModule('participant-data.js', { db:{}, getActiveCenterId:()=>scope.centerId,
      getCurrentUser:()=>({uid:scope.uid,isAnonymous:true}), writeBatch:()=>batch, doc:()=>({}),
      serverTimestamp:()=> 'server', crypto:{randomUUID:()=> 'wrong-id'}, setTimeout: fn=>{fn();},
      runTransaction: async (_, fn) => fn({ ...batch, get: async()=>({exists:()=>true}) })
    }, ['commitReservationMeals']);
    await api.commitReservationMeals({ participantId:'person', groupId:'group' },[{...meal}], 'PRESENT',
      { requestId:'stable',expectedUid:scope.uid,expectedCenterId:scope.centerId });
    assert.deepEqual(ids,['stable','stable']);
  }
});

function app(store, { verify = async()=>({status:'confirmed'}), save = async()=>{} } = {}) {
  let uid = scope.uid, imports = 0;
  const state = { mode:'week', selectedParticipant:{participantId:scope.participantId}, pendingMealKeys:new Set(),
    participantWeek:[{meals:[{...meal}]}],participantMonth:[],residentReady:true };
  const statuses=[], refreshes=[];
  const dependencies = { state, window:{localStorage:store,setTimeout,clearTimeout},
    getCurrentUser:()=>({uid}),getActiveCenterId:()=>scope.centerId,isConnectionAvailable:()=>true,
    getMealPendingKey:(date,type)=>date+'_'+type, t:key=>key,
    loadDomainModule:async name=>{imports++;return name==='mealJournal'?journalModule:name==='pendingMeals'?
      {createPendingMealTracker: options=>trackerModule.createPendingMealTracker({...options,schedule:()=>0,cancel(){}})}:
      {verifyPendingMeal:verify};},
    renderParticipantMeals(){},setParticipantStatus:text=>statuses.push(text),
    invalidateParticipantCalendarCache(){},scheduleBackgroundRefresh:reason=>refreshes.push(reason),
    scheduleMealRemindersFromCurrentCalendar(){},isMealWindowOpenAtServerTime:()=>true,
    friendlyErrorMessage:()=> 'failed', saveParticipantMeal:save
  };
  const api = functions(['getSingleMealTracker','storedPendingMealKeys','schedulePendingMealRecovery','reconcilePendingMeals',
    'renderPendingMealStatus','saveMealOptimistically','overlayPendingMeals','hasBlockingMealWrites','beginOptimisticBulkSelection'], dependencies);
  return {api,state,statuses,refreshes,dependencies,imports:()=>imports,changeUser:()=>{uid='other';},meal:state.participantWeek[0].meals[0]};
}

test('interrupted single write is persisted before sending and a reopened page only verifies it', async () => {
  const store=storage(); let sent;
  const first=app(store,{save:async(_,__,___,options)=>{sent=options;await new Promise(()=>{});}});
  void first.api.saveMealOptimistically({meal:first.meal,effect:'PRESENT',sync(){}});
  await turn();
  const [pending]=journalModule.createPendingMealJournal({storage:store}).list(scope);
  assert.equal(pending.requestId,sent.requestId);
  let writes=0,reads=0;
  const reopened=app(store,{verify:async value=>{reads++;assert.equal(value.requestId,pending.requestId);return {status:'confirmed'};},save:async()=>writes++});
  await reopened.api.saveMealOptimistically({meal:reopened.meal,effect:'ABSENT',sync(){}});
  assert.equal(writes,0,'the first touch after reopening cannot duplicate a saved pending operation');
  await reopened.api.reconcilePendingMeals();
  assert.equal(reads,1);assert.equal(writes,0);assert.equal(reopened.state.pendingMealKeys.size,0);
  assert.deepEqual(journalModule.createPendingMealJournal({storage:store}).list(scope),[]);
});

test('a read timeout does not erase the journal and a late read cannot apply a confirmation', async () => {
  const store=storage(); record(store);let finish,timeout;
  const h=app(store,{verify:()=>new Promise(resolve=>{finish=resolve;})});
  h.dependencies.window.setTimeout=fn=>{timeout=fn;return 1;};h.dependencies.window.clearTimeout=()=>{};
  const checking=h.api.reconcilePendingMeals();await turn();timeout();await checking;
  assert.equal(store.length,1);assert.equal(h.state.mealRecoveryRunning,false);
  finish({status:'confirmed'});await turn();
  assert.equal(store.length,1);assert.equal(h.state.pendingMealKeys.size,1);assert.equal(h.refreshes.length,0);
});

test('an explicit rejection after an uncertain retry does not prove that the first write failed', async () => {
  let attempts=0;
  const api=await loadBrowserModule('participant-data.js',{db:{},getActiveCenterId:()=>scope.centerId,
    getCurrentUser:()=>({uid:scope.uid,isAnonymous:true}),doc:()=>({}),serverTimestamp:()=> 'server',
    setTimeout:fn=>{fn();},crypto:{randomUUID:()=> 'unused'},
    writeBatch:()=>({set(){},commit:async()=>{throw Object.assign(Error('failed'),{code:++attempts===1?'unavailable':'permission-denied'});}}),
    runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>false})})
  },['commitReservationMeals']);
  await assert.rejects(api.commitReservationMeals({participantId:'person'},[{...meal}],'PRESENT',{requestId:'stable'}),error=>{
    assert.equal(error.mealWriteMayHaveCommitted,true);
    assert.equal(journalModule.isDefinitiveMealFailure(error),false);return true;
  });
});

test('a failure before submission is marked definitive and never starts a batch', async () => {
  const api=await loadBrowserModule('participant-data.js',{navigator:{onLine:false}},['saveParticipantMeal']);
  await assert.rejects(api.saveParticipantMeal({},meal,'PRESENT'),error=>{
    assert.equal(journalModule.isDefinitiveMealFailure(error),true);return true;
  });
});

test('denied journal storage still allows a confirmed save and reports the persistence limit', async () => {
  let writes=0;
  const denied={get length(){return 0;},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}};
  const h=app(denied,{save:async()=>writes++});
  await h.api.saveMealOptimistically({meal:h.meal,effect:'PRESENT',sync(){}});
  assert.equal(writes,1);assert.ok(h.statuses.includes('participant.meal.recovery.volatile'));
  assert.equal(h.state.pendingMealKeys.size,0);
});

test('uncertain recovery protects only that meal, excludes it from bulk and preserves current server data', async () => {
  const store=storage(); record(store);
  const h=app(store,{verify:async()=>({status:'unknown'})});
  await h.api.reconcilePendingMeals();
  assert.equal(h.state.pendingMealKeys.size,1);
  assert.equal(h.api.hasBlockingMealWrites(),false);
  h.api.overlayPendingMeals(h.state.participantWeek);
  assert.equal(h.meal.effect,'ABSENT');
  const other={...meal,mealTypeId:'dinner',mealWindowId:'2030-01-02_dinner',isOpen:true};
  h.meal.isOpen=true;
  const bulk=h.api.beginOptimisticBulkSelection([{meals:[h.meal,other]}],'PRESENT');
  assert.deepEqual(bulk.meals,[other]);
  assert.equal(h.statuses.at(-1),'participant.meal.recovery.unknown');
  assert.equal(store.length,1);
});

test('recovery never imports modules when this identity has no journal entries', () => {
  const store=storage();record(store,{uid:'other'});
  store.setItem(journalModule.mealJournalScope(scope)+'partial',JSON.stringify({schema:1,...scope,mealDate:meal.mealDate,mealTypeId:meal.mealTypeId}));
  const h=app(store);h.api.schedulePendingMealRecovery();assert.equal(h.imports(),0);
  assert.equal(h.api.storedPendingMealKeys().size,0);
});

test('late recovery cannot modify another user or remove the old record', async () => {
  const store=storage();record(store);let resolve;
  const h=app(store,{verify:()=>new Promise(yes=>{resolve=yes;})});
  const pending=h.api.reconcilePendingMeals();await turn();
  const statuses=h.statuses.length;h.changeUser();resolve({status:'confirmed'});await pending;
  assert.equal(h.statuses.length,statuses);assert.equal(store.length,1);assert.equal(h.refreshes.length,0);
});

test('a rejected promise with uncertain outcome retains the journal; explicit rejection removes it', async () => {
  for(const code of ['unavailable','permission-denied']){
    const store=storage();const h=app(store,{save:async()=>{throw Object.assign(Error(code),{code});},verify:async()=>({status:'unknown'})});
    await h.api.saveMealOptimistically({meal:h.meal,effect:'PRESENT',sync(){}});
    await turn();
    assert.equal(store.length,code==='unavailable'?1:0);
    assert.equal(h.state.pendingMealKeys.size,code==='unavailable'?1:0);
  }
});
