import type { Key } from '@lichess-org/chessground/types';
import type { Color, Role } from 'chessops/types';
import type { BughouseConfig } from '../chess/chess.model';

/** Numeric message type IDs — kept in sync with server. */
export const WsMsgType = {
  // BASE CLIENT
  PING: 0,

  // BASE SERVER
  PONG: 20,

  // LOBBY CLIENT
  LOBBY_CREATE: 40,
  LOBBY_LEAVE: 41,
  LOBBY_KICK: 42,
  INVITE_SEND: 43,
  INVITE_ACCEPT: 44,
  INVITE_REJECT: 45,
  LOBBY_CONFIG: 46,
  START_MM: 48,
  CANCEL_MM: 49,

  // LOBBY SERVER
  LOBBY_JOIN: 60,
  LOBBY_KICKED: 61,
  INVITE_RECEIVE: 62,
  LOBBY_CONFIG_UPDATE: 63,
  LOBBY_START_MM: 65,
  LOBBY_CANCEL_MM: 66,

  // GAME CLIENT
  GAME_MOVE: 80,
  GAME_REQ_SYNC: 82,
  GAME_CHAT_MSG_SEND: 83,

  // GAME SERVER
  GAME_JOIN: 100,
  GAME_SYNC: 101,
  GAME_OPPONENT_MOVE: 102,
  GAME_MATE_BOARD_UPDATE: 104,
  GAME_CHAT_MSG_RECEIVE: 105,

  // ETC
  ERROR: 999,
} as const;

// *** PAYLOAD TYPES ***

/** UCI-encoded move string.
 *  Regular move: `"e2e4"` — Drop: `"P@e4"` */
export type WsMoveUciData = string;

/** Pocket change caused by a capture on the main board.
 *  The captured piece is transferred to the partner's pocket on that color. */
export type WsPocketDiff = {
  /** role — piece type that was captured */
  r: Role;
  /** color — side whose pocket receives the piece */
  c: Color;
};

/** Pocket change on the mate (partner's) board caused by a drop there. */
export type WsMatePocketDiff = {
  /** role — piece type that was dropped */
  r: Exclude<Role, 'king'>;
  /** side — whose pocket loses the piece:
   *  `"partner"` = partner's own pocket, `"opponent"` = partner's opponent's pocket */
  s: 'partner' | 'opponent';
};

/** State update for the mate (partner's) board after a move or drop there. */
export type WsMateMoveData = {
  /** fen — position after the move */
  fen: string;
  /** lm — last move as [from, to] squares or [to] for a drop */
  lm?: [Key, Key] | [Key];
  /** pd — pocket diff: piece added to the main board from a capture on the mate board */
  pd?: WsPocketDiff;
  /** mpd — mate pocket diff: piece removed from the mate board after a drop */
  mpd?: WsMatePocketDiff;
};

/** Time control settings used in lobby configuration. */
export type WsLobbyTimeData = {
  /** m — minutes per side */
  m: number;
  /** s — increment in seconds per move */
  s: number;
};

/** Combined lobby configuration: time control and rated-game flag. */
export type WsLobbyConfigData = {
  /** t — time control */
  t: WsLobbyTimeData;
  /** r — rated game enabled */
  r: boolean;
};

/** Target player by username, used for invite and kick actions. */
export type WsUsernameData = {
  /** n — target player's username */
  n: string;
};

/** A single chat message payload. */
export type WsChatData = {
  /** m — message text */
  m: string;
};

/** A player occupying one of the four lobby seats. */
export type WsSeatData = {
  /** n — display name */
  n: string;
  /** r — current rating */
  r: number;
};

/** Full lobby state snapshot sent by the server.
 *  `s` is a map of seat index → player (null = empty):
 *  - `0` — team A, slot 0 (lobby owner)
 *  - `1` — team A, slot 1
 *  - `2` — team B, slot 0
 *  - `3` — team B, slot 1 */
export type WsLobbyStateData = {
  /** s — seats map: key 0-3, null if empty */
  s: Record<0 | 1 | 2 | 3, WsSeatData | null>;
  /** t — current time control */
  t: WsLobbyTimeData;
  /** r — rated game enabled */
  r: boolean;
  /** q — matchmaking queue is active */
  q: boolean;
  /** p — connected user's seat index (null = spectating) */
  p: number | null;
};

// *** MESSAGE TYPES ***

// BASE CLIENT

/** Keep-alive ping. Server responds with PONG (20). */
export type WsPingMsg = { type: (typeof WsMsgType)['PING']; data: Record<string, never> };

// BASE SERVER

/** Keep-alive response to PING (0). */
export type WsPongMsg = { type: (typeof WsMsgType)['PONG']; data: Record<string, never> };

// LOBBY CLIENT

/**  Create a new lobby with the given initial time control. */
export type WsCreateLobbyMsg = { type: (typeof WsMsgType)['LOBBY_CREATE']; data: WsLobbyTimeData };

/**  Leave the current lobby. */
export type WsLeaveLobbyMsg = {
  type: (typeof WsMsgType)['LOBBY_LEAVE'];
  data: Record<string, never>;
};

/**  Kick a player from the lobby (owner only). */
export type WsKickLobbyMsg = { type: (typeof WsMsgType)['LOBBY_KICK']; data: WsUsernameData };

/**  Send a game invite to another player. */
export type WsInviteSendMsg = { type: (typeof WsMsgType)['INVITE_SEND']; data: WsUsernameData };

/**  Accept a pending game invite. */
export type WsInviteAcceptMsg = {
  type: (typeof WsMsgType)['INVITE_ACCEPT'];
  data: Record<string, never>;
};

/**  Reject a pending game invite. */
export type WsInviteRejectMsg = {
  type: (typeof WsMsgType)['INVITE_REJECT'];
  data: Record<string, never>;
};

/**  Update the lobby's time control and rated-game setting. */
export type WsLobbyConfigMsg = {
  type: (typeof WsMsgType)['LOBBY_CONFIG'];
  data: WsLobbyConfigData;
};

/**  Start matchmaking from the current lobby. */
export type WsStartMMMsg = { type: (typeof WsMsgType)['START_MM']; data: Record<string, never> };

/**  Cancel an ongoing matchmaking search. */
export type WsCancelMMMsg = { type: (typeof WsMsgType)['CANCEL_MM']; data: Record<string, never> };

// LOBBY SERVER

/** Full lobby state snapshot sent on join or any state change. */
export type WsLobbyJoinMsg = { type: (typeof WsMsgType)['LOBBY_JOIN']; data: WsLobbyStateData };

/** The client was kicked from the lobby. */
export type WsLobbyKickedMsg = {
  type: (typeof WsMsgType)['LOBBY_KICKED'];
  data: Record<string, never>;
};

/** Another player sent the client a game invite. */
export type WsInviteReceiveMsg = {
  type: (typeof WsMsgType)['INVITE_RECEIVE'];
  data: WsUsernameData;
};

/** Lobby time control or rated setting was changed. */
export type WsLobbyConfigUpdateMsg = {
  type: (typeof WsMsgType)['LOBBY_CONFIG_UPDATE'];
  data: WsLobbyConfigData;
};

/** Matchmaking search has started. */
export type WsLobbyStartMMMsg = {
  type: (typeof WsMsgType)['LOBBY_START_MM'];
  data: Record<string, never>;
};

/** Matchmaking search was cancelled. */
export type WsLobbyCancelMMMsg = {
  type: (typeof WsMsgType)['LOBBY_CANCEL_MM'];
  data: Record<string, never>;
};

// GAME CLIENT

/**  Make a move or drop a piece (UCI notation).
 *  Regular move: `"e2e4"` — Drop: `"P@e4"` */
export type WsGameMoveMsg = { type: (typeof WsMsgType)['GAME_MOVE']; data: WsMoveUciData };

/**  Request a full game state resync. */
export type WsGameReqSyncMsg = {
  type: (typeof WsMsgType)['GAME_REQ_SYNC'];
  data: Record<string, never>;
};

/**  Send a chat message in the game room. */
export type WsGameChatSendMsg = {
  type: (typeof WsMsgType)['GAME_CHAT_MSG_SEND'];
  data: WsChatData;
};

// GAME SERVER

/** Initial game state on join. */
export type WsGameJoinMsg = { type: (typeof WsMsgType)['GAME_JOIN']; data: BughouseConfig };

/** Full game state resync (response to GAME_REQ_SYNC). */
export type WsGameSyncMsg = { type: (typeof WsMsgType)['GAME_SYNC']; data: BughouseConfig };

/** Opponent made a move or drop on the main board (UCI). */
export type WsGameOpponentMoveMsg = {
  type: (typeof WsMsgType)['GAME_OPPONENT_MOVE'];
  data: WsMoveUciData;
};

/** A move or drop occurred on the mate (partner's) board. */
export type WsGameMateBoardUpdateMsg = {
  type: (typeof WsMsgType)['GAME_MATE_BOARD_UPDATE'];
  data: WsMateMoveData;
};

/** A chat message was received in the game room. */
export type WsGameChatReceiveMsg = {
  type: (typeof WsMsgType)['GAME_CHAT_MSG_RECEIVE'];
  data: WsChatData;
};

// ─── Union types ──────────────────────────────────────────────────────────────

/** All message types the client can receive from the server. */
export type WsIncomingData =
  | WsPongMsg
  | WsLobbyJoinMsg
  | WsLobbyKickedMsg
  | WsInviteReceiveMsg
  | WsLobbyConfigUpdateMsg
  | WsLobbyStartMMMsg
  | WsLobbyCancelMMMsg
  | WsGameJoinMsg
  | WsGameSyncMsg
  | WsGameOpponentMoveMsg
  | WsGameMateBoardUpdateMsg
  | WsGameChatReceiveMsg;

/** All message types the client can send to the server. */
export type WsOutgoingData =
  | WsPingMsg
  | WsCreateLobbyMsg
  | WsLeaveLobbyMsg
  | WsKickLobbyMsg
  | WsInviteSendMsg
  | WsInviteAcceptMsg
  | WsInviteRejectMsg
  | WsLobbyConfigMsg
  | WsStartMMMsg
  | WsCancelMMMsg
  | WsGameMoveMsg
  | WsGameReqSyncMsg
  | WsGameChatSendMsg;

/** Any WebSocket message (incoming or outgoing). */
export type WsData = WsIncomingData | WsOutgoingData;
