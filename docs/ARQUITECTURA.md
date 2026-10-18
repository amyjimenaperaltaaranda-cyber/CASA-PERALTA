# Casa Peralta · Arquitectura del inventario

Este documento describe **cómo funciona hoy** el inventario de Casa Peralta y **la estructura a la que debe crecer**:
cantidades, medidas, consumo, caducidad, maduración y la barra de vida (semáforo). También explica cómo se conectan las
próximas funciones: consumos variables, pagos de servicios, post-its del mural, gestión de usuarios y la IA.

Los diagramas están escritos en [Mermaid](https://mermaid.js.org/) y GitHub los dibuja solo al abrir este archivo.

**Contenido**

1. [Principios](#1-principios)
2. [Arquitectura de software](#2-arquitectura-de-software)
3. [Navegación del usuario](#3-navegación-del-usuario)
4. [Base de datos](#4-base-de-datos)
5. [Cantidades y medidas](#5-cantidades-y-medidas)
6. [Consumo](#6-consumo)
7. [Caducidad](#7-caducidad)
8. [Maduración](#8-maduración)
9. [Barra de vida y semáforo](#9-barra-de-vida-y-semáforo)
10. [Ciclo de vida de un lote](#10-ciclo-de-vida-de-un-lote)
11. [Escalabilidad y seguridad](#11-escalabilidad-y-seguridad)
12. [Hoja de ruta](#12-hoja-de-ruta)

---

## 1. Principios

Estas reglas ya rigen el código y la estructura nueva las mantiene:

| Principio | Qué significa | Dónde está |
|---|---|---|
| **Cada compra es un lote** | Dos bolsas de cebolla compradas en días distintos son dos lotes; cada uno lleva su cantidad, su fecha y su vencimiento. | `lib/lots.ts` → `Lot` |
| **FEFO** (*first expired, first out*) | Al usar algo, sale primero del lote que vence antes. | `fefo()`, `applyLotAction('use')` |
| **Unidad base** | Todo se guarda en una sola unidad por producto: gramos, mililitros o piezas. Tazas, kilos y frascos son solo formas de ingresar. | `Article.unit`, `Article.tracking` |
| **Aprender de lo real** | El ritmo de consumo sale de observaciones reales (compras, usos, revisiones), no de valores inventados. | `learnRate()` |
| **Historial inmutable** | Todo cambio deja un movimiento que nunca se edita ni se borra. | colección `movements` |
| **Borrado suave** | Nada se elimina: lotes y productos se ocultan con `deletedAt` y se pueden restaurar. | `FIRESTORE.md` |
| **Reglas copiadas** | Un producto copia las reglas de su tipo al crearse; cambiar el tipo después no altera productos existentes. | `lib/product-types.ts` |
| **Lógica pura, sin pantalla** | Los cálculos viven en `lib/` como funciones puras; los componentes solo muestran y despachan acciones. | `lib/*.ts` |

---

## 2. Arquitectura de software

La app es una sola página de **Next.js 16 + React 19** que corre en el navegador. El estado vive en un `GameProvider`
(un `useReducer`) y se sincroniza en tiempo real con **Firebase** (Auth + Firestore). Las funciones marcadas como
*próximo* aún no existen y se muestran para ver dónde encajan.

```mermaid
flowchart LR
  subgraph Navegador["Navegador · Next.js 16 / React 19"]
    direction TB
    UI["Escenas y paneles<br/>components/kitchen · bathroom · login · laundry"]
    GP["GameProvider<br/>useReducer + acciones"]
    DOM["Dominio puro · lib/<br/>lots · catalog · product-types · fruit<br/>shopping · loans · hampers · days"]
    DBL["Capa de datos · lib/db.ts<br/>subscribe* / save*"]
    AUTH["lib/auth.ts<br/>PIN · Google admin · sesión anónima"]
    MIC["Dictado por voz<br/>Web Speech API (próximo)"]
    UI -- "dispatch(acción)" --> GP
    GP -- "applyLotAction, summarize…" --> DOM
    GP -- "estado" --> UI
    GP -- "guardar en lote (batch)" --> DBL
    DBL -- "onSnapshot → hydrate*" --> GP
    UI --> AUTH
    MIC -.-> UI
  end

  subgraph Firebase
    direction TB
    FA["Firebase Auth<br/>Google (admin) + anónima (familia)"]
    FS[("Cloud Firestore<br/>lots · movements · products<br/>users · hampers · petTracker")]
    AI["Firebase AI Logic · Gemini<br/>(próximo)"]
  end

  AUTH --> FA
  DBL <--> FS
  GP -.-> AI
```

### Flujo de una acción

Ejemplo: alguien registra que usó 3 tazas de arroz. La pantalla se actualiza al instante (actualización optimista) y
Firestore confirma después; los demás dispositivos lo ven por su suscripción.

```mermaid
sequenceDiagram
  actor U as Familia
  participant P as RegisterPanel
  participant G as GameProvider
  participant L as lib/lots.ts
  participant D as lib/db.ts
  participant F as Firestore

  U->>P: "Usé 3 tazas de arroz"
  P->>G: dispatch({ type: 'use', articleId: 'arroz', amount: 570 })
  G->>L: applyLotAction(lots, acción, { today, by })
  L-->>G: { lots, changed, movements, message }
  G-->>P: nuevo estado + aviso «quedan …»
  G->>D: saveLots(changed, movements, by)
  D->>F: writeBatch: lots/{id} + movements/{auto}
  F-->>D: onSnapshot(lots)
  D-->>G: hydrateLots(lots)
```

### Módulos del dominio

| Módulo | Responsabilidad |
|---|---|
| `lib/catalog.ts` | Muebles (`shelves`), insumos del catálogo (`articles`), presentaciones de compra, botones de uso y formato de cantidades. |
| `lib/product-types.ts` | Plantillas para crear productos nuevos (fresco, congelado, seco, lácteo, fruta…). |
| `lib/products.ts` | Crear, editar, archivar y restaurar productos de la familia. |
| `lib/lots.ts` | Lotes, FEFO, ritmo de consumo, resúmenes (nivel, días restantes, vencimiento) y todas las acciones sobre lotes. |
| `lib/fruit.ts` | Puntuación y etapa de madurez. |
| `lib/shopping.ts` | Lista de compras automática. |
| `lib/dictionary.ts` | Reconoce un nombre escrito y propone tipo y mueble (base para el dictado y la IA). |
| `lib/loans.ts`, `lib/hampers.ts` | Paraguas prestados y canastas de ropa sucia. |
| `lib/db.ts` | Única puerta a Firestore: suscripciones y escrituras por lotes. |

---

## 3. Navegación del usuario

```mermaid
flowchart TD
  E(["Entrada"]) -->|Tocar la manija| K["Llave familiar"]
  K -->|Elegir integrante| PIN["Crear / ingresar PIN"]
  E -->|Apartar la maceta derecha| AK["Llave de Amy"]
  AK -->|Google + correo de admin| OK
  E -->|Empujar la maceta izquierda| EG["«¿Qué buscas, mirón? 👀»"]
  E -->|Buzón / timbre| MSG["Mensaje"]
  PIN -->|PIN correcto| OK(["Se abre la puerta"])

  OK --> C["Cocina"]
  C --> FR["Refrigeradora"]
  FR --> FZ["Congelador"]
  C --> PA["Alacena"]
  C --> FT["Frutero"]
  C --> PE["Estación de Monchi y Mandy"]
  C --> HI["Post-it Historial"]
  C --> VO["Post-it Voz (próximo: dictado)"]
  C --> UM["Paragüero"]
  C --> SH["Lista de compras"]
  C <-->|Cambio de ambiente| B["Baño"]

  B --> GT["Gabinete de toallas + canastas"]
  B --> ES["Estante"]
  B --> PH["Papel higiénico"]
  B --> BO["Botiquín"]
  B --> LA["Lavabo"]
  B --> LI["Área de limpieza"]

  FR & FZ & PA & FT & GT & ES & PH & BO & LA & LI --> RP["Panel del mueble<br/>comprar · usar · revisar · editar lote"]
  RP --> NP["Nuevo producto"]

  C -.-> SV["Pagos de servicios (próximo)"]
  C -.-> MP["Post-its: quién pagó · calendario familiar (próximo)"]
  C -.-> AD["Administrar usuarios · solo admin (próximo)"]
  C -.-> RE["Recetas y plan de comidas · IA (próximo)"]
```

Cada mueble abre un **panel de registro** con las mismas cuatro acciones sobre lotes: **comprar** (crea un lote),
**usar** (descuenta con FEFO), **revisar** («queda ½») y **editar** (corrige un lote a mano, descartarlo o borrarlo).

---

## 4. Base de datos

### Colecciones actuales

| Colección | Documento | Contenido |
|---|---|---|
| `users/{memberId}` | uno por integrante | `pinHash` (SHA-256 de `casa-peralta:{id}:{pin}`), `pinUpdatedAt` |
| `products/{id}` | producto creado por la familia | copia completa de las reglas (`Article`), `deletedAt` |
| `lots/{id}` | una compra | cantidades, fechas, `checks[]`, madurez, `deletedAt` |
| `movements/{auto}` | un cambio | `articleId`, `lotId`, `kind`, `amount`, `detail`, `by`, `at`, `day`; solo se agrega |
| `hampers/{id}` | canasta de ropa | nivel, ciclos de llenado |
| `petTracker/{YYYY-MM-DD}` | un día | comidas de las gatas marcadas por turno |

Los **160 insumos del catálogo** y los **63 muebles** viven en el código (`lib/catalog.ts`); solo los productos nuevos
de la familia están en Firestore. Los **integrantes** también están en el código (`lib/inventory.ts → family`) y los
**paraguas** solo en memoria (no se sincronizan todavía).

### Modelo propuesto

Mantiene todo lo que ya existe (ningún campo actual cambia de significado) y agrega lo que necesitan las próximas
funciones. Las entidades nuevas están marcadas en la tabla de abajo.

```mermaid
erDiagram
  USER ||--o{ MOVEMENT : "registra"
  USER ||--o{ BILL_PAYMENT : "paga"
  USER ||--o{ EVENT : "participa"
  SHELF ||--o{ PRODUCT : "guarda"
  PRODUCT ||--o{ MEASURE : "se mide en"
  PRODUCT ||--o{ PRESENTATION : "se compra como"
  PRODUCT ||--o{ LOT : "tiene"
  LOT ||--o{ LOT : "se trasvasa a"
  LOT ||--o{ MOVEMENT : "cambia por"
  PRODUCT ||--o| PRODUCT_STATS : "aprende"
  RECIPE ||--o{ RECIPE_ITEM : "lleva"
  RECIPE_ITEM }o--|| PRODUCT : "usa"
  MEAL_PLAN }o--|| RECIPE : "programa"
  MEAL_PLAN ||--o{ MOVEMENT : "al cocinar genera"
  SERVICE ||--o{ BILL : "emite"
  BILL ||--o{ BILL_PAYMENT : "se paga con"

  USER {
    string id PK "amy, consuelo, aby…"
    string name
    string role "Mamá, Familia…"
    string access "admin | member"
    string tone "color del avatar"
    string pinHash
    boolean active "baja suave"
  }
  SHELF {
    string id PK
    string name
    string zone "fridge, pantry, freezer, fruit…"
  }
  PRODUCT {
    string id PK
    string shelfId FK
    string name
    string[] aliases "para voz e IA"
    string typeId
    string tracking "units | measure"
    string baseUnit "g | ml | pieza"
    map expiry "date | shelf | none + días"
    number openLife "días tras abrir"
    number ripenDays "frutas"
    boolean passive "baja sola: arroz, azúcar"
    number plannedPerDay "ritmo previsto"
    number par "compra típica (100 %)"
    string deletedAt
  }
  MEASURE {
    string id PK "taza, cda, jarra"
    string label
    number base "gramos o ml por medida"
  }
  PRESENTATION {
    string id PK "costal-48kg, plancha"
    string label
    number base "cantidad en unidad base"
    number kg "si se compra por kilo"
  }
  LOT {
    string id PK
    string articleId FK
    string parentLotId FK "trasvase: costal → frasco"
    string boughtAt
    number initial
    number amount
    string checkedAt
    array checks "observaciones recientes"
    string expiresAt
    string openedAt
    string closedAt
    number kg
    map ripe "score + día"
    string by
    string deletedAt
  }
  MOVEMENT {
    string id PK
    string articleId FK
    string lotId FK
    string kind "buy, use, check, transfer…"
    number amount "unidad base"
    number qty "lo que dijo la persona: 3"
    string measureId "taza"
    string source "manual, voz, ia, receta, auto"
    string mealId FK
    string detail
    string by FK
    timestamp at
    string day
  }
  PRODUCT_STATS {
    string productId PK
    number rate "unidad base por día"
    number[] weekday "factor lun…dom"
    number samples
    string updatedAt
  }
  RECIPE {
    string id PK
    string name
    number servings
    string source "familia | ia"
    string createdBy
  }
  RECIPE_ITEM {
    string productId FK
    number qty
    string measureId
  }
  MEAL_PLAN {
    string id PK
    string day
    string slot "almuerzo, cena"
    string recipeId FK
    number servings
    string cookedAt
  }
  SERVICE {
    string id PK "agua, luz, gas, internet"
    string name
    number dueDay "día de vencimiento"
  }
  BILL {
    string id PK "luz-2026-10"
    string serviceId FK
    string period "2026-10"
    number amount
    string dueAt
    string status "pendiente | pagado"
  }
  BILL_PAYMENT {
    string id PK
    string billId FK
    number amount
    string paidAt
    string paidBy FK
  }
  EVENT {
    string id PK
    string title
    string start
    string end
    string rrule "repetición: domingos"
    string[] members
    string kind "evento | fecha especial"
  }
```

| Colección | Estado | Para qué |
|---|---|---|
| `users` | **ampliar** | Pasa a ser la lista de integrantes (hoy en código): nombre, rol, acceso, color, `active`. Lo administra Amy. |
| `products` | **ampliar** | Guardar también el catálogo (sembrado desde `lib/catalog.ts`), con `measures`, `presentations` y `aliases`. |
| `lots` | **ampliar** | `parentLotId` para trasvases (costal de azúcar → frasco). |
| `movements` | **ampliar** | `qty`, `measureId`, `source`, `mealId`: qué dijo la persona y de dónde vino el registro. |
| `stats/{productId}` | nueva | Caché del ritmo aprendido y del patrón semanal (se recalcula; no es fuente de verdad). |
| `loans` | nueva | Persistir los paraguas, que hoy solo viven en memoria. |
| `recipes`, `mealPlan` | nuevas | Recetas de la familia o de la IA y su programación en el calendario. |
| `services`, `bills`, `billPayments` | nuevas | Pagos de agua, luz, gas e internet. |
| `events` | nueva | Calendario familiar y fechas especiales. |

---

## 5. Cantidades y medidas

**Regla de oro:** cada producto tiene **una unidad base** y todo se guarda en ella. Lo que la familia dice o toca
(«3 tazas», «un costal de 48 kilos», «el frasco») se convierte al guardar.

| Producto | Unidad base | Medidas para usar | Presentaciones para comprar |
|---|---|---|---|
| Arroz | g | taza = 190 g | costal 25 kg, bolsa 5 kg |
| Azúcar | g | taza = 200 g · frasco = 2 tazas = 400 g | costal 10 kg, bolsa 1 kg |
| Huevos | pieza | 1, 2, 3, 6 | plancha = 30, media plancha = 15 |
| Leche | caja | ¼, ⅓, ½, 1 | caja 1 L |
| Tomate | pieza | 1–4 | kilo (piezas por kilo aprendidas: `learnedPerKg`) |
| Shampoo Sábila | ml | 10, 25, 50 ml | frasco 510 ml |

Hoy las tazas están fijas dentro de los botones de uso (`cups(190)` en el catálogo). La estructura propuesta las
vuelve **datos del producto** (`measures`), para que:

- la familia ajuste cuánto pesa *su* taza (y su frasco o jarra) sin tocar código;
- el dictado y la IA entiendan «3 tazas de arroz» → `{ productId: 'arroz', qty: 3, measureId: 'taza' }` → 570 g;
- las recetas guarden ingredientes en medidas de cocina y se descuenten en gramos.

```ts
// Conversión única, usada por botones, voz, IA y recetas
const toBase = (product: Product, qty: number, measureId?: string) =>
  measureId ? qty * (product.measures.find((m) => m.id === measureId)?.base ?? 1) : qty
```

**Trasvases.** El azúcar se compra en costal pero se usa desde un frasco de 2 tazas. Se modela como un movimiento
`transfer`: el costal baja 400 g y nace un lote hijo («frasco», `parentLotId` = costal) con esos 400 g. Los usos se
descuentan del frasco; cuando se vacía, la app sabe cuánto duró y propone rellenarlo.

---

## 6. Consumo

### Cómo funciona hoy

- Cada **uso** o **revisión** agrega una observación (`checks`) al lote.
- `learnRate()` calcula el ritmo: lo consumido entre la primera y la última observación de los lotes de los últimos
  90 días, dividido entre los días cubiertos (sin contar dos veces los días en que hubo dos lotes abiertos).
  Necesita al menos 3 días de datos; mientras no los haya usa `plannedPerDay` (p. ej. croquetas: 143 g/día).
- En los productos **pasivos** (arroz, azúcar, líquidos de uso) la cantidad **baja sola** entre revisiones según ese
  ritmo (`estimate()`); al revisar se corrige con el dato real.
- Con el ritmo se proyecta cuántos días quedan (`daysLeft`) y qué día se acaba (`runsOutOn`).

### Ejemplos con los datos de la casa

| Producto | Consumo real | Ritmo | Proyección |
|---|---|---|---|
| Arroz | 3 tazas diarias × 190 g | **570 g/día** | costal de 48 kg ≈ **84 días** |
| Azúcar | frasco de 2 tazas (400 g) dura «un poco más de una semana» (~8–9 días) | **≈ 45–50 g/día** | costal de 10 kg ≈ 7 meses |
| Croquetas | previsto 143 g/día entre Monchi y Mandy | 143 g/día | costal de 9 kg ≈ 63 días |

### Estructura propuesta: consumo variable

El consumo no es constante («hay días que es más o menos»). La estructura lo cubre en tres capas:

1. **Registrar lo real con su origen.** Cada uso es un movimiento con `qty` + `measureId` + `source`
   (`manual`, `voz`, `ia`, `receta`, `auto`). Cocinar una receta del plan genera un movimiento por ingrediente con
   `mealId`, en un solo lote de escritura.
2. **Aprender un ritmo que se adapta.** Sobre la serie diaria de usos:
   - *media móvil exponencial* (vida media de 14 días): pesa más lo reciente, así un cambio de hábito se nota en
     pocas semanas;
   - *factor por día de la semana* cuando hay 4+ semanas de datos (p. ej. el domingo se cocina más arroz);
   - el resultado se guarda en `stats/{productId}` como caché, recalculable desde `movements`.
3. **Proyectar con lo planificado.** Para los próximos días se usa, en este orden: lo programado en el plan de
   comidas → el ritmo aprendido × factor del día → `plannedPerDay`. La proyección simula día a día hasta que el
   stock llega a cero, así la fecha «se acaba el…» refleja las recetas elegidas para el mes.

```mermaid
flowchart LR
  A["Uso real<br/>manual · voz · IA · receta"] --> M[("movements")]
  M --> S["Serie diaria por producto"]
  S --> R["Ritmo EWMA<br/>+ factor semanal"]
  R --> ST[("stats/{productId}")]
  P["Plan de comidas"] --> PR
  ST --> PR["Proyección día a día"]
  L[("lots: stock actual")] --> PR
  PR --> O["Se acaba el …<br/>lista de compras<br/>barra de vida"]
```

---

## 7. Caducidad

Cada producto tiene una regla `expiry` y, opcionalmente, vida tras abrir (`openLife`):

| Regla | Significado | Ejemplos |
|---|---|---|
| `date` | Vence en una fecha que se elige al comprar (los días son la sugerencia). | leche (30 d), zanahoria (14 d), papa (30 d) |
| `shelf` | Dura N días **desde que se abre o se empieza a usar**. | queso, mantequilla (30 d), jugo (5 d), esponjas, cepillos |
| `none` | No vence: solo se controla la cantidad. | arroz, azúcar, sal |
| `openLife` | **Dos fases:** al abrir, vence lo que llegue primero entre la fecha impresa y *abierto + N días*. | productos nuevos de tipo Frasco o Lácteo (mermelada, salsas, yogur creado por la familia) |

Estados (`expiryOf()`): **vencido** (días < 0), **por vencer** (0–3 días), **ok** (> 3 días), **sin fecha**.
Con FEFO, lo que se usa primero es siempre el lote que vence antes. Un lote que se malogra se cierra con `discard`,
que deja su propio registro en el historial. Hoy, sin embargo, `learnRate()` cuenta lo descartado como si se hubiera
consumido (ver la sección 11, punto 8).

---

## 8. Maduración

Solo frutas (`ripenDays` > 0). Cada lote guarda una puntuación y el día en que se midió:

- `0` verde → `1` en su punto → `2` pasada (tope 3).
- La puntuación sube sola: `score + días transcurridos / ripenDays` (`lotScore()`).
- Etapas (`stageOf()`): **verde** < 1 · **en su punto** < 2 · **urgente** ≥ 2.
- El estado de una fruta es el de su lote **más maduro** (es el que hay que comer primero).
- Al revisar («está verde», «en su punto», «muy madura») la puntuación se corrige con el dato real.

---

## 9. Barra de vida y semáforo

Hoy hay tres escalas separadas: el **nivel de stock** (barra), el **vencimiento** y la **madurez**. La estructura
propuesta las une en una sola **vida** de 0 a 100 por producto, con un semáforo y el motivo que lo explica.

**Componentes**

| Componente | Cálculo | Fuente |
|---|---|---|
| Stock | `nivel = 100 × total / referencia`, con `referencia = max(Σ inicial de lotes activos, par)` | `summarize()` (ya existe) |
| Caducidad | `100 × días hasta vencer / días de vida del lote` (desde que se compró o abrió) | lote que vence primero |
| Madurez | `100 × (3 − score) / 3` | `lotScore()` |

**Vida = el menor de los componentes que apliquen.** El motivo es el componente que manda.

**Semáforo.** Reúne en un solo lugar los umbrales que ya usa la app (≤ 25 %, se acaba en ≤ 5 días, vence en ≤ 3 días) y agrega el ámbar por vida ≤ 50 %:

```mermaid
flowchart TD
  S["Producto"] --> Q1{"¿Sin stock o<br/>lote vencido?"}
  Q1 -- Sí --> R["🔴 Rojo<br/>Agotado / Vencido"]
  Q1 -- No --> Q2{"¿Vida ≤ 25 %<br/>o fruta urgente?"}
  Q2 -- Sí --> R2["🔴 Rojo<br/>Queda poco / Muy madura"]
  Q2 -- No --> Q3{"¿Se acaba en ≤ 5 días,<br/>vence en ≤ 3 días<br/>o vida ≤ 50 %?"}
  Q3 -- Sí --> A["🟡 Ámbar<br/>Se acaba pronto / Vence pronto / En su punto"]
  Q3 -- No --> V["🟢 Verde<br/>Todo en orden"]
```

El mismo resultado alimenta la **barra de cada mueble**, el **HUD** de la cocina, la **lista de compras**
(rojo y ámbar de stock) y las **sugerencias de recetas** (priorizar lo que vence o madura primero).

---

## 10. Ciclo de vida de un lote

```mermaid
stateDiagram-v2
  [*] --> Sellado: comprar (buy)
  Sellado --> Abierto: primer uso o revisión<br/>(fija vencimiento si tiene openLife)
  Sellado --> Agotado: terminar (finish)
  Abierto --> Abierto: usar / revisar / trasvasar
  Abierto --> Agotado: cantidad llega a 0
  Sellado --> Descartado: se malogró (discard)
  Abierto --> Descartado: se malogró (discard)
  Sellado --> Borrado: borrar (delete)
  Abierto --> Borrado: borrar (delete)
  Borrado --> Sellado: restaurar
  Agotado --> [*]: entra a la lista de compras
  Descartado --> [*]: entra a la lista de compras
```

| Estado | Campos |
|---|---|
| Sellado | `openedAt = null`, `closedAt = null` |
| Abierto | `openedAt` con fecha, `closedAt = null` |
| Agotado / Descartado | `closedAt` con fecha (`amount = 0`); el movimiento dice si fue `finish` o `discard` |
| Borrado | `deletedAt` con fecha; sigue en Firestore y en el historial |

---

## 11. Escalabilidad y seguridad

| # | Situación actual | Riesgo | Propuesta |
|---|---|---|---|
| 1 | El catálogo (160 insumos, 63 muebles) está en el código. | Agregar o ajustar un insumo exige desplegar. | Sembrar `products` desde `lib/catalog.ts` una vez; el código queda como semilla. |
| 2 | `subscribeLots` escucha **toda** la colección `lots`, incluidos los cerrados. | Crece sin límite: cada mes hay más lecturas y más memoria. | Escuchar solo lotes abiertos (`closedAt == null`) y leer los cerrados de los últimos 90 días solo para aprender. |
| 3 | `checks[]` crece con cada uso dentro del lote. | Documentos cada vez más pesados (un costal de arroz con usos diarios). | Guardar en el lote solo las últimas ~60 observaciones; el historial completo ya está en `movements`. |
| 4 | Integrantes en el código (`family`). | Agregar a alguien exige desplegar. | Colección `users` administrada por Amy (función 5 de la hoja de ruta). |
| 5 | Las reglas solo exigen `request.auth != null`, y cada dispositivo abre una **sesión anónima** automáticamente. El PIN se valida en el navegador. | Cualquiera que abra la URL puede leer y escribir el inventario, aunque no sepa un PIN. | Validar el PIN en el servidor (Cloud Function) y marcar la sesión con un *custom claim* (`member`/`admin`); exigir ese claim en las reglas. Activar App Check. |
| 6 | Colecciones en la raíz. | Si un día hay otra casa, sus datos se mezclan. | Prefijo `households/{casaId}/…` cuando haga falta (la capa `db.ts` es la única que cambia). |
| 7 | Paraguas solo en memoria. | Se pierden al recargar. | Colección `loans`. |
| 8 | `discard` cierra el lote agregando una observación en 0, y `learnRate()` la toma como consumo. | Tirar un yogur vencido acelera el ritmo aprendido y adelanta «se acaba el…». | Que el ritmo ignore la caída de un lote descartado (marcar la observación como `discard` o calcular el ritmo desde `movements` de tipo `use`/`check`). Se resuelve con la función 2. |

**Corregido en este cambio:** el historial descartaba al leer de Firestore los movimientos `discard` (lote que se
malogró) y `loan`, porque no estaban en la lista de tipos válidos de `lib/db.ts`. Ahora aparecen en el post-it
Historial.

---

## 12. Hoja de ruta

Orden acordado; cada paso se apoya en la estructura de este documento.

| # | Función | Qué agrega a la estructura |
|---|---|---|
| 1 | **Arquitectura del inventario** (este documento) | Modelo, diagramas, reglas de cálculo. |
| 2 | **Consumos variables** (arroz, azúcar, cocinar) | `measures`, `transfer`, movimientos con `qty`/`measureId`/`source`, ritmo EWMA + factor semanal. |
| 3 | **Pagos de servicios** (nuevo ícono) | `services`, `bills`, `billPayments`: monto, fecha, quién pagó, vencimiento con aviso, historial y gasto por mes. |
| 4 | **Post-its del mural** | «Quién pagó» (lee `bills`) y calendario familiar (`events` con repetición y fechas especiales: Día del Padre, de la Madre, del Ingeniero, del Niño, del Informático, del Agrónomo, del Fotógrafo…). |
| 5 | **Gestión de usuarios** (solo admin) | `users` como fuente de la llave familiar; altas, cambios y bajas suaves. |
| 6 | **IA con Gemini** (Firebase AI Logic) | Dictar compras → `{ producto, qty, medida }` validado con `products.aliases` y `dictionary.ts`; recetas con prioridad por vida (sección 9); `recipes` y `mealPlan`. |
