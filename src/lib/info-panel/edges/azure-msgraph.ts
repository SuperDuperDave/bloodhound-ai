import type { EdgeHelpText } from './types';

export const azureMsgraphEdges: EdgeHelpText[] = [
  {
    kind: 'AZMGAddMember',
    category: 'Azure MS Graph',
    general:
      'The AZMGAddMember edge indicates that a service principal has the ability to add members to Azure AD groups via MS Graph API permissions. This is typically granted through the GroupMember.ReadWrite.All or Directory.ReadWrite.All application permission. When a service principal can add group members, it can grant access to any resource or role that uses group-based assignment. If role-assignable groups exist that hold directory roles like Global Administrator, this becomes a direct privilege escalation path to tenant control.',
    abuse:
      'Add a controlled user or service principal to a target group using the MS Graph API: POST /groups/{groupId}/members/$ref with the directory object reference. Use GraphRunner (Invoke-AddGroupMember) or direct API calls with curl. If the target group has Azure RBAC roles, Azure AD directory roles, or application role assignments, the added member inherits all those permissions immediately.',
    opsec:
      'Group member additions are logged in Azure AD Audit Logs as "Add member to group" with the service principal as the actor. Microsoft Sentinel can correlate service principal group modifications with subsequent privilege usage. Monitor for service principals adding members to privileged or role-assignable groups. Review which service principals have GroupMember.ReadWrite.All or Directory.ReadWrite.All permissions.',
    references: [
      {
        title: 'Microsoft - MS Graph Add Group Member',
        url: 'https://learn.microsoft.com/en-us/graph/api/group-post-members',
      },
      {
        title: 'SpecterOps - Azure AD Application Permissions',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGAddOwner',
    category: 'Azure MS Graph',
    general:
      'The AZMGAddOwner edge indicates that a service principal can add owners to Azure AD applications, service principals, or groups via MS Graph API. This is typically granted through Application.ReadWrite.All, Directory.ReadWrite.All, or specific owner management permissions. Adding an owner to an application or service principal grants the new owner the ability to add credentials, modify permissions, and fully control that identity. This creates a persistent escalation path because owners can add more owners.',
    abuse:
      'Add a controlled principal as owner of a target application: POST /applications/{appId}/owners/$ref. Once owner, add credentials to the application (POST /applications/{appId}/addPassword) and authenticate as it. If the application has privileged API permissions, this escalates access. The chain: add owner -> add secret -> authenticate as app -> use app permissions.',
    opsec:
      'Owner additions generate "Add owner to application" or "Add owner to service principal" events in Azure AD Audit Logs. Monitor for service principals adding themselves or their operators as owners of high-privilege applications. Review applications that have had new owners added recently, especially if those applications hold Directory.ReadWrite.All, RoleManagement.ReadWrite.Directory, or similar permissions.',
    references: [
      {
        title: 'Microsoft - MS Graph Add Application Owner',
        url: 'https://learn.microsoft.com/en-us/graph/api/application-post-owners',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGAddSecret',
    category: 'Azure MS Graph',
    general:
      'The AZMGAddSecret edge indicates that a service principal can add client secrets or certificate credentials to Azure AD applications via MS Graph API. This is granted through Application.ReadWrite.All or Directory.ReadWrite.All application permissions. Adding a secret to an application allows the attacker to authenticate as that application service principal using the client credentials flow, inheriting all of the application API permissions and role assignments.',
    abuse:
      'Add a secret to a target application: POST /applications/{appObjectId}/addPassword. The response contains the secret value (only shown once). Then authenticate: POST /oauth2/v2.0/token with grant_type=client_credentials, client_id=<AppId>, client_secret=<secret>. The resulting token has all permissions assigned to the application. Use GraphRunner (Invoke-AddApplicationSecret) for automated exploitation.',
    opsec:
      'Credential additions generate "Update application - Certificates and secrets management" in Azure AD Audit Logs. Microsoft Defender for Cloud Apps and Microsoft Sentinel detect mass credential additions or additions to high-privilege applications. Monitor for Application.ReadWrite.All being granted to service principals, as this is the enabling permission for this attack. Implement application credential monitoring via Azure AD workbooks.',
    references: [
      {
        title: 'Microsoft - MS Graph Add Application Password',
        url: 'https://learn.microsoft.com/en-us/graph/api/application-addpassword',
      },
      {
        title: 'SpecterOps - Azure Application Abuse',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGGrantAppRoles',
    category: 'Azure MS Graph',
    general:
      'The AZMGGrantAppRoles edge indicates that a service principal can grant MS Graph application role assignments (app roles) to other service principals. This is typically enabled by the AppRoleAssignment.ReadWrite.All permission. This is one of the most dangerous MS Graph permissions because it allows granting any app role — including Directory.ReadWrite.All, RoleManagement.ReadWrite.Directory, and Mail.ReadWrite — to any service principal in the tenant, enabling cascading privilege escalation.',
    abuse:
      'Grant a high-privilege app role to a controlled service principal: POST /servicePrincipals/{spId}/appRoleAssignments with the target app role ID and the MS Graph service principal as the resource. Common escalation targets: Directory.ReadWrite.All (manage all directory objects), RoleManagement.ReadWrite.Directory (manage role assignments), Mail.ReadWrite (read all mail), Sites.ReadWrite.All (access all SharePoint). After granting, the service principal can exercise these permissions immediately.',
    opsec:
      'App role assignments generate "Add app role assignment to service principal" events in Azure AD Audit Logs. Microsoft Sentinel detects bulk app role assignments and assignments of high-privilege roles. Monitor for AppRoleAssignment.ReadWrite.All being granted to applications, and for subsequent app role grants by those applications. This permission should be restricted to a minimal set of trusted applications.',
    references: [
      {
        title: 'Microsoft - MS Graph App Role Assignments',
        url: 'https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-approleassignments',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation via API Permissions',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGGrantRole',
    category: 'Azure MS Graph',
    general:
      'The AZMGGrantRole edge indicates that a service principal can assign Azure AD directory roles to principals via the MS Graph API. This is enabled by the RoleManagement.ReadWrite.Directory application permission. This permission allows assigning any directory role — including Global Administrator — to any user, group, or service principal. This is effectively tenant compromise because the service principal can promote any controlled identity to Global Administrator.',
    abuse:
      'Assign Global Administrator to a controlled principal: POST /roleManagement/directory/roleAssignments with the Global Administrator role definition ID (62e90394-69f5-4237-9190-012177145e10) and the target principal ID. After assignment, the principal has full tenant control. Use GraphRunner or direct MS Graph API calls. The Global Administrator can then elevate to manage all Azure subscriptions.',
    opsec:
      'Role assignments generate "Add member to role" events in Azure AD Audit Logs. Microsoft Sentinel has built-in detection for new Global Administrator assignments, especially by service principals. Monitor for RoleManagement.ReadWrite.Directory being granted to applications, as this is the prerequisite. PIM does not prevent programmatic role assignments made through MS Graph with this permission — the assignment is direct, not through PIM.',
    references: [
      {
        title: 'Microsoft - MS Graph Role Assignments',
        url: 'https://learn.microsoft.com/en-us/graph/api/rbacapplication-post-roleassignments',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGAppRoleAssignment_ReadWrite_All',
    category: 'Azure MS Graph',
    general:
      'The AZMGAppRoleAssignment_ReadWrite_All edge indicates that a service principal has the AppRoleAssignment.ReadWrite.All MS Graph application permission. This permission allows the service principal to manage app role assignments for any application in the tenant, including granting app roles to itself (self-escalation). This is the key enabler for the AZMGGrantAppRoles and AZGrantSelf attack paths. With this single permission, a service principal can grant itself any other MS Graph permission, making it one of the most dangerous permissions to assign.',
    abuse:
      'Self-escalation: Grant Directory.ReadWrite.All to yourself by POSTing to /servicePrincipals/{selfSpId}/appRoleAssignments with resourceId set to the MS Graph service principal ID and appRoleId set to the Directory.ReadWrite.All role ID. Repeat for any other desired permission. After self-escalation, the service principal has full MS Graph access. This is a single-step escalation from one permission to complete API control.',
    opsec:
      'App role self-assignments generate "Add app role assignment to service principal" events where the actor and target are the same service principal. This pattern is a strong indicator of compromise. Microsoft Sentinel detects self-escalation patterns. Audit all service principals with AppRoleAssignment.ReadWrite.All — this permission should be restricted to a very small number of trusted automation accounts.',
    references: [
      {
        title: 'Microsoft - AppRoleAssignment.ReadWrite.All',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference#approleassignmentreadwriteall',
      },
      {
        title: 'SpecterOps - Azure API Permissions Abuse',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGApplication_ReadWrite_All',
    category: 'Azure MS Graph',
    general:
      'The AZMGApplication_ReadWrite_All edge indicates that a service principal has the Application.ReadWrite.All MS Graph application permission. This permission allows the service principal to manage all application registrations and service principals in the tenant — including adding credentials (secrets/certificates), modifying permissions, changing redirect URIs, and managing owners. This enables taking over any application in the tenant by adding credentials, then authenticating as that application to use its permissions.',
    abuse:
      'Add a secret to any application: POST /applications/{appObjectId}/addPassword. Then authenticate as that application using client credentials. Target applications with high-privilege permissions (Directory.ReadWrite.All, Mail.ReadWrite, etc.) for maximum impact. This permission also allows modifying the required resource access (API permissions) on applications, though admin consent is still required for the new permissions to take effect.',
    opsec:
      'Credential additions generate audit events. Monitor for service principals with Application.ReadWrite.All adding credentials to applications they do not own or manage. Microsoft Sentinel detects credential additions to high-privilege applications. Regular review of which service principals have this permission is essential — it should be restricted to trusted CI/CD and provisioning systems only.',
    references: [
      {
        title: 'Microsoft - Application.ReadWrite.All',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference#applicationreadwriteall',
      },
      {
        title: 'SpecterOps - Azure Application Abuse',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGDirectory_ReadWrite_All',
    category: 'Azure MS Graph',
    general:
      'The AZMGDirectory_ReadWrite_All edge indicates that a service principal has the Directory.ReadWrite.All MS Graph application permission. This is one of the broadest permissions in MS Graph — it grants read and write access to all directory data including users, groups, applications, service principals, devices, and organization settings. With this permission, a service principal can modify user attributes, add group members, reset passwords (for non-admin users), manage application credentials, and modify directory settings.',
    abuse:
      'This permission enables multiple attack paths: (1) Add members to privileged groups: POST /groups/{groupId}/members/$ref. (2) Add credentials to applications: POST /applications/{appId}/addPassword. (3) Modify user attributes for ESC9/ESC10-style attacks in hybrid environments. (4) Create new users and service principals. (5) Add owners to applications and groups. The broad scope of this permission makes it a "Swiss army knife" for Azure AD abuse.',
    opsec:
      'All directory modifications by the service principal are logged in Azure AD Audit Logs. Microsoft Sentinel can correlate the wide range of activities possible with this permission. Monitor for service principals with Directory.ReadWrite.All performing unusual operations (group membership changes, credential additions, user modifications). This permission should be minimized — prefer specific permissions (User.ReadWrite.All, GroupMember.ReadWrite.All) when possible.',
    references: [
      {
        title: 'Microsoft - Directory.ReadWrite.All',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference#directoryreadwriteall',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGGroupMember_ReadWrite_All',
    category: 'Azure MS Graph',
    general:
      'The AZMGGroupMember_ReadWrite_All edge indicates that a service principal has the GroupMember.ReadWrite.All MS Graph application permission. This permission allows the service principal to add and remove members from any group in the tenant (except role-assignable groups, which require additional permissions). If security groups are used for Azure RBAC assignments, conditional access exclusions, or application access, modifying group membership provides indirect access to those resources.',
    abuse:
      'Add a controlled principal to target groups: POST /groups/{groupId}/members/$ref. Priority targets include: groups assigned Azure RBAC roles (Contributor, Owner), groups excluded from conditional access policies (bypass MFA), groups assigned to applications (gain app access), and groups with on-premises AD sync (hybrid privilege escalation). Use az ad group member add or the MS Graph API directly.',
    opsec:
      'Group membership changes are logged as "Add member to group" in Azure AD Audit Logs. Monitor for service principals adding members to sensitive groups. Microsoft Sentinel analytics rules can detect unusual group modification patterns. Note that role-assignable groups require Directory.ReadWrite.All or RoleManagement.ReadWrite.Directory in addition to GroupMember.ReadWrite.All.',
    references: [
      {
        title: 'Microsoft - GroupMember.ReadWrite.All',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference#groupmemberreadwriteall',
      },
      {
        title: 'Microsoft - Manage Group Members via Graph',
        url: 'https://learn.microsoft.com/en-us/graph/api/group-post-members',
      },
    ],
  },
  {
    kind: 'AZMGGroup_ReadWrite_All',
    category: 'Azure MS Graph',
    general:
      'The AZMGGroup_ReadWrite_All edge indicates that a service principal has the Group.ReadWrite.All MS Graph application permission. This permission includes all capabilities of GroupMember.ReadWrite.All (add/remove members) plus the ability to create, update, and delete groups, manage group owners, and manage group settings. The ability to create new groups and add them to role assignments or modify existing group properties provides additional attack surface beyond simple membership manipulation.',
    abuse:
      'In addition to member manipulation (same as GroupMember.ReadWrite.All), this permission allows: (1) Creating new security groups and adding them to RBAC assignments. (2) Modifying group properties (display name, description, mail-enabled). (3) Adding owners to groups (who can then add members). (4) Deleting groups (disruptive). Target groups used for access control, conditional access, and RBAC assignments.',
    opsec:
      'Group creation, modification, and deletion are all logged in Azure AD Audit Logs. Monitor for service principals creating new groups or modifying group properties. Group deletion can be destructive — enable soft-delete for groups. Microsoft Sentinel detects anomalous group management activities.',
    references: [
      {
        title: 'Microsoft - Group.ReadWrite.All',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference#groupreadwriteall',
      },
      {
        title: 'Microsoft - MS Graph Group Operations',
        url: 'https://learn.microsoft.com/en-us/graph/api/resources/group',
      },
    ],
  },
  {
    kind: 'AZMGRoleManagement_ReadWrite_Directory',
    category: 'Azure MS Graph',
    general:
      'The AZMGRoleManagement_ReadWrite_Directory edge indicates that a service principal has the RoleManagement.ReadWrite.Directory MS Graph application permission. This permission allows managing Azure AD directory role assignments — the service principal can assign any directory role (including Global Administrator) to any user, group, or service principal. This is one of the most critical permissions because it enables direct escalation to Global Administrator, which provides full tenant control.',
    abuse:
      'Assign Global Administrator to a controlled principal: POST /roleManagement/directory/roleAssignments with roleDefinitionId = "62e90394-69f5-4237-9190-012177145e10" (Global Administrator template ID) and principalId = controlled user/SP. This is a direct one-step escalation to full tenant control. After gaining Global Administrator, use the elevateAccess API to gain control of all Azure subscriptions. Use GraphRunner for automated role assignment.',
    opsec:
      'Role assignments generate "Add member to role" events in Azure AD Audit Logs. Microsoft Sentinel has high-fidelity detection rules for Global Administrator assignment, especially by service principals. This permission should be restricted to the absolute minimum number of service principals. Monitor for any role assignment activity by service principals with this permission. Consider using PIM for service principals where possible.',
    references: [
      {
        title: 'Microsoft - RoleManagement.ReadWrite.Directory',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference#rolemanagementreadwritedirectory',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation via API Permissions',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZMGServicePrincipalEndpoint_ReadWrite_All',
    category: 'Azure MS Graph',
    general:
      'The AZMGServicePrincipalEndpoint_ReadWrite_All edge indicates that a service principal has the ServicePrincipalEndpoint.ReadWrite.All MS Graph application permission. This permission allows managing endpoints associated with service principals. While less commonly discussed than other MS Graph permissions, endpoint management can be leveraged to modify authentication-related endpoints, potentially enabling token interception or redirect attacks. The practical impact depends on how the service principal endpoints are used in the environment.',
    abuse:
      'This permission allows modifying service principal endpoints, which could be used to redirect authentication flows or modify reply URLs for OAuth abuse. While direct exploitation is more limited than permissions like Application.ReadWrite.All, it can be used in conjunction with other permissions for more sophisticated attacks. The primary risk is modifying endpoints on service principals used for SSO or federation.',
    opsec:
      'Service principal endpoint modifications are logged in Azure AD Audit Logs under service principal update events. Monitor for unexpected endpoint changes on critical service principals, especially those used for SSO, federation, or multi-tenant applications. Changes to replyUrls, identifierUris, and other endpoint-related properties should be tracked.',
    references: [
      {
        title: 'Microsoft - ServicePrincipalEndpoint.ReadWrite.All',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference',
      },
      {
        title: 'Microsoft - Service Principal Endpoints',
        url: 'https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal',
      },
    ],
  },
];
