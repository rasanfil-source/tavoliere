# Modello dati Firebase

Stato: modello operativo multi-centro su piano Spark.

Ogni sede usa un proprio `centerId`. Tutti i dati operativi restano sotto
`centers/{centerId}` e le regole impediscono a un amministratore locale di
operare su un centro diverso dal proprio.

## Collezioni principali

```text
centers/{centerId}
centers/{centerId}/admins/{adminUid}
centers/{centerId}/groups/{groupId}
centers/{centerId}/assets/{assetId}
centers/{centerId}/participants/{participantId}
centers/{centerId}/publicParticipants/{participantId}
centers/{centerId}/mealTypes/{mealTypeId}
centers/{centerId}/mealWindows/{mealWindowId}
centers/{centerId}/linkTokens/{tokenId}
centers/{centerId}/accessSessions/{authUid}
centers/{centerId}/kitchenNotes/{dateId}
centers/{centerId}/dailyOperations/{dateId}
centers/{centerId}/dailyHealth/{dateId}
centers/{centerId}/reservationRules/{ruleId}
centers/{centerId}/reservationOverrides/{overrideId}
centers/{centerId}/reservationOverrideHistory/{historyId}
adminProfiles/{adminUid}
centerInvitations/{invitationId}
adminInvitations/{invitationId}
```

## Bootstrap minimo

Centro:

```json
{
  "name": "Nome del centro",
  "reservationCutoffs": {
    "lunch": "09:30",
    "dinner": "15:00",
    "nextDayBreakfast": "15:00"
  },
  "status": "ACTIVE"
}
```

Amministratore iniziale:

```text
centers/{centerId}/admins/{adminUid}
```

```json
{
  "centerId": "<centerId>",
  "role": "OWNER",
  "status": "ACTIVE"
}
```

Il proprietario della piattaforma genera un documento in `centerInvitations`.
Il direttore apre il link monouso, si autentica con Google oppure con email e
password verificata e crea in un solo batch il centro, il proprio profilo e il
documento amministrativo iniziale. Non e' necessario creare amministratori a
mano dalla console Firestore.

## Link token

I token sono bearer secret: chi possiede il token puo' creare una sessione anonima nei limiti dello scope. Devono essere ad alta entropia e non indovinabili.

Token pubblico:

```json
{
  "status": "ACTIVE",
  "scope": "PUBLIC",
  "targetType": "CENTER",
  "expiresAt": "<Timestamp>"
}
```

Token cucina:

```json
{
  "status": "ACTIVE",
  "scope": "KITCHEN",
  "targetType": "CENTER",
  "expiresAt": "<Timestamp>"
}
```

Token personale:

```json
{
  "status": "ACTIVE",
  "scope": "PERSONAL",
  "targetType": "PARTICIPANT",
  "participantId": "<participantId>",
  "expiresAt": "<Timestamp>"
}
```

Il token personale viene generato soltanto dopo l'autenticazione con la password comune. E' casuale, resta legato a un solo `participantId` e scade dopo 9.000 giorni; non viene inserito nei link pubblici. Il dispositivo lo usa per rinnovare sessioni anonime piu' brevi e lo revoca con `Esci`.

## Access sessions

La sessione viene creata dal client autenticato, normalmente anonymous auth per link pubblici/personali/cucina.

Campi obbligatori:

```json
{
  "centerId": "<centerId>",
  "scope": "PUBLIC",
  "targetType": "CENTER",
  "tokenId": "<tokenId>",
  "status": "ACTIVE",
  "expiresAt": "<Timestamp non successivo alla scadenza del token>",
  "createdAt": "<request.time>",
  "updatedAt": "<request.time>"
}
```

Regole importanti:

- `expiresAt` non puo' superare la scadenza del token;
- una sessione scaduta non e' piu' valida anche se `status` resta `ACTIVE`;
- `KITCHEN` non puo' impostare `participantId` in create;
- `PUBLIC` non puo' impostare `participantId` e resta di sola lettura;
- `PERSONAL` deve copiare il `participantId` stabilito dal proprio token e puo' scrivere soltanto per quel partecipante.

## Meal window

ID consigliato:

```text
yyyyMMdd_mealTypeId
```

Esempio:

```json
{
  "mealDate": "2026-08-04",
  "mealTypeId": "lunch",
  "status": "OPEN",
  "closesAt": "<Timestamp>"
}
```

Gli override sono permessi solo se la relativa `mealWindow` e' aperta e non scaduta.

Default operativi del prototipo:

- pranzo del giorno: modificabile fino alle `09:30`;
- cena del giorno: modificabile fino alle `15:00`;
- colazione del giorno successivo: modificabile fino alle `15:00` del giorno prima.

In produzione questi orari saranno modificabili dall'amministratore, ma il blocco effettivo continua a dipendere da `mealWindows/{mealWindowId}.closesAt`.
