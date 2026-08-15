# Capitolato grafico e funzionale

## Web app per la gestione delle prenotazioni dei pasti

Stato: bozza integrata per nuovo progetto alternativo.

Origine: capitolato grafico/funzionale fornito dall'utente, integrato con le specifiche di dominio emerse nel progetto "Tavola Comune". La precedente ipotesi Google Sheets / Apps Script e' abbandonata: questo documento descrive il prodotto, non impone quella tecnologia.

## 1. Obiettivo del prodotto

Realizzare una web app responsive, preferibilmente installabile come PWA, per strutture ricettive, comunita', residence, collegi, mense o organizzazioni che devono raccogliere e amministrare le adesioni ai pasti.

L'obiettivo operativo e' permettere a un responsabile e alla cucina di sapere con affidabilita' quante persone mangeranno, chi ha varianti, chi ha esigenze alimentari, chi e' ospite e quali comunicazioni giornaliere sono rilevanti.

Gli utenti ordinari devono poter:

- iscriversi o cancellarsi da colazione, pranzo e cena;
- consultare lo stato delle proprie prenotazioni;
- modificare rapidamente un pasto con un solo tocco;
- indicare variazioni di orario;
- richiedere un pasto da asporto;
- richiedere servizio in camera, se abilitato;
- inserire note giornaliere per la cucina;
- indicare allergeni, regimi alimentari e note alimentari;
- usare piani pasto ricorrenti, come nessun piano, mezza pensione o pensione completa.

Gli utenti autorizzati devono poter:

- visualizzare le prenotazioni complessive;
- vedere conteggi per pasto, giorno, gruppo, ospiti, diete e varianti;
- ordinare e filtrare gli iscritti;
- aggiungere ospiti;
- modificare prenotazioni altrui;
- amministrare utenti, gruppi, permessi e piani pasto;
- gestire allergeni e regimi alimentari;
- pubblicare comunicazioni generali;
- impostare limiti temporali per le modifiche;
- consultare statistiche;
- esportare dati operativi.

Il fulcro dell'esperienza resta una matrice semplice: giorni in verticale e tre pasti in orizzontale.

## 2. Principi di prodotto

- Semplicita' prima della completezza.
- Pochi tocchi per le azioni frequenti.
- Nessuna informazione critica affidata solo al colore.
- Ruoli e viste separati: utente, cucina, amministrazione.
- Cucina con dati minimi e operativi: conteggi, varianti, allergeni/regimi aggregati o necessari, non navigazione amministrativa.
- Privacy per impostazione predefinita.
- Scadenze forti e comprensibili.
- Le azioni irreversibili richiedono conferma esplicita.
- Il sistema deve essere usabile anche da persone poco esperte.

## 3. Utenti e ruoli

### Utente standard

Persona che gestisce le proprie prenotazioni.

Permessi:

- vedere il proprio calendario pasti;
- prenotare o cancellare pasti;
- impostare variazioni consentite;
- compilare allergeni/regime alimentare;
- inserire note giornaliere;
- consultare le proprie statistiche.

### Ospite

Persona temporanea aggiunta da un utente autorizzato.

Permessi:

- puo' essere gestita direttamente da admin o delegati;
- puo' avere intervallo date, pasti, regime alimentare e note.

### Cucina

Ruolo operativo con accesso ai dati necessari alla preparazione.

Permessi:

- vedere conteggi per colazione, pranzo, cena;
- vedere ospiti, asporto, variazioni orario, servizio in camera;
- vedere allergeni/regimi e note cucina;
- stampare o esportare tabelloni operativi;
- non accedere alla gestione utenti o permessi.

### Responsabile / Admin

Gestisce configurazione e dati completi.

Permessi:

- amministrare utenti e ruoli;
- gestire gruppi;
- modificare prenotazioni altrui;
- creare ospiti;
- configurare scadenze;
- gestire comunicazioni;
- consultare statistiche;
- esportare dati;
- eseguire azioni distruttive con conferma.

### Permessi granulari consigliati

- visualizzazione prenotazioni complessive;
- modifica prenotazioni altrui;
- aggiunta ospiti;
- pubblicazione comunicazioni;
- consultazione statistiche;
- esportazione;
- amministrazione utenti;
- amministratore completo.

## 4. Architettura funzionale

Il prodotto deve essere progettato in modo technology-neutral. La scelta tecnica andra' fatta in seguito, ma il dominio deve supportare:

- web app responsive;
- possibile PWA;
- autenticazione o accesso semplificato secondo ruolo;
- autorizzazioni granulari;
- dati strutturati e interrogabili;
- esportazione;
- audit delle azioni critiche;
- possibilita' di migrazione futura.

Il nuovo progetto non deve dipendere dalla precedente soluzione Google Sheets / Apps Script.

## 5. Modello concettuale dati

Entita' principali:

- Struttura o centro;
- Utente;
- Ospite;
- Gruppo;
- Ruolo;
- Permesso;
- Tipo pasto;
- Piano pasto;
- Finestra di prenotazione;
- Prenotazione puntuale;
- Regola ricorrente;
- Override puntuale;
- Allergene;
- Regime alimentare;
- Nota cucina;
- Comunicazione generale;
- Statistica;
- Export;
- Audit log.

Relazioni principali:

- una struttura contiene utenti, gruppi, ospiti e configurazioni;
- un utente puo' appartenere a un gruppo;
- un utente ha un piano pasto opzionale;
- un piano pasto genera uno stato previsto;
- una prenotazione puntuale o override modifica lo stato di un pasto in una data;
- una nota cucina e' collegata a una data e, se necessario, a un utente/ospite;
- allergeni e regimi sono collegati a utenti o ospiti;
- ruoli e permessi determinano cosa viene mostrato e modificabile.

## 6. Regole ricorrenti e override

Il sistema non deve generare automaticamente infinite prenotazioni future.

Per la compilazione massiva o i piani abituali deve usare:

- regole ricorrenti;
- data inizio;
- data fine opzionale;
- pasti inclusi;
- giorni della settimana;
- stato attivo/pausato;
- eventuale origine della regola.

Per le eccezioni deve usare override puntuali:

- data;
- tipo pasto;
- effetto: presente o assente;
- eventuale variante: orario, asporto, camera;
- nota;
- sorgente modifica;
- data/ora modifica;
- autore modifica.

Regola di lettura:

- prima si valuta il piano o la regola ricorrente;
- poi si applica l'eventuale override puntuale;
- un override esplicito resta valido anche se la regola ricorrente viene messa in pausa, salvo azione amministrativa distinta.

## 7. Schermata principale prenotazioni

La schermata principale deve contenere:

- app bar;
- intestazione delle tre categorie pasto;
- elenco cronologico dei giorni;
- tre celle pasto per ogni giorno;
- eventuale indicatore nota;
- evidenziazione del giorno corrente;
- stato di blocco/scadenza.

Colonne:

- colazione;
- pranzo;
- cena.

Ogni riga giorno deve includere:

- giorno della settimana;
- numero giorno;
- mese;
- indicatore "oggi";
- eventuale nota;
- tre controlli pasto.

Stati della riga:

- giorno corrente;
- fine settimana;
- giorno con variazione;
- giorno bloccato;
- giorno con nota.

## 8. Componente stato pasto

Ogni cella pasto deve avere area interattiva minima 44 x 44 px e comunicare chiaramente:

- disponibile;
- prenotato;
- non prenotato;
- bloccato;
- prenotato con variazione;
- prenotato per asporto;
- prenotato con servizio in camera.

Interazione principale:

- tap/click singolo alterna non prenotato/prenotato.

Interazione secondaria:

- pressione prolungata su mobile;
- menu contestuale o pulsante "altre opzioni" su desktop;
- alternativa da tastiera sempre disponibile.

Opzioni secondarie:

- prenotazione standard;
- altro orario;
- pasto da asporto;
- servizio in camera;
- annulla prenotazione;
- nota per la cucina, se prevista nel flusso.

Dopo ogni modifica:

- icona aggiornata immediatamente;
- conferma breve;
- loading se serve rete;
- rollback e messaggio di errore se il salvataggio fallisce.

## 9. Bottom sheet opzioni pasto

Il bottom sheet deve includere:

- titolo con giorno e tipo pasto;
- elenco opzioni;
- time picker se necessario;
- campo nota facoltativo;
- pulsante conferma;
- azione annulla.

Regole:

- altezza adattiva;
- chiusura tramite swipe, pulsante o Escape;
- conferma disabilitata finche' i campi obbligatori non sono validi;
- orari in formato locale;
- valori precedenti precompilati.

## 10. Scadenze e blocchi

La configurazione delle scadenze deve includere:

- switch di attivazione;
- orario limite;
- giorni della settimana;
- regole differenziate per pasto;
- comportamento dopo scadenza;
- eccezioni per amministratori;
- messaggio mostrato agli utenti.

Dopo la scadenza:

- le celle interessate appaiono bloccate;
- viene mostrato il motivo;
- l'admin autorizzato puo' continuare a modificare;
- eventuali opzioni di comunicazione tardiva possono restare disponibili, se il prodotto le prevede.

Default operativo da valutare:

- pranzo bloccato dopo le 09:30;
- cena bloccata dopo le 15:00;
- colazione del giorno successivo bloccata dopo le 15:00 del giorno precedente.

## 11. Riepilogo prenotazioni

La vista riepilogo deve includere:

- selettore data;
- giorno precedente/successivo;
- accesso calendario;
- categorie colazione/pranzo/cena;
- conteggi complessivi.

Per ogni pasto mostrare:

- totale utenti;
- totale ospiti;
- pasti standard;
- asporto;
- orario modificato;
- servizio in camera;
- allergie o regimi da segnalare;
- note cucina.

Elenco utenti:

- nome;
- badge ospite;
- tre stati pasto;
- allergeni/regime;
- nota;
- menu azioni.

Filtri e ordinamenti:

- per nome;
- per pasto;
- per stato;
- per ospiti;
- per gruppo;
- per dieta/allergene;
- ricerca testuale.

## 12. Vista cucina

La vista cucina deve essere estremamente operativa.

Deve mostrare:

- data corrente;
- prossimi pasti;
- conteggi per pasto;
- ospiti;
- asporto;
- servizio in camera;
- orari modificati;
- allergeni/regimi da gestire;
- note cucina evidenziate;
- stampa o export operativo.

La cucina non deve avere accesso a funzioni amministrative. La visibilita' dei nomi va decisa in base al contesto privacy: come impostazione di partenza, privilegiare conteggi e dettagli necessari, non esposizione completa.

Refresh consigliato se la vista resta aperta:

- automatico controllato, non aggressivo;
- refresh manuale sempre disponibile;
- nessun polling eccessivo.

## 13. Gestione ospiti

Il flusso "Aggiungi ospite" deve prevedere:

- nome ospite;
- data iniziale;
- data finale;
- pasti richiesti;
- eventuale piano pasto;
- regime alimentare;
- allergeni;
- nota per cucina;
- conferma.

Gli ospiti devono essere distinguibili con:

- icona dedicata;
- badge "Ospite";
- stile coerente ma non invasivo.

## 14. Piano pasti

Configurazioni minime:

- nessun piano: nessun pasto preselezionato;
- mezza pensione: colazione e cena preselezionate;
- pensione completa: tutti i pasti preselezionati.

Opzione aggiuntiva:

- includere pranzo nel fine settimana per mezza pensione.

Interfaccia consigliata:

- radio card;
- titolo;
- descrizione;
- riepilogo visuale pasti inclusi;
- stato selezionato;
- impostazioni aggiuntive.

## 15. Allergeni e regimi alimentari

Schermata utente:

- elenco allergeni;
- checkbox o switch;
- elenco regimi alimentari;
- campo "Altro";
- nota facoltativa;
- pulsante salva.

Visualizzazione autorizzata:

- badge testuali;
- icona attenzione;
- dettaglio espandibile;
- tooltip desktop;
- esportazione/stampa cucina.

Regola critica:

- allergeni e regimi non devono essere rappresentati solo con abbreviazioni non spiegate.

## 16. Note per la cucina

L'utente deve poter inserire una nota giornaliera.

Il componente include:

- data;
- textarea;
- conteggio caratteri;
- salva;
- elimina nota;
- conferma eliminazione.

La nota appare:

- nella vista personale come indicatore sul giorno;
- nel riepilogo autorizzato in area evidenziata;
- nella vista/stampa cucina;
- negli export operativi.

## 17. Comunicazioni generali

Gli amministratori autorizzati devono poter creare comunicazioni con:

- titolo;
- messaggio;
- data pubblicazione;
- scadenza opzionale;
- priorita';
- link o azione facoltativa.

Quando e' presente una comunicazione:

- icona informativa nella app bar;
- badge messaggi non letti;
- pannello o dialog;
- conferma lettura per avvisi importanti.

## 18. Statistiche ed export

Vista personale:

- numero colazioni/pranzi/cene per mese;
- distribuzione per stato;
- confronto con mese precedente.

Vista amministrativa:

- totale pasti per intervallo;
- suddivisione per tipologia;
- suddivisione per stato;
- numero ospiti;
- pasti annullati;
- pasti da asporto;
- variazioni orario;
- servizio camera;
- filtri per data e gruppo;
- export Excel/CSV.

Linee grafiche:

- niente grafici 3D;
- valori anche testuali;
- massimo 5-6 categorie cromatiche;
- tabella accessibile alternativa;
- filtri sopra i grafici.

## 19. Amministrazione utenti

Elenco utenti:

- nome;
- email o identificativo;
- gruppo;
- piano pasti;
- ruolo;
- stato account;
- azioni.

Dettaglio utente:

- dati personali;
- piano pasti;
- allergeni/regime;
- permessi;
- sicurezza;
- eliminazione.

Eliminazione:

- separata dalle operazioni normali;
- colore di pericolo;
- spiegazione conseguenze;
- conferma esplicita;
- eventuale digitazione nome;
- indicazione di irreversibilita'.

## 20. Navigazione

### Mobile

- app bar superiore;
- menu laterale a scomparsa;
- azioni contestuali a destra;
- bottom sheet per opzioni;
- filtri in pannello a scomparsa.

La app bar contiene:

- menu o indietro;
- nome utente o titolo;
- eventuale sottotitolo/gruppo;
- info/comunicazioni;
- cambio lingua;
- accesso riepilogo se autorizzato.

### Desktop

Soluzioni ammesse:

- sidebar persistente 240-280 px;
- sidebar comprimibile;
- top navigation con menu amministrativo laterale.

La matrice prenotazioni deve mantenere la priorita' visiva.

## 21. Identita' visiva

Direzione:

- essenziale;
- amichevole;
- operativa;
- quotidiana;
- leggibile;
- basata su icone;
- senza decorazioni non funzionali.

Palette proposta:

| Token | Colore | Uso |
| --- | --- | --- |
| primary-user | `#2999E8` | App bar area utente |
| primary-admin | `#FF991F` | App bar riepilogo/admin |
| success | `#6DBD3F` | Pasto prenotato |
| success-dark | `#3F8F29` | Testo/icona conferma |
| warning | `#F5A000` | Orari speciali, asporto, avvisi |
| danger | `#ED4545` | Errori, eliminazioni, limiti |
| neutral-900 | `#202124` | Testo principale |
| neutral-600 | `#666A70` | Testo secondario |
| neutral-400 | `#A7ABB0` | Stati inattivi |
| neutral-200 | `#E4E7EA` | Bordi/divisori |
| neutral-100 | `#F5F6F7` | Fondi secondari |
| surface | `#FFFFFF` | Sfondo principale |
| info-yellow | `#FFF2BE` | Note cucina |
| admin-panel | `#FFE1AE` | Pannelli admin espansi |

Regole:

- contrasto minimo testo/sfondo 4.5:1;
- contrasto minimo controlli 3:1;
- colore sempre accompagnato da icona o testo;
- aree colorate estese con tonalita' chiare e testo scuro.

## 22. Tipografia

Font consigliati:

- Inter;
- Roboto;
- sans-serif di sistema.

Scala:

| Stile | Dimensione | Peso | Uso |
| --- | --- | --- | --- |
| Display | 28-32 px | 600 | Titoli desktop/onboarding |
| H1 | 24 px | 600 | Titolo schermata |
| H2 | 20 px | 600 | Sezioni principali |
| H3 | 17-18 px | 600 | Card/pannelli |
| Body | 16 px | 400 | Testo ordinario |
| Body small | 14 px | 400 | Descrizioni |
| Caption | 12 px | 400/500 | Date/note |
| Button | 14-16 px | 500/600 | Azioni |

Il corpo principale non deve scendere sotto 16 px nelle operazioni critiche.

## 23. Griglia e spaziatura

Base 4 px:

- 4 px micro-distanze;
- 8 px icona/testo;
- 12 px elementi compatti;
- 16 px padding standard;
- 24 px separazione sezioni;
- 32 px margini principali;
- 48 px macroblocchi.

Breakpoint:

- mobile minimo: 320 px;
- mobile riferimento: 390 px;
- tablet: 768-1023 px;
- desktop: 1024 px e oltre;
- contenitore desktop: max 1200-1280 px.

Raggi:

- pulsanti: 8-12 px;
- card: 12 px;
- dialog: 16 px;
- chip: 999 px;
- celle tabella: raggio nullo o minimo.

## 24. Responsive design

Mobile:

- tre colonne pasti sempre riconoscibili;
- celle almeno 44 x 44 px;
- app bar compatta;
- bottom sheet;
- tabelle admin convertite in card o righe espandibili.

Tablet:

- menu laterale opzionale;
- calendario e dettaglio affiancabili;
- pannelli admin a due colonne.

Desktop:

- sidebar persistente;
- tabella completa con intestazione fissa;
- filtri visibili;
- modifica tramite click e menu contestuale;
- larghezza controllata.

## 25. Accessibilita'

Obiettivo: WCAG 2.2 livello AA.

Requisiti:

- navigazione completa da tastiera;
- focus visibile;
- nomi accessibili per icone;
- messaggi dinamici annunciati;
- target adeguati;
- contrasto verificato;
- nessuna informazione affidata solo al colore;
- tab order coerente;
- zoom 200%;
- rispetto di "riduci movimento";
- errori associati ai campi;
- dialog con focus gestito;
- alternativa accessibile alla pressione prolungata.

## 26. Iconografia e micro-interazioni

Icone:

- una sola famiglia coerente, preferibilmente Lucide, Material Symbols o Phosphor;
- 24 px standard;
- 20 px secondarie;
- 28-32 px per stati pasto;
- niente emoji come icone operative.

Animazioni:

- stato pasto: 150-200 ms;
- bottom sheet: 200-250 ms;
- pannello espanso: 180-220 ms;
- snackbar: 150 ms;
- feedback pressione: scala massima 0.97.

Evitare:

- animazioni decorative continue;
- rimbalzi;
- transizioni oltre 400 ms;
- cambi layout improvvisi.

## 27. Stati di sistema

Progettare esplicitamente:

- caricamento;
- skeleton;
- loading su pulsanti;
- stato vuoto;
- errore rete;
- sessione scaduta;
- permessi insufficienti;
- salvataggio fallito;
- conflitto modifiche;
- export non disponibile;
- offline;
- modifiche in attesa di sincronizzazione, se supportate.

Ogni stato vuoto deve includere:

- icona;
- titolo;
- spiegazione;
- eventuale azione.

## 28. Lingue

Il prodotto deve supportare almeno italiano come lingua iniziale e predisposizione i18n.

Il selettore lingua deve avere:

- nome lingua per esteso;
- icona globo opzionale;
- lingua attiva chiara;
- persistenza preferenza;
- aggiornamento immediato;
- supporto espansione testo 30-40%.

Lingue future possibili:

- inglese;
- tedesco;
- spagnolo;
- francese.

## 29. Componenti design system

Il design system deve includere:

- app bar;
- sidebar;
- tab bar categorie pasti;
- riga giorno;
- cella pasto con stati;
- pulsanti primari/secondari/testuali/distruttivi;
- icon button;
- checkbox;
- radio button;
- switch;
- input;
- textarea;
- select;
- time picker;
- date picker;
- chip;
- badge;
- tooltip;
- snackbar;
- alert;
- dialog;
- bottom sheet;
- card;
- accordion;
- tabella;
- pagination;
- skeleton;
- empty state;
- grafici;
- pannello filtri;
- menu contestuale;
- selettore lingua.

Ogni componente deve includere:

- default;
- hover;
- focus;
- pressed;
- disabled;
- loading;
- errore, se applicabile.

## 30. Flussi da prototipare

Il prototipo deve coprire:

- prenotazione semplice;
- cancellazione pasto;
- selezione orario alternativo;
- richiesta asporto;
- richiesta servizio camera;
- aggiunta nota cucina;
- consultazione riepilogo;
- aggiunta ospite;
- modifica prenotazione altrui;
- impostazione allergeni;
- modifica piano pasti;
- pubblicazione comunicazione;
- modifica permessi;
- esportazione statistiche;
- gestione limite temporale;
- eliminazione utente con conferma.

## 31. MVP consigliato

Per evitare un prodotto troppo grande, l'MVP dovrebbe includere:

- login/accesso utente;
- matrice settimana/giorni con colazione, pranzo, cena;
- prenota/cancella con un tocco;
- opzioni pasto base: orario alternativo, asporto, nota;
- scadenze per pasto;
- piano pasti base;
- ospiti;
- allergeni/regimi;
- vista cucina;
- riepilogo admin;
- gestione utenti essenziale;
- esportazione CSV/Excel base;
- comunicazioni generali semplici.

Rinviabile dopo MVP:

- statistiche avanzate;
- multi-lingua completa;
- servizio in camera se non necessario nella prima struttura;
- PWA offline avanzata;
- automazioni notifiche;
- audit avanzato;
- gestione multi-struttura.

## 32. Requisiti non funzionali

- UI responsive e performante.
- Salvataggio percepito rapido.
- Rollback chiaro in caso di errore.
- Dati non persi su doppio click o rete instabile.
- Azioni idempotenti dove possibile.
- Log delle operazioni critiche.
- Export controllato dai permessi.
- Backup e portabilita' dati da progettare fin dall'inizio.
- Nessun lock-in non necessario.

## 33. Privacy e sicurezza

Principi:

- dati personali minimi;
- ruoli e permessi applicati lato server;
- cucina con accesso limitato;
- allergeni/regimi trattati come informazioni sensibili;
- log minimizzati;
- export tracciabile;
- eliminazioni o anonimizzazioni governate da policy;
- sessioni scadute o revocate non utilizzabili.

Non raccogliere nell'MVP se non indispensabile:

- indirizzo;
- telefono obbligatorio;
- email ospite;
- dati sanitari dettagliati;
- note libere non necessarie.

## 34. Deliverable richiesti

UX:

- architettura informativa;
- matrice ruoli/permessi;
- diagrammi flussi principali;
- wireframe mobile e desktop;
- stati e casi limite.

UI:

- moodboard;
- design foundations;
- libreria componenti;
- schermate responsive;
- prototipo interattivo;
- specifiche sviluppo;
- asset SVG;
- icone e illustrazioni originali, se previste.

Handoff:

- misure;
- token;
- comportamento responsive;
- stati interattivi;
- regole validazione;
- testi errore;
- annotazioni accessibilita';
- dipendenze front-end.

## 35. Criteri di accettazione

Il lavoro e' completo quando:

- i flussi principali sono rappresentati;
- ogni schermata ha versione mobile e desktop;
- i componenti hanno stati interattivi documentati;
- colazione, pranzo e cena sono sempre distinguibili;
- operazioni critiche hanno conferma;
- i permessi sono riflessi nell'interfaccia;
- allergeni e note sono visibili agli utenti autorizzati;
- la UI funziona senza affidarsi solo alla pressione prolungata;
- contrasto e accessibilita' sono verificati;
- sono presenti caricamenti, errori e stati vuoti;
- il prototipo permette scenari end-to-end;
- il design e' implementabile come web app responsive/PWA.

## 36. Schermate stimate

Copertura completa stimata:

- 8-10 schermate area utente;
- 10-14 schermate area amministrativa;
- 8-12 dialog/bottom sheet;
- 5-7 stati di sistema;
- 3 breakpoint responsive;
- 35-50 componenti principali con varianti.

Totale indicativo: 25-35 layout distinti, oltre a varianti responsive e stati.

## 37. Domande aperte per il nuovo progetto

Prima di scegliere stack e iniziare sviluppo, decidere:

- il nuovo progetto deve essere mono-struttura o multi-struttura?
- gli utenti standard avranno account, link personale, codice PIN o accesso misto?
- la cucina puo' vedere nomi o solo conteggi e dettagli alimentari?
- servizio in camera e asporto sono obbligatori nell'MVP?
- quali allergeni/regimi sono necessari all'avvio?
- quali export servono davvero: CSV, Excel, PDF, stampa browser?
- serve notificare gli utenti o basta consultazione manuale?
- quali dispositivi sono prioritari: smartphone utenti, tablet cucina, desktop admin?
- quale limite realistico: 30, 100, 300 o piu' utenti?
- storico e dati personali dopo quanto vanno archiviati o anonimizzati?
