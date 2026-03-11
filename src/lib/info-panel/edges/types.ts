export interface EdgeHelpText {
  kind: string;
  category: string;
  general: string;
  windowsAbuse?: string;
  linuxAbuse?: string;
  abuse?: string;
  opsec: string;
  references: { title: string; url: string }[];
}
