# syncRadio-mirror

Configurazione personalizzata di [syncRadio](https://github.com/interestingStuffs/syncRadio), pubblicata su GitHub Pages.

## Funzionamento

- A ogni push su questa repository e ogni ora, scarica `interestingStuffs/syncRadio` e ne esegue i test.
- Sostituisce `config.json` e `samples/` upstream con quelli di questa repository.
- Pubblica direttamente il sito risultante su GitHub Pages, senza copiare o committare il codice upstream qui.

## Esecuzione locale

Il workflow si può avviare anche manualmente dalla scheda Actions di GitHub. L'aggiornamento upstream viene rilevato entro circa un'ora.

## Personalizzazioni

Modifica `config.json` e `samples/` in questa repository: durante la pubblicazione sostituiscono i corrispondenti contenuti upstream.

## Pipeline

- `.github/workflows/deploy-pages.yml`: testa upstream, applica le personalizzazioni e distribuisce il sito su GitHub Pages.

## Requisiti

- Node.js 20 o successivo.
- Git.
- GitHub Pages abilitato per la repository.
