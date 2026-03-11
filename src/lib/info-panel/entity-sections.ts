import type { ADNodeKind, RelationshipSectionDef } from "@/types";

const USER_SECTIONS: RelationshipSectionDef[] = [
  { key: "sessions", label: "Sessions", endpoint: "sessions" },
  { key: "memberships", label: "Group Membership", endpoint: "memberships" },
  { key: "admin-rights", label: "Admin Rights", endpoint: "admin-rights" },
  { key: "rdp-rights", label: "RDP Rights", endpoint: "rdp-rights" },
  { key: "dcom-rights", label: "DCOM Rights", endpoint: "dcom-rights" },
  { key: "ps-remote-rights", label: "PS Remote Rights", endpoint: "ps-remote-rights" },
  { key: "sql-admin-rights", label: "SQL Admin Rights", endpoint: "sql-admin-rights" },
  { key: "constrained-delegation-rights", label: "Constrained Delegation", endpoint: "constrained-delegation-rights" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
];

const COMPUTER_SECTIONS: RelationshipSectionDef[] = [
  { key: "sessions", label: "Sessions", endpoint: "sessions" },
  { key: "admin-users", label: "Admin Users", endpoint: "admin-users" },
  { key: "rdp-users", label: "RDP Users", endpoint: "rdp-users" },
  { key: "dcom-users", label: "DCOM Users", endpoint: "dcom-users" },
  { key: "ps-remote-users", label: "PS Remote Users", endpoint: "ps-remote-users" },
  { key: "sql-admins", label: "SQL Admins", endpoint: "sql-admins" },
  { key: "memberships", label: "Group Membership", endpoint: "memberships" },
  { key: "admin-rights", label: "Admin Rights", endpoint: "admin-rights" },
  { key: "constrained-delegation-rights", label: "Constrained Delegation", endpoint: "constrained-delegation-rights" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
];

const GROUP_SECTIONS: RelationshipSectionDef[] = [
  { key: "sessions", label: "Sessions", endpoint: "sessions" },
  { key: "members", label: "Members", endpoint: "members" },
  { key: "memberships", label: "Memberships", endpoint: "memberships" },
  { key: "admin-rights", label: "Admin Rights", endpoint: "admin-rights" },
  { key: "rdp-rights", label: "RDP Rights", endpoint: "rdp-rights" },
  { key: "dcom-rights", label: "DCOM Rights", endpoint: "dcom-rights" },
  { key: "ps-remote-rights", label: "PS Remote Rights", endpoint: "ps-remote-rights" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
];

const DOMAIN_SECTIONS: RelationshipSectionDef[] = [
  { key: "users", label: "Users", endpoint: "users" },
  { key: "groups", label: "Groups", endpoint: "groups" },
  { key: "computers", label: "Computers", endpoint: "computers" },
  { key: "ous", label: "OUs", endpoint: "ous" },
  { key: "gpos", label: "GPOs", endpoint: "gpos" },
  { key: "foreign-users", label: "Foreign Users", endpoint: "foreign-users" },
  { key: "foreign-groups", label: "Foreign Groups", endpoint: "foreign-groups" },
  { key: "foreign-admins", label: "Foreign Admins", endpoint: "foreign-admins" },
  { key: "inbound-trusts", label: "Inbound Trusts", endpoint: "inbound-trusts" },
  { key: "dc-syncers", label: "DC Syncers", endpoint: "dc-syncers" },
  { key: "linked-gpos", label: "Linked GPOs", endpoint: "linked-gpos" },
];

const GPO_SECTIONS: RelationshipSectionDef[] = [
  { key: "ous", label: "Affected OUs", endpoint: "ous" },
  { key: "computers", label: "Affected Computers", endpoint: "computers" },
  { key: "users", label: "Affected Users", endpoint: "users" },
  { key: "tier-zero", label: "Tier Zero", endpoint: "tier-zero" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
];

const OU_SECTIONS: RelationshipSectionDef[] = [
  { key: "users", label: "Users", endpoint: "users" },
  { key: "computers", label: "Computers", endpoint: "computers" },
  { key: "groups", label: "Groups", endpoint: "groups" },
  { key: "gpos", label: "GPOs", endpoint: "gpos" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
];

const CONTAINER_SECTIONS: RelationshipSectionDef[] = [
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
];

const CERT_TEMPLATE_SECTIONS: RelationshipSectionDef[] = [
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
];

const ENTERPRISE_CA_SECTIONS: RelationshipSectionDef[] = [
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
];

const ROOT_CA_SECTIONS: RelationshipSectionDef[] = [
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
];

const AIACA_SECTIONS: RelationshipSectionDef[] = [
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
];

const NTAUTH_STORE_SECTIONS: RelationshipSectionDef[] = [
  { key: "controllers", label: "Inbound Object Control", endpoint: "controllers" },
  { key: "controllables", label: "Outbound Object Control", endpoint: "controllables" },
];

const SECTIONS_BY_KIND: Record<string, RelationshipSectionDef[]> = {
  User: USER_SECTIONS,
  Computer: COMPUTER_SECTIONS,
  Group: GROUP_SECTIONS,
  Domain: DOMAIN_SECTIONS,
  GPO: GPO_SECTIONS,
  OU: OU_SECTIONS,
  Container: CONTAINER_SECTIONS,
  CertTemplate: CERT_TEMPLATE_SECTIONS,
  EnterpriseCA: ENTERPRISE_CA_SECTIONS,
  RootCA: ROOT_CA_SECTIONS,
  AIACA: AIACA_SECTIONS,
  NTAuthStore: NTAUTH_STORE_SECTIONS,
};

export function getSectionsForKind(kind: ADNodeKind): RelationshipSectionDef[] {
  return SECTIONS_BY_KIND[kind] ?? CONTAINER_SECTIONS;
}
