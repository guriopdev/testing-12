export type Room = {
  id: string;
  name: string;
  topic: string;
  participants: number;
  maxParticipants: number;
};

export const mockRooms: Room[] = [
  { id: '1', name: 'Quantum Physics', topic: 'Discussing Chapter 5', participants: 3, maxParticipants: 10 },
  { id: '2', name: 'Calculus II Problems', topic: 'Practice Exam Prep', participants: 5, maxParticipants: 8 },
  { id: '3', name: 'Organic Chemistry', topic: 'Alkene Reactions', participants: 8, maxParticipants: 12 },
  { id: '4', name: 'Data Structures & Algos', topic: 'Whiteboard Session', participants: 2, maxParticipants: 5 },
  { id: '5', name: 'History of Ancient Rome', topic: 'The Punic Wars', participants: 6, maxParticipants: 15 },
  { id: '6', name: 'Creative Writing Workshop', topic: 'Peer Reviews', participants: 4, maxParticipants: 6 },
];

export type Participant = {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isCameraOff: boolean;
};

export const mockParticipants: Participant[] = [
  { id: '1', name: 'You', avatar: 'user1', isMuted: true, isCameraOff: false },
  { id: '2', name: 'Alice', avatar: 'user2', isMuted: false, isCameraOff: false },
  { id: '3', name: 'Bob', avatar: 'user3', isMuted: true, isCameraOff: true },
  { id: '4', name: 'Charlie', avatar: 'user4', isMuted: false, isCameraOff: false },
  { id: '5', name: 'Diana', avatar: 'user5', isMuted: false, isCameraOff: false },
];
