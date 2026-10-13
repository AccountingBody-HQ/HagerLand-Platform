import {
  AppWindow, ArrowUpDown, Briefcase, Globe, ShieldCheck, Axe, Bath, BatteryCharging, Boxes, BrickWall, Bug, Building, Building2, Cable, Calculator, Cctv,
  ClipboardList, Construction, CookingPot, Cylinder, DoorOpen, DraftingCompass, Drill, Droplets, Fan, FireExtinguisher, Flame,
  Flower2, Forklift, Grid2x2, Grid3x3, HardHat, Hammer, House, KeyRound, Landmark, Layers, LayoutGrid, Map, Nut, Package,
  PaintBucket, Paintbrush, PaintRoller, PencilRuler, Pickaxe, Pipette, PlugZap, Ruler, Scale, Shield, Shovel, Sofa, Sparkles,
  SquareStack, Sun, Trash2, Trees, Truck, Umbrella, Wrench, Zap, type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  'app-window': AppWindow, briefcase: Briefcase, globe: Globe, 'shield-check': ShieldCheck, 'arrow-up-down': ArrowUpDown, axe: Axe, bath: Bath, 'battery-charging': BatteryCharging, boxes: Boxes,
  'brick-wall': BrickWall, bug: Bug, building: Building, 'building-2': Building2, cable: Cable, calculator: Calculator, cctv: Cctv,
  'clipboard-list': ClipboardList, construction: Construction, 'cooking-pot': CookingPot, cylinder: Cylinder, 'door-open': DoorOpen,
  'drafting-compass': DraftingCompass, drill: Drill, droplets: Droplets, fan: Fan, 'fire-extinguisher': FireExtinguisher, flame: Flame,
  'flower-2': Flower2, forklift: Forklift, 'grid-2x2': Grid2x2, 'grid-3x3': Grid3x3, 'hard-hat': HardHat, hammer: Hammer, house: House,
  'key-round': KeyRound, landmark: Landmark, layers: Layers, 'layout-grid': LayoutGrid, map: Map, nut: Nut, 'paint-bucket': PaintBucket,
  paintbrush: Paintbrush, 'paint-roller': PaintRoller, 'pencil-ruler': PencilRuler, pickaxe: Pickaxe, pipette: Pipette, 'plug-zap': PlugZap,
  ruler: Ruler, scale: Scale, shield: Shield, shovel: Shovel, sofa: Sofa, sparkles: Sparkles, 'square-stack': SquareStack, sun: Sun,
  'trash-2': Trash2, trees: Trees, truck: Truck, umbrella: Umbrella, wrench: Wrench, zap: Zap,
}

/** Renders a lucide icon by its kebab-case name (as stored on categories), with a neutral fallback. */
export function DynamicIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && icons[name]) || Package
  return <Icon className={className} aria-hidden />
}
