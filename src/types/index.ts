// BloodHound AD object types
export type ADNodeKind =
  | "User"
  | "Computer"
  | "Group"
  | "Domain"
  | "OU"
  | "GPO"
  | "Container"
  | "AIACA"
  | "RootCA"
  | "EnterpriseCA"
  | "NTAuthStore"
  | "CertTemplate"
  | "IssuancePolicy"
  | "Base";

// Explore Panel types
export type ExploreTab = "search" | "pathfinder" | "cypher";

export interface SelectedNode {
  objectId: string;
  label: string;
  kind: ADNodeKind;
}

export interface PrebuiltQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  category: string;
  platform: "ad" | "azure" | "cross";
}

export interface QueryCategory {
  id: string;
  name: string;
  platform: "ad" | "azure" | "cross";
  queries: PrebuiltQuery[];
}

export interface ADNodeData {
  [key: string]: unknown;
  id: string;
  objectId: string;
  label: string;
  kind: ADNodeKind;
  domain: string;
  properties?: Record<string, unknown>;
  isHighlighted?: boolean;
  isSelected?: boolean;
}

export interface ADEdgeData {
  [key: string]: unknown;
  id: string;
  source: string;
  target: string;
  label: string;
  isHighlighted?: boolean;
}

export interface BHSearchResult {
  objectid: string;
  type: string;
  name: string;
  distinguishedname?: string;
}

export interface BHPathResponse {
  nodes: Record<
    string,
    {
      kind: string;
      label: string;
      objectId: string;
      isTierZero: boolean;
      properties?: Record<string, unknown>;
    }
  >;
  edges: {
    source: string;
    target: string;
    label: string;
    kind: string;
  }[];
}

export interface BHDomainInfo {
  id: string;
  name: string;
  collected: boolean;
  type: string;
  impactValue: number;
}

export interface EnvironmentStats {
  domains: BHDomainInfo[];
  totalUsers: number;
  totalComputers: number;
  totalGroups: number;
  kerberoastableUsers: number;
  asrepRoastableUsers: number;
  unconstrainedDelegation: number;
  daPathCount: number;
}

export interface RemediationItem {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation: string;
  affectedObjects?: string[];
  // Enriched fields from VISION 2.5.4
  blastRadius?: number;
  pathsEliminated?: number;
  totalDAPaths?: number;
  mitreTechnique?: string;
  mitreId?: string;
  verificationQuery?: string;
}

export interface ContextChip {
  objectId: string;
  label: string;
  kind: ADNodeKind;
}
