import {
  User,
  Monitor,
  Users,
  Globe,
  Folder,
  FileText,
  Box,
  Shield,
  Key,
  Building,
  Database,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { ADNodeKind } from "@/types";

interface NodeTypeIconProps {
  kind: ADNodeKind | string;
  size?: number;
  className?: string;
}

const kindConfig: Record<
  string,
  { icon: LucideIcon; color: string }
> = {
  User: { icon: User, color: "text-blue-400" },
  Computer: { icon: Monitor, color: "text-green-400" },
  Group: { icon: Users, color: "text-yellow-400" },
  Domain: { icon: Globe, color: "text-purple-400" },
  OU: { icon: Folder, color: "text-orange-400" },
  GPO: { icon: FileText, color: "text-teal-400" },
  Container: { icon: Box, color: "text-zinc-400" },
  AIACA: { icon: Shield, color: "text-cyan-400" },
  RootCA: { icon: Key, color: "text-red-400" },
  EnterpriseCA: { icon: Building, color: "text-red-400" },
  NTAuthStore: { icon: Database, color: "text-pink-400" },
  CertTemplate: { icon: ScrollText, color: "text-indigo-400" },
  IssuancePolicy: { icon: Shield, color: "text-indigo-400" },
  Base: { icon: Box, color: "text-zinc-500" },
};

export function NodeTypeIcon({ kind, size = 14, className = "" }: NodeTypeIconProps) {
  const config = kindConfig[kind] || kindConfig.Base;
  const Icon = config.icon;
  return <Icon size={size} className={`${config.color} ${className} flex-shrink-0`} />;
}

export function getNodeColor(kind: string): string {
  return kindConfig[kind]?.color || "text-zinc-500";
}
