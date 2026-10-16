# Avvio, sessioni e calendario

L'apertura della PWA ricostruisce identità e calendario attraverso fasi indipendenti. La presentazione iniziale resta visibile fino alla disponibilità della griglia ordinaria; alla scadenza dell'attesa appare uno stato informativo. Una copia locale non autorizza modifiche.

## Identificazione e persistenza

Firebase Auth usa `initializeAuth` con `browserLocalPersistence`. Il supporto alla finestra Google viene fornito soltanto quando richiesto. La seconda istanza Auth, dedicata alle password condivise, usa la memoria e non sostituisce l'identità principale.

La password comune viene verificata per prima; soltanto un rifiuto delle credenziali avvia il percorso della password amministratori. Un errore di rete non provoca altri tentativi di password. Il token personale del dispositivo ha durata massima configurata di 9000 giorni; la sessione Firestore dura 30 giorni ed è ricostruibile da un token valido. In memoria una sessione confermata può essere riutilizzata entro cinque minuti.

Una persona inattiva, un token scaduto o un'identità incoerente richiedono l'accesso. Gli errori temporanei di rete conservano le credenziali, senza conferire nuovi permessi. La cancellazione dei dati del browser e la navigazione privata possono impedire la persistenza; senza localStorage Auth usa la memoria.

## Letture e pubblicazione

1. Auth e traduzioni si avviano indipendentemente.
2. La sessione viene verificata o creata prima delle letture operative protette. Una lettura anticipata del profilo è consentita soltanto con identità anonima e token dispositivo validi; se negata per sessione assente, viene ripetuta dopo la sua creazione.
3. Profilo, impostazioni essenziali e prenotazioni possono avanzare in parallelo. Il calendario combina tipi pasto, finestre del periodo, prenotazioni specifiche e regola personale.
4. Prima della pubblicazione vengono confermati persona, sigla, centro, vista, periodo, revisione, fuso orario e lingua. Le scadenze sono rivalutate anche dopo una lettura lenta.
5. Presentazione completa, icona, ruoli accessori, Messa, salute, note e promemoria proseguono separatamente dal calendario.

Le richieste equivalenti condividono le letture pendenti. Salvataggi e cambi d'identità invalidano richieste e cache pertinenti. Le risposte superate non possono sostituire il calendario corrente o riattribuire privilegi.

Il periodo viene allineato al fuso orario del centro e al giorno iniziale della settimana preferito dalla persona. La richiesta segue le date effettive. Se un allineamento tardivo modifica il periodo, il recupero avvia una lettura soltanto quando la stessa richiesta controlla ancora la vista.

## Vista iniziale e lingua

La PWA installata applica la vista personale dopo il ripristino dell'identità, anche quando l'indirizzo di avvio indica il mese. Ricarica e cronologia conservano la schermata corrente. Le preferenze personali sono locali al dispositivo e alla persona.

Le lingue disponibili sono italiano, inglese, francese, spagnolo, tedesco e catalano. La precedenza è preferenza personale, lingua del centro, lingua del browser, italiano. I cataloghi condividono chiavi e variabili; date, numeri e plurali usano le API `Intl`. Le stringhe essenziali incorporate permettono di mostrare gli stati dell'app anche durante il caricamento del catalogo.

## Trasporto e ripresa

L'app usa Firestore completo con cache in memoria. Su iPhone, iPad e Safari macOS la politica di trasporto usa long polling senza flussi fetch, considerando il buffering del motore WebKit. Non vengono aggiunti ritardi artificiali per liberare connessioni.

La ripresa di una pagina in memoria usa gli eventi di visibilità e i timer di aggiornamento; una nuova pagina esegue invece l'intero ripristino. I formattatori sono memorizzati in cache limitate, mentre il giorno corrente viene sempre ricalcolato.

La query delle prenotazioni personali è limitata al periodo e usa l'indice `reservationOverrides(participantId ASC, mealDate ASC)`. In caso di `failed-precondition` il percorso alternativo filtra in memoria le prenotazioni della persona. L'emulatore non dimostra disponibilità o costo dell'indice in produzione.

## Verifiche

Le suite di avvio e riapertura eseguono le funzioni applicative con promesse controllate e dati sintetici. Coprono sovrapposizione delle letture, cambi d'identità e periodo, permessi, scadenze, invalidazioni e preferenze persistenti. Le prove browser desktop e mobile simulate verificano l'interfaccia; non equivalgono a un collaudo del sistema operativo su un dispositivo fisico.

La diagnostica `diagnostics=startup` è facoltativa e locale: registra nomi fissi delle fasi e durate, senza identità, credenziali, URL o dati Firestore. Per i comandi vedere [Sviluppo e test](SVILUPPO_E_TEST.md).
