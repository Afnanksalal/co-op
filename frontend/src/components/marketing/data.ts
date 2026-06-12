import {
  CloudCheck,
  Cpu,
  FlowArrow,
  HardDrives,
} from '@phosphor-icons/react';

export const navLinks = [
  ['Product', '#product'],
  ['How it works', '#workflow'],
  ['Security', '#security'],
  ['Legal', '/privacy'],
];

export const pillars = [
  {
    icon: HardDrives,
    title: 'Company context in one place',
    copy: 'Keep files, notes, decisions, plans, and customer work together on the installed computer.',
  },
  {
    icon: Cpu,
    title: 'Assistant settings stay under your control',
    copy: 'Use a local assistant, or connect a private provider key when the business is ready for it.',
  },
  {
    icon: FlowArrow,
    title: 'Work with a record',
    copy: 'Create plans, review research, draft outreach, and keep a history of the work that was done.',
  },
  {
    icon: CloudCheck,
    title: 'Cloud account, local work',
    copy: 'The web account handles access, downloads, licenses, and device activation. The desktop app handles company work.',
  },
];

export const workflow = [
  ['Sign in on the web', 'Manage access, downloads, billing, and activation keys from the account center.'],
  ['Install the app', 'Run the company workspace from the desktop, where local files and history are stored.'],
  ['Choose assistant settings', 'Use a local assistant or connect a private provider key from the settings page.'],
  ['Work with review', 'Plans, research, outreach, and finance checks keep a visible record for the owner.'],
];

export const trustItems = [
  'Business files and private memory stay on the computer by default',
  'Private provider keys are stored in the desktop app, not the account center',
  'License keys and activation tokens are not shown back as raw secrets',
  'The cloud service is used for account and license checks',
  'Sensitive work can require review before the owner acts on it',
  'Local history keeps decisions and outputs traceable',
];

export const faqs = [
  {
    q: 'Where does company work happen?',
    a: 'In the desktop app. The cloud account manages identity, downloads, license access, activation, and license status checks.',
  },
  {
    q: 'Does the owner need to manage technical infrastructure?',
    a: 'No. The normal choices are simple: use the local assistant setup, or connect a private provider key from settings.',
  },
  {
    q: 'Can we use our own provider key?',
    a: 'Yes. Co-Op supports private provider keys while keeping those credentials local to the desktop app.',
  },
  {
    q: 'What does the cloud service store?',
    a: 'The cloud service stores account and license records. Company files, assistant settings, and work history are owned by the desktop app.',
  },
];

export const footerLinks = [
  ['Download', '/download'],
  ['Account', '/account'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Security', '/security'],
  ['Cookies', '/cookies'],
];
