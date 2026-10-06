# syncRadio-mirror

Repository mirror di [syncRadio](https://github.com/interestingStuffs/syncRadio) usata per pubblicare la versione personalizzata su GitHub Pages.

## Funzionamento

- La pipeline `Sync mirror` scarica l'ultima versione di `interestingStuffs/syncRadio` ogni sei ore.
- Copia tutti i contenuti upstream, esclusi i file di personalizzazione e la pipeline.
- Conserva `config.json`, `samples`, `.github`, `scripts`, `package.json` e `package-lock.json` della mirror.
- Rimuove i file upstream non più presenti e crea un commit automatico se ci sono modifiche.
- Il workflow `Deploy GitHub Pages` esegue i test, pubblica il sito e distribuisce gli artefatti a GitHub Pages.

## Esecuzione locale

```sh
npm install
npm test
npm run sync /path/to/syncRadio /path/to/mirror
```

Il comando richiede che la cartella di destinazione sia una repository Git. La sincronizzazione è idempotente: se il contenuto è già aggiornato non crea un commit.

## Personalizzazioni

Modifica `config.json` e `samples` nella mirror. Questi contenuti non verranno sostituiti dalla sorgente upstream.

## Pipeline

- `.github/workflows/sync-mirror.yml`: aggiorna la mirror con la sorgente upstream.
- `.github/workflows/deploy-pages.yml`: esegue test e deploy su GitHub Pages.

## Requisiti

- Node.js 20 o successivo.
- Git.
- Una repository Git come destinazione della sincronizzazione.
- GitHub Pages abilitato per la repository.
