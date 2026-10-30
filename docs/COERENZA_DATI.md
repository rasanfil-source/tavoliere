# Coerenza dei dati e autorizzazioni operative

## Configurazione e persone

La configurazione del centro e la Persona del responsabile vengono salvate nella stessa transazione finale. Validazione dei campi e controllo dei duplicati precedono le scritture. Firebase Auth e riscrittura delle finestre calendario hanno fasi distinte: l'interfaccia comunica quali operazioni sono state completate.

Ogni salvataggio anagrafico legge e aggiorna il documento comune dei metadati. Una modifica concorrente ripete la transazione e la verifica delle sigle duplicate. La disattivazione di una persona nega nuove prenotazioni; la pulizia revoca sessioni, credenziali e dati associati in blocchi controllati, rispettando i permessi sulle persone protette.

La revoca amministrativa usa la membership del centro. Il profilo globale privato è un indice di navigazione e non attribuisce permessi. Il trasferimento dell'incarico aggiorna insieme centro, persona, invito e membership; il profilo di navigazione viene riallineato dall'interessato.

## Giornate, diete e prenotazioni

I campi giornalieri assenti sono interpretati come vuoti. Le scritture parziali preservano i campi indipendenti degli altri operatori. L'elenco ammalati conserva separatamente il valore letto dal server e la selezione in modifica: la transazione applica aggiunte e rimozioni rispetto a quel riferimento.

La dieta occasionale della giornata prevale sulla dieta registrata nella prenotazione, che a sua volta conserva il valore assegnato al momento del salvataggio. Cucina e Riepilogo usano lo stesso criterio e i dati del pasto della data richiesta. Gli ammalati senza prenotazione conservano l'indicazione della dieta senza aumentare i commensali.

Le scritture concorrenti della stessa prenotazione vengono riconciliate in transazione. Identità, data di creazione e dieta già registrata sono preservate; restano applicati permessi e scadenze. Le selezioni di giornata sono atomiche.

Il ricalcolo del calendario conserva il proprio intervallo e il punto di ripresa. Un'attività incompleta deve essere completata o ricostruita anche se gli orari richiesti coincidono con quelli del centro. La copertura include tutte le finestre interessate.

## Accessi e riservatezza

Le sessioni residenti leggono soltanto i contatti con consenso quando il centro ne consente la condivisione. Il ritiro del consenso blocca le letture successive; non può ritirare dati già scaricati. I gestori autorizzati mantengono l'accesso alla directory del proprio centro.

L'elenco degli inviti amministrativi è riservato ai gestori autorizzati; quello degli inviti centro al proprietario della piattaforma. La consultazione di un invito noto e valido mantiene il percorso di accettazione. Una sessione vice richiede un centro attivo e la password amministratori corrente.

Le copie di sicurezza esportano un elenco esplicito di campi consentiti. Password, identità tecniche, account Firebase, membership amministrative, token e sessioni sono esclusi. Il caricamento dal pannello ripristina soltanto la configurazione autorizzata e scarica una copia preventiva dello stato corrente.

Il registro attività usa lo stesso nome risolto per visualizzazione e ricerca. La dicitura «Carica attività precedenti» riguarda gli eventi operativi del centro.

Il perimetro della sessione Cucina è descritto in [Accesso cucina e credenziali condivise](PERIMETRO_ACCESSO_CUCINA.md).

## Installazione e verifiche

Il manifest identifica centro e funzione senza incorporare password. I margini dell'interfaccia rispettano le aree sicure del dispositivo. I promemoria sono locali: non sono garantiti con l'app chiusa o sospesa.

I test usano dati sintetici e, per le autorizzazioni, SDK reale ed emulatore Firestore. Coprono transazioni, concorrenza, revoche, confini fra centri, dati giornalieri e aggiornamenti atomici della cache. Le prove in emulatore non misurano la latenza dei dispositivi né il costo degli indici di produzione.
