# Soluzione: Generare viste filtrate in Notion tramite API

## Concetto generale
Notion non espone i filtri applicati a un database nell'URL, ma possiamo intercettare e manipolare i filtri direttamente tramite le API interne. Questo ci permette di:
1. Salvare configurazioni di filtri specifiche
2. Applicare filtri personalizzati tramite script
3. Creare "link" a viste filtrate attraverso bookmarklet o estensioni

## API chiave: `/api/v3/saveTransactionsFanout`
La modifica dei filtri avviene esclusivamente attraverso questa API. Non è necessario chiamare `/api/v3/queryCollection` - l'interfaccia si aggiorna automaticamente dopo il salvataggio.

## Struttura della richiesta

### Headers richiesti:
```javascript
{
  "notion-client-version": "23.13.0.2195",
  "notion-mac-version": "4.5.0", 
  "notion-audit-log-platform": "mac-desktop",
  "x-notion-active-user-header": "ID-UTENTE",
  "x-notion-space-id": "ID-WORKSPACE",
  "Content-Type": "application/json"
}
```

### Corpo della richiesta:
```javascript
{
  "requestId": "filtro-" + Date.now(), // ID univoco per la richiesta
  "transactions": [
    {
      "id": "trans-" + Date.now(), // ID univoco per la transazione
      "spaceId": "ID-WORKSPACE",
      "debug": {
        "userAction": "collectionFilterActions.applyTemporaryStateIfPrivate"
      },
      "operations": [
        {
          "pointer": {
            "table": "collection_view",
            "id": "ID-VISTA-DATABASE",
            "spaceId": "ID-WORKSPACE"
          },
          "path": ["query2"],
          "command": "update",
          "args": {
            // Configurazione completa dei filtri
            "filter": { /* struttura filtri */ },
            "sort": [ /* struttura ordinamento */ ],
            "group_by": { /* struttura raggruppamento */ }
          }
        }
      ]
    }
  ]
}
```

## Struttura dei filtri

### Filtro semplice:
```javascript
"filter": {
  "operator": "and",
  "filters": [
    {
      "filter": {
        "value": {
          "type": "relative",
          "value": "today"
        },
        "operator": "date_is_on_or_before"
      },
      "property": "notion://tasks/due_date_property"
    }
  ]
}
```

### Filtro complesso (con operatori OR):
```javascript
"filter": {
  "operator": "and",
  "filters": [
    {
      "filters": [
        {
          "filter": {
            "value": {"type": "relative", "value": "today"},
            "operator": "date_is_on_or_before"
          },
          "property": "notion://tasks/due_date_property"
        },
        {
          "filter": {
            "value": {"type": "relative", "value": "one_week_ago"},
            "operator": "date_is_on_or_after"
          },
          "property": "notion://tasks/due_date_property"
        }
      ],
      "operator": "or"
    },
    {
      "filter": {
        "value": [
          {"type": "is_option", "value": "In progress"},
          {"type": "is_option", "value": "To-do"}
        ],
        "operator": "status_is"
      },
      "property": "notion://tasks/status_property"
    }
  ]
}
```

### Ordinamento:
```javascript
"sort": [
  {
    "property": "notion://tasks/due_date_property",
    "direction": "ascending" // o "descending"
  }
]
```

## Implementazione pratica

### 1. Script di intercettazione per catturare la configurazione attuale:
```javascript
// Monitora le richieste per catturare la configurazione corrente
let originalFetch = window.fetch;
let lastFilterConfig = null;

window.fetch = function(...args) {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource.url;
  
  if (url.includes('/api/v3/queryCollection')) {
    try {
      const body = JSON.parse(config.body);
      if (body.loader && body.loader.filter) {
        lastFilterConfig = {
          filter: body.loader.filter,
          sort: body.loader.sort,
          searchQuery: body.loader.searchQuery
        };
        console.log('🔍 Configurazione filtri catturata:', lastFilterConfig);
      }
    } catch (e) {
      // Ignora errori di parsing
    }
  }
  
  return originalFetch.apply(this, args);
};
```

### 2. Funzione per salvare una configurazione:
```javascript
function saveFilterConfig(name) {
  if (!lastFilterConfig) {
    alert('Nessuna configurazione di filtri rilevata. Applica prima un filtro.');
    return;
  }
  
  const savedFilters = JSON.parse(localStorage.getItem('notion_saved_filters') || '{}');
  savedFilters[name] = {
    config: lastFilterConfig,
    timestamp: new Date().toISOString(),
    viewId: getCurrentViewId(), // Funzione per ottenere l'ID della vista
    spaceId: getCurrentSpaceId() // Funzione per ottenere l'ID del workspace
  };
  
  localStorage.setItem('notion_saved_filters', JSON.stringify(savedFilters));
  console.log(`✅ Configurazione "${name}" salvata`);
}
```

### 3. Funzione per applicare una configurazione salvata:
```javascript
async function applyFilterConfig(name) {
  const savedFilters = JSON.parse(localStorage.getItem('notion_saved_filters') || '{}');
  const config = savedFilters[name];
  
  if (!config) {
    alert(`Configurazione "${name}" non trovata`);
    return;
  }
  
  const transaction = {
    requestId: "apply-filter-" + Date.now(),
    transactions: [
      {
        id: "trans-" + Date.now(),
        spaceId: config.spaceId,
        debug: {
          userAction: "collectionFilterActions.applyTemporaryStateIfPrivate"
        },
        operations: [
          {
            pointer: {
              table: "collection_view",
              id: config.viewId,
              spaceId: config.spaceId
            },
            path: ["query2"],
            command: "update",
            args: config.config
          }
        ]
      }
    ]
  };
  
  try {
    const response = await fetch("/api/v3/saveTransactionsFanout", {
      method: "POST",
      headers: getNotionHeaders(), // Funzione per ottenere gli header
      body: JSON.stringify(transaction)
    });
    
    if (response.ok) {
      console.log(`✅ Configurazione "${name}" applicata con successo`);
    } else {
      throw new Error(`Errore HTTP: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Errore nell\'applicazione della configurazione:', error);
  }
}
```

### 4. Funzioni di utilità:
```javascript
// Ottieni gli header Notion necessari
function getNotionHeaders() {
  return {
    "notion-client-version": "23.13.0.2195",
    "notion-mac-version": "4.5.0", 
    "notion-audit-log-platform": "mac-desktop",
    "x-notion-active-user-header": getCurrentUserId(),
    "x-notion-space-id": getCurrentSpaceId(),
    "Content-Type": "application/json"
  };
}

// Estrai l'ID della vista corrente dall'URL
function getCurrentViewId() {
  const url = window.location.href;
  const match = url.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
  return match ? match[0] : null;
}

// Estrai l'ID del workspace dagli elementi della pagina
function getCurrentSpaceId() {
  const metaElement = document.querySelector('meta[name="notion-space-id"]');
  return metaElement ? metaElement.getAttribute('content') : null;
}
```

## Bookmarklet per uso rapido

### Salva configurazione:
```javascript
javascript:(function(){
  const name = prompt('Nome per questa configurazione di filtri:');
  if (name) {
    // Codice per salvare la configurazione
    saveFilterConfig(name);
  }
})();
```

### Applica configurazione:
```javascript
javascript:(function(){
  const saved = JSON.parse(localStorage.getItem('notion_saved_filters') || '{}');
  const names = Object.keys(saved);
  if (names.length === 0) {
    alert('Nessuna configurazione salvata');
    return;
  }
  const name = prompt(`Configurazioni disponibili:\n${names.join('\n')}\n\nInserisci il nome:`);
  if (name && saved[name]) {
    applyFilterConfig(name);
  }
})();
```

## Vantaggi di questo approccio:
1. **Persistenza**: Le configurazioni vengono salvate in localStorage
2. **Portabilità**: I bookmarklet funzionano su qualsiasi database Notion
3. **Flessibilità**: Supporta filtri complessi, ordinamenti e raggruppamenti
4. **Velocità**: Applicazione immediata senza ricaricamento della pagina
5. **Estendibilità**: Facile da integrare in estensioni browser o script più complessi

## Limitazioni:
1. Gli ID di vista e workspace devono essere corretti per ogni database
2. Gli header potrebbero cambiare con gli aggiornamenti di Notion
3. Funziona solo all'interno della sessione autenticata di Notion