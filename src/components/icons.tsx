import {
  Flag, Layers, ScrollText, HeartHandshake, Dices, MapPin, TreeDeciduous,
  Search, Crop, Dna, Moon, Brush, Puzzle, Palette, Users, Lightbulb,
  Swords, Medal, Trophy, BookOpen, Map, BarChart3, Target, Landmark,
  Languages, Globe2, Compass, Zap, Settings, User, Award, Flame, Crown,
  GraduationCap, Gamepad2,
  LayoutGrid, Bot, History, Skull, SplitSquareHorizontal, ArrowUpDown, AlignLeft, Vote,
  MapPinned, Waypoints, Gift, ScanSearch, VenetianMask,
  Building2, Signpost, FolderTree, Scale,
  ChevronDown, ChevronLeft, Check, FlaskConical, Shuffle, Sparkles, Heart, TrendingUp, Pencil, Mail,
  Pipette, Grid2x2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// Monochromatic, hand-drawn-feel "etched" line icons (consistent 1.6 stroke,
// currentColor) replacing the gamey full-colour emoji in the Cartographer skin.
const MAP: Record<string, LucideIcon> = {
  // learn
  flags: Flag, flashcards: Layers, historical: ScrollText, identity: HeartHandshake,
  reversequiz: Target, capitalquiz: Landmark, language: Languages, geo: Globe2,
  provinceroulette: Dices, substumper: MapPin, lineage: TreeDeciduous,
  // play
  oddoneout: Search, thecrop: Crop, flagdna: Dna, silhouette: Moon, thepeel: Brush,
  lookalikes: Search, buildflag: Puzzle, composer: Palette, flagfamilies: Users, funfact: Lightbulb,
  geopaint: Pipette, sketchflag: Pencil, spoterror: ScanSearch, flagoutline: Crop,
  gauntlet: Swords, challenge: Medal, tierlist: Trophy,
  // codex
  codex: BookOpen, progressmap: Map, substats: BarChart3,
  // you / chrome
  profile: User, achievements: Award, settings: Settings, today: Compass, quickplay: Zap,
  // tab bar
  learn: GraduationCap, play: Gamepad2, you: User,
  // newer games
  flagle: LayoutGrid, realorbot: Bot, timeline: History, deadoralive: Skull,
  frankenflag: SplitSquareHorizontal, higherlower: ArrowUpDown, describeit: AlignLeft, flagbracket: Vote,
  bordermap: MapPinned, borderchain: Waypoints, gacha: Gift,
  symbolhunt: ScanSearch, twotruths: VenetianMask, forgery: ScanSearch,
  capitalmatch: Building2, oddborder: Signpost, continentsort: FolderTree, statclash: Scale,
  worldcup: Trophy, connections: Grid2x2, mail: Mail,
}

export function LineIcon({ name, size = 21, strokeWidth = 1.6, color = "currentColor" }:
  { name: string; size?: number; strokeWidth?: number; color?: string }) {
  const Icon = MAP[name] ?? Compass
  return <Icon size={size} strokeWidth={strokeWidth} color={color} absoluteStrokeWidth />
}

export { Flame as FlameIcon, Crown as CrownIcon, Compass as CompassIcon, ChevronDown as ChevronDownIcon, ChevronLeft as ChevronLeftIcon, Check as CheckIcon, FlaskConical as FlaskIcon, Search as SearchIcon, Shuffle as ShuffleIcon, History as HistoryIcon, Sparkles as SparklesIcon, Heart as HeartIcon, TrendingUp as TrendingUpIcon, Pencil as PencilIcon, Mail as MailIcon }
