export type QuickGameOption = {
  name: string;
  time: string;
};

export const quickGameOptions: QuickGameOption[] = [
  { name: 'chessTimeOptions.bullet', time: '1+0' },
  { name: 'chessTimeOptions.bullet', time: '2+1' },
  { name: 'chessTimeOptions.blitz', time: '3+0' },
  { name: 'chessTimeOptions.blitz', time: '3+2' },
  { name: 'chessTimeOptions.blitz', time: '5+0' },
  { name: 'chessTimeOptions.blitz', time: '5+3' },
  { name: 'chessTimeOptions.rapid', time: '10+0' },
  { name: 'chessTimeOptions.rapid', time: '10+5' },
  { name: 'chessTimeOptions.rapid', time: '15+10' },
  { name: 'chessTimeOptions.classical', time: '30+0' },
  { name: 'chessTimeOptions.classical', time: '30+20' },
  { name: 'chessTimeOptions.yourGame', time: '' },
];
