export interface Statute {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'Privacy' | 'Digital Evidence' | 'Surveillance' | 'Forensics' | 'Criminal Procedure';
  jurisdiction: 'Federal' | 'State' | 'International';
}

export const STATUTE_DATABASE: Statute[] = [
  {
    id: "usc-2511",
    code: "18 U.S.C. § 2511",
    title: "Wiretap Act",
    description: "Prohibits the unauthorized interception, disclosure, and use of wire, oral, or electronic communications.",
    category: "Surveillance",
    jurisdiction: "Federal"
  },
  {
    id: "usc-2701",
    code: "18 U.S.C. § 2701",
    title: "Stored Communications Act (SCA)",
    description: "Governs voluntary and compelled disclosure of stored wire and electronic communications and transactional records held by third-party internet service providers.",
    category: "Digital Evidence",
    jurisdiction: "Federal"
  },
  {
    id: "fre-901",
    code: "Fed. R. Evid. 901",
    title: "Authenticating or Identifying Evidence",
    description: "To satisfy the requirement of authenticating or identifying an item of evidence, the proponent must produce evidence sufficient to support a finding that the item is what the proponent claims it is.",
    category: "Forensics",
    jurisdiction: "Federal"
  },
  {
    id: "fre-1002",
    code: "Fed. R. Evid. 1002",
    title: "Requirement of the Original (Best Evidence Rule)",
    description: "An original writing, recording, or photograph is required in order to prove its content unless these rules or a federal statute provides otherwise.",
    category: "Forensics",
    jurisdiction: "Federal"
  },
  {
    id: "usc-1030",
    code: "18 U.S.C. § 1030",
    title: "Computer Fraud and Abuse Act (CFAA)",
    description: "Prohibits accessing a computer without authorization, or exceeding authorized access.",
    category: "Digital Evidence",
    jurisdiction: "Federal"
  },
  {
    id: "cal-pc-632",
    code: "Cal. Pen. Code § 632",
    title: "California Invasion of Privacy Act",
    description: "Criminalizes the recording of confidential communications without the consent of all parties.",
    category: "Privacy",
    jurisdiction: "State"
  },
  {
    id: "ny-pl-250.05",
    code: "N.Y. Pen. Law § 250.05",
    title: "Eavesdropping",
    description: "A person is guilty of eavesdropping when he unlawfully engages in wiretapping, mechanical overhearing of a conversation, or intercepting or accessing of an electronic communication.",
    category: "Surveillance",
    jurisdiction: "State"
  },
  {
    id: "gdpr-art-6",
    code: "GDPR Art. 6",
    title: "Lawfulness of Processing",
    description: "Defines the conditions under which the processing of personal data is considered lawful in the EU.",
    category: "Privacy",
    jurisdiction: "International"
  },
  {
    id: "usc-3501",
    code: "18 U.S.C. § 3501",
    title: "Admissibility of Confessions",
    description: "Determines the admissibility of a confession based on whether it was given voluntarily.",
    category: "Criminal Procedure",
    jurisdiction: "Federal"
  },
  {
    id: "frcp-41",
    code: "Fed. R. Crim. P. 41",
    title: "Search and Seizure",
    description: "Outlines the procedures for issuing and executing a search warrant, including software and digital media.",
    category: "Criminal Procedure",
    jurisdiction: "Federal"
  },
  {
     id: "usc-3121",
     code: "18 U.S.C. § 3121",
     title: "Pen Register and Trap and Trace Statute",
     description: "Restricts the installation or use of a pen register or a trap and trace device without a court order.",
     category: "Surveillance",
     jurisdiction: "Federal"
  }
];
