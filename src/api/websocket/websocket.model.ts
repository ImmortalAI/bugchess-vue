import type { BughouseData } from '../chess/chess.model';
import type {
  LobbyData,
  LobbyPlayerLeaveData,
  LobbyTimeData,
  LobbyTimeRatingData,
  LobbyUpdateSlot,
} from '../lobby/lobby.model';

/** Numeric message type identifiers for all WebSocket messages. */
export const WsMsgType = {
  // BASE CLIENT
  /** Keepalive ping sent by the client every 5 s. */
  PING: 0,
  /** Ask the server to resend the full current state. */
  REQ_SYNC: 1,

  // BASE SERVER
  /** Keepalive response to PING. */
  PONG: 20,
  /** Full state snapshot (idle / lobby / game) sent after REQ_SYNC or reconnect. */
  SYNC: 21,

  // LOBBY CLIENT
  /** Create a new lobby with the given time control. */
  LOBBY_CREATE: 40,
  /** Leave the current lobby. */
  LOBBY_LEAVE: 41,
  /** Kick a player from the lobby (leader only). */
  LOBBY_KICK: 42,
  /** Send a lobby invite to a user by username. */
  INVITE_SEND: 43,
  /** Accept a pending lobby invite. */
  INVITE_ACCEPT: 44,
  /** Reject a pending lobby invite. */
  INVITE_REJECT: 45,
  /** Update lobby time control and rated flag (leader only). */
  LOBBY_CONFIG: 46,
  /** Start matchmaking queue for the current lobby. */
  START_MM: 48,
  /** Cancel the active matchmaking search. */
  CANCEL_MM: 49,

  // LOBBY SERVER
  /** Sent to the client after successfully joining or creating a lobby. */
  LOBBY_JOIN: 60,
  /** Sent to a player who has been kicked from the lobby. */
  LOBBY_KICKED: 61,
  /** Sent when another player invites the client to their lobby. */
  INVITE_RECEIVE: 62,
  /** Broadcast to all lobby members when the lobby config changes. */
  LOBBY_CONFIG_UPDATE: 63,
  /** Broadcast to all lobby members when matchmaking starts. */
  LOBBY_START_MM: 65,
  /** Broadcast to all lobby members when matchmaking is cancelled. */
  LOBBY_CANCEL_MM: 66,
  /** Sent to all lobby members when a pending invite was rejected by the recipient. */
  LOBBY_INVITE_REJECTED: 64,
  /** Broadcast to all lobby members when a player joins a slot. */
  LOBBY_PLAYER_JOIN: 67,
  /** Broadcast to all lobby members when a player leaves or is kicked from a slot. */
  LOBBY_PLAYER_LEAVE: 68,

  // GAME CLIENT
  /** Send a move in UCI notation for the specified board. */
  GAME_MOVE: 80,
  /** Send a chat message to the teammate on the same team. */
  GAME_CHAT_MSG_SEND: 83,
  /** Resign the current game. */
  GAME_RESIGN: 84,

  // GAME SERVER
  /** Sent to the client when a game starts or after reconnect while in a game. */
  GAME_JOIN: 100,
  /** Broadcast to all game players when any move is made on either board. */
  GAME_MOVE_RECEIVE: 101,
  /** Sent to teammates when a chat message is received. */
  GAME_CHAT_MSG_RECEIVE: 102,
  /** Sent to all game players when the game ends; carries result and rating changes. */
  GAME_END: 103,

  // ETC
  /** Server-side error response. */
  ERROR: 999,
} as const;

// *** PAYLOAD TYPES ***

/** Empty payload used when a message carries no data. */
export type WsNoData = Record<string, never>;

/** The high-level state a connected player can be in. */
export type WsUserState = 'IDLE' | 'LOBBY' | 'GAME';

/** Full lobby snapshot (alias of `LobbyData`). */
export type WsLobbyData = LobbyData;

/** Full game snapshot (alias of `BughouseData`). */
export type WsGameData = BughouseData;

/** Payload for `SYNC`: the server's authoritative view of the player's current state. */
export type WsSyncData = {
  state: WsUserState;
  /** Present when `state` is `'LOBBY'` or `'GAME'` and a lobby record exists. */
  lobby: WsLobbyData | null;
  /** Present when `state` is `'GAME'`. */
  game: WsGameData | null;
};

/** Time control parameters used when creating a lobby. */
export type WsLobbyTimeData = LobbyTimeData;

/** A player's username, used as a plain string payload. */
export type WsUsernameData = string;

/** Payload for invite messages: the target slot index and the invited username. */
export type WsInviteData = {
  /** 0–3 index of the slot the invite is for. */
  idx: number;
  username: string;
};

/** Lobby config payload: time control + rated flag. */
export type WsLobbyConfigData = LobbyTimeRatingData;

/** Payload for `LOBBY_PLAYER_JOIN`: which slot a player joined and their data. */
export type WsLobbyPlayerJoinData = LobbyUpdateSlot;

/** Payload for `LOBBY_PLAYER_LEAVE`: which slot emptied and why. */
export type WsLobbyPlayerLeaveData = LobbyPlayerLeaveData;

/** A single move on one of the two boards. */
export type WsGameMove = {
  /** Which board the move was made on: `0` = board A, `1` = board B. */
  idx: 0 | 1;
  /** Move in UCI notation (e.g. `"e2e4"`, `"P@f7"` for a drop). */
  move: string;
};

/** Extended move payload received from the server; includes updated clock values after the move. */
export type WsGameMoveReceive = WsGameMove & {
  /** Remaining time for white on the moved board, in milliseconds. */
  whiteClockTime: number;
  /** Remaining time for black on the moved board, in milliseconds. */
  blackClockTime: number;
};

/** A chat message between teammates; plain string content. */
export type WsGameChat = string;

/** Payload for `GAME_END`: final result and per-player rating changes. */
export type WsGameEndData = {
  status: Exclude<BughouseData['status'], null>;
  /** username → rating delta; empty object for casual games. */
  ratingChanges: Record<string, number>;
};

/** Server error payload. */
export type WsErrorData = {
  code: string | null;
  message: string | null;
};

// *** MESSAGE TYPES ***

// BASE CLIENT

/** Keepalive ping — sent every 5 s; expects a `PONG` response. */
export type WsPingMsg = { type: (typeof WsMsgType)['PING']; data: WsNoData };

/** Request the server to resend the full current state via `SYNC`. */
export type WsReqSyncMsg = { type: (typeof WsMsgType)['REQ_SYNC']; data: WsNoData };

// BASE SERVER

/** Keepalive pong in response to a client `PING`. */
export type WsPongMsg = { type: (typeof WsMsgType)['PONG']; data: WsNoData };

/** Full state snapshot delivered after `REQ_SYNC` or on reconnect. */
export type WsSyncMsg = { type: (typeof WsMsgType)['SYNC']; data: WsSyncData };

// LOBBY CLIENT

/** Create a new lobby with the given time control settings. */
export type WsCreateLobbyMsg = { type: (typeof WsMsgType)['LOBBY_CREATE']; data: WsLobbyTimeData };

/** Leave the current lobby (client-initiated). */
export type WsLeaveLobbyMsg = {
  type: (typeof WsMsgType)['LOBBY_LEAVE'];
  data: WsNoData;
};

/** Kick the named player from the lobby (lobby leader only). */
export type WsKickLobbyMsg = { type: (typeof WsMsgType)['LOBBY_KICK']; data: WsUsernameData };

/** Send a lobby invite to the specified username. */
export type WsInviteSendMsg = { type: (typeof WsMsgType)['INVITE_SEND']; data: WsInviteData };

/** Accept the pending lobby invite; carries the inviter's username. */
export type WsInviteAcceptMsg = {
  type: (typeof WsMsgType)['INVITE_ACCEPT'];
  data: WsUsernameData;
};

/** Reject the pending lobby invite; carries the inviter's username. */
export type WsInviteRejectMsg = {
  type: (typeof WsMsgType)['INVITE_REJECT'];
  data: WsUsernameData;
};

/** Update the lobby time control and rated flag (lobby leader only). */
export type WsLobbyConfigMsg = {
  type: (typeof WsMsgType)['LOBBY_CONFIG'];
  data: WsLobbyConfigData;
};

/** Start the matchmaking queue for the current lobby. */
export type WsStartMMMsg = { type: (typeof WsMsgType)['START_MM']; data: WsNoData };

/** Cancel the active matchmaking search. */
export type WsCancelMMMsg = { type: (typeof WsMsgType)['CANCEL_MM']; data: WsNoData };

// LOBBY SERVER

/** Sent after successfully joining or creating a lobby; contains the full lobby snapshot. */
export type WsLobbyJoinMsg = { type: (typeof WsMsgType)['LOBBY_JOIN']; data: WsLobbyData };

/** Sent to a player who has been kicked out of the lobby by the leader. */
export type WsLobbyKickedMsg = {
  type: (typeof WsMsgType)['LOBBY_KICKED'];
  data: WsNoData;
};

/** Sent when another player invites the client to their lobby. */
export type WsInviteReceiveMsg = {
  type: (typeof WsMsgType)['INVITE_RECEIVE'];
  data: WsInviteData;
};

/** Broadcast to all lobby members when a player fills a slot. */
export type WsLobbyPlayerJoinMsg = {
  type: (typeof WsMsgType)['LOBBY_PLAYER_JOIN'];
  data: WsLobbyPlayerJoinData;
};

/** Broadcast to all lobby members when a player leaves or is kicked from a slot. */
export type WsLobbyPlayerLeaveMsg = {
  type: (typeof WsMsgType)['LOBBY_PLAYER_LEAVE'];
  data: WsLobbyPlayerLeaveData;
};

/** Broadcast to all lobby members when a pending invite was rejected. */
export type WsLobbyInviteRejectedMsg = {
  type: (typeof WsMsgType)['LOBBY_INVITE_REJECTED'];
  data: WsInviteData;
};

/** Broadcast to all lobby members when the time control or rated flag changes. */
export type WsLobbyConfigUpdateMsg = {
  type: (typeof WsMsgType)['LOBBY_CONFIG_UPDATE'];
  data: WsLobbyConfigData;
};

/** Broadcast to all lobby members when the matchmaking queue starts. */
export type WsLobbyStartMMMsg = {
  type: (typeof WsMsgType)['LOBBY_START_MM'];
  data: WsNoData;
};

/** Broadcast to all lobby members when the matchmaking search is cancelled. */
export type WsLobbyCancelMMMsg = {
  type: (typeof WsMsgType)['LOBBY_CANCEL_MM'];
  data: WsNoData;
};

// GAME CLIENT

/** Send a move on one of the two boards in UCI notation. */
export type WsGameMoveMsg = { type: (typeof WsMsgType)['GAME_MOVE']; data: WsGameMove };

/** Send a chat message to the teammate on the same team. */
export type WsGameChatSendMsg = {
  type: (typeof WsMsgType)['GAME_CHAT_MSG_SEND'];
  data: WsGameChat;
};

/** Resign the current game. */
export type WsGameResignMsg = { type: (typeof WsMsgType)['GAME_RESIGN']; data: WsNoData };

// GAME SERVER

/** Sent when a game starts or when reconnecting while a game is active. */
export type WsGameJoinMsg = { type: (typeof WsMsgType)['GAME_JOIN']; data: WsGameData };

/** Broadcast to all game players when any move is made on either board. */
export type WsGameOpponentMoveMsg = {
  type: (typeof WsMsgType)['GAME_MOVE_RECEIVE'];
  data: WsGameMoveReceive;
};

/** Sent to teammates when a chat message is received from a team member. */
export type WsGameChatReceiveMsg = {
  type: (typeof WsMsgType)['GAME_CHAT_MSG_RECEIVE'];
  data: WsGameChat;
};

/** Sent to all game players when the game ends; carries result and rating deltas. */
export type WsGameEndMsg = { type: (typeof WsMsgType)['GAME_END']; data: WsGameEndData };

// ETC

/** Sent by the server when a client request results in an error. */
export type WsErrorMsg = { type: (typeof WsMsgType)['ERROR']; data: WsErrorData };

// *** Union Types ***

/** All message types the client can receive from the server. */
export type WsIncomingData =
  | WsPongMsg
  | WsSyncMsg
  | WsLobbyJoinMsg
  | WsLobbyKickedMsg
  | WsInviteReceiveMsg
  | WsLobbyInviteRejectedMsg
  | WsLobbyConfigUpdateMsg
  | WsLobbyStartMMMsg
  | WsLobbyCancelMMMsg
  | WsLobbyPlayerJoinMsg
  | WsLobbyPlayerLeaveMsg
  | WsGameJoinMsg
  | WsGameOpponentMoveMsg
  | WsGameChatReceiveMsg
  | WsGameEndMsg
  | WsErrorMsg;

/** All message types the client can send to the server. */
export type WsOutgoingData =
  | WsPingMsg
  | WsReqSyncMsg
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
  | WsGameChatSendMsg
  | WsGameResignMsg;

/** Union of all WebSocket messages (incoming and outgoing). */
export type WsData = WsIncomingData | WsOutgoingData;
