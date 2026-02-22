# BloodHound CE Object Information Panel - Comprehensive Research Synthesis

## Executive Summary

This document contains a complete reverse-engineering of the BloodHound Community Edition (BHCE) information panel architecture, derived from direct analysis of the SpecterOps/BloodHound GitHub repository. It covers every node type, every edge type, every API endpoint, every UI section, and the complete component architecture.

---

## 1. ARCHITECTURAL OVERVIEW

### Component Hierarchy

```
GraphItemInformationPanel.tsx (cmd/ui/src/views/Explore/)
  |
  |-- [If Node Selected] --> EntityInfoPanel (bh-shared-ui)
  |     |-- EntityInfoHeader (name, type, icon)
  |     |-- EntityInfoContent
  |     |     |-- EntityInfoDataTablePriorityList (priority sections)
  |     |     |-- EntityObjectInformation (object properties)
  |     |     |     |-- BasicObjectInfoFields (zone, type, tier zero, owned, display name, object ID)
  |     |     |     |-- ObjectInfoFields (all other properties, formatted)
  |     |     |-- EntityInfoDataTableList (relationship sections)
  |     |           |-- EntityInfoDataTableGraphed (per section, with counts)
  |     |                 |-- InfiniteScrollingTable (actual data rows)
  |
  |-- [If Edge Selected] --> EdgeInfoPane (bh-shared-ui)
        |-- EdgeInfoHeader (edge name)
        |-- EdgeInfoContent
              |-- EdgeObjectInformation (source, target, edge properties)
              |-- EdgeInfoCollapsibleSection (per help text section)
              |     |-- [General | Abuse | WindowsAbuse | LinuxAbuse | OPSEC | References | Composition]
              |-- ACLInheritance (conditional, for ACL edges with inheritance)
```

### Key Source Files

| File | Location | Purpose |
|------|----------|---------|
| `GraphItemInformationPanel.tsx` | `cmd/ui/src/views/Explore/` | Top-level panel router (node vs edge) |
| `EntityInfoPanel.tsx` | `packages/javascript/bh-shared-ui/src/components/EntityInfo/` | Node info panel container |
| `EntityInfoContent.tsx` | Same directory | Content layout (priority + object info + data tables) |
| `EntityObjectInformation.tsx` | Same directory | Object property display |
| `EntityInfoCollapsibleSection.tsx` | Same directory | Collapsible accordion wrapper |
| `EntityInfoDataTableGraphed.tsx` | `bh-shared-ui/src/components/EntityInfoDataTableGraphed/` | Expandable section with counts + infinite scroll |
| `EdgeInfoPane.tsx` | `bh-shared-ui/src/views/Explore/EdgeInfo/` | Edge info panel container |
| `EdgeInfoContent.tsx` | Same directory | Edge content with help text tabs |
| `EdgeObjectInformation.tsx` | Same directory | Edge source/target/properties display |
| `content.ts` | `bh-shared-ui/src/utils/` | Section definitions per node type (`allSections`) |
| `entityInfoDisplay.ts` | Same directory | Property formatting and display labels |
| `graphSchema.ts` | `bh-shared-ui/src/` | All node kinds, edge kinds, properties enums |
| `edgeCategories.tsx` | `bh-shared-ui/src/views/Explore/ExploreSearch/EdgeFilter/` | Edge section labels, edge category groupings |
| `HelpTexts/index.tsx` | `bh-shared-ui/src/components/HelpTexts/` | Master registry of all edge help text components |
| `client.ts` | `packages/javascript/js-client-library/src/` | API client with all endpoint methods |
| `BasicObjectInfoFields.tsx` | `bh-shared-ui/src/views/Explore/` | Zone, node type, tier zero, owned, display name, object ID |
| `fragments.tsx` | Same directory | Field, ObjectInfoFields, FieldsContainer components |

---

## 2. NODE INFORMATION PANEL - SECTIONS PER NODE TYPE

### Panel Structure (for all node types)

Every node info panel has this structure:
1. **Header**: Node name + node type icon
2. **Object Information** (collapsible, expanded by default):
   - Basic fields: Zone, Node Type, Tier Zero, Is Owned, Display Name, Object ID
   - All other properties (formatted, sorted alphabetically)
3. **Relationship Sections** (collapsible, with counts):
   - Each section shows a count badge and expands to reveal an infinite-scrolling table of related nodes

---

### 2.1 User Node (ActiveDirectoryNodeKind.User)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Sessions | `user-sessions` | `GET /api/v2/users/{id}/sessions` |
| Member Of | `user-member_of` | `GET /api/v2/users/{id}/memberships` |
| Local Admin Privileges | `user-local_admin_privileges` | `GET /api/v2/users/{id}/admin-rights` |
| **Execution Privileges** (parent) | | |
| -- RDP Privileges | `user-rdp_privileges` | `GET /api/v2/users/{id}/rdp-rights` |
| -- PSRemote Privileges | `user-psremote_privileges` | `GET /api/v2/users/{id}/ps-remote-rights` |
| -- DCOM Privileges | `user-dcom_privileges` | `GET /api/v2/users/{id}/dcom-rights` |
| -- SQL Admin Rights | `user-sql_admin_rights` | `GET /api/v2/users/{id}/sql-admin-rights` |
| -- Constrained Delegation Privileges | `user-constrained_delegation_privileges` | `GET /api/v2/users/{id}/constrained-delegation-rights` |
| Outbound Object Control | `user-outbound_object_control` | `GET /api/v2/users/{id}/controllables` |
| Inbound Object Control | `user-inbound_object_control` | `GET /api/v2/users/{id}/controllers` |

**User Properties** (from AD + Common schemas):
- Display Name, Object ID, SID, Distinguished Name, SAM Account Name
- Enabled, Admin Count, AdminSDHolder Protected
- Last Logon, Last Logon Timestamp, When Created, Password Last Set
- Password Never Expires, Password Not Required, Password Expired
- Dont Require PreAuth (ASREP Roastable), Has SPN, Service Principal Names
- Sensitive (Cannot Be Delegated), Trusted To Auth
- Unconstrainted Delegation, Has LAPS
- Home Directory, Email, Title, Department, Description
- GMSA, MSA, Smart Card Required, Use DES Key Only
- Locked Out, User Cannot Change Password, Logon Script Enabled
- SID History, User Account Control, Supported Encryption Types
- Is Tier Zero, Last Seen, Operating System

---

### 2.2 Computer Node (ActiveDirectoryNodeKind.Computer)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Sessions | `computer-sessions` | `GET /api/v2/computers/{id}/sessions` |
| Local Admins | `computer-local_admins` | `GET /api/v2/computers/{id}/admin-users` |
| **Inbound Execution Privileges** (parent) | | |
| -- RDP Users | `computer-rdp_users` | `GET /api/v2/computers/{id}/rdp-users` |
| -- PSRemote Users | `computer-psremote_users` | `GET /api/v2/computers/{id}/ps-remote-users` |
| -- DCOM Users | `computer-dcom_users` | `GET /api/v2/computers/{id}/dcom-users` |
| -- SQL Admin Users | `computer-sql_admin_users` | `GET /api/v2/computers/{id}/sql-admins` |
| -- Constrained Delegation Users | `computer-constrained_delegation_users` | `GET /api/v2/computers/{id}/constrained-users` |
| Member Of | `computer-member_of` | `GET /api/v2/computers/{id}/group-membership` |
| Local Admin Privileges | `computer-local_admin_privileges` | `GET /api/v2/computers/{id}/admin-rights` |
| **Outbound Execution Privileges** (parent) | | |
| -- RDP Privileges | `computer-rdp_privileges` | `GET /api/v2/computers/{id}/rdp-rights` |
| -- PSRemote Rights | `computer-psremote_rights` | `GET /api/v2/computers/{id}/ps-remote-rights` |
| -- DCOM Privileges | `computer-dcom_privileges` | `GET /api/v2/computers/{id}/dcom-rights` |
| Inbound Object Control | `computer-inbound_object_control` | `GET /api/v2/computers/{id}/controllers` |
| Outbound Object Control | `computer-outbound_object_control` | `GET /api/v2/computers/{id}/controllables` |

**Computer Properties**:
- Display Name, Object ID, SID, Distinguished Name, SAM Account Name, DNS Hostname
- Operating System, Enabled, Has LAPS, Unconstrainted Delegation
- Allowed To Delegate, Trusted To Auth, Is DC, Is Read Only DC
- Last Logon, Last Logon Timestamp, When Created, Password Last Set
- SMB Signing, Web Client Running, Restrict Outbound NTLM
- ADCS Web Enrollment (HTTP/HTTPS), LDAP Signing, LDAP/LDAPS Available
- Has URA, Admin Count, Has SPN, Service Principal Names
- Is Tier Zero, Last Seen, Supported Encryption Types

---

### 2.3 Group Node (ActiveDirectoryNodeKind.Group)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Sessions | `group-sessions` | `GET /api/v2/groups/{id}/sessions` |
| Members | `group-members` | `GET /api/v2/groups/{id}/members` |
| Member Of | `group-member_of` | `GET /api/v2/groups/{id}/memberships` |
| Local Admin Privileges | `group-local_admin_privileges` | `GET /api/v2/groups/{id}/admin-rights` |
| **Execution Privileges** (parent) | | |
| -- RDP Privileges | `group-rdp_privileges` | `GET /api/v2/groups/{id}/rdp-rights` |
| -- DCOM Privileges | `group-dcom_privileges` | `GET /api/v2/groups/{id}/dcom-rights` |
| -- PSRemote Rights | `group-psremote_rights` | `GET /api/v2/groups/{id}/ps-remote-rights` |
| Inbound Object Control | `group-inbound_object_control` | `GET /api/v2/groups/{id}/controllers` |
| Outbound Object Control | `group-outbound_object_control` | `GET /api/v2/groups/{id}/controllables` |

**Group Properties**:
- Display Name, Object ID, SID, Distinguished Name, SAM Account Name
- Admin Count, AdminSDHolder Protected, Description
- Is Tier Zero, Last Seen, When Created
- Group Scope

---

### 2.4 Domain Node (ActiveDirectoryNodeKind.Domain)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| **Foreign Members** (parent) | | |
| -- Foreign Users | `domain-foreign_users` | `GET /api/v2/domains/{id}/foreign-users` |
| -- Foreign Groups | `domain-foreign_groups` | `GET /api/v2/domains/{id}/foreign-groups` |
| -- Foreign Admins | `domain-foreign_admins` | `GET /api/v2/domains/{id}/foreign-admins` |
| -- Foreign GPO Controllers | `domain-foreign_gpo_controllers` | `GET /api/v2/domains/{id}/foreign-gpo-controllers` |
| Inbound Trusts | `domain-inbound_trusts` | `GET /api/v2/domains/{id}/inbound-trusts` |
| Outbound Trusts | `domain-outbound_trusts` | `GET /api/v2/domains/{id}/outbound-trusts` |
| Controllers | `domain-controllers` | `GET /api/v2/domains/{id}/controllers` |
| ADCS Escalations | `domain-adcs_escalations` | `GET /api/v2/domains/{id}/adcs-escalations` |

**Domain Properties**:
- Display Name, Object ID, Domain FQDN, Domain SID, Distinguished Name
- Functional Level, NetBIOS
- Machine Account Quota, Expire Passwords On Smart Card Only Accounts
- DS Heuristics, Min Pwd Length, Pwd Properties, Pwd History Length
- Lockout Threshold, Min Pwd Age, Max Pwd Age
- Lockout Duration, Lockout Observation Window
- Is Tier Zero, Last Seen, When Created
- Certificate Mapping Methods, Strong Certificate Binding Enforcement

---

### 2.5 GPO Node (ActiveDirectoryNodeKind.GPO)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| **Affected Objects** (parent) | | |
| -- OUs | `gpo-ous` | `GET /api/v2/gpos/{id}/ous` |
| -- Computers | `gpo-computers` | `GET /api/v2/gpos/{id}/computers` |
| -- Users | `gpo-users` | `GET /api/v2/gpos/{id}/users` |
| -- Tier Zero Objects | `gpo-tier_zero_objects` | `GET /api/v2/gpos/{id}/tier-zero` |
| Inbound Object Control | `gpo-inbound_object_control` | `GET /api/v2/gpos/{id}/controllers` |

**GPO Properties**:
- Display Name, Object ID, Distinguished Name, Description
- GPO Status, GPO Status Raw
- Is Tier Zero, Last Seen, When Created

---

### 2.6 OU Node (ActiveDirectoryNodeKind.OU)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Affecting GPOs | `ou-affecting_gpos` | `GET /api/v2/ous/{id}/gpos` |
| Groups | `ou-groups` | `GET /api/v2/ous/{id}/groups` |
| Computers | `ou-computers` | `GET /api/v2/ous/{id}/computers` |
| Users | `ou-users` | `GET /api/v2/ous/{id}/users` |

**OU Properties**:
- Display Name, Object ID, Distinguished Name, Description
- Blocks Inheritance
- Is Tier Zero, Last Seen, When Created

---

### 2.7 Container Node (ActiveDirectoryNodeKind.Container)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `container-inbound_object_control` | `GET /api/v2/containers/{id}/controllers` |

**Container Properties**:
- Display Name, Object ID, Distinguished Name, Description
- Is Tier Zero, Last Seen, When Created

---

### 2.8 AIACA Node (ActiveDirectoryNodeKind.AIACA)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `aiaca-inbound_object_control` | `GET /api/v2/aiacas/{id}/controllers` |
| PKI Hierarchy | `aiaca-pki_hierarchy` | `GET /api/v2/aiacas/{id}/pki-hierarchy` |

---

### 2.9 RootCA Node (ActiveDirectoryNodeKind.RootCA)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `rootca-inbound_object_control` | `GET /api/v2/rootcas/{id}/controllers` |
| PKI Hierarchy | `rootca-pki_hierarchy` | `GET /api/v2/rootcas/{id}/pki-hierarchy` |

---

### 2.10 EnterpriseCA Node (ActiveDirectoryNodeKind.EnterpriseCA)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `enterpriseca-inbound_object_control` | `GET /api/v2/enterprisecas/{id}/controllers` |
| PKI Hierarchy | `enterpriseca-pki_hierarchy` | `GET /api/v2/enterprisecas/{id}/pki-hierarchy` |
| Published Templates | `enterpriseca-published_templates` | `GET /api/v2/enterprisecas/{id}/published-templates` |

---

### 2.11 NTAuthStore Node (ActiveDirectoryNodeKind.NTAuthStore)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `ntauthstore-inbound_object_control` | `GET /api/v2/ntauthstores/{id}/controllers` |
| Trusted CAs | `ntauthstore-trusted_cas` | `GET /api/v2/ntauthstores/{id}/trusted-cas` |

---

### 2.12 CertTemplate Node (ActiveDirectoryNodeKind.CertTemplate)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `certtemplate-inbound_object_control` | `GET /api/v2/certtemplates/{id}/controllers` |
| Published To CAs | `certtemplate-published_to_cas` | `GET /api/v2/certtemplates/{id}/published-to-cas` |

**CertTemplate Properties**:
- Display Name, Object ID, Distinguished Name, Certificate Name, OID
- Schema Version, Validity Period, Renewal Period
- Enrollment Flag, Certificate Name Flag
- EKUs, Effective EKUs, Application Policies, Issuance Policies, Certificate Application Policy
- Enrollee Supplies Subject, Requires Manager Approval
- Authentication Enabled, Schannel Authentication Enabled
- No Security Extension, Authorized Signatures
- Is Tier Zero, Last Seen, When Created

---

### 2.13 IssuancePolicy Node (ActiveDirectoryNodeKind.IssuancePolicy)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Inbound Object Control | `issuancepolicy-inbound_object_control` | `GET /api/v2/issuancepolicies/{id}/controllers` |
| Linked Certificate Templates | `issuancepolicy-linked_certificate_templates` | `GET /api/v2/issuancepolicies/{id}/linkedtemplates` |

---

### 2.14 Entity/Base Node (Fallback)

| Section | Query Type | API Endpoint |
|---------|-----------|--------------|
| Outbound Object Control | `base-outbound_object_control` | `GET /api/v2/base/{id}/controllables` |
| Inbound Object Control | `base-inbound_object_control` | `GET /api/v2/base/{id}/controllers` |

---

## 3. AZURE NODE TYPES

### 3.1 Azure User (AzureNodeKind.User)

| Section | Query Type |
|---------|-----------|
| Member Of | `azuser-member_of` |
| Roles | `azuser-roles` |
| Execution Privileges | `azuser-execution_privileges` |
| Outbound Object Control | `azuser-outbound_object_control` |
| Inbound Object Control | `azuser-inbound_object_control` |

### 3.2 Azure Group (AzureNodeKind.Group)

| Section | Query Type |
|---------|-----------|
| Members | `azgroup-members` |
| Member Of | `azgroup-member_of` |
| Roles | `azgroup-roles` |
| Inbound Object Control | `azgroup-inbound_object_control` |
| Outbound Object Control | `azgroup-outbound_object_control` |

### 3.3 Azure Device (AzureNodeKind.Device)

| Section | Query Type |
|---------|-----------|
| Local Admins | `azdevice-local_admins` |
| Inbound Object Control | `azdevice-inbound_object_control` |

### 3.4 Azure VM (AzureNodeKind.VM)

| Section | Query Type |
|---------|-----------|
| Local Admins | `azvm-local_admins` |
| Inbound Object Control | `azvm-inbound_object_control` |

### 3.5 Azure KeyVault (AzureNodeKind.KeyVault)

| Section | Query Type |
|---------|-----------|
| **Vault Readers** (parent) | |
| -- Key Readers | `azkeyvault-key_readers` |
| -- Certificate Readers | `azkeyvault-certificate_readers` |
| -- Secret Readers | `azkeyvault-secret_readers` |
| -- All Readers | `azkeyvault-all_readers` |
| Inbound Object Control | `azkeyvault-inbound_object_control` |

### 3.6 Azure Service Principal (AzureNodeKind.ServicePrincipal)

| Section | Query Type |
|---------|-----------|
| Roles | `azserviceprincipal-roles` |
| Inbound Object Control | `azserviceprincipal-inbound_object_control` |
| Outbound Object Control | `azserviceprincipal-outbound_object_control` |
| Inbound Abusable App Role Assignments | `azserviceprincipal-inbound_abusable_app_role_assignments` |
| Outbound Abusable App Role Assignments* | `azserviceprincipal-outbound_abusable_app_role_assignments` |

*Only for MS Graph Service Principal (ID: 00000003-0000-0000-C000-000000000000)

### 3.7 Azure Tenant (AzureNodeKind.Tenant)

Has a large **Descendant Objects** parent section with subsections:
- Descendant Users, Groups, Management Groups, Subscriptions, Resource Groups
- Descendant VMs, Managed Clusters, VM Scale Sets, Container Registries
- Descendant Web Apps, Automation Accounts, Key Vaults, Function Apps
- Descendant Logic Apps, App Registrations, Service Principals, Devices
- Inbound Object Control

### 3.8 Azure Subscription / Resource Group / Management Group

Similar descendant object patterns with resource-specific subsections.

### 3.9 Azure Role, App, FunctionApp, ManagedCluster, ContainerRegistry, WebApp, LogicApp, AutomationAccount

Primarily: Inbound Object Control (some have Active Assignments, Approvers).

---

## 4. EDGE/RELATIONSHIP INFORMATION PANEL

### Panel Structure

When an edge is clicked, the EdgeInfoPane renders:
1. **Header**: Edge type name (e.g., "GenericAll", "HasSession", "MemberOf")
2. **Edge Object Information** (collapsible "Relationship Information" section):
   - Source Node (name, clickable)
   - Target Node (name, clickable)
   - Edge Properties (fetched via Cypher: `MATCH (s)-[r:EdgeType]->(t) WHERE ID(s)=X AND ID(t)=Y RETURN r`)
3. **Help Text Tabs** (collapsible, one per section):
   - Content depends on edge type (see below)
4. **ACL Inheritance** (conditional):
   - Only shown when edge has IsACL=true, IsInherited=true, and InheritanceHash data

### Edge Section Labels (EdgeSections mapping)

| Key | Display Label |
|-----|--------------|
| `data` | Relationship Information |
| `general` | General |
| `abuse` | Abuse |
| `windowsAbuse` | Windows Abuse |
| `linuxAbuse` | Linux Abuse |
| `opsec` | OPSEC |
| `references` | References |
| `composition` | Composition |
| `relaytargets` | Relay Targets |
| `coerciontargets` | Coercion Targets |

### Help Text Tab Patterns

Different edge types have different tab structures:

**Pattern A** (5 tabs - most ACL/permission edges):
- General, Windows Abuse, Linux Abuse, OPSEC, References
- Used by: GenericAll, GenericWrite, WriteDACL, WriteOwner, ForceChangePassword, AddMember, AddSelf, AllExtendedRights, Owns, AddAllowedToAct, AddKeyCredentialLink, WriteSPN, WriteAccountRestrictions, WriteGPLink, DCSync, ReadLAPSPassword, ReadGMSAPassword, DumpSMSAPassword, SyncLAPSPassword, WritePKIEnrollmentFlag, WritePKINameFlag, ManageCA, ManageCertificates, WriteOwnerLimitedRights, OwnsLimitedRights, WriteOwnerRaw, OwnsRaw

**Pattern B** (4 tabs - simpler edges):
- General, Abuse, OPSEC, References
- Used by: HasSession, MemberOf, AdminTo, CanRDP, CanPSRemote, ExecuteDCOM, SQLAdmin, AllowedToDelegate, AllowedToAct, Contains, GPLink, HasSIDHistory, CoerceToTGT, AbuseTGTDelegation, Enroll, ClaimSpecialIdentity, SpoofSIDHistory, HasTrustKeys, ProtectAdminGroups

**Pattern C** (6 tabs - ADCS escalations):
- General, Windows Abuse, Linux Abuse, OPSEC, References, Composition
- Used by: ADCSESC1, ADCSESC3, ADCSESC4, ADCSESC6a, ADCSESC6b, ADCSESC9a, ADCSESC9b, ADCSESC10a, ADCSESC10b, ADCSESC13, GoldenCert

**Pattern D** (NTLM Relay edges):
- General, Windows Abuse, Linux Abuse, OPSEC, References, Relay Targets / Coercion Targets
- Used by: CoerceAndRelayNTLMToSMB, CoerceAndRelayNTLMToADCS, CoerceAndRelayNTLMToLDAP, CoerceAndRelayNTLMToLDAPS

---

## 5. COMPLETE EDGE TYPE REGISTRY (129 edge types with help texts)

### Active Directory Edges

**AD Structure:**
- Contains, DCFor, GPLink, ClaimSpecialIdentity, HasSIDHistory, MemberOf, SameForestTrust

**Lateral Movement:**
- AdminTo, AllowedToAct, AllowedToDelegate, CanPSRemote, CanRDP, ExecuteDCOM, SQLAdmin

**Credential Access:**
- CoerceToTGT, DCSync, DumpSMSAPassword, HasSession, ReadGMSAPassword, ReadLAPSPassword, SyncLAPSPassword, HasTrustKeys

**Basic Object Manipulation:**
- AddMember, AddSelf, AllExtendedRights, ForceChangePassword, GenericAll, Owns, OwnsLimitedRights, ProtectAdminGroups, GenericWrite, WriteDACL, WriteOwner, WriteOwnerLimitedRights

**Advanced Object Manipulation:**
- AddAllowedToAct, AddKeyCredentialLink, WriteAccountRestrictions, WriteGPLink, WriteSPN

**ADCS (Certificate Services):**
- GoldenCert, ManageCA, ManageCertificates, DelegatedEnrollmentAgent, Enroll, EnrollOnBehalfOf
- ADCSESC1, ADCSESC3, ADCSESC4, ADCSESC6a, ADCSESC6b, ADCSESC9a, ADCSESC9b, ADCSESC10a, ADCSESC10b, ADCSESC13
- HostsCAService, WritePKIEnrollmentFlag, WritePKINameFlag
- NTAuthStoreFor, TrustedForNTAuth, EnterpriseCAFor, IssuedSignedBy, RootCAFor
- PublishedTo, ExtendedByPolicy, OIDGroupLink

**Cross Forest Trust:**
- SpoofSIDHistory, AbuseTGTDelegation, CrossForestTrust

**Cross Platform:**
- SyncedToEntraUser

**NTLM Relay:**
- CoerceAndRelayNTLMToSMB, CoerceAndRelayNTLMToADCS, CoerceAndRelayNTLMToLDAP, CoerceAndRelayNTLMToLDAPS

**Other AD Edges:**
- GetChanges, GetChangesAll, WriteOwnerRaw, OwnsRaw, CodeController

### Azure Edges

**Structure:**
- AZAppAdmin, AZCloudAppAdmin, AZContains, AZGlobalAdmin, AZHasRole, AZManagedIdentity, AZMemberOf, AZNodeResourceGroup, AZPrivilegedAuthAdmin, AZPrivilegedRoleAdmin, AZRunsAs, AZRoleEligible, AZRoleApprover

**Basic Object Manipulation:**
- AZAddMembers, AZAddOwner, AZAddSecret, AZExecuteCommand, AZOwner, AZOwns, AZResetPassword

**MS Graph App Role Abuses:**
- AZMGAddMember, AZMGAddOwner, AZMGAddSecret, AZMGGrantAppRoles, AZMGGrantRole
- AZMGAppRoleAssignment_ReadWrite_All, AZMGApplication_ReadWrite_All
- AZMGDirectory_ReadWrite_All, AZMGGroupMember_ReadWrite_All
- AZMGGroup_ReadWrite_All, AZMGRoleManagement_ReadWrite_Directory
- AZMGServicePrincipalEndpoint_ReadWrite_All

**Secret/Credential Access:**
- AZGetCertificates, AZGetKeys, AZGetSecrets

**AzureRM Manipulation:**
- AZAvereContributor, AZKeyVaultKVContributor, AZContributor, AZUserAccessAdministrator
- AZVMAdminLogin, AZVMContributor, AZAKSContributor, AZAutomationContributor
- AZLogicAppContributor, AZWebsiteContributor

**Cross Platform:**
- SyncedToADUser

---

## 6. EDGE HELP TEXT CONTENT STRUCTURE

### General Tab
Describes WHAT the relationship means. Example for GenericAll:
> "The [source type] [source name] has GenericAll permissions to the [target type] [target name]. This is also known as full control. This permission allows the trustee to manipulate the target object however they wish."

### Windows Abuse Tab
Provides Windows-specific attack commands. Uses PowerView, Rubeus, mimikatz, etc. Content is CONDITIONAL based on target type:
- **User targets**: Force password change, Shadow Credentials, Targeted Kerberoast
- **Computer targets**: Read LAPS password, Shadow Credentials, RBCD
- **Group targets**: Add member to group
- **Domain targets**: DCSync, GPO manipulation
- **GPO/OU/Container targets**: Full control exploitation, inheritable ACE addition
- **PKI targets**: ADCS escalation via cert template/CA manipulation

### Linux Abuse Tab
Same structure as Windows but using Linux-native tools: impacket, bloodyAD, certipy, pkinittools, etc.

### OPSEC Tab
Describes detection considerations. Some generic:
> "This depends on the target object and how to take advantage of this permission."
Others are specific with detection event IDs, log sources, and defensive indicators.

### References Tab
External links to blog posts, tool repositories, and research papers. Common references:
- PowerView/PowerSploit GitHub
- TheHacker.recipes guides
- SpecterOps blog posts
- Rubeus, Whisker, Certify repositories
- Microsoft documentation

### Composition Tab (ADCS edges only)
Shows the composite attack path - the chain of relationships that make up the ADCS escalation.

---

## 7. COMPLETE API ENDPOINT REFERENCE

### Node Detail Endpoints (GET entity properties + counts)

```
GET /api/v2/users/{object_id}
GET /api/v2/computers/{object_id}
GET /api/v2/groups/{object_id}
GET /api/v2/domains/{object_id}
GET /api/v2/gpos/{object_id}
GET /api/v2/ous/{object_id}
GET /api/v2/containers/{object_id}
GET /api/v2/aiacas/{object_id}
GET /api/v2/rootcas/{object_id}
GET /api/v2/enterprisecas/{object_id}
GET /api/v2/ntauthstores/{object_id}
GET /api/v2/certtemplates/{object_id}
GET /api/v2/issuancepolicies/{object_id}
GET /api/v2/base/{object_id}
GET /api/v2/azure/{entityType}    (generic Azure endpoint)
```

All detail endpoints accept `?counts=true` to include relationship counts.

### User Related Objects Endpoints

```
GET /api/v2/users/{id}/sessions
GET /api/v2/users/{id}/memberships
GET /api/v2/users/{id}/admin-rights
GET /api/v2/users/{id}/rdp-rights
GET /api/v2/users/{id}/dcom-rights
GET /api/v2/users/{id}/ps-remote-rights
GET /api/v2/users/{id}/sql-admin-rights
GET /api/v2/users/{id}/constrained-delegation-rights
GET /api/v2/users/{id}/controllers
GET /api/v2/users/{id}/controllables
```

### Computer Related Objects Endpoints

```
GET /api/v2/computers/{id}/sessions
GET /api/v2/computers/{id}/admin-users
GET /api/v2/computers/{id}/rdp-users
GET /api/v2/computers/{id}/dcom-users
GET /api/v2/computers/{id}/ps-remote-users
GET /api/v2/computers/{id}/sql-admins
GET /api/v2/computers/{id}/constrained-users
GET /api/v2/computers/{id}/group-membership
GET /api/v2/computers/{id}/admin-rights
GET /api/v2/computers/{id}/rdp-rights
GET /api/v2/computers/{id}/dcom-rights
GET /api/v2/computers/{id}/ps-remote-rights
GET /api/v2/computers/{id}/constrained-delegation-rights
GET /api/v2/computers/{id}/controllers
GET /api/v2/computers/{id}/controllables
```

### Group Related Objects Endpoints

```
GET /api/v2/groups/{id}/sessions
GET /api/v2/groups/{id}/members
GET /api/v2/groups/{id}/memberships
GET /api/v2/groups/{id}/admin-rights
GET /api/v2/groups/{id}/rdp-rights
GET /api/v2/groups/{id}/dcom-rights
GET /api/v2/groups/{id}/ps-remote-rights
GET /api/v2/groups/{id}/controllables
GET /api/v2/groups/{id}/controllers
```

### Domain Related Objects Endpoints

```
GET /api/v2/domains/{id}/users
GET /api/v2/domains/{id}/groups
GET /api/v2/domains/{id}/computers
GET /api/v2/domains/{id}/ous
GET /api/v2/domains/{id}/gpos
GET /api/v2/domains/{id}/foreign-users
GET /api/v2/domains/{id}/foreign-groups
GET /api/v2/domains/{id}/foreign-admins
GET /api/v2/domains/{id}/foreign-gpo-controllers
GET /api/v2/domains/{id}/inbound-trusts
GET /api/v2/domains/{id}/outbound-trusts
GET /api/v2/domains/{id}/controllers
GET /api/v2/domains/{id}/dc-syncers
GET /api/v2/domains/{id}/linked-gpos
GET /api/v2/domains/{id}/adcs-escalations
```

### GPO Related Objects Endpoints

```
GET /api/v2/gpos/{id}/ous
GET /api/v2/gpos/{id}/computers
GET /api/v2/gpos/{id}/users
GET /api/v2/gpos/{id}/controllers
GET /api/v2/gpos/{id}/tier-zero
```

### OU Related Objects Endpoints

```
GET /api/v2/ous/{id}/gpos
GET /api/v2/ous/{id}/users
GET /api/v2/ous/{id}/groups
GET /api/v2/ous/{id}/computers
```

### Container Related Objects Endpoints

```
GET /api/v2/containers/{id}/controllers
```

### ADCS Related Objects Endpoints

```
GET /api/v2/aiacas/{id}/controllers
GET /api/v2/aiacas/{id}/pki-hierarchy
GET /api/v2/rootcas/{id}/controllers
GET /api/v2/rootcas/{id}/pki-hierarchy
GET /api/v2/enterprisecas/{id}/controllers
GET /api/v2/enterprisecas/{id}/pki-hierarchy
GET /api/v2/enterprisecas/{id}/published-templates
GET /api/v2/ntauthstores/{id}/controllers
GET /api/v2/ntauthstores/{id}/trusted-cas
GET /api/v2/certtemplates/{id}/controllers
GET /api/v2/certtemplates/{id}/published-to-cas
GET /api/v2/issuancepolicies/{id}/controllers
GET /api/v2/issuancepolicies/{id}/linkedtemplates
```

### Base/Generic Entity Endpoints

```
GET /api/v2/base/{id}
GET /api/v2/base/{id}/controllables
GET /api/v2/base/{id}/controllers
GET /api/v2/meta/{id}
```

### Graph Operation Endpoints

```
POST /api/v2/graphs/cypher          (execute raw Cypher query)
POST /api/v2/graph-search           (search graph)
POST /api/v2/pathfinding            (find paths between nodes)
POST /api/v2/graphs/shortest-path   (shortest path)
POST /api/v2/graphs/edge-composition (composite edge breakdown)
POST /api/v2/graphs/relay-targets    (NTLM relay targets)
POST /api/v2/graphs/acl-inheritance  (ACL inheritance chain)
GET  /api/v2/graphs/kinds            (available node/edge kinds)
```

### Search Endpoints

```
POST /api/v2/search                 (general search)
GET  /api/v2/available-domains      (list available domains)
```

### All related-objects endpoints accept these query parameters:
- `skip` (int) - pagination offset
- `limit` (int) - max results
- `type` (string) - filter by relationship type

---

## 8. PROPERTY SCHEMAS

### Common Properties (shared across all node types)

| Property Key | Display Label |
|-------------|--------------|
| `objectid` | Object ID |
| `name` | Name |
| `displayname` | Display Name |
| `description` | Description |
| `owner_objectid` | Owner Object ID |
| `collected` | Collected |
| `operatingsystem` | Operating System |
| `system_tags` | Node System Tags |
| `user_tags` | User Tags |
| `lastseen` | Last Seen |
| `lastcollected` | Last Collected |
| `whencreated` | When Created |
| `enabled` | Enabled |
| `pwdlastset` | Password Last Set |
| `title` | Title |
| `email` | Email |
| `isinherited` | Is Inherited |
| `compositionid` | Composition ID |
| `primarykind` | Primary Kind |

### Active Directory Properties (133 properties)

Key properties by category:

**Identity:**
- `samaccountname` (SAM Account Name)
- `distinguishedname` (Distinguished Name)
- `domainsid` (Domain SID)
- `domain` (Domain FQDN)
- `objectguid` (Object GUID)
- `netbios` (NetBIOS)

**Authentication State:**
- `lastlogon` (Last Logon)
- `lastlogontimestamp` (Last Logon Timestamp)
- `admincount` (Admin Count)
- `adminsdholderprotected` (AdminSDHolder Protected)
- `sensitive` (Sensitive / Cannot Be Delegated)
- `hasspn` (Has SPN)
- `serviceprincipalnames` (Service Principal Names)
- `unconstraineddelegation` (Unconstrained Delegation)
- `trustedtoauth` (Trusted To Auth)
- `dontreqpreauth` (Dont Require Pre Auth)

**Password:**
- `pwdneverexpires` (Password Never Expires)
- `passwordnotreqd` (Password Not Required)
- `passwordexpired` (Password Expired)
- `passwordcantchange` (User Cannot Change Password)
- `encryptedtextpwdallowed` (Password Stored Using Reversible Encryption)
- `smartcardrequired` (Smart Card Required)
- `usedeskeyonly` (Use DES Key Only)
- `lockedout` (Locked Out)

**Computer-Specific:**
- `dnshostname` (DNS Hostname)
- `haslaps` (Has LAPS)
- `isdc` (Is DC)
- `isreadonlydc` (Is Read Only DC)
- `smbsigning` (SMB Signing)
- `webclientrunning` (Web Client Running)
- `restrictoutboundntlm` (Restrict Outbound NTLM)
- `ldapsigning` (LDAP Signing)
- `ldapavailable` (LDAP Available)
- `ldapsavailable` (LDAPS Available)
- `hasura` (Has URA)

**Domain Policy:**
- `functionallevel` (Functional Level)
- `machineaccountquota` (Machine Account Quota)
- `minpwdlength` (Min Pwd Length)
- `pwdproperties` (Pwd Properties)
- `pwdhistorylength` (Pwd History Length)
- `lockoutthreshold` (Lockout Threshold)
- `minpwdage` (Min Pwd Age)
- `maxpwdage` (Max Pwd Age)
- `lockoutduration` (Lockout Duration)
- `lockoutobservationwindow` (Lockout Observation Window)

**Trust:**
- `trusttype` (Trust Type)
- `transitive` (Transitive)
- `trustattributesinbound` (Trust Attributes Inbound)
- `trustattributesoutbound` (Trust Attributes Outbound)
- `spoofsidhistoryblocked` (Spoof SID History Blocked)

**ADCS/PKI:**
- `caname` (CA Name)
- `certchain` (Cert Chain)
- `certname` (Cert Name)
- `certthumbprint` (Cert Thumbprint)
- `hasbasicconstraints` (Has Basic Constraints)
- `basicconstraintpathlength` (Basic Constraint Path Length)
- `ekus` (EKUs)
- `effectiveekus` (Effective EKUs)
- `enrolleesuppliessubject` (Enrollee Supplies Subject)
- `requiresmanagerapproval` (Requires Manager Approval)
- `authenticationenabled` (Authentication Enabled)
- `schannelauthenticationenabled` (Schannel Authentication Enabled)
- `nosecurityextension` (No Security Extension)
- `schemaversion` (Schema Version)
- `validityperiod` (Validity Period)
- `renewalperiod` (Renewal Period)
- `certificatenameflag` (Certificate Name Flag)
- `enrollmentflag` (Enrollment Flag)
- `certificateapplicationpolicy` (Certificate Application Policy)
- `applicationpolicies` (Application Policies)
- `issuancepolicies` (Issuance Policies)
- `authorizedsignatures` (Authorized Signatures)
- `oid` (OID)
- `grouplinkid` (Group Link ID)
- `roleseparationenabled` (Role Separation Enabled)
- `hasenrollmentagentrestrictions` (Has Enrollment Agent Restrictions)
- `isuserspecifiessanenabled` (Is User Specifies SAN Enabled)

**NTLM/Security:**
- `certificatemappingmethodsraw` (Certificate Mapping Methods Raw)
- `certificatemappingmethods` (Certificate Mapping Methods)
- `strongcertificatebindingenforcementraw` (Strong Certificate Binding Enforcement Raw)
- `strongcertificatebindingenforcement` (Strong Certificate Binding Enforcement)
- `vulnerablenetlogonsecuritydescriptor` (Vulnerable Netlogon Security Descriptor)
- `requiresecuritysignature` (Require Security Signature)
- `enablesecuritysignature` (Enable Security Signature)
- `restrictreceivingntmltraffic` (Restrict Receiving NTLM Traffic)
- `ntlmminserversec` (NTLM Min Server Sec)
- `ntlmminclientsec` (NTLM Min Client Sec)
- `lmcompatibilitylevel` (LM Compatibility Level)
- `usemachineid` (Use Machine ID)
- `clientallowedntlmservers` (Client Allowed NTLM Servers)

**ACL:**
- `isacl` (Is ACL)
- `isaclprotected` (Is ACL Protected)
- `inheritancehash` (Inheritance Hash)
- `doesanyacegrantownerrights` (Does Any ACE Grant Owner Rights)
- `doesanyinheritedacegrantownerrights` (Does Any Inherited ACE Grant Owner Rights)
- `ownersid` (Owner SID)

**Other:**
- `blocksinheritance` (Blocks Inheritance)
- `enforced` (Enforced)
- `department` (Department)
- `homedirectory` (Home Directory)
- `isdeleted` (Is Deleted)
- `logontype` (Logon Type)
- `useraccountcontrol` (User Account Control)
- `supportedencryptiontypes` (Supported Encryption Types)
- `tgtdelegation` (TGT Delegation)
- `logonscriptenabled` (Logon Script Enabled)
- `groupscope` (Group Scope)
- `gpostatus` (GPO Status)
- `gpostatusraw` (GPO Status Raw)
- `gmsa` (GMSA)
- `msa` (MSA)
- `isprimarygroup` (Is Primary Group)
- `dsheuristics` (DS Heuristics)
- `expirepasswordsonsmartcardonlyaccounts` (Expire Passwords On Smart Card Only Accounts)

### Azure Properties (39 properties)

| Property Key | Display Label |
|-------------|--------------|
| `appownerorganizationid` | App Owner Organization ID |
| `appdescription` | App Description |
| `appdisplayname` | App Display Name |
| `serviceprincipaltype` | Service Principal Type |
| `usertype` | User Type |
| `tenantid` | Tenant ID |
| `service_principal_id` | Service Principal ID |
| `operatingsystemversion` | Operating System Version |
| `trustype` | Trust Type |
| `isbuiltin` | Is Built In |
| `appid` | App ID |
| `approleid` | App Role ID |
| `deviceid` | Device ID |
| `noderesourcegroupid` | Node Resource Group ID |
| `onpremid` | On Prem ID |
| `onpremsyncenabled` | On Prem Sync Enabled |
| `securityenabled` | Security Enabled |
| `securityidentifier` | Security Identifier |
| `enablerbacauthorization` | Enable RBAC Authorization |
| `scope` | Scope |
| `offer` | Offer |
| `mfaenabled` | MFA Enabled |
| `license` | License |
| `licenses` | Licenses |
| `loginurl` | Login URL |
| `mfaenforced` | MFA Enforced |
| `userprincipalname` | User Principal Name |
| `isassignabletorole` | Is Assignable To Role |
| `publisherdomain` | Publisher Domain |
| `signinaudience` | Sign In Audience |
| `templateid` | Role Template ID |
| `roledefinitionid` | Role Definition ID |
| `enduserassignmentrequiresapproval` | End User Assignment Requires Approval |
| `enduserassignmentuserapprovers` | End User Assignment User Approvers |
| `enduserassignmentgroupapprovers` | End User Assignment Group Approvers |
| `enduserassignmentrequiresmfa` | End User Assignment Requires MFA |
| `enduserassignmentrequiresjustification` | End User Assignment Requires Justification |
| `enduserassignmentrequiresticketinformation` | End User Assignment Requires Ticket Information |
| `lastsuccessfulsignindatetime` | Last Successful Sign In Date Time |

### Meta/Display Properties

| Property Key | Display Label |
|-------------|--------------|
| `nodeType` / `kind` | Node Type |
| `kinds` | Node Kinds |
| `isTierZero` | Tier Zero |
| `isOwnedObject` | Is Owned |

### Special Formatting Rules

- **Date fields**: `lastseen`, `whencreated`, `lastlogon`, `pwdlastset`, `lastsuccessfulsignindatetime` - formatted as dates, with special values NEVER/UNKNOWN for -1/0
- **Bitwise fields**: `certificatemappingmethodsraw`, `strongcertificatebindingenforcementraw` - displayed as hex
- **Excluded from display**: `neo4jImportId`, `highvalue`, and specific internal fields in `exclusionList`

---

## 9. EDGE COMPOSITION RELATIONSHIPS

These are complex attack paths that BHCE breaks down into constituent steps:

```
GoldenCert, ADCSESC1, ADCSESC3, ADCSESC4,
ADCSESC6a, ADCSESC6b, ADCSESC9a, ADCSESC9b,
ADCSESC10a, ADCSESC10b, ADCSESC13,
CoerceAndRelayNTLMToSMB, CoerceAndRelayNTLMToADCS,
CoerceAndRelayNTLMToLDAP, CoerceAndRelayNTLMToLDAPS,
GPOAppliesTo, CanApplyGPO
```

These use the `POST /api/v2/graphs/edge-composition` endpoint to break down the composite edge into its individual steps.

---

## 10. KEY REACT HOOKS

| Hook | Purpose |
|------|---------|
| `useExploreSelectedItem` | Manages currently selected node/edge, fetches data |
| `useFetchEntityInfo` | Fetches node properties from type-specific API endpoint |
| `useExploreParams` | URL parameter state for explore view (selected item, expanded sections) |
| `useGraphItem` | Fetches node or edge data from the graph |
| `useExploreGraph` | Manages graph exploration state |
| `useTagsQuery` | Fetches asset group tags for zone information |
| `useRoleBasedFiltering` | Manages role-based access filtering state |

---

## 11. UI RENDERING PATTERNS

### BasicObjectInfoFields (always shown for all nodes)
1. Zone (from asset group tags)
2. Node Type (with NodeIcon)
3. Tier Zero (boolean)
4. Is Owned Object (boolean)
5. Display Name
6. Object ID
7. Service Principal ID (Azure only, clickable)
8. Node Resource Group ID (Azure only, clickable)
9. Linked Group ID (AD only, clickable)

### ObjectInfoFields (remaining properties)
- Filtered through `exclusionList` to remove internal properties
- Sorted alphabetically
- Formatted based on type (dates, booleans, numbers, arrays)
- Long values truncated with tooltip

### Collapsible Sections
- Each section has a +/- toggle icon
- Shows count badge (loaded via `?counts=true` parameter)
- Expansion state tracked in URL parameters
- Content lazy-loaded (unmountOnExit: true)
- Infinite scrolling table for large result sets

### Hidden Nodes
- When `nodeType === 'HIDDEN'`: "This object's information is not disclosed. Please contact your admin for access."

### Hidden Edges
- When edge is hidden: "This edge's information is not disclosed. Please contact your admin in order to get access."

---

## 12. SUMMARY OF KEY ARCHITECTURAL DECISIONS

1. **Component Library Separation**: All info panel components live in `bh-shared-ui` package, not in the main app. The main app's `GraphItemInformationPanel.tsx` is just a thin wrapper.

2. **Section Configuration via Data**: The `allSections` mapping in `content.ts` defines what sections appear for each node type using declarative configuration (label, queryType, nested sections).

3. **Type-Specific API Endpoints**: Each node type has its own set of REST endpoints. The JS client library maps each to a named method.

4. **Edge Help Texts as React Components**: Each edge type has its own directory under `HelpTexts/` with separate component files for each tab (General, Abuse, OPSEC, References, etc.).

5. **Dynamic Edge Section Resolution**: `EdgeInfoComponents[selectedEdge.name]` dynamically resolves which help text component to render based on the edge type string.

6. **Conditional Content in Abuse Tabs**: Abuse text varies by target type using switch statements on `targetType` (User, Computer, Group, Domain, GPO, OU, etc.).

7. **ACL Inheritance as Special Section**: ACL edges with inheritance get an additional section showing the inheritance chain.

8. **Edge Composition for Complex Paths**: ADCS and NTLM relay edges use the composition endpoint to show the breakdown of the multi-step attack path.

9. **Counts via Query Parameter**: All entity detail endpoints accept `?counts=true` to return relationship counts, used to populate the count badges on collapsed sections.

10. **URL-Driven State**: The explore view tracks expanded panels, selected items, and search state via URL parameters, enabling deep linking and back/forward navigation.
