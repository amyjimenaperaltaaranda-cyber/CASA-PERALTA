# Casa Peralta

Inventario familiar con forma de aventura gráfica: se entra por la puerta de la casa, se recorre la cocina y el baño, y
cada mueble muestra qué hay, cuánto queda, qué vence y qué hay que comprar. Todo se sincroniza en tiempo real entre los
dispositivos de la familia.

## Qué hace

- **Entrada:** cada integrante entra con su PIN desde la llave familiar. Amy, la administradora, entra con Google desde
  una llave escondida bajo la maceta derecha.
- **Cocina:** refrigeradora y congelador, alacena, frutero con madurez, estación de las gatas, paragüero, post-it de
  historial y lista de compras automática.
- **Baño:** gabinete de toallas y canastas de ropa, estante, papel higiénico, botiquín, lavabo y área de limpieza.
- **Inventario por lotes:** cada compra es un lote con su cantidad y vencimiento; se usa primero lo que vence antes y la
  app aprende el ritmo de consumo para avisar cuándo se acaba.

## Tecnología

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Firebase (Auth + Firestore).

## Cómo correrlo

1. Copia `.env.example` a `.env.local` y rellena los datos de tu proyecto de Firebase y el correo de la administradora.
2. Instala y arranca:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Sin Firebase configurado la app funciona en modo demo: arranca con el inventario de ejemplo y los cambios se
   pierden al recargar (solo los PIN quedan guardados en el navegador).

Las reglas sugeridas de Firestore están en [`FIRESTORE.md`](FIRESTORE.md).

## Estructura

```
app/                 página única de Next.js
components/
  login/             entrada: puerta, llave familiar (PIN), macetas y llave de la administradora
  kitchen/           escena de la cocina, paneles de registro, frutero, mascotas, historial, compras
  bathroom/          escena del baño
  laundry/           canastas de ropa sucia
  game/              GameProvider: estado global y acciones
lib/                 dominio sin interfaz (lotes, catálogo, consumo, compras…) y acceso a Firestore (db.ts)
public/images/       ilustraciones de las escenas
docs/                documentación de arquitectura
```

## Documentación

- **[Arquitectura del inventario](docs/ARQUITECTURA.md)**: principios, arquitectura de software, navegación del
  usuario, modelo de base de datos, cantidades y medidas, consumo, caducidad, maduración, barra de vida y semáforo,
  ciclo de vida de un lote, escalabilidad y hoja de ruta. Incluye diagramas que GitHub muestra directamente.
