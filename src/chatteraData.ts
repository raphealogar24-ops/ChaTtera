export interface ChatteraSeedContact {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  online: boolean;
  timeLabel: string;
  initialMessage: string;
  unreadCount: number;
  statusStoryText: string;
  statusTimeAgo: string;
  statusBgGradient: string;
  phoneDisplay: string;
  keyFingerprint: string;
}

export interface CallLogEntry {
  id: string;
  contactName: string;
  contactHandle: string;
  avatarUrl: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration: string;
  encrypted: boolean;
}

export interface WalletTransaction {
  id: string;
  title: string;
  counterparty: string;
  amountNaira: number;
  type: 'credit' | 'debit';
  timestamp: string;
  reference: string;
}

export const SEED_CONTACTS: ChatteraSeedContact[] = [
  {
    id: 'contact_amara',
    name: 'Amara',
    handle: 'amara_okafor',
    avatarUrl: 'https://i.pravatar.cc/100?img=47',
    online: true,
    timeLabel: '2:45 PM',
    initialMessage: 'Hey, how are you doing today?',
    unreadCount: 2,
    statusStoryText: 'Shipping the new Chattera E2EE release today 🚀🔒',
    statusTimeAgo: '18 mins ago',
    statusBgGradient: 'linear-gradient(135deg, #5b4bdb 0%, #3b28a8 100%)',
    phoneDisplay: '+234 803 419 8821',
    keyFingerprint: 'A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8',
  },
  {
    id: 'contact_daniel',
    name: 'Daniel',
    handle: 'daniel_adeyemi',
    avatarUrl: 'https://i.pravatar.cc/100?img=12',
    online: false,
    timeLabel: '1:20 PM',
    initialMessage: 'The meeting has been moved to tomorrow.',
    unreadCount: 0,
    statusStoryText: 'Design review in 30 minutes — coffee first ☕',
    statusTimeAgo: '1 hour ago',
    statusBgGradient: 'linear-gradient(135deg, #00b894 0%, #0984e3 100%)',
    phoneDisplay: '+234 809 221 5402',
    keyFingerprint: 'B8E1:44D2:9C0F:33A1:77E4:12B9:60C3:88F1',
  },
  {
    id: 'contact_sophia',
    name: 'Sophia',
    handle: 'sophia_mensah',
    avatarUrl: 'https://i.pravatar.cc/100?img=32',
    online: true,
    timeLabel: '12:48 PM',
    initialMessage: '📷 Photo',
    unreadCount: 5,
    statusStoryText: 'Golden hour views from Victoria Island 🌅✨',
    statusTimeAgo: '2 hours ago',
    statusBgGradient: 'linear-gradient(135deg, #e17055 0%, #6c5ce7 100%)',
    phoneDisplay: '+234 812 908 3310',
    keyFingerprint: 'C2D7:89A3:51E6:04B2:99F0:38C1:72D5:41A9',
  },
  {
    id: 'contact_devs',
    name: 'Chattera Developers',
    handle: 'chattera_devs',
    avatarUrl: 'https://i.pravatar.cc/100?img=15',
    online: true,
    timeLabel: 'Yesterday',
    initialMessage: 'Michael: The new update is ready.',
    unreadCount: 8,
    statusStoryText: 'ECDH P-256 + AES-256-GCM zero-trust audit passed ✅',
    statusTimeAgo: '3 hours ago',
    statusBgGradient: 'linear-gradient(135deg, #2d3436 0%, #5b4bdb 100%)',
    phoneDisplay: 'Encrypted Group Channel',
    keyFingerprint: 'D9A4:62C8:17F3:80E5:43B1:29D7:64A0:95E2',
  },
  {
    id: 'contact_grace',
    name: 'Grace',
    handle: 'grace_nwosu',
    avatarUrl: 'https://i.pravatar.cc/100?img=25',
    online: false,
    timeLabel: 'Yesterday',
    initialMessage: 'Thank you 😊',
    unreadCount: 0,
    statusStoryText: 'Grateful for a productive week 💜',
    statusTimeAgo: '5 hours ago',
    statusBgGradient: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    phoneDisplay: '+234 706 554 1920',
    keyFingerprint: 'F1C5:30B8:74D9:22E1:86A4:53C0:19F7:68B3',
  },
];

export const INITIAL_CALL_LOGS: CallLogEntry[] = [
  {
    id: 'call_1',
    contactName: 'Amara',
    contactHandle: 'amara_okafor',
    avatarUrl: 'https://i.pravatar.cc/100?img=47',
    type: 'video',
    direction: 'incoming',
    timestamp: 'Today, 2:15 PM',
    duration: '14m 22s',
    encrypted: true,
  },
  {
    id: 'call_2',
    contactName: 'Daniel',
    contactHandle: 'daniel_adeyemi',
    avatarUrl: 'https://i.pravatar.cc/100?img=12',
    type: 'audio',
    direction: 'outgoing',
    timestamp: 'Today, 11:40 AM',
    duration: '06m 10s',
    encrypted: true,
  },
  {
    id: 'call_3',
    contactName: 'Sophia',
    contactHandle: 'sophia_mensah',
    avatarUrl: 'https://i.pravatar.cc/100?img=32',
    type: 'audio',
    direction: 'missed',
    timestamp: 'Yesterday, 6:05 PM',
    duration: 'Missed Call',
    encrypted: true,
  },
  {
    id: 'call_4',
    contactName: 'Grace',
    contactHandle: 'grace_nwosu',
    avatarUrl: 'https://i.pravatar.cc/100?img=25',
    type: 'video',
    direction: 'outgoing',
    timestamp: 'Yesterday, 3:30 PM',
    duration: '21m 08s',
    encrypted: true,
  },
];

export const INITIAL_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx_101',
    title: 'Received from Amara',
    counterparty: '@amara_okafor',
    amountNaira: 45000,
    type: 'credit',
    timestamp: 'Today, 1:50 PM',
    reference: 'CHT-E2EE-90821',
  },
  {
    id: 'tx_102',
    title: 'Transfer to Daniel',
    counterparty: '@daniel_adeyemi',
    amountNaira: 12500,
    type: 'debit',
    timestamp: 'Yesterday, 4:15 PM',
    reference: 'CHT-E2EE-88410',
  },
  {
    id: 'tx_103',
    title: 'Wallet Top-Up',
    counterparty: 'Instant Bank Deposit',
    amountNaira: 150000,
    type: 'credit',
    timestamp: 'Sep 24, 10:12 AM',
    reference: 'CHT-TOPUP-77219',
  },
];
