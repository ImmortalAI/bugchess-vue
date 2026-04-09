import type { Key } from '@lichess-org/chessground/types';
import type { NormalMove, Role } from 'chessops/types';
import type { BughouseConfig } from '../chess/chess.model';

export type WsMoveData = {
  from: Key;
  to: Key;
  promotion?: NormalMove['promotion'];
};

export type WsDropData = {
  role: Role;
  to: Key;
};

export type WsMateMoveData = {
  fen: string;
  lastMove?: [Key, Key];
};

export type WsMoveMsg = { type: 'move'; data: WsMoveData };
export type WsDropMsg = { type: 'drop'; data: WsDropData };
export type WsSyncMsg = { type: 'sync'; data: BughouseConfig };
export type WsMateMoveMsg = { type: 'mate_move'; data: WsMateMoveData };
export type WsPingMsg = { type: 'ping'; data: Record<string, never> };
export type WsPongMsg = { type: 'pong'; data: Record<string, never> };

export type WsIncomingData = WsMoveMsg | WsDropMsg | WsSyncMsg | WsMateMoveMsg | WsPingMsg;

export type WsOutgoingData = WsMoveMsg | WsDropMsg | WsPongMsg;

export type WsData = WsIncomingData | WsOutgoingData;
