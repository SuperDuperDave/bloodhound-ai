import type { ADNodeKind } from "@/types";

// Windows epoch timestamps (100-nanosecond intervals since 1601-01-01)
const WINDOWS_EPOCH_OFFSET = 11644473600000;
const WINDOWS_TICK = 10000;

const EPOCH_PROPERTIES = new Set([
  "whencreated",
  "whenchanged",
  "lastlogon",
  "lastlogontimestamp",
  "pwdlastset",
  "lastlogoff",
  "accountexpires",
  "badpasswordtime",
  "lockouttime",
]);

const PROPERTY_LABELS: Record<string, string> = {
  objectid: "Object ID",
  distinguishedname: "Distinguished Name",
  name: "Name",
  displayname: "Display Name",
  samaccountname: "SAM Account Name",
  description: "Description",
  whencreated: "Created",
  whenchanged: "Changed",
  lastlogon: "Last Logon",
  lastlogontimestamp: "Last Logon Timestamp",
  pwdlastset: "Password Last Set",
  enabled: "Enabled",
  admincount: "Admin Count",
  hasspn: "Has SPN",
  hassidhistory: "Has SID History",
  unconstraineddelegation: "Unconstrained Delegation",
  trustedtoauth: "Trusted To Auth",
  dontreqpreauth: "Don't Require Preauth",
  sensitive: "Cannot Be Delegated",
  passwordnotreqd: "Password Not Required",
  pwdneverexpires: "Password Never Expires",
  isdeleted: "Is Deleted",
  serviceprincipalnames: "SPNs",
  email: "Email",
  title: "Title",
  homedirectory: "Home Directory",
  userpassword: "User Password",
  sidhistory: "SID History",
  operatingsystem: "Operating System",
  domain: "Domain",
  domainsid: "Domain SID",
  functionallevel: "Functional Level",
  highvalue: "High Value",
  isdc: "Is Domain Controller",
  isacl: "Is ACL",
  isaclprotected: "Is ACL Protected",
  allowedtodelegate: "Allowed To Delegate",
  certchain: "Certificate Chain",
  hasbasicconstraints: "Has Basic Constraints",
  basicconstraintpathlength: "Basic Constraints Path Length",
  caregistrydata: "CA Registry Data",
  casecuritycollected: "CA Security Collected",
  certnameflags: "Cert Name Flags",
  certenrollmentflags: "Cert Enrollment Flags",
  effectiveekus: "Effective EKUs",
  enrollmentagentrestrictions: "Enrollment Agent Restrictions",
  haskeyprotection: "Has Key Protection",
  issuancepolicies: "Issuance Policies",
  schemaversion: "Schema Version",
  subjectaltrequiredns: "Subject Alt Require DNS",
  subjectaltrequireemail: "Subject Alt Require Email",
  subjectaltrequiredomaindns: "Subject Alt Require Domain DNS",
  subjectaltrequirespn: "Subject Alt Require SPN",
  subjectaltrequireupn: "Subject Alt Require UPN",
  enrolleenameflags: "Enrollee Name Flags",
  raborequiresignature: "RAB Requires Signature",
  nosecurityextension: "No Security Extension",
};

const SECURITY_PROPERTIES = new Set([
  "admincount",
  "hasspn",
  "hassidhistory",
  "unconstraineddelegation",
  "trustedtoauth",
  "dontreqpreauth",
  "sensitive",
  "passwordnotreqd",
  "pwdneverexpires",
  "enabled",
  "isdc",
  "highvalue",
  "nosecurityextension",
  "isdeleted",
]);

function formatWindowsTimestamp(value: number): string {
  if (value <= 0 || value === 9223372036854775807) return "Never";
  const ms = value / WINDOWS_TICK - WINDOWS_EPOCH_OFFSET;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString();
}

function formatUnixTimestamp(value: number): string {
  if (value <= 0) return "Never";
  // If value is very large, it's a Windows filetime
  if (value > 1e14) return formatWindowsTimestamp(value);
  // If value is in seconds (Unix epoch)
  const ms = value > 1e12 ? value : value * 1000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString();
}

export function formatPropertyValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "N/A";

  const lowerKey = key.toLowerCase();

  // Date/epoch properties
  if (EPOCH_PROPERTIES.has(lowerKey) && typeof value === "number") {
    return formatUnixTimestamp(value);
  }

  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value || "N/A";

  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function getPropertyLabel(key: string): string {
  const lower = key.toLowerCase();
  if (PROPERTY_LABELS[lower]) return PROPERTY_LABELS[lower];

  // Auto-generate label from key: camelCase/snake_case -> Title Case
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\s/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const IMPORTANT_PROPERTIES: Record<string, string[]> = {
  User: [
    "displayname",
    "samaccountname",
    "description",
    "enabled",
    "admincount",
    "lastlogon",
    "pwdlastset",
    "hasspn",
    "dontreqpreauth",
    "unconstraineddelegation",
    "trustedtoauth",
    "sensitive",
    "passwordnotreqd",
    "pwdneverexpires",
    "serviceprincipalnames",
    "email",
    "title",
  ],
  Computer: [
    "displayname",
    "samaccountname",
    "operatingsystem",
    "description",
    "enabled",
    "lastlogon",
    "pwdlastset",
    "unconstraineddelegation",
    "trustedtoauth",
    "hasspn",
    "isdc",
    "allowedtodelegate",
    "serviceprincipalnames",
  ],
  Group: [
    "displayname",
    "samaccountname",
    "description",
    "admincount",
    "whencreated",
  ],
  Domain: [
    "name",
    "functionallevel",
    "domainsid",
    "whencreated",
    "whenchanged",
  ],
  GPO: [
    "name",
    "displayname",
    "description",
    "whencreated",
    "whenchanged",
  ],
  OU: [
    "name",
    "description",
    "whencreated",
    "whenchanged",
  ],
  Container: [
    "name",
    "description",
    "whencreated",
  ],
  CertTemplate: [
    "name",
    "displayname",
    "schemaversion",
    "effectiveekus",
    "enrolleenameflags",
    "certnameflags",
    "certenrollmentflags",
    "nosecurityextension",
  ],
  EnterpriseCA: [
    "name",
    "hasbasicconstraints",
    "basicconstraintpathlength",
    "certchain",
    "caregistrydata",
  ],
  RootCA: [
    "name",
    "certchain",
    "hasbasicconstraints",
  ],
  AIACA: [
    "name",
    "certchain",
    "hasbasicconstraints",
  ],
  NTAuthStore: [
    "name",
    "certchain",
  ],
};

export function getImportantProperties(kind: string): string[] {
  return IMPORTANT_PROPERTIES[kind] ?? ["name", "description", "whencreated"];
}

export function isSecurityProperty(key: string): boolean {
  return SECURITY_PROPERTIES.has(key.toLowerCase());
}
