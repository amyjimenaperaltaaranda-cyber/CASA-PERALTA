'use client'

import { shelves, ZONE_CHOICES, zoneOfShelf } from '@/lib/catalog'
import { Chip, Group } from './panel-parts'

/** Elegir dónde se guarda un producto: primero la zona (refri, alacena, lavabo…) y luego el mueble. */
export function ShelfPicker({ value, onChange }: { value: string; onChange: (shelfId: string) => void }) {
  const zone = zoneOfShelf(value)
  const inZone = shelves.filter((shelf) => shelf.zone === zone)
  return (
    <div className="flex flex-col gap-2">
      {(['Cocina', 'Baño'] as const).map((room) => (
        <Group key={room} title={room}>
          {ZONE_CHOICES.filter((choice) => choice.room === room).map((choice) => (
            <Chip key={choice.zone} active={choice.zone === zone} onClick={() => onChange(choice.zone === zone ? value : (shelves.find((shelf) => shelf.zone === choice.zone && shelf.id.startsWith('otros-'))?.id ?? shelves.find((shelf) => shelf.zone === choice.zone)?.id ?? value))}>
              {choice.label}
            </Chip>
          ))}
        </Group>
      ))}
      {inZone.length > 1 && (
        <Group title="Mueble">
          {inZone.map((shelf) => (
            <Chip key={shelf.id} active={shelf.id === value} onClick={() => onChange(shelf.id)}>
              {shelf.name}
            </Chip>
          ))}
        </Group>
      )}
    </div>
  )
}
