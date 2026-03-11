import type { EdgeHelpText } from './types';

export const azureStructureEdges: EdgeHelpText[] = [
  {
    kind: 'AZContains',
    category: 'Azure Structure',
    general:
      'The AZContains edge indicates that an Azure resource container (Tenant, Management Group, Subscription, or Resource Group) contains a child resource or nested container. This is the fundamental structural relationship in Azure Resource Manager (ARM) that defines the resource hierarchy. Access control in Azure is inherited downward — a role assignment at a higher scope (e.g., Subscription) automatically applies to all contained resources. Understanding the AZContains hierarchy is critical for mapping the blast radius of any Azure role assignment.',
    abuse:
      'The AZContains relationship itself is informational, but it reveals the scope of inherited permissions. An attacker with a privileged role (Contributor, Owner, User Access Administrator) at a parent scope inherits that access on all contained child resources. For example, Contributor at the Subscription level grants Contributor on every Resource Group and resource within that Subscription. Use az role assignment list --scope /subscriptions/<id> to enumerate effective role assignments.',
    opsec:
      'Azure resource hierarchy changes are logged in the Azure Activity Log. Monitor for subscription and management group modifications using Microsoft Sentinel or Azure Monitor. Role assignments at high scopes should be regularly reviewed using az role assignment list or the Azure Portal IAM blade. Changes to the resource hierarchy (moving subscriptions between management groups) generate Activity Log events.',
    references: [
      {
        title: 'Microsoft - Azure Resource Manager Overview',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview',
      },
      {
        title: 'Microsoft - Azure RBAC Scope',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview',
      },
    ],
  },
  {
    kind: 'AZMemberOf',
    category: 'Azure Structure',
    general:
      'The AZMemberOf edge indicates that a principal (user, service principal, or group) is a member of an Azure AD (Entra ID) security group. Group membership in Azure AD functions similarly to on-premises AD — roles, access policies, and conditional access rules can be assigned to groups, and members inherit those assignments. Azure AD supports dynamic groups (membership based on attribute rules), assigned groups (manual membership), and role-assignable groups (can be assigned Azure AD directory roles). Nested group membership is supported.',
    abuse:
      'Group membership grants inherited access to all resources and roles assigned to the group. An attacker who can add members to a privileged group (via AZAddMembers or group ownership) gains all permissions associated with that group. Role-assignable groups are particularly sensitive because they can hold Azure AD directory roles like Global Administrator. Use az ad group member list --group <id> or Get-AzureADGroupMember to enumerate membership.',
    opsec:
      'Group membership changes are logged in Azure AD Audit Logs under the "Add member to group" and "Remove member from group" activities. Microsoft Sentinel can correlate group membership changes with subsequent privilege usage. Monitor for additions to privileged groups (Global Administrators, Privileged Role Administrators, etc.) and role-assignable groups. Azure AD PIM (Privileged Identity Management) provides just-in-time group membership activation with additional logging.',
    references: [
      {
        title: 'Microsoft - Azure AD Groups',
        url: 'https://learn.microsoft.com/en-us/entra/fundamentals/concept-learn-about-groups',
      },
      {
        title: 'ROADtools - Azure AD Enumeration',
        url: 'https://github.com/dirkjanm/ROADtools',
      },
    ],
  },
  {
    kind: 'AZHasRole',
    category: 'Azure Structure',
    general:
      'The AZHasRole edge indicates that a principal has been assigned an Azure AD (Entra ID) directory role or an Azure RBAC role. Azure AD directory roles (Global Administrator, User Administrator, Application Administrator, etc.) grant permissions within the Azure AD tenant. Azure RBAC roles (Owner, Contributor, Reader, User Access Administrator, etc.) grant permissions on Azure resources. Role assignments can be permanent or eligible (via PIM), and can be scoped to the tenant, management group, subscription, resource group, or individual resource level.',
    abuse:
      'Role assignments are the primary mechanism for access control in Azure. High-privilege roles like Global Administrator, Privileged Role Administrator, Owner, and User Access Administrator enable broad control. An attacker with an eligible PIM role can activate it (possibly requiring MFA or approval). Use az role assignment list to enumerate RBAC roles or Get-AzureADDirectoryRoleMember for directory roles. GraphRunner and ROADtools can enumerate all role assignments across the tenant.',
    opsec:
      'Role assignment changes are logged in Azure AD Audit Logs (for directory roles) and Azure Activity Log (for RBAC roles). PIM role activations are logged under "Add member to role in PIM" with details on the approval chain. Monitor for new assignments to high-privilege roles, especially permanent (non-PIM) assignments. Microsoft Sentinel workbooks for Azure AD provide dashboards for role assignment monitoring.',
    references: [
      {
        title: 'Microsoft - Azure AD Built-in Roles',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      },
      {
        title: 'Microsoft - Azure RBAC Built-in Roles',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
      },
      {
        title: 'GraphRunner - Azure AD Enumeration',
        url: 'https://github.com/dafthack/GraphRunner',
      },
    ],
  },
  {
    kind: 'AZRunsAs',
    category: 'Azure Structure',
    general:
      'The AZRunsAs edge indicates that an Azure resource (such as an App Service, Function App, Logic App, Virtual Machine, or Container Instance) runs with the identity of a specific service principal or managed identity. When a resource "runs as" an identity, any code executing within that resource can obtain tokens for that identity and exercise its permissions. This is a critical relationship because compromising the resource grants access to all permissions assigned to the identity. Managed identities (system-assigned or user-assigned) are the most common form of this relationship.',
    abuse:
      'Compromising a resource that runs as a privileged identity (e.g., a Function App with Contributor on a subscription, or a VM with a managed identity that has Key Vault access) grants the attacker those permissions. From within the resource, tokens can be obtained from the Instance Metadata Service (IMDS) at http://169.254.169.254/metadata/identity/oauth2/token. Use curl from within the VM/App Service to request tokens, or use the Azure SDK which automatically handles managed identity authentication.',
    opsec:
      'Managed identity token requests are logged in Azure AD Sign-in Logs under "Managed Identity". The resource activity using the managed identity token is logged in the Azure Activity Log for the target resource. Monitor for token requests from unexpected IP addresses or for unusual API calls made by managed identities. Microsoft Sentinel can correlate managed identity usage across resources.',
    references: [
      {
        title: 'Microsoft - Managed Identities Overview',
        url: 'https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview',
      },
      {
        title: 'The Hacker Recipes - Azure Managed Identities',
        url: 'https://www.thehacker.recipes/entra-id/movement/managed-identities',
      },
    ],
  },
  {
    kind: 'AZManagedIdentity',
    category: 'Azure Structure',
    general:
      'The AZManagedIdentity edge indicates that an Azure resource has a managed identity (system-assigned or user-assigned) associated with it. Managed identities provide Azure resources with an automatically managed identity in Azure AD, eliminating the need for credential management. System-assigned identities are tied to the lifecycle of the resource; user-assigned identities can be shared across resources. The managed identity can be granted Azure RBAC roles and Azure AD roles, and any code running on the resource can authenticate as this identity.',
    abuse:
      'If the managed identity has been granted privileged roles or permissions, compromising the hosting resource provides access to those permissions. User-assigned managed identities are particularly interesting because they may be shared across multiple resources, creating a wider attack surface. From within the resource, authenticate using the IMDS endpoint or Azure SDK auto-discovery. Use az login --identity from the Azure CLI within the resource to authenticate as the managed identity.',
    opsec:
      'Managed identity creation and role assignment changes are logged in Azure AD Audit Logs and Azure Activity Log. Token requests by managed identities appear in Azure AD Sign-in Logs. Monitor for new managed identities being created on resources, especially user-assigned identities being associated with new resources. Unusual API calls from managed identities (e.g., a web app managed identity accessing Key Vault secrets for the first time) should be investigated.',
    references: [
      {
        title: 'Microsoft - Managed Identity Best Practices',
        url: 'https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identity-best-practice-recommendations',
      },
      {
        title: 'AADInternals - Azure AD Toolkit',
        url: 'https://github.com/Gerenios/AADInternals',
      },
    ],
  },
  {
    kind: 'AZNodeResourceGroup',
    category: 'Azure Structure',
    general:
      'The AZNodeResourceGroup edge indicates that an AKS (Azure Kubernetes Service) cluster is associated with a node resource group. When an AKS cluster is created, Azure automatically creates a secondary resource group (typically named MC_<resourcegroup>_<clustername>_<region>) that contains the infrastructure resources for the cluster nodes (Virtual Machine Scale Sets, Load Balancers, Public IPs, Network Interfaces, etc.). The AKS cluster managed identity typically has Contributor access on this node resource group, enabling it to manage the underlying infrastructure.',
    abuse:
      'If an attacker compromises the AKS cluster (e.g., through a vulnerable pod, exposed Kubernetes API, or RBCD to a node), they may be able to access the managed identity of the cluster or the underlying VM Scale Set. The Contributor role on the node resource group allows modifying VM Scale Sets, which can be leveraged to execute commands on nodes. Additionally, the node resource group may contain resources with misconfigured network security groups or public IP addresses. Use kubectl auth can-i --list and az role assignment list to enumerate permissions.',
    opsec:
      'AKS node resource group activity is logged in the Azure Activity Log for the node resource group subscription. Kubernetes audit logs capture API server activity. Monitor for unexpected kubectl commands, especially those involving secrets, configmaps, or privileged pods. Microsoft Defender for Containers provides runtime threat detection for AKS clusters. Changes to the node resource group infrastructure (VM Scale Set modifications, NSG changes) outside of AKS managed operations should be investigated.',
    references: [
      {
        title: 'Microsoft - AKS Node Resource Group',
        url: 'https://learn.microsoft.com/en-us/azure/aks/faq#why-are-two-resource-groups-created-with-aks',
      },
      {
        title: 'Microsoft - AKS Security Best Practices',
        url: 'https://learn.microsoft.com/en-us/azure/aks/concepts-security',
      },
    ],
  },
];
