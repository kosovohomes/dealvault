import crypto from 'node:crypto';
import { NDA_VERSION, PLATFORM_NAME, COMPANY_LEGAL } from './config.js';

/*
 * The platform-level confidentiality agreement. Signed once per investor,
 * before any access request can be approved. Changing the text changes the
 * hash; existing signatures stay bound to the version they signed, so bump
 * NDA_VERSION when the substance changes.
 */

export const agreement = {
  version: NDA_VERSION,
  title: 'DealVault Investor Confidentiality & Access Agreement',
  effective: '2026-10-28',
  preamble: `This agreement is made between ${COMPANY_LEGAL} ("the Platform", operator of ${PLATFORM_NAME}) and the individual or entity granted access to confidential project materials made available through the platform ("the Recipient"). By signing electronically, the Recipient accepts the terms below.`,
  clauses: [
    {
      id: 'definition',
      heading: '1. Confidential Information',
      text: `Confidential Information means all non-public information disclosed through ${PLATFORM_NAME}, including project memoranda, market studies, unit economics, financial models, plans, risk registers, indicative terms, capitalisation tables, product information, and any notes, extracts or derivative materials, across any project listed on the platform. Information that is public at the time of disclosure, or that becomes public without breach, is excluded.`,
    },
    {
      id: 'obligations',
      heading: '2. Obligations of the Recipient',
      text: `The Recipient will keep Confidential Information strictly confidential; use it solely to evaluate a possible investment in the relevant project; not disclose it to any person other than the Recipient's professional advisers who are bound by equivalent duties and have a need to know; and protect it with at least reasonable care. The Recipient will be responsible for any breach by those advisers. Access granted to one project conveys no rights over the materials of any other project.`,
    },
    {
      id: 'no-solicitation',
      heading: '3. No solicitation or competitive use',
      text: `The Recipient will not use Confidential Information to compete with any project or the Platform, to solicit their partners, customers or employees, or to reverse engineer their products or commercial models. This restriction does not prevent the Recipient from making an investment decision, including a decision not to invest.`,
    },
    {
      id: 'no-offer',
      heading: '4. No offer, no advice',
      text: `All materials are provided for discussion only. They do not constitute an offer to sell securities, a solicitation of an offer to buy, or investment, legal or tax advice. Any investment will be made solely under definitive documents agreed with the relevant project. Financial figures are illustrative planning cases, not forecasts or guarantees.`,
    },
    {
      id: 'monitoring',
      heading: '5. Monitoring and audit',
      text: `The Recipient acknowledges that access is monitored. The Platform records account activity, projects viewed, interest expressed, agreements signed, documents opened, reading time and section depth, downloads, prints, and the device and network metadata associated with each access. These records are used to understand investor interest, protect Confidential Information, evidence compliance, and improve the platform. Records may be disclosed to project owners and their advisers, or as required by law.`,
    },
    {
      id: 'term',
      heading: '6. Term, return and destruction',
      text: `These obligations apply for three years from the date of signature, or longer where the law requires. On written request, or on the Recipient deciding not to proceed, the Recipient will delete or destroy Confidential Information in its possession, except one copy retained for legal or regulatory purposes, and confirm compliance on request. The Platform may revoke access at any time.`,
    },
    {
      id: 'electronic',
      heading: '7. Electronic signature',
      text: `The Recipient agrees to transact electronically. A typed signature, together with the recorded name, email, timestamp, agreement version and a cryptographic hash of this text, constitutes an electronic signature with the same effect as a handwritten signature. A signed access record is available in the account area.`,
    },
    {
      id: 'law',
      heading: '8. Governing law',
      text: `This agreement is governed by the laws of the Hashemite Kingdom of Jordan. Disputes are subject to the exclusive jurisdiction of the courts of Amman. If any provision is unenforceable, the remaining provisions continue in effect.`,
    },
  ],
};

export const agreementText = [
  agreement.title,
  `Version ${agreement.version} · Effective ${agreement.effective}`,
  agreement.preamble,
  ...agreement.clauses.map((clause) => `${clause.heading}\n${clause.text}`),
].join('\n\n');

export const agreementHash = crypto.createHash('sha256').update(agreementText).digest('hex');

export const consentItems = [
  {
    id: 'nda',
    label: `I have read and accept the ${PLATFORM_NAME} Investor Confidentiality & Access Agreement.`,
  },
  {
    id: 'monitoring',
    label: 'I understand that my activity on the platform — including document views, downloads and prints — is recorded and auditable.',
  },
  {
    id: 'noOffer',
    label: 'I understand that materials on the platform are not an offer of securities and that figures are illustrative.',
  },
  {
    id: 'data',
    label: 'I consent to my contact details being processed for the purpose of investment evaluation, shared only with the owners of projects I access.',
  },
  {
    id: 'electronic',
    label: 'I agree to use an electronic signature and to receive documents electronically.',
  },
];
