import {
  Activity,
  AlignCenter,
  Anchor,
  Baby,
  ClipboardCheck,
  Droplets,
  FlaskConical,
  ScanFace,
  Scissors,
  Search,
  ShieldPlus,
  Smile,
  Sparkles,
  Stethoscope,
  Sun,
  Syringe,
  TestTube,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/** Service icons are stored by name in the database; map them to Lucide components. */
const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  'align-center': AlignCenter,
  anchor: Anchor,
  baby: Baby,
  'clipboard-check': ClipboardCheck,
  droplets: Droplets,
  'flask-conical': FlaskConical,
  'scan-face': ScanFace,
  scissors: Scissors,
  search: Search,
  'shield-plus': ShieldPlus,
  smile: Smile,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  sun: Sun,
  syringe: Syringe,
  'test-tube': TestTube,
  wind: Wind,
  zap: Zap,
}

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Stethoscope
  return <Icon className={className} aria-hidden="true" />
}
