import { GameProvider } from '@/components/game/game-provider'
import { KitchenScene } from '@/components/kitchen/kitchen-scene'

export default function Page() {
  return (
    <GameProvider>
      <KitchenScene />
    </GameProvider>
  )
}
