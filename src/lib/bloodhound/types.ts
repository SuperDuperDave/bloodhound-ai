// BloodHound CE API response types

export interface BHLoginResponse {
  user_id: string;
  auth_expired: boolean;
  session_token: string;
}

export interface BHSearchResponse {
  data: BHSearchResultItem[];
}

export interface BHSearchResultItem {
  objectid: string;
  type: string;
  name: string;
  distinguishedname?: string;
}

export interface BHGraphNode {
  kind: string;
  label: string;
  objectId: string;
  isTierZero: boolean;
  properties?: Record<string, unknown>;
}

export interface BHGraphEdge {
  source: string;
  target: string;
  label: string;
  kind: string;
}

export interface BHGraphResponse {
  nodes: Record<string, BHGraphNode>;
  edges: BHGraphEdge[];
}

export interface BHCypherResponse {
  data: Record<string, unknown>[];
}

export interface BHDomainResponse {
  data: {
    id: number;
    name: string;
    collected: boolean;
    type: string;
    impact_value: number;
  }[];
}

export interface BHNodeEntityResponse {
  data: {
    kind: string;
    props: Record<string, unknown>;
  };
}
