# Forma · storefront demo

Storefront bilingue in Next.js 15.5 App Router, React 19 e Tailwind. Home con hero e due moduli editoriali, pagina prodotto con configuratore, carrello con checkout e conferma.

| Pagina | Italiano | English |
| --- | --- | --- |
| Home | `/it` | `/en` |
| Prodotto | `/it/pod` | `/en/pod` |
| Carrello e checkout | `/it/cart` | `/en/cart` |
| Conferma | `/it/confirmation` | `/en/confirmation` |

## Avvio e collaudo

Node 22, pnpm 9.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Apri `http://localhost:3000/it`. Usa dati fittizi nel checkout, ad esempio Alex Example, `alex@example.test`, Via Esempio 10, Milano, Italia, CAP 20121. Puoi completare l'ordine con **Pagamento demo** o **Apple Pay demo**.

```sh
pnpm typecheck
pnpm exec playwright install chromium
pnpm test
```

Playwright verifica home, configurazione, aggiornamento del carrello, validazione lato server, Apple Pay demo, conferma al refresh, retry con lo stesso identificatore e contratto del `dataLayer`. Per testare una Preview accessibile, passa `TEST_BASE_URL=https://<preview>.vercel.app`.

## MockService

I servizi di catalogo, carrello, opzioni di pagamento e checkout usano [MockService](lib/mock-service.ts). Ogni chiamata esegue una funzione dopo un ritardo configurabile, supporta la cancellazione via `AbortSignal` e può simulare un errore 503.

| Impostazione | Effetto |
| --- | --- |
| `MOCK_SCENARIO=normal` | Catalogo 650 ms, carrello 350 ms, opzioni di pagamento 700 ms, checkout 1150 ms |
| `MOCK_SCENARIO=instant` | Risposta senza ritardo intenzionale |
| `MOCK_SCENARIO=slow` | Ritardi triplicati |
| `MOCK_SCENARIO=error` | 503 per l'operazione indicata in `MOCK_FAIL_OPERATION`: `catalog`, `cart`, `payment-options` o `checkout` |

Il server ricalcola prezzi e spedizione e valida il totale mostrato prima di confermare. Il carrello e la ricevuta demo usano cookie HttpOnly. La conferma conserva riferimento, metodo e totale nel browser per 24 ore. I dati di consegna vengono usati per la validazione e scartati. Il checkout è simulato in tutti gli ambienti.

## Deploy su Vercel

| Git | Ambiente Vercel | URL | Variabili |
| --- | --- | --- | --- |
| `staging` | Preview | URL di branch assegnato da Vercel | GTM di test, profilo mock selezionato per QA |
| `main` | Production | `forma.davidemagnoni.it` proposto | GTM di produzione, `MOCK_SCENARIO=normal` |

1. Importa la repository GitHub in Vercel con preset Next.js e Node 22. Configura `main` come Production Branch. Il lockfile e `packageManager` gestiscono l'installazione. La Git integration genera la Preview al push di `staging`.
2. Dopo i controlli sulla Preview e sulla CI, apri la PR `staging → main`. Il merge avvia la build Production con le variabili del suo ambiente.
3. Imposta `SITE_URL=https://forma.davidemagnoni.it` negli ambienti Vercel. Aggiungi il sottodominio al progetto Vercel in Production. Nel DNS di `davidemagnoni.it` crea il record CNAME di `forma` con il valore indicato da Vercel e attendi la verifica HTTPS.

[Git integration](https://vercel.com/docs/git) · [Configurazione dominio](https://vercel.com/docs/domains/set-up-custom-domain)

### Import dal bundle Git

Il bundle esportato contiene `main` e `staging`. Da questa cartella, con GitHub CLI autenticata sull’account scelto, puoi creare la repository privata e pubblicare entrambi i branch.

```sh
git clone forma-storefront.bundle ../forma-storefront
cd ../forma-storefront
git branch --track staging origin/staging
git remote rename origin bundle
gh repo create forma-storefront --private --source . --remote origin
git push -u origin main staging
```

## Google Tag Manager e GA4

1. Crea container GTM e proprietà GA4 dedicati alla Preview e alla Production. Aggiungi `NEXT_PUBLIC_GTM_ID` per ciascun ambiente e avvia una nuova build. Il container si carica dopo `load` e dopo il consenso.
2. Imposta il Google tag con `send_page_view=false` e `cookie_domain=none`. In GA4 disattiva le page view automatiche da cronologia. Per il trigger GTM `storefront_view`, invia il nome GA4 `page_view` e mappa `page_location`, `page_type` e `locale`.
3. Aggiungi un tag evento con trigger Custom Event regex `^(cta_click|add_to_cart|begin_checkout|demo_order_completed)$`. Usa la variabile GTM integrata Event come nome e mappa `page_location`, `page_type` e `locale`. Per `cta_click` aggiungi `cta_id` come dimensione dell'evento. `demo_order_completed` rappresenta la conferma simulata.
4. Per i Web Vitals usa un tag separato `web_vital` con `vital_name`, `vital_value`, `vital_id`, `page_type` e `locale`. La query [BigQuery](analytics/vitals.sql) calcola il p75 per pagina e dispositivo.
5. Controlla Tag Assistant e GA4 DebugView sul container di Preview. Ripeti home → prodotto → carrello → conferma con consenso e verifica `page_view` e i clic delle CTA. Il payload applicativo usa il percorso della pagina e gli ID delle CTA. Il browser espone gli stessi eventi in `window.dataLayer` anche senza container.

[Page view GA4](https://developers.google.com/analytics/devguides/collection/ga4/views) · [Google Consent Mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)

## Performance e asset

Home e prodotto sono prerenderizzati per ciascuna lingua. Carrello e conferma leggono i cookie a richiesta. La hero mobile usa un WebP da 21 KB, con priorità alta e dimensioni riservate. Le immagini sotto la piega sono responsive e lazy. I Web Vitals arrivano da un chunk separato dopo il consenso. Gli asset sono originali e generati con ImageGen. Le foto aggiunte mostrano la cover blu in uno studio neutro e un dettaglio ravvicinato delle cuciture.
