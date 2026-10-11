# Reglas sugeridas de Firestore (borrado suave + historial)

La app **nunca borra** documentos de `lots` ni `movements`:

- Borrar un lote = ponerle `deletedAt` (borrado suave). Se restaura desde el post-it **Historial** de la refri.
- `movements` es el historial unificado (crear, editar, borrar, restaurar, uso, revisión, canastas). Solo se agrega.
- `hampers` guarda el nivel de las canastas de ropa sucia.
- `products` guarda los productos nuevos que crea la familia (con sus reglas ya copiadas). Quitar un producto solo pone `deletedAt`.

Agrega estas reglas a las que ya tienes (ajusta `isSignedIn()` a como identificas a la familia):

```
match /lots/{id} {
  allow read, create, update: if request.auth != null;
  allow delete: if false;              // borrado suave: nunca se elimina de verdad
}
match /movements/{id} {
  allow read, create: if request.auth != null;
  allow update, delete: if false;      // historial de solo-agregar
}
match /products/{id} {
  allow read, create, update: if request.auth != null;
  allow delete: if false;
}
match /hampers/{id} {
  allow read, create, update: if request.auth != null;
  allow delete: if false;
}
```

El historial se lee ordenado por `at`; Firestore lo resuelve solo (índice de un campo), no necesitas crear índices.
