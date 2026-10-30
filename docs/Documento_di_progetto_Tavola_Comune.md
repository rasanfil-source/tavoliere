# Tavola Comune

Specifica funzionale e tecnica del sistema Tavola Comune

Questa specifica descrive le funzioni, l’architettura e i vincoli operativi del sistema.

| Campo | Valore |
| --- | --- |
| Prodotto | PWA per prenotazioni pasti e coordinamento operativo di piccoli centri/comunità |
| Tecnologia | Firebase Hosting + Authentication + Cloud Firestore, piano Spark |
| Stato documento | Specifica tecnica di riferimento |
| Destinatari | Committente, responsabile di centro, team UX/UI, sviluppo, test e gestione operativa |

> **TESI PROGETTUALE**  
> Un unico applicativo mobile-first consente ai residenti di dichiarare le presenze ai pasti, agli operatori autorizzati di organizzare la giornata e alla cucina di preparare quantità e varianti senza esporre dati personali non necessari.

Base documentale: codice applicativo, configurazione Firebase, Security Rules, test automatici e documentazione operativa presenti nel workspace.

## Indice

- 1. Sintesi esecutiva

- 2. Contesto, obiettivi e principi

- 3. Perimetro del prodotto

- 4. Utenti, ruoli e autorizzazioni

- 5. Architettura informativa e navigazione

- 6. Requisiti funzionali

- 7. Regole di dominio

- 8. Modello dati

- 9. Architettura tecnica

- 10. Sicurezza, privacy e protezione del dato

- 11. Requisiti non funzionali e PWA

- 12. Gestione operativa, quote e continuità

- 13. Strategia di test e criteri di accettazione

- 14. Aree funzionali

- 15. Rischi, vincoli ed esclusioni

- 16. Matrice di tracciabilità

- 17. Glossario e riferimenti tecnici

La specifica descrive le funzioni, l'architettura e i vincoli operativi definiti dal sistema.

## 1. Sintesi esecutiva

Tavola Comune è una Progressive Web App responsive per piccoli centri, comunità o strutture che organizzano colazione, pranzo e cena. Il prodotto riduce telefonate, fogli informali e riconciliazioni manuali, fornendo un dato unico e aggiornato sulle presenze e sulle esigenze operative della giornata.

L'esperienza varia in base al contesto: il residente usa il calendario mensile o settimanale; il responsabile e i collaboratori autorizzati usano l'agenda e il pannello di controllo; la cucina consulta una vista minimizzata con conteggi, diete, pasti per ammalati, celebrazioni e note. Il sistema supporta più centri, pur mantenendo ogni dato segregato per centro.

> **DECISIONE ARCHITETTURALE**  
> Il prodotto funziona senza Cloud Functions, Cloud Storage o servizi a pagamento: il client gestisce la logica interattiva e Firestore Security Rules garantiscono l'enforcement autorizzativo e temporale.

| Dimensione | Scelta di progetto |
| --- | --- |
| Canale | Web app installabile, con manifest distinti per residenti e cucina |
| Utenti ordinari | Accesso amichevole tramite sigla e password comune, persistente sul dispositivo |
| Amministrazione | Accesso Google o email/password, ruoli per centro e inviti |
| Dati | Cloud Firestore, collezioni isolate sotto centers/{centerId} |
| Sicurezza | Sessioni a scope, token ad alta entropia, scadenze verificate lato regole |
| Operatività | Online per ogni scrittura; lettura dell'app shell disponibile anche con rete instabile |
| Scala obiettivo | Uso ordinario 15-30 persone; limite operativo progettato fino a circa 100 |

## 2. Contesto, obiettivi e principi

### 2.1 Problema da risolvere

La gestione quotidiana dei pasti presenta tre esigenze simultanee:

- consentire a ciascuna persona di dichiarare rapidamente presenza o assenza;

- permettere al centro di coordinare eccezioni giornaliere, persone ammalate, diete occasionali e note;

- fornire alla cucina quantità affidabili senza trasformare la vista operativa in un archivio di dati personali.

### 2.2 Obiettivi misurabili

- Completare la modifica di un singolo pasto con un solo comando dalla vista calendario.

- Rendere evidente se una finestra di prenotazione è aperta o chiusa e impedire scritture tardive lato server.

- Produrre un riepilogo per oggi e domani, distinguendo coperti in sala, ospiti, ammalati e diete.

- Garantire che la vista cucina non possa leggere l'anagrafica privata dei partecipanti.

- Consentire la configurazione e manutenzione ordinaria senza Firebase Console.

- Restare sostenibili sul piano Firebase Spark con refresh adattivo e dati minimizzati.

### 2.3 Principi di prodotto

| Principio | Implicazione |
| --- | --- |
| Semplicità | Le azioni frequenti sono visibili, dirette e adatte a utenti poco esperti. |
| Dato autorevole | Una modifica è considerata riuscita solo dopo conferma Firestore. |
| Privacy per ruolo | Ogni vista riceve solo i documenti necessari al proprio compito. |
| Mobile-first | Calendari, card, controlli e navigazione devono funzionare da 320 px in su. |
| Errore esplicito | Offline, conflitti, permessi e sessioni scadute generano messaggi comprensibili. |
| Configurabilità | Nome, orari, lingua, palette, layout e vista iniziale appartengono al centro. |

## 3. Perimetro del prodotto

### 3.1 Funzioni incluse

- accesso residente con sigla, password comune e riconoscimento persistente del dispositivo;

- calendario mensile e settimanale delle presenze, con azioni per pasto, giorno, settimana e mese;

- riepilogo 'Oggi a tavola' per oggi e domani, in layout Classic o Internazionale;

- vista cucina installabile separatamente, con conteggi, diete, ammalati, Messa e note;

- agenda del centro con selezione ammalati, diete occasionali e note append-only;

- anagrafica residenti e ospiti, sigla univoca, gruppo, dieta, telefono e consensi di contatto;

- ruoli Responsabile, Amministratore e Vice amministratore/Manager, con capacità differenziate;

- creazione e gestione di centri tramite invito, selezione centro e trasferimento responsabilità;

- configurazione orari limite, calendario annuale, avatar, lingua, palette e layout;

- link operativi per residenti e cucina, audit delle azioni critiche ed export JSON di sicurezza;

- PWA con caching dell'app shell, banner offline e refresh adattivo della cucina;

- interfaccia in italiano, inglese, francese, spagnolo, tedesco e catalano.

### 3.2 Fuori perimetro

Non rientrano nel perimetro applicativo:

- asporto, servizio in camera e variazione dell'orario del singolo pasto;

- notifiche push, email automatiche, SMS o integrazioni di messaggistica lato server;

- statistiche avanzate, dashboard storiche, fatturazione o contabilità;

- backup automatici, scheduler, TTL automatico o ripristino completo tramite interfaccia;

- Cloud Functions, Cloud Storage, Phone Auth o servizi che richiedono il piano Blaze;

- gestione clinica di allergie o patologie: il sistema memorizza etichette dietetiche operative, non cartelle sanitarie;

- funzionamento offline delle scritture o accodamento invisibile di modifiche.

### 3.3 Confine del dato

> **REGOLA DI PERIMETRO**  
> Il prodotto coordina la preparazione dei pasti. Non certifica informazioni sanitarie, non sostituisce procedure di emergenza e non garantisce consegna di messaggi urgenti.

## 4. Utenti, ruoli e autorizzazioni

### 4.1 Attori

| Attore | Scopo | Accesso principale |
| --- | --- | --- |
| Residente | Gestisce le proprie presenze e consulta i riepiloghi consentiti. | Sigla + password comune; sessione personale. |
| Ospite | È conteggiato come persona temporanea e gestito da un autorizzato. | Nessun accesso autonomo obbligatorio. |
| Cucina | Consulta dati aggregati necessari alla preparazione. | Link cucina con sessione a scope KITCHEN. |
| Vice/Manager | Gestisce persone e operazioni giornaliere; può avere permesso Messa. | Account amministrativo associato al centro. |
| Amministratore | Configura centro, persone, calendario e operatività. | Google o email/password. |
| Responsabile | Governa amministratori, inviti e successione del centro. | Account OWNER del centro. |
| Proprietario piattaforma | Crea inviti per nuovi centri e vede i centri attivi. | Identità piattaforma configurata. |

### 4.2 Matrice delle capacità

| Capacità | Responsabile | Amministratore | Manager |
| --- | --- | --- | --- |
| Aprire area amministrativa | Sì | Sì | Sì |
| Gestire centro, avatar e calendario | Sì | Sì | No |
| Gestire persone | Sì | Sì | Sì |
| Eliminare persone | Sì | Sì | No |
| Gestire operazioni giornaliere | Sì | Sì | Sì |
| Gestire Messa | Sì | Sì | Solo se abilitato |
| Gestire amministratori | Sì | No | No |
| Trasferire responsabilità | Sì | No | No |
| Gestire link operativi | Sì | Sì | No |
| Esportare e consultare audit | Sì | Sì | No |

*Le capacità si applicano sia nell'interfaccia sia nell'accesso ai documenti Firestore. La sola presenza o assenza di un pulsante non costituisce controllo di sicurezza.*

## 5. Architettura informativa e navigazione

L'applicazione userà una singola shell e cambierà contesto in base a parametri di URL, identità autenticata, centro attivo e preferenze salvate.

| Vista | Route logica | Contenuto essenziale |
| --- | --- | --- |
| Gateway | / | Scelta/accesso al contesto; nessun ingresso implicito basato esclusivamente su una sessione memorizzata. |
| Prenotazioni mese | ?view=participant | Calendario mensile, comandi massivi, stato finestre. |
| Prenotazioni settimana | ?view=week | Sette giorni, comandi giornalieri e agenda del centro. |
| Oggi a tavola | ?view=summary | Riepilogo nominativo autorizzato per oggi/domani. |
| Cucina | ?view=kitchen | Riepilogo aggregato senza nomi dei partecipanti. |
| Pannello di controllo | ?view=admin | Configurazione, persone, link, impostazioni, accessi, manutenzione. |

### 5.1 Regole di navigazione

- La vista iniziale del residente è mensile o settimanale secondo configurazione del centro e preferenza personale fissata sul dispositivo.

- La vista riepilogo offre sempre un ritorno alle prenotazioni senza perdere l'identità residente.

- Il pannello amministrativo userà una navigazione a sezioni: Configurazione, Persone, Link per accedere, Impostazioni, Amministratore, Manutenzione.

- Il selettore centro apparirà solo quando l'account amministra più centri.

- Il manifest cucina è distinto dal manifest residenti, così da consentire installazioni separate sullo stesso dispositivo.

## 6. Requisiti funzionali

### 6.1 Accesso residente e persistenza

1. Il residente apre il collegamento amichevole e inserisce una sigla da 2 a 12 caratteri alfanumerici e la password comune del centro.

1. Il client autentica l'account tecnico residenti, verifica la sigla in publicParticipants e crea un token personale limitato a quel participantId.

1. Il client attiva una sessione Firebase personale e conserva sul dispositivo solo gli elementi necessari al ripristino; la password comune non viene salvata.

1. Alle aperture successive, la sessione viene ripristinata se identità, token, partecipante e centro sono ancora validi.

1. Il comando Esci elimina l'identità locale e consente di cambiare persona o dispositivo.

> **COMPORTAMENTO IN ERRORE**  
> Un errore di rete temporaneo durante il ripristino non cancella l'identità memorizzata. Una revoca o una sessione non valida riportano al login.

### 6.2 Prenotazioni mensili

- Mostrare il mese selezionato, navigazione precedente/successivo e scelta diretta del mese.

- Rendere distinguibili colazione, pranzo e cena mediante etichetta, icona e stato testuale/accessibile.

- Consentire presenza/assenza per singolo pasto e azioni massive per giorno, settimana, mese o tipo di pasto.

- Applicare le azioni massive solo ai pasti con finestra ancora aperta e restituire il numero di salvataggi riusciti o falliti.

- Mostrare chiaramente stato in caricamento, dato aggiornato, errore e connessione assente.

### 6.3 Prenotazioni settimanali e agenda

- Visualizzare sette giorni con navigazione e selezione settimana.

- Permettere l'impostazione giornaliera e per tipo pasto, rispettando le finestre di chiusura.

- Per utenti autorizzati, aprire l'Agenda centro sul giorno scelto e gestire: ammalati per pasto, Messa per pasto, diete occasionali e note cucina.

- Le note inviate si accumulano e non sono modificabili; la loro rimozione avviene tramite cambio di stato, senza riscrivere il testo.

- Le diete occasionali possono valere per il giorno selezionato o per quello successivo e sono collegate alla persona e ai pasti interessati.

### 6.4 Riepilogo 'Oggi a tavola'

- Consentire il passaggio fra oggi e domani.

- Mostrare colonne dinamiche in base ai tipi pasto attivi; supportare anche configurazioni diverse dai tre pasti standard.

- Separare coperti in sala, ospiti, pasti per ammalati e relative diete, evitando doppi conteggi per persone con più etichette dietetiche.

- Mostrare Messa, note operative e nomi solo nella vista autorizzata.

- Mostrare telefono e collegamento WhatsApp solo se esistono consenso individuale, numero valido e abilitazione del centro.

- Supportare due rappresentazioni: tabella Classic e card Internazionale.

### 6.5 Vista cucina

- Autenticare il dispositivo tramite link cucina e sessione KITCHEN.

- Mostrare oggi/domani, quantità per pasto, ospiti, diete, ammalati, Messa e note attive.

- Non mostrare nomi, telefono, sigle o documenti privati dei partecipanti.

- Prevedere aggiornamento manuale e refresh automatico adattivo: 5 minuti nelle fasce 07:00-10:00 e 13:30-17:30; 45 minuti nelle altre ore diurne; 90 minuti fra 23:00 e 07:00.

- Non pianificare un refresh oltre il successivo confine di fascia, così che il cambio politica avvenga puntualmente.

### 6.6 Pannello di controllo

| Sezione | Funzioni richieste |
| --- | --- |
| Configurazione | Nome centro, fuso orario, cutoff pranzo/cena/colazione successiva, profilo del responsabile, password comune, avatar. |
| Persone | Creazione/modifica, sigla univoca, gruppo, dieta, ruoli operativi, telefono, consensi, sospensione, riattivazione ed eliminazione. |
| Link per accedere | Collegamenti residenti e cucina, copia/condivisione, rigenerazione controllata. |
| Impostazioni | Condivisione contatti, vista iniziale, layout riepilogo/cucina, palette, lingua. |
| Amministratore | Invito, accettazione/rifiuto, revoca, elenco account attivi e trasferimento responsabilità. |
| Manutenzione | Copertura calendario, estensione annuale, attività recenti ed export JSON. |

### 6.7 Gestione persone

- Nome obbligatorio fino a 120 caratteri; sigla normalizzata in maiuscolo e univoca nel centro.

- Gruppo iniziale Residenti o Ospiti; comando rapido per creare Ospite 1, Ospite 2 e così via.

- Etichette dietetiche normalizzate; possibilità di dieta numerata nell'intervallo operativo previsto.

- Telefono facoltativo, da 6 a 15 cifre normalizzate; chiamata e WhatsApp richiedono consensi espliciti.

- Le modifiche useranno una revisione attesa per rilevare aggiornamenti concorrenti e impedire sovrascritture inconsapevoli.

- La sospensione disabilita profilo pubblico e regola; la revoca invalida token e sessioni personali; l'eliminazione richiede conferma distruttiva e produce audit.

### 6.8 Centri e amministratori

- Il proprietario piattaforma genera un invito ad alta entropia con scadenza per creare un nuovo centro.

- L'invitato autenticato e con email verificata crea centro, membership OWNER e profilo di routing in una singola operazione atomica.

- Il Responsabile invita una persona del centro come Amministratore; l'invito può essere accettato, rifiutato o revocato.

- Il Responsabile può trasferire il ruolo OWNER a un amministratore attivo associato a una Persona attiva, scegliendo se revocare il precedente accesso.

- Un account con più membership può cambiare centro; il centro selezionato deve essere mantenuto nell'URL e nello storage locale.

### 6.9 Personalizzazione e internazionalizzazione

- Lingue supportate: italiano, inglese, francese, spagnolo e tedesco, con cataloghi coerenti per etichette statiche e contenuti dinamici.

- Palette disponibili: Smeraldo, Giallino, Beige, Rosso pallido e Confetto.

- Layout Classic e Internazionale configurabili separatamente per riepilogo e cucina.

- La lingua del dispositivo e le preferenze personali non devono alterare lo stato di autenticazione.

- L'avatar del centro è memorizzato come data URL in Firestore, con dimensione massima di 300.000 caratteri; la cache locale è basata sull'impronta del contenuto.

### 6.10 Audit ed export

- Registrare come eventi append-only almeno: aggiornamento centro, inserimento/eliminazione persona, rigenerazione link, gestione amministratori, trasferimento responsabilità e modifica permessi.

- Mostrare fino a 20 attività recenti per impostazione, con limite massimo 50 per richiesta.

- Generare un file JSON schemaVersion 2 con centro, timestamp, conteggi e collezioni esportabili.

- Escludere credenziali operative, token, sessioni, profili amministrativi e impostazioni private dall'export ordinario.

## 7. Regole di dominio

### 7.1 Stato effettivo del pasto

> **REGOLA DEL DOMINIO**  
> Una reservationRule attiva definisce l'abilitazione della persona ai tipi pasto nel periodo. La presenza effettiva richiede un override puntuale PRESENT; in assenza di override valido lo stato effettivo è ABSENT.

1. Individuare la regola attiva per participantId, mealTypeId e mealDate.

1. Verificare che la regola sia ACTIVE, comprenda il tipo pasto e includa la data tra startsOn ed endsOn, se presente.

1. Cercare l'override con identificativo participantId_mealDate_mealTypeId.

1. Se regola e override sono validi, usare effect PRESENT o ABSENT; altrimenti considerare la persona assente.

### 7.2 Finestre e scadenze

| Pasto | Default | Calcolo |
| --- | --- | --- |
| Pranzo | 09:30 | Stesso giorno nel fuso orario del centro. |
| Cena | 15:00 | Stesso giorno nel fuso orario del centro. |
| Colazione | 15:00 | Giorno precedente nel fuso orario del centro. |

- Ogni mealWindow ha status OPEN e closesAt precomputato; le Security Rules confrontano request.time con closesAt.

- Le Security Rules rifiutano le scritture tardive anche se il client mostra un controllo attivo.

- L'amministratore può modificare i cutoff; la manutenzione estende la copertura del calendario fino a 365 giorni.

### 7.3 Scritture, idempotenza e conflitti

- L'override usa un ID deterministico che impedisce duplicati per persona/data/pasto.

- Ogni richiesta include requestId; i comandi massivi usano batch limitati e, in caso di errore, un fallback per singola scrittura.

- I retry automatici sono limitati agli errori transitori: unavailable, deadline-exceeded e aborted, con massimo tre tentativi e backoff.

- Le operazioni dell'interfaccia impediscono esecuzioni concorrenti tramite una guardia per chiave.

- Le schede persona usano revisioni monotone e falliranno con conflitto se il dato è cambiato da un altro amministratore.

### 7.4 Regole operative giornaliere

- Gli ammalati sono esclusi dai coperti in sala e conteggiati separatamente come pasti da preparare.

- Le diete degli ammalati sono riepilogate separatamente dalle diete dei coperti in sala.

- Una dieta occasionale sostituisce o integra la dieta della persona solo per i pasti assegnati e per le date previste.

- Il valore Messa è disponibile per pasto; un valore specifico del pasto prevale sull'eventuale fallback giornaliero.

- Gli ospiti sono una sottoclasse del totale e non un totale aggiuntivo.

## 8. Modello dati

Il database è organizzato per tenant logico. I documenti globali gestiscono routing e inviti; i dati operativi risiedono sotto centers/{centerId}.

### 8.1 Collezioni globali

| Percorso | Responsabilità |
| --- | --- |
| adminProfiles/{uid} | Centro/i associati e routing dell'account amministrativo. |
| centerInvitations/{id} | Inviti a creare un nuovo centro; stato, scadenza e consumo. |
| adminInvitations/{id} | Inviti a diventare amministratore di un centro. |

### 8.2 Collezioni del centro

| Sottocollezione | Responsabilità |
| --- | --- |
| admins | Membership, ruolo e permessi amministrativi. |
| groups | Gruppi operativi, inizialmente Residenti e Ospiti. |
| participants | Profilo privato: telefono, consensi, revisione e ruoli. |
| publicParticipants | Proiezione minimizzata per accessi e viste nominative autorizzate. |
| mealTypes | Tipi pasto attivi, etichette e ordine. |
| mealWindows | Data, pasto, stato e closesAt autorevole. |
| reservationRules | Abilitazione ricorrente per persona, periodo e tipi pasto. |
| reservationOverrides | Presenza/assenza puntuale con ID deterministico e requestId. |
| reservationOverrideHistory | Storico append-only riservato agli amministratori. |
| dailyOperations | Messa e altre impostazioni operative per data/pasto. |
| dailyHealth | Persone ammalate e pasti interessati. |
| occasionalDiets | Assegnazioni dietetiche temporanee per persona e pasti. |
| kitchenNotes | Note append-only con rimozione logica. |
| linkTokens | Bearer token ad alta entropia per scope PUBLIC, PERSONAL o KITCHEN. |
| accessSessions | Sessioni Firebase associate a token, scope, scadenza e participantId. |
| privateSettings | Segreti/configurazioni operative riservate, inclusi link attivi. |
| assets | Avatar centro in formato data URL con impronta del contenuto. |
| auditEvents | Eventi amministrativi immutabili. |

### 8.3 Duplicazione controllata

participants e publicParticipants costituiscono una separazione intenzionale. Il primo documento contiene dati privati e di governo; il secondo è una proiezione minimizzata leggibile dagli scope previsti. Le modifiche amministrative aggiornano atomicamente entrambe le rappresentazioni.

### 8.4 Export schema 2

L'export di sicurezza includerà il documento centro e le collezioni: groups, participants, publicParticipants, mealTypes, mealWindows, reservationRules, reservationOverrides, kitchenNotes, dailyOperations, dailyHealth, assets e auditEvents. Non conterrà account amministrativi, impostazioni private, linkTokens o accessSessions.

## 9. Architettura tecnica

| Livello | Componenti | Responsabilità |
| --- | --- | --- |
| Presentazione | HTML semantico, CSS responsive | Shell unica, viste, dialog, stati, accessibilità e temi. |
| Applicazione | Moduli JavaScript ES | Orchestrazione, calendario, riepiloghi, validazioni, cache e i18n. |
| Dominio | Moduli puri | Stato prenotazione, ruoli, revisioni, backup, ripristino preliminare. |
| Persistenza | Firebase SDK 12.17 | Authentication, transazioni, batch e query Firestore. |
| Enforcement | Firestore Security Rules | Autorizzazioni, scope, expiry, forma e immutabilità dei documenti. |
| Distribuzione | Firebase Hosting | Asset statici, rewrite SPA, header manifest e service worker. |
| Offline shell | Service worker | Cache app shell e fallback di navigazione, non coda scritture. |

### 9.1 Flusso delle richieste

1. La route determina la vista e il manifest da usare.

1. Firebase Authentication ripristina o crea l'identità tecnica dell'utente.

1. Il contesto centro seleziona il tenant e qualifica le chiavi di storage locale.

1. Il client legge solo collezioni ammesse allo scope e costruisce il modello di vista.

1. Le azioni di modifica validano rete, ruolo, stato locale e finestra; quindi inviano batch o transazione.

1. Le Security Rules rivalidano identità, campi, riferimenti e scadenze prima del commit.

1. Solo dopo conferma server l'interfaccia comunica il successo e aggiorna la cache locale.

### 9.2 Vincoli tecnici deliberati

- Nessun backend applicativo tradizionale e nessuna credenziale privilegiata nel client.

- Configurazione Firebase pubblica nel frontend; la sicurezza dipende dalle Rules, non dalla segretezza della config.

- Indici Firestore ridotti al minimo; le query che richiedono indice composito prevedono un fallback filtrato lato client dove sostenibile.

- Distribuzione come risorse statiche con impronta del contenuto e dipendenze Firebase servite da gstatic.

## 10. Sicurezza, privacy e protezione del dato

### 10.1 Modello di fiducia

Il sistema opera in un contesto comunitario a fiducia moderata e non si affida alla sola buona fede. Chi possiede un link operativo è autorizzato esclusivamente allo scope associato e per la durata stabilita.

| Controllo | Requisito |
| --- | --- |
| Autenticazione | request.auth obbligatoria per ogni dato; anonima ammessa solo tramite sessione autorizzata. |
| Scope | PUBLIC, PERSONAL e KITCHEN hanno superfici di lettura/scrittura distinte. |
| Scadenza | request.time deve precedere expiresAt di sessione e token; la sessione non può superare il token. |
| Binding persona | Una sessione PUBLIC seleziona participantId una sola volta; PERSONAL nasce già vincolata. |
| Stato persona | Ogni scrittura ricontrolla che participants/{id}.status sia ACTIVE. |
| Integrità override | ID, mealWindowId, source, campi ammessi, timestamp e finestra devono essere coerenti. |
| Immutabilità | Note e audit non sono modificabili liberamente; gli override non sono eliminabili dal client. |

### 10.2 Minimizzazione e visibilità

- La cucina può leggere regole, override e aggregati operativi, ma non participants e publicParticipants nominativi.

- Il telefono resta nel documento privato; è proiettato nel riepilogo solo con consenso e configurazione attiva.

- linkTokens non sono leggibili dal client; privateSettings è riservato agli amministratori.

- La password comune non viene memorizzata nello storage locale del browser.

- L'export è un'azione autorizzata e deve essere conservato fuori dal browser in luogo protetto.

### 10.3 Rischi residui di sicurezza

- Un bearer link copiato può essere usato fino a revoca o scadenza; servono token lunghi, rotazione e canali di condivisione appropriati.

- L'account tecnico residenti con password comune offre semplicità ma non identità forte; la sigla non deve essere considerata segreto ad alta sicurezza.

- L'identità del proprietario piattaforma e il mapping del centro demo sono parametri di configurazione riservati.

- Le etichette dietetiche possono rivelare informazioni sensibili; vanno mantenute operative, minimizzate e soggette a policy di conservazione.

## 11. Requisiti non funzionali e PWA

| Area | Requisito operativo |
| --- | --- |
| Responsive | Usabilità da 320 px a desktop; controlli critici almeno 44 x 44 px. |
| Accessibilità | HTML semantico, label e aria-label, focus visibile, aria-live, uso completo da tastiera, contrasto AA. |
| Prestazioni | App shell leggera; moduli opzionali caricati solo quando richiesti; cache statica basata sull'impronta del contenuto. |
| Affidabilità | Nessun successo ottimistico definitivo prima del commit; retry selettivo e messaggi localizzati. |
| Concorrenza | Revisioni sulle persone, transazioni per aggiornamenti correlati, guardia contro doppio invio. |
| Internazionalizzazione | Cataloghi completi in 6 lingue e fallback per valori configurati dal centro. |
| Installabilità | Manifest, icone 192/512, display standalone, start_url residenti e cucina distinti. |
| Offline | Navigazione/app shell disponibili se già in cache; scritture disabilitate e non accodate. |
| Compatibilità | Browser moderni con moduli ES, service worker, Firebase Auth e Firestore. |

### 11.1 Strategia service worker

- La cache applicativa usa identificativi derivati dal contenuto e il worker conserva l'insieme attivo.

- Navigation request in network-first con fallback a index.html.

- Gli asset con impronta del contenuto usano la strategia cache-first.

- Asset canonici same-origin in stale-while-revalidate.

- Nessuna intercettazione di richieste cross-origin Firebase e nessuna cache dei dati Firestore nel service worker.

### 11.2 Stati di sistema

- Avvio e splash; caricamento dati; stato vuoto; offline; permesso negato; sessione scaduta; conflitto; timeout; errore generico; salvataggio riuscito.

- Le azioni che richiedono rete sono disabilitate o rifiutate quando navigator.onLine è false.

- I messaggi tecnici Firebase sono tradotti in messaggi utente coerenti per autenticazione, conflitto, rete e permessi.

## 12. Gestione operativa, quote e continuità

### 12.1 Piano Spark

La soluzione usa le quote di Firestore e Hosting previste dal piano Spark. Il monitoraggio operativo è settimanale e considera soglie di attenzione al 60%, 80% e 90% della stima o della quota disponibile.

| Voce | Limite di progetto usato nel modello |
| --- | --- |
| Letture Firestore | 50.000 al giorno |
| Scritture Firestore | 20.000 al giorno |
| Eliminazioni Firestore | 20.000 al giorno |
| Storage Firestore | 1 GiB |
| Traffico Hosting | 360 MiB al giorno |

> **CAPACITÀ OPERATIVA**  
> Il modello di quota considera sostenibile uno scenario fino a circa 100 partecipanti con una sola schermata cucina sempre attiva. Una seconda schermata completa nello scenario limite può superare la quota letture giornaliera.

### 12.2 Pubblicazione e ripristino

1. Eseguire controlli sintattici sui moduli principali e tutti i test locali.

1. Eseguire i test Security Rules contro l'emulatore Firestore.

1. Verificare account Firebase e project ID tavola-comune.

1. Pubblicare Hosting, Rules e indici tramite il comando protetto di deploy.

1. Eseguire smoke test su calendario, riepilogo, cucina, login residente e pannello admin.

1. Il ripristino del frontend segue la procedura Hosting; le scritture Firestore sono indipendenti e non vengono annullate.

### 12.3 Backup e recupero

- L'amministratore scarica periodicamente l'export JSON e lo conserva fuori dal browser.

- Per ogni ripristino, il file supera la validazione di schema, centro, ID, duplicati, conteggi e riferimenti.

- Il codice di dominio prepara il piano di ripristino; l'applicazione non esegue scritture di ripristino e richiede una procedura amministrata.

## 13. Strategia di test e criteri di accettazione

### 13.1 Livelli di test

| Livello | Copertura attesa |
| --- | --- |
| Unità dominio | Date, cutoff, ruoli, stato prenotazione, diete, riepiloghi, quote, revisioni. |
| Coerenza statica dell'interfaccia | Presenza di controlli, percorsi, etichette, impaginazione, preferenze, risorse e comportamenti essenziali. |
| i18n | Chiavi e pluralizzazione coerenti nelle sei lingue. |
| Security Rules statiche | Presenza dei vincoli server essenziali nel ruleset. |
| Security Rules emulatore | Allow/deny reali per admin, residenti, cucina, inviti, scadenze, note e override. |
| PWA | Manifest, cache app shell, isolamento same-origin e installazione sui dispositivi target. |
| End-to-end manuale | Primo accesso, prenotazione, agenda, riepilogo, cucina, revoca, esportazione e ripristino. |

Le suite applicative e le Security Rules eseguite con l'emulatore Firestore costituiscono le verifiche automatiche. Le procedure e i comandi sono descritti in [Sviluppo e test](SVILUPPO_E_TEST.md).

### 13.2 Criteri funzionali di accettazione

- Un residente attivo accede con sigla e password comune, riapre l'app senza reinserire la password e può eseguire Esci.

- Un residente sospeso o revocato non può più scrivere anche con sessione precedentemente valida.

- Una modifica dopo closesAt viene rifiutata dalle Security Rules.

- Le azioni massive non modificano pasti chiusi e dichiarano correttamente successi/fallimenti.

- Il riepilogo conteggia ospiti e diete senza duplicazioni e separa gli ammalati dai coperti in sala.

- La cucina ottiene conteggi e note ma non può leggere nomi o profili privati.

- Telefono e WhatsApp compaiono solo con consenso e abilitazione del centro.

- Un amministratore non può gestire gli amministratori o trasferire la responsabilità se non è OWNER.

- L'invito centro può essere consumato una sola volta e solo entro la scadenza.

- L'export contiene schema, centro, data, conteggi coerenti e solo le collezioni previste.

- L'app shell si apre dalla cache, mentre una scrittura offline è rifiutata senza conferma ingannevole.

- Le sei lingue mantengono tutte le etichette critiche e non interrompono la sessione.

### 13.3 Condizioni di pubblicazione

> **GO / NO-GO**  
> Il deploy è consentito solo con sintassi valida, test locali verdi, test Rules verdi sull'emulatore, nessun segreto nel repository, project ID verificato e smoke test post-deploy pianificato.

## 14. Aree funzionali

Il sistema comprende le seguenti aree, ciascuna con funzioni e controlli specifici.

| Area | Funzioni |
| --- | --- |
| Fondazioni | Hosting, shell PWA, configurazione Firebase e ambienti. |
| Identità e centri | Autenticazione, inviti, membership e regole Firestore. |
| Pasti | Gruppi, tipi di pasto, finestre, regole e prenotazioni. |
| Residenti | Accesso, calendari mensili e settimanali, preferenze e sessioni. |
| Riepiloghi e cucina | Conteggi, diete, note operative e aggiornamento dei dati. |
| Persone e operazioni | Agenda, ospiti, ammalati, anagrafica e consensi. |
| Amministrazione | Ruoli, inviti, passaggio di responsabilità, registro attività, esportazione e personalizzazioni. |
| Distribuzione | Regole Firestore, localizzazione, accessibilità, quote e installazione PWA. |

### 14.1 Componenti principali

- Applicazione PWA con interfaccia responsive, calendari, riepiloghi e agenda.

- Moduli di dominio per prenotazioni, identità, operazioni giornaliere, accessi e configurazione.

- Firebase Authentication, Cloud Firestore e Security Rules.

- Manifest, service worker, cataloghi linguistici e risorse statiche.

- Procedure operative, backup, verifica dell'ambiente e monitoraggio delle quote.

## 15. Rischi, vincoli ed esclusioni

| Rischio/Vincolo | Impatto | Contromisura |
| --- | --- | --- |
| Nessun backend | Logica complessa nel client e Rules. | ID deterministici, precomputazione finestre, moduli dominio e test emulatori. |
| Bearer link | Accesso possibile a chi riceve il link. | Alta entropia, expiry, rotazione, revoca e scope minimo. |
| Password comune | Identità residente non forte. | Binding a sigla/persona, dati minimizzati, revoca e contesto di fiducia dichiarato. |
| Quote Spark | Interruzione o rallentamento al superamento. | Refresh adattivo, una sola cucina limite, monitoraggio e retention/export. |
| Scritture online-only | Nessuna modifica durante assenza rete. | Banner, blocco esplicito e nessuna falsa conferma. |
| Dati dietetici | Possibile sensibilità del dato. | Etichette minime, accesso per ruolo, export protetto e policy di conservazione. |
| Configurazioni hardcoded | Scarsa portabilità piattaforma. | Spostare owner UID/email e centro demo in configurazione governata. |
| OneDrive/toolchain | Installazioni npm instabili su alcune postazioni. | Node_modules non sincronizzato e copia Git locale se necessario. |
| Ripristino non esposto | Recupero richiede competenza tecnica. | Validatore, piano di restore e procedura emulatore prima di ogni import. |

### 15.1 Perimetro funzionale e limiti operativi

- Le funzioni fornite sono quelle descritte nella guida all’uso; asporto e statistiche non fanno parte del perimetro applicativo.

- La validazione di un backup e la costruzione di un piano di restore non equivalgono a un ripristino disponibile all'utente.

- La presenza di fallback lato client non sostituisce gli indici Firestore necessari in base al volume d'uso.

- Le quote e le condizioni del piano Firebase dipendono dall'account e dal volume d'uso; i valori riportati descrivono il modello operativo del sistema.

## 16. Matrice di tracciabilità

| Area | Evidenza di implementazione | Verifica |
| --- | --- | --- |
| Accesso residente | participant-access.js, participant-data.js, firebase-client.js | resident-login + Rules |
| Calendario | app.js, schedule-utils.mjs, calendar-configuration.js | flussi calendario e regole Firestore |
| Riepilogo | summary-matrix-model.js, summary-matrix-view.js | summary-matrix-model.test.mjs |
| Cucina | kitchen-data.js, refresh-schedule.js | refresh, quota e privacy Rules |
| Agenda | daily-operations-data.js, kitchen-notes.js | operazioni giornaliere e regole Firestore |
| Persone | participant-profile.mjs, participant-data.js | Rules atomiche e revisioni |
| Ruoli e centri | role-policy.mjs, admin-center.js, admin-center-access.js | Rules inviti/membership |
| Personalizzazione | center-settings.js, i18n/*, CSS | traduzioni, impaginazione e palette |
| Audit/export | audit-log.js, center-backup.mjs, participant-data.js | Rules append-only + controlli export |
| PWA | manifest*.webmanifest, sw.js, firebase.json | service-worker-static + test dispositivi |

### 16.1 Elementi di verifica

- Sorgenti applicativi, regole Firestore e configurazione Firebase.
- Suite applicative e suite Security Rules eseguite con l'emulatore Firestore.
- Manifest PWA, service worker, cataloghi linguistici e manifesto di build.

## 17. Glossario e riferimenti tecnici

### 17.1 Glossario

| Termine | Definizione |
| --- | --- |
| Centro | Tenant operativo che contiene persone, pasti, configurazioni e amministratori. |
| Persona/Partecipante | Residente o ospite rappresentato nel sistema. |
| Rule | Regola ricorrente che abilita una persona a determinati pasti in un periodo. |
| Override | Dichiarazione puntuale PRESENT/ABSENT per persona, data e pasto. |
| Meal window | Documento autorevole con stato e chiusura di un pasto. |
| Scope | Perimetro di una sessione: PUBLIC, PERSONAL o KITCHEN. |
| Bearer token | Segreto utilizzabile da chiunque lo possieda entro scope e scadenza. |
| PWA | Web app installabile con manifest e service worker. |
| Spark | Piano Firebase gratuito assunto come vincolo economico del progetto. |

### 17.2 Riferimenti del progetto

- prototypes/firebase-spark-pwa/public/ (shell, logica applicativa, dominio, stili, manifest e service worker)

- prototypes/firebase-spark-pwa/firestore.rules e firebase.json

- tests/firebase-spark/*.test.mjs e tests/firebase-rules/firestore.rules.test.mjs

- docs/ARCHITETTURA_E_SICUREZZA.md, AVVIO_E_SESSIONI.md, COERENZA_DATI.md e BUILD_E_CACHE.md

- tools/predeploy-gate.mjs e tools/lib/spark-quota-model.mjs

### 17.3 Ambito della specifica

La specifica descrive il comportamento definito dall'applicazione, dalle regole Firestore e dalla configurazione del progetto. Credenziali, dati dei centri e informazioni personali non fanno parte della documentazione.

> **RIFERIMENTO TECNICO**  
> Questa specifica riassume le funzioni e le scelte tecniche adottate per Tavola Comune.
